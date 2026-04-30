# Class Fortress

Class Fortress is a professor-facing operations dashboard for a smart IoT classroom system. It handles real-time face recognition attendance, gesture-based interactions (e.g. toilet requests), hardware control (solenoid door locks), and exam-mode monitoring (motion detection, phone counting).

## Prerequisites
- Node.js 18+
- Python 3.11+
- SQLite (included with Python)

## Quick Start
You can run the entire system in **Mock Mode** without any physical hardware.

```bash
# 1. Clone/Navigate to the repo
cd class-fortress

# 2. Set up and start the backend
cd backend
python -m venv venv
venv\Scripts\activate  # or `source venv/bin/activate` on Mac/Linux
pip install -r requirements.txt # or install fastapi uvicorn[standard] sqlalchemy aiosqlite python-multipart websockets pydantic python-dotenv
python -m uvicorn main:app --port 8000 --host 0.0.0.0 --reload

# 3. Set up and start the frontend
cd ../frontend
npm install
npm run dev
```

Open your browser to `http://localhost:5173`.

## Environment Variables
Create a `.env` file in the project root:

| Variable | Description |
|---|---|
| `MOCK_MODE` | Set to `true` to simulate hardware, `false` for production |
| `DB_URL` | e.g. `sqlite+aiosqlite:///./fortress.db` |
| `PI_HOST` | IP address of the Raspberry Pi (e.g. 192.168.1.100) |
| `PI_PORT` | Port of the Pi service (e.g. 8001) |
| `XIAOMI_RTSP` | RTSP stream URL for the Xiaomi Camera |
| `CORS_ORIGINS` | e.g. `http://localhost:5173` |

## Production (Real Hardware)
When you are ready to connect the physical devices:
1. Set `MOCK_MODE=false` in your `.env`.
2. Connect the Solenoid lock to GPIO 18 on the Raspberry Pi.
3. Connect the Pi Camera V3 using the CSI ribbon cable.
4. Set the `PI_HOST` and `XIAOMI_RTSP` environment variables.

## WebSocket Events Reference
The backend streams real-time JSON events over `ws://localhost:8000/ws/events`.
* `attendance_update`: Syncs roster state.
* `face_detected`: A recognized face (marks present).
* `gesture`: Detected hand gestures (requires action for toilet requests).
* `door_event`: Solenoid locked/unlocked.
* `timer_update`: Break duration countdowns.
* `phone_count`: AI verification of phone count vs expected.
* `motion_alert`: Suspicious motion flags in exam mode.
* `alert`: Critical system alerts.
