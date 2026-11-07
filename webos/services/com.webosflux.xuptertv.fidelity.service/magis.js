"use strict";
var crypto = require("crypto"),
  https = require("https"),
  http = require("http"),
  fs = require("fs"),
  url = require("url"),
  path = require("path"),
  dnsx = require("./dnsx"),
  upstream = require("./upstream"),
  KEY_HEX = "e7af1ed7de1ffddd7bd3fe37ebdffde9ef3fe1ae39edfeb8",
  HOSTS = [
    "ftmrmy.jdfey0cd.com",
    "fuxok.nguvmqhpk.com",
    "eajmnp.hcgv1dt8.com",
    "mptec.dhkrxuzcy.com",
    "hinumz.a878kkoyc.com",
    "krdwvd.swcaw7qx.com",
    "osuhk.m3x8o50te.com",
    "oogoy.f30c96w8.com",
  ],
  PORTAL_CODE = "masnew",
  APP_ID = "com.android.msandroid",
  APK_VERSION = "49902",
  SPKG_VER = "2024-09-10 06:25:30_33_13_",
  APK_VER_HEADER = "43404",
  USER_AGENT = "okhttp/3.12.12",
  CONTENT_TYPE = "application/json;charset=utf-8",
  SNTOKEN_SALT = "ntFT65w6itH!lHCPw7D=@qnsFC5adD28",
  FIXED_MAC = "02:00:00:00:00:00",
  FIXED_RESERVE1 = "583442714b345572434a4d5769637461545a735936413d3d",
  FIXED_DRM_ID = "0iSGEyv2EqiS/nqI/I3hqdu12irw5Q3/uqrWvRFx9bM=",
  UA_CDN = "Ranger/4.9.4-17294ac0",
  RATE_MS = 450,
  TREE_TTL = 6e5,
  SEARCH_TTL = 18e4,
  SLB_TTL = 3e5,
  SEED_URL =
    "https://raw.githubusercontent.com/xuper-plugin/kino-plugin-xuper/seeds/seeds.json",
  SEED_FILE = "/tmp/xuper-seeds.json",
  SEED_DEAD_FILE = "/tmp/xuper-seeds-dead.json",
  SEED_MAX = 200,
  SEED_MIN_LIFE_MS = 3e5,
  SEED_RESCUE_ROUNDS = 3,
  SEED_POOL_FRESH_MS = 6e5,
  SEED_REFRESH_COOLDOWN_MS = 1e4,
  SEED_FAILED_COOLDOWN_MS = 3e4,
  DEAD_SEED_MS = 216e5,
  GEO_BLOCKED = "portal100024",
  SESSION_DEAD = {
    aaa100027: 1,
    aaa100028: 1,
    aaa100080: 1,
    aaa100082: 1,
    aaa100083: 1,
  },
  SESSION_MAX_AGE_MS = 216e5,
  ROOT_CODES = {
    featured: "masnew_featured",
    movies: "masnew_movies",
    series: "masnew_series",
    anime: "masnew_anime",
    kids: "masnew_kids",
    free: "masnew_free",
  },
  ROOT_CATEGORY = {
    featured: "destacado",
    movies: "pelicula",
    series: "serie",
    anime: "anime",
    kids: "infantil",
    free: "gratis",
  },
  DEVICE_FIXED = {
    loginType: "2",
    appLanguage: "en",
    hardwareInfo: "ranchu",
    model: "sdk_gphone64_arm64",
    product: "sdk_gphone64_arm64",
    cpu: "arm64-v8a",
    B29: "",
    reserve1: FIXED_RESERVE1,
    deviceToken: "",
    drmId: FIXED_DRM_ID,
    sdkVer: 33,
  },
  FINGERPRINT_FIXED = {
    board: "goldfish_arm64",
    brand: "google",
    cpuAbi: "arm64-v8a",
    device: "emu64a",
    diskInfo: "8GB",
    display: "sdk_gphone64_arm64",
    fingerprint:
      "google/sdk_gphone64_arm64/emu64a:14/UE1A.230829.036/11228894:user/release-keys",
    hardware: "ranchu",
    host: "abfarm",
    manufacturer: "Google",
    ramSize: "4GB",
    romSize: "8GB",
    tags: "release-keys",
    verId: "",
  };
function bufFrom(e, r) {
  return Buffer.from ? Buffer.from(e, r) : new Buffer(e, r);
}
function bufAlloc(e) {
  if (Buffer.alloc) return Buffer.alloc(e);
  var r = new Buffer(e);
  return (r.fill(0), r);
}
var EMPTY_IV = bufFrom("", "binary");
function encryptBody(e) {
  var r = crypto.createCipheriv("des-ede3", bufFrom(KEY_HEX, "hex"), EMPTY_IV),
    t = Buffer.concat([r.update(bufFrom(e, "utf8")), r.final()]);
  return bufFrom(t.toString("base64"), "ascii").toString("hex");
}
function decryptBlob(e) {
  var r = bufFrom(e, "hex").toString("ascii"),
    t = crypto.createDecipheriv("des-ede3", bufFrom(KEY_HEX, "hex"), EMPTY_IV);
  return Buffer.concat([t.update(bufFrom(r, "base64")), t.final()]).toString(
    "utf8"
  );
}
function randomHex(e) {
  return crypto.randomBytes(e).toString("hex");
}
function text(e) {
  return null == e ? "" : String(e);
}
function trim(e) {
  return text(e).replace(/^\s+|\s+$/g, "");
}
function imageOf(e, r) {
  var t = e && e.posterList;
  if (t && t.length)
    for (var n = 0; n < t.length; n++)
      if (t[n] && t[n].fileType === r && "" !== trim(t[n].fileUrl))
        return trim(t[n].fileUrl);
  return "icon" === r
    ? trim(
        e.iconUrl ||
          e.icon ||
          e.coverUrl ||
          e.cover ||
          e.posterUrl ||
          e.poster ||
          e.imageUrl ||
          e.image ||
          ""
      )
    : "poster" === r
      ? trim(
          e.posterUrl ||
            e.poster ||
            e.coverUrl ||
            e.cover ||
            e.iconUrl ||
            e.icon ||
            e.imageUrl ||
            e.image ||
            ""
        )
      : "stage" === r
        ? trim(
            e.backdropUrl ||
              e.backdrop ||
              e.landscapeUrl ||
              e.landscape ||
              e.wideImage ||
              e.bannerImage ||
              ""
          )
        : "";
}
function genresOf(e) {
  var r = text(e && e.tags);
  if (!r) return [];
  for (var t = r.split(","), n = [], s = 0; s < t.length; s++) {
    var a = trim(t[s]);
    a && n.push(a);
  }
  return n;
}
var session = {
  sn: "",
  userId: "",
  userToken: "",
  snToken: "",
  ready: !1,
  busy: !1,
  seed: null,
  usesSeed: !1,
  at: 0,
};
function resetSessionAfterLiveFailure() {
  ((session.ready = !1),
    (session.userId = ""),
    (session.userToken = ""),
    (session.snToken = ""),
    (session.seed = null),
    (session.usesSeed = !1),
    (session.at = 0),
    (liveResolveCache = {}));
}
var queue = [],
  lastCallAt = 0,
  queueToken = 0,
  QUEUE_WATCHDOG_MS = 12e3;
