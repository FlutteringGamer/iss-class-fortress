/**
 * Typed API client.
 * Base URL: VITE_API_URL env var, defaults to http://localhost:8000
 */
import type {
  SessionStartRequest, SessionStartResponse,
  SessionEndRequest, SessionEndResponse,
  SessionReport,
} from '../types/session';
import type { HardwareStatus } from '../types/hardware';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

// ── Core fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} on ${path}: ${body}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Typed API functions ────────────────────────────────────────────────────

/** Start a new session. Locks solenoid and kicks off vision in mock mode. */
export async function startSession(body: SessionStartRequest): Promise<SessionStartResponse> {
  return apiFetch<SessionStartResponse>('/api/session/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** End an active session. */
export async function endSession(body: SessionEndRequest): Promise<SessionEndResponse> {
  return apiFetch<SessionEndResponse>('/api/session/end', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Respond to a pending gesture (approve or deny). */
export async function respondToGesture(
  gesture_id: string,
  decision: 'approve' | 'deny'
): Promise<{ gesture_id: string; decision: string; door_action?: string; timer_minutes?: number; message: string }> {
  return apiFetch('/api/gesture/respond', {
    method: 'POST',
    body: JSON.stringify({ gesture_id, decision }),
  });
}

/** Manual door override — lock or unlock with a reason. */
export async function overrideDoor(
  action: 'lock' | 'unlock',
  reason: string
): Promise<{ action: string; new_state: string; reason: string; timestamp: string }> {
  return apiFetch('/api/door/override', {
    method: 'POST',
    body: JSON.stringify({ action, reason }),
  });
}

/** Poll all hardware device statuses. */
export async function getHardwareStatus(): Promise<HardwareStatus> {
  return apiFetch<HardwareStatus>('/api/hardware/status');
}

/** Get full session report by ID. */
export async function getSessionReport(sessionId: string): Promise<SessionReport> {
  return apiFetch<SessionReport>(`/api/session/${sessionId}/report`);
}
