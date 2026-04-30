"""
backend/models/schemas.py — Pydantic v2 request/response models.
All fields are typed. Optional fields always have a default value.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Shared literals ────────────────────────────────────────────────────────────
SessionMode    = Literal["class", "exam"]
SessionStatus  = Literal["active", "ended"]
AttendanceStatus = Literal["present", "absent", "break"]
GestureDecision  = Literal["approve", "deny"]
GestureType    = Literal["toilet_request", "question", "emergency", "submit_exam", "wave"]
DoorAction     = Literal["lock", "unlock"]
DeviceStatus   = Literal["connected", "disconnected", "error", "unknown"]
SolenoidState  = Literal["locked", "unlocked"]
Severity       = Literal["info", "warning", "critical"]
EventType      = Literal[
    "face_detected", "gesture", "door_event", "attendance_update",
    "alert", "timer_update", "phone_count", "motion_alert", "session_event"
]


# ── Requests ───────────────────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    mode: SessionMode
    course_id: str


class EndSessionRequest(BaseModel):
    session_id: str


class GestureResponseRequest(BaseModel):
    gesture_id: str
    decision: GestureDecision


class DoorOverrideRequest(BaseModel):
    action: DoorAction
    reason: str          # required — no default


# ── Hardware ───────────────────────────────────────────────────────────────────

class DeviceInfo(BaseModel):
    status: DeviceStatus
    detail: str = ""
    last_seen: datetime = Field(default_factory=datetime.utcnow)


class HardwareStatusResponse(BaseModel):
    pi_camera: DeviceInfo
    xiaomi_camera: DeviceInfo
    solenoid: DeviceInfo
    solenoid_state: SolenoidState
    network_ms: float
    mock_mode: bool


# ── Session ────────────────────────────────────────────────────────────────────

class SessionResponse(BaseModel):
    session_id: str
    mode: SessionMode
    course_id: str
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    solenoid_state: SolenoidState
    message: str


class SessionEndResponse(BaseModel):
    session_id: str
    ended_at: datetime
    present_count: int
    absent_count: int
    break_count: int
    message: str


class StudentAttendance(BaseModel):
    student_id: str
    student_name: str
    student_number: str
    status: AttendanceStatus
    marked_at: datetime | None = None


class SessionReport(BaseModel):
    session_id: str
    course_id: str
    mode: SessionMode
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    duration_minutes: float | None = None
    attendance: list[StudentAttendance]
    present_count: int
    absent_count: int
    break_count: int
    gesture_count: int
    motion_alert_count: int


# ── Events (WebSocket) ─────────────────────────────────────────────────────────

class EventMessageResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    student_id: str | None = None
    student_name: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    severity: Severity = "info"
    requires_action: bool = False
    session_id: str | None = None

    def to_ws_dict(self) -> dict[str, Any]:
        d = self.model_dump(mode="json")
        return d


# ── Gesture response ───────────────────────────────────────────────────────────

class GestureRespondResponse(BaseModel):
    gesture_id: str
    decision: GestureDecision
    door_action: DoorAction | None = None
    timer_minutes: int | None = None
    message: str


# ── Door override ──────────────────────────────────────────────────────────────

class DoorOverrideResponse(BaseModel):
    action: DoorAction
    new_state: SolenoidState
    reason: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── Camera snapshot ────────────────────────────────────────────────────────────

class SnapshotResponse(BaseModel):
    image_b64: str       # base64-encoded JPEG
    width: int = 640
    height: int = 480
    source: str = "mock"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