function enqueue(e) {
  (queue.push(e), drain());
}
function releaseQueue(e) {
  e === queueToken && ((session.busy = !1), drain());
}
function drain() {
  if (!session.busy && queue.length) {
    var e = lastCallAt + RATE_MS - Date.now();
    if (e > 0)
      return (
        (queueToken += 1),
        (session.busy = !0),
        void setTimeout(function () {
          ((session.busy = !1), drain());
        }, e)
      );
    var r = queue.shift(),
      t = ++queueToken;
    ((session.busy = !0),
      (lastCallAt = Date.now()),
      /* Watchdog: si una petición al portal no llama nunca de vuelta (red
         filtrada, socket colgado), la cola quedaría bloqueada y toda la app
         respondería "sin respuesta". Se libera y se sigue con la siguiente. */
      setTimeout(function () {
        t === queueToken &&
          session.busy &&
          ((queueToken += 1),
          (session.busy = !1),
          console.log(
            "[magis] cola liberada por watchdog: una petición no respondió"
          ),
          drain());
      }, QUEUE_WATCHDOG_MS),
      r(function () {
        releaseQueue(t);
      }));
  }
}
function deviceDict() {
  var e = {};
  for (var r in DEVICE_FIXED)
    Object.prototype.hasOwnProperty.call(DEVICE_FIXED, r) &&
      (e[r] = DEVICE_FIXED[r]);
  return (
    (e.apkVersion = APK_VERSION),
    (e.sysVersion = SPKG_VER),
    (e.appId = APP_ID),
    (e.sn = session.sn),
    e
  );
}
var preferredHost = "",
  HOST_TIMEOUT = 6e3,
  HOST_HEDGE = 1500,
  HTTP_FALLBACK_DELAY = 1200;
function hostOrder() {
  var e = [];
  preferredHost && e.push(preferredHost);
  for (var r = 0; r < HOSTS.length; r++)
    HOSTS[r] !== preferredHost && e.push(HOSTS[r]);
  return e;
}
function post(e, r, t) {
  var n;
  try {
    n = encryptBody(JSON.stringify(r));
  } catch (r) {
    return t(new Error(e + ": error cifrando cuerpo: " + r.message));
  }
  var s = hostOrder(),
    a = 0,
    o = 0,
    i = !1,
    l = null,
    u = null,
    d = [];
  function c(e, r) {
    if (!i) {
      ((i = !0), u && (clearTimeout(u), (u = null)));
      for (var n = 0; n < d.length; n++)
        try {
          d[n].abort();
        } catch (e) {}
      t(e, r);
    }
  }
  function f() {
    i ||
      a < s.length ||
      (o <= 0 && c(l || new Error(e + ": el portal no respondió")));
  }
  function m(r, t, s) {
    var a = "http" === t,
      u = {
        hostname: r,
        servername: r,
        rejectUnauthorized: !1,
        protocol: a ? "http:" : "https:",
        port: a ? 80 : 443,
        agent: upstream.agentFor(!a, r, a ? 80 : 443),
        path: "/api/portalCore/" + e,
        method: "POST",
        headers: {
          apk: APP_ID,
          apkVer: APK_VER_HEADER,
          spkgVer: SPKG_VER,
          "User-Agent": USER_AGENT,
          "Content-Type": CONTENT_TYPE,
          "Content-Length": Buffer.byteLength(n),
        },
      };
    dnsx.prepare(u, function (t, u) {
      if (!i) {
        if (t) return ((l = t), o--, void f());
        var m = !1,
          p = !1,
          v = null;
        try {
          v = (a ? http : https).request(u, function (t) {
            p = !0;
            var n = [];
            (t.on("data", function (e) {
              n.push(e);
            }),
              t.on("error", function (e) {
                h(e);
              }),
              t.on("end", function () {
                if (!m && !i) {
                  m = !0;
                  var s,
                    o = Buffer.concat(n).toString("utf8");
                  try {
                    s = JSON.parse(o);
                  } catch (n) {
                    return g(
                      new Error(
                        e +
                          ": respuesta no JSON (" +
                          t.statusCode +
                          ") en " +
                          r
                      )
                    );
                  }
                  ((preferredHost = r),
                    a &&
                      console.log(
                        "[magis] portal respondió por HTTP plano en " +
                          r +
                          " (TLS/SNI filtrado por el operador)"
                      ));
                  var l = HOSTS.indexOf(r);
                  l > 0 && (HOSTS.splice(l, 1), HOSTS.unshift(r));
                  var u =
                    void 0 === s.returnCode || null === s.returnCode
                      ? ""
                      : String(s.returnCode);
                  if ("" !== u && "0" !== u) {
                    var d = new Error(
                      e + " -> " + u + " " + text(s.errorMessage)
                    );
                    return ((d.portalCode = u), c(d));
                  }
                  if ("string" == typeof s.data && "" !== s.data) {
                    var f, p;
                    try {
                      f = decryptBlob(s.data);
                    } catch (r) {
                      return g(
                        new Error(
                          e +
                            ": no se pudo descifrar la respuesta (" +
                            r.message +
                            ")"
                        )
                      );
                    }
                    try {
                      p = JSON.parse(f);
                    } catch (r) {
                      return g(new Error(e + ": respuesta descifrada no JSON"));
                    }
                    return c(null, p);
                  }
                  c(null, void 0 !== s.data && null !== s.data ? s.data : s);
                }
              }));
          });
        } catch (e) {
          return h(e);
        }
        (d.push(v),
          v.setTimeout(HOST_TIMEOUT, function () {
            h(new Error(e + ": timeout en " + r));
          }),
          v.on("timeout", function () {
            h(new Error(e + ": timeout en " + r));
          }),
          v.on("error", function (e) {
            h(e);
          }),
          v.on("close", function () {
            p || h(new Error(e + ": conexion cerrada en " + r));
          }),
          v.write(n),
          v.end());
      }
      function h(e) {
        if (!m && !i) {
          ((m = !0), (l = e));
          try {
            v && v.abort();
          } catch (e) {}
          if ((preferredHost === r && (preferredHost = ""), !a && s))
            try {
              s();
            } catch (e) {}
          (o--, f());
        }
      }
      function g(e) {
        if (((l = e), preferredHost === r && (preferredHost = ""), !a && s))
          try {
            s();
          } catch (e) {}
        (o--, f());
      }
    });
  }
  function p() {
    if (!(i || a >= s.length)) {
      var e = s[a++],
        r = !1,
        t = null;
      ((o += 2), (t = setTimeout(n, HTTP_FALLBACK_DELAY)), m(e, "https", n));
    }
    function n() {
      r || i || ((r = !0), t && (clearTimeout(t), (t = null)), m(e, "http"));
    }
  }
  (p(),
    (function e() {
      i ||
        a >= s.length ||
        (u = setTimeout(function () {
          ((u = null), i || (p(), e()));
        }, HOST_HEDGE));
    })());
}
function call(e, r, t, n) {
  ("function" == typeof t && ((n = t), (t = {})),
    (t = t || {}),
    enqueue(function (s) {
      var a,
        o = {};
      !1 !== t.baseFields &&
        ((o.portalCode = PORTAL_CODE),
        (o.userId = session.userId),
        (o.userToken = session.userToken));
      var i = deviceDict();
      for (a in i) Object.prototype.hasOwnProperty.call(i, a) && (o[a] = i[a]);
      for (a in r) Object.prototype.hasOwnProperty.call(r, a) && (o[a] = r[a]);
      post(e, o, function (a, o) {
        s();
        var i = a && a.portalCode,
          l = i && SESSION_DEAD[i],
          u =
            a &&
            /未登录|sesi[oó]n|login|token.*expir|invalid.*sn/i.test(
              a.message || ""
            );
        if (
          a &&
          ("aaa100028" === i || "aaa100027" === i || l || u) &&
          !t._sessionRetried &&
          !session.usesSeed
        )
          return (
            console.log(
              "[magis] sesión no iniciada (" +
                (i || a.message) +
                "). Renovando sesión limpia..."
            ),
            (session.ready = !1),
            (session.userId = ""),
            (session.userToken = ""),
            (session.snToken = ""),
            (session.at = 0),
            ensureSession(function (s) {
              if (s) return n(a);
              ((t._sessionRetried = !0), call(e, r, t, n));
            })
          );
        if (
          a &&
          (i === GEO_BLOCKED || l || u) &&
          (t._seedTries || 0) < SEED_RESCUE_ROUNDS
        ) {
          SESSION_DEAD[i] &&
            session.usesSeed &&
            session.seed &&
            markSeedDead(session.seed);
          var d = t._seedTried || {};
          return (
            session.usesSeed &&
              session.seed &&
              (d[seedIdentity(session.seed)] = !0),
            rescueSeed(d, function (s, o) {
              if (!o) return n(a);
              ((t._seedTried = d),
                (t._seedTries = (t._seedTries || 0) + 1),
                (t._sessionRetried = !1),
                console.log(
                  "[magis] " +
                    (i || "sesión caída") +
                    ": probando otra semilla (" +
                    t._seedTries +
                    "/" +
                    SEED_RESCUE_ROUNDS +
                    ")"
                ),
                call(e, r, t, n));
            })
          );
        }
        n(a, o);
      });
    }));
}
var seedPool = [],
  seedsAt = 0,
  seedInflight = !1,
  seedWaiters = [],
  lastSeedFailure = 0,
  deadSeeds = {};
