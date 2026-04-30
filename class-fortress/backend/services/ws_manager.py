"""
backend/services/ws_manager.py — WebSocket connection manager.
Uses asyncio.Lock to prevent concurrent write conflicts.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        # Maps websocket → session_id (or None if not bound to a session)
        self._connections: dict[WebSocket, str | None] = {}
        self._lock = asyncio.Lock()

    # ── Connection lifecycle ──────────────────────────────────────────────────

    async def connect(self, websocket: WebSocket, session_id: str | None = None) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[websocket] = session_id
        logger.info(f"[WS] Client connected. Total: {len(self._connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.pop(websocket, None)
        logger.info(f"[WS] Client disconnected. Total: {len(self._connections)}")

    def bind_session(self, websocket: WebSocket, session_id: str) -> None:
        """Associate a websocket with a session after connection."""
        self._connections[websocket] = session_id

    # ── Broadcasting ──────────────────────────────────────────────────────────

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send JSON message to ALL active connections."""
        if not self._connections:
            return
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []

        async with self._lock:
            targets = list(self._connections.keys())

        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"[WS] Send failed: {e} — marking dead")
                dead.append(ws)

        for ws in dead:
            await self.disconnect(ws)

    async def broadcast_to_session(self, session_id: str, message: dict[str, Any]) -> None:
        """Send JSON message only to connections bound to a specific session."""
        if not self._connections:
            return
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []

        async with self._lock:
            targets = [ws for ws, sid in self._connections.items() if sid == session_id or sid is None]

        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"[WS] Session send failed: {e}")
                dead.append(ws)

        for ws in dead:
            await self.disconnect(ws)

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# ── Singleton ─────────────────────────────────────────────────────────────────
ws_manager = WebSocketManager()
