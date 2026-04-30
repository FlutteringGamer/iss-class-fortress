Hand Gesture Detection for Classroom Interaction
This script provides real-time hand gesture recognition using MediaPipe Hands and serves the processed video stream along with gesture events via a Flask web server. It is designed for classroom environments to detect non-verbal student cues (e.g., raising hand, confusion, restroom request). The camera PTZ control has been moved to a separate Pi Agent; this script focuses purely on gesture detection and video processing.

Features
Real-time hand tracking (up to one hand, configurable)

Rule‑based gesture detection for four classroom gestures:

Raise Hand (open palm)

OK (👌)

Thumbs Down (👎 – confusion / please repeat)

Rock (🤘 – restroom request)

Smoothing and cooldown to reduce false triggers

Web interface:

/video_feed – MJPEG stream with bounding box, landmarks, and gesture label

/events – Server‑Sent Events (SSE) stream of gesture events (JSON)

RTSP / USB camera support (any OpenCV‑compatible source)

Dependencies
Install the required packages:

bash
pip install opencv-python mediapipe flask flask-cors numpy
Note: mediapipe requires Python 3.8–3.12. The script does not use TensorFlow; it uses MediaPipe’s pre‑trained hand landmarker model (hand_landmarker.task). Make sure this file is present in the same directory as the script.

How It Works
1. Hand Detection & Landmarks
The script opens a video capture thread (BackgroundFrameReader) to read frames from the camera (e.g., RTSP URL or webcam index).

Each frame is flipped horizontally for a mirror display and converted to RGB.

MediaPipe’s HandLandmarker runs on the RGB frame and returns 21 hand landmarks (x, y, visibility).

Landmarks are drawn on the frame, and a bounding box is calculated.

2. Gesture Recognition
The function detect_classroom_gesture() implements rule‑based heuristics using landmark positions:

Gesture	Condition
Raise Hand	All five fingers extended (thumb + index + middle + ring + pinky)
OK	Thumb tip close to index tip (distance < 0.28 × hand size) and at least two of middle/ring/pinky are extended
Thumbs Down	Thumb extended and pointing downward (thumb tip significantly below MCP) and all other fingers folded
Rock	Index and pinky extended, middle and ring folded (thumb optional)
3. Smoothing & Cooldown
Last 8 detections are stored in a deque (gesture_history).

The most common gesture in the history is used as the current state.

Each gesture type has a cooldown of 5 seconds; a trigger only fires if the same gesture has been dominant for at least half the history and the cooldown has expired.

Once triggered, a JSON event is placed into a queue and sent to all SSE clients.

4. Web Server
Flask serves two endpoints:

/video_feed – Multipart JPEG stream of the annotated video.

/events – SSE stream that pushes gesture events.

The detection loop runs in a background thread, continuously processing frames and updating the global frame buffer.

5. Event Format
json
{
  "type": "Raise Hand",      // or "Understood OK", "Confused", "Restroom Request"
  "riskScore": "0.1",        // 0.0 for low risk, 0.5 for confusion
  "status": "INFO"           // "INFO" or "WARN"
}
Configuration
Command‑line arguments (or environment variables) override defaults:

Argument	Default	Description
--device	RTSP_URL env var or rtsp://localhost:8554/xiaomi_cam_auto	Camera source (URL or integer index)
--width	960	Capture width
--height	540	Capture height
--min_detection_confidence	0.7	MediaPipe detection confidence
--min_tracking_confidence	0.5	MediaPipe tracking confidence
--use_static_image_mode	False	Force static image mode (slower)
Example:

bash
python handgesture.py --device 0 --width 640 --height 480
Or using an RTSP stream:

bash
export RTSP_URL="rtsp://admin:password@192.168.1.100/stream"
python handgesture.py
Running the Script
Ensure hand_landmarker.task is in the same directory (download from MediaPipe Models).

Execute the script:

bash
python handgesture.py
Open a web browser and navigate to http://<your-ip>:5000/video_feed to see the video stream.

To receive events, point an EventSource client to http://<your-ip>:5000/events (or use curl / JavaScript).

Known Limitations
Only one hand is tracked (configured via max_num_hands=1 in MockHands). Can be changed if needed.

Gesture detection is based on simple geometric rules; lighting and hand orientation may affect accuracy.

The script uses a mock wrapper to adapt MediaPipe’s HandLandmarker to the original code’s interface; it works, but error handling is minimal.

No PTZ control – that has been moved to the Pi Agent (separate repository/script).

File Structure
text
.
├── handgesture.py          # Main script
├── hand_landmarker.task    # MediaPipe model file
└── (optional) utils.py     # If you have a custom CvFpsCalc, otherwise built‑in
Credits
Based on the original MediaPipe gesture recognition example, adapted for classroom use with custom gesture rules. The Flask server and event queue enable easy integration with dashboards or classroom response systems.