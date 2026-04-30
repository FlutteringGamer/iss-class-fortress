"""
backend/routers/gestures.py — gesture approve/deny with break timer logic.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.database import get_db
from backend.models.schemas import (
    GestureResponseRequest as GestureRespondRequest, GestureRespondResponse, EventMessageResponse
)
from backend.services.ws_manager import ws_manager

if settings.mock_mode:
    from backend.services.hardware_mock import hardware_service
    from backend.services.task_registry import register
else:
    from backend.services.hardware_real import hardware_service  # type: ignore

router = APIRouter(prefix="/api/gesture", tags=["gestures"])
logger = logging.getLogger(__name__)


# ── Ingest endpoint (called by handgesture.py) ─────────────────────────────────

class GestureIngestRequest(BaseModel):
    type: str                        # e.g. "Restroom Request", "Raise Hand"
    riskScore: str = "0.0"
    status: str = "INFO"             # "INFO" | "WARN" | "CRITICAL"
    student_id: str = "unknown"
    student_name: str = "Student"
    session_id: str | None = None
    payload: dict[str, Any] = {}


# Map handgesture.py event type strings → internal gesture codes
_TYPE_MAP = {
    "Restroom Request":  "toilet_request",
    "Raise Hand":        "raise_hand",
    "Confused":          "confused",
    "Understood OK":     "ok",
}

_SEVERITY_MAP = {
    "INFO":     "info",
    "WARN":     "warning",
    "CRITICAL": "critical",
}


@router.post("/ingest")
async def ingest_gesture(body: GestureIngestRequest):
    """
    Called by handgesture.py (or any external vision process) to push a detected
    gesture into the Class Fortress dashboard via WebSocket.
    """
    gesture_id   = str(uuid.uuid4())
    gesture_code = _TYPE_MAP.get(body.type, body.type.lower().replace(" ", "_"))
    severity     = _SEVERITY_MAP.get(body.status, "info")
    requires_action = gesture_code in ("toilet_request", "raise_hand")

    # Register in pending dict so professor can approve/deny
    register_gesture(
        gesture_id=gesture_id,
        gesture_type=gesture_code,
        student_id=body.student_id,
        student_name=body.student_name,
        session_id=body.session_id or "",
    )

    # Broadcast to all connected dashboard clients
    await ws_manager.broadcast(EventMessageResponse(
        type="gesture",
        student_id=body.student_id,
        student_name=body.student_name,
        severity=severity,
        requires_action=requires_action,
        session_id=body.session_id,
        payload={
            "gesture_id":   gesture_id,
            "gesture_type": gesture_code,
            "label":        body.type,
            "risk_score":   body.riskScore,
            **body.payload,
        },
    ).to_ws_dict())

    logger.info(f"[Ingest] Gesture '{body.type}' → {gesture_code} (id={gesture_id})")
    return {"gesture_id": gesture_id, "gesture_type": gesture_code, "queued": True}


# In-memory pending gesture registry (gesture_id → metadata)
_pending: dict[str, dict] = {}


def register_gesture(
    gesture_id: str, gesture_type: str,
    student_id: str, student_name: str, session_id: str
) -> None:
    _pending[gesture_id] = {
        "gesture_id":   gesture_id,
        "gesture_type": gesture_type,
        "student_id":   student_id,
        "student_name": student_name,
        "session_id":   session_id,
        "detected_at":  datetime.utcnow().isoformat(),
    }


# ── Break timer background task ────────────────────────────────────────────────

async def _break_timer_task(
    student_id: str,
    student_name: str,
    session_id: str,
    duration_minutes: int,
) -> None:
    """
    Broadcasts timer_update every 10 seconds.
    At 0: locks solenoid, marks student absent, broadcasts attendance_update + alert.
    """
    ends_at     = datetime.utcnow() + timedelta(minutes=duration_minutes)
    total_secs  = duration_minutes * 60
    elapsed     = 0

    while elapsed < total_secs:
        await asyncio.sleep(10)
        elapsed += 10
        remaining = max(0, total_secs - elapsed)

        await ws_manager.broadcast(EventMessageResponse(
            type="timer_update",
            student_id=student_id,
            student_name=student_name,
            severity="info",
            requires_action=False,
            session_id=session_id,
            payload={
                "timer_type":       "break",
                "student_id":       student_id,
                "student_name":     student_name,
                "remaining_seconds": remaining,
                "ends_at":          ends_at.isoformat(),
                "action":           "tick",
            },
        ).to_ws_dict())

        if remaining == 0:
            break

    # Timer expired — lock door + mark absent
    hardware_service.lock_solenoid()

    await ws_manager.broadcast(EventMessageResponse(
        type="door_event",
        severity="warning",
        session_id=session_id,
        payload={
            "action": "lock",
            "state":  "locked",
            "reason": f"Break timer expired for {student_name}",
        },
    ).to_ws_dict())

    await ws_manager.broadcast(EventMessageResponse(
        type="attendance_update",
        student_id=student_id,
        student_name=student_name,
        severity="warning",
        requires_action=False,
        session_id=session_id,
        payload={
            "student_id":   student_id,
            "student_name": student_name,
            "status":       "absent",
            "reason":       "Break timer expired — did not return in time",
        },
    ).to_ws_dict())

    await ws_manager.broadcast(EventMessageResponse(
        type="alert",
        severity="warning",
        session_id=session_id,
        payload={
            "message": f"{student_name} did not return within {duration_minutes} minutes. Marked absent.",
        },
    ).to_ws_dict())

    logger.info(f"[Break Timer] Expired for {student_name} — marked absent, door locked")


# ── POST /api/gesture/respond ──────────────────────────────────────────────────

@router.post("/respond", response_model=GestureRespondResponse)
async def respond_to_gesture(body: GestureRespondRequest, db: AsyncSession = Depends(get_db)):
    gesture = _pending.get(body.gesture_id)

    # In mock mode accept any gesture_id, using sane defaults
    gesture_type  = gesture["gesture_type"]  if gesture else "toilet_request"
    student_id    = gesture["student_id"]    if gesture else "s-001"
    student_name  = gesture["student_name"]  if gesture else "Unknown Student"
    session_id    = gesture["session_id"]    if gesture else None

    door_action   = None
    timer_minutes = None

    if body.decision == "approve":
        if gesture_type == "toilet_request":
            door_action   = "unlock"
            timer_minutes = 10
            hardware_service.unlock_solenoid()

            # Notify WS
            await ws_manager.broadcast(EventMessageResponse(
                type="door_event",
                severity="info",
                student_id=student_id,
                student_name=student_name,
                session_id=session_id,
                payload={"action": "unlock", "state": "unlocked",
                         "reason": f"Toilet break approved for {student_name}"},
            ).to_ws_dict())

            # Start timer + attendance → break
            await ws_manager.broadcast(EventMessageResponse(
                type="timer_update",
                student_id=student_id,
                student_name=student_name,
                severity="info",
                session_id=session_id,
                payload={
                    "timer_type":       "break",
                    "duration_minutes": timer_minutes,
                    "student_id":       student_id,
                    "student_name":     student_name,
                    "action":           "start",
                },
            ).to_ws_dict())

            await ws_manager.broadcast(EventMessageResponse(
                type="attendance_update",
                student_id=student_id,
                student_name=student_name,
                severity="info",
                session_id=session_id,
                payload={"student_id": student_id, "student_name": student_name, "status": "break"},
            ).to_ws_dict())

            # Spawn countdown task
            task = asyncio.create_task(
                _break_timer_task(student_id, student_name, session_id or "", timer_minutes)
            )
            if settings.mock_mode and session_id:
                register(session_id, task)

        elif gesture_type == "submit_exam":
            await ws_manager.broadcast(EventMessageResponse(
                type="alert",
                student_id=student_id,
                student_name=student_name,
                severity="info",
                session_id=session_id,
                payload={"message": f"Exam submission confirmed for {student_name}"},
            ).to_ws_dict())

        elif gesture_type == "emergency":
            await ws_manager.broadcast(EventMessageResponse(
                type="alert",
                student_id=student_id,
                student_name=student_name,
                severity="critical",
                session_id=session_id,
                payload={"message": f"Emergency acknowledged for {student_name}"},
            ).to_ws_dict())

    elif body.decision == "deny":
        await ws_manager.broadcast(EventMessageResponse(
            type="door_event",
            severity="info",
            student_id=student_id,
            student_name=student_name,
            session_id=session_id,
            payload={
                "action":       "deny",
                "student_name": student_name,
                "gesture_type": gesture_type,
            },
        ).to_ws_dict())

    _pending.pop(body.gesture_id, None)
    logger.info(f"Gesture {body.gesture_id} ({gesture_type}): {body.decision}")

    return GestureRespondResponse(
        gesture_id=body.gesture_id,
        decision=body.decision,
        door_action=door_action,
        timer_minutes=timer_minutes,
        message=f"Gesture {body.decision}d successfully.",
    )
