"""
backend/main.py — FastAPI application entry point.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings, log_startup_banner
from backend.models.database import init_db
from backend.services.ws_manager import ws_manager
from backend.routers import session, hardware, gestures

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    log_startup_banner()
    await init_db()
    logger.info("🏰 Class Fortress API ready.")
    yield
    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("🏰 Class Fortress shutting down.")


app = FastAPI(
    title="Class Fortress API",
    description="Professor-facing IoT classroom operations dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────────
app.include_router(session.router)
app.include_router(hardware.router)
app.include_router(gestures.router)


# ── Health check ────────────────────────────────────────────────────────────────
@app.get("/")
async def health():
    return {
        "status":      "ok",
        "mock_mode":   settings.mock_mode,
        "version":     "1.0.0",
        "ws_clients":  ws_manager.connection_count,
    }


# ── WebSocket endpoint ──────────────────────────────────────────────────────────
@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            try:
                # Wait for client messages (pings) with a 35-second timeout.
                # If no message arrives in 35s we send a server-side keepalive.
                data = await asyncio.wait_for(websocket.receive_text(), timeout=35.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send keepalive ping to check if client is still alive
                try:
                    await websocket.send_text("ping")
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"[WS] Unexpected error: {e}")
    finally:
        await ws_manager.disconnect(websocket)
