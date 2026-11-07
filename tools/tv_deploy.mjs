// One-step deploy: upload the IPK over SFTP and install it through the TV's
// Luna install service. This avoids ares-install's post-upload `ls`/md5
// steps, which are unreliable on some webOS 4 sets.
//
// Usage: node tools/tv_deploy.mjs dist\com.webosflux.xuptertv.fidelity_1.5.9_all.ipk
// Env:   TV_HOST (default 192.168.1.18), TV_PASS (default alpine)
import fs from "node:fs";
import path from "node:path";
import { loadSsh2 } from "./ssh2-loader.mjs";

const { Client } = loadSsh2();

const local = process.argv[2];
const host = process.env.TV_HOST || "192.168.1.18";
const password = process.env.TV_PASS || "alpine";
const appId = "com.webosflux.xuptertv.fidelity";

if (!local || !fs.existsSync(local)) {
  console.error("usage: node tools/tv_deploy.mjs <local.ipk>");
  process.exit(2);
}

const remote = "/media/developer/temp/" + path.basename(local);
const conn = new Client();
let done = false;
const timer = setTimeout(() => finish(1, "timeout"), 300000);

function finish(code, why) {
  if (done) { return; }
  done = true;
  clearTimeout(timer);
  if (why) { console.error(why); }
  try { conn.end(); } catch { /* ignore */ }
  setTimeout(() => process.exit(code), 300);
}

function install() {
  const payload = JSON.stringify({ id: appId, ipkUrl: remote, subscribe: true });
  const cmd = "/usr/bin/luna-send-pub -i -f luna://com.webos.appInstallService/dev/install '" + payload + "'";
  conn.exec(cmd, (e, stream) => {
    if (e) { return finish(1, e.message); }
    let buf = "";
    stream.on("data", (d) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) { continue; }
        const state = (/"state"\s*:\s*"([^"]+)"/.exec(line) || [])[1];
        if (state) { console.log("state: " + state); }
        if (/"state"\s*:\s*"installed"/i.test(line)) { return finish(0); }
        if (/FAILED/i.test(line)) { return finish(1, line); }
      }
    });
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", (code) => finish(code || 0));
  });
}

conn
  .on("ready", () => {
    conn.exec("/bin/mkdir -p /media/developer/temp", (e) => {
      if (e) { return finish(1, e.message); }
      conn.sftp((err, sftp) => {
        if (err) { return finish(1, err.message); }
        console.log("uploading " + local + " -> " + remote);
        sftp.fastPut(local, remote, (err2) => {
          if (err2) { return finish(1, err2.message); }
          console.log("uploaded " + fs.statSync(local).size + " bytes");
          install();
        });
      });
    });
  })
  .on("error", (e) => finish(1, "ssh error: " + e.message))
  .connect({ host, port: 22, username: "root", password, readyTimeout: 60000 });
