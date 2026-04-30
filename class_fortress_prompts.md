# Class Fortress — Complete AI IDE Prompt Suite
> Paste these prompts sequentially into your Claude-powered IDE (Cursor, Windsurf, etc.)
> Each phase must run to completion and pass its verification checklist before proceeding to the next.

---

## HOW TO USE THIS DOCUMENT

1. Open a **new workspace/project folder** in your IDE (name it `class-fortress`)
2. Paste **Phase 0** first — this is your persistent project memory. Pin it or save it as `CLAUDE_CONTEXT.md` in the root.
3. Paste each numbered phase prompt into the chat **one at a time**.
4. After each phase, run the listed verification steps before moving to the next.
5. Never skip phases or merge them — the agent builds on real files from the previous step.

---

---

# PHASE 0 — MASTER CONTEXT (paste once, keep open)

```
You are building "Class Fortress" — a professor-facing operations dashboard for a smart IoT classroom system.

## What you are building
A full-stack web application:
- React 18 + Vite frontend (TypeScript)
- FastAPI Python backend
- WebSocket real-time event stream
- SQLite database (dev mode)
- Mock mode for all hardware (Pi Camera, Xiaomi Camera, Solenoid) so the UI works without physical devices

## The system controls
1. Pi Camera V3 (connected to Raspberry Pi on LAN) — face recognition for attendance
2. Xiaomi camera (on LAN via RTSP) — hand gesture detection + phone counting (exam) + motion detection (exam)
3. Solenoid door lock (GPIO on Raspberry Pi) — controlled over the local network

## Two operating modes
- CLASS MODE: face attendance → solenoid lock → gesture detection (toilet, question, emergency) → door timer system
- EXAM MODE: all of class mode + phone count verification (YOLO) + motion/suspicion detection (OpenCV)

## Core user flow (class mode)
Professor opens dashboard → presses START SESSION → solenoid locks → Pi Cam captures class photo → faces recognized → attendance marked → Xiaomi cam watches for hand gestures → gesture appears on dashboard → professor approves/denies → if toilet approved: solenoid unlocks + 10-min timer starts → Pi Cam watches for returning face → if no return in time: solenoid locks + student marked absent

## Non-negotiable UX requirements
- One-click start session — no multi-step wizard
- Every hardware action shows immediate visual feedback (solenoid state, camera status)
- Gesture alerts appear in under 1 second of detection (WebSocket push)
- Professor can approve/deny a gesture in ONE click
- Active timers always visible — never hidden behind a tab
- The dashboard must work in MOCK MODE (no Pi, no cameras) for demo/development
- Zero ambiguous UI states — every element has a clear active/inactive/error state

## Design identity
- Aesthetic: Industrial-precision meets modern dark ops center. Think mission control, not consumer app.
- Color palette:
    --bg-base: #090c12          (near-black, page background)
    --bg-surface: #111520       (card background)
    --bg-elevated: #171c2e      (modals, popovers)
    --border: #1e2540           (subtle borders)
    --border-active: #2d3560    (hover/active borders)
    --accent: #4f6ef7           (primary blue — buttons, active states)
    --accent-glow: rgba(79,110,247,0.15)  (glow behind accent elements)
    --green: #22c55e            (present, connected, locked-safe)
    --amber: #f59e0b            (break, warning, pending)
    --red: #ef4444              (absent, alert, error)
    --text-primary: #e8ecf5
    --text-secondary: #8891a8
    --text-muted: #4a5170
- Font: "JetBrains Mono" for data/readouts, "Syne" for UI labels and headings (both from Google Fonts)
- Motion: fast and purposeful. 150ms transitions. Solenoid state change plays a short CSS lock animation. Event log entries slide in from top. No decorative animations — every motion communicates state.
- Layout: fixed 3-column grid (240px left | flex-1 center | 320px right), fixed header (56px), fixed bottom stats bar (48px). Everything inside is independently scrollable.

## Tech stack (locked — do not suggest alternatives)
Frontend: React 18, TypeScript, Vite, Tailwind CSS (with custom config using the palette above), Zustand for global state, React Query for server state, date-fns for time formatting
Backend: Python 3.11, FastAPI, uvicorn, python-multipart, websockets, SQLAlchemy + aiosqlite
Vision (mocked in dev): OpenCV, deepface, mediapipe, ultralytics (YOLOv8)
Hardware (mocked in dev): gpiozero, picamera2, requests (for Xiaomi API)

## Project structure (create exactly this)
class-fortress/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         (Header, LeftPanel, CenterPanel, RightPanel, BottomBar)
│   │   │   ├── session/        (SessionControls, HardwareStatus, ModeConfig)
│   │   │   ├── cameras/        (CameraFeed, FaceOverlay, MotionOverlay)
│   │   │   ├── events/         (EventLog, EventEntry, GestureAlert)
│   │   │   ├── attendance/     (RosterCard, StudentCard, BreakTimer)
│   │   │   └── exam/           (PhoneCountAlert, SuspicionAlert, MotionClip)
│   │   ├── store/              (useSessionStore, useHardwareStore, useAttendanceStore)
│   │   ├── hooks/              (useWebSocket, useSession, useGestures)
│   │   ├── api/                (client.ts, session.ts, hardware.ts, gestures.ts)
│   │   ├── types/              (session.ts, student.ts, event.ts, hardware.ts)
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── backend/
│   ├── main.py                 (FastAPI app, WebSocket endpoint)
│   ├── routers/
│   │   ├── session.py
│   │   ├── hardware.py
│   │   └── gestures.py
│   ├── services/
│   │   ├── vision_mock.py      (mock vision service — returns fake events)
│   │   ├── vision_real.py      (real OpenCV/DeepFace/MediaPipe service)
│   │   ├── hardware_mock.py    (mock solenoid/camera control)
│   │   ├── hardware_real.py    (real Pi GPIO + Xiaomi API control)
│   │   └── ws_manager.py       (WebSocket broadcast manager)
│   ├── models/
│   │   ├── database.py         (SQLAlchemy setup)
│   │   └── schemas.py          (Pydantic models)
│   ├── config.py               (env vars: MOCK_MODE=true by default)
│   └── requirements.txt
├── .env                        (MOCK_MODE=true, DB_URL=sqlite:///./fortress.db)
└── README.md

## Mock mode behavior
When MOCK_MODE=true (default):
- Hardware status endpoint returns all devices as CONNECTED
- Session start: immediately returns success, solenoid marked LOCKED
- Vision service: emits a simulated face recognition event 3 seconds after session start (marks 80% of students present), then emits a random gesture event every 30 seconds
- Phone count: always returns a matching count (no alert) unless ?force_mismatch=true query param
- Motion detection: emits a suspicious motion event every 60 seconds for a random student

## Key API contracts
POST /api/session/start      body: {mode: "class"|"exam", course_id: string}
POST /api/session/end        body: {session_id: string}
POST /api/gesture/respond    body: {gesture_id: string, decision: "approve"|"deny"}
POST /api/door/override      body: {action: "lock"|"unlock", reason: string}
GET  /api/hardware/status    returns: {pi_camera, xiaomi_camera, solenoid, network_ms}
GET  /api/session/{id}/report
WS   /ws/events              streams: EventMessage objects

## EventMessage WebSocket schema
{
  id: string,
  type: "face_detected" | "gesture" | "door_event" | "attendance_update" | "alert" | "timer_update" | "phone_count" | "motion_alert",
  timestamp: string (ISO),
  student_id?: string,
  student_name?: string,
  payload: object  // type-specific data
  severity: "info" | "warning" | "critical",
  requires_action: boolean
}

## Gesture types and their required actions
toilet_request   → shows [APPROVE] [DENY] buttons → approve: unlock door + start 10min timer
question         → info log only, no action needed
emergency        → critical alert + auto-notify (no approve/deny — always acknowledged)
submit_exam      → exam mode only → shows [CONFIRM SUBMISSION] button
wave             → exam mode only → info log
```

