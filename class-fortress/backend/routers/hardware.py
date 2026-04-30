"""
backend/routers/hardware.py — hardware status, door override, camera snapshot.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.database import get_db
from backend.models.schemas import (
    DoorOverrideRequest, DoorOverrideResponse,
    HardwareStatusResponse, SnapshotResponse, EventMessageResponse,
)
from backend.services.ws_manager import ws_manager

if settings.mock_mode:
    from backend.services.hardware_mock import hardware_service
else:
    from backend.services.hardware_real import hardware_service  # type: ignore

router = APIRouter(prefix="/api", tags=["hardware"])
logger = logging.getLogger(__name__)


# ── GET /api/hardware/status ───────────────────────────────────────────────────

@router.get("/hardware/status", response_model=HardwareStatusResponse)
async def hardware_status():
    return hardware_service.get_status()


# ── POST /api/door/override ────────────────────────────────────────────────────

@router.post("/door/override", response_model=DoorOverrideResponse)
async def door_override(body: DoorOverrideRequest, db: AsyncSession = Depends(get_db)):
    if not body.reason.strip():
        raise HTTPException(status_code=422, detail="reason field is required and cannot be empty")

    if body.action == "lock":
        result = hardware_service.lock_solenoid()
    else:
        result = hardware_service.unlock_solenoid()

    new_state = result["state"]

    await ws_manager.broadcast(EventMessageResponse(
        type="door_event",
        severity="warning" if body.action == "unlock" else "info",
        payload={
            "action":    body.action,
            "new_state": new_state,
            "reason":    body.reason,
            "source":    "professor_override",
        },
    ).to_ws_dict())

    logger.info(f"Door override: {body.action} — {body.reason}")
    return DoorOverrideResponse(
        action=body.action,
        new_state=new_state,
        reason=body.reason,
    )


# ── GET /api/camera/snapshot ───────────────────────────────────────────────────

@router.get("/camera/snapshot", response_model=SnapshotResponse)
async def camera_snapshot():
    image_b64 = hardware_service.capture_snapshot()
    return SnapshotResponse(
        image_b64=image_b64,
        source="mock" if settings.mock_mode else "pi_camera",
    )

from fastapi.responses import StreamingResponse
import httpx
import asyncio

@router.get("/camera/stream")
async def camera_stream():
    """Proxy the MJPEG stream to avoid CORS issues in the browser when real hardware is used."""
    if settings.mock_mode:
        # Return a dummy stream or 404 since stream='mock://camera' is handled front-side
        raise HTTPException(status_code=404, detail="Stream proxy not used in mock mode")
        
    async def stream_generator():
        target_url = f"http://{settings.pi_host}:{settings.pi_port}/stream"
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", target_url) as response:
                    async for chunk in response.aiter_bytes():
                        yield chunk
        except Exception as e:
            logger.error(f"Stream proxy error: {e}")
            yield b""

    return StreamingResponse(
        stream_generator(), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