function writeJsonSafe(e, r) {
  try {
    fs.writeFileSync(e, JSON.stringify(r));
  } catch (e) {}
}
function seedIdentity(e) {
  var r = trim(e && e.userToken);
  return trim(e && e.sn) + "|" + r.slice(-6);
}
function seedIsDead(e) {
  var r = deadSeeds[seedIdentity(e)];
  return "number" == typeof r && Date.now() - r < DEAD_SEED_MS;
}
function markSeedDead(e) {
  var r = seedIdentity(e);
  if (r && "|" !== r) {
    deadSeeds[r] = Date.now();
    var t,
      n = [];
    for (t in deadSeeds)
      Object.prototype.hasOwnProperty.call(deadSeeds, t) && n.push(t);
    n.sort(function (e, r) {
      return deadSeeds[r] - deadSeeds[e];
    });
    for (var s = {}, a = 0; a < n.length && a < SEED_MAX; a++)
      s[n[a]] = deadSeeds[n[a]];
    (writeJsonSafe(SEED_DEAD_FILE, (deadSeeds = s)),
      console.log("[magis] semilla marcada como muerta: " + r.slice(0, 16)));
  }
}
function seedIsUsable(e) {
  return (
    !!(e && trim(e.userId) && trim(e.userToken)) &&
    !(
      "number" == typeof e.exp &&
      e.exp > 0 &&
      1e3 * e.exp - Date.now() < SEED_MIN_LIFE_MS
    ) &&
    !seedIsDead(e)
  );
}
function usableSeeds() {
  for (var e = [], r = 0; r < seedPool.length; r++)
    seedIsUsable(seedPool[r]) && e.push(seedPool[r]);
  return e;
}
function storeSeeds(e) {
  for (var r = Date.now(), t = [], n = [], s = 0; s < e.length; s++) {
    var a = e[s];
    if (a && trim(a.userId) && trim(a.userToken)) {
      var o = "number" == typeof a.exp && a.exp > 0 ? a.exp : 0,
        i = {
          userId: trim(a.userId),
          userToken: trim(a.userToken),
          sn: trim(a.sn).toLowerCase(),
        };
      (o && (i.exp = o),
        o && 1e3 * o - r < SEED_MIN_LIFE_MS ? n.push(i) : t.push(i));
    }
  }
  for (
    var l = t.length >= SEED_MAX ? t : t.concat(n), u = l.length - 1;
    u > 0;
    u--
  ) {
    var d = Math.floor(Math.random() * (u + 1)),
      c = l[u];
    ((l[u] = l[d]), (l[d] = c));
  }
  ((seedPool = l.slice(0, SEED_MAX)),
    writeJsonSafe(SEED_FILE, { at: (seedsAt = r), seeds: seedPool }));
}
function refreshSeeds(e) {
  if (((e = e || function () {}), seedInflight)) seedWaiters.push(e);
  else {
    var r = Date.now();
    if (seedPool.length && seedsAt && r - seedsAt < SEED_REFRESH_COOLDOWN_MS)
      return e(null, !1);
    if (lastSeedFailure && r - lastSeedFailure < SEED_FAILED_COOLDOWN_MS)
      return e(null, !1);
    seedInflight = !0;
    var t = url.parse(SEED_URL);
    ((t.method = "GET"),
      (t.rejectUnauthorized = !1),
      (t.headers = { "User-Agent": "XuperTV/webOS" }),
      dnsx.prepare(t, function (e, r) {
        if (e) return n(e);
        var t;
        r.rejectUnauthorized = !1;
        try {
          t = https.request(r, function (e) {
            if (200 !== e.statusCode)
              return (
                e.resume(),
                n(new Error("semillas HTTP " + e.statusCode))
              );
            var r = [];
            (e.on("data", function (e) {
              r.push(e);
            }),
              e.on("error", function (e) {
                n(e);
              }),
              e.on("end", function () {
                var e;
                try {
                  e = JSON.parse(Buffer.concat(r).toString("utf8"));
                } catch (e) {
                  return n(e);
                }
                var t = e && e.seeds ? e.seeds : e;
                if (!t || !t.length)
                  return n(new Error("lista de semillas vacía"));
                (storeSeeds(t),
                  console.log(
                    "[magis] semillas actualizadas: " + seedPool.length
                  ),
                  n(null));
              }));
          });
        } catch (e) {
          return n(e);
        }
        (t.on("error", function (e) {
          n(e);
        }),
          t.setTimeout(6e3, function () {
            (t.abort(), n(new Error("timeout de semillas")));
          }),
          t.end());
      }));
  }
  function n(r) {
    ((seedInflight = !1), (lastSeedFailure = r ? Date.now() : 0));
    var t = seedWaiters.slice();
    ((seedWaiters = []), e(r || null, !r));
    for (var n = 0; n < t.length; n++)
      try {
        t[n](r || null, !r);
      } catch (e) {}
  }
}
function pickSeed(e) {
  var r = usableSeeds();
  if (!r.length) return null;
  for (var t = r.length - 1; t > 0; t--) {
    var n = Math.floor(Math.random() * (t + 1)),
      s = r[t];
    ((r[t] = r[n]), (r[n] = s));
  }
  for (var a = 0; a < r.length; a++) if (!e[seedIdentity(r[a])]) return r[a];
  return null;
}
function adoptSeed(e) {
  ((e = e || {}),
    (session.userId = trim(e.userId)),
    (session.userToken = trim(e.userToken)),
    (session.sn = trim(e.sn).toLowerCase()),
    (session.snToken = ""),
    (session.ready = !0),
    (session.seed = e),
    (session.usesSeed = !0),
    (session.at = Date.now()));
}
function rescueSeed(e, r) {
  e = e || {};
  var t = Date.now();
  function n() {
    var t = pickSeed(e);
    return t
      ? ((e[seedIdentity(t)] = !0), adoptSeed(t), r(null, t))
      : r(new Error("sin semillas disponibles"));
  }
  if (!!(
    seedPool.length &&
    seedsAt &&
    t - seedsAt < SEED_POOL_FRESH_MS &&
    usableSeeds().length
  ))
    return n();
  refreshSeeds(function () {
    n();
  });
}
!(function () {
  try {
    var e = JSON.parse(fs.readFileSync(SEED_FILE, "utf8")),
      r = e && e.seeds ? e.seeds : e;
    (r && r.length && (seedPool = r),
      e && "number" == typeof e.at && (seedsAt = e.at));
  } catch (e) {}
  if (!seedPool || !seedPool.length)
    try {
      var t = path.join(__dirname, "seeds-fallback.json"),
        n = JSON.parse(fs.readFileSync(t, "utf8")),
        s = n && n.seeds ? n.seeds : n;
      s &&
        s.length &&
        ((seedPool = s),
        console.log(
          "[magis] semillas iniciales cargadas desde fallback local: " +
            seedPool.length
        ));
    } catch (e) {}
  try {
    var a = JSON.parse(fs.readFileSync(SEED_DEAD_FILE, "utf8"));
    a && "object" == typeof a && (deadSeeds = a);
  } catch (e) {}
})();
var sessionStarting = !1,
  sessionWaiters = [];