---

---

# PHASE 1 — Project scaffold + design system

```
Using the MASTER CONTEXT above, set up the complete project scaffold. Do the following steps in order:

STEP 1 — Create the project structure
Run these commands:
  mkdir class-fortress && cd class-fortress
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  npm install tailwindcss @tailwindcss/vite zustand @tanstack/react-query date-fns
  npx tailwindcss init -p
  cd .. && mkdir backend && cd backend
  python3 -m venv venv
  source venv/bin/activate  (or venv\Scripts\activate on Windows)
  pip install fastapi uvicorn[standard] sqlalchemy aiosqlite python-multipart websockets pydantic python-dotenv

STEP 2 — Create the .env file at project root
Contents:
  MOCK_MODE=true
  DB_URL=sqlite+aiosqlite:///./fortress.db
  PI_HOST=192.168.1.100
  PI_PORT=8001
  XIAOMI_RTSP=rtsp://192.168.1.101:554/stream
  CORS_ORIGINS=http://localhost:5173

STEP 3 — Configure Tailwind
Write the tailwind.config.ts with the full custom color palette from the MASTER CONTEXT. The CSS variables must be registered as Tailwind colors so you can use classes like bg-bg-base, text-accent, border-border, text-green, text-amber, text-red etc.

STEP 4 — Write the global CSS (src/index.css)
- Import Google Fonts: Syne (weights 400, 500, 600, 700) and JetBrains Mono (weights 400, 500)
- Set html, body background to var(--bg-base)
- Set base font to Syne
- Set font-mono utility to JetBrains Mono
- Add a custom scrollbar style: 4px wide, bg-surface track, accent thumb
- Add a .glow-accent class: box-shadow 0 0 20px var(--accent-glow)
- Add a .lock-state-locked class and .lock-state-unlocked class with their respective color treatments
- Add keyframes: slide-in-top (translateY(-8px) → 0, opacity 0→1, 150ms ease-out), pulse-red (border-color cycles through red shades), fade-in (opacity 0→1, 200ms)

STEP 5 — Write all TypeScript types (src/types/)
Create four files with complete, strict types:
  session.ts    — Session, SessionMode, SessionStatus
  student.ts    — Student, AttendanceStatus, BreakTimer
  event.ts      — EventMessage, EventType, GestureType, Severity
  hardware.ts   — HardwareStatus, DeviceStatus, SolenoidState

STEP 6 — Write the Zustand stores (src/store/)
Three stores, each in its own file:
  useSessionStore.ts    — holds: currentSession, mode, status, startSession(), endSession(), setMode()
  useHardwareStore.ts   — holds: hardwareStatus, solenoidState, setSolenoidState(), updateStatus()
  useAttendanceStore.ts — holds: students[], breaks[], markPresent(), markAbsent(), startBreak(), endBreak(), updateTimers()

STEP 7 — Write the API client (src/api/client.ts)
- Base URL from env (VITE_API_URL defaulting to http://localhost:8000)
- Typed fetch wrapper with error handling
- Export typed functions: startSession(), endSession(), respondToGesture(), overrideDoor(), getHardwareStatus()

STEP 8 — Write the WebSocket hook (src/hooks/useWebSocket.ts)
- Connects to ws://localhost:8000/ws/events
- Auto-reconnects with exponential backoff (max 5 retries)
- On message: parses EventMessage and dispatches to the appropriate Zustand store action based on event type
- Exposes: isConnected, lastEvent, connectionAttempts

VERIFICATION — Before proceeding to Phase 2, confirm:
□ npm run dev starts without TypeScript errors
□ All type files compile cleanly (npx tsc --noEmit)
□ Zustand stores import and initialize without errors
□ .env file is present and readable
□ Tailwind classes from the custom palette resolve (test with a div using bg-bg-surface)
```

