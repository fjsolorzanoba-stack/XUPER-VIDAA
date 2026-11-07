// Install an already-uploaded IPK through the TV's Luna install service.
// Usage: node tools/tv_install.mjs /media/developer/temp/app.ipk [host] [password]
import { loadSsh2 } from "./ssh2-loader.mjs";

const { Client } = loadSsh2();

const ipk = process.argv[2];
const host = process.argv[3] || "192.168.1.18";
const password = process.argv[4] || "alpine";

if (!ipk) {
  console.error("usage: node tools/tv_install.mjs /media/developer/temp/app.ipk [host] [password]");
  process.exit(2);
}

const appId = "com.webosflux.xuptertv.fidelity";
const payload = JSON.stringify({ id: appId, ipkUrl: ipk, subscribe: true });
const cmd = "/usr/bin/luna-send-pub -i -f luna://com.webos.appInstallService/dev/install '" + payload + "'";

const conn = new Client();
let finished = false;
const timer = setTimeout(() => {
  console.error("install timed out after 240s");
  try { conn.end(); } catch { /* ignore */ }
  process.exit(1);
}, 240000);

function finish(code) {
  if (finished) { return; }
  finished = true;
  clearTimeout(timer);
  try { conn.end(); } catch { /* ignore */ }
  setTimeout(() => process.exit(code), 300);
}

conn
  .on("ready", () => {
    conn.exec(cmd, (e, stream) => {
      if (e) { console.error(e.message); return finish(1); }
      let buf = "";
      stream.on("data", (d) => {
        buf += d.toString();
        const lines = buf.split(/\r?\n/);
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) { continue; }
          console.log(line);
          if (/"state"\s*:\s*"installed"/i.test(line) || /installed/i.test(line)) {
            return finish(0);
          }
          if (/FAILED/i.test(line)) {
            return finish(1);
          }
        }
      });
      stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
      stream.on("close", (code) => {
        if (buf.trim()) { console.log(buf); }
        finish(code || 0);
      });
    });
  })
  .on("error", (e) => { console.error("ssh error: " + e.message); finish(1); })
  .connect({ host, port: 22, username: "root", password, readyTimeout: 15000 });