function ensureSession(e) {
  e = e || function () {};
  var r = Date.now();
  if (session.ready && session.userId && session.userToken) {
    if (!session.at || r - session.at < SESSION_MAX_AGE_MS)
      return e(null, session);
    (console.log(
      "[magis] sesión superó 6 horas en memoria. Renovando sesión preventiva..."
    ),
      (session.ready = !1));
  }
  if ((sessionWaiters.push(e), !sessionStarting)) {
    ((sessionStarting = !0), (session.ready = !1));
    var t,
      n = {};
    for (t in FINGERPRINT_FIXED)
      Object.prototype.hasOwnProperty.call(FINGERPRINT_FIXED, t) &&
        (n[t] = FINGERPRINT_FIXED[t]);
    ((n.androidId = randomHex(8)),
      (n.cpuId = randomHex(8)),
      (n.serialNumber = randomHex(8)),
      (n.etheMac = randomHex(6).replace(/(..)(?=.)/g, "$1:")),
      (n.gatewayMac = randomHex(6).replace(/(..)(?=.)/g, "$1:")),
      (n.wifiMac = randomHex(6).replace(/(..)(?=.)/g, "$1:")),
      call("v3/snToken", n, { baseFields: !1 }, function (e, r) {
        if (e) return e.portalCode ? a(e) : s(e);
        var t = trim(r && r.snToken);
        if (!t) return a(new Error("el portal no devolvió snToken"));
        var n = r && trim(r.sn);
        (n ||
          (n = crypto
            .createHash("md5")
            .update(t + SNTOKEN_SALT)
            .digest("hex")),
          (session.snToken = t),
          (session.sn = String(n).toLowerCase()),
          call(
            "v8/active",
            {
              snToken: t,
              authVersion: "",
              authCode: "",
              preCode: "",
              macAddr: FIXED_MAC,
              reserve1: "",
              openNum: 4,
              channel: "default",
              matadata: "",
              signdata: "",
            },
            { baseFields: !1 },
            function (e, r) {
              return e
                ? e.portalCode
                  ? a(e)
                  : (function (e) {
                      if (e && e._retried) return a(e);
                      (console.log(
                        "[magis] sesión no activada por red (" +
                          (e && e.message) +
                          "). Reintentando una vez..."
                      ),
                        HOSTS.push(HOSTS.shift()),
                        ((e || new Error("reintento"))._retried = !0),
                        setTimeout(function () {
                          ((sessionStarting = !1),
                            ensureSession(function () {}));
                        }, 400));
                    })(e)
                : ((session.userId = trim(r && r.userId)),
                  (session.userToken = trim(r && r.userToken)),
                  session.userToken
                    ? ((session.ready = !0),
                      (session.seed = null),
                      (session.usesSeed = !1),
                      (session.at = Date.now()),
                      void s(null, session))
                    : a(new Error("el portal no activó el dispositivo")));
            }
          ));
      }));
  }
  function s(e, r) {
    sessionStarting = !1;
    var t = sessionWaiters.slice();
    sessionWaiters = [];
    for (var n = 0; n < t.length; n++)
      try {
        t[n](e, r);
      } catch (e) {}
  }
  function a(e) {
    var r = {};
    (session.usesSeed && session.seed && (r[seedIdentity(session.seed)] = !0),
      rescueSeed(r, function (r, t) {
        if (!t)
          return (
            console.log("[magis] sin semilla utilizable: " + (e && e.message)),
            s(e)
          );
        (console.log(
          "[magis] sesión por semilla " +
            seedIdentity(t).slice(0, 16) +
            " (bloqueo regional)"
        ),
          s(null, session));
      }));
  }
}
function itemFromAsset(e, r, t) {
  if (!e || "" === trim(e.contentId)) return null;
  var n = trim(e.programType) || "movie",
    s =
      "teleplay" === n ||
      "series" === n ||
      (e.volumnCount && parseInt(e.volumnCount, 10) > 1);
  return {
    id: trim(e.contentId),
    title: text(e.name || e.title),
    category: r || "",
    kind: t || (s ? "serie" : "película"),
    score:
      void 0 === e.score || null === e.score || "" === e.score
        ? "—"
        : text(e.score),
    year: trim(e.releaseTime || e.releaseDate)
      ? trim(e.releaseTime || e.releaseDate).slice(0, 4)
      : "—",
    duration: text(e.duration),
    genres: genresOf(e),
    director: text(e.director),
    actors: text(e.actorDisplay || e.actors),
    synopsis: text(e.description || e.synopsis),
    poster: imageOf(e, "icon") || imageOf(e, "poster"),
    landscape: imageOf(e, "poster") || imageOf(e, "stage"),
    backdrop: imageOf(e, "stage") || imageOf(e, "poster"),
    type: s ? "teleplay" : n,
    alias: text(e.alias),
    country: trim(e.originalCountry || e.country),
    releaseDate: trim(e.releaseTime || e.releaseDate),
    tagline: trim(e.viewPoint || e.tagline),
    volumeCount:
      void 0 === e.volumnCount || null === e.volumnCount
        ? parseInt(e.volumeCount, 10) || 0
        : parseInt(e.volumnCount, 10) || 0,
    updateCount:
      void 0 === e.updateCount || null === e.updateCount
        ? 0
        : parseInt(e.updateCount, 10) || 0,
    moreAudio: void 0 !== e.moreAudio ? e.moreAudio : 0,
    moreSubtitle: void 0 !== e.moreSubtitle ? e.moreSubtitle : 0,
    row: "",
    streamUrl: "",
    portal: !0,
  };
}
var treeCache = {},
  itemCache = {},
  searchCache = {},
  slbCache = null;
