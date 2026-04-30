"""
backend/services/task_registry.py — global registry for per-session asyncio Tasks.
Allows clean cancellation when a session ends.
"""
from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)

# session_id → list of running Tasks
_tasks: dict[str, list[asyncio.Task]] = {}


def register(session_id: str, task: asyncio.Task) -> None:
    _tasks.setdefault(session_id, []).append(task)


async def cancel_session(session_id: str) -> None:
    tasks = _tasks.pop(session_id, [])
    for t in tasks:
        if not t.done():
            t.cancel()
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass
    logger.info(f"[Tasks] Cancelled {len(tasks)} task(s) for session {session_id}")
