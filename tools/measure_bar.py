import subprocess, sys, time
import numpy as np

ADB = r"C:\Users\crist\AppData\Local\Android\Sdk\platform-tools\adb.exe"
SERIAL = "127.0.0.1:58526"


def raw():
    data = subprocess.run([ADB, "-s", SERIAL, "exec-out", "screencap"],
                          capture_output=True).stdout
    if len(data) < 16:
        return None
    w = int.from_bytes(data[0:4], "little")
    h = int.from_bytes(data[4:8], "little")
    body = data[12:12 + w * h * 4]
    return np.frombuffer(body, dtype=np.uint8).reshape(h, w, 4)


def strip(img, y0, y1, x0=700, x1=1300):
    return float(img[y0:y1, x0:x1, :3].mean())


def main():
    key = sys.argv[1] if len(sys.argv) > 1 else "23"
    total = float(sys.argv[2]) if len(sys.argv) > 2 else 9.0
    subprocess.run([ADB, "-s", SERIAL, "shell", "input", "keyevent", key])
    t0 = time.time()
    print(f"key={key}  t(ms)  bar(770-800)  video(690-720)")
    while True:
        t = (time.time() - t0) * 1000
        if t > total * 1000:
            break
        img = raw()
        if img is None:
            break
        b = strip(img, 790, 830, 700, 1000)
        v = strip(img, 600, 640, 700, 1000)
        print(f"{t:7.0f}  {b:8.1f}  {v:8.1f}")
        time.sleep(0.05)


if __name__ == "__main__":
    main()