function remember(e) {
  e && e.id && (itemCache[e.id] = e);
}
function itemsFromTree(e, r) {
  var t = e && e.recommendList,
    n = [],
    s = ROOT_CATEGORY[r] || "";
  if (!t || !t.length) return n;
  for (var a = 0; a < t.length; a++) {
    var o = t[a],
      i = o && o.assetList;
    if (i && i.length)
      for (var l = 0; l < i.length; l++) {
        var u = itemFromAsset(i[l], s, null);
        u &&
          ((u.row = text(o.name)),
          "free" === r &&
            /free\.kids/i.test(u.row) &&
            -1 === u.category.indexOf("infantil") &&
            (u.category += ",infantil"),
          n.push(u),
          remember(u));
      }
  }
  return n;
}
function home(e, r, t) {
  ("function" == typeof r && ((t = r), (r = 1)),
    (e = ROOT_CODES[e] ? e : "movies"),
    (r = parseInt(r, 10) || 1) < 1 && (r = 1));
  var n = e + ":" + r,
    s = treeCache[n];
  if (s && Date.now() - s.at < TREE_TTL)
    return t(null, { root: e, pageNum: r, items: s.items, cached: !0 });
  ensureSession(function (s) {
    if (s) return t(s);
    call(
      "getNextColumns",
      { columnCode: ROOT_CODES[e], pageNum: r, pageSize: 60, version: "" },
      function (s, a) {
        if (s) return t(s);
        var o = itemsFromTree(a, e);
        ((treeCache[n] = { at: Date.now(), items: o }),
          t(null, { root: e, pageNum: r, items: o, cached: !1 }));
      }
    );
  });
}
function column(e, r, t) {
  "function" == typeof r && ((t = r), (r = 1));
  var n = trim(e);
  if (!n) return t(new Error("columnCode requerido"));
  ((r = Math.max(1, parseInt(r, 10) || 1)),
    ensureSession(function (e) {
      if (e) return t(e);
      call(
        "getNextColumns",
        { columnCode: n, pageNum: r, pageSize: 60, version: "" },
        function (e, s) {
          if (e) return t(e);
          t(null, { root: n, pageNum: r, items: itemsFromTree(s, "") });
        }
      );
    }));
}
function search(e, r) {
  var t = trim(e);
  if (!t) return r(null, { items: [] });
  var n = t.toLowerCase(),
    s = searchCache[n];
  if (s && Date.now() - s.at < SEARCH_TTL)
    return r(null, { items: s.items, cached: !0 });
  ensureSession(function (e) {
    if (e) return r(e);
    call(
      "v3/searchByName",
      {
        value: t,
        type: "0",
        columnId: "",
        filter: "",
        pageNum: 1,
        pageSize: 50,
      },
      function (e, t) {
        if (e) return r(e);
        var s = t && t.searchItemList,
          a = [],
          o = {};
        if (s && s.length)
          for (var i = 0; i < s.length; i++) {
            var l = s[i] && s[i].itemList;
            if (l && l.length)
              for (var u = 0; u < l.length; u++) {
                var d = itemFromAsset(l[u], "", null);
                d && !o[d.id] && ((o[d.id] = !0), a.push(d), remember(d));
              }
          }
        ((searchCache[n] = { at: Date.now(), items: a }),
          r(null, { items: a, total: t && t.totalSize, cached: !1 }));
      }
    );
  });
}
function detail(e, r, t) {
  var n = trim(e);
  if (!n) return r(new Error("falta contentId"));
  ensureSession(function (e) {
    if (e) return r(e);
    call(
      "v4/getItemData",
      {
        contentId: n,
        type: "0",
        sortType: "0",
        language: "en",
        macAddr: FIXED_MAC,
      },
      function (e, s) {
        var a = itemCache[n] || null;
        if (e)
          return t || e.portalCode || /portal\d+/i.test(e.message || "")
            ? e.portalCode || /portal/i.test(e.message)
              ? r(null, {
                  item: a || {
                    id: n,
                    title: "",
                    kind: "película",
                    episodes: [],
                    seasons: [],
                    portal: !0,
                  },
                  episodes: [],
                  seasons: [],
                })
              : r(e)
            : (console.log(
                "[magis] reintentando detalle tras error temporal: " +
                  e.message
              ),
              setTimeout(function () {
                detail(n, r, !0);
              }, 900));
        var o = s && s.assetData;
        if (!o)
          return a
            ? r(null, { item: a, episodes: [], seasons: [] })
            : r(new Error("el portal no devolvió datos del título"));
        var i = itemFromAsset(o, a ? a.category : "", null);
        (a && ((i.row = a.row), (i.category = a.category)), remember(i));
        var l = [],
          u = o.simpleProgramList;
        if (u && u.length)
          for (var d = 0; d < u.length; d++) {
            var c = u[d];
            c &&
              l.push({
                id: trim(c.contentId),
                title: text(c.name),
                name: text(c.name),
                number:
                  void 0 === c.seriesNumber || null === c.seriesNumber
                    ? d + 1
                    : c.seriesNumber,
                duration: text(c.duration),
                quality: text(c.quality),
                picture: text(
                  c.picture ||
                    c.pic ||
                    c.image ||
                    c.cover ||
                    c.posterUrl ||
                    c.poster
                ),
                description: text(
                  c.description ||
                    c.desc ||
                    c.synopsis ||
                    c.shortDescription ||
                    c.introduce
                ),
              });
          }
        var f = [],
          m = o.sameSeasonSeriesList;
        if (m && m.length)
          for (var p = 0; p < m.length; p++)
            m[p] &&
              trim(m[p].contentId) &&
              f.push({ id: trim(m[p].contentId), number: m[p].seasonNumber });
        r(null, { item: i, episodes: l, seasons: f });
      }
    );
  });
}
function slbBean() {
  return {
    hasPay: "0",
    userIdentity: "1",
    type: "merge",
    appVer: APK_VERSION,
    lang: "es",
    encMediaSupported: 1,
    liveCodeList: ["masnew_live"],
    appParams: "",
    reserve1: FIXED_RESERVE1,
    pipFlag: "0",
  };
}
function isCfl(e) {
  for (
    var r = e.slice(e.lastIndexOf("?") + 1).split("&"), t = 0;
    t < r.length;
    t++
  )
    if ("sign_type=cfl" === trim(r[t])) return !0;
  return !1;
}
function withScheme(e) {
  var r = trim(e).replace(/\/+$/, "");
  return (
    (r = r.replace(/^http:\/\//i, "https://")),
    /^https:\/\//.test(r) ? r : "https://" + r
  );
}
function vodCdns(e) {
  var r = [],
    t = e && e.cdn_list;
  if (!t || !t.length) return r;
  for (var n = 0; n < t.length; n++) {
    var s = t[n];
    if (s && "vod" === trim(s.tag))
      for (var a = s.url_list || [], o = 0; o < a.length; o++) {
        var i = a[o],
          l = trim(i && i.url);
        if (
          (isCfl(l) || "cfl" === trim(i && i.sign_type)) &&
          "free" === trim(i && i.tag)
        ) {
          var u = [withScheme(s.main_addr)],
            d = trim(s.spared_addr);
          (d && -1 === u.indexOf(withScheme(d)) && u.push(withScheme(d)),
            r.push({ bases: u, auth: l }));
          break;
        }
      }
  }
  if (!r.length)
    for (var c = 0; c < t.length; c++) {
      var f = t[c];
      if (f && "vod" === trim(f.tag))
        for (var m = f.url_list || [], p = 0; p < m.length; p++) {
          var v = m[p],
            h = trim(v && v.url);
          if (
            h &&
            ("free" === trim(v && v.tag) || -1 !== h.indexOf("tag=free"))
          ) {
            var g = [withScheme(f.main_addr)],
              S = trim(f.spared_addr);
            (S && -1 === g.indexOf(withScheme(S)) && g.push(withScheme(S)),
              r.push({ bases: g, auth: h }));
            break;
          }
        }
    }
  return r;
}
function getSlb(e) {
  if (slbCache && Date.now() < slbCache.at + SLB_TTL)
    return e(null, slbCache.slb);
  firstCall(
    [
      { path: "v15/getSlbInfo", bean: slbBean() },
      { path: "v14/getSlbInfo", bean: slbBean() },
    ],
    function (r, t) {
      return r
        ? e(r)
        : vodCdns(t).length
          ? ((slbCache = { at: Date.now(), slb: t }), void e(null, t))
          : e(new Error("el portal no expuso CDN de vod libre"));
    }
  );
}
function fieldNumber(e) {
  var r = text(e).match(/(\d+(?:\.\d+)?)/);
  return r ? parseFloat(r[1]) : 0;
}
function trackHeight(e) {
  var r = fieldNumber(e && (e.videoHeight || e.height || e.pixelHeight));
  if (r) return r;
  var t = text(
      e && (e.resolution || e.videoResolution || e.quality)
    ).toLowerCase(),
    n = t.match(/\d{3,4}\s*[x×]\s*(\d{3,4})/);
  return n
    ? parseInt(n[1], 10)
    : /\b(4k|uhd|2160)\b/.test(t)
      ? 2160
      : /\b1440\b/.test(t)
        ? 1440
        : /\b1080\b|\bfhd\b/.test(t)
          ? 1080
          : /\b720\b|\bhd\b/.test(t)
            ? 720
            : /\b480\b|\bsd\b/.test(t)
              ? 480
              : 0;
}
function trackBitrateKbps(e) {
  var r =
      e &&
      (e.videoBitrate ||
        e.videoBitRate ||
        e.bitrate ||
        e.bitRate ||
        e.rate ||
        ""),
    t = fieldNumber(r),
    n = text(r).toLowerCase();
  return /mbps|m\b/.test(n) ? 1e3 * t : t > 1e4 ? t / 1e3 : t;
}
function trackFrameRate(e) {
  return fieldNumber(e && (e.frameRate || e.fps || e.videoFps));
}
function trackSummary(e) {
  return {
    codec: trim(e && e.encodeFormat).toUpperCase(),
    format: trim(e && e.videoFormat).toLowerCase(),
    quality: trim(e && e.quality),
    height: trackHeight(e),
    bitrateKbps: trackBitrateKbps(e),
    frameRate: trackFrameRate(e),
  };
}
function durationSeconds(e) {
  var r = trim(e);
  if (!r) return 0;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(r)) {
    var t = r.split(":");
    return (
      3600 * parseInt(t[0], 10) + 60 * parseInt(t[1], 10) + parseInt(t[2], 10)
    );
  }
  var n = fieldNumber(r);
  return n > 1e5 ? n / 1e3 : n;
}
function mediaScore(e) {
  var r = trim(e && e.encodeFormat)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""),
    t = trim(e && e.videoFormat).toLowerCase(),
    n = -1 !== r.indexOf("h264") || -1 !== r.indexOf("avc"),
    s = -1 !== r.indexOf("h265") || -1 !== r.indexOf("hevc"),
    a = "mp4" === t,
    o = trackSummary(e),
    i = 0;
  return (
    (i += n ? 0 : s ? 80 : 160),
    /av1|vp9|10bit|hdr/.test(r) && (i += 500),
    a || (i += 2e3),
    o.frameRate > 30 && (i += 300 + o.frameRate),
    o.bitrateKbps > 9e3 ? (i += 250) : o.bitrateKbps > 6500 && (i += 80),
    i
  );
}
/* Preferencias de reproducción enviadas por la app (webOS 3.x no decodifica
   HEVC/4K en muchos modelos): techo de calidad por altura y castigo a códecs
   que el panel no soporta. Sin preferencias se mantiene el orden anterior. */
