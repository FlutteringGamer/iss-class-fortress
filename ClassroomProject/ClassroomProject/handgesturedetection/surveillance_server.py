import cv2 as cv
from flask import Flask, Response
from flask_cors import CORS
import threading
import time
import os

app = Flask(__name__)
CORS(app)

RTSP_URL = os.environ.get("RTSP_URL", "rtsp://localhost:8554/xiaomi_cam_auto")
global_frame = None
lock = threading.Lock()

def capture_loop():
    global global_frame
    cap = cv.VideoCapture(RTSP_URL)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[WARN] Failed to read from RTSP stream. Reconnecting...", flush=True)
            time.sleep(1)
            cap.release()
            cap = cv.VideoCapture(RTSP_URL)
            continue
            
        ret_enc, buffer = cv.imencode('.jpg', frame)
        if ret_enc:
            with lock:
                global_frame = buffer.tobytes()

@app.route('/video_feed')
def video_feed():
    def generate():
        global global_frame
        while True:
            with lock:
                curr_frame = global_frame
            
            if curr_frame is None:
                time.sleep(0.1)
                continue
                
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + curr_frame + b'\r\n')
            time.sleep(0.03)  # Approx 30 fps limit
            
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    t = threading.Thread(target=capture_loop, daemon=True)
    t.start()
    print(f"Starting Surveillance proxy server on port 5001, pulling from {RTSP_URL}...")
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
