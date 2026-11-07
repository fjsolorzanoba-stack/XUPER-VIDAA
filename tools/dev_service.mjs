// Local HTTP harness for the webOS service modules (desktop verification only).
// Mirrors the Luna methods so the web app can be exercised in Chromium / TV browser.
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svcDir = path.resolve(__dirname, "..", "webos", "services", "com.webosflux.xuptertv.fidelity.service");
const magis = require(path.join(svcDir, "magis.js"));
const proxy = require(path.join(svcDir, "proxy.js"));
const dnsx = require(path.join(svcDir, "dnsx.js"));
const netdiag = require(path.join(svcDir, "netdiag.js"));

const PORT = Number(process.argv[2] || 8910);

const json = (res, status, data) => {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json;charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(body);
};

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    });
    res.end();
    return;
  }
  const done = (err, data) => (err ? json(res, 502, { returnValue: false, errorText: String(err.message || err), errorCode: err.portalCode || 1 }) : json(res, 200, { returnValue: true, ...data }));

  if (u.pathname === "/ping") return json(res, 200, { returnValue: true, port: PORT, proxy: proxy.port() });
  if (u.pathname === "/home") return magis.home(u.searchParams.get("root") || "movies", done);
  if (u.pathname === "/search") return magis.search(u.searchParams.get("value") || "", done);
  if (u.pathname === "/detail") {
    return magis.detail(u.searchParams.get("contentId") || u.searchParams.get("id") || "", done);
  }
  if (u.pathname === "/resolve") {
    const contentId = u.searchParams.get("contentId") || u.searchParams.get("id") || "";
    const seriesId = u.searchParams.get("seriesContentId") || u.searchParams.get("series") || "";
    return magis.resolve(contentId, seriesId, (err, stream) => {
      if (err) return done(err);
      proxy.start((perr) => {
        if (perr) return done(perr);
        const isTs = (stream.mime === 'video/mp2t' || /\.ts(?:\?|$)/i.test(stream.url));
        const token = proxy.add(stream.url, stream.headers, stream.duration);
        if (isTs) {
          stream.proxyPath = proxy.baseUrl() + '/media/' + token + '/stream.m3u8';
          stream.mime = 'application/vnd.apple.mpegurl';
          stream.isHls = true;
        } else {
          stream.proxyPath = proxy.baseUrl() + '/media/' + token + '/stream.mp4';
        }
        done(null, stream);
      });
    });
  }
  if (u.pathname === "/liveCategories") {
    return magis.getLiveCategories((err, categories) => done(err, { categories }));
  }
  if (u.pathname === "/liveChannels") {
    return magis.getLiveChannels(u.searchParams.get("columnId") || null, (err, channels) => done(err, { channels }));
  }
  if (u.pathname === "/resolveLive") {
    const streamUrl = u.searchParams.get("streamUrl") || "";
    if (streamUrl) {
      return done(null, { url: streamUrl, proxyPath: streamUrl, isHls: true });
    }
    const channelCode = u.searchParams.get("channelCode") || "";
    return magis.resolveLive(channelCode, (err, stream) => {
      if (err) return done(err);
      proxy.start((perr) => {
        if (perr) return done(perr);
        stream.proxyPath = proxy.baseUrl() + "/media/" + proxy.add(stream.url, stream.headers, 0) + "/stream.m3u8";
        stream.isHls = true;
        done(null, stream);
      });
    });
  }
  if (u.pathname === "/netdiag") {
    const hosts = (magis.constants.HOSTS || []).slice(0);
    dnsx.summary().forEach((entry) => {
      if (entry && entry.host && hosts.indexOf(entry.host) === -1) hosts.push(entry.host);
    });
    const screenW = Number(u.searchParams.get("screenW") || 0);
    const screenH = Number(u.searchParams.get("screenH") || 0);
    const screen = (screenW > 0 && screenH > 0)
      ? {
          w: screenW,
          h: screenH,
          scale: Number(u.searchParams.get("screenScale") || 0),
          panelW: Number(u.searchParams.get("panelW") || 0),
          panelH: Number(u.searchParams.get("panelH") || 0)
        }
      : null;
    // Mirrors the Luna route in index.js so the desktop harness exercises the
    // same layer probes (portal/session/live/VOD) and codec rows.
    const jsonParam = (name) => {
      try { return JSON.parse(u.searchParams.get(name) || "{}") || {}; } catch { return {}; }
    };
    const portalHost = (magis.constants.HOSTS || [])[0] || "";
    const sess = magis.session || {};
    const layerOpts = {
      portalUrl: portalHost ? `https://${portalHost}/api/portalCore/v8/active` : "",
      session: { userId: sess.userId || "", userToken: sess.userToken || "", ready: !!sess.ready },
      liveUrl: u.searchParams.get("liveUrl") || "",
      liveHeaders: jsonParam("liveHeaders"),
      vodUrl: u.searchParams.get("vodUrl") || "",
      vodHeaders: jsonParam("vodHeaders"),
    };
    return netdiag.run({ hosts, screen }, (err, report) => {
      if (err) return done(err);
      netdiag.runLayers(layerOpts, (lerr, layers) => {
        report.layers = layers || {};
        report.codec = {
          h264: u.searchParams.get("codecH264") || "",
          hevc: u.searchParams.get("codecHEVC") || "",
          hls: u.searchParams.get("codecHLS") || "",
        };
        done(null, report);
      });
    });
  }
  json(res, 404, { returnValue: false, errorText: "not found" });
});

proxy.start((err, p) => {
  if (err) { console.error("proxy error", err); process.exit(1); }
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`dev service running on http://127.0.0.1:${PORT} (media proxy on ${p})`);
  });
});