---

---

# PHASE 2 — Backend (FastAPI + mock services + WebSocket)

```
Using the MASTER CONTEXT, build the complete backend. The frontend mock mode depends on this running correctly.

STEP 1 — Write backend/config.py
- Load all env vars from .env using python-dotenv
- Expose: MOCK_MODE (bool), DB_URL, PI_HOST, PI_PORT, XIAOMI_RTSP, CORS_ORIGINS
- If MOCK_MODE is true, log a prominent startup warning: "⚠ CLASS FORTRESS RUNNING IN MOCK MODE — No real hardware connected"

STEP 2 — Write backend/models/database.py and schemas.py
database.py:
- Async SQLAlchemy engine using aiosqlite
- Tables: sessions, students, attendance, events, breaks, phone_checks, motion_alerts
- create_all() called on startup

schemas.py (Pydantic v2):
- StartSessionRequest, EndSessionRequest, GestureResponseRequest, DoorOverrideRequest
- SessionResponse, HardwareStatusResponse, EventMessageResponse
- All fields typed, no Optional without defaults

STEP 3 — Write backend/services/ws_manager.py
- WebSocketManager class with:
    connect(websocket) — adds to active connections
    disconnect(websocket) — removes and handles cleanup
    broadcast(message: dict) — sends JSON to all active connections
    broadcast_to_session(session_id, message) — filter by session
- Use asyncio.Lock to prevent concurrent write conflicts

STEP 4 — Write backend/services/hardware_mock.py
MockHardwareService class:
  get_status() → returns HardwareStatusResponse with all devices CONNECTED, network_ms=4
  lock_solenoid() → logs "MOCK: Solenoid LOCKED", returns {success: true, state: "locked"}
  unlock_solenoid() → logs "MOCK: Solenoid UNLOCKED", returns {success: true, state: "unlocked"}
  capture_snapshot() → returns a base64-encoded 640x480 placeholder image (generate it with Pillow: dark gray rectangle with "MOCK CAMERA" white text centered)
  get_rtsp_url() → returns "mock://camera" (frontend will show a placeholder)

STEP 5 — Write backend/services/vision_mock.py
MockVisionService class:
  async simulate_attendance(session_id, student_list, ws_manager):
    - Wait 3 seconds
    - Mark 80% of students as present (random selection)
    - For each: broadcast a face_detected EventMessage
    - Then broadcast a single attendance_update with the full roster

  async simulate_gesture_loop(session_id, ws_manager, mode):
    - Every 30 seconds pick a random active student
    - In class mode: randomly pick from [toilet_request, question, emergency]
    - In exam mode: also pick from [submit_exam, wave]
    - Broadcast a gesture EventMessage with requires_action=true for toilet_request and submit_exam

  async simulate_motion_loop(session_id, ws_manager):
    - Only runs in exam mode
    - Every 60 seconds broadcast a motion_alert for a random student
    - severity: "warning", confidence: random 0.6–0.9

  async simulate_phone_check(session_id, present_count, ws_manager):
    - Broadcast phone_count event with detected=present_count (no mismatch by default)

STEP 6 — Write all three routers

backend/routers/session.py:
  POST /api/session/start:
    - Validate request
    - Create session record in DB
    - Call hardware_service.lock_solenoid()
    - Start background tasks: simulate_attendance(), simulate_gesture_loop(), and if exam: simulate_motion_loop(), simulate_phone_check()
    - Return session record

  POST /api/session/end:
    - Update session end_time in DB
    - Call hardware_service.lock_solenoid() (always lock on end)
    - Cancel background tasks for this session
    - Return final session summary with attendance stats

  GET /api/session/{id}/report:
    - Return full session data: attendance list, event log, break history

backend/routers/hardware.py:
  GET /api/hardware/status → calls hardware_service.get_status()
  POST /api/door/override → validates reason field (required), calls lock or unlock, broadcasts door_event
  GET /api/camera/snapshot → calls hardware_service.capture_snapshot(), returns base64 image

backend/routers/gestures.py:
  POST /api/gesture/respond:
    - Fetch the gesture event from DB
    - If decision=approve AND gesture_type=toilet_request:
        unlock solenoid, create a break record with end_time = now + 10 minutes,
        start a background timer task that:
          - every 10 seconds checks if break end_time has passed
          - broadcasts timer_update events with remaining seconds
          - at 0: locks solenoid, marks student absent, broadcasts attendance_update + alert
    - Mark event as resolved in DB
    - Broadcast updated event to all WS clients
    - Return success

STEP 7 — Write backend/main.py
- Create FastAPI app with CORS (origins from config)
- Include all three routers with prefix /api
- WebSocket endpoint at /ws/events:
    accept connection, register with ws_manager
    listen for messages in a loop (keep-alive ping every 30s)
    on disconnect: unregister
- Startup event: create DB tables, log startup info
- Health check GET / → {"status": "ok", "mock_mode": bool, "version": "1.0.0"}

STEP 8 — Write backend/requirements.txt with pinned versions

VERIFICATION — Before proceeding to Phase 3, confirm:
□ cd backend && uvicorn main:app --reload starts with no errors
□ GET http://localhost:8000/ returns {"status": "ok", "mock_mode": true, ...}
□ GET http://localhost:8000/api/hardware/status returns all devices connected
□ Open ws://localhost:8000/ws/events in a WebSocket client — connection accepted
□ POST /api/session/start with {"mode": "class", "course_id": "CS280"} returns a session object
□ After session start, WebSocket receives face_detected events after ~3 seconds
□ After 30 seconds, WebSocket receives a gesture event
```

