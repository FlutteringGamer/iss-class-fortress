"""
Real hardware service — production implementation using gpiozero and Xiaomi API.
NOT used in MOCK_MODE=true.

Install extras: pip install gpiozero picamera2 requests
"""
import logging
from backend.models.schemas import HardwareStatusResponse, SolenoidState

logger = logging.getLogger(__name__)

SOLENOID_GPIO_PIN = 18  # BCM pin on Raspberry Pi
XIAOMI_RTSP_URL = "rtsp://admin:password@192.168.1.xx:554/stream1"


def get_solenoid_state() -> SolenoidState:
    # TODO: read GPIO state via gpiozero
    raise NotImplementedError("Real hardware not configured")


def lock_solenoid() -> SolenoidState:
    # TODO: from gpiozero import OutputDevice; OutputDevice(SOLENOID_GPIO_PIN).off()
    raise NotImplementedError("Real hardware not configured")


def unlock_solenoid() -> SolenoidState:
    # TODO: OutputDevice(SOLENOID_GPIO_PIN).on()
    raise NotImplementedError("Real hardware not configured")


def get_hardware_status() -> HardwareStatusResponse:
    # TODO: ping Pi, check RTSP stream, read GPIO
    raise NotImplementedError("Real hardware not configured")
