#!/usr/bin/env python3
import os
import sys
import io
import time
import tarfile

def make_ar_header(filename, size, mtime=None, mode=0o100644):
    if mtime is None:
        mtime = int(time.time())
    name_field = f"{filename:<16}"[:16].encode('latin1')
    mtime_field = f"{mtime:<12}"[:12].encode('latin1')
    uid_field = f"{0:<6}"[:6].encode('latin1')
    gid_field = f"{0:<6}"[:6].encode('latin1')
    mode_field = f"{oct(mode)[2:]:<8}"[:8].encode('latin1')
    size_field = f"{size:<10}"[:10].encode('latin1')
    magic = b'`\n'
    return name_field + mtime_field + uid_field + gid_field + mode_field + size_field + magic

def make_tar_gz(src_dir, is_control=False):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz', format=tarfile.GNU_FORMAT) as tar:
        # Walk deterministically
        for root, dirs, files in os.walk(src_dir):
            dirs.sort()
            files.sort()
            rel_root = os.path.relpath(root, src_dir).replace('\\', '/')
            if rel_root != '.':
                tar_info = tar.gettarinfo(root, arcname=rel_root)
                tar_info.uid = 0
                tar_info.gid = 0
                tar_info.uname = 'root'
                tar_info.gname = 'root'
                tar_info.mode = 0o755
                tar.addfile(tar_info)

            for f in files:
                full_path = os.path.join(root, f)
                rel_path = f if rel_root == '.' else f"{rel_root}/{f}"
                tar_info = tar.gettarinfo(full_path, arcname=rel_path)
                tar_info.uid = 0
                tar_info.gid = 0
                tar_info.uname = 'root'
                tar_info.gname = 'root'

                # Permissions
                if f.endswith('.sh') or f in ('wg', 'wireguard-go', 'wg-upload', 'openvpn'):
                    tar_info.mode = 0o755
                else:
                    tar_info.mode = 0o644

                with open(full_path, 'rb') as fp:
                    tar.addfile(tar_info, fp)

    return buf.getvalue()

def build_ipk(src_folder, out_ipk_path):
    control_dir = os.path.join(src_folder, 'control')
    data_dir = os.path.join(src_folder, 'data')

    assert os.path.isdir(control_dir), f"Missing control dir in {src_folder}"
    assert os.path.isdir(data_dir), f"Missing data dir in {src_folder}"

    debian_binary = b"2.0\n"
    control_tar = make_tar_gz(control_dir, is_control=True)
    data_tar = make_tar_gz(data_dir, is_control=False)

    os.makedirs(os.path.dirname(os.path.abspath(out_ipk_path)), exist_ok=True)
    with open(out_ipk_path, 'wb') as f:
        f.write(b"!<arch>\n")

        # 1. debian-binary
        f.write(make_ar_header('debian-binary', len(debian_binary)))
        f.write(debian_binary)
        if len(debian_binary) % 2 != 0:
            f.write(b"\n")

        # 2. control.tar.gz
        f.write(make_ar_header('control.tar.gz', len(control_tar)))
        f.write(control_tar)
        if len(control_tar) % 2 != 0:
            f.write(b"\n")

        # 3. data.tar.gz
        f.write(make_ar_header('data.tar.gz', len(data_tar)))
        f.write(data_tar)
        if len(data_tar) % 2 != 0:
            f.write(b"\n")

    print(f"Created IPK: {out_ipk_path} ({os.path.getsize(out_ipk_path)} bytes)")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: repackage_vpn.py <src_folder> <out_ipk_path>")
        sys.exit(1)
    build_ipk(sys.argv[1], sys.argv[2])

