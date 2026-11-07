"use strict";
var http = require("http"),
  https = require("https"),
  net = require("net"),
  tls = require("tls"),
  urlmod = require("url"),
  config = null;
function parse(t) {
  var n = String(null == t ? "" : t).replace(/^\s+|\s+$/g, "");
  if (!n) return null;
  /^https?:\/\//i.test(n) || (n = "http://" + n);
  var r = urlmod.parse(n);
  if (!r.hostname) return null;
  var e = Number(r.port);
  return (
    (e > 0 && e < 65536) || (e = 8080),
    {
      host: r.hostname,
      port: e,
      auth: r.auth || "",
      secure: "https:" === r.protocol,
    }
  );
}
function configure(t) {
  return (config = parse(t));
}
function enabled() {
  return !!config;
}
function describe() {
  return config
    ? { host: config.host, port: config.port, auth: !!config.auth }
    : null;
}
function basicAuth() {
  return config && config.auth
    ? "Proxy-Authorization: Basic " +
        (Buffer.from
          ? Buffer.from(config.auth, "utf8").toString("base64")
          : new Buffer(config.auth, "utf8").toString("base64")) +
        "\r\n"
    : "";
}
function tunnel(t, n, r) {
  var e,
    o = !1;
  function i(t, n, e) {
    o || ((o = !0), r(t, n, e));
  }
  try {
    e = net.connect(config.port, config.host);
  } catch (t) {
    return i(t);
  }
  (e.setTimeout(15e3, function () {
    try {
      e.destroy();
    } catch (t) {}
    i(new Error("proxy timeout"));
  }),
    e.on("error", function (t) {
      i(t);
    }),
    e.on("connect", function () {
      var r =
        "CONNECT " +
        t +
        ":" +
        n +
        " HTTP/1.1\r\nHost: " +
        t +
        ":" +
        n +
        "\r\n" +
        basicAuth() +
        "\r\n";
      e.write(r);
    }));
  var u = "";
  e.on("data", function t(n) {
    var r = (u += n.toString("latin1")).indexOf("\r\n\r\n");
    if (-1 !== r) {
      (e.removeListener("data", t), e.setTimeout(0));
      var o = u.slice(0, r).split("\r\n")[0] || "",
        c = parseInt(o.split(" ")[1], 10),
        a = u.slice(r + 4);
      if (200 !== c) {
        try {
          e.destroy();
        } catch (t) {}
        return i(new Error("proxy CONNECT " + (c || "sin respuesta")));
      }
      i(null, e, a);
    }
  });
}
function connectionFor(t, n, r, e, o) {
  tunnel(n, r, function (r, i) {
    if (r) return o(r);
    if (!t) return o(null, i);
    var u;
    try {
      u = tls.connect(
        { socket: i, servername: e || n, rejectUnauthorized: !1 },
        function () {
          o(null, u);
        }
      );
    } catch (t) {
      try {
        i.destroy();
      } catch (t) {}
      return o(t);
    }
    u.on("error", function (t) {
      o(t);
    });
  });
}
function agentFor(t, n, r) {
  if (config) {
    var e = new (t ? https.Agent : http.Agent)({
      keepAlive: !1,
      maxSockets: 8,
    });
    return (
      (e.createConnection = function (e, o) {
        var i = (e && (e.host || e.hostname)) || n,
          u = (e && e.port) || r || (t ? 443 : 80),
          c = (e && e.servername) || i;
        connectionFor(!!t, i, u, c, o);
      }),
      e
    );
  }
}
module.exports = {
  configure: configure,
  enabled: enabled,
  describe: describe,
  agentFor: agentFor,
  parse: parse,
};
