#!/usr/bin/env node
/**
 * Servidor unificado de XuperTV para televisores Hisense (VIDAA OS) y navegadores Smart TV.
 * - Funciona en la nube (Render, Railway, Fly.io, Docker, VPS) usando un único puerto (PORT)
 * - Funciona en red local (Windows / Linux / macOS) con INICIAR-HISENSE-VIDAA.bat
 * - No modifica ni altera los archivos protegidos de LG webOS (AGENTS.md).
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn as origSpawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const childProcess = require("node:child_process");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const webRoot = path.join(rootDir, "webos", "fidelity");
const svcDir = path.join(rootDir, "webos", "services", "com.webosflux.xuptertv.fidelity.service");

const PORT = Number(process.env.PORT || process.argv[2] || 8899);
const HOST = process.env.HOST || "0.0.0.0";

// ---------------------------------------------------------------------------
// 1. En Windows, redirigir rutas /tmp/xuper-* a os.tmpdir() sin tocar el servicio
// ---------------------------------------------------------------------------
if (process.platform === "win32") {
  const mapTmp = (p) => {
    if (typeof p === "string" && /^\/tmp\/(xuper-[^/\\]+)$/.test(p)) {
      return path.join(os.tmpdir(), RegExp.$1);
    }
    return p;
  };
  const origReadFileSync = fs.readFileSync;
  const origWriteFileSync = fs.writeFileSync;
  const origAppendFileSync = fs.appendFileSync;
  fs.readFileSync = function (p, ...rest) { return origReadFileSync.call(this, mapTmp(p), ...rest); };
  fs.writeFileSync = function (p, ...rest) { return origWriteFileSync.call(this, mapTmp(p), ...rest); };
  fs.appendFileSync = function (p, ...rest) { return origAppendFileSync.call(this, mapTmp(p), ...rest); };
}

// ---------------------------------------------------------------------------
// 2. Detectar FFmpeg del sistema (Windows / Linux Cloud x64 / Docker)
//    para que el "Modo Fluido" (fMP4 relay) funcione fuera de TVs armhf.
// ---------------------------------------------------------------------------
function detectHostFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const probeCmd = process.platform === "win32" ? "where.exe" : "which";
  try {
    const r = spawnSync(probeCmd, ["ffmpeg"], { encoding: "utf8", timeout: 3000 });
    if (r.status === 0 && r.stdout) {
      const first = r.stdout.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      if (first && fs.existsSync(first)) return first;
    }
  } catch {}
  const candidates = process.platform === "win32"
    ? [
        path.join(process.env.LOCALAPPDATA || "", "Microsoft\\WinGet\\Links\\ffmpeg.exe"),
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
      ]
    : ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/bin/ffmpeg"];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

const hostFfmpeg = detectHostFfmpeg();
if (hostFfmpeg && !(process.platform === "linux" && process.arch === "arm")) {
  childProcess.spawn = function (cmd, args, opts) {
    if (typeof cmd === "string" && (/[\\/]ffmpeg$/i.test(cmd) || /xuper-ffmpeg$/i.test(cmd))) {
      return origSpawn(hostFfmpeg, args, opts);
    }
    return origSpawn(cmd, args, opts);
  };
}

// ---------------------------------------------------------------------------
// 3. Emular 'webos-service' en memoria para cargar index.js real al 100%
// ---------------------------------------------------------------------------
const registeredMethods = {};
class MockWebosService {
  constructor(name) {
    this.name = name;
    this.activityManager = {
      idleTimeout: 86400,
      create(_name, cb) {
        if (typeof cb === "function") setTimeout(() => cb({}), 10);
      },
    };
  }
  register(name, fn) {
    registeredMethods[String(name)] = fn;
    return fn;
  }
}

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "webos-service") {
    return MockWebosService;
  }
  return origLoad.call(this, request, parent, isMain);
};

// Cargar el servicio real de XuperTV (magis, proxy, ffmpeg-relay, dnsx, netdiag...)
require(path.join(svcDir, "index.js"));
const proxy = require(path.join(svcDir, "proxy.js"));
const relay = require(path.join(svcDir, "ffmpeg-relay.js"));
if (hostFfmpeg && relay && typeof relay.selfTest === "function") {
  relay.selfTest(() => {});
}

// ---------------------------------------------------------------------------
// 4. Utilidades de red y reescritura de orígenes para Cloud / LAN
// ---------------------------------------------------------------------------
function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

function getPublicOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || `127.0.0.1:${PORT}`).split(",")[0].trim();
  return `${proto}://${host}`;
}

function rewritePayloadUrls(obj, origin) {
  if (!obj || typeof obj !== "object") return obj;
  // Importante: NO reescribimos :8787/s/ ni :8787/t/ dentro del JSON de resolveSmooth,
  // porque app.js comprueba /127\.0\.0\.1:8787\/s\// para habilitar seek (?start=) y
  // cambio de audio (&a=) en Modo Fluido. En su lugar, vidaa-shim.js redirige
  // 127.0.0.1:8787 al mismo origen justo al asignarlo al elemento <video>/<source>.
  const rewriteStr = (val) => {
    if (typeof val !== "string") return val;
    if (/:8787\/(s|t)\//.test(val)) return val;
    return val.replace(/^http:\/\/(127\.0\.0\.1|localhost):\d+(?=\/(media|sub|hls)\/)/i, origin);
  };
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = typeof obj[i] === "string" ? rewriteStr(obj[i]) : rewritePayloadUrls(obj[i], origin);
    }
    return obj;
  }
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === "string") {
      obj[k] = rewriteStr(obj[k]);
    } else if (obj[k] && typeof obj[k] === "object") {
      rewritePayloadUrls(obj[k], origin);
    }
  }
  return obj;
}

function callServiceMethod(name, payload, cb) {
  const fn = registeredMethods[name];
  if (!fn) {
    return cb(404, { returnValue: false, errorText: `Unknown method "${name}"` });
  }
  let finished = false;
  const timer = setTimeout(() => {
    if (!finished) {
      finished = true;
      cb(504, { returnValue: false, errorText: `Timeout esperando a ${name}` });
    }
  }, 30000);

  const msg = {
    payload: payload || {},
    isSubscription: false,
    subscribe() {},
    respond(data) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        const body = data && typeof data === "object" ? data : { returnValue: true, value: data };
        cb(200, body);
      }
    },
  };

  try {
    fn(msg);
  } catch (err) {
    if (!finished) {
      finished = true;
      clearTimeout(timer);
      cb(500, { returnValue: false, errorText: (err && err.message) || String(err) });
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Proxy inverso interno hacia proxy.js (media/sub/hls) y ffmpeg-relay (s/t)
//    Permite exponer TODO en un único puerto HTTP/HTTPS para Cloud y VIDAA OS
// ---------------------------------------------------------------------------
function forwardToInternalPort(req, res, targetPort, rewriteM3u8Origin) {
  if (!targetPort) {
    res.writeHead(503, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
    res.end("Media service starting");
    return;
  }
  const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` };
  const upReq = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (upRes) => {
      const ct = String(upRes.headers["content-type"] || "").toLowerCase();
      const isM3u8 =
        rewriteM3u8Origin &&
        (ct.includes("mpegurl") || /\.m3u8($|\?)/i.test(req.url || ""));

      if (isM3u8 && req.method !== "HEAD") {
        const chunks = [];
        upRes.on("data", (c) => chunks.push(c));
        upRes.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const rewritten = raw.replace(
            /http:\/\/(127\.0\.0\.1|localhost):\d+(?=\/(hls|media|sub)\/)/gi,
            rewriteM3u8Origin
          );
          const outHeaders = { ...upRes.headers };
          delete outHeaders["content-length"];
          delete outHeaders["content-range"];
          outHeaders["Content-Length"] = Buffer.byteLength(rewritten);
          outHeaders["Access-Control-Allow-Origin"] = "*";
          res.writeHead(upRes.statusCode || 200, outHeaders);
          res.end(rewritten);
        });
        return;
      }

      const outHeaders = { ...upRes.headers, "Access-Control-Allow-Origin": "*" };
      res.writeHead(upRes.statusCode || 200, outHeaders);
      upRes.pipe(res);
    }
  );

  upReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
      res.end("Proxy error: " + err.message);
    } else {
      res.destroy();
    }
  });

  req.on("close", () => {
    try { upReq.destroy(); } catch {}
  });

  req.pipe(upReq);
}

// ---------------------------------------------------------------------------
// 6. Shim de compatibilidad para Hisense VIDAA OS y navegadores (vidaa-shim.js)
// ---------------------------------------------------------------------------
function buildVidaaShimJs() {
  return `(function () {
  "use strict";
  var ORIGIN = window.location.origin;

  function rewriteLoopbackUrl(url) {
    if (typeof url !== "string") return url;
    var m8910 = /^https?:\\/\\/(127\\.0\\.0\\.1|localhost):8910(\\/.*)?$/i.exec(url);
    if (m8910) return ORIGIN + "/api" + (m8910[2] || "/");
    var mLocal = /^https?:\\/\\/(127\\.0\\.0\\.1|localhost):\\d+(\\/.*)$/i.exec(url);
    if (mLocal) return ORIGIN + mLocal[2];
    return url;
  }

  // 1. Emular entorno PalmSystem y PalmServiceBridge para que webOSTV.js y app.js
  //    funcionen al 100% en Hisense VIDAA OS sin modificar ni una línea de app.js.
  if (!window.PalmSystem) {
    window.PalmSystem = {
      identifier: "com.webosflux.xuptertv.fidelity 1000",
      deviceInfo: JSON.stringify({
        modelName: "Hisense VIDAA Smart TV",
        platformVersion: "6.0.0",
        platformVersionMajor: 6,
        platformVersionMinor: 0,
        platformVersionDot: 0,
        screenWidth: window.screen ? window.screen.width || 1920 : 1920,
        screenHeight: window.screen ? window.screen.height || 1080 : 1080
      }),
      stageReady: function () {},
      platformBack: function () {
        try { window.close(); } catch (e) {}
        try { history.back(); } catch (e) {}
      }
    };
  }

  if (!window.PalmServiceBridge) {
    var Bridge = function () {
      this.onservicecallback = null;
      this._xhr = null;
    };
    Bridge.prototype.call = function (uri, payloadStr) {
      var self = this;
      var u = String(uri || "");
      // Responder llamadas del sistema de LG inmediatamente en memoria
      if (u.indexOf("com.webosflux.xuptertv.fidelity.service") === -1) {
        setTimeout(function () {
          if (typeof self.onservicecallback === "function") {
            self.onservicecallback(JSON.stringify({
              returnValue: true,
              settings: { soundOutput: "tv_speaker", soundOutputDigital: "auto" },
              configs: { "tv.model.modelname": "Hisense VIDAA", "tv.nyx.platformVersion": "6.0.0" },
              sdkVersion: "6.0.0",
              modelName: "Hisense VIDAA"
            }));
          }
        }, 0);
        return;
      }
      var parts = u.split("/");
      var method = parts[parts.length - 1] || "ping";
      var xhr = new XMLHttpRequest();
      this._xhr = xhr;
      var apiUrl = ORIGIN + "/api/" + encodeURIComponent(method) + "?q=" + encodeURIComponent(payloadStr || "{}");
      xhr.open("GET", apiUrl, true);
      xhr.timeout = 28000;
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && typeof self.onservicecallback === "function") {
          if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
            self.onservicecallback(xhr.responseText);
          } else {
            self.onservicecallback(JSON.stringify({
              returnValue: false,
              errorText: xhr.responseText || ("HTTP " + xhr.status)
            }));
          }
        }
      };
      xhr.onerror = function () {
        if (typeof self.onservicecallback === "function") {
          self.onservicecallback(JSON.stringify({ returnValue: false, errorText: "Error de red con el servidor XuperTV" }));
        }
      };
      xhr.ontimeout = function () {
        if (typeof self.onservicecallback === "function") {
          self.onservicecallback(JSON.stringify({ returnValue: false, errorText: "Tiempo de espera agotado" }));
        }
      };
      try { xhr.send(null); } catch (e) {}
    };
    Bridge.prototype.cancel = function () {
      if (this._xhr) {
        try { this._xhr.abort(); } catch (e) {}
        this._xhr = null;
      }
    };
    window.PalmServiceBridge = Bridge;
  }

  // 2. Interceptar XMLHttpRequest para redirigir 127.0.0.1:<puerto> al servidor unificado
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = rewriteLoopbackUrl(url);
    return origOpen.apply(this, args);
  };

  // 3. Limpiar ';mediaOption=...' (exclusivo de LG) y redirigir 127.0.0.1 en <video>/<source>
  var origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    var attr = String(name || "").toLowerCase();
    if (attr === "src") {
      value = rewriteLoopbackUrl(value);
    } else if (attr === "type" && typeof value === "string" && value.indexOf(";mediaOption=") !== -1) {
      value = value.split(";mediaOption=")[0];
    }
    return origSetAttribute.call(this, name, value);
  };

  var mediaProto = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.prototype : null;
  var mediaSrcDesc = mediaProto ? Object.getOwnPropertyDescriptor(mediaProto, "src") : null;
  if (mediaSrcDesc && mediaSrcDesc.set) {
    Object.defineProperty(mediaProto, "src", {
      configurable: true,
      enumerable: true,
      get: function () {
        return mediaSrcDesc.get.call(this);
      },
      set: function (val) {
        return mediaSrcDesc.set.call(this, rewriteLoopbackUrl(val));
      }
    });
  }

  // 4. Soporte automático de HLS (.m3u8) para VIDAA OS y navegadores Chromium (MSE / hls.js)
  if (!window.Hls) {
    try {
      var hlsScript = document.createElement("script");
      hlsScript.async = true;
      hlsScript.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
      (document.head || document.documentElement).appendChild(hlsScript);
    } catch (e) {}
  }

  function canPlayNativeHls(video) {
    try {
      var res = video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL");
      return res === "probably" || res === "maybe";
    } catch (e) {
      return false;
    }
  }

  function attachHlsIfNeeded(video) {
    if (!video || video.tagName !== "VIDEO") return false;
    var src = video.getAttribute("src") || "";
    if (!src) {
      var sourceEl = video.querySelector("source");
      if (sourceEl) src = sourceEl.getAttribute("src") || "";
    }
    src = rewriteLoopbackUrl(src);
    if (!src) return false;

    if (video._xuperHls) {
      try { video._xuperHls.destroy(); } catch (e) {}
      video._xuperHls = null;
    }

    var isM3u8 = /\\.m3u8($|[?#])/i.test(src) || /\\/hls\\//i.test(src);
    if (!isM3u8) return false;

    // En Hisense VIDAA con soporte HLS nativo, asegurar que video.src esté asignado directamente
    if (canPlayNativeHls(video)) {
      if (mediaSrcDesc && mediaSrcDesc.set) {
        mediaSrcDesc.set.call(video, src);
      } else {
        origSetAttribute.call(video, "src", src);
      }
      return false;
    }

    // En navegadores Chromium / VIDAA sin demuxer HLS nativo en <video>, usar Hls.js (MSE)
    if (window.Hls && window.Hls.isSupported()) {
      var hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30
      });
      video._xuperHls = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
        try {
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
      });
      hls.on(window.Hls.Events.ERROR, function (_ev, data) {
        if (data && data.fatal) {
          if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });
      return true;
    }
    return false;
  }

  if (mediaProto && mediaProto.load) {
    var origLoad = mediaProto.load;
    mediaProto.load = function () {
      if (attachHlsIfNeeded(this)) return;
      return origLoad.apply(this, arguments);
    };
  }

  // 5. Normalizar códigos de control remoto de Hisense VIDAA OS
  //    (Botón Back/Return en distintas generaciones de VIDAA: 8, 27, 461, 10009, 166, BrowserBack)
  window.addEventListener("keydown", function (e) {
    var code = e.keyCode || e.which;
    var k = e.key || "";
    var active = document.activeElement;
    var isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
    if (!isInput && (code === 10009 || code === 166 || k === "BrowserBack" || k === "XF86Back")) {
      try {
        Object.defineProperty(e, "keyCode", { get: function () { return 461; } });
        Object.defineProperty(e, "which", { get: function () { return 461; } });
      } catch (err) {}
    } else if (code === 179 || code === 463) {
      try {
        Object.defineProperty(e, "keyCode", { get: function () { return 10252; } });
        Object.defineProperty(e, "which", { get: function () { return 10252; } });
      } catch (err) {}
    }
  }, true);
})();
`;
}

// ---------------------------------------------------------------------------
// 7. Página interactiva /instalar para configurar Hisense VIDAA OS en 1 minuto
// ---------------------------------------------------------------------------
function buildInstallPageHtml(req) {
  const origin = getPublicOrigin(req);
  const lanIps = getLanIps();
  const urls = lanIps.length
    ? lanIps.map((ip) => `http://${ip}:${PORT}`)
    : [origin];
  if (!urls.includes(origin) && !origin.includes("127.0.0.1") && !origin.includes("localhost")) {
    urls.unshift(origin);
  }
  const primaryUrl = urls[0];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instalar XuperTV en Hisense VIDAA OS</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #0b0e14; color: #e6edf3; line-height: 1.55; padding: 28px 18px;
  }
  .wrap { max-width: 880px; margin: 0 auto; }
  .hero {
    background: linear-gradient(135deg, #151c28 0%, #1a1125 100%);
    border: 1px solid #2d3748; border-radius: 16px; padding: 24px 28px; margin-bottom: 24px;
  }
  h1 { margin: 0 0 8px; font-size: 28px; color: #fff; }
  .badge {
    display: inline-block; background: #1f6feb; color: #fff; font-weight: 700;
    font-size: 12px; padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;
  }
  .url-box {
    background: #090c10; border: 2px solid #388bfd; border-radius: 12px;
    padding: 16px 20px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 22px; color: #58a6ff; font-weight: 700; word-break: break-all;
    margin: 14px 0;
  }
  .btn {
    display: inline-block; background: #238636; color: #fff; text-decoration: none;
    padding: 12px 22px; border-radius: 10px; font-weight: 700; margin-right: 10px;
  }
  .btn:hover { background: #2ea043; }
  .card {
    background: #121722; border: 1px solid #262f3f; border-radius: 14px;
    padding: 20px 24px; margin-bottom: 18px;
  }
  h2 { margin-top: 0; font-size: 20px; color: #79c0ff; }
  ol, ul { padding-left: 22px; }
  li { margin-bottom: 10px; }
  code {
    background: #1f2937; color: #ffdf5d; padding: 2px 8px; border-radius: 6px;
    font-family: ui-monospace, Consolas, monospace; font-size: 15px;
  }
  .status { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px; font-size: 14px; }
  .pill { background: #1b2432; border: 1px solid #30363d; padding: 6px 12px; border-radius: 8px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <span class="badge">HISENSE VIDAA OS · SERVIDOR ACTIVO</span>
    <h1>XuperTV Hydra para Hisense (VIDAA OS)</h1>
    <p>Usa esta dirección URL para instalar o abrir la aplicación en tu televisor Hisense:</p>
    <div class="url-box">${primaryUrl}</div>
    ${urls.length > 1 ? `<p style="font-size:14px;color:#8b949e;">Otras IPs detectadas: ${urls.slice(1).map((u) => `<code>${u}</code>`).join(" · ")}</p>` : ""}
    <div style="margin-top: 16px;">
      <a class="btn" href="/">▶ Abrir XuperTV aquí</a>
    </div>
    <div class="status">
      <div class="pill">Estado del servidor: <strong>En línea ✅</strong></div>
      <div class="pill">Proxy Anti-Bloqueo DoH: <strong>Activo ✅</strong></div>
      <div class="pill">FFmpeg Modo Fluido: <strong>${hostFfmpeg ? "Disponible ✅" : "Modo Normal (HLS) ✅"}</strong></div>
    </div>
  </div>

  <div class="card">
    <h2>Método 1: Instalar como App fija en el menú de VIDAA OS (Recomendado)</h2>
    <ol>
      <li>En tu televisor Hisense, abre el <strong>Navegador Web (Browser)</strong> que viene preinstalado.</li>
      <li>En la barra de direcciones de arriba, escribe exactamente:<br>
        <code>hisense://debug</code> (si tu TV tiene VIDAA U6/U7/U8 y no abre, prueba con <code>https://vidaahub.com</code>).</li>
      <li>Se abrirá la pantalla de instalación de aplicaciones personalizadas de Hisense (<em>Custom App / App Store Debug</em>).</li>
      <li>Rellena los 3 campos así:
        <ul>
          <li><strong>App Name (Nombre):</strong> <code>XuperTV</code></li>
          <li><strong>App URL (Dirección):</strong> <code>${primaryUrl}</code></li>
          <li><strong>Icon URL (Icono):</strong> <code>${primaryUrl}/icon.png</code></li>
        </ul>
      </li>
      <li>Pulsa el botón <strong>Install (Instalar)</strong>. ¡Listo! Ahora tendrás el icono de <strong>XuperTV</strong> en tu lista de aplicaciones de VIDAA OS.</li>
    </ol>
  </div>

  <div class="card">
    <h2>Método 2: Abrir directo en el navegador de VIDAA (Sin instalar)</h2>
    <ol>
      <li>Abre el <strong>Navegador Web</strong> de tu TV Hisense.</li>
      <li>Escribe en la barra de direcciones: <code>${primaryUrl}</code></li>
      <li>Agrégalo a <strong>Favoritos / Marcadores</strong> (icono de estrella) y activa la pantalla completa. El control remoto de tu Hisense (flechas, OK, botón Atrás y botón Amarillo para favoritos) funcionará automáticamente.</li>
    </ol>
  </div>

  <div class="card">
    <h2>Método 3: Subir a la nube 24/7 (Para no depender de tener la PC encendida)</h2>
    <p>Este proyecto ya incluye <code>Dockerfile</code>, <code>package.json</code> y <code>render.yaml</code> listos para desplegar gratis en la nube:</p>
    <ol>
      <li>Sube esta carpeta a un repositorio de <strong>GitHub</strong>.</li>
      <li>En <strong>Render.com</strong> o <strong>Railway.app</strong>, elige <em>New Web Service</em> y conecta tu repositorio (detectará el <code>Dockerfile</code> con Node + FFmpeg automáticamente).</li>
      <li>Obtendrás una URL permanente <code>https://tu-xupertv.onrender.com</code> que podrás poner en el <strong>Método 1</strong> de tu TV Hisense para usarla con la PC apagada.</li>
    </ol>
  </div>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 8. Servidor HTTP unificado (API + Proxy Media + Relay FFmpeg + Web App)
// ---------------------------------------------------------------------------
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const apiMethodNames = new Set([
  "ping",
  "setProxy",
  "keepAlive",
  "heartbeat",
  "home",
  "search",
  "detail",
  "resolve",
  "resolveSmooth",
  "mediaInfo",
  "liveChannels",
  "liveCategories",
  "fetchM3u",
  "resolveLive",
  "abortMedia",
  "prewarm",
  "netdiag",
  "checkUpdate",
  "applyUpdate",
]);

const server = http.createServer((req, res) => {
  const origin = getPublicOrigin(req);
  let u;
  try {
    u = new URL(req.url || "/", origin);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad URL");
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    });
    res.end();
    return;
  }

  const pathname = u.pathname;

  // A. Rutas de streaming del proxy (/media/*, /sub/*, /hls/*)
  if (
    pathname.startsWith("/media/") ||
    pathname.startsWith("/sub/") ||
    pathname.startsWith("/hls/")
  ) {
    proxy.start((err, p) => {
      if (err) {
        res.writeHead(502, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
        res.end("Proxy unavailable: " + err.message);
        return;
      }
      forwardToInternalPort(req, res, p, origin);
    });
    return;
  }

  // B. Rutas del relay FFmpeg Modo Fluido (/s/*, /t/*, /abort)
  if (pathname.startsWith("/s/") || pathname.startsWith("/t/") || pathname === "/abort") {
    forwardToInternalPort(req, res, relay.port(), null);
    return;
  }

  // C. Script de compatibilidad VIDAA OS + HLS.js
  if (pathname === "/vidaa-shim.js") {
    const body = buildVidaaShimJs();
    res.writeHead(200, {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
    return;
  }

  // D. Página de ayuda e instalación en Hisense VIDAA (/instalar o /vidaa)
  if (pathname === "/instalar" || pathname === "/vidaa") {
    const html = buildInstallPageHtml(req);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(html);
    return;
  }

  // E. Llamadas a los métodos del servicio (/api/<method> o /<method>)
  const cleanName = pathname.startsWith("/api/")
    ? pathname.slice(5).replace(/\/+$/, "")
    : pathname.slice(1).replace(/\/+$/, "");

  if (pathname.startsWith("/api/") || apiMethodNames.has(cleanName)) {
    const handleApiPayload = (payload) => {
      callServiceMethod(cleanName, payload, (status, data) => {
        const rewritten = rewritePayloadUrls(data, origin);
        const body = JSON.stringify(rewritten);
        res.writeHead(status, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(body),
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        res.end(body);
      });
    };

    if (req.method === "POST") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        let payload = {};
        try {
          payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        } catch {}
        handleApiPayload(payload);
      });
      return;
    }

    let payload = {};
    if (u.searchParams.has("q")) {
      try {
        payload = JSON.parse(u.searchParams.get("q") || "{}") || {};
      } catch {}
    } else {
      for (const [k, v] of u.searchParams.entries()) {
        if (v === "true") payload[k] = true;
        else if (v === "false") payload[k] = false;
        else payload[k] = v;
      }
    }
    handleApiPayload(payload);
    return;
  }

  // F. Archivos estáticos de la Web App (webos/fidelity)
  let relPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  relPath = relPath.replace(/^\/+/, "");
  const filePath = path.resolve(webRoot, relPath);

  if (!filePath.startsWith(webRoot)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Inyectar en memoria el shim de Hisense VIDAA y hls.js al servir index.html
    if (relPath === "index.html") {
      fs.readFile(filePath, "utf8", (rerr, html) => {
        if (rerr) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Error reading index.html");
          return;
        }
        const injected = html.replace(
          '<script src="js/webOSTV.js"></script>',
          '<script src="vidaa-shim.js"></script>\n<script src="js/webOSTV.js"></script>'
        );
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
        });
        res.end(injected);
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": st.size,
      "Cache-Control": ext === ".png" || ext === ".jpg" ? "public, max-age=86400" : "no-cache",
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

proxy.start((err, p) => {
  if (err) {
    console.error("[vidaa-server] Error iniciando proxy:", err);
  }
  server.listen(PORT, HOST, () => {
    const lanIps = getLanIps();
    console.log("================================================================");
    console.log("  XuperTV Hydra - Servidor para Hisense VIDAA OS activo");
    console.log("================================================================");
    if (lanIps.length) {
      for (const ip of lanIps) {
        console.log(`  -> URL para tu TV Hisense:  http://${ip}:${PORT}`);
        console.log(`  -> Guía de instalación:     http://${ip}:${PORT}/instalar`);
      }
    } else {
      console.log(`  -> URL del servidor:        http://127.0.0.1:${PORT}`);
    }
    console.log(`  -> Proxy interno en puerto: ${p} | FFmpeg: ${hostFfmpeg || "Modo Normal (HLS)"}`);
    console.log("================================================================");
  });
});
