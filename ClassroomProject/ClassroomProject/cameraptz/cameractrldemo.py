from miio import MiotDevice
import time

CAMERA_IP   = "192.168.1.106"
CAMERA_TOKEN = "5a4d567457554e76346b75425966616f"

cam = MiotDevice(ip=CAMERA_IP, token=CAMERA_TOKEN)

# ════════════════════════════════════════════════════════════
#  COMPLETE CAMERA CONTROLLER
# ════════════════════════════════════════════════════════════

class XiaomiCamera:
    
    # ── Operation codes ──────────────────────────────────────
    OP_LEFT     = 1
    OP_RIGHT    = 2
    OP_UP       = 3
    OP_DOWN     = 4
    OP_HOME     = 5
    OP_GOTO     = 6   # goto preset location

    def __init__(self, ip, token):
        self.cam = MiotDevice(ip=ip, token=token)

    def _send(self, cmd, params):
        try:
            return self.cam.send(cmd, params)
        except Exception as e:
            return str(e)

    # ── PTZ ──────────────────────────────────────────────────

    def move(self, direction: str, degrees: int = None):
        """direction: 'left','right','up','down' | degrees: 1-30"""
        op = {"left": 1, "right": 2, "up": 3, "down": 4}[direction]
        params = {"operation": op}
        if degrees:
            params["step"] = degrees
        return self._send("set_motor", params)

    def home(self):
        """Return camera to home position"""
        return self._send("set_motor", {"operation": self.OP_HOME})

    def goto_preset(self, location: int):
        """Go to preset position 0-3"""
        return self._send("set_motor", {"operation": self.OP_GOTO, "location": location})

    # ── Camera settings ──────────────────────────────────────

    def get_status(self):
        props = ["power", "flip", "night_mode", "wdr", "watermark", "full_color", "track"]
        status = {}
        for p in props:
            try:
                r = self.cam.send("get_prop", [p])
                status[p] = r[0] if isinstance(r, list) else r
            except:
                status[p] = None
        return status

    def set_power(self, on: bool):
        return self._send("set_power", ["on" if on else "off"])

    def set_night_mode(self, mode: int):
        """0=on, 1=off, 2=auto"""
        return self._send("set_night_mode", [mode])

    def set_flip(self, on: bool):
        return self._send("set_flip", ["on" if on else "off"])

    def set_wdr(self, on: bool):
        return self._send("set_wdr", ["on" if on else "off"])

    def set_watermark(self, on: bool):
        return self._send("set_watermark", ["on" if on else "off"])

    def set_full_color(self, on: bool):
        return self._send("set_full_color", ["on" if on else "off"])

    def set_track(self, on: bool):
        """Enable/disable motion tracking (auto-follow)"""
        return self._send("set_track", ["on" if on else "off"])

    def set_led(self, on: bool):
        return self._send("set_led", ["on" if on else "off"])

    def set_recording_mode(self, mode: int):
        """0=continuous, 1=motion only, 2=off"""
        return self._send("set_recording_mode", [mode])

    def set_motion_detection(self, on: bool):
        return self._send("set_motion_detection", ["on" if on else "off"])


# ════════════════════════════════════════════════════════════
#  DEMO
# ════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cam = XiaomiCamera(CAMERA_IP, CAMERA_TOKEN)

    print("=== Status ===")
    print(cam.get_status())

    print("\n=== PTZ Demo ===")
    print("Move left  15°:", cam.move("left",  15)); time.sleep(1)
    print("Move right 15°:", cam.move("right", 15)); time.sleep(1)
    print("Move up    10°:", cam.move("up",    10)); time.sleep(1)
    print("Move down  10°:", cam.move("down",  10)); time.sleep(1)
    print("Home:          ", cam.home());            time.sleep(2)

    print("\n=== Preset positions ===")
    for i in range(4):
        print(f"Goto preset {i}:", cam.goto_preset(i))
        time.sleep(2)

    print("\n=== Settings ===")
    print("Night mode auto:", cam.set_night_mode(1))
    print("Motion tracking:", cam.set_track(True))