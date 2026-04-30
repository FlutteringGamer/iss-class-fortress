"""
backend/models/database.py — async SQLAlchemy models + engine.
Tables: sessions, students, attendance, events, breaks, phone_checks, motion_alerts
"""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum as SAEnum, Float, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from backend.config import settings

# ── Engine ─────────────────────────────────────────────────────────────────────
engine = create_async_engine(settings.db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ── Enums ──────────────────────────────────────────────────────────────────────
class SessionModeEnum(str, enum.Enum):
    CLASS = "class"
    EXAM  = "exam"


class SessionStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    ENDED  = "ended"


class AttendanceStatusEnum(str, enum.Enum):
    PRESENT = "present"
    ABSENT  = "absent"
    BREAK   = "break"


class GestureStatusEnum(str, enum.Enum):
    PENDING   = "pending"
    APPROVED  = "approved"
    DENIED    = "denied"
    AUTO_ACK  = "auto_ack"


# ── Tables ─────────────────────────────────────────────────────────────────────
class ClassSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str]              = mapped_column(String(36), primary_key=True)
    course_id: Mapped[str]       = mapped_column(String(64))
    mode: Mapped[SessionModeEnum]= mapped_column(SAEnum(SessionModeEnum))
    status: Mapped[SessionStatusEnum] = mapped_column(SAEnum(SessionStatusEnum), default=SessionStatusEnum.ACTIVE)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None]  = mapped_column(DateTime, nullable=True)

    attendance: Mapped[list["AttendanceRecord"]] = relationship(back_populates="session", lazy="selectin")
    events: Mapped[list["EventRecord"]]          = relationship(back_populates="session")
    breaks: Mapped[list["BreakRecord"]]          = relationship(back_populates="session")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str]              = mapped_column(String(36), primary_key=True)
    name: Mapped[str]            = mapped_column(String(128))
    student_number: Mapped[str]  = mapped_column(String(32))
    course_id: Mapped[str]       = mapped_column(String(64))
    photo_url: Mapped[str | None]= mapped_column(String(256), nullable=True)

    attendance: Mapped[list["AttendanceRecord"]] = relationship(back_populates="student")


class AttendanceRecord(Base):
    __tablename__ = "attendance"

    id: Mapped[int]                = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str]        = mapped_column(ForeignKey("sessions.id"))
    student_id: Mapped[str]        = mapped_column(ForeignKey("students.id"))
    status: Mapped[AttendanceStatusEnum] = mapped_column(SAEnum(AttendanceStatusEnum), default=AttendanceStatusEnum.ABSENT)
    marked_at: Mapped[datetime | None]   = mapped_column(DateTime, nullable=True)

    session: Mapped["ClassSession"] = relationship(back_populates="attendance")
    student: Mapped["Student"]      = relationship(back_populates="attendance")


class EventRecord(Base):
    __tablename__ = "events"

    id: Mapped[str]                = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str]        = mapped_column(ForeignKey("sessions.id"))
    event_type: Mapped[str]        = mapped_column(String(32))
    severity: Mapped[str]          = mapped_column(String(16), default="info")
    student_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    student_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    payload: Mapped[str]           = mapped_column(Text, default="{}")   # JSON string
    requires_action: Mapped[bool]  = mapped_column(Boolean, default=False)
    gesture_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime]   = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["ClassSession"] = relationship(back_populates="events")


class BreakRecord(Base):
    __tablename__ = "breaks"

    id: Mapped[int]                = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str]        = mapped_column(ForeignKey("sessions.id"))
    student_id: Mapped[str]        = mapped_column(String(36))
    student_name: Mapped[str]      = mapped_column(String(128))
    started_at: Mapped[datetime]   = mapped_column(DateTime, default=datetime.utcnow)
    ends_at: Mapped[datetime]      = mapped_column(DateTime)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expired: Mapped[bool]          = mapped_column(Boolean, default=False)

    session: Mapped["ClassSession"] = relationship(back_populates="breaks")


class PhoneCheck(Base):
    __tablename__ = "phone_checks"

    id: Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str]  = mapped_column(String(36))
    expected: Mapped[int]    = mapped_column(Integer)
    detected: Mapped[int]    = mapped_column(Integer)
    match: Mapped[bool]      = mapped_column(Boolean)
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MotionAlert(Base):
    __tablename__ = "motion_alerts"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str]      = mapped_column(String(36))
    student_id: Mapped[str]      = mapped_column(String(36))
    student_name: Mapped[str]    = mapped_column(String(128))
    description: Mapped[str]     = mapped_column(Text)
    confidence: Mapped[float]    = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── Helpers ────────────────────────────────────────────────────────────────────
async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
