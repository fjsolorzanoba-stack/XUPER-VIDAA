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
// 1. Detectar FFmpeg (ffmpeg-static incluido en node_modules o FFmpeg del sistema)
// ---------------------------------------------------------------------------
function detectHostFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  try {
    const staticPath = require("ffmpeg-static");
    if (staticPath && fs.existsSync(staticPath)) return staticPath;
  } catch {}
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
let lastClientHevcCapable = true;

// Localizar hls.min.js local (instalado en node_modules/hls.js/dist/hls.min.js)
function detectLocalHlsJs() {
  const candidates = [
    path.join(rootDir, "node_modules", "hls.js", "dist", "hls.min.js"),
    path.join(rootDir, "node_modules", "hls.js", "dist", "hls.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Adaptar rutas /tmp/xuper-* y ruta de FFmpeg en memoria sin tocar archivos
// ---------------------------------------------------------------------------
const mapPath = (p) => {
  if (typeof p !== "string") return p;
  if (process.platform === "win32" && /^\/tmp\/(xuper-[^/\\]+)$/.test(p)) {
    return path.join(os.tmpdir(), RegExp.$1);
  }
  if (hostFfmpeg && !(process.platform === "linux" && process.arch === "arm")) {
    if (/[\\/]ffmpeg$/i.test(p) || /xuper-ffmpeg$/i.test(p)) {
      return hostFfmpeg;
    }
  }
  return p;
};

const origReadFileSync = fs.readFileSync;
const origWriteFileSync = fs.writeFileSync;
const origAppendFileSync = fs.appendFileSync;
const origAccessSync = fs.accessSync;
const origStatSync = fs.statSync;

fs.readFileSync = function (p, ...rest) { return origReadFileSync.call(this, mapPath(p), ...rest); };
fs.writeFileSync = function (p, ...rest) { return origWriteFileSync.call(this, mapPath(p), ...rest); };
fs.appendFileSync = function (p, ...rest) { return origAppendFileSync.call(this, mapPath(p), ...rest); };
fs.accessSync = function (p, ...rest) { return origAccessSync.call(this, mapPath(p), ...rest); };
fs.statSync = function (p, ...rest) { return origStatSync.call(this, mapPath(p), ...rest); };

if (hostFfmpeg && !(process.platform === "linux" && process.arch === "arm")) {
  childProcess.spawn = function (cmd, args, opts) {
    if (typeof cmd === "string" && (/[\\/]ffmpeg$/i.test(cmd) || /xuper-ffmpeg$/i.test(cmd))) {
      let finalArgs = Array.isArray(args) ? args.slice() : [];
      // Si el dispositivo/navegador cliente no soporta HEVC (H.265) en hardware y el stream
      // de Magis viene en HEVC (-tag:v hvc1), transcodificar video al vuelo a H.264 ultrafast
      // para evitar "No se pudo abrir el stream (código 4)".
      const tagIdx = finalArgs.indexOf("-tag:v");
      const isHevcStream = tagIdx !== -1 && finalArgs[tagIdx + 1] === "hvc1";
      if (isHevcStream && !lastClientHevcCapable) {
        finalArgs.splice(tagIdx, 2);
        const cIdx = finalArgs.indexOf("-c");
        if (cIdx !== -1 && finalArgs[cIdx + 1] === "copy") {
          finalArgs.splice(
            cIdx,
            2,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-ac", "2",
            "-b:a", "160k"
          );
        } else {
          const cvIdx = finalArgs.indexOf("-c:v");
          if (cvIdx !== -1 && finalArgs[cvIdx + 1] === "copy") {
            finalArgs.splice(
              cvIdx,
              2,
              "-c:v", "libx264",
              "-preset", "ultrafast",
              "-tune", "zerolatency",
              "-crf", "23",
              "-pix_fmt", "yuv420p"
            );
          }
        }
      }
      return origSpawn(hostFfmpeg, finalArgs, opts);
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
// Interceptamos http.createServer durante la carga de módulos para capturar el handler
// de ffmpeg-relay.js en memoria y evitar colisiones EADDRINUSE en los puertos 8787 y 8910.
let relayRequestHandler = null;
const origCreateServer = http.createServer;
http.createServer = function (listener) {
  const srv = origCreateServer.call(this, listener);
  const origListen = srv.listen;
  srv.listen = function (portArg, hostArg, cbArg) {
    if (portArg === 8787) {
      relayRequestHandler = listener;
      return origListen.call(this, 0, "127.0.0.1", cbArg);
    }
    if (portArg === 8910) {
      return origListen.call(this, 0, "127.0.0.1", cbArg);
    }
    return origListen.apply(this, arguments);
  };
  return srv;
};

require(path.join(svcDir, "index.js"));
const proxy = require(path.join(svcDir, "proxy.js"));
const relay = require(path.join(svcDir, "ffmpeg-relay.js"));
http.createServer = origCreateServer;

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
  // Si un VOD en modo sin FFmpeg devolvió /media/<token>/stream.ts (video/mp2t),
  // convertirlo al manifiesto HLS virtual (/media/<token>/stream.m3u8) porque los
  // navegadores Chromium / VIDAA no reproducen archivos .ts crudos en <video>.
  if (
    typeof obj.proxyPath === "string" &&
    /\/media\/[a-f0-9]+\/stream\.ts$/i.test(obj.proxyPath)
  ) {
    obj.proxyPath = obj.proxyPath.replace(/\/stream\.ts$/i, "/stream.m3u8");
    obj.mime = "application/vnd.apple.mpegurl";
    obj.isHls = true;
  }

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
  payload = payload && typeof payload === "object" ? { ...payload } : {};

  // En Hisense VIDAA OS y navegadores Chromium, las películas y series VOD de Magis
  // vienen en contenedores MPEG-TS (.ts) con H.265/H.264 que <video> no demuxa en crudo.
  // Si FFmpeg está disponible, enrutar siempre VOD (resolve / resolveSmooth) por el
  // relay fMP4 (video/mp4) para garantizar reproducción instantánea sin código 4.
  if (name === "resolve" || name === "resolveSmooth") {
    if (payload.hevc !== undefined) {
      lastClientHevcCapable = !(
        payload.hevc === false ||
        payload.hevc === "false" ||
        payload.hevc === 0 ||
        payload.hevc === "0"
      );
    }
    if (relay && relay.available()) {
      payload.forceRelay = true;
      payload.playbackMode = "smooth";
      payload.container = "mp4";
    }
  }

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
    payload,
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
//    Nota: En Node 20/24 NO se debe usar req.on("close") porque para peticiones
//    GET sin body se dispara inmediatamente al terminar de leer la cabecera,
//    abortando la conexión upstream (causa del HTTP 502 / código 4).
// ---------------------------------------------------------------------------
function forwardToInternalPort(req, res, targetPort, rewriteM3u8Origin) {
  if (!targetPort) {
    res.writeHead(503, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
    res.end("Media service starting");
    return;
  }
  const fwdHeaders = {};
  if (req.headers.range) fwdHeaders.Range = req.headers.range;
  if (req.headers["if-range"]) fwdHeaders["If-Range"] = req.headers["if-range"];
  if (req.headers["user-agent"]) fwdHeaders["User-Agent"] = req.headers["user-agent"];
  if (req.headers.accept) fwdHeaders.Accept = req.headers.accept;
  fwdHeaders.Host = `127.0.0.1:${targetPort}`;

  const upReq = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method || "GET",
      headers: fwdHeaders,
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
      try { res.destroy(); } catch {}
    }
  });

  // Solo abortar upstream si el cliente cierra la respuesta antes de terminar
  res.on("close", () => {
    if (!res.writableEnded) {
      try { upReq.destroy(); } catch {}
    }
  });

  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    upReq.end();
  } else {
    req.pipe(upReq);
  }
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

  function isHlsUrl(url) {
    if (typeof url !== "string" || !url) return false;
    return /\\.m3u8($|[?#])/i.test(url) || /\\/hls\\//i.test(url);
  }

  function isBlobUrl(url) {
    return typeof url === "string" && url.indexOf("blob:") === 0;
  }

  function destroyVideoHls(video) {
    if (video && video._xuperHls) {
      var h = video._xuperHls;
      video._xuperHls = null;
      video._xuperInHlsOp = true;
      try { h.destroy(); } catch (e) {}
      video._xuperInHlsOp = false;
    }
    if (video) {
      video._xuperM3u8Src = "";
      video._xuperHlsUrl = "";
      video._xuperWantPlay = false;
    }
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

  // 3. Interceptar atributos y propiedades de <video> y <source>
  //    En Chromium / VIDAA, si un <source src="...m3u8"> o video.src = "...m3u8" se pasa
  //    al reproductor nativo sin demuxer HLS nativo, el navegador lanza inmediatamente
  //    MEDIA_ERR_SRC_NOT_SUPPORTED (código 4). Usamos Hls.js (MSE) cuando está soportado.
  var useHlsJs = function () {
    return !!(window.Hls && typeof window.Hls.isSupported === "function" && window.Hls.isSupported());
  };

  var origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    var attr = String(name || "").toLowerCase();
    if (attr === "src") {
      if (isBlobUrl(value) || this._xuperInHlsOp) {
        return origSetAttribute.call(this, name, value);
      }
      value = rewriteLoopbackUrl(value);
      if (this.tagName === "VIDEO" && isHlsUrl(value) && useHlsJs()) {
        this._xuperM3u8Src = value;
        return;
      }
    } else if (attr === "type" && typeof value === "string" && value.indexOf(";mediaOption=") !== -1) {
      value = value.split(";mediaOption=")[0];
    }
    return origSetAttribute.call(this, name, value);
  };

  var origRemoveAttribute = Element.prototype.removeAttribute;
  Element.prototype.removeAttribute = function (name) {
    if (this.tagName === "VIDEO" && String(name || "").toLowerCase() === "src") {
      if (!this._xuperInHlsOp) {
        destroyVideoHls(this);
      }
    }
    return origRemoveAttribute.apply(this, arguments);
  };

  var mediaProto = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.prototype : null;
  var mediaSrcDesc = mediaProto ? Object.getOwnPropertyDescriptor(mediaProto, "src") : null;

  var origAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function (child) {
    if (
      this &&
      this.tagName === "VIDEO" &&
      child &&
      child.tagName === "SOURCE"
    ) {
      var rawSrc = child.getAttribute("src") || "";
      if (isBlobUrl(rawSrc) || this._xuperInHlsOp) {
        return origAppendChild.apply(this, arguments);
      }
      var sUrl = rewriteLoopbackUrl(rawSrc);
      if (isHlsUrl(sUrl) && useHlsJs()) {
        this._xuperM3u8Src = sUrl;
        return child;
      }
      if (sUrl && mediaSrcDesc && mediaSrcDesc.set) {
        destroyVideoHls(this);
        if (mediaSrcDesc.get.call(this) !== sUrl) {
          this._xuperSrcSetAt = Date.now();
          mediaSrcDesc.set.call(this, sUrl);
        }
        return child;
      }
    }
    return origAppendChild.apply(this, arguments);
  };

  if (mediaSrcDesc && mediaSrcDesc.set) {
    Object.defineProperty(mediaProto, "src", {
      configurable: true,
      enumerable: true,
      get: function () {
        var nativeVal = mediaSrcDesc.get.call(this);
        return nativeVal || this._xuperM3u8Src || "";
      },
      set: function (val) {
        // Hls.js asigna internamente video.src = "blob:http://..." durante attachMedia().
        // NO debemos destruir la instancia de Hls.js cuando el valor es un blob: URL.
        if (isBlobUrl(val) || this._xuperInHlsOp) {
          this._xuperSrcSetAt = Date.now();
          return mediaSrcDesc.set.call(this, val);
        }
        if (!val) {
          destroyVideoHls(this);
          this._xuperSrcSetAt = 0;
          origRemoveAttribute.call(this, "src");
          return "";
        }
        var rewritten = rewriteLoopbackUrl(val);
        if (this.tagName === "VIDEO" && isHlsUrl(rewritten) && useHlsJs()) {
          if (this._xuperHls) {
            var oldHls = this._xuperHls;
            this._xuperHls = null;
            this._xuperInHlsOp = true;
            try { oldHls.destroy(); } catch (e) {}
            this._xuperInHlsOp = false;
          }
          this._xuperM3u8Src = rewritten;
          this._xuperHlsUrl = "";
          return rewritten;
        }
        destroyVideoHls(this);
        if (mediaSrcDesc.get.call(this) === rewritten) {
          return rewritten;
        }
        this._xuperSrcSetAt = Date.now();
        return mediaSrcDesc.set.call(this, rewritten);
      }
    });
  }

  var origLoad = mediaProto && mediaProto.load ? mediaProto.load : null;
  var origPlay = mediaProto && mediaProto.play ? mediaProto.play : null;

  function fallbackLiveToFfmpeg(video, m3u8Url) {
    if (!m3u8Url || video._xuperLiveFallbackUrl === m3u8Url) return;
    video._xuperLiveFallbackUrl = m3u8Url;
    if (video._xuperHls) {
      var old = video._xuperHls;
      video._xuperHls = null;
      video._xuperInHlsOp = true;
      try { old.destroy(); } catch (e) {}
      video._xuperInHlsOp = false;
    }
    video._xuperM3u8Src = "";
    video._xuperHlsUrl = "";
    var liveMp4Url = ORIGIN + "/live-s?src=" + encodeURIComponent(m3u8Url) + "&_t=" + Date.now();
    video._xuperInHlsOp = true;
    try {
      origRemoveAttribute.call(video, "src");
      while (video.firstChild) video.removeChild(video.firstChild);
      if (mediaSrcDesc && mediaSrcDesc.set) {
        mediaSrcDesc.set.call(video, liveMp4Url);
      } else {
        origSetAttribute.call(video, "src", liveMp4Url);
      }
      if (origLoad) origLoad.call(video);
      if (origPlay) {
        var p = origPlay.call(video);
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) {}
    video._xuperInHlsOp = false;
  }

  function startHlsPlayback(video, src) {
    if (video._xuperHls) {
      var prev = video._xuperHls;
      video._xuperHls = null;
      video._xuperInHlsOp = true;
      try { prev.destroy(); } catch (e) {}
      video._xuperInHlsOp = false;
    }
    var hls = new window.Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 30,
      maxBufferLength: 30,
      manifestLoadingTimeOut: 20000,
      levelLoadingTimeOut: 20000,
      fragLoadingTimeOut: 25000
    });
    video._xuperHls = hls;
    video._xuperHlsUrl = src;
    video._xuperM3u8Src = src;

    var mediaRecoveries = 0;
    var netRecoveries = 0;

    function tryAutoPlay() {
      if (video._xuperWantPlay && origPlay) {
        try {
          var p = origPlay.call(video);
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
      }
    }

    hls.on(window.Hls.Events.MEDIA_ATTACHED, function () {
      hls.loadSource(src);
    });
    hls.on(window.Hls.Events.MANIFEST_PARSED, tryAutoPlay);
    if (window.Hls.Events.FRAG_BUFFERED) {
      hls.on(window.Hls.Events.FRAG_BUFFERED, tryAutoPlay);
    }
    hls.on(window.Hls.Events.ERROR, function (_ev, data) {
      if (data && data.fatal) {
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          netRecoveries++;
          if (netRecoveries <= 2) {
            hls.startLoad();
            return;
          }
        } else if (
          data.type === window.Hls.ErrorTypes.MEDIA_ERROR &&
          data.details !== "bufferAddCodecError" &&
          data.details !== "manifestIncompatibleCodecsError"
        ) {
          mediaRecoveries++;
          if (mediaRecoveries <= 1) {
            video._xuperInHlsOp = true;
            try { hls.recoverMediaError(); } catch (e) {}
            video._xuperInHlsOp = false;
            return;
          }
        }
        fallbackLiveToFfmpeg(video, src);
      }
    });
    video._xuperInHlsOp = true;
    try {
      hls.attachMedia(video);
    } finally {
      video._xuperInHlsOp = false;
    }
  }

  if (mediaProto && origLoad) {
    mediaProto.load = function () {
      if (this.tagName === "VIDEO") {
        if (this._xuperInHlsOp) {
          return origLoad.apply(this, arguments);
        }
        var m3u8 = this._xuperM3u8Src || "";
        if (!m3u8) {
          var sEl = this.querySelector("source");
          if (sEl) {
            var cand = rewriteLoopbackUrl(sEl.getAttribute("src") || "");
            if (isHlsUrl(cand)) m3u8 = cand;
          }
        }
        if (m3u8 && useHlsJs()) {
          if (this._xuperHls && this._xuperHlsUrl === m3u8) {
            return;
          }
          startHlsPlayback(this, m3u8);
          return;
        }
        // Ignorar llamadas a video.load() en vacío o duplicadas tras asignar video.src
        var currentNativeSrc = mediaSrcDesc && mediaSrcDesc.get ? mediaSrcDesc.get.call(this) : this.getAttribute("src");
        if (!currentNativeSrc && !this.querySelector("source")) {
          return;
        }
        if (this._xuperSrcSetAt && (Date.now() - this._xuperSrcSetAt < 300)) {
          this._xuperSrcSetAt = 0;
          return;
        }
      }
      return origLoad.apply(this, arguments);
    };
  }

  if (mediaProto && origPlay) {
    mediaProto.play = function () {
      if (this.tagName === "VIDEO" && this._xuperM3u8Src && useHlsJs()) {
        this._xuperWantPlay = true;
        if (!this._xuperHls) {
          startHlsPlayback(this, this._xuperM3u8Src);
        }
        try {
          var p = origPlay.apply(this, arguments);
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
        return typeof Promise !== "undefined" ? Promise.resolve() : undefined;
      }
      return origPlay.apply(this, arguments);
    };
  }

  // 4. Normalizar códigos de control remoto de Hisense VIDAA OS
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
      <div class="pill">FFmpeg Modo Fluido: <strong>${hostFfmpeg ? "Activo ✅" : "Modo Normal (HLS) ✅"}</strong></div>
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

  // B. Rutas del relay FFmpeg Modo Fluido (/s/*, /t/*, /abort) y fallback Live fMP4 (/live-s)
  if (pathname.startsWith("/s/") || pathname.startsWith("/t/") || pathname === "/abort") {
    if (typeof relayRequestHandler === "function") {
      relayRequestHandler(req, res);
      return;
    }
    forwardToInternalPort(req, res, relay.port(), null);
    return;
  }

  if (pathname === "/live-s" && hostFfmpeg) {
    const rawSrc = u.searchParams.get("src") || "";
    const pPort = proxy.port();
    const internalSrc = rawSrc.replace(
      /^https?:\/\/[^/]+(?=\/(media|hls|sub)\/)/i,
      `http://127.0.0.1:${pPort}`
    );
    if (!internalSrc) {
      res.writeHead(400, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
      res.end("Missing src");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      Connection: "keep-alive",
    });
    const ff = origSpawn(
      hostFfmpeg,
      [
        "-hide_banner",
        "-loglevel", "error",
        "-fflags", "+genpts+discardcorrupt+nobuffer",
        "-i", internalSrc,
        "-map", "0:v:0",
        "-map", "0:a:0?",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-pix_fmt", "yuv420p",
        "-g", "60",
        "-c:a", "aac",
        "-ac", "2",
        "-ar", "48000",
        "-b:a", "128k",
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "pipe:1",
      ],
      { stdio: ["ignore", "pipe", "ignore"] }
    );
    ff.stdout.pipe(res);
    const killFf = () => {
      try { ff.kill("SIGKILL"); } catch {}
    };
    res.on("close", killFf);
    res.on("error", killFf);
    return;
  }

  // C. Librería local hls.min.js y script de compatibilidad vidaa-shim.js
  if (pathname === "/hls.min.js") {
    const localHls = detectLocalHlsJs();
    if (localHls) {
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(localHls).pipe(res);
      return;
    }
    res.writeHead(302, { Location: "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js" });
    res.end();
    return;
  }

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

    // Inyectar en memoria hls.min.js y vidaa-shim.js antes de webOSTV.js y app.js
    if (relPath === "index.html") {
      fs.readFile(filePath, "utf8", (rerr, html) => {
        if (rerr) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Error reading index.html");
          return;
        }
        const injected = html.replace(
          '<script src="js/webOSTV.js"></script>',
          '<script src="hls.min.js"></script>\n<script src="vidaa-shim.js"></script>\n<script src="js/webOSTV.js"></script>'
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
