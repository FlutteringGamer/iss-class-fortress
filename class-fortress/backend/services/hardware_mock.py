"""
backend/services/hardware_mock.py — mock hardware service.
All devices report CONNECTED. Solenoid state tracked in memory.
Camera snapshot generated with Pillow (dark gray + "MOCK CAMERA" text).
"""
from __future__ import annotations

import base64
import io
import logging
import time
from datetime import datetime

from backend.models.schemas import DeviceInfo, HardwareStatusResponse, SolenoidState

logger = logging.getLogger(__name__)

# ── State ─────────────────────────────────────────────────────────────────────
_solenoid_state: SolenoidState = "locked"
_startup_time = time.time()


class MockHardwareService:

    def get_status(self) -> HardwareStatusResponse:
        ping = round((time.time() - _startup_time) % 5 + 2.0, 1)
        now  = datetime.utcnow()
        return HardwareStatusResponse(
            pi_camera=DeviceInfo(status="connected", detail="Mock Pi Camera V3", last_seen=now),
            xiaomi_camera=DeviceInfo(status="connected", detail="Mock Xiaomi RTSP", last_seen=now),
            solenoid=DeviceInfo(status="connected", detail="Mock GPIO solenoid", last_seen=now),
            solenoid_state=_solenoid_state,
            network_ms=ping,
            mock_mode=True,
        )

    def lock_solenoid(self) -> dict:
        global _solenoid_state
        _solenoid_state = "locked"
        logger.info("MOCK: Solenoid LOCKED")
        return {"success": True, "state": "locked"}

    def unlock_solenoid(self) -> dict:
        global _solenoid_state
        _solenoid_state = "unlocked"
        logger.info("MOCK: Solenoid UNLOCKED")
        return {"success": True, "state": "unlocked"}

    def get_solenoid_state(self) -> SolenoidState:
        return _solenoid_state

    def capture_snapshot(self) -> str:
        """Generate a 640x480 dark-gray placeholder with centered 'MOCK CAMERA' text.
        Returns base64-encoded JPEG string."""
        try:
            from PIL import Image, ImageDraw, ImageFont

            img = Image.new("RGB", (640, 480), color=(28, 32, 48))
            draw = ImageDraw.Draw(img)

            # Draw grid lines
            for x in range(0, 640, 80):
                draw.line([(x, 0), (x, 480)], fill=(40, 48, 72), width=1)
            for y in range(0, 480, 60):
                draw.line([(0, y), (640, y)], fill=(40, 48, 72), width=1)

            # Center cross-hair
            cx, cy = 320, 240
            draw.line([(cx - 30, cy), (cx + 30, cy)], fill=(79, 110, 247), width=2)
            draw.line([(cx, cy - 30), (cx, cy + 30)], fill=(79, 110, 247), width=2)
            draw.ellipse([(cx - 40, cy - 40), (cx + 40, cy + 40)], outline=(79, 110, 247), width=1)

            # Main label
            try:
                font_large = ImageFont.truetype("arial.ttf", 36)
                font_small = ImageFont.truetype("arial.ttf", 18)
            except OSError:
                font_large = ImageFont.load_default()
                font_small = ImageFont.load_default()

            text_main = "MOCK CAMERA"
            bbox = draw.textbbox((0, 0), text_main, font=font_large)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            draw.text(((640 - tw) // 2, (480 - th) // 2 - 30), text_main, fill=(232, 236, 245), font=font_large)

            text_sub = "CLASS FORTRESS — MOCK MODE"
            bbox2 = draw.textbbox((0, 0), text_sub, font=font_small)
            tw2 = bbox2[2] - bbox2[0]
            draw.text(((640 - tw2) // 2, (480) // 2 + 20), text_sub, fill=(79, 110, 247), font=font_small)

            # Timestamp
            ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            draw.text((10, 455), ts, fill=(74, 81, 112), font=font_small)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            return base64.b64encode(buf.getvalue()).decode("utf-8")

        except ImportError:
            # Fallback: tiny 1×1 gray JPEG as base64
            return "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVIP/2Q=="

    def get_rtsp_url(self) -> str:
        return "mock://camera"


# ── Singleton ─────────────────────────────────────────────────────────────────
hardware_service = MockHardwareService()
