"use strict";
var PACKET = 188;
function ptsAt(t, r) {
  return (
    536870912 * (14 & t[r]) +
    4194304 * t[r + 1] +
    16384 * (254 & t[r + 2]) +
    128 * t[r + 3] +
    (254 & t[r + 4]) / 2
  );
}
function create(t, r) {
  var n = {
    length: t,
    offset: 0,
    pmt: -1,
    video: -1,
    pat: 0,
    pts: 0,
    current: null,
    segments: [],
    complete: !1,
    running: !1,
    waiters: [],
  };
  function e() {
    for (var t = n.waiters.splice(0), r = 0; r < t.length; r++) t[r]();
  }
  function u(t, r) {
    var n = (t[r + 3] >> 4) & 3,
      e = r + 4;
    return 2 === n || 0 === n
      ? -1
      : (3 === n && (e += 1 + t[e]), e < r + PACKET ? e : -1);
  }
  function i(t, r, n) {
    return n ? r + 1 + t[r] : r;
  }
  function s(t, r, e) {
    if (!((r = i(t, r, e)) < 0 || 0 !== t[r]))
      for (
        var u = r + 3 + (((15 & t[r + 1]) << 8) | t[r + 2]) - 4, s = r + 8;
        s + 3 < u;
        s += 4
      )
        if (t[s] || t[s + 1])
          return void (n.pmt = ((31 & t[s + 2]) << 8) | t[s + 3]);
  }
  function o(t, r, e) {
    if (!((r = i(t, r, e)) < 0 || 2 !== t[r]))
      for (
        var u = r + 3 + (((15 & t[r + 1]) << 8) | t[r + 2]) - 4,
          s = r + 12 + (((15 & t[r + 10]) << 8) | t[r + 11]);
        s + 4 < u;
      ) {
        var o = t[s],
          f = ((31 & t[s + 1]) << 8) | t[s + 2],
          a = ((15 & t[s + 3]) << 8) | t[s + 4];
        if (36 === o) return void (n.video = f);
        s += 5 + a;
      }
  }
  function f(t, r, n) {
    for (var e = r; e + 5 < n; e++) {
      if (
        0 === t[e] &&
        0 === t[e + 1] &&
        (1 === t[e + 2] || (0 === t[e + 2] && 1 === t[e + 3]))
      ) {
        var u = (t[e + (1 === t[e + 2] ? 3 : 4)] >> 1) & 63;
        if (19 === u || 20 === u || 21 === u) return !0;
      }
    }
    return !1;
  }
  function a(t) {
    if (n.pts) {
      var r = n.pat || t;
      if (n.current) {
        var u = (n.pts - n.current.pts) / 9e4;
        u < 5 ||
          r <= n.current.start ||
          (n.segments.push({ start: n.current.start, end: r - 1, duration: u }),
          (n.current = { start: r, pts: n.pts }),
          e());
      } else n.current = { start: r, pts: n.pts };
    }
  }
  function c() {
    if (n.offset >= n.length)
      return (
        (n.complete = !0),
        n.current &&
          n.segments.push({
            start: n.current.start,
            end: n.length - 1,
            duration: 10,
          }),
        void e()
      );
    var t = Math.floor(2097152 / PACKET) * PACKET,
      i = n.offset,
      p = Math.min(n.length - 1, i + t - 1);
    r(i, p, function (t, r) {
      if (t) return ((n.complete = !0), void e());
      (!(function (t, r) {
        for (var e = 0; e + PACKET <= t.length; e += PACKET)
          if (71 === t[e]) {
            var i = !!(64 & t[e + 1]),
              c = ((31 & t[e + 1]) << 8) | t[e + 2],
              p = u(t, e);
            p < 0 ||
              (0 !== c
                ? c !== n.pmt
                  ? c === n.video &&
                    (i &&
                      p + 13 < e + PACKET &&
                      0 === t[p] &&
                      0 === t[p + 1] &&
                      1 === t[p + 2] &&
                      128 & t[p + 7] &&
                      (n.pts = ptsAt(t, p + 9)),
                    f(t, p, e + PACKET) && a(r + e))
                  : o(t, p, i)
                : ((n.pat = r + e), s(t, p, i)));
          }
      })(r, i),
        (n.offset = p + 1),
        setTimeout(c, 0));
    });
  }
  return (
    (n.start = function () {
      n.running || ((n.running = !0), c());
    }),
    (n.when = function (t) {
      n.waiters.push(t);
    }),
    n
  );
}
module.exports = { create: create };
