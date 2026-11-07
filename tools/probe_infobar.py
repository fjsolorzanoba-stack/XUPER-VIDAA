import subprocess, sys, time, re

ADB = r"C:\Users\crist\AppData\Local\Android\Sdk\platform-tools\adb.exe"
SERIAL = "127.0.0.1:58526"


def dump():
    subprocess.run([ADB, "-s", SERIAL, "shell", "uiautomator dump /sdcard/u.xml"],
                   capture_output=True)
    data = subprocess.run([ADB, "-s", SERIAL, "shell", "cat /sdcard/u.xml"],
                          capture_output=True).stdout.decode("utf-8", "ignore")
    return "channelBarLayout" in data


def main():
    key = sys.argv[1] if len(sys.argv) > 1 else "23"
    total = float(sys.argv[2]) if len(sys.argv) > 2 else 8.0
    subprocess.run([ADB, "-s", SERIAL, "shell", "input", "keyevent", key])
    t0 = time.time()
    print("t(ms)  infobar")
    while True:
        t = (time.time() - t0) * 1000
        if t > total * 1000:
            break
        has = dump()
        print(f"{t:6.0f}  {'YES' if has else 'no'}")
        time.sleep(0.1)


if __name__ == "__main__":
    main()