var xQualityPref = "auto",
  xHevcOk = !0,
  xUhdOk = !1;
function xTier(e) {
  var t = "2160" === xQualityPref || ("auto" === xQualityPref && xUhdOk);
  return t
    ? e >= 2e3
      ? 1
      : e >= 1e3
        ? 2
        : e >= 700
          ? 3
          : 4
    : "720" === xQualityPref
      ? e >= 700 && e < 2e3
        ? e < 1e3
          ? 1
          : 3
        : e < 700
          ? 2
          : 4
      : e >= 1e3 && e < 2e3
        ? 1
        : e >= 700 && e < 1e3
          ? 2
          : e < 700
            ? 3
            : 4;
}
function xQScore(e) {
  var t = trackHeight(e),
    r = mediaScore(e) + 1e3 * xTier(t),
    n = trim(e && e.encodeFormat)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  return xHevcOk || !/h265|hevc|av1|vp9|10bit|hdr/.test(n) || (r += 4e3), r;
}
function rankTracks(e) {
  return e.slice().sort(function (e, r) {
    return xQScore(e) - xQScore(r);
  });
}
function collectTracks(e) {
  for (var r = [], t = (e && e.totalMovieList) || [], n = 0; n < t.length; n++)
    for (var s = (t[n] && t[n].movieList) || [], a = 0; a < s.length; a++)
      s[a] && trim(s[a].contentId) && r.push(s[a]);
  return (
    r.sort(function (e, r) {
      return mediaScore(e) - mediaScore(r);
    }),
    r
  );
}
function subtitleList(e) {
  for (
    var r = [], t = (e && e.subtitleList) || [], n = 0;
    n < t.length && r.length < 30;
    n++
  ) {
    var s = t[n] && t[n].file && t[n].file[0];
    s &&
      trim(s.url) &&
      r.push({
        lang: trim(t[n].language),
        url: trim(s.url),
        format: trim(s.fileType) || "srt",
      });
  }
  return r;
}
var PLAY_TTL = 6e4,
  playCache = {},
  playWaiters = {};
function loadPlay(e, r, t) {
  var n = trim(e);
  if (!n) return t(new Error("falta contentId"));
  var s = n + ":" + trim(r);
  if (playCache[s] && Date.now() < playCache[s].at + PLAY_TTL)
    return t(null, playCache[s].data);
  function a(e, r) {
    var t = playWaiters[s] || [];
    delete playWaiters[s];
    for (var n = 0; n < t.length; n++)
      try {
        t[n](e, r);
      } catch (e) {}
  }
  playWaiters[s]
    ? playWaiters[s].push(t)
    : ((playWaiters[s] = [t]),
      ensureSession(function (e) {
        if (e) return a(e);
        call(
          "v10/startPlayVOD",
          {
            contentId: n,
            seriesContentId: trim(r),
            startTime: 0,
            type: "1",
            columnId: 0,
            authType: "",
          },
          function (e, r) {
            if (e) return a(e);
            var t = r && r.episodeList && r.episodeList[0];
            if (!t)
              return a(new Error("el portal no devolvió pistas de vídeo"));
            var n = collectTracks(t);
            if (!n.length)
              return a(new Error("el portal no devolvió pistas de vídeo"));
            var o = { play: r, episode: t, tracks: n };
            ((playCache[s] = { at: Date.now(), data: o }), a(null, o));
          }
        );
      }));
}
function mediaInfo(e, r, t) {
  loadPlay(e, r, function (e, r) {
    if (e) return t(e);
    var n = r.tracks[0];
    t(null, {
      name: text(r.play && r.play.name),
      audio: trim(n.audioInfo),
      subtitles: subtitleList(r.episode),
      tracks: r.tracks.map(trackSummary),
      selected: trackSummary(n),
      duration: durationSeconds(
        n.duration || r.episode.duration || (r.play && r.play.duration)
      ),
    });
  });
}
function resolve(e, r, t, n) {
  ("function" == typeof t && ((n = t), (t = {})),
    (t = t || {}),
    (xQualityPref =
      "720" === trim(t.quality).toLowerCase() ||
      "save" === trim(t.quality).toLowerCase()
        ? "720"
        : "1080" === trim(t.quality).toLowerCase()
          ? "1080"
          : "2160" === trim(t.quality).toLowerCase()
            ? "2160"
            : "auto"),
    (xHevcOk = !(
      !1 === t.hevc ||
      "false" === String(t.hevc) ||
      "0" === String(t.hevc)
    )),
    (xUhdOk = !(
      !t.uhd ||
      "false" === String(t.uhd) ||
      "0" === String(t.uhd)
    )),
    loadPlay(e, r, function (e, r) {
      if (e) return n(e);
      var s = r.play,
        a = r.episode,
        o = rankTracks(r.tracks),
        i = parseInt(t.trackIndex, 10);
      (i >= 0 && i < o.length) || (i = 0);
      for (var l = o[i], u = [], d = 0; d < o.length; d++)
        u.push(trackSummary(o[d]));
      var c = trim(
        (l.licenseList && l.licenseList[0] && l.licenseList[0].license) || ""
      );
      if (!c)
        return n(new Error("el portal no devolvió licencia de reproducción"));
      getSlb(function (e, r) {
        if (e) return n(e);
        var t = vodCdns(r);
        if (!t.length)
          return n(new Error("el portal no expuso CDN de vod libre"));
        var o = t[0],
          d = "ts" === trim(l.videoFormat).toLowerCase() ? "ts" : "mp4",
          f = "/vod/" + trim(l.contentId) + "_media." + d;
        function m(e) {
          return {
            "Content-Auth": e,
            "Content-License": c,
            "User-Agent": UA_CDN,
            App: APP_ID,
            "App-Version": APK_VERSION,
          };
        }
        for (var p = o.bases[0] + f, v = [], h = 0; h < t.length; h++)
          for (var g = 0; g < t[h].bases.length; g++)
            (0 === h && 0 === g) ||
              v.push({ url: t[h].bases[g] + f, headers: m(t[h].auth) });
        var S = "ts" === d ? "video/mp2t" : "video/mp4",
          E = trim(l.encodeFormat).toUpperCase();
        n(null, {
          url: p,
          mime: S,
          codec: E,
          quality: trim(l.quality),
          duration: durationSeconds(
            l.duration || a.duration || (s && s.duration)
          ),
          selectedTrack: trackSummary(l),
          availableTracks: u,
          trackIndex: i,
          audio: trim(l.audioInfo),
          headers: m(o.auth),
          backupUrls: v,
          subtitles: subtitleList(a),
          name: text(s && s.name),
        });
      });
    }));
}
for (
  var LIVE_K = [
      3614090360, 3905402710, 606105819, 3250441966, 4118548399, 1200080426,
      2821735955, 4249261313, 1770035416, 2336552879, 4294925233, 2304563134,
      1804603682, 4254626195, 2792965006, 1236535329, 4129170786, 3225465664,
      643717713, 3921069994, 3593408605, 38016083, 3634488961, 3889429448,
      568446438, 3275163606, 4107603335, 1163531501, 2850285829, 4243563512,
      1735328473, 2368359562, 4294588738, 2272392833, 1839030562, 4259657740,
      2763975236, 1272893353, 4139469664, 3200236656, 681279174, 3936430074,
      3564056709, 76029189, 3654602809, 3871185381, 530742520, 3299628645,
      4096336452, 1126891415, 2878612391, 4237533241, 1700485571, 2399980690,
      4293706877, 2240044497, 1873313359, 4264355552, 2734768916, 1309151649,
      4149444226, 3174756917, 765973179, 3951481745,
    ],
    LIVE_S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4,
      11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
      10, 15, 21,
    ],
    LIVE_ROUND1 = [10, 11, 12, 13, 14, 15, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5],
    LIVE_G = [],
    iG = 0;
  iG < 64;
  iG++
)
  LIVE_G.push(
    iG < 16
      ? LIVE_ROUND1[iG]
      : iG < 32
        ? (5 * iG + 1) % 16
        : iG < 48
          ? (3 * iG + 5) % 16
          : (7 * iG) % 16
  );