---

---

# PHASE 3 — Core layout + left panel

```
Build the complete app shell and left panel. The right and center panels will be placeholders for now.

STEP 1 — Write App.tsx
- Query params or Zustand to know if session is active
- Three-column fixed layout using CSS grid: 240px | 1fr | 320px
- Fixed header 56px tall at top
- Fixed bottom bar 48px tall at bottom
- Middle row fills remaining viewport height, overflow hidden
- Mount useWebSocket hook here (runs for entire app lifetime)
- React Query provider wrapping everything
- Poll /api/hardware/status every 10 seconds, update hardwareStore

STEP 2 — Write Header component (src/components/layout/Header.tsx)
Layout: logo left | mode toggle center | right cluster
- Logo: "CLASS FORTRESS" in Syne 600 weight, letter-spacing wide, accent color on "FORTRESS"
- Mode toggle: a pill switch with two options. Class Mode (blue accent when active) and Exam Mode (amber accent when active). Switching while a session is active shows an inline warning tooltip "Switching mode will reload gesture detection". The toggle animates the pill sliding between positions (CSS transition on transform).
- Right cluster: live clock (JetBrains Mono, updates every second), session status badge (IDLE in muted / LIVE with pulsing green dot), professor name "Prof. System"
- Full-width 1px border-bottom using --border color
- No background — inherits --bg-base

STEP 3 — Write LeftPanel component (src/components/layout/LeftPanel.tsx)
Scrollable column, 240px wide, border-right --border, padding 16px, gap 12px between cards.
Contains three sub-components stacked vertically.

STEP 4 — Write SessionControls (src/components/session/SessionControls.tsx)
Card with bg-surface, rounded-lg, border, padding 16px.
States:
  IDLE state:
    - Card title "SESSION" in text-muted small caps
    - Course selector: a styled <select> showing "CS280 - AI Lab", "MATH201 - Diff Eq", "IOT340 - Embedded" (hardcoded for now, will pull from DB later)
    - Big START SESSION button: full width, bg-accent, text-primary, font-medium, 40px height, rounded-md
    - Hover: slight brightness increase + glow-accent box-shadow
    - Click: calls startSession() from store, shows loading spinner inside button during API call

  ACTIVE state:
    - Session timer: large JetBrains Mono display "00:47:23" counting up, text-primary
    - Course name shown above timer in text-secondary small
    - Two buttons side by side: PAUSE (outlined, text-secondary) and END SESSION (bg-red/20, text-red, border-red/30)
    - END SESSION requires a confirmation: clicking it shows an inline confirmation row "End session? [CONFIRM] [CANCEL]" appearing below with fade-in animation

  LOADING state: spinner inside the button, all controls disabled

STEP 5 — Write HardwareStatus (src/components/session/HardwareStatus.tsx)
Card with title "HARDWARE".
2×2 grid of device status indicators. Each indicator:
  - Device icon (simple SVG inline, 16px): camera icon for cameras, lock icon for solenoid, wifi icon for network
  - Device name in text-secondary 12px
  - Status dot: green (connected/locked), amber (warning), red (error/offline)
  - Status text in JetBrains Mono 11px: "CONNECTED", "STREAMING", "LOCKED", "4ms"
  - If status is error/offline: the card itself gets a subtle red left-border 2px
  - Solenoid row is special: shows LOCKED 🔒 or UNLOCKED 🔓, and has a small OVERRIDE link (text-muted, underline) that opens an override modal

  Override modal:
    - Fixed overlay (dark semi-transparent bg)
    - Small card centered: "Manual Door Override"
    - Reason text input (required)
    - Two buttons: LOCK DOOR and UNLOCK DOOR
    - Submit calls POST /api/door/override
    - Shows result inline then auto-closes after 2 seconds

STEP 6 — Write ModeConfig (src/components/session/ModeConfig.tsx)
Collapsible card. Header: "CONFIG" with a chevron icon that rotates on open/close.
When collapsed: shows only the header (32px tall).
When expanded (default): shows mode-specific settings.

Class Mode settings:
  - Break duration: number input with +/- stepper, default 10, min 5, max 30, label "Break timer (min)"
  - Auto-lock after return: toggle switch (pill style, accent when on)
  - Gesture detection: toggle (on by default)

Exam Mode settings (replaces class mode settings when mode is exam):
  - Same break duration setting
  - Phone tolerance: number input 0–5, default 0, label "Phone tolerance (±)"
  - Motion sensitivity: three-segment selector Low | Medium | High (pill group, one active at a time)
  - Alert sound: toggle

All settings are stored in Zustand sessionStore.config and sent with session start request.

STEP 7 — Write BottomBar (src/components/layout/BottomBar.tsx)
Fixed bottom bar, 48px tall, bg-surface, border-top --border.
Five metric chips in a horizontal row, evenly spaced:
  PRESENT   [N] / [Total]    (text-green for N)
  ABSENT    [N]              (text-red)
  ON BREAK  [N]              (text-amber)
  GESTURES  [N] handled      (text-secondary)
  SESSION   [timer]          (JetBrains Mono)
All numbers animate when they change: quick scale-up 1→1.1→1 over 200ms.
Data comes from Zustand attendanceStore and sessionStore.

VERIFICATION — Before proceeding to Phase 4, confirm:
□ Three-column layout renders correctly at 1280px+ width
□ Header mode toggle animates smoothly
□ Clock updates every second
□ START SESSION button triggers API call, shows loading, then transitions to ACTIVE state
□ Hardware status shows all 4 devices with correct mock statuses
□ ModeConfig collapses and expands with chevron animation
□ Bottom bar metrics update when Zustand stores change
□ No TypeScript errors (npx tsc --noEmit)
```

