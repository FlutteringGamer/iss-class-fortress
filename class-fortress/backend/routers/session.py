"""
backend/routers/session.py — session lifecycle endpoints.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.database import (
    AttendanceRecord, AttendanceStatusEnum, ClassSession,
    SessionStatusEnum, Student, get_db,
)
from backend.models.schemas import (
    EndSessionRequest, SessionEndResponse, SessionReport,
    SessionResponse, StartSessionRequest, StudentAttendance,
)
from backend.services.ws_manager import ws_manager
from backend.models.schemas import EventMessageResponse

if settings.mock_mode:
    from backend.services.hardware_mock import hardware_service
    from backend.services.vision_mock import vision_service, MOCK_STUDENTS
    from backend.services.task_registry import register, cancel_session
else:
    from backend.services.hardware_real import hardware_service  # type: ignore
    MOCK_STUDENTS = []

router = APIRouter(prefix="/api/session", tags=["session"])
logger = logging.getLogger(__name__)


# ── POST /api/session/start ────────────────────────────────────────────────────

@router.post("/start", response_model=SessionResponse)
async def start_session(body: StartSessionRequest, db: AsyncSession = Depends(get_db)):
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Persist session
    session_obj = ClassSession(
        id=session_id,
        course_id=body.course_id,
        mode=body.mode,
        status=SessionStatusEnum.ACTIVE,
        started_at=now,
    )
    db.add(session_obj)

    # Persist students + attendance records
    students = MOCK_STUDENTS if settings.mock_mode else []
    for s in students:
        existing = await db.get(Student, s["id"])
        if not existing:
            db.add(Student(
                id=s["id"],
                name=s["name"],
                student_number=s.get("student_number", ""),
                course_id=body.course_id,
            ))
        db.add(AttendanceRecord(
            session_id=session_id,
            student_id=s["id"],
            status=AttendanceStatusEnum.ABSENT,
        ))

    await db.commit()

    # Lock solenoid
    hw = hardware_service.lock_solenoid()

    # Notify WS clients
    await ws_manager.broadcast(EventMessageResponse(
        type="session_event",
        severity="info",
        session_id=session_id,
        payload={"event": "session_started", "session_id": session_id,
                 "mode": body.mode, "course_id": body.course_id},
    ).to_ws_dict())
    await ws_manager.broadcast(EventMessageResponse(
        type="door_event",
        severity="info",
        session_id=session_id,
        payload={"action": "lock", "reason": "Session started", "state": "locked"},
    ).to_ws_dict())

    # Start background tasks
    if settings.mock_mode:
        t1 = asyncio.create_task(
            vision_service.simulate_attendance(session_id, students, ws_manager)
        )
        t2 = asyncio.create_task(
            vision_service.simulate_gesture_loop(session_id, ws_manager, body.mode)
        )
        register(session_id, t1)
        register(session_id, t2)

        if body.mode == "exam":
            t3 = asyncio.create_task(
                vision_service.simulate_motion_loop(session_id, ws_manager)
            )
            t4 = asyncio.create_task(
                vision_service.simulate_phone_check(session_id, len(students), ws_manager)
            )
            register(session_id, t3)
            register(session_id, t4)

    logger.info(f"Session {session_id} started ({body.mode} mode, {body.course_id})")
    return SessionResponse(
        session_id=session_id,
        mode=body.mode,
        course_id=body.course_id,
        status="active",
        started_at=now,
        solenoid_state=hw["state"],
        message=f"Session started in {'MOCK' if settings.mock_mode else 'LIVE'} mode.",
    )


# ── POST /api/session/end ──────────────────────────────────────────────────────

@router.post("/end", response_model=SessionEndResponse)
async def end_session(body: EndSessionRequest, db: AsyncSession = Depends(get_db)):
    session_obj = await db.get(ClassSession, body.session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    if session_obj.status == SessionStatusEnum.ENDED:
        raise HTTPException(status_code=400, detail="Session already ended")

    now = datetime.utcnow()
    session_obj.status    = SessionStatusEnum.ENDED
    session_obj.ended_at  = now

    # Count
    result = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.session_id == body.session_id)
    )
    records = result.scalars().all()
    present_count = sum(1 for r in records if r.status in (AttendanceStatusEnum.PRESENT, AttendanceStatusEnum.BREAK))
    absent_count  = sum(1 for r in records if r.status == AttendanceStatusEnum.ABSENT)
    break_count   = sum(1 for r in records if r.status == AttendanceStatusEnum.BREAK)

    await db.commit()

    # Lock solenoid and cancel tasks
    hardware_service.lock_solenoid()
    if settings.mock_mode:
        await cancel_session(body.session_id)

    await ws_manager.broadcast(EventMessageResponse(
        type="session_event",
        severity="info",
        session_id=body.session_id,
        payload={
            "event": "session_ended", "session_id": body.session_id,
            "present": present_count, "absent": absent_count,
        },
    ).to_ws_dict())
    await ws_manager.broadcast(EventMessageResponse(
        type="door_event",
        severity="info",
        session_id=body.session_id,
        payload={"action": "lock", "state": "locked", "reason": "Session ended"},
    ).to_ws_dict())

    logger.info(f"Session {body.session_id} ended. Present: {present_count}, Absent: {absent_count}")
    return SessionEndResponse(
        session_id=body.session_id,
        ended_at=now,
        present_count=present_count,
        absent_count=absent_count,
        break_count=break_count,
        message="Session ended successfully.",
    )


# ── GET /api/session/{id}/report ───────────────────────────────────────────────

@router.get("/{session_id}/report", response_model=SessionReport)
async def get_session_report(session_id: str, db: AsyncSession = Depends(get_db)):
    session_obj = await db.get(ClassSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(AttendanceRecord, Student)
        .join(Student, AttendanceRecord.student_id == Student.id)
        .where(AttendanceRecord.session_id == session_id)
    )
    rows = result.all()

    attendance = [
        StudentAttendance(
            student_id=row.Student.id,
            student_name=row.Student.name,
            student_number=row.Student.student_number,
            status=row.AttendanceRecord.status.value,
            marked_at=row.AttendanceRecord.marked_at,
        )
        for row in rows
    ]

    present_count = sum(1 for a in attendance if a.status in ("present", "break"))
    absent_count  = len(attendance) - present_count
    duration = None
    if session_obj.ended_at:
        duration = (session_obj.ended_at - session_obj.started_at).total_seconds() / 60

    return SessionReport(
        session_id=session_id,
        course_id=session_obj.course_id,
        mode=session_obj.mode.value,
        status=session_obj.status.value,
        started_at=session_obj.started_at,
        ended_at=session_obj.ended_at,
        duration_minutes=duration,
        attendance=attendance,
        present_count=present_count,
        absent_count=absent_count,
        break_count=0,
        gesture_count=0,
        motion_alert_count=0,
    )
