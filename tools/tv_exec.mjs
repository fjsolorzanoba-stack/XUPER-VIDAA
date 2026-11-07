// Run a shell command on the TV over SSH (root profile used by ares-setup-device).
// Usage: node tools/tv_exec.mjs "command" [host] [password]
import { loadSsh2 } from "./ssh2-loader.mjs";

const { Client } = loadSsh2();

const cmd = process.argv[2];
const host = process.argv[3] || "192.168.1.18";
const password = process.argv[4] || "alpine";

if (!cmd) {
  console.error('usage: node tools/tv_exec.mjs "command" [host] [password]');
  process.exit(2);
}

const conn = new Client();
let out = "";
let err = "";
conn
  .on("ready", () => {
    conn.exec(cmd, (e, stream) => {
      if (e) { console.error(e.message); conn.end(); process.exit(1); }
      stream.on("data", (d) => { out += d.toString(); });
      stream.stderr.on("data", (d) => { err += d.toString(); });
      stream.on("close", (code) => {
        process.stdout.write(out);
        if (err) { process.stderr.write(err); }
        conn.end();
        process.exit(code || 0);
      });
    });
  })
  .on("error", (e) => {
    console.error("ssh error: " + e.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username: "root", password, readyTimeout: 60000 });
