"use strict";
var https = require("https"),
  http = require("http"),
  dnsx = require("./dnsx");
try {
  (https.globalAgent && (https.globalAgent.maxSockets = 32),
    http.globalAgent && (http.globalAgent.maxSockets = 32));
} catch (e) {}
var TCP_TIMEOUT = 3e3,
  HTTP_TIMEOUT = 4e3,
  MAX_HOSTS = 4,
  HOST_DEADLINE = 9e3,
  PROVIDER_DEADLINE = 4e3,
  GLOBAL_DEADLINE = 14e3,
  LAYER_DEADLINE = 5e3;
function now() {
  return Date.now();
}
function parallel(e, r) {
  var t = e.length,
    n = [];
  if (!t) return r(n);
  e.forEach(function (e, o) {
    var s = !1;
    e(function (e) {
      s || ((s = !0), (n[o] = e), 0 === --t && r(n));
    });
  });
}
function withDeadline(e, r, t) {
  return function (n) {
    var o = !1,
      s = setTimeout(function () {
        o || ((o = !0), n(t()));
      }, r);
    (s && "function" == typeof s.unref && s.unref(),
      e(function (e) {
        o || ((o = !0), clearTimeout(s), n(e));
      }));
  };
}
function tcpCheck(e, r, t) {
  if (!e) return t({ ip: e, port: r, ok: !1, error: "sin direccion" });
  dnsx.probe(e, r, function (n, o) {
    t({ ip: e, port: r, ok: !n, ms: o, error: n ? n.code || n.message : "" });
  });
}
function httpsCheck(e, r, t) {
  var n = !1,
    o = now();
  function s(e) {
    n || ((n = !0), t(e));
  }
  try {
    var i = https.request(
      {
        hostname: r,
        servername: e,
        rejectUnauthorized: !1,
        port: 443,
        path: "/",
        method: "GET",
        headers: {
          "User-Agent": "XuperTV/webOS",
          Host: e,
          Connection: "close",
        },
      },
      function (t) {
        var n = t.statusCode;
        (t.resume(),
          t.on("end", function () {
            s({ host: e, ip: r, ok: n > 0, status: n, ms: now() - o });
          }));
      }
    );
    (i.setTimeout(HTTP_TIMEOUT, function () {
      try {
        i.abort();
      } catch (e) {}
      s({ host: e, ip: r, ok: !1, error: "tiempo agotado", ms: now() - o });
    }),
      i.on("error", function (t) {
        s({
          host: e,
          ip: r,
          ok: !1,
          error: t.code || t.message,
          ms: now() - o,
        });
      }),
      i.end());
  } catch (t) {
    s({
      host: e,
      ip: r,
      ok: !1,
      error: t.message || "error https",
      ms: now() - o,
    });
  }
}
function first(e) {
  return e && e.length ? e[0] : "";
}
function hasCommon(e, r) {
  if (!e || !r) return !1;
  for (var t = 0; t < e.length; t++) if (-1 !== r.indexOf(e[t])) return !0;
  return !1;
}
function checkHost(e, r) {
  var t = {
      host: e,
      system: { ok: !1, ips: [], ms: 0, error: "" },
      doh: { ok: !1, ips: [], ms: 0, error: "" },
      mismatch: !1,
      tcp443: null,
      http: null,
      verdict: "unknown",
    },
    n = 2;
  function o() {
    if (!(--n > 0)) {
      t.mismatch =
        t.system.ok && t.doh.ok && !hasCommon(t.system.ips, t.doh.ips);
      for (
        var o = [], s = {}, i = [t.doh.ips, t.system.ips], u = 0;
        u < i.length;
        u++
      )
        for (var c = i[u] || [], a = 0; a < c.length; a++) {
          var h = c[a];
          h && !s[h] && ((s[h] = !0), o.push(h));
        }
      if (((t.tried = []), !o.length))
        return (
          (t.verdict = t.system.ok || t.doh.ok ? "sin-tcp" : "sin-salida"),
          r(t)
        );
      for (var p = !1, l = o.length, d = 0; d < o.length; d++)
        (function (e) {
          tcpCheck(e, 443, function (n) {
            ((n.ip = e),
              t.tried.push(n),
              l--,
              n.ok
                ? f(e, n)
                : 0 === l &&
                  (p ||
                    ((p = !0),
                    (t.tcp443 = {
                      ip: o[0],
                      port: 443,
                      ok: !1,
                      error:
                        (t.tried[0] && t.tried[0].error) || "sin respuesta",
                      tried: t.tried,
                    }),
                    (t.verdict = "sin-tcp"),
                    r(t))));
          });
        })(o[d]);
    }
    function f(n, o) {
      p ||
        ((p = !0),
        (t.tcp443 = o),
        (t.dialIp = n),
        httpsCheck(e, n, function (e) {
          return (
            (t.http = e),
            e.ok
              ? t.mismatch
                ? ((t.verdict = "dns-distinto"), r(t))
                : t.system.ok
                  ? ((t.verdict = "ok"), void r(t))
                  : ((t.verdict = "dns-local-falla"), r(t))
              : ((t.verdict = "tls-falla"), r(t))
          );
        }));
    }
  }
  var s = now();
  dnsx.systemLookup(e, function (e, r) {
    ((t.system.ms = now() - s),
      e
        ? (t.system.error = e.code || e.message)
        : ((t.system.ok = !0), (t.system.ips = r)),
      o());
  });
  var i = now();
  dnsx.queryDoh(e, function (e, r) {
    ((t.doh.ms = now() - i),
      e ? (t.doh.error = e.message) : ((t.doh.ok = !0), (t.doh.ips = r)),
      o());
  });
}
function checkProvider(e, r) {
  now();
  tcpCheck(e.ip, 443, function (t) {
    if (!t.ok)
      return r({
        ip: e.ip,
        sni: e.sni,
        reachable: !1,
        ms: t.ms,
        error: t.error,
      });
    r({ ip: e.ip, sni: e.sni, reachable: !0, ms: t.ms, queryMs: 0, error: "" });
  });
}
function verdictOf(e, r) {
  var t,
    n = [];
  for (t = 0; t < r.length; t++) r[t] && !r[t].timeout && n.push(r[t]);
  var o = [];
  for (t = 0; t < e.length; t++)
    e[t] && "sin-tiempo" !== e[t].verdict && o.push(e[t]);
  if (!n.length || !o.length) return "incompleto";
  var s = 0,
    i = !1,
    u = !1,
    c = !1,
    a = !1,
    h = 0;
  for (t = 0; t < n.length; t++) n[t].reachable && s++;
  for (var p = 0; p < o.length; p++) {
    var l = o[p];
    (l.doh && l.doh.ok && (i = !0),
      l.mismatch && (u = !0),
      "dns-local-falla" === l.verdict && (c = !0),
      ("sin-tcp" !== l.verdict && "tls-falla" !== l.verdict) ||
        ((a = !0), h++));
  }
  return s
    ? a && h >= o.length
      ? "sin-salida"
      : u
        ? "dns-distinto"
        : c
          ? "dns-local-falla"
          : a
            ? "algun-servidor"
            : i
              ? "ok"
              : "doh-sin-respuesta"
    : "doh-bloqueado";
}
function run(e, r) {
  for (
    var t = ((e = e || {}).hosts || []).filter(function (e) {
        return "string" == typeof e && e;
      }),
      n = e.dnsxHosts || [],
      o = 0;
    o < n.length;
    o++
  )
    -1 === t.indexOf(n[o]) && t.push(n[o]);
  t = t.slice(0, MAX_HOSTS);
  var s = now(),
    i = t.map(function (e) {
      return withDeadline(
        function (r) {
          checkHost(e, r);
        },
        HOST_DEADLINE,
        function () {
          return {
            host: e,
            timeout: !0,
            verdict: "sin-tiempo",
            system: {
              ok: !1,
              ips: [],
              ms: HOST_DEADLINE,
              error: "sin respuesta",
            },
            doh: { ok: !1, ips: [], ms: HOST_DEADLINE, error: "sin respuesta" },
            mismatch: !1,
            tcp443: null,
            http: null,
          };
        }
      );
    }),
    u = dnsx.providers.map(function (e) {
      return withDeadline(
        function (r) {
          checkProvider(e, r);
        },
        PROVIDER_DEADLINE,
        function () {
          return {
            ip: e.ip,
            sni: e.sni,
            reachable: !1,
            timeout: !0,
            ms: PROVIDER_DEADLINE,
            error: "sin respuesta",
          };
        }
      );
    }),
    c = !1,
    a = 2,
    h = [],
    p = [];
  function l(t) {
    c ||
      ((c = !0),
      clearTimeout(d),
      r(null, {
        at: now(),
        tookMs: now() - s,
        mode: dnsx.mode(),
        verdict: verdictOf(p, h),
        providers: h,
        hosts: p,
        cache: dnsx.summary(),
        screen: e.screen || null,
        partial: !!t,
      }));
  }
  var d = setTimeout(function () {
    l(!0);
  }, GLOBAL_DEADLINE);
  function f() {
    --a > 0 || l(!1);
  }
  (d && "function" == typeof d.unref && d.unref(),
    parallel(u, function (e) {
      ((h = e), f());
    }),
    parallel(i, function (e) {
      ((p = e), f());
    }));
}
function layerProbe(e, r, t) {
  if (!e) return t({ ok: !1, error: "sin-url" });
  var n = now(),
    o = !1;
  function s(e) {
    o || ((o = !0), t(e));
  }
  var i = require("url"),
    u = require("./dnsx"),
    c = require("https"),
    a = require("http");
  try {
    var h = i.parse(e),
      p = h.hostname,
      l = "https:" === h.protocol,
      d = function (e, t) {
        var o = (e && e[t]) || p,
          i = l ? 443 : 80,
          u = h.port ? parseInt(h.port, 10) : i,
          f = { "User-Agent": "Ranger/4.9.4-17294ac0", Host: h.host || p };
        for (var m in r || {})
          Object.prototype.hasOwnProperty.call(r, m) && (f[m] = r[m]);
        var v = {
            hostname: o,
            servername: p,
            rejectUnauthorized: !1,
            port: u,
            path: h.path || "/",
            method: "HEAD",
            headers: f,
          },
          k = (l ? c : a).request(v, function (e) {
            (e.resume(),
              e.on("end", function () {
                s({
                  ok: e.statusCode >= 200 && e.statusCode < 500,
                  status: e.statusCode,
                  ms: now() - n,
                });
              }));
          });
        (k.setTimeout(HTTP_TIMEOUT, function () {
          try {
            k.abort();
          } catch (e) {}
          s({ ok: !1, error: "timeout", ms: now() - n });
        }),
          k.on("error", function (r) {
            if (e && t + 1 < e.length) return d(e, t + 1);
            s({ ok: !1, error: r.code || r.message, ms: now() - n });
          }),
          k.end());
      };
    if (!p || u.isIpv4(p)) return d([p], 0);
    var f = u.cached(p);
    if (f && f.ips && f.ips.length) return d(f.ips, 0);
    u.resolve(p, function (e, r) {
      var t = r && r.ips && r.ips.length ? r.ips : [p];
      d(t, 0);
    });
  } catch (e) {
    s({ ok: !1, error: e.message || "excepción", ms: now() - n });
  }
}
function checkSession(e, r) {
  if (!e) return r({ ok: !1, error: "sin-sesion" });
  var t = e.userId && String(e.userId).length > 2,
    n = e.userToken && String(e.userToken).length > 2;
  r({
    ok: !(!t || !n),
    userId: t ? "✓" : "✗",
    token: n ? "✓" : "✗",
    ready: !!e.ready,
    error: t && n ? "" : e.error || "sesion-incompleta",
  });
}
function runLayers(e, r) {
  var t = [],
    n = [];
  function o(e, r) {
    return withDeadline(
      function (t) {
        layerProbe(e, r || {}, t);
      },
      LAYER_DEADLINE,
      function () {
        return {
          ok: !1,
          timeout: !0,
          error: "sin respuesta",
          ms: LAYER_DEADLINE,
        };
      }
    );
  }
  ((e = e || {}).portalUrl && (n.push("portal"), t.push(o(e.portalUrl, null))),
    n.push("session"),
    t.push(function (r) {
      checkSession(e.session, r);
    }),
    e.liveUrl && (n.push("live"), t.push(o(e.liveUrl, e.liveHeaders || {}))),
    e.vodUrl && (n.push("vod"), t.push(o(e.vodUrl, e.vodHeaders || {}))),
    parallel(t, function (e) {
      for (var t = {}, o = 0; o < n.length; o++)
        t[n[o]] = e[o] || { ok: !1, timeout: !0, error: "sin-resultado" };
      r(null, t);
    }));
}
module.exports = {
  run: run,
  runLayers: runLayers,
  checkHost: checkHost,
  checkProvider: checkProvider,
  verdictOf: verdictOf,
};
