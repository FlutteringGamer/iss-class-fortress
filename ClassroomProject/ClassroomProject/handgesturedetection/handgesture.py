#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import csv
import copy
import argparse
import itertools
from collections import Counter, deque
import time
import math

import cv2 as cv
import numpy as np
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from flask import Flask, Response, request, stream_with_context
from flask_cors import CORS
import threading
import queue
import json
import sys
import requests as _requests

# ── Class Fortress integration ──────────────────────────────────────────────
# URL of the running Class Fortress backend (change port if needed)
FORTRESS_URL = os.environ.get("FORTRESS_URL", "http://localhost:8000")


def _post_to_fortress(event_data: dict):
    """Fire-and-forget POST to Class Fortress /api/gesture/ingest."""
    try:
        _requests.post(
            f"{FORTRESS_URL}/api/gesture/ingest",
            json=event_data,
            timeout=2,
        )
    except Exception as exc:
        print(f"[WARN] Could not reach Class Fortress: {exc}", flush=True)

# Camera PTZ control has been moved to the Pi Agent (pi-agent/agent.py).
# This script now only handles gesture detection and video processing.

app = Flask(__name__)
CORS(app)

event_queue = queue.Queue(maxsize=100)
global_frame = None
lock = threading.Lock()

# ---------------------- MediaPipe Hands wrapper (kept as-is) ----------------------
class MockHandLandmarks:
    def __init__(self, landmark_list):
        self.landmark = landmark_list

class MockClassification:
    def __init__(self, label):
        self.label = label

class MockHandedness:
    def __init__(self, category_list):
        self.classification = [MockClassification(c.category_name) for c in category_list]

class MockResults:
    def __init__(self, detection_result):
        if not detection_result.hand_landmarks:
            self.multi_hand_landmarks = None
            self.multi_handedness = None
        else:
            self.multi_hand_landmarks = [MockHandLandmarks(hl) for hl in detection_result.hand_landmarks]
            self.multi_handedness = [MockHandedness(h) for h in detection_result.handedness]

class MockHands:
    def __init__(self, static_image_mode, max_num_hands, min_detection_confidence, min_tracking_confidence):
        base_options = python.BaseOptions(model_asset_path='hand_landmarker.task')
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=max_num_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            running_mode=vision.RunningMode.IMAGE
        )
        self.detector = vision.HandLandmarker.create_from_options(options)

    def process(self, image):
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
        detection_result = self.detector.detect(mp_image)
        return MockResults(detection_result)

# ---------------------- (Removed TF-based imports) ----------------------
# from utils import CvFpsCalc   # <- If you have this file, you can keep using it.
# If you don't have utils.CvFpsCalc, here's a very simple FPS helper:
class CvFpsCalc:
    def __init__(self, buffer_len=10):
        self.ticks = deque(maxlen=buffer_len)
        self.prev_time = time.time()

    def get(self):
        now = time.time()
        self.ticks.append(now)
        if len(self.ticks) >= 2:
            fps = int(round((len(self.ticks) - 1) / (self.ticks[-1] - self.ticks[0] + 1e-6)))
        else:
            fps = 0
        return fps

# ---------------------- Gesture detection helpers ----------------------
# Finger landmark indices:
# 0:wrist
# Thumb: 1(CMC), 2(MCP), 3(IP), 4(TIP)
# Index: 5(MCP), 6(PIP), 7(DIP), 8(TIP)
# Middle: 9,10,11,12
# Ring: 13,14,15,16
# Pinky: 17,18,19,20

def _dist(p, q):
    return math.hypot(p[0]-q[0], p[1]-q[1])

def _hand_size(landmark_point, brect):
    # Use bounding box diagonal as hand size proxy
    w = max(1, brect[2] - brect[0])
    h = max(1, brect[3] - brect[1])
    return math.hypot(w, h)