---

---

# PHASE 4 — Center panel (cameras + event log + alerts)

```
Build the center panel — the highest-information area of the dashboard.

STEP 1 — Write CenterPanel (src/components/layout/CenterPanel.tsx)
Flex column, flex-1, overflow-y auto, padding 16px, gap 16px.
Contains in order: CameraFeedsRow, EventLog, ExamAlerts (conditional on exam mode).

STEP 2 — Write CameraFeedsRow (src/components/cameras/)
Two camera tiles side by side in a grid (1fr 1fr, gap 12px).

CameraFeed component (used twice with different config):
Props: title, badgeText, badgeColor, stream (string | null), overlayComponent

Tile structure:
  - 16:9 aspect ratio container (use padding-bottom: 56.25% trick)
  - Background: bg-elevated, rounded-lg, overflow hidden
  - Top-left badge: small pill with dot + text, e.g. "● FACE RECOGNITION — ACTIVE" (green dot, text-secondary font-mono 10px)
  - Top-right: fullscreen icon button (opens modal overlay)
  - Stream area: if stream is "mock://camera" → show a styled placeholder (dark bg, centered "MOCK FEED" in text-muted, with a slow animated scan-line effect using CSS: a 2px line sweeping top to bottom every 3 seconds using a CSS animation on a pseudo-element)
  - If stream is a real URL: render an <img> with the MJPEG URL (Pi Cam) or an HLS player
  - Overlay slot: renders FaceOverlay or MotionOverlay as absolute-positioned children

FaceOverlay (src/components/cameras/FaceOverlay.tsx):
  Props: detections (array of {student_name, x, y, w, h, status})
  Renders absolute-positioned divs matching face bounding boxes:
    - Border: 1.5px solid green (present) or amber (unknown)
    - Corner brackets instead of full rectangle (CSS clip-path or SVG borders)
    - Name label below the box: bg-surface/80 backdrop-blur, text-primary 11px JetBrains Mono, rounded
  Updates from WebSocket face_detected events

MotionOverlay (src/components/cameras/MotionOverlay.tsx):
  Props: alerts (array of {x, y, w, h, confidence})
  Renders red semi-transparent rectangles (bg-red/20, border-red)
  Confidence score shown inside each box: "87% conf" in JetBrains Mono 10px
  Only shown in exam mode

STEP 3 — Write EventLog (src/components/events/EventLog.tsx)
Full width, flexible height (min 300px, grows with content up to a max before scrolling).
Header row: "EVENTS" title + filter tabs on the right (All | Gestures | Door | Attendance | Alerts) — clicking a tab filters the list. Active tab: accent color underline.
Export button (right side): icon + "EXPORT" text, downloads log as CSV on click.

The log list: scrollable, newest event at top.
Uses a virtualized list if entries exceed 100 (use @tanstack/virtual or a simple slice to last 200).
Each entry is an EventEntry component.

EventEntry (src/components/events/EventEntry.tsx):
Props: event: EventMessage
Layout: horizontal row, 40px min-height, border-b border-tertiary, hover:bg-elevated.
- Left: colored 3px left-border (green=info, amber=warning, red=critical)
- Timestamp: JetBrains Mono 11px text-muted, e.g. "14:23:07"
- Icon: small SVG icon matching event type (hand for gesture, door for door, face for face, alert for alert)
- Message: auto-generated from event type + student name + payload, text-secondary 13px
- Right: for events with requires_action=true → show GestureAlert buttons inline

GestureAlert (src/components/events/GestureAlert.tsx):
Only renders when event.requires_action is true AND event is not yet resolved.
Two buttons side by side:
  APPROVE: bg-green/10 text-green border-green/30, hover bg-green/20
  DENY: bg-red/10 text-red border-red/30, hover bg-red/20
Clicking either:
  - Immediately grays out both buttons and shows a spinner on the clicked one
  - POSTs to /api/gesture/respond
  - On success: buttons replaced with "✓ Approved" or "✗ Denied" text in the appropriate color
  - If approve + toilet_request: a new BreakTimer appears in the right panel

Entry animation: new entries slide in from top using the slide-in-top keyframe (150ms). Apply only to entries inserted after mount (use a flag).

STEP 4 — Write ExamAlerts section (src/components/exam/)
Only rendered when mode === "exam". Two subsections:

PhoneCountAlert (src/components/exam/PhoneCountAlert.tsx):
Default state: a small status bar showing "📱 Phone count: N / N students — OK" in green.
Alert state (triggered by phone_count WebSocket event with mismatch):
  Red banner, full width, prominent:
  "⚠ PHONE COUNT MISMATCH — Detected: N | Expected: M | Difference: D
   Verify the exam room immediately."
  ACKNOWLEDGE button (marks as seen, banner collapses to a dismissed chip with the alert info)
  Timestamp and auto-generated alert ID.

SuspicionAlert (src/components/exam/SuspicionAlert.tsx):
Card per motion_alert event.
Shows: student name, seat region, confidence bar (colored progress bar from green→red based on confidence %), timestamp.
Two buttons: FLAG STUDENT (marks student as flagged in attendanceStore, sends to backend) | DISMISS.
Flagged state: card gets a permanent red left-border and a "FLAGGED" badge.
Dismissed: card fades out and is removed from list.

STEP 5 — Wire up all WebSocket events to UI
In useWebSocket hook (update the existing one), ensure:
  face_detected → attendanceStore.markPresent(student_id) + update FaceOverlay detections state
  gesture → add to event log with requires_action=true, play a soft notification sound if sound enabled
  door_event → add to event log, update hardwareStore solenoid state
  attendance_update → attendanceStore bulk update
  alert → add to event log with severity=critical, show browser notification if permitted
  timer_update → attendanceStore.updateBreakTimer(student_id, remaining_seconds)
  phone_count → update PhoneCountAlert state
  motion_alert → add SuspicionAlert card

STEP 6 — Notification permission
On session start, request browser Notification permission.
For events with severity=critical: fire a browser Notification with title "Class Fortress Alert" and the event message.

VERIFICATION — Before proceeding to Phase 5, confirm:
□ Camera tiles render with correct mock scan-line animation
□ After session start, face_detected WebSocket events appear in the log within 3 seconds
□ Event log filter tabs work
□ GestureAlert approve/deny buttons trigger API call and update UI correctly
□ After approving a toilet_request, a timer appears in the right panel (Phase 5 builds it — for now just confirm the Zustand state is updated with a console.log)
□ Exam mode shows PhoneCountAlert and SuspicionAlert sections
□ Motion alert events from WebSocket create SuspicionAlert cards
□ No layout overflow issues on 1280px viewport
```