var LIVE_SALT = bufFrom([
  115, 97, 108, 116, 51, 51, 51, 51, 61, 52, 152, 13, 10, 21, 50, 201, 195, 130,
  23, 8, 192,
]);
function rotl(e, r) {
  return ((e << r) | (e >>> (32 - r))) >>> 0;
}
function liveCompress(e, r, t) {
  for (var n = new Array(16), s = 0; s < 16; s++) {
    var a = t + 4 * s;
    n[s] = (r[a] | (r[a + 1] << 8) | (r[a + 2] << 16) | (r[a + 3] << 24)) >>> 0;
  }
  for (var o = e[0], i = e[1], l = e[2], u = e[3], d = 0; d < 64; d++) {
    var c =
      ((d < 16
        ? (i & l) | (~i & u)
        : d < 32
          ? (u & i) | (~u & l)
          : d < 48
            ? i ^ l ^ u
            : l ^ (i | ~u)) +
        o +
        LIVE_K[d] +
        n[LIVE_G[d]]) >>>
      0;
    ((o = u), (u = l), (l = i), (i = (i + rotl(c, LIVE_S[d])) >>> 0));
  }
  ((e[0] = (e[0] + o) >>> 0),
    (e[1] = (e[1] + i) >>> 0),
    (e[2] = (e[2] + l) >>> 0),
    (e[3] = (e[3] + u) >>> 0));
}
function liveDigestHex(e) {
  var r = [1732584193, 4023233417, 2562383102, 271733878],
    t = e.length,
    n = (56 - ((t + 1) % 64) + 64) % 64,
    s = bufAlloc(t + 1 + n + 8);
  (e.copy(s, 0), (s[t] = 128));
  for (
    var a = (t % 536870912) * 8, o = Math.floor(t / 536870912), i = 0;
    i < 4;
    i++
  )
    ((s[t + 1 + n + i] = (a >>> (8 * i)) & 255),
      (s[t + 5 + n + i] = (o >>> (8 * i)) & 255));
  for (var l = 0; l < s.length; l += 64) liveCompress(r, s, l);
  for (var u = "", d = 0; d < 4; d++)
    for (var c = 0; c < 4; c++) {
      var f = ((r[d] >>> (8 * c)) & 255).toString(16);
      (f.length < 2 && (f = "0" + f), (u += f));
    }
  return u;
}
function signO3(e, r) {
  var t = bufFrom(
    "token=" + e + "&sign2_method=sign_o3&instance=0&start_moment=" + r,
    "utf8"
  );
  return liveDigestHex(Buffer.concat([t, LIVE_SALT]));
}
function bareHost(e) {
  var r = "string" == typeof e ? e : "";
  (0 === r.indexOf("https://") && (r = r.slice(8)),
    0 === r.indexOf("http://") && (r = r.slice(7)));
  var t = r.indexOf("/");
  return t >= 0 ? r.slice(0, t) : r;
}
function getLiveChannels(e, r, t, n) {
  ("function" == typeof e
    ? ((n = e), (e = null), (r = 1), (t = 20))
    : "function" == typeof r
      ? ((n = r), (r = 1), (t = 20))
      : "function" == typeof t && ((n = t), (t = 20)),
    (r = Math.max(1, parseInt(r, 10) || 1)),
    (t = Math.max(1, Math.min(250, parseInt(t, 10) || 20))),
    ensureSession(function (s) {
      if (s) return n(s);
      var a = [],
        o = {};
      call(
        "v6/getLiveData",
        {
          columnId: e || 76182,
          dataVersion: "",
          pageSize: t,
          pageNum: r,
          expireTimeStr: "",
        },
        function (e, r) {
          if (e) return n(e);
          for (var s = (r && r.channelList) || [], i = 0; i < s.length; i++) {
            var l = s[i];
            if (l && l.channelCode && !o[l.channelCode]) {
              o[l.channelCode] = !0;
              var u = text(l.posterUrl);
              !u &&
                l.posterList &&
                l.posterList.length &&
                (u = text(l.posterList[0].fileUrl));
              var d = {
                channelCode: l.channelCode,
                index: l.channelNumber || a.length + 1,
                name: text(l.name || l.alias || "Canal " + (a.length + 1)),
                logo: u,
                uhd: "3" === l.quality,
                fav: l.isFav || !1,
                now: "En vivo",
                next: "",
                time: "",
                liveAddressList: l.liveAddressList || [],
              };
              (a.push(d),
                (liveChannelCache[l.channelCode] = {
                  at: Date.now(),
                  channel: d,
                }));
            }
          }
          n(null, a, s.length >= t);
        }
      );
    }));
}
var liveChannelCache = {},
  liveCategoriesCache = null;
