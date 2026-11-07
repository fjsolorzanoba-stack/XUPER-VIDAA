"use strict";
var dns = require("dns"),
  https = require("https"),
  net = require("net");
try {
  https.globalAgent && (https.globalAgent.maxSockets = 32);
} catch (e) {}
var CACHE_MS = 6e5,
  SYSTEM_CACHE_MS = 6e4,
  DOH_TIMEOUT = 5e3,
  PROBE_TIMEOUT = 4e3,
  PROVIDERS = [
    { ip: "1.1.1.1", sni: "cloudflare-dns.com", path: "/dns-query" },
    { ip: "1.0.0.1", sni: "cloudflare-dns.com", path: "/dns-query" },
    { ip: "1.1.1.2", sni: "security.cloudflare-dns.com", path: "/dns-query" },
    { ip: "1.0.0.2", sni: "security.cloudflare-dns.com", path: "/dns-query" },
    { ip: "8.8.8.8", sni: "dns.google", path: "/resolve" },
    { ip: "8.8.4.4", sni: "dns.google", path: "/resolve" },
    { ip: "94.140.14.14", sni: "dns.adguard-dns.com", path: "/resolve" },
    { ip: "94.140.15.15", sni: "dns.adguard-dns.com", path: "/resolve" },
    {
      ip: "94.140.14.140",
      sni: "unfiltered.adguard-dns.com",
      path: "/resolve",
    },
    {
      ip: "94.140.14.141",
      sni: "unfiltered.adguard-dns.com",
      path: "/resolve",
    },
    { ip: "223.5.5.5", sni: "dns.alidns.com", path: "/resolve" },
    { ip: "223.6.6.6", sni: "dns.alidns.com", path: "/resolve" },
    { ip: "185.222.222.222", sni: "doh.dns.sb", path: "/dns-query" },
    { ip: "45.11.45.11", sni: "doh.dns.sb", path: "/dns-query" },
    { ip: "45.90.28.0", sni: "dns.nextdns.io", path: "/dns-query" },
    { ip: "45.90.30.0", sni: "dns.nextdns.io", path: "/dns-query" },
  ],
  cache = {},
  dialIndex = {},
  mode = "auto";
function now() {
  return Date.now();
}
function isIpv4(e) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(e || ""));
}
function uniq(e) {
  for (var n = [], r = 0; r < e.length; r++)
    e[r] && -1 === n.indexOf(e[r]) && n.push(e[r]);
  return n;
}
function keep(e, n, r, t) {
  return (
    (cache[e] = { ips: uniq(n), at: now(), ttl: t || CACHE_MS, source: r }),
    cache[e]
  );
}
function cached(e) {
  var n = cache[e];
  return n ? (now() - n.at > n.ttl ? null : n) : null;
}
function dohQuery(e, n, r) {
  var t = n.path + "?name=" + encodeURIComponent(e) + "&type=A",
    o = !1,
    s = now();
  function i(e, n) {
    o || ((o = !0), r(e, n || [], now() - s));
  }
  var a = https.request(
    {
      hostname: n.ip,
      servername: n.sni,
      rejectUnauthorized: !1,
      path: t,
      method: "GET",
      headers: {
        accept: "application/dns-json",
        host: n.sni,
        "User-Agent": "XuperTV/webOS",
      },
    },
    function (e) {
      var r = [];
      (e.on("data", function (e) {
        r.push(e);
      }),
        e.on("end", function () {
          if (200 !== e.statusCode)
            return i(new Error("DoH " + n.ip + ": HTTP " + e.statusCode));
          var t;
          try {
            t = JSON.parse(Buffer.concat(r).toString("utf8"));
          } catch (e) {
            return i(new Error("DoH " + n.ip + ": respuesta no JSON"));
          }
          for (var o = (t && t.Answer) || [], s = [], a = 0; a < o.length; a++)
            o[a] && 1 === o[a].type && isIpv4(o[a].data) && s.push(o[a].data);
          if (!s.length)
            return i(new Error("DoH " + n.ip + ": sin registros A"));
          i(null, s);
        }));
    }
  );
  return (
    a.setTimeout(DOH_TIMEOUT, function () {
      try {
        a.abort();
      } catch (e) {}
    }),
    a.on("timeout", function () {
      i(new Error("DoH " + n.ip + ": tiempo agotado"));
    }),
    a.on("error", function (e) {
      i(e);
    }),
    a.end(),
    a
  );
}
function systemLookup(e, n) {
  var r = !1,
    t = setTimeout(function () {
      o(new Error("DNS del televisor: tiempo agotado"));
    }, 2500);
  function o(e, o) {
    if (!r) {
      r = !0;
      try {
        clearTimeout(t);
      } catch (e) {}
      n(e, o || []);
    }
  }
  try {
    var s = function (e, n) {
      if (e) return o(e);
      var r = [];
      if ("string" == typeof n) isIpv4(n) && r.push(n);
      else if (Array.isArray(n))
        for (var t = 0; t < n.length; t++) {
          var s = n[t],
            i = "string" == typeof s ? s : s && s.address;
          isIpv4(i) && r.push(i);
        }
      if (!r.length) return o(new Error("DNS del televisor: sin respuesta"));
      o(null, r);
    };
    try {
      dns.lookup(e, 4, s);
    } catch (n) {
      dns.lookup(e, s);
    }
  } catch (e) {
    o(e);
  }
}
var DOH_DOWN_MS = 3e5,
  dohDownUntil = 0;