---

---

# PHASE 5 — Right panel (roster + timers) + final polish

```
Build the right panel, then apply final polish across the entire dashboard.

STEP 1 — Write RightPanel (src/components/layout/RightPanel.tsx)
320px wide, border-left --border, flex column, overflow hidden.
Two sections stacked:
  - ActiveBreaks (fixed height, only shown when breaks > 0, max 200px, scrollable if multiple)
  - AttendanceRoster (flex-1, scrollable)

STEP 2 — Write ActiveBreaks section (src/components/attendance/BreakTimer.tsx)
Only visible when attendanceStore.breaks has at least one active entry.
Section header: "ACTIVE BREAKS" in text-muted small caps, with a count badge (amber pill with number).

Each BreakTimer card:
  - Student name: text-primary font-medium
  - Gesture type label: "Toilet break" or "Medical leave" in text-secondary 12px
  - Countdown: large JetBrains Mono display, e.g. "06:42" — counts down in real time using the remaining_seconds from Zustand (decrements locally every second, syncs on timer_update WebSocket events)
  - Progress bar: full-width, 4px height, rounded. Starts green, transitions to amber at 3min, transitions to red at 1min. Bar drains left-to-right proportionally.
  - At 2 minutes: card border pulses red (pulse-red keyframe)
  - At 0:00: card border goes solid red, countdown shows "00:00", buttons disabled, shows "AWAITING LOCK" text until the WebSocket confirms solenoid locked + student marked absent
  - Two action buttons:
      EXTEND 5 MIN: outlined amber, disabled after one use per break (show "(used)" text after)
        onClick: calls POST /api/gesture/respond with a special extend action, updates break end_time in store
      MARKED RETURNED: outlined green
        onClick: calls POST /api/gesture/respond with return action, removes break from list, marks student present, broadcasts door lock

STEP 3 — Write AttendanceRoster (src/components/attendance/RosterCard.tsx + StudentCard.tsx)
RosterCard (the section wrapper):
  - Header: "ATTENDANCE" title + search input (icon + text, 100% width, bg-elevated, border, rounded)
  - Status filter chips below search: ALL | PRESENT | ABSENT | BREAK | PENDING — clicking filters the list
  - Student count summary: "24 students · 19 present · 3 absent · 2 pending" in text-muted 12px

StudentCard (each student row):
Default (collapsed) state: 52px height, horizontal layout
  - Avatar: 28px circle, bg-elevated, initials in JetBrains Mono 11px, text-secondary
  - Name: text-primary 13px font-medium
  - Course/seat: text-muted 11px
  - Status badge (right-aligned):
      PRESENT: bg-green/10, text-green, border-green/20 — "● PRESENT"
      ABSENT: bg-red/10, text-red — "✕ ABSENT"
      BREAK: bg-amber/10, text-amber, animated — "◌ BREAK 06:42" (time updates live)
      PENDING: bg-muted/10, text-muted — "– PENDING"
      FLAGGED (exam only): bg-orange-500/10, text-orange-400, border — "⚑ FLAGGED"

Expanded state (click to expand):
  Card grows to show additional info:
  - Check-in time: "Checked in at 14:15:02" in text-muted 12px
  - Any gesture events for this student (compact list, up to 3, each with timestamp and type)
  - Manual override buttons: [MARK PRESENT] [MARK ABSENT] — each confirms inline before committing
  - If exam mode + flagged: flagged reason and confidence score

Expansion animation: height animates from 52px to auto using max-height transition (200ms ease-out).

Sorting: BREAK students always at top, then ABSENT, then PRESENT, then PENDING.

STEP 4 — Populate with mock student data
In attendanceStore, add a preloaded list of 24 mock students:
  Mix of Arabic names (reflecting the Mediterranean context): Ahmed Belhaj, Mariem Chatti, Youssef Mansouri, Fatma Ben Ali, Khaled Trabelsi, Ines Hamdi, Sami Bouazizi, Rania Maaloul, etc.
  All start as PENDING. After session start and face recognition events: 19 become PRESENT, 3 stay PENDING, 2 become ABSENT.

STEP 5 — Final polish pass (apply to ALL components)

Typography consistency:
  - All section headers: Syne 11px uppercase letter-spacing-widest text-muted (use a shared <SectionLabel> component)
  - All data readouts (times, counts, IDs): JetBrains Mono
  - All action labels: Syne font-medium
  - All descriptive text: Syne 13px text-secondary

Spacing and borders:
  - All cards: rounded-lg (8px), border border-border, bg-bg-surface, p-4
  - Card internal sections separated by border-b border-border (not margin)
  - Consistent 16px outer padding on all panels
  - 12px gap between cards within a panel

Micro-interactions:
  - All buttons: 150ms transition on background, border-color, box-shadow. Active state: scale(0.97).
  - Toggle switches: CSS-only, pill slides with transform transition 150ms
  - Status dots: pulsing animation for LIVE session badge only (CSS animation, 2s infinite)
  - Solenoid state change: when solenoid goes from locked to unlocked, the lock icon in HardwareStatus plays a short "opening" CSS animation (rotate + scale). When it locks: reverse.

Error states:
  - If WebSocket disconnects: show a non-blocking toast at the top of the center panel "● Connection lost — reconnecting..." in amber. Disappears when reconnected.
  - If an API call fails: inline error message on the relevant component (never a page-level error)
  - If a camera feed fails: tile shows "FEED UNAVAILABLE" with a retry button

Empty states:
  - No breaks: ActiveBreaks section is hidden (not empty card)
  - No events yet: EventLog shows "Waiting for session events..." centered in the log area
  - No flagged students: SuspicionAlert section hidden

Loading states:
  - Session starting: overlay on left panel with spinner + "Initializing session..."
  - Student list loading: skeleton cards (3 placeholder rows with shimmer animation)

STEP 6 — Mobile fallback (tablet at 768px–1024px)
At ≤1024px: collapse to 2 columns. Left panel becomes a slide-out drawer (hamburger button in header).
At ≤768px: single column with a bottom tab navigator (Session | Cameras | Attendance | Events).
Do not spend time perfecting mobile — just ensure it does not catastrophically break.

STEP 7 — Final README.md
Write a clear README with:
  - Prerequisites
  - Quick start (5 commands to have it running)
  - Environment variables table
  - How to switch from mock to real hardware (set MOCK_MODE=false, set PI_HOST, XIAOMI_RTSP)
  - WebSocket event reference table
  - Hardware wiring notes (Pi GPIO pin for solenoid, CSI ribbon for Pi Cam)

FINAL VERIFICATION — Full system check:
□ npm run dev + uvicorn running simultaneously — no console errors
□ START SESSION → hardware status updates → events start flowing within 3 seconds
□ Gesture event appears in log with APPROVE/DENY → click APPROVE → break timer starts in right panel → timer counts down → at 0 student marked absent
□ Mode switch Class→Exam → config panel updates → motion alerts appear in center panel
□ Door override modal opens → submit reason → solenoid state updates in hardware panel
□ 24 students load → search filters → status filter chips work → expand a student card → manual override works
□ Session END → confirmation → session ends → all timers stop → stats preserved in bottom bar
□ No TypeScript errors: npx tsc --noEmit
□ No console errors in browser
□ Looks correct at 1280px, 1440px, 1920px
```

