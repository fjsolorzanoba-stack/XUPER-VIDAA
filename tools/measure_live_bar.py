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
    return np.frombuffer(data[12:12 + w * h * 4], dtype=np.uint8).reshape(h, w, 4)


def mean(img, y0, y1, x0, x1):
    return float(img[y0:y1, x0:x1, :3].mean())


def main():
    key = sys.argv[1] if len(sys.argv) > 1 else "19"
    total = float(sys.argv[2]) if len(sys.argv) > 2 else 8.0
    subprocess.run([ADB, "-s", SERIAL, "shell", "input", "keyevent", key])
    t0 = time.time()
    print(f"key={key}   t(ms)   line@885   bar@775   video@600")
    while True:
        t = (time.time() - t0) * 1000
        if t > total * 1000:
            break
        img = raw()
        if img is None:
            break
        line = mean(img, 883, 889, 500, 1700)
        bar = mean(img, 770, 790, 400, 1600)
        vid = mean(img, 600, 640, 500, 1500)
        print(f"{t:8.0f}   {line:7.1f}   {bar:7.1f}   {vid:7.1f}")
        time.sleep(0.05)


if __name__ == "__main__":
    main()
