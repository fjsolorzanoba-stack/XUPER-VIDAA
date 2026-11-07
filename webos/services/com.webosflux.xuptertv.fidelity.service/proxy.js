"use strict";
var http = require("http"),
  https = require("https"),
  crypto = require("crypto"),
  urlmod = require("url"),
  tsIndexer = require("./ts-indexer"),
  dnsx = require("./dnsx"),
  upstream = require("./upstream"),
  MAX_TOKENS = 6,
  tokens = {},
  order = [],
  subtitleTokens = {},
  subtitleOrder = [],
  MAX_SUBTITLES = 12,
  server = null,
  port = 0,
  httpAgent = new http.Agent({
    keepAlive: !0,
    maxSockets: 4,
    keepAliveMsecs: 15e3,
  }),
  httpsAgent = new https.Agent({
    keepAlive: !0,
    maxSockets: 4,
    keepAliveMsecs: 15e3,
    rejectUnauthorized: !1,
  }),
  activeToken = null,
  activeUpstreams = [],
  TS_PACKET_BYTES = 188,
  HLS_SEGMENT_SECONDS = 10;
function destroyConnection(e) {
  if (e) {
    if (e.up) {
      try {
        e.up.unpipe();
      } catch (e) {}
      try {
        "function" == typeof e.up.destroy && e.up.destroy();
      } catch (e) {}
      try {
        e.up.socket && e.up.socket.destroy();
      } catch (e) {}
      e.up = null;
    }
    try {
      e.upstream && e.upstream.abort();
    } catch (e) {}
    try {
      e.upstream && e.upstream.socket && e.upstream.socket.destroy();
    } catch (e) {}
    try {
      e.res && !e.res.finished && e.res.destroy();
    } catch (e) {}
    ((e.upstream = null), (e.res = null), (e.req = null));
  }
}
function killActiveStreams() {
  for (; activeUpstreams.length > 0;) {
    destroyConnection(activeUpstreams.shift());
  }
}
function remember(e, t) {
  for (tokens[e] = t, order.push(e); order.length > MAX_TOKENS;) {
    var r = order.shift();
    r && delete tokens[r];
  }
}
function isCacheFlyIp(e) {
  return (
    !!e &&
    (/^66\.225\./.test(e) || /^205\.234\./.test(e) || /^167\.99\./.test(e))
  );
}
function resolveHostIp(e, t) {
  if (!e) return t("");
  if (e.resolvedIp && dnsx.isIpv4(e.resolvedIp)) return t(e.resolvedIp);
  var r = urlmod.parse(e.url || "").hostname;
  if (!r || dnsx.isIpv4(r)) return ((e.resolvedIp = r || ""), t(e.resolvedIp));
  var n = dnsx.cached(r);
  if (n && n.ips && n.ips.length)
    return ((e.resolvedIp = dnsx.dial(r, n.ips)), t(e.resolvedIp));
  dnsx.resolve(r, function (n, o) {
    (!n && o && o.ips && o.ips.length
      ? (e.resolvedIp = dnsx.dial(r, o.ips))
      : (e.resolvedIp = r),
      t(e.resolvedIp));
  });
}
function normalizeBackups(e) {
  var t = [];
  if (!Array.isArray(e)) return t;
  for (var r = 0; r < e.length; r++) {
    var n = e[r];
    n &&
      ("string" == typeof n
        ? t.push({ url: n, headers: null })
        : n.url && t.push({ url: n.url, headers: n.headers || null }));
  }
  return t;
}
function add(e, t, r, n, o) {
  var s = crypto.randomBytes(12).toString("hex"),
    a = {
      url: e,
      backupUrls: normalizeBackups(o),
      backupIndex: 0,
      headers: t || {},
      duration: Number(r) || 0,
      contentLength: 0,
      lengthWaiters: null,
      resolvedIp: n || "",
      at: Date.now(),
    };
  remember(s, a);
  var i = urlmod.parse(e || "");
  if (i.hostname && !dnsx.isIpv4(i.hostname) && !a.resolvedIp) {
    var l = dnsx.cached(i.hostname);
    (l &&
      l.ips &&
      l.ips.length &&
      (a.resolvedIp = dnsx.dial(i.hostname, l.ips)),
      dnsx.resolve(i.hostname, function (e, t) {
        !e &&
          t &&
          t.ips &&
          t.ips.length &&
          (a.resolvedIp = dnsx.dial(i.hostname, t.ips));
      }));
  }
  return s;
}
function addSubtitle(e) {
  var t = crypto.randomBytes(12).toString("hex");
  for (
    subtitleTokens[t] = { url: e, at: Date.now() }, subtitleOrder.push(t);
    subtitleOrder.length > MAX_SUBTITLES;
  ) {
    var r = subtitleOrder.shift();
    r && delete subtitleTokens[r];
  }
  return baseUrl() + "/sub/" + t + ".srt";
}
function sendSubtitle(e, t, r) {
  resolveHostIp(r, function (e) {
    var n = urlmod.parse(r.url || ""),
      o = "https:" === n.protocol,
      s = n.hostname,
      a = e || s,
      i = o ? 443 : 80,
      l = n.port || i,
      u = {
        hostname: a,
        host: a,
        servername: s,
        rejectUnauthorized: !1,
        port: l,
        path: n.path,
        method: "GET",
        headers: {
          "User-Agent": "Ranger/4.9.4-17294ac0",
          Accept: "*/*",
          Host: n.host || s + (l !== i ? ":" + l : ""),
        },
        agent: upstream.agentFor(o, a, l) || (o ? httpsAgent : httpAgent),
      },
      c = !1,
      p = (o ? https : http).request(u, function (e) {
        var r = [];
        (e.on("data", function (e) {
          r.push(e);
        }),
          e.on("end", function () {
            if (!c) {
              var n = Buffer.concat(r),
                o = e.statusCode >= 200 && e.statusCode < 300;
              (t.writeHead(o ? 200 : 502, {
                "Content-Type": "text/plain; charset=utf-8",
                "Content-Length": n.length,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "private, max-age=300",
              }),
                t.end(n));
            }
          }));
      });
    (p.setTimeout(2e4, function () {
      try {
        p.abort();
      } catch (e) {}
    }),
      p.on("error", function () {
        if (!c) {
          c = !0;
          try {
            (t.writeHead(502, {
              "Content-Type": "text/plain",
              "Access-Control-Allow-Origin": "*",
            }),
              t.end("subtitle upstream error"));
          } catch (e) {}
        }
      }),
      p.end());
  });
}
function isCacheFlyHost(e, t) {
  return (
    !!isCacheFlyIp(t) ||
    /swzablvpm|kyalbhxgw|m3x8o50te|qnrgmzpcw|faolmbghu/i.test(String(e || ""))
  );
}
function mediaRequest(e, t, r, n) {
  var o = urlmod.parse(e.url || ""),
    s = o.hostname,
    a = n || e.resolvedIp;
  if (!a && s) {
    var i = dnsx.cached(s);
    i &&
      i.ips &&
      i.ips.length &&
      ((a = dnsx.dial(s, i.ips)), (e.resolvedIp = a));
  }
  a || (a = s);
  var l = "https:" === o.protocol,
    u = !(!e._maskSni || !isCacheFlyHost(s, a));
  u && (l = !0);
  var c,
    p = {};
  for (c in e.headers)
    Object.prototype.hasOwnProperty.call(e.headers, c) && (p[c] = e.headers[c]);
  for (c in r || {})
    Object.prototype.hasOwnProperty.call(r, c) && (p[c] = r[c]);
  var d = l ? 443 : 80,
    h = u && "80" === o.port ? 443 : o.port || d;
  return (
    (p.Host = o.host || s + (h !== d ? ":" + h : "")),
    {
      secure: l,
      options: {
        hostname: a,
        host: a,
        servername: u ? "cachefly.net" : s,
        rejectUnauthorized: !1,
        port: h,
        path: o.path,
        method: t,
        headers: p,
        agent: upstream.agentFor(l, a, h) || (l ? httpsAgent : httpAgent),
      },
    }
  );
}
function sourceLength(e, t) {
  if (e.contentLength > 0) return t(null, e.contentLength);
  e.lengthWaiters
    ? e.lengthWaiters.push(t)
    : ((e.lengthWaiters = [t]),
      resolveHostIp(e, function (t) {
        var r = mediaRequest(e, "GET", { Range: "bytes=0-0" }, t),
          n = (r.secure ? https : http).request(r.options, function (t) {
            var r = /\/(\d+)$/.exec(String(t.headers["content-range"] || "")),
              n = r
                ? parseInt(r[1], 10)
                : parseInt(t.headers["content-length"], 10);
            t.resume();
            var o = e.lengthWaiters || [];
            ((e.lengthWaiters = null), n > 0 && (e.contentLength = n));
            for (var s = 0; s < o.length; s++)
              o[s](n > 0 ? null : new Error("el CDN no informó el tamaño"), n);
          });
        (n.setTimeout(15e3, function () {
          try {
            n.abort();
          } catch (e) {}
        }),
          n.on("error", function (t) {
            var r = e.lengthWaiters || [];
            e.lengthWaiters = null;
            for (var n = 0; n < r.length; n++) r[n](t);
          }),
          n.end());
      }));
}
function readRange(e, t, r, n) {
  resolveHostIp(e, function (o) {
    var s = mediaRequest(e, "GET", { Range: "bytes=" + t + "-" + r }, o),
      a = (s.secure ? https : http).request(s.options, function (e) {
        var t = [];
        (e.on("data", function (e) {
          t.push(e);
        }),
          e.on("end", function () {
            n(
              e.statusCode >= 200 && e.statusCode < 300
                ? null
                : new Error("rango rechazado"),
              Buffer.concat(t)
            );
          }));
      });
    (a.setTimeout(25e3, function () {
      try {
        a.abort();
      } catch (e) {}
    }),
      a.on("error", function (e) {
        n(e);
      }),
      a.end());
  });
}
function sendVirtualHls(e, t, r, n) {
  sourceLength(n, function (o, s) {
    if (o)
      return (
        t.writeHead(502, {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        }),
        void t.end("no se pudo crear el manifiesto HLS")
      );
    n.indexer ||
      ((n.indexer = tsIndexer.create(s, function (e, t, r) {
        readRange(n, e, t, r);
      })),
      n.indexer.start());
    var a = n.indexer;
    if (a.segments.length || a.complete) {
      for (
        var i = [
            "#EXTM3U",
            "#EXT-X-VERSION:4",
            "#EXT-X-PLAYLIST-TYPE:VOD",
            "#EXT-X-TARGETDURATION:" + HLS_SEGMENT_SECONDS,
            "#EXT-X-MEDIA-SEQUENCE:0",
          ],
          l = 0;
        l < a.segments.length;
        l++
      ) {
        var u = a.segments[l];
        (i.push("#EXTINF:" + u.duration.toFixed(3) + ","),
          i.push("#EXT-X-BYTERANGE:" + (u.end - u.start + 1) + "@" + u.start),
          i.push("stream.ts"));
      }
      a.complete && i.push("#EXT-X-ENDLIST");
      var c = i.join("\n") + "\n";
      (t.writeHead(200, {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Content-Length": Buffer.byteLength(c),
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      }),
        t.end(c));
    } else
      a.when(function () {
        sendVirtualHls(e, t, r, n);
      });
  });
}
function base64Url(e) {
  return new Buffer(String(e), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function fromBase64Url(e) {
  for (var t = String(e).replace(/-/g, "+").replace(/_/g, "/"); t.length % 4;)
    t += "=";
  return new Buffer(t, "base64").toString("utf8");
}
function hlsChildUrl(e, t, r) {
  return r && 0 !== r.indexOf("data:")
    ? baseUrl() + "/hls/" + e + "/" + base64Url(urlmod.resolve(t, r))
    : r;
}
function rewriteHlsManifest(e, t, r) {
  for (
    var n = String(e || "")
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/),
      o = 0;
    o < n.length;
    o++
  ) {
    var s = n[o];
    s &&
      ("#" !== s.charAt(0)
        ? (n[o] = hlsChildUrl(t, r, s))
        : -1 !== s.indexOf("URI=") &&
          (n[o] = s.replace(/URI=("|')([^"']+)\1/g, function (e, n, o) {
            return "URI=" + n + hlsChildUrl(t, r, o) + n;
          })));
  }
  return n.join("\n");
}
function forward(e, t, r, n) {
  activeToken !== n && (killActiveStreams(), (activeToken = n));
  var o = {};
  (e.headers.range && (o.Range = e.headers.range),
    e.headers["if-range"] && (o["If-Range"] = e.headers["if-range"]),
    resolveHostIp(r, function (s) {
      if (!t.finished) {
        var a = mediaRequest(r, "HEAD" === e.method ? "HEAD" : "GET", o, s),
          i = a.secure,
          l = a.options;
        if (t.socket)
          try {
            t.socket.setNoDelay(!0);
          } catch (e) {}
        var u = { upstream: null, res: t, req: e, up: null };
        (activeUpstreams.push(u),
          e.on("close", p),
          e.on("aborted", p),
          t.on("close", p),
          t.on("finish", p),
          t.on("error", p));
        var c = (i ? https : http).request(l, function (o) {
          if (((u.up = o), o.socket))
            try {
              o.socket.setNoDelay(!0);
            } catch (e) {}
          if ((c.setTimeout(0), c.socket))
            try {
              c.socket.setTimeout(0);
            } catch (e) {}
          if (
            !r._maskSni &&
            isCacheFlyHost(urlmod.parse(r.url || "").hostname, s) &&
            (403 === o.statusCode || 451 === o.statusCode)
          )
            return (
              o.resume(),
              console.log(
                "[proxy] CDN CacheFly respondió " +
                  o.statusCode +
                  ", reintentando con SNI camuflado..."
              ),
              (r._maskSni = !0),
              (r.resolvedIp = ""),
              p(),
              forward(e, t, r, n)
            );
          var a = (o.headers["content-type"] || "").toLowerCase(),
            i = "video/mp2t";
          -1 !== a.indexOf("mp4")
            ? (i = "video/mp4")
            : (-1 !== a.indexOf("mpegurl") ||
                (r.url && -1 !== r.url.indexOf(".m3u8"))) &&
              (i = "application/vnd.apple.mpegurl");
          var l = "application/vnd.apple.mpegurl" === i,
            d = {
              "Content-Type": i,
              "Accept-Ranges": o.headers["accept-ranges"] || "bytes",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": l
                ? "no-cache, no-store"
                : "private, max-age=120",
              Connection: "keep-alive",
            };
          if (
            (o.headers["content-length"] &&
              (d["Content-Length"] = o.headers["content-length"]),
            o.headers["content-range"] &&
              (d["Content-Range"] = o.headers["content-range"]),
            "HEAD" === e.method)
          )
            return (
              t.writeHead(o.statusCode || 200, d),
              t.end(),
              void o.resume()
            );
          if (l) {
            var h = [];
            return (
              o.on("data", function (e) {
                h.push(e);
              }),
              o.on("error", function () {
                p();
              }),
              void o.on("end", function () {
                var e = rewriteHlsManifest(
                  Buffer.concat(h).toString("utf8"),
                  n,
                  r.url
                );
                (delete d["Content-Length"],
                  delete d["Content-Range"],
                  (d["Content-Length"] = Buffer.byteLength(e)));
                try {
                  (t.writeHead(o.statusCode || 200, d), t.end(e));
                } catch (e) {
                  p();
                }
              })
            );
          }
          (t.writeHead(o.statusCode || 200, d),
            o.on("error", function () {
              p();
            }),
            o.pipe(t));
        });
        if (((u.upstream = c), c.socket))
          try {
            c.socket.setNoDelay(!0);
          } catch (e) {}
        (c.setTimeout(25e3, function () {
          if (!t.headersSent) {
            try {
              c.abort();
            } catch (e) {}
            try {
              (t.writeHead(504, {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*",
              }),
                t.end("gateway timeout"));
            } catch (e) {}
          }
          p();
        }),
          c.on("error", function (o) {
            if (r && r.url) {
              var s = urlmod.parse(r.url).hostname,
                a = dnsx.cached(s);
              a &&
                a.ips &&
                a.ips.length > 1 &&
                (r.resolvedIp = dnsx.dial(s, a.ips));
            }
            if (
              !t.headersSent &&
              r &&
              !r._maskSni &&
              isCacheFlyHost(urlmod.parse(r.url || "").hostname, r.resolvedIp)
            )
              return (
                console.log(
                  "[proxy] upstream CacheFly falló (" +
                    (o && (o.code || o.message)) +
                    "), reintentando con SNI camuflado cachefly.net..."
                ),
                (r._maskSni = !0),
                (r.resolvedIp = ""),
                p(),
                forward(e, t, r, n)
              );
            if (
              !t.headersSent &&
              r &&
              !r._retriedProtocol &&
              /^https?:\/\//i.test(r.url || "")
            )
              return (
                (r._retriedProtocol = !0),
                /^https:\/\//i.test(r.url)
                  ? (console.log(
                      "[proxy] upstream HTTPS falló (" +
                        (o && (o.code || o.message)) +
                        "), reintentando con HTTP compatible..."
                    ),
                    (r.url = r.url.replace(/^https:\/\//i, "http://")),
                    (r.resolvedIp = ""),
                    p(),
                    forward(e, t, r, n))
                  : (console.log(
                      "[proxy] upstream HTTP falló (" +
                        (o && (o.code || o.message)) +
                        "), reintentando con HTTPS por posible bloqueo DPI..."
                    ),
                    (r.url = r.url.replace(/^http:\/\//i, "https://")),
                    (r.resolvedIp = ""),
                    p(),
                    forward(e, t, r, n))
              );
            if (
              !t.headersSent &&
              r &&
              r.backupUrls &&
              r.backupIndex < r.backupUrls.length
            ) {
              var i = r.backupUrls[r.backupIndex++],
                l = i && "string" == typeof i ? i : i && i.url;
              if (l)
                return (
                  console.log(
                    "[proxy] upstream falló (" +
                      (o && (o.code || o.message)) +
                      "), reintentando con CDN alternativa: " +
                      l
                  ),
                  (r.url = l),
                  i && i.headers && (r.headers = i.headers),
                  (r.resolvedIp = ""),
                  (r._retriedProtocol = !1),
                  (r._maskSni = !1),
                  p(),
                  forward(e, t, r, n)
                );
            }
            if (t.headersSent)
              try {
                t.destroy();
              } catch (e) {}
            else
              try {
                (t.writeHead(502, {
                  "Content-Type": "text/plain",
                  "Access-Control-Allow-Origin": "*",
                }),
                  t.end("upstream error"));
              } catch (e) {}
            p();
          }),
          c.end());
      }
      function p() {
        var e;
        if (
          (-1 !== (e = activeUpstreams.indexOf(u)) &&
            activeUpstreams.splice(e, 1),
          u.up)
        ) {
          try {
            u.up.unpipe();
          } catch (e) {}
          try {
            "function" == typeof u.up.destroy && u.up.destroy();
          } catch (e) {}
          try {
            u.up.socket && u.up.socket.destroy();
          } catch (e) {}
          u.up = null;
        }
        try {
          u.upstream && u.upstream.abort();
        } catch (e) {}
        try {
          u.upstream && u.upstream.socket && u.upstream.socket.destroy();
        } catch (e) {}
        ((u.upstream = null), (u.res = null), (u.req = null));
      }
    }));
}
function handler(e, t) {
  try {
    e.setTimeout(0);
  } catch (e) {}
  try {
    t.setTimeout(0);
  } catch (e) {}
  if ("OPTIONS" === e.method)
    return (
      t.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
      }),
      void t.end()
    );
  if ("/media/abort" === e.url)
    return (
      killActiveStreams(),
      (activeToken = null),
      t.writeHead(200, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      }),
      void t.end("aborted")
    );
  var r = /^\/sub\/([a-f0-9]{24})\.srt$/.exec(e.url || "");
  if (r) {
    var n = subtitleTokens[r[1]];
    return n
      ? void sendSubtitle(e, t, n)
      : (t.writeHead(410, {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        }),
        void t.end("expired"));
  }
  var o = /^\/hls\/([a-f0-9]{24})\/([A-Za-z0-9_-]+)$/.exec(
    (e.url || "").split("?")[0]
  );
  if (o) {
    var s = tokens[o[1]];
    if (!s)
      return (
        t.writeHead(410, {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        }),
        void t.end("expired")
      );
    var a = fromBase64Url(o[2]);
    return /^https?:\/\//i.test(a)
      ? void forward(
          e,
          t,
          {
            url: a,
            headers: s.headers,
            duration: 0,
            backupUrls: s.backupUrls,
            backupIndex: s.backupIndex,
          },
          o[1]
        )
      : (t.writeHead(400, {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        }),
        void t.end("invalid hls child"));
  }
  var i = /^\/media\/([a-f0-9]{24})(?:\/([^\?#]*))?(?:[?#].*)?$/.exec(
    e.url || ""
  );
  if (!i)
    return (
      t.writeHead(404, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      }),
      void t.end("not found")
    );
  var l = i[1],
    u = i[2] || "",
    c = tokens[l];
  if (!c)
    return (
      t.writeHead(410, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      }),
      void t.end("expired")
    );
  -1 !== c.url.indexOf(".m3u8") || -1 === u.indexOf(".m3u8")
    ? forward(e, t, c, l)
    : sendVirtualHls(e, t, l, c);
}
function start(e) {
  if (server && port) return e(null, port);
  (((server = http.createServer(handler)).timeout = 0),
    "function" == typeof server.setTimeout && server.setTimeout(0),
    server.on("error", function (t) {
      e(t);
    }),
    server.listen(0, "127.0.0.1", function () {
      ((port = server.address().port), e(null, port));
    }));
}
function baseUrl() {
  return port ? "http://127.0.0.1:" + port : "";
}
module.exports = {
  start: start,
  add: add,
  addSubtitle: addSubtitle,
  baseUrl: baseUrl,
  port: function () {
    return port;
  },
  killActiveStreams: killActiveStreams,
};