def _is_extended_y(landmark_point, tip_idx, pip_idx):
    # y smaller => higher on image => "extended upward"
    return landmark_point[tip_idx][1] < landmark_point[pip_idx][1]

def _thumb_is_extended(landmark_point):
    # Use angle straightness between (2->3) and (3->4)
    v1 = (landmark_point[3][0] - landmark_point[2][0],
          landmark_point[3][1] - landmark_point[2][1])
    v2 = (landmark_point[4][0] - landmark_point[3][0],
          landmark_point[4][1] - landmark_point[3][1])
    n1 = math.hypot(*v1) + 1e-6
    n2 = math.hypot(*v2) + 1e-6
    cosang = max(-1.0, min(1.0, (v1[0]*v2[0] + v1[1]*v2[1]) / (n1*n2)))
    ang = math.degrees(math.acos(cosang))
    return ang < 25.0  # close to straight

def _thumb_points_down(landmark_point, hand_size):
    # Thumb pointing down if thumb tip is significantly below MCP
    return (landmark_point[4][1] - landmark_point[2][1]) > (0.15 * hand_size)

def detect_classroom_gesture(landmark_point, handedness, brect):
    """
    Returns (gesture_code, gesture_text)
      gesture_code in {"RAISE_HAND", "OK", "THUMBS_DOWN", "ROCK", "NONE"}
    """
    size = _hand_size(landmark_point, brect)

    # Finger extended states
    index_ext = _is_extended_y(landmark_point, 8, 6)
    middle_ext = _is_extended_y(landmark_point, 12, 10)
    ring_ext = _is_extended_y(landmark_point, 16, 14)
    pinky_ext = _is_extended_y(landmark_point, 20, 18)
    thumb_ext = _thumb_is_extended(landmark_point)

    # --- OK sign (👌): thumb tip close to index tip + at least two of (middle, ring, pinky) extended
    ok_dist = _dist(landmark_point[4], landmark_point[8]) / (size + 1e-6)
    ok_support = sum([middle_ext, ring_ext, pinky_ext]) >= 2
    if ok_dist < 0.28 and ok_support:
        return "OK", "👌 OK (Understood)"

    # --- Rock & Roll (🤘): index + pinky extended; middle + ring folded; thumb optional
    if index_ext and pinky_ext and (not middle_ext) and (not ring_ext):
        return "ROCK", "🤘 Restroom Request"

    # --- Thumbs Down (👎): thumb extended pointing down; other 4 fingers folded
    if thumb_ext and _thumb_points_down(landmark_point, size) and (not index_ext) and (not middle_ext) and (not ring_ext) and (not pinky_ext):
        return "THUMBS_DOWN", "👎 Confused / Please repeat"

    # --- Open palm (✋): all five extended
    if thumb_ext and index_ext and middle_ext and ring_ext and pinky_ext:
        return "RAISE_HAND", "✋ Raise Hand"

    return "NONE", ""

# ---------------------- Original helpers (kept) ----------------------
def get_args():
    parser = argparse.ArgumentParser()

    parser.add_argument("--device", type=str,
                        default=os.environ.get("RTSP_URL", "rtsp://192.168.55.214:8554/camera"))
    parser.add_argument("--width", help='cap width', type=int, default=960)
    parser.add_argument("--height", help='cap height', type=int, default=540)

    parser.add_argument('--use_static_image_mode', action='store_true')
    parser.add_argument("--min_detection_confidence",
                        help='min_detection_confidence',
                        type=float,
                        default=0.7)
    parser.add_argument("--min_tracking_confidence",
                        help='min_tracking_confidence',
                        type=int,
                        default=0.5)

    args = parser.parse_args()

    return args

