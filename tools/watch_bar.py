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


def main():
    key = sys.argv[1] if len(sys.argv) > 1 else ""
    total = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
    if key:
        subprocess.run([ADB, "-s", SERIAL, "shell", "input", "keyevent", key])
    t0 = time.time()
    print("   t(ms)   bar@775   line@885   date@810")
    while True:
        t = (time.time() - t0) * 1000
        if t > total * 1000:
            break
        img = raw()
        if img is None:
            break
        bar = float(img[770:790, 400:1600, :3].mean())
        line = float(img[883:890, 400:1600, :3].mean())
        date = float(img[800:825, 1655:1845, :3].mean())
        print(f"{t:8.0f}   {bar:7.1f}   {line:7.1f}   {date:7.1f}")


if __name__ == "__main__":
    main()
