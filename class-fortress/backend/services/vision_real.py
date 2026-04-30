"""
Real vision service — production implementation using OpenCV, DeepFace, MediaPipe, YOLO.
NOT used in MOCK_MODE=true. Wire in hardware access here.

Install extras: pip install opencv-python deepface mediapipe ultralytics picamera2
"""
import logging
from backend.models.schemas import StudentOut

logger = logging.getLogger(__name__)


class RealVisionSession:
    """
    Production vision session. Connects to:
      - Pi Camera V3 via picamera2 (face recognition)
      - Xiaomi camera via RTSP (gesture detection, phone count, motion)
    """

    def __init__(self, session_id: str, mode: str, course_id: str):
        self.session_id = session_id
        self.mode = mode
        self.course_id = course_id
        # TODO: initialize picamera2, RTSP stream, DeepFace model, MediaPipe holistic, YOLO model

    async def start(self):
        # TODO:
        # 1. Open picamera2 stream
        # 2. Open RTSP stream via cv2.VideoCapture(rtsp_url)
        # 3. Load face encodings from DB
        # 4. Start recognition loop as asyncio task
        logger.warning("[REAL VISION] Not yet implemented — use MOCK_MODE=true in development")

    async def stop(self):
        # TODO: release camera resources
        pass


async def start_real_session(session_id: str, mode: str, course_id: str) -> list[StudentOut]:
    sess = RealVisionSession(session_id, mode, course_id)
    await sess.start()
    return []


async def stop_real_session(session_id: str):
    pass