function getLiveCategories(e) {
  if (liveCategoriesCache && liveCategoriesCache.length)
    return e(null, liveCategoriesCache);
  ensureSession(function (r) {
    if (r) return e(r);
    call(
      "getNextColumns",
      { columnCode: "masnew_live", pageNum: 1, pageSize: 200, version: "" },
      function (r, t) {
        if (r) return e(r);
        for (
          var n = (t && t.recommendList) || [], s = [], a = 0;
          a < n.length;
          a++
        ) {
          var o = n[a];
          o &&
            o.columnId &&
            s.push({
              id: o.columnId,
              name: text(
                o.name || o.title || o.alias || "Categoría " + (a + 1)
              ),
              code: o.code || "",
            });
        }
        ((liveCategoriesCache = s), e(null, s));
      }
    );
  });
}
function parseM3u(e) {
  for (
    var r = (e || "").split(/\r?\n/), t = [], n = null, s = 0;
    s < r.length;
    s++
  ) {
    var a = r[s].trim();
    if (0 === a.indexOf("#EXTINF:")) {
      var o = a.indexOf(","),
        i = a.slice(8, o > 0 ? o : void 0),
        l = o > 0 ? a.slice(o + 1).trim() : "",
        u = /tvg-logo=["']([^"']+)["']/i.exec(i),
        d = /group-title=["']([^"']+)["']/i.exec(i),
        c = /tvg-name=["']([^"']+)["']/i.exec(i);
      (!l && c && (l = c[1]),
        l || (l = "Canal " + (t.length + 1)),
        (n = {
          name: l,
          logo: u ? u[1] : "",
          group: d ? d[1] : "Addon",
          isAddon: !0,
          now: "En vivo",
          fav: !1,
        }));
    } else
      0 === a.indexOf("#EXTGRP:") && n && "Addon" === n.group
        ? (n.group = a.slice(8).trim() || "Addon")
        : a &&
          0 !== a.indexOf("#") &&
          n &&
          ((n.url = a),
          (n.streamUrl = a),
          (n.channelCode = "m3u_" + (t.length + 1)),
          (n.index = t.length + 1),
          t.push(n),
          (n = null));
  }
  return t;
}
function fetchM3u(e, r) {
  if (!e) return r(new Error("URL de addon requerida"));
  var t = 0 === e.indexOf("https://") ? https : http,
    n = url.parse(e);
  ((n.rejectUnauthorized = !1),
    (n.method = "GET"),
    (n.headers = {
      "User-Agent":
        "Mozilla/5.0 (SmartHub; SMART-TV; U; Linux/SmartTV) AppleWebKit/538.1+ (KHTML, like Gecko) Safari/538.1+",
    }),
    dnsx.prepare(n, function (n, s) {
      if (n) return r(n);
      var a = t.get(s, function (t) {
        if (t.statusCode >= 300 && t.statusCode < 400 && t.headers.location)
          return (t.resume(), fetchM3u(url.resolve(e, t.headers.location), r));
        if (200 !== t.statusCode)
          return r(new Error("HTTP " + t.statusCode + " al descargar addon"));
        var n = [];
        (t.on("data", function (e) {
          n.push(e);
        }),
          t.on("end", function () {
            var e = parseM3u(Buffer.concat(n).toString("utf8"));
            r(null, e);
          }));
      });
      (a.on("error", function (e) {
        r(e);
      }),
        a.setTimeout(2e4, function () {
          (a.abort(),
            r(new Error("Tiempo de espera agotado al descargar addon")));
        }));
    }));
}
var liveResolveCache = {},
  LIVE_RESOLVE_CACHE_MS = 12e4;
function firstCall(e, r) {
  var t = 0;
  !(function n(s) {
    if (t >= e.length) return r(s || new Error("el portal no respondió"));
    var a = e[t++];
    call(a.path, a.bean, function (e, t) {
      if (e) return n(e);
      r(null, t);
    });
  })(null);
}
function liveCdnsOf(e) {
  var r = (e && e.cdn_list) || [],
    t = [],
    n = {};
  function s(e, r) {
    var s = bareHost(e);
    s && !n[s] && ((n[s] = !0), t.push({ cflHost: s, authBase: r }));
  }
  for (var a = 0; a < r.length; a++) {
    var o = r[a];
    if (o && "live" === o.tag)
      for (var i = o.url_list || [], l = 0; l < i.length; l++) {
        var u = i[l],
          d = (u && u.url) || "";
        ("cfl" !== u.sign_type && -1 === d.indexOf("sign_type=cfl")) ||
          (s(o.main_addr, d), o.spared_addr && s(o.spared_addr, d));
      }
  }
  for (var c = 0; c < r.length; c++) {
    var f = r[c];
    if (f && "live" === f.tag)
      for (var m = f.url_list || [], p = 0; p < m.length; p++) {
        var v = m[p],
          h = (v && v.url) || "";
        h &&
          -1 !== h.indexOf("token=") &&
          (s(f.main_addr, h), f.spared_addr && s(f.spared_addr, h));
      }
  }
  return t;
}
function resolveLive(e, r) {
  var t = liveResolveCache[e];
  if (t && Date.now() - t.at < LIVE_RESOLVE_CACHE_MS)
    return setTimeout(function () {
      r(null, t.stream);
    }, 0);
  ensureSession(function (t) {
    if (t) return r(t);
    !(function r(t, n) {
      firstCall(
        [
          { path: "v4/startPlayLive", bean: { channelCode: e, type: "1" } },
          {
            path: "v4/startPlayLive",
            bean: { channelCode: e, columnId: "76182", type: "1" },
          },
          {
            path: "v4/startPlayLive",
            bean: { channelCode: e, columnId: 0, type: "1" },
          },
        ],
        function (e, s) {
          if (e)
            return n
              ? t(e)
              : (resetSessionAfterLiveFailure(),
                ensureSession(function (n) {
                  if (n) return t(e);
                  r(t, !0);
                }));
          for (
            var a = (s && s.liveAddressList) || [], o = null, i = 0;
            i < a.length;
            i++
          )
            if (a[i] && a[i].playCode && a[i].license) {
              o = a[i];
              break;
            }
          if ((!o && a[0] && (o = a[0]), !o || !o.license))
            return t(new Error("el portal no devolvió licencia para el canal"));
          t(null, o);
        }
      );
    })(function (t, n) {
      if (t) return r(t);
      var s = n.playCode || e,
        a = n.license,
        o = slbBean();
      o.liveCodeList = ["masnew_live"];
      var i = ["v15/getSlbInfo", "v14/getSlbInfo"],
        l = 0;
      !(function t(u) {
        if (l >= i.length)
          return r(new Error("el portal no expuso CDN de vivo"));
        call(i[l++], o, function (o, i) {
          if (o) return t(o);
          var l = liveCdnsOf(i);
          if (!l.length) return t(new Error("CDN de vivo vacía"));
          !(function (t) {
            for (
              var o = t[0],
                i = "http://" + o.cflHost + "/live/" + s + ".m3u8",
                l = o.authBase.match(/token=([0-9a-fA-F]{32})/),
                u = l ? l[1] : "",
                d = Math.floor(Date.now()),
                c = signO3(u, d),
                f =
                  o.authBase +
                  "&sign2_method=sign_o3&instance=0&start_moment=" +
                  d +
                  "&sign2=" +
                  c,
                m = [],
                p = 1;
              p < t.length;
              p++
            )
              m.push("http://" + t[p].cflHost + "/live/" + s + ".m3u8");
            var v = {
              url: i,
              backupUrls: m,
              mime: "application/x-mpegurl",
              headers: {
                "Content-Auth": f,
                "Content-License": a,
                "User-Agent": "Ranger/4.9.4-17294ac0",
                App: "com.android.msandroid",
                "App-Version": "49902",
                "X-Buffer": "0",
              },
              name: text(
                (n && n.name) ||
                  (liveChannelCache[e] &&
                    liveChannelCache[e].channel &&
                    liveChannelCache[e].channel.name) ||
                  e
              ),
            };
            ((liveResolveCache[e] = { at: Date.now(), stream: v }), r(null, v));
          })(l);
        });
      })();
    });
  });
}
module.exports = {
  home: home,
  search: search,
  detail: detail,
  mediaInfo: mediaInfo,
  resolve: resolve,
  getLiveChannels: getLiveChannels,
  getLiveCategories: getLiveCategories,
  resolveLive: resolveLive,
  fetchM3u: fetchM3u,
  parseM3u: parseM3u,
  call: call,
  post: post,
  ensureSession: ensureSession,
  session: session,
  seedStatus: function () {
    var e,
      r = 0;
    for (e in deadSeeds)
      Object.prototype.hasOwnProperty.call(deadSeeds, e) &&
        Date.now() - deadSeeds[e] < DEAD_SEED_MS &&
        r++;
    return {
      pool: usableSeeds().length,
      total: seedPool.length,
      freshAt: seedsAt,
      usingSeed: !!session.usesSeed,
      dead: r,
    };
  },
  constants: {
    APP_ID: APP_ID,
    APK_VERSION: APK_VERSION,
    UA_CDN: UA_CDN,
    FIXED_MAC: FIXED_MAC,
    ROOT_CODES: ROOT_CODES,
    HOSTS: HOSTS,
  },
};
