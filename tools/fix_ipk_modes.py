#!/usr/bin/env python3
"""Normalise POSIX file modes inside a webOS .ipk.

`ares-package` runs on Windows in this project, and Windows' stat() reports
0666 for every regular file.  That is harmless for JS/HTML, but a native
executable bundled with a service (ffmpeg) must keep its execute bit or the
TV cannot spawn it.  This script rewrites data.tar.gz with explicit modes and
rebuilds the ar container, leaving control.tar.gz untouched.

Usage:
    python tools/fix_ipk_modes.py dist/app_1.4.1_all.ipk [more.ipk ...]

Rules:
    * files named exactly "ffmpeg"           -> 0755
    * directories                            -> 0755
    * every other regular file               -> 0644
"""

import io
import os
import sys
import tarfile
import time

AR_MAGIC = b"!<arch>\n"
EXECUTABLES = {"ffmpeg"}


def read_ar(blob):
    if not blob.startswith(AR_MAGIC):
        raise ValueError("not an ar archive (missing !<arch> magic)")
    entries = []
    off = len(AR_MAGIC)
    while off + 60 <= len(blob):
        header = blob[off:off + 60]
        if header[58:60] != b"`\n":
            raise ValueError("corrupt ar header at offset %d" % off)
        name = header[0:16].decode("ascii", "replace").rstrip()
        size = int(header[48:58].decode("ascii").strip())
        body = blob[off + 60:off + 60 + size]
        entries.append((name, body))
        off += 60 + size + (size & 1)
    return entries


def write_ar(entries):
    out = bytearray(AR_MAGIC)
    now = int(time.time())
    for name, body in entries:
        if len(name) > 16:
            raise ValueError("ar member name too long: %s" % name)
        header = (
            name.ljust(16).encode("ascii")
            + str(now).ljust(12).encode("ascii")
            + b"0".ljust(6)
            + b"0".ljust(6)
            + b"100644".ljust(8)
            + str(len(body)).ljust(10).encode("ascii")
            + b"`\n"
        )
        out += header
        out += body
        if len(body) & 1:
            out += b"\n"
    return bytes(out)


def fix_data_tar(blob):
    src = tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz")
    members = src.getmembers()
    payload = {}
    for member in members:
        if member.isfile():
            payload[member.name] = src.extractfile(member).read()
    src.close()

    out = io.BytesIO()
    dst = tarfile.open(fileobj=out, mode="w:gz", format=tarfile.GNU_FORMAT)
    changed = 0
    for member in members:
        if member.isdir():
            mode = 0o755
        elif member.isfile():
            mode = 0o755 if os.path.basename(member.name) in EXECUTABLES else 0o644
        else:
            mode = member.mode
        if mode != member.mode:
            changed += 1
        member.mode = mode
        member.uid = 0
        member.gid = 0
        member.uname = ""
        member.gname = ""
        data = None
        if member.isfile():
            data = io.BytesIO(payload[member.name])
        dst.addfile(member, data)
    dst.close()
    return out.getvalue(), changed


def fix_ipk(path):
    with open(path, "rb") as fh:
        entries = read_ar(fh.read())
    rebuilt = []
    touched = 0
    for name, body in entries:
        if name.startswith("data.tar"):
            body, touched = fix_data_tar(body)
        rebuilt.append((name, body))
    blob = write_ar(rebuilt)
    tmp = path + ".tmp"
    with open(tmp, "wb") as fh:
        fh.write(blob)
    os.replace(tmp, path)
    print("%s: %d mode(s) normalised, %d bytes" % (path, touched, len(blob)))


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip())
        return 2
    for path in argv[1:]:
        fix_ipk(path)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