def gesture_detection_loop(args):
    global global_frame, event_queue
    cap_device = args.device
    if str(cap_device).isdigit():
        cap_device = int(cap_device)
    cap_width = args.width
    cap_height = args.height

    use_static_image_mode = args.use_static_image_mode
    min_detection_confidence = args.min_detection_confidence
    min_tracking_confidence = args.min_tracking_confidence

    use_brect = True

    class BackgroundFrameReader:
        def __init__(self, src, width, height):
            self.src = src
            self.width = width
            self.height = height
            self.cap = cv.VideoCapture(src)
            self.cap.set(cv.CAP_PROP_FRAME_WIDTH, width)
            self.cap.set(cv.CAP_PROP_FRAME_HEIGHT, height)
            self.ret = False
            self.frame = None
            self.lock = threading.Lock()
            self.stopped = False
            self.thread = threading.Thread(target=self.update, daemon=True)
            self.thread.start()

        def update(self):
            while not self.stopped:
                ret, frame = self.cap.read()
                if not ret:
                    print("[WARN] Failed to read frame from RTSP stream. Reconnecting...", flush=True)
                    time.sleep(1.0)
                    self.cap.release()
                    self.cap = cv.VideoCapture(self.src)
                    self.cap.set(cv.CAP_PROP_FRAME_WIDTH, self.width)
                    self.cap.set(cv.CAP_PROP_FRAME_HEIGHT, self.height)
                    continue
                with self.lock:
                    self.ret = ret
                    self.frame = frame

        def read(self):
            with self.lock:
                return self.ret, copy.deepcopy(self.frame) if self.frame is not None else None

        def release(self):
            self.stopped = True
            self.cap.release()

    # Camera preparation ###############################################################
    cap = BackgroundFrameReader(cap_device, cap_width, cap_height)
    # Model load #############################################################
    hands = MockHands(
        static_image_mode=use_static_image_mode,
        max_num_hands=1,
        min_detection_confidence=min_detection_confidence,
        min_tracking_confidence=min_tracking_confidence,
    )

    # FPS Measurement ########################################################
    cvFpsCalc = CvFpsCalc(buffer_len=10)

    # History / smoothing ####################################################
    history_length = 8
    gesture_history = deque(maxlen=history_length)

    # Cooldowns (seconds) ####################################################
    COOLDOWN_SEC = 5.0
    last_trigger = {
        "RAISE_HAND": 0.0,
        "OK": 0.0,
        "THUMBS_DOWN": 0.0,
        "ROCK": 0.0,
    }

    while True:
        fps = cvFpsCalc.get()

        # Camera capture #####################################################
        ret, image = cap.read()
        if not ret or image is None:
            time.sleep(0.01)
            continue
        image = cv.flip(image, 1)  # Mirror display
        debug_image = copy.deepcopy(image)

        # Detection implementation #############################################################
        image_rgb = cv.cvtColor(image, cv.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False
        results = hands.process(image_rgb)
        image_rgb.flags.writeable = True

        #  ####################################################################
        overlay_text = ""
        if results.multi_hand_landmarks is not None:
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks,
                                                  results.multi_handedness):
                # Bounding box calculation
                brect = calc_bounding_rect(debug_image, hand_landmarks)
                # Landmark calculation
                landmark_list = calc_landmark_list(debug_image, hand_landmarks)

                # Detect classroom gesture (rule-based)
                g_code, g_text = detect_classroom_gesture(landmark_list, handedness, brect)

                # Smoothing + cooldown
                if g_code != "NONE":
                    gesture_history.append(g_code)
                else:
                    gesture_history.append("NONE")

                most_common = Counter(gesture_history).most_common(1)[0][0]
                overlay_text = g_text if g_code != "NONE" else ""
                now = time.time()
                if most_common != "NONE" and (now - last_trigger.get(most_common, 0.0) > COOLDOWN_SEC):
                    # Require that most_common appears at least 4 times in history
                    if sum(1 for x in gesture_history if x == most_common) >= max(3, history_length // 2):
                        last_trigger[most_common] = now
                        # Print event (replace with your classroom event handling)
                        event_data = None
                        if most_common == "RAISE_HAND":
                            event_data = {"type": "Raise Hand", "riskScore": "0.1", "status": "INFO"}
                            print("[EVENT] Raise Hand", flush=True)
                        elif most_common == "OK":
                            event_data = {"type": "Understood OK", "riskScore": "0.0", "status": "INFO"}
                            print("[EVENT] Understood / OK", flush=True)
                        elif most_common == "THUMBS_DOWN":
                            event_data = {"type": "Confused", "riskScore": "0.5", "status": "WARN"}
                            print("[EVENT] Confused / Please repeat", flush=True)
                        elif most_common == "ROCK":
                            event_data = {"type": "Restroom Request", "riskScore": "0.0", "status": "INFO"}
                            print("[EVENT] Restroom request", flush=True)
                        
                        if event_data:
                            # Push to local SSE queue
                            try:
                                event_queue.put_nowait(event_data)
                            except queue.Full:
                                pass
                            # Forward to Class Fortress dashboard
                            threading.Thread(
                                target=_post_to_fortress,
                                args=(event_data,),
                                daemon=True,
                            ).start()

                # Drawing part
                debug_image = draw_bounding_rect(use_brect, debug_image, brect)
                debug_image = draw_landmarks(debug_image, landmark_list)
                debug_image = draw_info_text(
                    debug_image,
                    brect,
                    handedness,
                    overlay_text,   # show our gesture label
                    "",             # no point history gesture
                )

        # Screen info #############################################################
        debug_image = draw_info(debug_image, fps, 0, -1)

        # Save to global frame buffer instead of imshow
        ret, buffer = cv.imencode('.jpg', debug_image)
        if ret:
            with lock:
                global_frame = buffer.tobytes()
        # Remove the artificial time.sleep(0.01) so it processes completely unthrottled

    cap.release()

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
            time.sleep(0.03)  # limit frame rate
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/events')
def events():
    def generate():
        while True:
            event = event_queue.get()
            yield f"data: {json.dumps(event)}\n\n"
    return Response(stream_with_context(generate()), mimetype='text/event-stream')




def main():
    args = get_args()
    t = threading.Thread(target=gesture_detection_loop, args=(args,))
    t.daemon = True
    t.start()
    
    app.run(host='0.0.0.0', port=5000, threaded=True, use_reloader=False)

def calc_bounding_rect(image, landmarks):
    image_width, image_height = image.shape[1], image.shape[0]
    landmark_array = np.empty((0, 2), int)
    for _, landmark in enumerate(landmarks.landmark):
        landmark_x = min(int(landmark.x * image_width), image_width - 1)
        landmark_y = min(int(landmark.y * image_height), image_height - 1)
        landmark_point = [np.array((landmark_x, landmark_y))]
        landmark_array = np.append(landmark_array, landmark_point, axis=0)
    x, y, w, h = cv.boundingRect(landmark_array)
    return [x, y, x + w, y + h]

def calc_landmark_list(image, landmarks):
    image_width, image_height = image.shape[1], image.shape[0]
    landmark_point = []
    for _, landmark in enumerate(landmarks.landmark):
        landmark_x = min(int(landmark.x * image_width), image_width - 1)
        landmark_y = min(int(landmark.y * image_height), image_height - 1)
        landmark_point.append([landmark_x, landmark_y])
    return landmark_point

# -------------- (the rest are your original drawing functions, unchanged) --------------
def draw_landmarks(image, landmark_point):
    if len(landmark_point) > 0:
        # Thumb
        cv.line(image, tuple(landmark_point[2]), tuple(landmark_point[3]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[2]), tuple(landmark_point[3]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[3]), tuple(landmark_point[4]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[3]), tuple(landmark_point[4]), (255, 255, 255), 2)
        # Index finger
        cv.line(image, tuple(landmark_point[5]), tuple(landmark_point[6]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[5]), tuple(landmark_point[6]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[6]), tuple(landmark_point[7]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[6]), tuple(landmark_point[7]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[7]), tuple(landmark_point[8]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[7]), tuple(landmark_point[8]), (255, 255, 255), 2)
        # Middle finger
        cv.line(image, tuple(landmark_point[9]), tuple(landmark_point[10]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[9]), tuple(landmark_point[10]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[10]), tuple(landmark_point[11]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[10]), tuple(landmark_point[11]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[11]), tuple(landmark_point[12]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[11]), tuple(landmark_point[12]), (255, 255, 255), 2)
        # Ring finger
        cv.line(image, tuple(landmark_point[13]), tuple(landmark_point[14]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[13]), tuple(landmark_point[14]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[14]), tuple(landmark_point[15]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[14]), tuple(landmark_point[15]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[15]), tuple(landmark_point[16]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[15]), tuple(landmark_point[16]), (255, 255, 255), 2)
        # Little finger
        cv.line(image, tuple(landmark_point[17]), tuple(landmark_point[18]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[17]), tuple(landmark_point[18]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[18]), tuple(landmark_point[19]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[18]), tuple(landmark_point[19]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[19]), tuple(landmark_point[20]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[19]), tuple(landmark_point[20]), (255, 255, 255), 2)
        # Palm
        cv.line(image, tuple(landmark_point[0]), tuple(landmark_point[1]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[0]), tuple(landmark_point[1]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[1]), tuple(landmark_point[2]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[1]), tuple(landmark_point[2]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[2]), tuple(landmark_point[5]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[2]), tuple(landmark_point[5]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[5]), tuple(landmark_point[9]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[5]), tuple(landmark_point[9]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[9]), tuple(landmark_point[13]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[9]), tuple(landmark_point[13]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[13]), tuple(landmark_point[17]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[13]), tuple(landmark_point[17]), (255, 255, 255), 2)
        cv.line(image, tuple(landmark_point[17]), tuple(landmark_point[0]), (0, 0, 0), 6)
        cv.line(image, tuple(landmark_point[17]), tuple(landmark_point[0]), (255, 255, 255), 2)

    # Key Points
    for index, landmark in enumerate(landmark_point):
        r = 5 if index not in (4,8,12,16,20) else 8
        cv.circle(image, (landmark[0], landmark[1]), r, (255, 255, 255), -1)
        cv.circle(image, (landmark[0], landmark[1]), r, (0, 0, 0), 1)
    return image

def draw_bounding_rect(use_brect, image, brect):
    if use_brect:
        cv.rectangle(image, (brect[0], brect[1]), (brect[2], brect[3]), (0, 0, 0), 1)
    return image

def draw_info_text(image, brect, handedness, hand_sign_text, finger_gesture_text):
    cv.rectangle(image, (brect[0], brect[1]), (brect[2], max(0, brect[1] - 22)), (0, 0, 0), -1)

    info_text = handedness.classification[0].label[0:]
    if hand_sign_text != "":
        info_text = info_text + ':' + hand_sign_text
    cv.putText(image, info_text, (brect[0] + 5, max(10, brect[1] - 4)),
               cv.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv.LINE_AA)

    if finger_gesture_text != "":
        cv.putText(image, "Finger Gesture:" + finger_gesture_text, (10, 60),
                   cv.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 4, cv.LINE_AA)
        cv.putText(image, "Finger Gesture:" + finger_gesture_text, (10, 60),
                   cv.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2,
                   cv.LINE_AA)
    return image

def draw_info(image, fps, mode, number):
    cv.putText(image, "FPS:" + str(fps), (10, 30), cv.FONT_HERSHEY_SIMPLEX,
               1.0, (0, 0, 0), 4, cv.LINE_AA)
    cv.putText(image, "FPS:" + str(fps), (10, 30), cv.FONT_HERSHEY_SIMPLEX,
               1.0, (255, 255, 255), 2, cv.LINE_AA)
    return image

if __name__ == '__main__':
    main()
