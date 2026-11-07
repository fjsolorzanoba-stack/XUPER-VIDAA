"use strict";
var http = require("http"),
  fs = require("fs"),
  crypto = require("crypto"),
  urlmod = require("url"),
  spawn = require("child_process").spawn,
  dnsx = require("./dnsx"),
  FFMPEG_SRC = __dirname + "/ffmpeg",
  FFMPEG = FFMPEG_SRC,
  FFMPEG_TMP = "/tmp/xuper-ffmpeg",
  HOST = "127.0.0.1",
  PORT = 8787,
  execState = "pending",
  execError = "",
  sessions = {},
  current = null;
function log() {
  var e = Array.prototype.slice.call(arguments);
  try {
    fs.appendFileSync("/tmp/xuper-relay.log", e.join(" ") + "\n");
  } catch (e) {}
  console.log.apply(console, ["[relay]"].concat(e));
}
function setExecState(e, t) {
  ((execState = e),
    log(
      "ffmpeg " +
        e +
        ((execError = t || "") ? ": " + execError : "") +
        " (" +
        FFMPEG +
        ")"
    ));
}
function verifyExecutable(e, t) {
  var r,
    o = !1;
  function n(e, r) {
    o || ((o = !0), t(e, r));
  }
  try {
    r = spawn(e, ["-version"], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return n(!1, e.code || e.message);
  }
  var a = setTimeout(function () {
    try {
      r.kill("SIGKILL");
    } catch (e) {}
    n(!1, "timeout");
  }, 5e3);
  (r.stdout.on("data", function () {}),
    r.on("error", function (e) {
      (clearTimeout(a), n(!1, e.code || e.message));
    }),
    r.on("close", function (e) {
      (clearTimeout(a), n(0 === e, 0 === e ? "" : "exit " + e));
    }));
}
function copyExecutable(e) {
  /* Copia asíncrona (streams): un copyFileSync de 31 MB bloquea el event loop
     del servicio en TVs de 1 GB y hace que la primera reproducción expire. */
  var t = !1;
  function done(r) {
    t || ((t = !0), e(r || ""));
  }
  var r, o;
  try {
    ((r = fs.createReadStream(FFMPEG_SRC)),
      (o = fs.createWriteStream(FFMPEG_TMP)));
  } catch (n) {
    return done(n.message);
  }
  (r.on("error", function (e) {
    try {
      o.destroy();
    } catch (e) {}
    done(e.message);
  }),
    o.on("error", function (e) {
      try {
        r.destroy();
      } catch (e) {}
      done(e.message);
    }),
    o.on("finish", function () {
      try {
        (fs.chmodSync(FFMPEG_TMP, parseInt("755", 8)), done(""));
      } catch (e) {
        done(e.message);
      }
    }),
    r.pipe(o));
}
function useTmpExecutable(e) {
  /* Si ya copiamos ffmpeg a /tmp en un arranque anterior, reutilizarlo evita
     volver a copiar 31 MB en cada inicio del servicio. */
  verifyExecutable(FFMPEG_TMP, function (t) {
    return t
      ? ((FFMPEG = FFMPEG_TMP), setExecState("ok", "tmp"), e(!0, ""))
      : copyExecutable(function (t) {
          if (t) return (setExecState("noexec", t), e(!1, execError));
          verifyExecutable(FFMPEG_TMP, function (t, r) {
            return t
              ? ((FFMPEG = FFMPEG_TMP), setExecState("ok", "tmp"), e(!0, ""))
              : (setExecState("noexec", r || t || "no ejecutable"),
                e(!1, execError));
          });
        });
  });
}
function ensureExecutable(e, t) {
  return (
    (e = e || function () {}),
    "ok" === execState
      ? e(!0, "")
      : t || "pending" === execState
        ? void verifyExecutable(FFMPEG_SRC, function (t) {
            if (t)
              return ((FFMPEG = FFMPEG_SRC), setExecState("ok", ""), e(!0, ""));
            try {
              fs.chmodSync(FFMPEG_SRC, parseInt("755", 8));
            } catch (e) {}
            verifyExecutable(FFMPEG_SRC, function (t) {
              return t
                ? ((FFMPEG = FFMPEG_SRC), setExecState("ok", ""), e(!0, ""))
                : useTmpExecutable(e);
            });
          })
        : e(!1, execError)
  );
}
function stopCurrent() {
  if (current) {
    try {
      current.ff.kill("SIGKILL");
    } catch (e) {}
    current = null;
  }
}
function splitHeaders(e) {
  var t = null,
    r = [];
  return (
    Object.keys(e || {}).forEach(function (o) {
      "user-agent" === o.toLowerCase()
        ? (t = e[o])
        : r.push(o + ": " + e[o] + "\r\n");
    }),
    { ua: t, rest: r.join("") }
  );
}
function register(e, t) {
  t = t || {};
  var r = crypto.randomBytes(8).toString("hex"),
    o = "ts" === t.container ? "ts" : "mp4";
  return (
    (sessions[r] = {
      url: e.url,
      headers: e.headers || {},
      proxyUrl: t.proxyUrl || "",
      audio: t.audio || 0,
      hevc: !!t.hevc,
      container: o,
    }),
    "http://" +
      HOST +
      ":" +
      PORT +
      ("ts" === o ? "/t/" : "/s/") +
      r +
      ("ts" === o ? ".ts" : ".mp4")
  );
}
function audioMap(e, t) {
  return "0:a:" + Math.max(0, Number(e) || 0) + (t ? "?" : "");
}
function buildArgs(e, t, r, o, n) {
  var a = "ts" === n,
    s = !(!(o = o || {}).viaProxy || !e.proxyUrl),
    c = s ? e.proxyUrl : e.url,
    i = s ? { ua: null, rest: "" } : splitHeaders(e.headers),
    u = [
      "-hide_banner",
      "-loglevel",
      "warning",
      "-nostdin",
      "-probesize",
      "1M",
      "-analyzeduration",
      "1M",
    ];
  return (
    /^https?:\/\//i.test(c) &&
      (u.push("-rw_timeout", "15000000"),
      /^https:/i.test(c) && u.push("-tls_verify", "0"),
      i.ua && u.push("-user_agent", i.ua),
      i.rest && u.push("-headers", i.rest)),
    t > 0 && u.push("-ss", String(t)),
    u.push("-i", c, "-map", "0:v:0"),
    o.aac
      ? u.push(
          "-map",
          audioMap(r, !0),
          "-c:v",
          "copy",
          "-af",
          "aresample=async=1",
          "-c:a",
          "aac",
          "-ac",
          "2",
          "-b:a",
          "160k",
          "-ar",
          "48000"
        )
      : (u.push("-map", audioMap(r, !r), "-c", "copy"),
        a || !1 === o.bsf || u.push("-bsf:a", "aac_adtstoasc"),
        a || u.push("-avoid_negative_ts", "make_zero")),
    e.hevc && !a && u.push("-tag:v", "hvc1"),
    a
      ? u.push("-mpegts_flags", "+resend_headers", "-f", "mpegts", "pipe:1")
      : u.push(
          "-movflags",
          "frag_keyframe+empty_moov+default_base_moof",
          "-f",
          "mp4",
          "pipe:1"
        ),
    u
  );
}
function resolveForFfmpeg(e, t) {
  var r = urlmod.parse(e.url || "");
  if (
    !/^https?:$/i.test(r.protocol || "") ||
    !r.hostname ||
    /^\d+\.\d+\.\d+\.\d+$/.test(r.hostname)
  )
    return t(e);
  dnsx.resolve(r.hostname, function (o, n) {
    var a,
      s = (n && n.ips && n.ips[0]) || "";
    if (!o && s) {
      var c = {};
      return (
        Object.keys(e.headers || {}).forEach(function (t) {
          "host" !== t.toLowerCase() && (c[t] = e.headers[t]);
        }),
        (c.Host = r.host),
        (r.hostname = s),
        (r.host = s + (r.port ? ":" + r.port : "")),
        (r.href = null),
        log(
          "CDN resuelto por DoH (" +
            (n && n.source) +
            ") para ffmpeg: " +
            r.hostname +
            " -> " +
            s
        ),
        t({ url: urlmod.format(r), headers: c, audio: e.audio, hevc: e.hevc })
      );
    }
    log(
      "DoH no devolvio IP para " +
        r.hostname +
        " (" +
        (o && o.message) +
        "), probando DNS nativo..."
    );
    try {
      a = spawn("/usr/bin/getent", ["ahostsv4", r.hostname]);
    } catch (r) {
      return t(e);
    }
    var i = "";
    (a.stdout.on("data", function (e) {
      i += String(e);
    }),
      a.on("error", function () {
        t(e);
      }),
      a.on("close", function () {
        var o = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/.exec(i);
        if (!o)
          return (log("DNS nativo no devolvio IPv4; se usa hostname"), t(e));
        var n = {};
        (Object.keys(e.headers || {}).forEach(function (t) {
          "host" !== t.toLowerCase() && (n[t] = e.headers[t]);
        }),
          (n.Host = r.host),
          (r.hostname = o[1]),
          (r.host = o[1] + (r.port ? ":" + r.port : "")),
          (r.href = null),
          log("CDN resuelto por webOS para ffmpeg"),
          t({
            url: urlmod.format(r),
            headers: n,
            audio: e.audio,
            hevc: e.hevc,
          }));
      }));
  });
}
setTimeout(function () {
  ensureExecutable(function () {});
}, 4e3);
var server = http.createServer(function (e, t) {
  var r = urlmod.parse(e.url, !0);
  if ("OPTIONS" === e.method)
    return (
      t.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      }),
      t.end()
    );
  if ("/abort" === r.pathname || "/media/abort" === r.pathname)
    return (
      stopCurrent(),
      t.writeHead(200, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      }),
      t.end("aborted")
    );
  var o = /^\/(s|t)\/([0-9a-f]+)\.(mp4|ts)$/.exec(r.pathname || ""),
    n = o && sessions[o[2]];
  if (!n)
    return (t.writeHead(404, { "Access-Control-Allow-Origin": "*" }), t.end());
  var a = "ts" === n.container ? "ts" : "mp4",
    s = "ts" === a ? "video/mp2t" : "video/mp4";
  if ("HEAD" === e.method)
    return (
      t.writeHead(200, {
        "Content-Type": s,
        "Accept-Ranges": "none",
        "Access-Control-Allow-Origin": "*",
      }),
      t.end()
    );
  var c = Math.max(0, Number(r.query.start) || 0),
    i = Number(null != r.query.a ? r.query.a : n.audio) || 0,
    u = "1" === String(r.query.aac || ""),
    l = [];
  function f(e) {
    (n.proxyUrl &&
      l.push({ audio: e.audio, aac: e.aac, bsf: e.bsf, viaProxy: !0 }),
      l.push({ audio: e.audio, aac: e.aac, bsf: e.bsf, viaProxy: !1 }));
  }
  (u
    ? f({ audio: i, aac: !0, bsf: !1 })
    : (f({ audio: i, aac: !1, bsf: !0 }),
      f({ audio: i, aac: !1, bsf: !1 }),
      f({ audio: 0, aac: !0, bsf: !1 })),
    stopCurrent(),
    (function e(r) {
      var o = l[r];
      ensureExecutable(function (i, u) {
        if (i)
          resolveForFfmpeg(
            o.viaProxy && n.proxyUrl
              ? { url: n.proxyUrl, headers: {}, audio: n.audio, hevc: n.hevc }
              : n,
            function (n) {
              if (!t.finished) {
                var i = spawn(FFMPEG, buildArgs(n, c, o.audio, o, a), {
                  stdio: ["ignore", "pipe", "pipe"],
                });
                current = { ff: i };
                var u = !1,
                  f = !1,
                  p = setTimeout(function () {
                    if (!u && current && current.ff === i) {
                      log(
                        "ffmpeg no emitió en 12 s con el plan " +
                          (r + 1) +
                          "/" +
                          l.length +
                          "; probando el siguiente"
                      );
                      try {
                        i.kill("SIGKILL");
                      } catch (e) {}
                    }
                  }, 12e3);
                (i.on("error", function (e) {
                  (clearTimeout(p),
                    log("no se pudo lanzar ffmpeg:", e.message),
                    u ||
                      (t.writeHead(500, { "Access-Control-Allow-Origin": "*" }),
                      (u = !0)),
                    t.end());
                }),
                  i.stderr.on("data", function (e) {
                    log("ffmpeg:", String(e).trim());
                  }),
                  i.stdout.on("data", function (e) {
                    (u ||
                      (clearTimeout(p),
                      t.writeHead(200, {
                        "Content-Type": s,
                        "Accept-Ranges": "none",
                        "Cache-Control": "no-cache",
                        Connection: "close",
                        "Access-Control-Allow-Origin": "*",
                      }),
                      (u = !0)),
                      t.write(e) ||
                        (i.stdout.pause(),
                        t.once("drain", function () {
                          i.stdout.resume();
                        })));
                  }),
                  i.on("close", function (o) {
                    if (
                      (clearTimeout(p),
                      current && current.ff === i && (current = null),
                      !u && !f && r + 1 < l.length && !t.finished)
                    )
                      return (
                        (f = !0),
                        log(
                          "ffmpeg no emitió con el plan " +
                            (r + 1) +
                            "/" +
                            l.length +
                            " (código " +
                            o +
                            "); reintentando audio=" +
                            l[r + 1].audio +
                            (l[r + 1].aac ? " AAC" : "")
                        ),
                        e(r + 1)
                      );
                    u ||
                      t.finished ||
                      (t.writeHead(502, { "Access-Control-Allow-Origin": "*" }),
                      (u = !0));
                    try {
                      t.end();
                    } catch (e) {}
                    o && log("ffmpeg termino con codigo", o);
                  }),
                  t.on("close", function () {
                    try {
                      i.kill("SIGKILL");
                    } catch (e) {}
                  }));
              }
            }
          );
        else if (
          (log("no se puede ejecutar ffmpeg en esta TV:", u), !t.finished)
        )
          try {
            (t.writeHead(503, {
              "Content-Type": "text/plain",
              "Access-Control-Allow-Origin": "*",
            }),
              t.end("ffmpeg no ejecutable: " + u));
          } catch (e) {}
      });
    })(0));
});
(server.on("error", function (e) {
  log("error del servidor:", e.message);
}),
  server.listen(PORT, HOST, function () {
    log("escuchando en", HOST + ":" + PORT);
  }),
  (module.exports = {
    register: register,
    stop: stopCurrent,
    available: function () {
      if ("ok" === execState) return !0;
      if ("noexec" === execState || "missing" === execState) return !1;
      try {
        if (fs.accessSync)
          return (
            fs.accessSync(
              FFMPEG,
              (fs.constants && fs.constants.X_OK) || fs.X_OK || 1
            ),
            !0
          );
        var e = fs.statSync(FFMPEG);
        return (
          "win32" === process.platform || !!(e && e.mode & parseInt("111", 8))
        );
      } catch (e) {
        return !1;
      }
    },
    state: function () {
      return {
        state: execState,
        error: execError,
        path: FFMPEG,
        tmp: FFMPEG_TMP,
      };
    },
    selfTest: function (e) {
      ensureExecutable(e, !0);
    },
    path: function () {
      return FFMPEG;
    },
    port: function () {
      return PORT;
    },
  }));