function queryDoh(e, n) {
  if (now() < dohDownUntil)
    return n(new Error("DoH no disponible en esta red"), []);
  var r = PROVIDERS.length,
    t = !1,
    o = [],
    s = [],
    i = null;
  function a(e, r, o) {
    if (!t) {
      ((t = !0), i && (clearTimeout(i), (i = null)));
      for (var a = 0; a < s.length; a++)
        try {
          s[a].abort();
        } catch (e) {}
      if (e) return ((dohDownUntil = now() + DOH_DOWN_MS), n(e, []));
      ((dohDownUntil = 0), n(null, r, o));
    }
  }
  var u,
    c = function (n) {
      var t = dohQuery(e, n, function (e, t) {
        if ((r--, e))
          return (
            o.push(e.message),
            void (0 === r && a(new Error(o.join(" | ")), []))
          );
        a(null, t, n);
      });
      s.push(t);
    };
  for (u = 0; u < 6 && u < PROVIDERS.length; u++) c(PROVIDERS[u]);
  PROVIDERS.length > 6 &&
    (i = setTimeout(function () {
      if (((i = null), !t))
        for (var e = 6; e < PROVIDERS.length; e++) c(PROVIDERS[e]);
    }, 600));
}
function resolve(e, n) {
  if (!(e = String(e || ""))) return n(new Error("host vacio"));
  if (isIpv4(e)) return n(null, { host: e, ips: [e], source: "ip", at: now() });
  var r = cached(e);
  if (r) return n(null, { host: e, ips: r.ips, source: r.source, at: r.at });
  function t(r) {
    if ("doh" === mode) return n(r || new Error("DoH sin respuesta"));
    systemLookup(e, function (t, o) {
      if (t) return n(r || t);
      var s = keep(e, o, "system", SYSTEM_CACHE_MS);
      n(null, { host: e, ips: s.ips, source: s.source, at: s.at });
    });
  }
  if ("system" === mode) return t(null);
  queryDoh(e, function (r, o) {
    if (r || !o.length) return t(r);
    var s = keep(e, o, "doh", CACHE_MS);
    n(null, { host: e, ips: s.ips, source: s.source, at: s.at });
  });
}
function dial(e, n) {
  return n && n.length
    ? 1 === n.length
      ? n[0]
      : ((dialIndex[e] = ((dialIndex[e] || 0) + 1) % n.length), n[dialIndex[e]])
    : "";
}
function prepare(e, n) {
  var r = String((e && (e.hostname || e.host)) || "");
  return r
    ? isIpv4(r)
      ? n(null, e)
      : void resolve(r, function (t, o) {
          if (t) return n(t);
          var s,
            i = {};
          for (s in e)
            Object.prototype.hasOwnProperty.call(e, s) && (i[s] = e[s]);
          ((i.hostname = dial(r, o.ips)),
            void 0 !== i.host && (i.host = i.hostname),
            i.servername || (i.servername = r));
          var a = {};
          for (s in e.headers || {})
            Object.prototype.hasOwnProperty.call(e.headers, s) &&
              (a[s] = e.headers[s]);
          var u = "https:" === String(e.protocol || "") || !0 === e.secure,
            c = String(e.port || (u ? "443" : "80")),
            l = u ? "443" : "80";
          ((a.Host = r + (c !== l ? ":" + c : "")),
            (i.headers = a),
            (i._ip = i.hostname),
            (i._hostname = r),
            n(null, i));
        })
    : n(new Error("sin host para conectar"));
}
function lookup(e, n, r) {
  ("function" == typeof n && ((r = n), (n = {})),
    (n = n || {}),
    resolve(e, function (t, o) {
      if (t) return r(t);
      var s = dial(e, o.ips);
      if (n.all) return r(null, [{ address: s, family: 4 }]);
      r(null, s, 4);
    }));
}
function probe(e, n, r) {
  var t = now(),
    o = !1,
    s = null;
  function i(e) {
    if (!o) {
      if (((o = !0), s))
        try {
          s.destroy();
        } catch (e) {}
      r(e, now() - t);
    }
  }
  try {
    ((s = net.connect({ host: e, port: n })).setTimeout(
      PROBE_TIMEOUT,
      function () {
        i(new Error("tiempo agotado"));
      }
    ),
      s.on("connect", function () {
        i(null);
      }),
      s.on("error", function (e) {
        i(e);
      }));
  } catch (e) {
    i(e);
  }
}
function setMode(e) {
  return (mode = "doh" === e || "system" === e ? e : "auto");
}
function clearCache(e) {
  e ? delete cache[e] : ((cache = {}), (dialIndex = {}));
}
function summary() {
  var e = [];
  for (var n in cache)
    Object.prototype.hasOwnProperty.call(cache, n) &&
      e.push({
        host: n,
        ips: cache[n].ips,
        source: cache[n].source,
        ageMs: now() - cache[n].at,
      });
  return e;
}
module.exports = {
  resolve: resolve,
  prepare: prepare,
  lookup: lookup,
  probe: probe,
  systemLookup: systemLookup,
  queryDoh: queryDoh,
  setMode: setMode,
  mode: function () {
    return mode;
  },
  clearCache: clearCache,
  cached: cached,
  dial: dial,
  summary: summary,
  isIpv4: isIpv4,
  providers: PROVIDERS,
};
