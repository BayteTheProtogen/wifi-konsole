import json
import subprocess
import time
import threading
import sys
import tty
import termios
from pynput import keyboard
import os

CONFIG_FILE = "config.json"

def load_config():
    default_config = {
        "hotkey": "5",

        "delay_seconds": 5.0
    }
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "w") as f:
            json.dump(default_config, f, indent=4)
        return default_config

    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def get_fullscreen_windows():
    try:
        output = subprocess.check_output(["wmctrl", "-l"]).decode("utf-8")
    except Exception as e:
        print(f"Error running wmctrl: {e}")
        return []

    windows = []
    for line in output.strip().split("\n"):
        if not line:
            continue
        parts = line.split(maxsplit=3)
        if len(parts) < 4:
            continue

        win_id = parts[0]
        # Ignore desktop/root windows typically mapped to 0 or having specific types
        try:
            state_output = subprocess.check_output(["xprop", "-id", win_id, "_NET_WM_STATE"], stderr=subprocess.DEVNULL).decode("utf-8")
            if "_NET_WM_STATE_FULLSCREEN" in state_output:
                windows.append(win_id)
        except subprocess.CalledProcessError:
            continue

    return windows

class WindowCycler:
    def __init__(self, delay):
        self.delay = delay
        self.is_running = False
        self.thread = None

    def start(self):
        if not self.is_running:
            print("Starting cycler...")
            self.is_running = True
            self.thread = threading.Thread(target=self._cycle_loop, daemon=True)
            self.thread.start()

    def stop(self):
        if self.is_running:
            print("Stopping cycler...")
            self.is_running = False
            if self.thread:
                self.thread.join()

    def toggle(self):
        if self.is_running:
            self.stop()
        else:
            self.start()

    def _cycle_loop(self):
        current_index = 0
        while self.is_running:
            windows = get_fullscreen_windows()
            if not windows:
                print("No fullscreen windows found. Waiting...")
                time.sleep(self.delay)
                continue

            current_index = (current_index + 1) % len(windows)
            win_id = windows[current_index]
            print(f"Activating window: {win_id}")
            try:
                # Use wmctrl to activate the window
                subprocess.run(["wmctrl", "-i", "-a", win_id])
            except Exception as e:
                print(f"Failed to activate window: {e}")

            # Sleep in small chunks to allow quick stopping
            elapsed = 0
            while elapsed < self.delay and self.is_running:
                time.sleep(0.1)
                elapsed += 0.1

def getch():
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(sys.stdin.fileno())
        ch = sys.stdin.read(1)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    return ch

if __name__ == "__main__":
    config = load_config()
    cycler = WindowCycler(delay=config.get("delay_seconds", 5.0))
    hotkey_str = config.get("hotkey", "5")

    print(f"Loaded config. Press '{hotkey_str}' to toggle the fullscreen cycler.")
    print("Press 'q' to quit.")
    print(f"Delay is set to {cycler.delay} seconds.")

    try:
        while True:
            char = getch()
            if char == hotkey_str:
                cycler.toggle()
            elif char == 'q' or char == '\x03': # q or Ctrl+C
                break
    except KeyboardInterrupt:
        pass
    finally:
        cycler.stop()
        print("\nExiting...")