---

---

## TROUBLESHOOTING REFERENCE

**WebSocket not connecting:**
Check that uvicorn is running on port 8000 and the Vite proxy in vite.config.ts forwards `/ws` to `ws://localhost:8000`. Add to vite.config.ts:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:8000',
    '/ws': { target: 'ws://localhost:8000', ws: true }
  }
}
```

**CORS errors:**
Ensure CORS_ORIGINS in .env includes `http://localhost:5173` and that FastAPI's CORSMiddleware is added before the routers.

**SQLite async errors:**
Use `aiosqlite` as the driver (`sqlite+aiosqlite:///./fortress.db`). All DB calls must be `async/await` with `async_session`.

**Tailwind classes not applying:**
Ensure `tailwind.config.ts` content array includes `./src/**/*.{ts,tsx}` and that the custom colors are defined in `theme.extend.colors`.

**Camera feed CORS:**
MJPEG streams from the Pi may hit browser CORS. Proxy them through the FastAPI backend: add a `/proxy/camera` endpoint that streams the Pi Camera response.

---

## SWITCHING TO REAL HARDWARE

When physical hardware is ready:
1. Set `MOCK_MODE=false` in `.env`
2. Set `PI_HOST` to the Raspberry Pi's IP address
3. Set `XIAOMI_RTSP` to the camera's RTSP URL
4. On the Raspberry Pi, run the companion service: `uvicorn pi_service:app --host 0.0.0.0 --port 8001`
5. The Pi service handles: Pi Camera V3 (picamera2), solenoid (gpiozero GPIO18), face capture endpoint
6. Install real vision dependencies: `pip install deepface mediapipe ultralytics opencv-python-headless`
7. The backend auto-selects `hardware_real.py` and `vision_real.py` when MOCK_MODE=false

---
*Class Fortress Dashboard — Mediterranean Institute of Technology*
*IoT & Industry Automation — CS280 / Differential Equations Project*
