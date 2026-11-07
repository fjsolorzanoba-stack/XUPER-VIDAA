// Locate the `ssh2` module without pinning a machine-specific path.
//
// ares-cli ships ssh2 inside its own node_modules, but the install location
// differs per OS and per npm prefix, so try, in order:
//   1. SSH2_PATH (explicit override)
//   2. a local/global `ssh2` install
//   3. the copy bundled with @webos-tools/cli (npm global, Linux and Windows)
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function candidates() {
  const out = [];
  if (process.env.SSH2_PATH) { out.push(process.env.SSH2_PATH); }
  out.push("ssh2");
  const prefixes = [
    process.env.APPDATA && path.join(process.env.APPDATA, "npm", "node_modules"),
    process.env.npm_config_prefix && path.join(process.env.npm_config_prefix, "lib", "node_modules"),
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
  ].filter(Boolean);
  for (const prefix of prefixes) {
    out.push(path.join(prefix, "@webos-tools", "cli", "node_modules", "ssh2"));
    out.push(path.join(prefix, "ssh2"));
  }
  return out;
}

export function loadSsh2() {
  const tried = [];
  for (const id of candidates()) {
    tried.push(id);
    try { return require(id); } catch { /* try the next one */ }
  }
  throw new Error(
    "No se encontró el módulo ssh2. Instálalo con `npm i -g @webos-tools/cli` " +
    "o `npm i ssh2`, o define SSH2_PATH con la ruta al paquete.\nProbado:\n  " +
    tried.join("\n  ")
  );
}
