// Call a Luna method on the TV over SSH.
// Usage: node tools/tv_luna.mjs <luna-uri> [key=value ...]
// Values that look like JSON scalars (true/false/null/number) are converted.
// Example: node tools/tv_luna.mjs luna://.../search value=spiderman
//          node tools/tv_luna.mjs luna://.../resolve contentId=ABC playbackMode=smooth
import { loadSsh2 } from "./ssh2-loader.mjs";

const { Client } = loadSsh2();

const uri = process.argv[2];
const host = process.env.TV_HOST || "192.168.1.18";
const password = process.env.TV_PASS || "alpine";

if (!uri) {
  console.error("usage: node tools/tv_luna.mjs <luna-uri> [key=value ...]");
  process.exit(2);
}

const payload = {};
for (const pair of process.argv.slice(3)) {
  const eq = pair.indexOf("=");
  if (eq < 1) { continue; }
  const key = pair.slice(0, eq);
  const raw = pair.slice(eq + 1);
  let value = raw;
  if (/^(true|false|null|-?\d+(\.\d+)?)$/.test(raw)) {
    value = JSON.parse(raw);
  }
  payload[key] = value;
}

function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

const json = JSON.stringify(payload);
const cmd = "/usr/bin/luna-send-pub -n 1 " + shellQuote(uri) + " " + shellQuote(json);
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
  .on("error", (e) => { console.error("ssh error: " + e.message); process.exit(1); })
  .connect({ host, port: 22, username: "root", password, readyTimeout: 15000 });
