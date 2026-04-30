"""
backend/services/vision_mock.py — Mock vision service.
Simulates face recognition, gesture detection, motion alerts, and phone checks
as asyncio background tasks tied to a session lifecycle.
"""
from __future__ import annotations

import asyncio
import logging
import random
import uuid
from datetime import datetime

from backend.models.schemas import EventMessageResponse
from backend.services.ws_manager import WebSocketManager

logger = logging.getLogger(__name__)

# ── Mock student roster ────────────────────────────────────────────────────────
MOCK_STUDENTS = [
    {"id": "s-001", "name": "Alice Chen",    "student_number": "STU001"},
    {"id": "s-002", "name": "Bob Martinez",  "student_number": "STU002"},
    {"id": "s-003", "name": "Carol White",   "student_number": "STU003"},
    {"id": "s-004", "name": "David Kim",     "student_number": "STU004"},
    {"id": "s-005", "name": "Emma Johnson",  "student_number": "STU005"},
    {"id": "s-006", "name": "Felix Zhang",   "student_number": "STU006"},
    {"id": "s-007", "name": "Grace Lee",     "student_number": "STU007"},
    {"id": "s-008", "name": "Henry Brown",   "student_number": "STU008"},
    {"id": "s-009", "name": "Iris Patel",    "student_number": "STU009"},
    {"id": "s-010", "name": "James Wilson",  "student_number": "STU010"},
]

CLASS_GESTURES = ["toilet_request", "question", "emergency"]
EXAM_GESTURES  = ["toilet_request", "question", "emergency", "submit_exam", "wave"]

GESTURE_SEVERITY: dict[str, str] = {
    "toilet_request": "warning",
    "question":       "info",
    "emergency":      "critical",
    "submit_exam":    "warning",
    "wave":           "info",
}

GESTURE_REQUIRES_ACTION: dict[str, bool] = {
    "toilet_request": True,
    "question":       False,
    "emergency":      False,   # auto-acknowledged
    "submit_exam":    True,
    "wave":           False,
}


class MockVisionService:

    # ── Face recognition ───────────────────────────────────────────────────────

    async def simulate_attendance(
        self,
        session_id: str,
        student_list: list[dict],
        ws_manager: WebSocketManager,
    ) -> None:
        """Wait 3s then mark ~80% present, broadcasting face_detected + attendance_update."""
        await asyncio.sleep(3)
        count   = max(1, int(len(student_list) * 0.8))
        present = random.sample(student_list, count)

        for student in present:
            await asyncio.sleep(random.uniform(0.1, 0.35))
            event = EventMessageResponse(
                type="face_detected",
                student_id=student["id"],
                student_name=student["name"],
                severity="info",
                requires_action=False,
                session_id=session_id,
                payload={
                    "confidence": round(random.uniform(0.88, 0.99), 3),
                    "bounding_box": {
                        "x": random.randint(50, 400),
                        "y": random.randint(30, 280),
                        "w": random.randint(60, 110),
                        "h": random.randint(60, 110),
                    },
                },
            )
            await ws_manager.broadcast(event.to_ws_dict())

        # Full roster update
        records = [
            {
                "student_id":     s["id"],
                "student_name":   s["name"],
                "student_number": s.get("student_number", ""),
                "status":         "present" if s["id"] in {p["id"] for p in present} else "absent",
            }
            for s in student_list
        ]
        att_event = EventMessageResponse(
            type="attendance_update",
            severity="info",
            requires_action=False,
            session_id=session_id,
            payload={
                "records":       records,
                "present_count": len(present),
                "total_count":   len(student_list),
                "session_id":    session_id,
            },
        )
        await ws_manager.broadcast(att_event.to_ws_dict())
        logger.info(f"[MOCK] Attendance: {len(present)}/{len(student_list)} present for session {session_id}")

    # ── Gesture loop ───────────────────────────────────────────────────────────

    async def simulate_gesture_loop(
        self,
        session_id: str,
        ws_manager: WebSocketManager,
        mode: str,
    ) -> None:
        """Every 30s emit a random gesture event."""
        await asyncio.sleep(30)
        pool = EXAM_GESTURES if mode == "exam" else CLASS_GESTURES
        while True:
            gesture_type = random.choice(pool)
            student      = random.choice(MOCK_STUDENTS)
            gesture_id   = str(uuid.uuid4())

            event = EventMessageResponse(
                type="gesture",
                student_id=student["id"],
                student_name=student["name"],
                severity=GESTURE_SEVERITY.get(gesture_type, "info"),
                requires_action=GESTURE_REQUIRES_ACTION.get(gesture_type, False),
                session_id=session_id,
                payload={
                    "gesture_id":   gesture_id,
                    "gesture_type": gesture_type,
                    "confidence":   round(random.uniform(0.82, 0.99), 3),
                    "session_id":   session_id,
                },
            )
            await ws_manager.broadcast(event.to_ws_dict())
            logger.info(f"[MOCK] Gesture: {gesture_type} from {student['name']}")
            await asyncio.sleep(30)

    # ── Motion alert loop (exam only) ──────────────────────────────────────────

    async def simulate_motion_loop(
        self,
        session_id: str,
        ws_manager: WebSocketManager,
    ) -> None:
        """Every 60s emit a suspicious motion alert for a random student."""
        await asyncio.sleep(60)
        descriptions = [
            "Suspicious head movement detected",
            "Looking sideways repeatedly",
            "Unusual posture shift",
            "Possible note consultation",
            "Rapid glancing behavior",
        ]
        while True:
            student    = random.choice(MOCK_STUDENTS)
            confidence = round(random.uniform(0.60, 0.90), 3)

            event = EventMessageResponse(
                type="motion_alert",
                student_id=student["id"],
                student_name=student["name"],
                severity="warning",
                requires_action=True,
                session_id=session_id,
                payload={
                    "description": random.choice(descriptions),
                    "confidence":  confidence,
                    "clip_url":    None,
                    "session_id":  session_id,
                },
            )
            await ws_manager.broadcast(event.to_ws_dict())
            logger.info(f"[MOCK] Motion alert: {student['name']} ({confidence:.0%})")
            await asyncio.sleep(60)

    # ── Phone check ────────────────────────────────────────────────────────────

    async def simulate_phone_check(
        self,
        session_id: str,
        present_count: int,
        ws_manager: WebSocketManager,
    ) -> None:
        """Initial phone count — always matches by default."""
        await asyncio.sleep(10)
        event = EventMessageResponse(
            type="phone_count",
            severity="info",
            requires_action=False,
            session_id=session_id,
            payload={
                "expected":   present_count,
                "detected":   present_count,
                "match":      True,
                "session_id": session_id,
            },
        )
        await ws_manager.broadcast(event.to_ws_dict())
        logger.info(f"[MOCK] Phone check: {present_count}/{present_count} (match)")


# ── Singleton ─────────────────────────────────────────────────────────────────
vision_service = MockVisionService()
