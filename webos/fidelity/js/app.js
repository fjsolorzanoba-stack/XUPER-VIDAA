!(function () {
  "use strict";
  function e(e, t, a) {
    var i = document.createElement(e);
    return (t && (i.className = t), null != a && (i.textContent = a), i);
  }
  function t(e) {
    return document.getElementById(e);
  }
  function a(e) {
    if (e) for (; e.firstChild;) e.removeChild(e.firstChild);
  }
  function i(e, t, a, i, n) {
    return (
      (e.style.position = "absolute"),
      (e.style.left = t + "px"),
      (e.style.top = a + "px"),
      void 0 !== i && (e.style.width = i + "px"),
      void 0 !== n && (e.style.height = n + "px"),
      e
    );
  }
  function n(e, t) {
    for (; e && e !== document;) {
      if (1 === e.nodeType && e.matches && e.matches(t)) return e;
      e = e.parentNode;
    }
    return null;
  }
  function r(e) {
    return e < 10 ? "0" + e : "" + e;
  }
  function o(e) {
    return (
      (e = String(e).toLowerCase()).normalize &&
        (e = e.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
      e
    );
  }
  var s = [
      "Acción",
      "Drama",
      "Comedia",
      "Suspenso",
      "Aventura",
      "Animación",
      "Familiar",
      "Ciencia ficción",
    ],
    l = [],
    d = {
      Destacado: "destacado",
      Película: "pelicula",
      Serie: "serie",
      Gratis: "gratis",
      Infantil: "infantil",
      UHD: "uhd",
      Extra: "extra",
    };
  function c(e, t, a) {
    for (var i = 1; i <= t; i++) {
      var n = s[(a + i) % s.length],
        o = s[(a + i + 3) % s.length];
      l.push({
        id: l.length + 1,
        title: e + " demo " + r(i),
        category: d[e] || "",
        score: (7.9 + ((a + i) % 16) / 10).toFixed(1),
        year: 2018 + ((a + i) % 7),
        duration:
          1 + ((a + i) % 2) + " h " + (10 + ((7 * a + 5 * i) % 45)) + " min",
        genres: n === o ? [n] : [n, o],
        director: "Director demo " + r(i),
        actors: "Actor demo " + r(i) + ", Actriz demo " + r(i + 1),
        synopsis:
          "Sinopsis de demostración para " +
          e.toLowerCase() +
          " demo " +
          r(i) +
          '. Este texto sólo existe para comprobar el recorte a dos líneas, el interlineado y la sangría de la etiqueta "Sinopsis :" definidos en activity_voddetails.',
        kind: e.toLowerCase(),
      });
    }
  }
  (c("Destacado", 5, 1),
    c("Película", 7, 2),
    c("Serie", 7, 3),
    c("Gratis", 5, 4),
    c("Infantil", 8, 5),
    c("UHD", 4, 6),
    c("Extra", 4, 7));
  var p = window.XUPERTV_API || {},
    u = /[?&]service=([^&]+)/.exec(window.location.search || "");
  u && (p.devServiceUrl = decodeURIComponent(u[1]));
  var v = { loading: !1, source: "demo", error: null },
    f = { refreshing: !1, lastSync: 0, roots: 0, error: null },
    h = ["featured", "movies", "series", "anime", "kids", "free"];
  function m(e) {
    if ("[object Array]" === Object.prototype.toString.call(e)) return e;
    if (!e) return [];
    for (
      var t = [
          "items",
          "movies",
          "results",
          "recommendList",
          "movieList",
          "totalMovieList",
          "programList",
          "data",
        ],
        a = 0;
      a < t.length;
      a++
    ) {
      if ("[object Array]" === Object.prototype.toString.call(e[t[a]]))
        return e[t[a]];
      if (e[t[a]] && "object" == typeof e[t[a]]) {
        var i = m(e[t[a]]);
        if (i.length) return i;
      }
    }
    return [];
  }
  function g(e) {
    var t = p[e + "Url"];
    if (t) return String(t);
    var a = String(p.baseUrl || "").replace(/\/$/, ""),
      i = String(p[e + "Path"] || "");
    return a && i ? a + ("/" === i.charAt(0) ? i : "/" + i) : "";
  }
  function y() {
    var e = p.session || {};
    return {
      userId: String(e.userId || ""),
      userToken: String(e.userToken || ""),
      portalCode: String(e.portalCode || ""),
      homePageCode: String(e.homePageCode || ""),
      version: String(e.version || "4.34.4"),
    };
  }
  function b() {
    var e = y();
    return !!(e.userId && e.userToken && e.portalCode);
  }
  function C(e, t) {
    var a = y();
    return "catalog" === e
      ? {
          userId: a.userId,
          userToken: a.userToken,
          portalCode: a.portalCode,
          homePageCode: a.homePageCode,
          version: a.version,
        }
      : "search" === e
        ? {
            userToken: a.userToken,
            userId: a.userId,
            portalCode: a.portalCode,
            columnId: "",
            value: t || "",
            type: "",
            pageSize: 20,
            pageNum: 1,
            filter: "",
          }
        : {
            userToken: a.userToken,
            userId: a.userId,
            portalCode: a.portalCode,
            programId: t,
          };
  }
  function w(e) {
    return e
      ? ((e = String(e)),
        /^https?:\/\//i.test(e) || 0 === e.indexOf("data:")
          ? e
          : p.imageBaseUrl
            ? String(p.imageBaseUrl).replace(/\/$/, "") +
              "/" +
              e.replace(/^\//, "")
            : e)
      : "";
  }
  function S(e, t) {
    return null == e || "" === e ? t : String(e);
  }
  function x(e) {
    return (
      !!e &&
      ("teleplay" === e.type ||
        "series" === e.type ||
        "serie" === e.kind ||
        (e.category && -1 !== e.category.indexOf("serie")) ||
        (e.episodes && e.episodes.length > 0) ||
        (e.seasons && e.seasons.length > 0) ||
        (e.volumeCount && parseInt(e.volumeCount, 10) > 1))
    );
  }
  function T(e, t) {
    var a = (e = e || {}).genres || e.genre || [];
    ("string" == typeof a && (a = a.split(",")),
      "[object Array]" !== Object.prototype.toString.call(a) && (a = []));
    for (var i = [], n = 0; n < a.length; n++)
      i.push("string" == typeof a[n] ? a[n] : a[n].name || "");
    var r = e.duration || e.runtime || e.runtimeMinutes || "";
    "number" == typeof r &&
      (r = Math.floor(r / 60) + " h " + (r % 60) + " min");
    var s = S(e.type || e.programType, ""),
      l =
        "teleplay" === s ||
        "series" === s ||
        "serie" === o(S(e.kind || "", "")) ||
        -1 !== o(S(e.category || "", "")).indexOf("serie") ||
        (e.episodes && e.episodes.length > 0) ||
        (e.seasons && e.seasons.length > 0) ||
        (e.volumeCount && parseInt(e.volumeCount, 10) > 1) ||
        (e.volumnCount && parseInt(e.volumnCount, 10) > 1);
    return {
      id: S(
        e.id || e.vodId || e.programId || e.program_id || e.tmdb_id,
        "api-" + t
      ),
      title: S(
        e.title ||
          e.name ||
          e.programName ||
          e.programTitle ||
          e.original_title,
        "Sin título"
      ),
      category: o(
        S(e.category || e.section || e.collection || e.homeSection, "")
      ),
      score: S(
        e.score || e.vote_average || e.rating || e.movieRate || e.programScore,
        "—"
      ),
      year: S(
        e.year ||
          e.release_year ||
          e.programYear ||
          (e.releaseDate || e.releaseTime || e.release_date || "").slice(0, 4),
        "—"
      ),
      duration: S(r, "—"),
      genres: i.length ? i : ["Sin clasificar"],
      director: S(e.director, "—"),
      actors: S(e.actors || e.actorDisplay || e.cast, "—"),
      synopsis: S(
        e.synopsis || e.overview || e.description || e.programUpdateContent,
        "Sin sinopsis disponible."
      ),
      kind: l ? "serie" : S(e.kind || e.media_type, "película"),
      poster: w(
        e.posterUrl ||
          e.poster_url ||
          e.poster ||
          e.poster_path ||
          e.image ||
          e.imageUrl ||
          e.cover ||
          e.coverUrl ||
          e.programPoster ||
          e.programImage
      ),
      landscape: w(
        e.landscapeUrl ||
          e.landscape_url ||
          e.landscape ||
          e.wideImage ||
          e.bannerImage
      ),
      backdrop: w(
        e.backdropUrl || e.backdrop_url || e.backdrop || e.backdrop_path
      ),
      streamUrl: e.streamUrl || e.stream_url || "",
      type: s || (l ? "teleplay" : "movie"),
      row: S(e.row, ""),
      alias: S(e.alias, ""),
      country: S(e.country || e.originalCountry, ""),
      releaseDate: S(e.releaseDate || e.releaseTime, ""),
      tagline: S(e.tagline || e.viewPoint, ""),
      volumeCount: parseInt(e.volumeCount || e.volumnCount, 10) || 0,
      updateCount: parseInt(e.updateCount, 10) || 0,
      episodes: e.episodes || [],
      seasons: e.seasons || [],
      moreAudio: void 0 !== e.moreAudio ? e.moreAudio : 0,
      moreSubtitle: void 0 !== e.moreSubtitle ? e.moreSubtitle : 0,
      _portal:
        !0 === e.portal ||
        !0 === e._portal ||
        (p && "portal" === p.mode && String(e.id || "").length > 10),
    };
  }
  function _(e, t, a) {
    a = a || {};
    var i = new XMLHttpRequest(),
      n = !1,
      r = parseInt(p.timeoutMs, 10) || 1e4;
    function o(e, a) {
      n || ((n = !0), t(e, a));
    }
    (i.open(a.method || "GET", e, !0), (i.timeout = r));
    var s = p.headers || {};
    for (var l in s)
      Object.prototype.hasOwnProperty.call(s, l) && i.setRequestHeader(l, s[l]);
    (void 0 === a.body ||
      s["Content-Type"] ||
      s["content-type"] ||
      i.setRequestHeader("Content-Type", "application/json;charset=utf-8"),
      (i.onreadystatechange = function () {
        if (4 === i.readyState)
          if (i.status < 200 || i.status >= 300) o("HTTP " + i.status);
          else
            try {
              o(null, JSON.parse(i.responseText));
            } catch (e) {
              o("La API no devolvió JSON válido");
            }
      }),
      (i.onerror = function () {
        o("Error de red o CORS");
      }),
      (i.ontimeout = function () {
        o("Tiempo de espera agotado");
      }));
    try {
      i.send(void 0 === a.body ? null : JSON.stringify(a.body));
    } catch (e) {
      o(e.message || "No se pudo iniciar la petición");
    }
  }
  function k(e) {
    if (!e || !x(e)) return null;
    var t = String(e.title || e.alias || "")
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+$/g, ""),
      a =
        /^(.*?)(?:\s*[-–:|]?\s*(?:temporada|season)\s*(\d+)|\s*[-–:|]?\s*[st]\s*0?(\d+))\s*$/i.exec(
          t
        );
    if (!a || !a[1]) return null;
    var i = parseInt(a[2] || a[3], 10);
    return !i || i > 99 ? null : { title: a[1].replace(/\s+$/, ""), number: i };
  }
  function L(e, a, i) {
    if (!e.length) return !1;
    for (var r = {}, s = 0; s < l.length; s++) r[String(l[s].id)] = l[s];
    l.splice(0, l.length);
    for (var d = [], c = 0; c < e.length; c++) {
      var p = T(e[c], c + 1);
      i && !1 !== e[c].portal && (p._portal = !0);
      var u = r[String(p.id)];
      (u &&
        (u.episodes && (p.episodes = u.episodes),
        u.seasons && (p.seasons = u.seasons),
        u._detailsLoaded && (p._detailsLoaded = !0),
        !p.streamUrl && u.streamUrl && (p.streamUrl = u.streamUrl)),
        d.push(p));
    }
    for (
      var f = (function (e) {
          for (var t = {}, a = [], i = 0; i < e.length; i++) {
            var n = k(e[i]);
            n
              ? (t[(r = o(n.title))] || (t[r] = { title: n.title, items: [] }),
                t[r].items.push({ item: e[i], number: n.number }))
              : a.push(e[i]);
          }
          for (var r in t)
            if (t.hasOwnProperty(r)) {
              var s = t[r];
              if (s.items.length < 2) a.push(s.items[0].item);
              else {
                s.items.sort(function (e, t) {
                  return e.number - t.number;
                });
                var l = s.items[0].item,
                  d = {};
                ((l._catalogSeasons = []),
                  (l._seriesGroup = !0),
                  (l._seriesTitle = s.title),
                  (l.title = s.title),
                  (l.alias = s.title),
                  (l.seasons = []));
                for (var c = 0; c < s.items.length; c++) {
                  for (
                    var p = s.items[c],
                      u = String(p.item.category || "").split(","),
                      v = 0;
                    v < u.length;
                    v++
                  )
                    u[v] && (d[u[v]] = !0);
                  var f = { id: p.item.id, number: p.number, title: s.title };
                  (l._catalogSeasons.push(f), l.seasons.push(f));
                }
                ((l.category = Object.keys(d).join(",")), a.push(l));
              }
            }
          return a;
        })(d),
        h = 0;
      h < f.length;
      h++
    )
      l.push(f[h]);
    if (X.detail) {
      for (var m = !1, g = 0; g < l.length; g++)
        if (String(l[g].id) === String(X.detail.id)) {
          ((X.detail = l[g]), (m = !0));
          break;
        }
      m || (X.detail = l[0]);
    }
    return (
      (v.source = a),
      (v.error = null),
      (function () {
        if (Ve) {
          var e = t("home-tabs"),
            a = !(
              !e ||
              !e.classList.contains("is-expanded") ||
              e.classList.contains("is-collapsed")
            ),
            i = !(!X.focus || void 0 === X.focus._tab),
            r = !(!X.focus || !n(X.focus, "#home-notify")),
            o = !(!X.focus || !n(X.focus, ".home-page"));
          if (
            ((He = []), (Ue = []), gt(), bt(X.tab, !1), "home" === X.screen)
          ) {
            if (i && Ue[X.tab]) rt(Ue[X.tab], !0);
            else if (r) {
              var s = ot(t("home-notify"));
              s && rt(s, !0);
            } else if (o) {
              var l = He[z[X.tab].page],
                d = l ? ot(l) : null;
              d && rt(d, !0);
            }
            if (a && e) {
              (e.classList.add("is-expanded"),
                e.classList.remove("is-collapsed"));
              var c = document.querySelector(".home-sidebar-bg");
              c &&
                (c.classList.add("is-on"), c.classList.remove("is-collapsed"));
            }
          }
        }
        ce && (_a(), X.searchQuery && Pa());
        X.detail && Ca(X.detail);
      })(),
      !0
    );
  }
  function M() {
    var e = window.XUPERTV_CATALOG;
    return e ? m(e) : [];
  }
  function I() {
    return (
      !window.PalmServiceBridge ||
        (window.webOS && window.webOS.service) ||
        ((window.webOS = window.webOS || {}),
        (window.webOS.service = {
          request: function (e, t) {
            t = t || {};
            var a = new window.PalmServiceBridge();
            a.onservicecallback = function (e) {
              var a;
              try {
                a = JSON.parse(e);
              } catch (t) {
                a = { returnValue: !1, errorText: e };
              }
              !1 === a.returnValue
                ? t.onFailure && t.onFailure(a)
                : t.onSuccess && t.onSuccess(a);
            };
            var i = t.method ? e.replace(/\/$/, "") + "/" + t.method : e;
            return (a.call(i, JSON.stringify(t.parameters || {})), a);
          },
        })),
      !!(window.webOS && window.webOS.service && window.webOS.service.request)
    );
  }
  var E =
    "La TV tiene bloqueado el servicio de XuperTV. Desenchufa la TV 10 segundos y vuelve a abrir la app; si sigue igual, reinstala con el instalador.";
  /* Puerto de la API local del servicio. Se usa solo como respaldo cuando
     Luna deniega la llamada (webOS 3.x con comandos "public": false). */
  var SERVICE_HTTP_PORT = 8910;
  function Ph(e, t, a, i) {
    var n = !1,
      r = null,
      o = null,
      s = i || parseInt(p.timeoutMs, 10) || 2e4;
    function l(e, t) {
      n || ((n = !0), r && (clearTimeout(r), (r = null)), a(e, t));
    }
    r = setTimeout(function () {
      try {
        o && o.abort();
      } catch (e) {}
      l("El servicio no respondió por la vía local", null);
    }, s + 1e3);
    try {
      (o = new XMLHttpRequest()).open(
        "GET",
        "http://127.0.0.1:" +
          SERVICE_HTTP_PORT +
          "/" +
          encodeURIComponent(e) +
          "?q=" +
          encodeURIComponent(JSON.stringify(t || {})),
        !0
      );
      ((o.timeout = s),
        (o.onreadystatechange = function () {
          var e, r;
          if (4 === o.readyState) {
            if (o.status < 200 || o.status >= 300)
              return l("Servicio local: HTTP " + o.status, null);
            try {
              e = JSON.parse(o.responseText);
            } catch (t) {
              return l("El servicio local no devolvió JSON válido", null);
            }
            return !1 === e.returnValue
              ? l(e.errorText || "Error del servicio", null)
              : l(null, e);
          }
        }),
        (o.onerror = function () {
          l("No se pudo hablar con el servicio de la TV", null);
        }),
        (o.ontimeout = function () {
          l("El servicio no respondió por la vía local", null);
        }),
        o.send(null));
    } catch (e) {
      l(e.message || "No se pudo hablar con el servicio de la TV", null);
    }
  }
  var A = { live: null, vod: null };
  function D(e, t) {
    try {
      if (!t) return;
      var a = t.url || "";
      if (!/^https?:\/\//i.test(a)) return;
      if (/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/i.test(a)) return;
      A[e] = { url: a, headers: t.headers || {} };
    } catch (e) {}
  }
  function P(e, t, a, i) {
    var n = p.serviceId || "com.webosflux.xuptertv.fidelity.service",
      r = !1,
      o = i || parseInt(p.timeoutMs, 10) || 2e4,
      s = null,
      w = !1;
    function l(err, data) {
      var i, n;
      if (r) return;
      /* Si Luna deniega el método (webOS 3.x), reintentar una sola vez por la
         API HTTP local del servicio en lugar de dejar al usuario sin nada. */
      if (err && !w && /denied|permission|not permitted/i.test(String(err))) {
        w = !0;
        return void Ph(e, t, l, o);
      }
      ((r = !0),
        s && (clearTimeout(s), (s = null)),
        a(
          err
            ? ((i = err),
              (n = String(null == i ? "" : i)),
              /denied|permission|not permitted/i.test(n)
                ? E + " (" + n + ")"
                : n)
            : err,
          data
        ));
    }
    if (
      ((s = setTimeout(function () {
        l(
          "El servicio de la TV no respondió en " +
            Math.round(o / 1e3) +
            " s. Desenchufa la TV de la corriente 10 segundos y vuelve a abrir la app.",
          null
        );
      }, o + 1e3)),
      I() && window.PalmServiceBridge)
    )
      try {
        return (
          window.webOS.service.request("luna://" + n, {
            method: e,
            parameters: t || {},
            timeout: i || parseInt(p.timeoutMs, 10) || 2e4,
            onSuccess: function (e) {
              l(null, e);
            },
            onFailure: function (e) {
              l((e && e.errorText) || "Error del servicio XuperTV", null);
            },
          }),
          !0
        );
      } catch (e) {
        if (!p.devServiceUrl)
          return (
            l("Error comunicando con el servicio: " + (e.message || e), null),
            !1
          );
      }
    return p.devServiceUrl
      ? (_(
          String(p.devServiceUrl).replace(/\/$/, "") +
            "/" +
            e +
            "?" +
            (function (e) {
              var t = [];
              for (var a in e)
                Object.prototype.hasOwnProperty.call(e, a) &&
                  t.push(
                    encodeURIComponent(a) + "=" + encodeURIComponent(e[a])
                  );
              return t.join("&");
            })(t || {}),
          function (e, t) {
            l(e, t);
          },
          null
        ),
        !0)
      : (l("El servicio XuperTV no está disponible", null), !1);
  }
  function O(e) {
    var t = {},
      a = [],
      i = {};
    function n(e) {
      if (e && e.id) {
        var n = String(e.id);
        if (t[n]) {
          var r = t[n];
          for (var o in e)
            Object.prototype.hasOwnProperty.call(e, o) &&
              "" !== e[o] &&
              "—" !== e[o] &&
              null !== e[o] &&
              void 0 !== e[o] &&
              (r[o] = e[o]);
        } else ((t[n] = e), a.push(n));
        var s = String(e.category || "").split(",");
        i[n] = i[n] || {};
        for (var l = 0; l < s.length; l++) s[l] && (i[n][s[l]] = !0);
      }
    }
    for (var r = 0; r < h.length; r++)
      for (var o = e[h[r]] || [], s = 0; s < o.length; s++)
        ((o[s].portal = !0), n(o[s]));
    if (a.length) {
      for (var l = [], d = 0; d < a.length; d++) {
        var c = t[a[d]];
        ((c.category = Object.keys(i[a[d]]).join(",")), l.push(c));
      }
      for (
        var p = (function () {
            for (var e = M(), t = [], a = 0; a < e.length; a++)
              if (e[a] && e[a].streamUrl) {
                var i = {};
                for (var n in e[a])
                  Object.prototype.hasOwnProperty.call(e[a], n) &&
                    (i[n] = e[a][n]);
                ((i.category = "demo"), (i.portal = !1), t.push(i));
              }
            return t;
          })(),
          u = 0;
        u < p.length;
        u++
      )
        l.push(p[u]);
      l.length && L(l, "portal", !0);
    }
  }
  function q() {
    if (!f.refreshing) {
      ((f.refreshing = !0), (f.error = null));
      var e = {},
        t = 0,
        a = !1;
      !(function i() {
        if (t >= h.length)
          return (
            (f.refreshing = !1),
            (f.lastSync = Date.now()),
            O(e),
            a &&
              f.retryTimer &&
              (clearTimeout(f.retryTimer), (f.retryTimer = null)),
            void (
              a ||
              f.retryTimer ||
              ((f.error =
                f.error || "El portal de XuperTV no respondió desde tu red"),
              Yt(
                "El portal de XuperTV no respondió. Reintentando en 20 segundos…"
              ),
              (f.retryTimer = setTimeout(function () {
                ((f.retryTimer = null), q());
              }, 2e4)))
            )
          );
        var n = h[t++],
          r = function (t) {
            P("home", { root: n }, function (o, s) {
              if (!o && s && !1 !== s.returnValue && s.items && s.items.length)
                return ((e[n] = s.items), f.roots++, (a = !0), i());
              t < 2
                ? setTimeout(function () {
                    r(t + 1);
                  }, 900 * t)
                : (o && (f.error = o), i());
            });
          };
        r(1);
      })();
    }
  }
  function N() {
    var e,
      t = (e = window.XUPERTV_PORTAL) ? m(e) : [];
    (t.length && L(t, "portal-snapshot", !0),
      !1 !== p.refresh
        ? q()
        : t.length || (v.error = "Sin snapshot del portal"));
  }
  function R(e, t) {
    return L(M(), e || "bundled")
      ? (t && (v.error = t), !0)
      : ((v.error = t || "No hay catálogo local ni remoto"), !1);
  }
  function V() {
    if (p.enabled)
      if ("portal" !== p.mode)
        if ("static" !== p.mode) {
          var e = g("catalog");
          "xuper" !== p.mode || b()
            ? e
              ? ((v.loading = !0),
                _(
                  e,
                  function (e, t) {
                    v.loading = !1;
                    var a = (function (e) {
                      if (!e || "object" != typeof e) return "";
                      var t = e.returnCode || e.code || e.errorCode || "",
                        a = e.errorMessage || e.message || e.msg || "";
                      return t || a
                        ? (t ? String(t) + ": " : "") +
                            (a ? String(a) : "La API rechazó la petición")
                        : "";
                    })(t);
                    if (e || a || !L(m(t), "api")) {
                      var i = e || a || "La API no devolvió películas";
                      R("bundled-fallback", i) || (v.error = i);
                    }
                  },
                  "xuper" === p.mode
                    ? { method: "POST", body: C("catalog") }
                    : null
                ))
              : p.useBundledCatalog
                ? R("bundled", null)
                : (v.error = "Falta baseUrl/catalogUrl del catálogo autorizado")
            : (v.error =
                "Falta la sesión XuperTV (userId, userToken y portalCode)");
        } else R("bundled", null);
      else N();
  }
  function H(e, t) {
    var a = e && e._seriesGroup ? e.id : null,
      i = e && e._seriesGroup ? e._seriesTitle : null,
      n = T(t, e.id);
    for (var r in n)
      Object.prototype.hasOwnProperty.call(n, r) &&
        "—" !== n[r] &&
        "" !== n[r] &&
        "Sin sinopsis disponible." !== n[r] &&
        (e[r] = n[r]);
    null !== a &&
      ((e.id = a),
      (e.title = i),
      (e.alias = i),
      (e.seasons = e._catalogSeasons || e.seasons));
  }
  function U(e, t) {
    if (((t = t || function () {}), !e)) return t(null);
    if (e._detailsLoaded) return t(e);
    if (e._detailLoading)
      return (
        (e._detailWait = e._detailWait || []),
        void e._detailWait.push(t)
      );
    if ("portal" === p.mode && e._portal)
      return (
        (e._detailLoading = !0),
        (e._detailWait = [t]),
        void P("detail", { contentId: e.id }, function (t, a) {
          if (
            ((e._detailLoading = !1), !t && a && !1 !== a.returnValue && a.item)
          ) {
            if (
              (H(e, a.item),
              (e.episodes = a.episodes || []),
              (e.seasons = e._catalogSeasons || a.seasons || []),
              e.seasonId || (e.seasonId = e.id),
              e.seasons &&
                e.seasons.length &&
                e.seasons.sort(function (e, t) {
                  return (
                    (parseInt(e.number, 10) || 0) -
                    (parseInt(t.number, 10) || 0)
                  );
                }),
              (!e.seasons || !e.seasons.length) && x(e))
            ) {
              var i = 1,
                n =
                  /S(\d+)/i.exec(e.alias || "") ||
                  /T(\d+)/i.exec(e.title || "");
              (n && (i = parseInt(n[1], 10) || 1),
                (e.seasons = [{ id: e.id, number: i }]));
            }
            if (e.seasons && e.seasons.length) {
              for (var r = 0, o = 0; o < e.seasons.length; o++)
                if (e.seasons[o].id === e.id) {
                  r = o;
                  break;
                }
              X.detailSeason = r;
            }
            (e.episodes &&
              e.episodes.length &&
              !X.detailEpisode &&
              (X.detailEpisode = e.episodes[0]),
              dn(e),
              (e._detailsLoaded = !0));
          } else
            ((e._detailsLoaded = !0),
              e.episodes || (e.episodes = []),
              e.seasons || (e.seasons = []));
          var s = e._detailWait || [];
          e._detailWait = [];
          for (var l = s.length > 0, d = 0; d < s.length; d++) s[d](e);
          X.detail === e &&
            "detail" === X.screen &&
            (Ca(e),
            l || (xe && xe.src && !xe.paused) || Jr(e, X.detailEpisode));
        })
      );
    var a = g("detail");
    return p.enabled && a && ("xuper" !== p.mode || b())
      ? ((e._detailLoading = !0),
        void _(
          a.replace("{id}", encodeURIComponent(e.id)),
          function (a, i) {
            if (((e._detailLoading = !1), !a)) {
              var n = m(i),
                r = n.length ? n[0] : i && (i.item || i.movie || i);
              r &&
                "object" == typeof r &&
                (H(e, r),
                (e._detailsLoaded = !0),
                X.detail === e &&
                  "detail" === X.screen &&
                  (Ca(e),
                  (xe && xe.src && !xe.paused) || Jr(e, X.detailEpisode)));
            }
            t(e);
          },
          "xuper" === p.mode
            ? { method: "POST", body: C("detail", e.id) }
            : null
        ))
      : t(e);
  }
  var F = [],
    B = {
      tv: '<svg viewBox="0 0 33 33"><rect x="3.5" y="7" width="26" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M11 24.5v3h11v-3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
      thumb:
        '<svg viewBox="0 0 33 33"><path d="M12 15.5V28H7.6A2.6 2.6 0 0 1 5 25.4v-7.3a2.6 2.6 0 0 1 2.6-2.6H12z" fill="currentColor"/><path d="M14 15.6l4.3-9.2a2.2 2.2 0 0 1 4 1.6V13h5.6a2.9 2.9 0 0 1 2.8 3.6l-2 9A3.4 3.4 0 0 1 25.4 28H14z" fill="currentColor"/></svg>',
      film: '<svg viewBox="0 0 33 33"><circle cx="16.5" cy="16.5" r="11.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="16.5" cy="16.5" r="2.4" fill="currentColor"/><circle cx="16.5" cy="9.5" r="2.1" fill="currentColor"/><circle cx="16.5" cy="23.5" r="2.1" fill="currentColor"/><circle cx="9.5" cy="16.5" r="2.1" fill="currentColor"/><circle cx="23.5" cy="16.5" r="2.1" fill="currentColor"/></svg>',
      strip:
        '<svg viewBox="0 0 33 33"><rect x="4" y="7" width="25" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 7v19M24 7v19" stroke="currentColor" stroke-width="1.8"/><rect x="5.6" y="9" width="2.4" height="2.6" fill="currentColor"/><rect x="5.6" y="15.2" width="2.4" height="2.6" fill="currentColor"/><rect x="5.6" y="21.4" width="2.4" height="2.6" fill="currentColor"/><rect x="25" y="9" width="2.4" height="2.6" fill="currentColor"/><rect x="25" y="15.2" width="2.4" height="2.6" fill="currentColor"/><rect x="25" y="21.4" width="2.4" height="2.6" fill="currentColor"/></svg>',
      kids: '<svg viewBox="0 0 33 33"><circle cx="8.6" cy="8.6" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="24.4" cy="8.6" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="16.5" cy="18" r="9.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="13" cy="17" r="1.5" fill="currentColor"/><circle cx="20" cy="17" r="1.5" fill="currentColor"/><ellipse cx="16.5" cy="21.6" rx="2.4" ry="1.7" fill="currentColor"/></svg>',
      anime:
        '<svg viewBox="0 0 33 33"><circle cx="8.5" cy="9" r="4.5" fill="currentColor"/><circle cx="24.5" cy="9" r="4.5" fill="currentColor"/><path d="M16.5 9c5.8 0 10.5 4.6 10.5 10.3 0 5.7-4.7 9.7-10.5 9.7S6 25 6 19.3C6 13.6 10.7 9 16.5 9z" fill="currentColor"/><circle cx="12.5" cy="18" r="1.6" fill="#0b0b0b"/><circle cx="20.5" cy="18" r="1.6" fill="#0b0b0b"/><ellipse cx="16.5" cy="23" rx="3" ry="2" fill="#0b0b0b"/></svg>',
      compass:
        '<svg viewBox="0 0 33 33"><circle cx="16.5" cy="16.5" r="11.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M22 11l-3.2 7.8L11 22l3.2-7.8z" fill="currentColor"/></svg>',
      novel:
        '<svg viewBox="0 0 33 33"><path d="M5 6.5h9.5c2.2 0 3.7 1 4.5 2.3.8-1.3 2.3-2.3 4.5-2.3H28v20h-5.5c-2.1 0-3.4.6-4.5 1.8-1.1-1.2-2.4-1.8-4.5-1.8H5z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M18 9v19" stroke="currentColor" stroke-width="2.2"/></svg>',
      history:
        '<svg viewBox="0 0 33 33"><circle cx="16.5" cy="17" r="10.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16.5 10.5V17l5 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8 7v6h6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
    },
    z = [
      { label: "TV", page: 0, icon: "tv" },
      { label: "DESTACADOS", page: 1, icon: "thumb" },
      { label: "PELICULA", page: 2, icon: "film" },
      { label: "SERIES", page: 3, icon: "strip" },
      { label: "KIDS", page: 4, icon: "kids" },
      { label: "ANIME", page: 5, icon: "anime" },
      { label: "NOVELAS", page: 6, icon: "novel" },
      { label: "EXPLORAR", page: 7, icon: "compass" },
      { label: "HISTORIAL", page: -1, icon: "history", action: "history" },
    ],
    j = [
      {
        id: "profile",
        label: "Mi cuenta",
        desc: "Tu perfil en este televisor",
        group: "Tu cuenta",
      },
      {
        id: "history",
        label: "Mi lista",
        desc: "Historial y favoritos",
        group: "Tu cuenta",
      },
      {
        id: "addons",
        label: "Agregar Addons",
        desc: "Anime, Cine, Novelas y TDT",
        group: "Contenido",
      },
      {
        id: "share",
        label: "Compartir APP",
        desc: "Instálala en otra TV",
        group: "Aplicación",
      },
      {
        id: "playback",
        label: "Configuración global",
        desc: "Subtítulos y preferencias",
        group: "Aplicación",
      },
      {
        id: "parent",
        label: "Control parental",
        desc: "Bloqueo de contenido adulto",
        group: "Aplicación",
      },
      {
        id: "display",
        label: "Pantalla y compatibilidad",
        desc: "Ajuste para TVs con imagen recortada",
        group: "Aplicación",
      },
      {
        id: "netdiag",
        label: "Diagnóstico",
        desc: "Pruebas de red y streaming",
        group: "Sistema",
      },
      {
        id: "feedback",
        label: "Ayuda y Feedback",
        desc: "Comunidad y soporte",
        group: "Sistema",
      },
      {
        id: "about",
        label: "Sobre nosotros",
        desc: "Versión y actualizaciones",
        group: "Sistema",
      },
    ],
    W = {
      profile:
        '<svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="5"/><path d="M6 27c.7-6 4.3-9 10-9s9.3 3 10 9"/></svg>',
      history:
        '<svg viewBox="0 0 32 32"><rect x="4" y="4" width="9" height="9"/><rect x="19" y="4" width="9" height="9"/><rect x="4" y="19" width="9" height="9"/><rect x="19" y="19" width="9" height="9"/></svg>',
      addons:
        '<svg viewBox="0 0 32 32"><rect x="5" y="5" width="9" height="9" rx="1.5"/><rect x="18" y="5" width="9" height="9" rx="1.5"/><rect x="5" y="18" width="9" height="9" rx="1.5"/><path d="M22.5 18v9M18 22.5h9"/></svg>',
      share:
        '<svg viewBox="0 0 32 32"><circle cx="8" cy="16" r="3"/><circle cx="24" cy="7" r="3"/><circle cx="24" cy="25" r="3"/><path d="M10.6 14.5l10.8-6M10.6 17.5l10.8 6"/></svg>',
      parent:
        '<svg viewBox="0 0 32 32"><rect x="7" y="14" width="18" height="14" rx="2"/><path d="M11 14V10a5 5 0 0 1 10 0v4"/><path d="M16 19v4"/></svg>',
      display:
        '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="18" rx="2"/><path d="M10 28h12M16 24v4"/><path d="M8 10h16v10H8z"/></svg>',
      playback:
        '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="20" rx="3"/><path d="M13 11l8 5-8 5z"/></svg>',
      netdiag:
        '<svg viewBox="0 0 32 32"><path d="M3 13a19 19 0 0 1 26 0"/><path d="M8 18a12 12 0 0 1 16 0"/><path d="M13 23a6 6 0 0 1 6 0"/><circle cx="16" cy="27.5" r="1.2"/></svg>',
      feedback:
        '<svg viewBox="0 0 32 32"><path d="M6 4h15l5 5v19H6z"/><path d="M20 4v6h6M10 16h12M10 21h8"/></svg>',
      about:
        '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/><path d="M16 14v8M16 10h.1"/></svg>',
    },
    X = {
      screen: "welcome",
      tab: 0,
      channel: 0,
      focus: null,
      detail: null,
      detailReturn: null,
      detailRange: 0,
      detailSeason: 0,
      detailNeedsRebuild: !1,
      playerReturn: null,
      playerMode: "live",
      playerItem: null,
      playerEpisode: null,
      playerSeasonIndex: 0,
      episodeBrowserOpen: !1,
      categoryPickerOpen: !1,
      browserSeason: 0,
      episodeBrowserPage: 0,
      audioPreferenceCode: "",
      resumePosition: 0,
      streamError: "",
      streamMode: "normal",
      trackIndex: 0,
      channelsOpen: !1,
      infobar: !0,
      infoTimer: null,
      searchQuery: "",
      searchNumeric: !1,
      searchSeq: 0,
      searchFocus: null,
      playback: {
        streamMode: "normal",
        screen: 0,
        audio: 0,
        subLang: 0,
        size: 0,
        style: 0,
        subtitle: !0,
      },
      crOn: !1,
      favs: {},
      adultEnabled: !1,
      liveFavorites: {},
    },
    $ = "xuper_local_profile_v1",
    G = "xuper_global_playback_v1",
    Q = { id: "", createdAt: 0, history: [] };
  function J(e, t) {
    try {
      var a = localStorage.getItem(e);
      return a ? JSON.parse(a) : t;
    } catch (e) {
      return t;
    }
  }
  function K(e, t) {
    try {
      localStorage.setItem(e, JSON.stringify(t));
    } catch (e) {}
  }
  function Y() {
    K(G, X.playback);
  }
  function Z(e) {
    if (!e || !e.id) return !1;
    var t = String(e.id),
      a = !X.favs[t];
    return (
      a ? (X.favs[t] = !0) : delete X.favs[t],
      (Q.favs = X.favs),
      K($, Q),
      a
    );
  }
  function liveChannelKey(e) {
    return e
      ? String(e.channelCode || e.streamUrl || e.id || e.index || e.name || "")
      : "";
  }
  function isAdultLiveChannel(e) {
    var t = e || {},
      a = [
        t.name || "",
        t.category || "",
        t.group || "",
        t.groupTitle || "",
        t.tags || "",
      ].join(" ");
    return /(^|[^a-z])(xxx|adult|porno|porn|sex|erotic|onlyfans|18\+|\+18)([^a-z]|$)/i.test(a);
  }
  function isVisibleLiveChannel(e) {
    var t = String(liveSearchText || "").replace(/^\s+|\s+$/g, "");
    return !!(
      e &&
      (X.adultEnabled || !isAdultLiveChannel(e)) &&
      (!liveFavoritesOnly || !!X.liveFavorites[liveChannelKey(e)]) &&
      (!t || o((e.name || "") + " " + (e.category || "")).indexOf(o(t)) >= 0)
    );
  }
  function toggleLiveFavorite(e) {
    var t = liveChannelKey(e);
    if (!t) return !1;
    var a = !X.liveFavorites[t];
    return (
      a ? (X.liveFavorites[t] = !0) : delete X.liveFavorites[t],
      (Q.liveFavorites = X.liveFavorites),
      K($, Q),
      a
    );
  }
  !(function () {
    var e = J(G, null);
    if (e)
      for (var t in X.playback)
        X.playback.hasOwnProperty(t) &&
          void 0 !== e[t] &&
          (X.playback[t] = e[t]);
    var a = J($, null);
    (a && a.id
      ? ((Q = a).history && Q.history.length) || (Q.history = [])
      : ((Q.id = "TV-" + String(Date.now()).slice(-8)),
        (Q.createdAt = Date.now()),
        K($, Q)),
      Q.favs || (Q.favs = {}),
      Q.liveFavorites || (Q.liveFavorites = {}),
      Q.uiScaleMode || (Q.uiScaleMode = "auto"),
      (X.favs = Q.favs),
      (X.liveFavorites = Q.liveFavorites),
      (X.adultEnabled = !0 === Q.adultEnabled));
  })();
  var ee,
    te,
    ae,
    ie,
    ne,
    re,
    oe,
    se,
    le,
    de,
    ce,
    pe,
    ue,
    ve,
    fe,
    he,
    me,
    ge,
    ye,
    be,
    Ce,
    we,
    Se,
    xe,
    Te,
    _e,
    ke,
    Le,
    Me,
    Ie,
    Ee,
    Ae,
    De,
    Pe,
    Oe,
    qe,
    Ne,
    Re,
    Ve = !1,
    He = [],
    Ue = [],
    Fe = [],
    Be = [],
    ze = {},
    je = [],
    We = "history",
    Xe = {},
    $e = null,
    Ge = null,
    Qe = null,
    catalogFilterDialog = null,
    catalogFilterReturn = null,
    liveFavoritePrompt = null,
    Je = "",
    Ke = 48,
    Ye = !1,
    Ze = 0,
    et = null,
    tt = null;
  function at(e) {
    if (!e || !e.getBoundingClientRect) return !1;
    if (null === e.offsetParent) return !1;
    var t = e.getBoundingClientRect();
    if (t.width < 1 || t.height < 1) return !1;
    if (X.episodeBrowserOpen) return !!n(e, "#player-episodes");
    if (X.categoryPickerOpen) return !!n(e, "#player-categories");
    if (catalogFilterDialog) return !!n(e, ".catalog-filter-dialog");
    if (liveFavoritePrompt) return !!n(e, ".pc-favorite-confirm");
    if (ji) return !!n(e, "#dialog-playsettings");
    if (Ut) return !!n(e, "#dialog-update");
    if (zi) return !!n(e, "#player-playsetting-view");
    var a = n(e, ".home-page");
    if (a && !a.classList.contains("is-current")) return !1;
    var i = n(e, ".settings-panel");
    if (i && !i.classList.contains("is-active")) return !1;
    var r = n(e, ".search-hot");
    if (r && r.classList.contains("is-hidden")) return !1;
    var o = n(e, ".search-results");
    if (o && !o.classList.contains("is-active")) return !1;
    var s = n(e, ".player-channels");
    if (s && !s.classList.contains("is-active")) return !1;
    var l = n(e, ".player-infobar");
    return !(l && !l.classList.contains("is-active"));
  }
  function it() {
    for (
      var e = document.querySelectorAll(".focusable"), t = [], a = 0;
      a < e.length;
      a++
    )
      at(e[a]) && t.push(e[a]);
    return t;
  }
  function nt(e) {
    for (var t = n(e, ".scrollable"); t;) {
      var a = e.getBoundingClientRect(),
        i = t.getBoundingClientRect();
      (a.top < i.top
        ? (t.scrollTop -= i.top - a.top + 12)
        : a.bottom > i.bottom && (t.scrollTop += a.bottom - i.bottom + 12),
        t.scrollWidth > t.clientWidth + 1 &&
          (a.left < i.left
            ? (t.scrollLeft -= i.left - a.left + 12)
            : a.right > i.right && (t.scrollLeft += a.right - i.right + 12)),
        (t = n(t.parentNode, ".scrollable")));
    }
  }
  function rt(e, a) {
    if (e)
      if (X.focus !== e) {
        (X.focus && X.focus.classList.remove("is-focused"),
          (X.focus = e),
          e.classList.add("is-focused"),
          e._onFocus && e._onFocus(),
          Nn());
        var i = t("home-tabs");
        if (i && "home" === X.screen) {
          var r = n(e, ".home-tabs");
          (i.classList.toggle("is-expanded", !!r),
            i.classList.toggle("is-collapsed", !r));
          var o = document.querySelector(".home-sidebar-bg");
          o &&
            (o.classList.toggle("is-on", !!r),
            o.classList.toggle("is-collapsed", !r));
          var s = t("screen-home");
          s && s.classList.toggle("is-rail-open", !!r);
        }
        (a || nt(e), wt());
      } else a || nt(e);
  }
  function ot(e) {
    for (var t = e.querySelectorAll(".focusable"), a = 0; a < t.length; a++)
      if (at(t[a])) return t[a];
    return null;
  }
  function st(e) {
    if (X.focus) {
      if (!X.focus._onMove || !X.focus._onMove(e)) {
        for (
          var t = "home" === X.screen && n(X.focus, ".home-page"),
            a = "home" === X.screen && n(X.focus, ".home-tabs"),
            i = it(),
            r = X.focus.getBoundingClientRect(),
            o = r.left + r.width / 2,
            s = r.top + r.height / 2,
            l = null,
            d = 1e9,
            c = 0;
          c < i.length;
          c++
        ) {
          var p = i[c];
          if (
            p !== X.focus &&
            (!t || !n(p, ".home-tabs")) &&
            (!a || n(p, ".home-tabs"))
          ) {
            var u,
              v,
              f,
              h = p.getBoundingClientRect(),
              m = h.left + h.width / 2 - o,
              g = h.top + h.height / 2 - s;
            if ("left" === e) {
              if (m > -4) continue;
              ((u = Math.max(0, r.left - h.right)),
                (v = Math.abs(g)),
                (f = h.bottom > r.top + 2 && h.top < r.bottom - 2));
            } else if ("right" === e) {
              if (m < 4) continue;
              ((u = Math.max(0, h.left - r.right)),
                (v = Math.abs(g)),
                (f = h.bottom > r.top + 2 && h.top < r.bottom - 2));
            } else if ("up" === e) {
              if (g > -4) continue;
              ((u = Math.max(0, r.top - h.bottom)),
                (v = Math.abs(m)),
                (f = h.right > r.left + 2 && h.left < r.right - 2));
            } else {
              if (g < 4) continue;
              ((u = Math.max(0, h.top - r.bottom)),
                (v = Math.abs(m)),
                (f = h.right > r.left + 2 && h.left < r.right - 2));
            }
            var y = u + 2 * v + (f ? 0 : 320);
            y < d && ((d = y), (l = p));
          }
        }
        l ? rt(l) : "left" === e && t && Ue[X.tab] && rt(Ue[X.tab]);
      }
    } else {
      var b = it();
      b.length && rt(b[0]);
    }
  }
  function lt(e) {
    for (var a = document.querySelectorAll(".screen"), i = 0; i < a.length; i++)
      a[i].classList.remove("is-active");
    var n = t("screen-" + e);
    if (
      (n && n.classList.add("is-active"),
      (X.screen = e),
      "player" !== e && X.episodeBrowserOpen && zn(!0),
      "player" !== e && X.categoryPickerOpen && ur(!0),
      "player" !== e && "detail" !== e)
    ) {
      (ji && tr(), zi && On());
      var r = t("screen-player");
      (r && (r.classList.remove("is-mini"), r.classList.remove("is-active")),
        zr(),
        Yi++,
        (pn = []),
        Bi && (Bi.innerHTML = ""));
    }
    wt();
  }
  var dt = 0;
  function ct() {
    var e = Date.now();
    if (!(e - dt < 250))
      if (((dt = e), "welcome" !== X.screen))
        if (ji) tr();
        else {
          if (catalogFilterDialog) return void closeCatalogFilter();
          if (liveFavoritePrompt) return void closeLiveFavoriteConfirm();
          if ("player" === X.screen)
            return Ye
              ? void Ur(!1)
              : liveSearchOpen
                ? void closeLiveChannelSearch()
              : X.categoryPickerOpen
                ? ((dt = Date.now()), void ur())
                : X.episodeBrowserOpen
                  ? ((dt = Date.now()), void zn())
                  : zi
                    ? void On()
                    : void (X.channelsOpen
                        ? ro()
                        : X.infobar
                          ? ui()
                          : X.vodInfobarVisible
                            ? fi()
                            : (function () {
                                (ui(), fi());
                                var e = X.playerReturn;
                                if (e && "detail" === e.screen) {
                                  var a = t("screen-player"),
                                    i = t("screen-detail");
                                  (a &&
                                    (a.classList.add("is-mini"),
                                    a.classList.add("is-active")),
                                    i && i.classList.add("is-active"),
                                    (X.screen = "detail"));
                                  var n = !1;
                                  if (X.detailNeedsRebuild && X.detail) {
                                    ((X.detailNeedsRebuild = !1),
                                      Ca(X.detail),
                                      (n = !0));
                                    var r = de
                                      ? de.querySelector(".detail-season")
                                      : null;
                                    r && rt(r);
                                  } else X.detail && Jn(X.detail);
                                  if (!n)
                                    if (e.focus && at(e.focus)) rt(e.focus);
                                    else {
                                      var o = le
                                        ? le.querySelector(".focusable")
                                        : null;
                                      o && rt(o);
                                    }
                                } else {
                                  zr();
                                  var s = t("screen-player");
                                  (s &&
                                    (s.classList.remove("is-mini"),
                                    s.classList.remove("is-active")),
                                    e && "search" === e.screen
                                      ? (lt("search"), rt(e.focus))
                                      : (lt("home"),
                                        bt(X.tab, !1),
                                        e && e.focus && at(e.focus)
                                          ? rt(e.focus)
                                          : Ue[X.tab] && rt(Ue[X.tab])));
                                }
                              })());
          if ("detail" !== X.screen) {
            if ("search" === X.screen)
              return (
                Da(),
                lt("home"),
                bt(X.tab, !1),
                void (Ue[X.tab] && rt(Ue[X.tab]))
              );
            if ("settings" === X.screen)
              return (
                lt("home"),
                bt(X.tab, !1),
                void (Ue[X.tab] && rt(Ue[X.tab]))
              );
            if ("home" === X.screen) {
              if (0 !== X.tab) return (bt(0, !0), void (Ue[0] && rt(Ue[0])));
              window.webOSTV && window.webOSTV.platformBack
                ? window.webOSTV.platformBack()
                : window.PalmSystem &&
                  window.PalmSystem.platformBack &&
                  window.PalmSystem.platformBack();
            }
          } else {
            if (xa) {
              Ta();
              var a = de ? de.querySelector(".detail-season") : null;
              return void (a && rt(a));
            }
            var i = t("screen-detail");
            if (i && i.classList.contains("is-synopsis-open"))
              return void (function () {
                var e = t("screen-detail");
                if (!e) return;
                var a = !e.classList.contains("is-synopsis-open");
                e.classList.toggle("is-synopsis-open", a);
                var i = document.querySelector(".detail-more");
                i && (i.textContent = a ? "Menos" : "Más");
              })();
            zr();
            var n = t("screen-player");
            n &&
              (n.classList.remove("is-mini"), n.classList.remove("is-active"));
            var r = X.detailReturn;
            r && "search" === r.screen
              ? (lt("search"), rt(r.focus))
              : (lt("home"),
                bt(X.tab, !1),
                r && r.focus && at(r.focus)
                  ? rt(r.focus)
                  : Ue[X.tab] && rt(Ue[X.tab]));
          }
        }
      else vt();
  }
  function pt() {
    X.focus && X.focus._activate && X.focus._activate();
  }
  function ut(e) {
    var t = e.keyCode || e.which,
      a = e.key || "",
      i = !0;
    if ("welcome" === X.screen)
      return (vt(), void (e.preventDefault && e.preventDefault()));
    if (
      461 === t ||
      27 === t ||
      8 === t ||
      "Back" === a ||
      "GoBack" === a ||
      "Escape" === a
    )
      return X.categoryPickerOpen
        ? (ur(),
          e.preventDefault && e.preventDefault(),
          void (e.stopPropagation && e.stopPropagation()))
        : X.episodeBrowserOpen
          ? (zn(),
            e.preventDefault && e.preventDefault(),
            void (e.stopPropagation && e.stopPropagation()))
        : catalogFilterDialog
          ? (closeCatalogFilter(),
            e.preventDefault && e.preventDefault(),
            void (e.stopPropagation && e.stopPropagation()))
          : liveFavoritePrompt
            ? (closeLiveFavoriteConfirm(),
              e.preventDefault && e.preventDefault(),
              void (e.stopPropagation && e.stopPropagation()))
        : Ut
            ? ((dt = Date.now()),
              zt || ea(),
              e.preventDefault && e.preventDefault(),
              void (e.stopPropagation && e.stopPropagation()))
            : Ht
              ? ((dt = Date.now()),
                la(),
                e.preventDefault && e.preventDefault(),
                void (e.stopPropagation && e.stopPropagation()))
              : ji
                ? ((dt = Date.now()),
                  tr(),
                  e.preventDefault && e.preventDefault(),
                  void (e.stopPropagation && e.stopPropagation()))
                : zi
                  ? ((dt = Date.now()),
                    On(),
                    e.preventDefault && e.preventDefault(),
                    void (e.stopPropagation && e.stopPropagation()))
                  : (ct(),
                    e.preventDefault && e.preventDefault(),
                    void (e.stopPropagation && e.stopPropagation()));
    if (X.categoryPickerOpen)
      return (
        37 === t
          ? st("left")
          : 38 === t
            ? st("up")
            : 39 === t
              ? st("right")
              : 40 === t
                ? st("down")
                : 13 === t || 32 === t
                  ? pt()
                  : (i = !1),
        void (i && e.preventDefault && e.preventDefault())
      );
    if (X.episodeBrowserOpen) {
      var r = n(X.focus, "#pe-seasons"),
        o = n(X.focus, "#pe-episodes");
      if (37 === t) {
        if (o && Ei && "none" !== Ei.style.display) {
          var s = Ii ? Ii.children[X.browserSeason] || ot(Ii) : null;
          s && rt(s);
        }
      } else if (39 === t) {
        if (r) {
          var l = Ai ? Ai.querySelector(".pe-ep.is-current") || ot(Ai) : null;
          l && rt(l);
        }
      } else
        38 === t
          ? st("up")
          : 40 === t
            ? st("down")
            : 13 === t || 32 === t
              ? pt()
              : (i = !1);
      i && e.preventDefault && e.preventDefault();
    } else {
      var isYellowKey = (405 === t || "ColorF2Yellow" === a || "Yellow" === a);
      if (isYellowKey) {
        if (X.focus && void 0 !== X.focus._channel) {
          toggleChannelFavoriteDirect(X.focus._channel, X.focus);
          return void (e.preventDefault && e.preventDefault());
        }
        if ("player" === X.screen && "live" === X.playerMode) {
          toggleChannelFavoriteDirect(X.channel, null);
          return void (e.preventDefault && e.preventDefault());
        }
      }
      var d = 415 === t || "MediaPlay" === a || "Play" === a,
        c = 19 === t || "MediaPause" === a || "Pause" === a,
        p = 10252 === t || "MediaPlayPause" === a,
        u = 417 === t || "MediaFastForward" === a || "FastForward" === a,
        v = 412 === t || "MediaRewind" === a || "Rewind" === a,
        f = 413 === t || "MediaStop" === a || "Stop" === a;
      if ("player" === X.screen) {
        if (d)
          return (
            xe && xe.paused && (Mr(), si("none"), pi()),
            void (e.preventDefault && e.preventDefault())
          );
        if (c) {
          if (xe && !xe.paused) {
            try {
              xe.pause();
            } catch (e) {}
            (si("pause"), pi());
          }
          return void (e.preventDefault && e.preventDefault());
        }
        if (p) return (di(), void (e.preventDefault && e.preventDefault()));
        if (u) return (li(15), void (e.preventDefault && e.preventDefault()));
        if (v) return (li(-15), void (e.preventDefault && e.preventDefault()));
        if (f) return (ct(), void (e.preventDefault && e.preventDefault()));
      }
      var h =
        457 === t ||
        93 === t ||
        467 === t ||
        "Menu" === a ||
        "ContextMenu" === a;
      if ("player" === X.screen && "vod" === X.playerMode && h)
        return (
          ji ? tr() : zi ? On() : Pn(),
          void (e.preventDefault && e.preventDefault())
        );
      if (
        "player" === X.screen &&
        (37 === t || 38 === t || 39 === t || 40 === t)
      ) {
        if (ji)
          return (
            37 === t
              ? st("left")
              : 38 === t
                ? st("up")
                : 39 === t
                  ? st("right")
                  : 40 === t && st("down"),
            void (e.preventDefault && e.preventDefault())
          );
        if (zi)
          return (
            Dn(),
            37 === t
              ? st("left")
              : 38 === t
                ? st("up")
                : 39 === t
                  ? st("right")
                  : 40 === t && st("down"),
            void (e.preventDefault && e.preventDefault())
          );
        if ("vod" === X.playerMode) {
          if (X.focus === Pe && Ye) {
            if (37 === t)
              return (Br(-1), void (e.preventDefault && e.preventDefault()));
            if (39 === t)
              return (Br(1), void (e.preventDefault && e.preventDefault()));
            if (38 === t || 40 === t)
              return (Ur(!1), void (e.preventDefault && e.preventDefault()));
          }
          if (37 === t)
            return (li(-10), void (e.preventDefault && e.preventDefault()));
          if (39 === t)
            return (li(10), void (e.preventDefault && e.preventDefault()));
          if (40 === t)
            return (Pn(), void (e.preventDefault && e.preventDefault()));
          if (38 === t)
            return (Fr(), void (e.preventDefault && e.preventDefault()));
        } else {
          var m = X.focus && n(X.focus, ".player-channels");
          if (X.channelsOpen || m) {
            var liveToolbar =
              X.focus &&
              X.focus.classList &&
              X.focus.classList.contains("pc-toolbar-btn");
            var liveChannelFavorite =
              X.focus &&
              X.focus.classList &&
              X.focus.classList.contains("pc-channel-fav");
            var liveChannelRow =
              X.focus &&
              X.focus.classList &&
              X.focus.classList.contains("pc-row");
            var liveSearchControl =
              X.focus &&
              X.focus.classList &&
              (X.focus.classList.contains("pc-search-input") ||
                X.focus.classList.contains("pc-search-clear"));
            if (
              liveToolbar ||
              liveChannelFavorite ||
              liveChannelRow ||
              liveSearchControl
            ) {
              var liveDirection =
                37 === t ? "left" : 38 === t ? "up" : 39 === t ? "right" : "down";
              return (
                X.focus._onMove && X.focus._onMove(liveDirection),
                void (e.preventDefault && e.preventDefault())
              );
            }
            if (
              X.focus &&
              X.focus.classList &&
              X.focus.classList.contains("pc-cat-pill")
            )
              return (
                37 === t
                  ? st("left")
                  : 38 === t
                    ? st("up")
                    : 39 === t
                      ? st("right")
                      : 40 === t && st("down"),
                void (e.preventDefault && e.preventDefault())
              );
            if (38 === t) {
              var visible = visibleLiveIndexes();
              var y =
                  X.focus && void 0 !== X.focus._channel
                    ? X.focus._channel
                    : X.channel,
                previous = visible.indexOf(y),
                g = Se && Se.querySelector(".pc-btn-search");
              previous > 0
                ? fr(visible[previous - 1])
                : g
                  ? rt(g)
                  : fr(visible[0]);
              return void (e.preventDefault && e.preventDefault());
            }
            if (40 === t) {
              var y =
                X.focus && void 0 !== X.focus._channel
                  ? X.focus._channel
                  : X.channel;
              var visible = visibleLiveIndexes(),
                next = visible.indexOf(y);
              return (
                next >= 0 && next < visible.length - 1 && fr(visible[next + 1]),
                void (e.preventDefault && e.preventDefault())
              );
            }
            if (39 === t)
              return (ro(), void (e.preventDefault && e.preventDefault()));
          } else {
            if (38 === t)
              return (
                X.channel > 0
                  ? Kt(X.channel - 1, !1)
                  : F.length && Kt(F.length - 1, !1),
                pi(),
                void (e.preventDefault && e.preventDefault())
              );
            if (40 === t)
              return (
                X.channel < F.length - 1
                  ? Kt(X.channel + 1, !1)
                  : F.length && Kt(0, !1),
                pi(),
                void (e.preventDefault && e.preventDefault())
              );
            if (37 === t)
              return (no(), void (e.preventDefault && e.preventDefault()));
            X.infobar ? ci() : pi();
          }
        }
      }
      if (37 === t) st("left");
      else if (38 === t) st("up");
      else if (39 === t) st("right");
      else if (40 === t) st("down");
      else if (13 === t || 32 === t) {
        if (X.episodeBrowserOpen) return void pt();
        ji
          ? pt()
          : zi
            ? (Dn(), pt())
            : "player" === X.screen &&
                "vod" === X.playerMode &&
                X.focus === Pe &&
                Ye
              ? Ur(!0)
              : "player" === X.screen &&
                  X.streamError &&
                  xe &&
                  xe.src &&
                  !n(X.focus, ".player-channels")
                ? (Mr(), (X.streamError = ""), jr(""))
                : "player" === X.screen && "vod" === X.playerMode
                  ? di()
                  : pt();
      } else i = !1;
      i && e.preventDefault && e.preventDefault();
    }
  }
  function vt() {
    (tt && (clearTimeout(tt), (tt = null)),
      et && (clearInterval(et), (et = null)));
    var e = t("screen-welcome"),
      a = t("screen-home");
    try {
      Ve || gt();
    } catch (e) {
      console.error("buildHome error:", e);
    }
    try {
      lt("home");
    } catch (t) {
      (console.error("showScreen error:", t),
        e && e.classList.remove("is-active"),
        a && a.classList.add("is-active"),
        (X.screen = "home"));
    }
    (e && e.classList.contains("is-active") && e.classList.remove("is-active"),
      a &&
        !a.classList.contains("is-active") &&
        (a.classList.add("is-active"), (X.screen = "home")));
    try {
      bt(0, !1);
    } catch (e) {
      console.error("selectTab error:", e);
    }
    try {
      ne && rt(ne);
    } catch (e) {
      console.error("setFocus error:", e);
    }
    try {
      var i = t("home-tabs");
      i && (i.classList.add("is-expanded"), i.classList.remove("is-collapsed"));
      var n = document.querySelector(".home-sidebar-bg");
      n && (n.classList.add("is-on"), n.classList.remove("is-collapsed"));
      var r = t("screen-home");
      r && r.classList.add("is-rail-open");
    } catch (e) {}
  }
  var ft = [
      function (t) {
        ((ie = e("div", "live-main")),
          ((Ot = document.createElement("video")).className =
            "live-preview-video"),
          (Ot.preload = "auto"),
          (Ot.muted = !0),
          (Ot.volume = 0),
          Ot.setAttribute("muted", "muted"),
          Ot.setAttribute("playsinline", ""),
          Ot.setAttribute("webkit-playsinline", ""),
          ie.appendChild(Ot),
          ie.appendChild(e("div", "live-frame")),
          ie.appendChild(e("div", "live-logo")),
          (qt = e("div", "live-preview-status")),
          ie.appendChild(qt),
          t.appendChild(ie));
        var a = e("div", "live-info");
        (((ae = e("div", "live-channel")).style.right = "112.5px"),
          a.appendChild(ae));
        var i = e("div", "live-fullscreen");
        ((i._activate = function () {
          Yr("live");
        }),
          a.appendChild(i),
          ie.appendChild(a));
        var n = e("div", "live-arrow-up"),
          r = e("div", "live-arrow-down");
        (t.appendChild(n),
          t.appendChild(r),
          (function () {
            var a = e("div", "live-fast"),
              i = e("button", "fast-btn f-srch focusable"),
              n = e("button", "fast-btn f-filter focusable"),
              r = e("button", "fast-btn f-fav focusable"),
              o = e("button", "fast-btn f-all focusable");
            (i.setAttribute("aria-label", "Buscar canal"),
              n.setAttribute("aria-label", "Filtrar categorías"),
              r.setAttribute("aria-label", "Canales favoritos"),
              o.setAttribute("aria-label", "Todos los canales"),
              (i.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M19 19l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg><span>Buscar</span>'),
              (n.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h22M5 16h22M5 24h22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="11" cy="8" r="3" fill="currentColor"/><circle cx="22" cy="16" r="3" fill="currentColor"/><circle cx="15" cy="24" r="3" fill="currentColor"/></svg><span>Filtrar</span>'),
              (r.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l4 8 9 1-6.5 6 1.7 9L16 22.5 7.8 27l1.7-9L3 12l9-1z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg><span>Favoritos</span>'),
              (o.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 16h18M16 7v18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Todos</span>'),
              r.classList.toggle("is-active", liveFavoritesOnly),
              (i._activate = function () {
                Yr("live");
                no();
                openLiveChannelSearch(i);
              }),
              (n._activate = function () {
                pr(n);
              }),
              (r._activate = function () {
                liveFavoritesOnly = !liveFavoritesOnly;
                syncLiveFavoriteButtons();
                Qt(liveFavoritesOnly);
                Yt(liveFavoritesOnly ? "★ Mostrando canales favoritos" : "Mostrando todos los canales");
                rt(r);
              }),
              (o._activate = function () {
                selectAllLiveChannels(o);
              }),
              (i._onMove = function (e) {
                if ("right" === e) return rt(n), !0;
                if ("up" === e) return !0;
                if ("left" === e) return (ne ? rt(ne) : Ue[0] && rt(Ue[0]), !0);
                if ("down" === e) {
                  var t = Fe.filter(function (e) {
                    return e._channel === X.channel;
                  })[0];
                  return (t ? rt(t) : Fe[0] && rt(Fe[0]), !0);
                }
                return !1;
              }),
              (n._onMove = function (e) {
                if ("left" === e) return rt(i), !0;
                if ("right" === e) return rt(r), !0;
                if ("up" === e) return !0;
                if ("down" === e) {
                  var t = Fe.filter(function (e) {
                    return e._channel === X.channel;
                  })[0];
                  return (t ? rt(t) : Fe[0] && rt(Fe[0]), !0);
                }
                return !1;
              }),
              (r._onMove = function (e) {
                if ("left" === e) return rt(n), !0;
                if ("right" === e) return rt(o), !0;
                if ("up" === e) return !0;
                if ("down" === e) {
                  var t = Fe.filter(function (e) {
                    return e._channel === X.channel;
                  })[0];
                  return (t ? rt(t) : Fe[0] && rt(Fe[0]), !0);
                }
                return !1;
              }),
              (o._onMove = function (e) {
                if ("left" === e) return rt(r), !0;
                if ("right" === e || "up" === e) return !0;
                if ("down" === e) {
                  var t = Fe.filter(function (e) {
                    return e._channel === X.channel;
                  })[0];
                  return (t ? rt(t) : Fe[0] && rt(Fe[0]), !0);
                }
                return !1;
              }),
              a.appendChild(i),
              a.appendChild(n),
              a.appendChild(r),
              a.appendChild(o),
              t.appendChild(a));
          })(),
          (re = e("div", "live-list scrollable")),
          t.appendChild(re),
          Qt(!1),
          Gt(),
          ((ne = e("div", "live-focus focusable"))._onMove = function (e) {
            if ("up" === e) {
              var a = document.querySelector(".live-fast .f-srch");
              return (a ? rt(a) : !0, !0);
            }
            if ("down" === e) {
              X.channel < F.length - 1 && Kt(X.channel + 1);
              var a = Fe.filter(function (e) {
                return e._channel === X.channel;
              })[0];
              return (a && rt(a), !0);
            }
            if ("right" === e) {
              var t = Fe.filter(function (e) {
                return e._channel === X.channel;
              })[0];
              return (t ? rt(t) : Fe.length && rt(Fe[0]), !0);
            }
            return "left" === e && (Ue[0] && rt(Ue[0]), !0);
          }),
          (ne._activate = function () {
            Yr("live");
          }),
          t.appendChild(ne));
      },
      function (e) {
        var t = ha("destacado"),
          a = t.slice(0, 6),
          i = !(!a[0] || !a[0]._portal);
        fa(e, a, { titles: i, dots: i ? 4 : 0, shade: i });
        var n = t.slice(6);
        n.length &&
          ya(e, n, 860, {
            popularTitle: "Títulos más vistos",
            bentoItems: a,
            fallbackRow: "Títulos destacados",
          });
      },
      function (e) {
        var t = ha("pelicula"),
          a = t.slice(0, 6),
          i = !(!a[0] || !a[0]._portal);
        fa(e, a, { titles: i, dots: i ? 4 : 0, shade: i });
        var n = t.slice(6);
        n.length &&
          ya(e, n, 860, {
            popularTitle: "Películas más populares",
            bentoItems: a,
            fallbackRow: "Más películas",
          });
      },
      function (e) {
        var t = ha("serie"),
          a = t.slice(0, 6),
          i = !(!a[0] || !a[0]._portal);
        fa(e, a, { titles: i, dots: i ? 3 : 2, shade: i });
        var n = t.slice(6);
        n.length &&
          ya(e, n, 860, {
            popularTitle: "Series más populares",
            bentoItems: a,
            fallbackRow: "Más series",
          });
      },
      function (t) {
        var a = (function (e, t, a) {
          var i,
            n = [];
          if (e)
            for (i = 0; i < l.length; i++)
              -1 !==
                o(l[i].category || "")
                  .split(",")
                  .indexOf(e) && n.push(l[i]);
          if (
            (n.length || (n = l.slice(a, a + t)),
            n.length || (n = l.slice(0, t)),
            n.length < t && l.length)
          ) {
            var r = {};
            for (i = 0; i < n.length; i++) r[String(n[i].id)] = !0;
            for (var s = 0; n.length < t && s < 2 * l.length;) {
              var d = l[s % l.length];
              (s++, r[String(d.id)] || (n.push(d), (r[String(d.id)] = !0)));
            }
          }
          return n;
        })("infantil", 12, 0);
        a.length || (a = l);
        var n = !(!a[0] || !a[0]._portal);
        t.appendChild(ua(a[0], 192, 38.5, 831, 534, { shade: !0, title: n }));
        for (
          var r = [
              [1029, 38.5],
              [1446, 38.5],
              [1029, 269.5],
              [1446, 269.5],
            ],
            s = 0;
          s < r.length;
          s++
        )
          t.appendChild(
            ua(a[(s + 1) % a.length], r[s][0], r[s][1], 413, 222, {})
          );
        if ((t.appendChild(va(833, 468.5, 4, 0)), a[0])) {
          var d = e("div", "kids-subtitle", a[0].tagline || a[0].title);
          (i(d, 192, 526.5, 1249, 40), t.appendChild(d));
        }
        var c = e("div", "poster-row");
        i(c, 192, 578.5, 1920, 310);
        for (var p = 0; p < 7; p++) {
          var u = a[p % a.length];
          if (!u) break;
          c.appendChild(xt(u, 266 * p, 0, 266, 310, { gold: !0 }));
        }
        t.appendChild(c);
      },
      function (e) {
        var t = ha("anime"),
          a = t.slice(0, 6),
          i = !(!a[0] || !a[0]._portal);
        fa(e, a, { titles: i, dots: i ? 3 : 2, shade: i });
        var n = t.slice(6);
        n.length &&
          ya(e, n, 860, {
            popularTitle: "Anime más popular",
            bentoItems: a,
            fallbackRow: "Anime y animación",
          });
      },
      function (t) {
        var a = (function () {
          for (var e = [], t = 0; t < l.length; t++) {
            var a = l[t],
              i = o(
                [
                  a.row || "",
                  a.category || "",
                  a.kind || "",
                  a.title || "",
                  a.alias || "",
                  a.genres && a.genres.join
                    ? a.genres.join(" ")
                    : a.genres || "",
                ].join(" ")
              );
            (-1 === i.indexOf("novela") && -1 === i.indexOf("telenovela")) ||
              e.push(a);
          }
          return e;
        })();
        if (a.length) {
          var n = a.slice(0, 6),
            r = !(!n[0] || !n[0]._portal);
          (fa(t, n, { titles: r, dots: r ? 3 : 2, shade: r }),
            ma(t, a, 860, "Más novelas"));
        } else {
          var s = e(
            "div",
            "catalog-empty",
            "No se encontraron novelas en el catálogo actual."
          );
          (i(s, 192, 170, 1500, 80), t.appendChild(s));
        }
      },
      function (t) {
        var a = l.length ? l : [];
        t.appendChild(ua(a[0], 192, 38.5, 1249, 703, { shade: !0 }));
        for (var n = 0; n < 3; n++)
          t.appendChild(
            ua(a[(n + 1) % a.length], 1446, 38.5 + 231 * n, 413, 226, {
              badge: 2 === n ? "Adult" : "",
            })
          );
        t.appendChild(e("div", "explore-row-title", "Netflix"));
        var r = e("div", "explore-strip");
        i(r, 192, 811.5, 1920, 130);
        for (var o = 0; o < 8; o++) {
          var s = e("div", "explore-logo");
          (i(s, 272 * o, 0, 260, 120), r.appendChild(s));
        }
        t.appendChild(r);
      },
    ],
    ht = {};
  function mt(e) {
    !ht[e] && He[e] && ft[e] && ((ht[e] = !0), ft[e](He[e]));
  }
  function gt() {
    ((Ve = !0),
      (ee = t("home-pages")),
      (te = t("home-notify")),
      a(ee),
      (He = []),
      (ht = {}));
    for (var i = 0; i < ft.length; i++) {
      var n = e("div", "home-page scrollable");
      (0 === i && n.classList.add("is-current"), ee.appendChild(n), He.push(n));
    }
    (mt(z[X.tab] && z[X.tab].page >= 0 ? z[X.tab].page : 0),
      (function () {
        var i = t("home-tabs");
        (a(i),
          i.classList.add("scrollable"),
          i.classList.add("is-expanded"),
          (Ue = []));
        for (var n = 0; n < z.length; n++) {
          var r = e("div", "tab-item focusable");
          r.appendChild(e("div", "tab-pill"));
          var o = e("div", "tab-icon");
          ((o.innerHTML = B[z[n].icon] || ""), r.appendChild(o));
          var s = e("div", "tab-title", z[n].label);
          (r.appendChild(s),
            (r._tab = n),
            (r._activate = (function (e) {
              return function () {
                if ("history" === z[e].action)
                  return ((We = "history"), Ha(), void Ua(1, !0));
                if ((bt(e, !1), 0 === e)) {
                  var t = Fe.filter(function (e) {
                    return e._channel === X.channel;
                  })[0];
                  t ? rt(t) : Fe.length ? rt(Fe[0]) : ne && rt(ne);
                } else if (z[e].page >= 0) {
                  var a = ot(He[z[e].page]);
                  a && rt(a);
                }
              };
            })(n)),
            (r._onMove = (function (e) {
              return function (t) {
                if ("up" === t)
                  return (
                    e > 0 && Ue[e - 1] && (rt(Ue[e - 1]), bt(e - 1, !1)),
                    !0
                  );
                if ("down" === t)
                  return (
                    e < Ue.length - 1 &&
                      Ue[e + 1] &&
                      (rt(Ue[e + 1]), bt(e + 1, !1)),
                    !0
                  );
                if ("left" === t) return !0;
                if ("right" === t) {
                  if ("history" === z[e].action)
                    return ((We = "history"), Ha(), Ua(1, !0), !0);
                  if ((bt(e, !1), 0 === e)) {
                    var a = Fe.filter(function (e) {
                      return e._channel === X.channel;
                    })[0];
                    a ? rt(a) : Fe.length ? rt(Fe[0]) : ne && rt(ne);
                  } else if (z[e].page >= 0) {
                    var i = ot(He[z[e].page]);
                    i && rt(i);
                  }
                  return !0;
                }
                return !1;
              };
            })(n)),
            i.appendChild(r),
            Ue.push(r));
        }
      })(),
      (function () {
        a(te);
        for (
          var t = [
              {
                cls: "search",
                icon: "assets/original/home/icon_notify_search.png",
                small: !0,
              },
              {
                cls: "filter",
                icon: "assets/original/search/icon_category_filter_n.png",
                small: !0,
              },
              {
                cls: "personal",
                icon: "assets/original/home/icon_notify_personal.png",
                small: !0,
              },
            ],
            i = 0;
          i < t.length;
          i++
        ) {
          var n = t[i],
            r = e(
              "div",
              "notify-item focusable " + n.cls + (n.small ? " is-small" : "")
            ),
            o = e("div", "n-normal");
          ((o.style.backgroundImage = "url(" + n.icon + ")"),
            r.appendChild(o),
            "personal" === n.cls
              ? (r._activate = function () {
                  Ha();
                })
              : "search" === n.cls
                ? (r._activate = function () {
                    La();
                  })
                : (r._activate = function () {
                    openCatalogFilter(r);
                  }),
            (r._onMove = (function (e) {
              return function (t) {
                if ("left" === t && e > 0) return (rt(te.querySelectorAll(".notify-item")[e - 1]), !0);
                if ("right" === t && e < 2) return (rt(te.querySelectorAll(".notify-item")[e + 1]), !0);
                if ("down" === t && 0 === X.tab) {
                  var a = Fe.filter(function (e) {
                    return e._channel === X.channel;
                  })[0] || Fe[0];
                  return a ? (rt(a), !0) : !0;
                }
                return "up" === t;
              };
            })(i)),
            te.appendChild(r));
        }
        var s = e("div", "notify-divider");
        te.appendChild(s);
        var l = e("div", "notify-wifi");
        ((l.innerHTML =
          '<svg viewBox="0 0 30 22"><path d="M15 19.5a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2z" fill="currentColor"/><path d="M8.4 12.2a9.6 9.6 0 0 1 13.2 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4.2 7.6a15.6 15.6 0 0 1 21.6 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'),
          te.appendChild(l));
        var d = e("div", "notify-time");
        ((d.id = "notify-time"), te.appendChild(d), yt(), setInterval(yt, 3e4));
      })());
  }
  function yt() {
    var e = t("notify-time");
    if (e) {
      var a = new Date(),
        i = a.getHours(),
        n = i >= 12 ? "PM" : "AM";
      0 === (i %= 12) && (i = 12);
      var o = a.getMinutes();
      e.textContent = i + ":" + r(o) + " " + n;
    }
  }
  function bt(e, t) {
    var a = z[e];
    if (a && !a.action) {
      var i = z[X.tab] ? z[X.tab].page : a.page;
      X.tab = e;
      for (var n = 0; n < Ue.length; n++)
        Ue[n].classList.toggle("is-selected", n === e);
      (a.page >= 0 && mt(a.page), 0 === a.page ? Wt(F[X.channel]) : jt());
      for (var r = 0; r < He.length; r++)
        (He[r].classList.remove("is-entering", "from-left", "from-right"),
          He[r].classList.toggle("is-current", r === a.page));
      if (a.page !== i && He[a.page]) {
        var o = He[a.page];
        (o.classList.add(
          "is-entering",
          a.page > i ? "from-right" : "from-left"
        ),
          setTimeout(function () {
            o.classList.remove("is-entering", "from-left", "from-right");
          }, 320));
      }
      if (t)
        if (0 === a.page) {
          var s = Fe.filter(function (e) {
            return e._channel === X.channel;
          })[0];
          s ? rt(s) : Fe.length ? rt(Fe[0]) : ne && rt(ne);
        } else {
          var l = ot(He[a.page]);
          l && rt(l);
        }
      wt();
    }
  }
  var Ct = null;
  function wt() {
    (Ct && clearTimeout(Ct),
      (Ct = setTimeout(function () {
        ((Ct = null),
          (function () {
            for (
              var e = document.querySelectorAll("img[data-poster-src]"),
                t = window.innerWidth || 1920,
                a = window.innerHeight || 1080,
                i = 0;
              i < e.length;
              i++
            ) {
              var r = e[i],
                o = n(r, ".poster, .bento"),
                s =
                  o && o.getBoundingClientRect
                    ? o.getBoundingClientRect()
                    : null;
              if (
                St(r) &&
                s &&
                s.bottom > -420 &&
                s.top < a + 420 &&
                s.right > -320 &&
                s.left < t + 320
              )
                r.getAttribute("src") ||
                  ((r.style.display = ""),
                  (r.src = r.getAttribute("data-poster-src")));
              else if (r.getAttribute("src")) {
                r.removeAttribute("src");
                try {
                  r.src = "";
                } catch (e) {}
              }
            }
          })());
      }, 80)));
  }
  function St(e) {
    if ("home" === X.screen) {
      var t = n(e, ".home-page");
      return !(!t || !t.classList.contains("is-current"));
    }
    if ("search" === X.screen) {
      var a = n(e, ".search-results"),
        i = n(e, ".search-hot");
      return !!(
        (a && a.classList.contains("is-active")) ||
        (i && !i.classList.contains("is-hidden"))
      );
    }
    if ("detail" === X.screen) {
      var r = n(e, "#screen-detail");
      return !(!r || !r.classList.contains("is-active"));
    }
    return !1;
  }
  function xt(t, a, n, r, o, s) {
    var l = e(
      "div",
      "poster focusable" +
        ((s = s || {}).gold ? " gold" : "") +
        (s.type3 ? " type3" : "")
    );
    if ((i(l, a, n, r, o), t.poster)) {
      var d = e("img", "p-img");
      (d.setAttribute("data-poster-src", t.poster),
        (d.onerror = function () {
          if (
            this.src &&
            0 === this.src.indexOf("https://") &&
            !this._httpFallback
          )
            return (
              (this._httpFallback = !0),
              void (this.src = this.src.replace("https://", "http://"))
            );
          this.style.display = "none";
        }),
        l.appendChild(d));
    }
    return (
      s.gold ||
        (l.appendChild(e("div", "p-shade")),
        l.appendChild(e("div", "p-title", t.title))),
      (l._item = t),
      (l._activate = function () {
        ba(t);
      }),
      wt(),
      l
    );
  }
  var Tt = [
    {
      id: "es_tdt",
      name: "España - Canales Nacionales y TDT",
      url: "https://iptv-org.github.io/iptv/countries/es.m3u",
      desc: "320+ canales: La 1, La 2, Antena 3, Telecinco, laSexta, autonómicas",
    },
    {
      id: "latam_spa",
      name: "Latinoamérica y Deportes (Hispano)",
      url: "https://iptv-org.github.io/iptv/languages/spa.m3u",
      desc: "Canales en español de Colombia, México, Argentina, Chile y Perú",
    },
    {
      id: "sports_iptv",
      name: "Deportes Internacionales",
      url: "https://iptv-org.github.io/iptv/categories/sports.m3u",
      desc: "Transmisiones deportivas y canales de competiciones",
    },
    {
      id: "movies_iptv",
      name: "Cine y Series 24/7",
      url: "https://iptv-org.github.io/iptv/categories/movies.m3u",
      desc: "Cine clásico, cine de acción y canales continuos de series",
    },
  ];
  function _t() {
    try {
      var e = localStorage.getItem("xuper_m3u_addons");
      if (e) {
        var t = JSON.parse(e);
        if (Array.isArray(t) && t.length) return t;
      }
    } catch (e) {}
    var a = [Tt[0]];
    try {
      localStorage.setItem("xuper_m3u_addons", JSON.stringify(a));
    } catch (e) {}
    return a;
  }
  function kt(e) {
    try {
      localStorage.setItem("xuper_m3u_addons", JSON.stringify(e || []));
    } catch (e) {}
  }
  var DEFAULT_LIVE_CATEGORIES = [
    { id: 76182, name: 'Todos', code: 'ba397e42-b664-11ed-8c55-768dd7bc60d3' },
    { id: 76206, name: 'Deportes', code: 'dc520f12-b664-11ed-8b54-768dd7bc60d3' },
    { id: 87034, name: 'Vivo gratis', code: '77EA75EF523AB44B01D707781892485E' },
    { id: 76205, name: 'Cine y Series', code: 'db7b71dc-b664-11ed-8b54-768dd7bc60d3' },
    { id: 77970, name: 'Más popular', code: '78C5EC9959371B7FEFE6E14AF48A1904' },
    { id: 77690, name: 'Venezuela', code: '235F792997A0A714FCD96778BCF05172' },
    { id: 76188, name: 'Colombia', code: 'd463893e-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76190, name: 'Ecuador', code: 'd66e9124-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76207, name: 'Chile', code: 'dd9600fe-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76197, name: 'México', code: 'd908f618-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76187, name: 'Perú', code: 'd425d4d6-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76202, name: 'Bolivia', code: 'daa53324-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76201, name: 'Uruguay', code: 'da865fe4-b664-11ed-8b54-768dd7bc60d3' },
    { id: 77688, name: 'Paraguay', code: 'CE922BD5FE46DFBDE587348E82E4F239' },
    { id: 77689, name: 'Panamá', code: '313CC1DF490076FB3F72EA0086645764' },
    { id: 77988, name: 'Puerto Rico', code: 'E07E20F2A12DB9436DCCB6F3B9B5024B' },
    { id: 76191, name: 'España', code: 'd6962ea0-b664-11ed-8b54-768dd7bc60d3' },
    { id: 77691, name: 'Costa Rica', code: '30CBEC64059510DC85E03A61AEEE431A' },
    { id: 76194, name: 'Estados Unidos', code: 'd862ef98-b664-11ed-8b54-768dd7bc60d3' },
    { id: 79127, name: 'Centroamérica', code: '427FC371C2D4A520799642758D171591' },
    { id: 79134, name: 'Honduras', code: '983EFE77932E9378816362F80E7DD93E' },
    { id: 79145, name: 'El Salvador', code: '5AA6C7CDB005B41F1E13BE66088FB351' },
    { id: 79147, name: 'República Dominicana', code: 'EDB4CA7F458A2553ACBE9A607DD02934' },
    { id: 76193, name: 'Noticias', code: 'd8332ccc-b664-11ed-8b54-768dd7bc60d3' },
    { id: 77977, name: 'Full HD', code: 'C4088392E9152F9E5C7D1671005951A2' },
    { id: 76204, name: 'HD+(265)', code: 'db2f3830-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76198, name: 'PlayBack', code: 'd9fc1c26-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76186, name: 'NFL PASS', code: 'd3d9d2ca-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76184, name: 'NBA PASS', code: 'd36df230-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76195, name: 'MLB PASS', code: 'd881fb4a-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76196, name: 'Cultura', code: 'd89d00a2-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76183, name: 'Música', code: 'd314839e-b664-11ed-8b54-768dd7bc60d3' },
    { id: 79146, name: 'Infantil', code: '64334F25B2394B11A1FF1B060D6B377C' },
    { id: 79148, name: 'Religioso', code: 'E75C698363490CE8F2441F43FB96E752' },
    { id: 76192, name: '☆ Desde Internet', code: 'd69d9f50-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76200, name: 'EVENTOS PPV', code: 'da7619a4-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76189, name: '24/7', code: 'd51b21ac-b664-11ed-8b54-768dd7bc60d3' },
    { id: 76208, name: '18+', code: 'ddc200aa-b664-11ed-8b54-768dd7bc60d3' },
    { id: 'addons', name: '➕ Addons M3U', isAddon: true }
  ];
  var Lt = DEFAULT_LIVE_CATEGORIES.slice(),
    Mt = DEFAULT_LIVE_CATEGORIES[0],
    It = !1,
    Et = !1,
    At = !1,
    Dt = 0,
    Pt = null,
    Ot = null,
    qt = null,
    Nt = 0,
    Rt = null,
    Vt = "",
    Ht = !1,
    Ut = !1,
    Ft = null,
    Bt = !1,
    zt = !1,
    liveFavoritesOnly = !1,
    liveSearchText = "",
    liveSearchOpen = !1,
    liveSearchInput = null;
  function updatePlayerCatBadge() {
    if (Se) {
      var b = Se.querySelector('.pc-cat-badge');
      if (b && Mt) { b.textContent = Mt.name; }
    }
  }
  function toggleChannelFavoriteDirect(channelIndex, rowElem) {
    var ch = F[channelIndex];
    if (!ch) return;
    var isFav = toggleLiveFavorite(ch);
    ch.fav = isFav;
    Yt(isFav ? "★ Canal añadido a favoritos" : "☆ Canal quitado de favoritos");
    if (rowElem) {
      var star = rowElem.querySelector(".channel-star");
      if (star) { star.textContent = isFav ? "★" : ""; }
    }
    if ("player" === X.screen) {
      hr(channelIndex);
    } else if ("home" === X.screen) {
      Qt(liveFavoritesOnly);
    }
    syncLiveFavoriteButtons();
  }
  /* El filtro de favoritos es global: Inicio y el reproductor no pueden
     mostrar estados distintos ni dejar un botón naranja "fantasma". */
  function syncLiveFavoriteButtons() {
    var buttons = document.querySelectorAll(".f-fav, .pc-btn-fav");
    for (var i = 0; i < buttons.length; i++)
      buttons[i].classList.toggle("is-active", !!liveFavoritesOnly);
  }
  function isAllLiveCategory(category) {
    return !!(
      category &&
      (String(category.id) === "76182" ||
        /^(todos?|all)$/i.test(String(category.name || "")))
    );
  }
  function getAllLiveCategory() {
    var categories = Lt && Lt.length ? Lt : DEFAULT_LIVE_CATEGORIES;
    for (var i = 0; i < categories.length; i++)
      if (isAllLiveCategory(categories[i])) return categories[i];
    return { id: 76182, name: "Todos" };
  }
  function selectAllLiveChannels(returnFocus) {
    liveFavoritesOnly = !1;
    liveSearchText = "";
    syncLiveFavoriteButtons();
    Xt(getAllLiveCategory());
    if ("home" === X.screen) Qt(!1);
    else if ("player" === X.screen) hr(0);
    Yt("Mostrando todos los canales");
    returnFocus && rt(returnFocus);
  }
  function jt() {
    if (
      (Nt++,
      (Vt = ""),
      Rt && (clearTimeout(Rt), (Rt = null)),
      ie && ie.classList.remove("is-preview-playing", "is-preview-loading"),
      qt && (qt.textContent = ""),
      Ot)
    ) {
      try {
        Ot.pause();
      } catch (e) {}
      Ot.removeAttribute("src");
      try {
        ((Ot.src = ""), Ot.load());
      } catch (e) {}
    }
  }
  function Wt(e) {
    (Rt && clearTimeout(Rt),
      (Rt = setTimeout(function () {
        ((Rt = null),
          (function (e) {
            if (
              Ot &&
              e &&
              (e.channelCode || e.streamUrl) &&
              "home" === X.screen &&
              0 === X.tab
            ) {
              var t = e.channelCode || e.streamUrl;
              if (
                t !== Vt ||
                !ie ||
                (!ie.classList.contains("is-preview-loading") &&
                  !ie.classList.contains("is-preview-playing"))
              ) {
                (jt(), (Vt = t));
                var a = ++Nt;
                (ie.classList.add("is-preview-loading"),
                  qt &&
                    (qt.textContent = "Cargando " + (e.name || "canal") + "…"),
                  P(
                    "resolveLive",
                    e.streamUrl
                      ? { streamUrl: e.streamUrl }
                      : { channelCode: e.channelCode },
                    function (e, t) {
                      if (a === Nt && "home" === X.screen && 0 === X.tab) {
                        !e && t && D("live", t);
                        var i =
                          !e &&
                          t &&
                          !1 !== t.returnValue &&
                          (t.proxyPath || t.url);
                        if (!i)
                          return (
                            ie.classList.remove("is-preview-loading"),
                            void (qt && (qt.textContent = ""))
                          );
                        ((Ot.onloadeddata = function () {
                          a === Nt &&
                            (ie.classList.remove("is-preview-loading"),
                            ie.classList.add("is-preview-playing"),
                            qt && (qt.textContent = ""));
                        }),
                          (Ot.onerror = function () {
                            a === Nt &&
                              (ie.classList.remove(
                                "is-preview-loading",
                                "is-preview-playing"
                              ),
                              qt && (qt.textContent = ""));
                          }));
                        try {
                          ((Ot.src = i), Ot.load());
                          var n = Ot.play();
                          n && n.catch && n.catch(function () {});
                        } catch (e) {
                          ie.classList.remove("is-preview-loading");
                        }
                      }
                    }
                  ));
              }
            }
          })(e || F[X.channel]));
      }, 220)));
  }
  function Xt(e, t) {
    if (e) {
      Mt = e;
      /* "Todos" y Favoritos son filtros excluyentes. */
      if (isAllLiveCategory(e)) liveFavoritesOnly = !1;
      syncLiveFavoriteButtons();
      dr();
      updatePlayerCatBadge();
      if (e.isAddon) {
        $t(function () { t && t(); });
      } else {
        Gt(e.id, function () { t && t(); }, !0);
      }
    }
  }
  function $t(e) {
    var t = _t();
    if (!t || !t.length)
      return (F.splice(0, F.length), Qt(liveFavoritesOnly), hr(), void (e && e()));
    jr("Cargando canales de Addon…");
    for (var a = [], i = t.length, n = 0; n < t.length; n++)
      (function (t) {
        P("fetchM3u", { url: t.url }, function (t, n) {
          if (n && n.channels && n.channels.length)
            for (var r = 0; r < n.channels.length; r++) a.push(n.channels[r]);
          if (--i <= 0) {
            (jr(""), F.splice(0, F.length));
            for (var o = 0; o < a.length; o++)
              ((a[o].index = o + 1), F.push(a[o]));
            ((X.channel = 0),
              Qt(liveFavoritesOnly),
              hr(),
              F[0] && ae && (ae.textContent = F[0].name),
              "player" === X.screen &&
                "live" === X.playerMode &&
                (ao(), to(F[0], !0)),
              e && e());
          }
        });
      })(t[n]);
  }
  function Gt(e, t, force) {
    var a = e || 76182;
    if (force || !At || Pt !== a) {
      var i = ++Dt;
      ((Pt = a),
        (At = !0),
        (Et = !1),
        F.length || ((X.channel = 0), Qt(liveFavoritesOnly), hr()));
      var n = 1,
        r = !1;
      !(function e() {
        P(
          "liveChannels",
          { columnId: a, pageNum: n, pageSize: 20 },
          function (o, s) {
            if (i === Dt) {
              var l = s && s.channels ? s.channels : [];
              if (!o && l.length) {
                1 === n && F.splice(0, F.length);
                for (var d = {}, c = 0; c < F.length; c++)
                  F[c] && F[c].channelCode && (d[F[c].channelCode] = !0);
                for (var p = 0; p < l.length; p++) {
                  var u = l[p];
                  !u ||
                    (u.channelCode && d[u.channelCode]) ||
                    (u.channelCode && (d[u.channelCode] = !0), F.push(u));
                }
                ((Et = !0),
                  Qt(liveFavoritesOnly),
                  hr(),
                  X.channel >= F.length && (X.channel = 0),
                  F[X.channel] && ae && (ae.textContent = F[X.channel].name),
                  "player" === X.screen && "live" === X.playerMode
                    ? ao()
                    : Wt(F[X.channel]));
              }
              if (
                (r ||
                  ((r = !0),
                  It ||
                    (function (e) {
                      It && Lt.length
                        ? e && e(null, Lt)
                        : P("liveCategories", {}, function (t, a) {
                            var i = [];
                            if (a && a.categories && a.categories.length)
                              for (var n = 0; n < a.categories.length; n++) {
                                var r = a.categories[n],
                                  o = r.name;
                                (("ChannelList" !== o && 76182 !== r.id) ||
                                  (o = "Todos"),
                                  i.push({
                                    id: r.id,
                                    name: o,
                                    code: r.code,
                                    isAddon: !1,
                                  }));
                              }
                            else
                              i = DEFAULT_LIVE_CATEGORIES.slice();
                            (i.push({
                              id: "addons",
                              name: "➕ Addons M3U",
                              isAddon: !0,
                            }),
                              (Lt = i),
                              (It = !0),
                              Mt || (Mt = Lt[0]),
                              dr(),
                              e && e(null, Lt));
                          });
                    })(),
                  t && t(o, s)),
                !o && s && s.hasMore && l.length)
              )
                return (n++, void setTimeout(e, 25));
              ((At = !1),
                o &&
                  !Et &&
                  setTimeout(function () {
                    i === Dt && Gt(a);
                  }, 2500));
            }
          }
        );
      })();
    }
  }
  function Qt(t) {
    var previousFocus = X.focus,
      previousChannel =
        previousFocus && void 0 !== previousFocus._channel
          ? previousFocus._channel
          : -1,
      previousWasStar =
        previousFocus &&
        previousFocus.classList &&
        previousFocus.classList.contains("channel-star");
    if (re)
      if ((a(re), (Fe = []), F.length)) {
        for (var i = 0; i < F.length; i++)
          if ((!t || X.liveFavorites[liveChannelKey(F[i])]) && isVisibleLiveChannel(F[i])) {
            var n = e("div", "live-row focusable");
            n._channel = i;
            var r = e("div", "row-icon");
            F[i].logo &&
              ((r.style.backgroundImage = "url(" + F[i].logo + ")"),
              (r.style.backgroundSize = "contain"),
              (r.style.backgroundRepeat = "no-repeat"),
              (r.style.backgroundPosition = "center"));
            var o = e("div", "row-play"),
              s = e("div", "row-name", F[i].name),
              isFav = !!(X.liveFavorites[liveChannelKey(F[i])] || F[i].fav),
              star = e(
                "button",
                "channel-star focusable" + (isFav ? " is-favorite" : ""),
                isFav ? "★" : "☆"
              );
            (n.appendChild(r),
              n.appendChild(o),
              n.appendChild(s),
              n.appendChild(star),
              i === X.channel && n.classList.add("is-current"),
              (n._activate = (function (e) {
                return function () {
                  (Kt(e, !0), Yr("live"));
                };
              })(i)),
              (n._onMove = (function (e, starButton) {
                return function (t) {
                  if ("left" === t) return (ne ? rt(ne) : Ue[0] && rt(Ue[0]), !0);
                  if ("up" === t) {
                    var idx = Fe.indexOf(this);
                    if (idx > 0) return (rt(Fe[idx - 1]), !0);
                    var homeToolbar = document.querySelector(
                      ".live-fast .f-srch"
                    );
                    return homeToolbar ? (rt(homeToolbar), !0) : !0;
                  }
                  if ("down" === t) {
                    var idx = Fe.indexOf(this);
                    if (idx < Fe.length - 1) return (rt(Fe[idx + 1]), !0);
                    var fastBtn = document.querySelector(".live-fast .fast-btn");
                    return fastBtn ? (rt(fastBtn), !0) : !0;
                  }
                  if ("right" === t) return (rt(starButton), !0);
                  return !1;
                };
              })(i, star)),
              (star._channel = i),
              (star._activate = (function (e, t) {
                return function () {
                  (toggleChannelFavoriteDirect(e, null),
                    (t = Fe.filter(function (e) {
                      return e._channel === X.channel;
                    })[0]),
                    t && rt(t.querySelector(".channel-star")));
                };
              })(i, star)),
              (star._onMove = (function (e, t) {
                return function (a) {
                  if ("left" === a) return (rt(t), !0);
                  if ("up" === a || "down" === a) {
                    var i = Fe.indexOf(t),
                      n = "up" === a ? i - 1 : i + 1,
                      r = n >= 0 && n < Fe.length ? Fe[n] : null,
                      o = r && r.querySelector(".channel-star");
                    if (o) return (rt(o), !0);
                    if ("up" === a) {
                      var s = document.querySelector(".live-fast .f-srch");
                      return s ? (rt(s), !0) : !0;
                    }
                    return !0;
                  }
                  return "right" === a;
                };
              })(i, n)),
              re.appendChild(n),
              Fe.push(n));
          }
        (F[X.channel] && ae && (ae.textContent = F[X.channel].name), Jt());
      /* Gt() vuelve a crear filas al terminar una página del catálogo. Sin
         esto X.focus apunta a una fila destruida y desaparece el naranja. */
      if (
        "home" === X.screen &&
        previousChannel >= 0 &&
        !at(previousFocus)
      ) {
        var restoredRow = Fe.filter(function (row) {
          return row._channel === previousChannel;
        })[0];
        if (restoredRow)
          rt(
            previousWasStar
              ? restoredRow.querySelector(".channel-star") || restoredRow
              : restoredRow
          );
      }
      } else
        re.appendChild(
          e(
            "div",
            "live-list-status",
            Et ? "No se encontraron canales" : "Cargando canales…"
          )
        );
  }
  function Jt() {
    if (Fe.length) {
      var e = Fe.filter(function (e) {
        return e._channel === X.channel;
      })[0];
      if (e) {
        var t = 120 * Fe.indexOf(e),
          a = Math.max(0, re.scrollHeight - re.clientHeight),
          i = re.scrollTop;
        (t < i && (i = t),
          t + 100.5 > i + re.clientHeight && (i = t + 100.5 - re.clientHeight),
          (re.scrollTop = Math.max(0, Math.min(a, i))));
      }
    }
  }
  function Kt(e, t) {
    (e < 0 && (e = 0), e > F.length - 1 && (e = F.length - 1), (X.channel = e));
    for (var a = 0; a < Fe.length; a++)
      Fe[a].classList.toggle("is-current", Fe[a]._channel === e);
    (F[e] && ae && (ae.textContent = F[e].name),
      Jt(),
      "player" === X.screen
        ? (!(function () {
            if (!Ce) return;
            ao();
          })(),
          "live" === X.playerMode && to(F[e], !!t))
        : "home" === X.screen && 0 === X.tab && Wt(F[e]));
  }
  function visibleLiveIndexes() {
    for (var e = [], t = 0; t < F.length; t++)
      isVisibleLiveChannel(F[t]) && e.push(t);
    return e;
  }
  function Yt(a) {
    var i = t("app-toast");
    i ||
      (((i = e("div", "app-toast")).id = "app-toast"),
      (t("app") || document.body).appendChild(i));
    ((i.textContent = a),
      (i.style.display = "block"),
      (i.style.opacity = "1"),
      Yt._timer && clearTimeout(Yt._timer),
      (Yt._timer = setTimeout(function () {
        ((i.style.opacity = "0"),
          setTimeout(function () {
            i.style.display = "none";
          }, 300));
      }, 3200)));
  }
  function Zt(i) {
    ((Ft = i || {}), (Ut = !0));
    var n = t("dialog-update");
    if (n) {
      n.classList.add("is-active");
      var r = t("du-title");
      r && (r.textContent = "Nueva versión disponible");
      var o = t("du-version-subtitle");
      o &&
        (o.textContent =
          "Versión " +
          (i.latestVersion || "") +
          (i.releaseDate ? " (" + i.releaseDate + ")" : ""));
      var s = t("du-changelog");
      s &&
        (s.textContent =
          i.changelog ||
          "Mejoras de estabilidad, rendimiento y optimizaciones de catálogo.");
      var l = t("du-status-container");
      l && (l.style.display = "none");
      var d = t("du-footer-actions");
      if (d) {
        a(d);
        var c = e(
          "button",
          "du-btn du-btn-primary focusable",
          "Actualizar ahora"
        );
        ((c.id = "du-btn-update"),
          (c._activate = function () {
            !(function () {
              if (!Ft || !Ft.ipkUrl) return;
              zt = !0;
              var i = t("du-status-container");
              i && (i.style.display = "block");
              var n = t("du-progress-bar"),
                r = t("du-status-text"),
                o = t("du-status-subtext"),
                s = t("du-footer-actions");
              s && a(s);
              n && (n.style.width = "4%");
              r && (r.textContent = "Iniciando descarga...");
              o &&
                (o.textContent =
                  "Por favor no apagues la TV ni salgas de la aplicación.");
              var l = p.serviceId || "com.webosflux.xuptertv.fidelity.service";
              if (I() && window.PalmServiceBridge)
                try {
                  return void window.webOS.service.request("luna://" + l, {
                    method: "applyUpdate",
                    parameters: {
                      ipkUrl: Ft.ipkUrl,
                      targetVersion: (Ft && (Ft.latestVersion || Ft.version)) || "",
                      subscribe: !0
                    },
                    subscribe: !0,
                    resubscribe: !1,
                    onSuccess: function (e) {
                      e &&
                        (void 0 !== e.percent &&
                          n &&
                          (n.style.width =
                            Math.min(100, Math.max(0, e.percent)) + "%"),
                        e.message && r && (r.textContent = e.message),
                        "success" === e.state &&
                          (r &&
                            (r.textContent =
                              "¡Actualización completada! Reiniciando XuperTV..."),
                          n && (n.style.width = "100%"),
                          setTimeout(function () {
                            try {
                              window.location.reload();
                            } catch (e) {}
                          }, 4e3)));
                    },
                    onFailure: function (t) {
                      zt = !1;
                      var i =
                          (t && t.errorText) || "Error durante la instalación",
                        n = i;
                      if (
                        (/denied|permission|not permitted|method.*not|no existe/i.test(
                          String(i)
                        ) &&
                          (n =
                            "El instalador de la TV está desactualizado. Desenchufa la TV 30 segundos, vuelve a abrir XuperTV y busca la actualización de nuevo."),
                        r && (r.textContent = "Error: " + n),
                        o &&
                          (o.textContent =
                            "Comprueba tu red o intenta más tarde."),
                        s)
                      ) {
                        a(s);
                        var l = e(
                          "button",
                          "du-btn du-btn-secondary focusable",
                          "Cerrar"
                        );
                        ((l._activate = function () {
                          ea();
                        }),
                          s.appendChild(l),
                          rt(l));
                      }
                    },
                  });
                } catch (e) {
                  ((zt = !1),
                    r && (r.textContent = "Error: " + (e && e.message)));
                }
              else if (
                (r &&
                  (r.textContent =
                    "Modo simulador: actualizacion solo disponible en webOS"),
                (zt = !1),
                s)
              ) {
                var d = e(
                  "button",
                  "du-btn du-btn-secondary focusable",
                  "Cerrar"
                );
                ((d._activate = function () {
                  ea();
                }),
                  s.appendChild(d),
                  rt(d));
              }
            })();
          }));
        var u = e("button", "du-btn du-btn-secondary focusable", "Más tarde");
        ((u.id = "du-btn-later"),
          (u._activate = function () {
            ((Bt = !0), ea());
          }),
          d.appendChild(c),
          d.appendChild(u),
          rt(c));
      }
    }
  }
  function ea() {
    Ut = !1;
    var e = t("dialog-update");
    if ((e && e.classList.remove("is-active"), "home" === X.screen)) {
      var a = document.querySelector(".home-tab.is-selected");
      if (a) rt(a);
      else {
        var i = firstFocusable();
        i && rt(i);
      }
    } else if ("settings" === X.screen) {
      var n = document.querySelector(".settings-item.is-selected");
      if (n) rt(n);
      else {
        var r = firstFocusable();
        r && rt(r);
      }
    }
  }
  var ta = [
    "https://raw.githubusercontent.com/cristianco7/XUPER-HYDRA-PORT-WEBOS/main/version.json",
    "https://raw.githubusercontent.com/cristianco7/XUPER-HYDRA-PORT-WEBOS/feature/catalog-webos-compat/version.json",
    "https://cdn.jsdelivr.net/gh/cristianco7/XUPER-HYDRA-PORT-WEBOS@main/version.json",
  ];
  function aa(e) {
    for (
      var t = String(e || "")
          .replace(/^[^\d]*/, "")
          .split("."),
        a = [],
        i = 0;
      i < t.length;
      i++
    )
      a.push(parseInt(t[i], 10) || 0);
    return a;
  }
  function ia(e, t) {
    for (
      var a = aa(e), i = aa(t), n = Math.max(a.length, i.length), r = 0;
      r < n;
      r++
    ) {
      var o = a[r] || 0,
        s = i[r] || 0;
      if (o !== s) return o > s ? 1 : -1;
    }
    return 0;
  }
  function na(e, t) {
    if (e >= ta.length)
      return t("No se pudo consultar el servidor de actualizaciones");
    var a = new XMLHttpRequest(),
      i = !1,
      n = setTimeout(function () {
        if (!i) {
          i = !0;
          try {
            a.abort();
          } catch (e) {}
          na(e + 1, t);
        }
      }, 12e3);
    function r() {
      i || ((i = !0), clearTimeout(n), na(e + 1, t));
    }
    try {
      (a.open("GET", ta[e] + "?t=" + Date.now(), !0),
        (a.onreadystatechange = function () {
          if (4 === a.readyState)
            if (a.status < 200 || a.status >= 300) r();
            else {
              var e;
              try {
                e = JSON.parse(a.responseText);
              } catch (e) {
                return void r();
              }
              e && e.version
                ? i || ((i = !0), clearTimeout(n), t(null, e))
                : r();
            }
        }),
        (a.onerror = r),
        (a.ontimeout = r),
        a.send(null));
    } catch (e) {
      r();
    }
  }
  function ra(e, t) {
    na(0, function (a, i) {
      if (a) return t(a);
      var n = i.version || "0.0.0";
      t(null, {
        updateAvailable: ia(n, e) > 0,
        currentVersion: e,
        latestVersion: n,
        ipkUrl: i.ipkUrl || "",
        changelog: i.changelog || "",
        releaseDate: i.releaseDate || "",
        viaFallback: !0,
      });
    });
  }
  function oa(e, t) {
    var a = "2.2.77";
    function i(i) {
      (t && t(null, i),
        i && i.updateAvailable
          ? (e && Bt) || Zt(i)
          : e || Yt("Tienes la versión más reciente (v" + a + ")"));
    }
    P(
      "checkUpdate",
      { currentVersion: a },
      function (n, r) {
        if (!n) return i(r);
        /denied|permission|not permitted|method|not exist|no existe|unknown|módulo|modulo|no carg|no disponible|no está disponible/i.test(
          String(n || "")
        )
          ? ra(a, function (a, r) {
              if (!a && r) return i(r);
              (t && t(n, null),
                e ||
                  Yt(
                    "El módulo de actualizaciones necesita reiniciarse: desenchufa la TV 30 segundos y vuelve a intentarlo."
                  ));
            })
          : (t && t(n, null),
            e || Yt("No se pudo comprobar actualizaciones: " + n));
      },
      15e3
    );
  }
  function sa() {
    Ht = !0;
    var e = t("dialog-addons");
    if (e) {
      (e.classList.add("is-active"), da());
      var a = e.querySelector(".focusable");
      a && rt(a);
    }
  }
  function la() {
    Ht = !1;
    var e = t("dialog-addons");
    if (e && (e.classList.remove("is-active"), X.channelsOpen)) {
      var a = Se ? Se.querySelector("#pc-btn-addons") : null;
      rt(a || Ce);
    }
  }
  function da() {
    for (
      var i = t("da-presets-list"),
        n = t("da-installed-list"),
        r = _t(),
        o = {},
        s = 0;
      s < r.length;
      s++
    )
      o[r[s].url] = !0;
    if (i) {
      a(i);
      for (var l = 0; l < Tt.length; l++)
        (function (t) {
          var a = e("div", "da-preset-item"),
            n = e("div", "da-preset-info");
          (n.appendChild(e("div", "da-preset-name", t.name)),
            n.appendChild(e("div", "da-preset-desc", t.desc)),
            a.appendChild(n));
          var r = !!o[t.url],
            s = e(
              "button",
              "da-preset-btn focusable" + (r ? " is-installed" : ""),
              r ? "✔ Instalado" : "+ Instalar"
            );
          ((s._activate = function () {
            r ||
              ((s.textContent = "Instalando…"),
              ca(t, function (e, t) {
                e
                  ? ((s.textContent = "Error"),
                    setTimeout(function () {
                      s.textContent = "+ Instalar";
                    }, 2e3))
                  : (da(), Mt && Mt.isAddon && $t());
              }));
          }),
            a.appendChild(s),
            i.appendChild(a));
        })(Tt[l]);
    }
    if (n)
      if ((a(n), r.length))
        for (var d = 0; d < r.length; d++)
          (function (t, a) {
            var i = e("div", "da-installed-item"),
              o = e("div", "da-installed-info"),
              s = e("div", "da-preset-name", t.name),
              l = e(
                "div",
                "da-preset-desc",
                (t.count ? t.count + " canales • " : "") + t.url
              );
            (o.appendChild(s), o.appendChild(l), i.appendChild(o));
            var d = e("button", "da-del-btn focusable", "Eliminar");
            ((d._activate = function () {
              (r.splice(a, 1), kt(r), da(), Mt && Mt.isAddon && $t());
            }),
              i.appendChild(d),
              n.appendChild(i));
          })(r[d], d);
      else
        n.appendChild(
          e(
            "div",
            "da-installed-empty",
            "No hay addons personalizados instalados aún. Instala una lista recomendada arriba o escribe una URL."
          )
        );
    var c = t("da-btn-add-custom");
    c &&
      (c._activate = function () {
        var e = t("da-custom-url"),
          a = e ? (e.value || "").trim() : "";
        a && /^https?:\/\//i.test(a)
          ? ((c.textContent = "Descargando…"),
            ca(
              {
                id: "custom_" + Date.now(),
                name: "Lista Personalizada",
                url: a,
              },
              function (t, a) {
                ((c.textContent = "Agregar"),
                  t
                    ? alert("No se pudo cargar la lista M3U: " + t)
                    : (e && (e.value = ""), da(), Mt && Mt.isAddon && $t()));
              }
            ))
          : alert("Por favor introduce una URL válida (http:// o https://)");
      });
    var p = t("da-btn-exit");
    p &&
      (p._activate = function () {
        la();
      });
  }
  function ca(e, t) {
    P("fetchM3u", { url: e.url }, function (a, i) {
      if (!a && i && i.channels && i.channels.length) {
        for (var n = _t(), r = !1, o = 0; o < n.length; o++)
          if (n[o].url === e.url) {
            ((n[o].count = i.channels.length), (r = !0));
            break;
          }
        (r ||
          n.push({
            id: e.id || "addon_" + Date.now(),
            name: e.name || "Lista M3U",
            url: e.url,
            count: i.channels.length,
          }),
          kt(n),
          t && t(null, i.channels.length));
      } else t && t(a || "No se encontraron canales en la lista");
    });
  }
  var pa = {
    bigW: 831,
    bigH: 534,
    bigY: 38.5,
    smallW: 413,
    smallH: 222,
    smallY: 578.5,
    bigX: [192, 1029],
    smallX: [192, 609, 1028, 1446],
  };
  function ua(t, a, n, r, o, s) {
    s = s || {};
    var l = e("div", "bento focusable");
    i(l, a, n, r, o);
    var d = t ? t.landscape || t.poster : "";
    if (d) {
      var c = e("img", "bento-img");
      (c.setAttribute("data-poster-src", d),
        (c.onerror = function () {
          if (
            this.src &&
            0 === this.src.indexOf("https://") &&
            !this._httpFallback
          )
            return (
              (this._httpFallback = !0),
              void (this.src = this.src.replace("https://", "http://"))
            );
          this.style.display = "none";
        }),
        l.appendChild(c));
    }
    return (
      s.shade && l.appendChild(e("div", "bento-shade")),
      s.title && t && l.appendChild(e("div", "bento-title", t.title)),
      s.badge && l.appendChild(e("div", "bento-badge", s.badge)),
      (l._item = t),
      t &&
        (l._activate = function () {
          ba(t);
        }),
      wt(),
      l
    );
  }
  function va(t, a, n, r) {
    var o = e("div", "bento-dots");
    i(o, t, a, 21 + 40 * Math.max(0, n - 1), 11);
    for (var s = 0; s < n; s++)
      o.appendChild(e("span", "bento-dot" + (s === r ? " is-active" : "")));
    return o;
  }
  function fa(e, t, a) {
    a = a || {};
    var i = t.length ? t : l;
    if (i.length) {
      var n;
      for (n = 0; n < 2; n++)
        e.appendChild(
          ua(i[n % i.length], pa.bigX[n], pa.bigY, pa.bigW, pa.bigH, {
            shade: !1 !== a.shade,
            title: a.titles,
          })
        );
      for (n = 0; n < 4; n++)
        e.appendChild(
          ua(
            i[(n + 2) % i.length],
            pa.smallX[n],
            pa.smallY,
            pa.smallW,
            pa.smallH,
            {}
          )
        );
      a.dots && e.appendChild(va(848, 535.5, a.dots, 0));
    }
  }
  function ha(e) {
    var t,
      a = [];
    if (e)
      for (t = 0; t < l.length; t++) {
        (-1 !==
          o(l[t].category || "")
            .split(",")
            .indexOf(e) ||
          (l[t].kind && -1 !== o(l[t].kind).indexOf(e))) &&
          a.push(l[t]);
      }
    return a.length ? a : l;
  }
  function ma(t, a, n, r) {
    if (!a || !a.length) return n;
    var o = n || 860,
      s = e("div", "kids-subtitle", r || "Catálogo");
    (i(s, 192, o, 1249, 40), t.appendChild(s), (o += 50));
    for (var l = Math.min(a.length, 60), d = 0; d < l; d++) {
      var c = 192 + 276 * (d % 6),
        p = o + 390 * Math.floor(d / 6);
      t.appendChild(xt(a[d], c, p, 250, 360, { gold: !0 }));
    }
    return o + 390 * Math.ceil(l / 6) + 25;
  }
  function ga(t, a, n, r) {
    if (!a || !a.length) return n;
    var o = n || 860,
      s = e("div", "kids-subtitle", r || "Catálogo");
    (i(s, 192, o, 1400, 40), t.appendChild(s), (o += 50));
    var l = e("div", "catalog-rail scrollable"),
      d,
      c;
    i(l, 192, o, 1656, 360);
    t.appendChild(l);
    l.style.width = "1656px";
    l.style.height = "360px";
    l.style.position = "absolute";
    l.style.overflowX = "auto";
    l.style.overflowY = "hidden";
    l.style.whiteSpace = "nowrap";
    l.style.scrollbarWidth = "none";
    l.style.webkitOverflowScrolling = "touch";
    l.classList.add("catalog-rail");
    l.style.minWidth = "1656px";
    d = Math.min(a.length, 50);
    for (c = 0; c < d; c++) {
      var poster = xt(a[c], 276 * c, 0, 250, 360, { gold: !0 });
      poster._onMove = (function (rail, idx, total) {
        return function (dir) {
          if ("right" === dir) {
            if (idx < total - 1 && rail.children[idx + 1]) {
              rt(rail.children[idx + 1]);
              return !0;
            }
            if (rail.children[0]) {
              rail.scrollLeft = 0;
              rt(rail.children[0]);
              return !0;
            }
          } else if ("left" === dir) {
            if (idx > 0 && rail.children[idx - 1]) {
              rt(rail.children[idx - 1]);
              return !0;
            }
            if (Ue && Ue[X.tab]) {
              rt(Ue[X.tab]);
              return !0;
            }
          }
          return !1;
        };
      })(l, c, d);
      l.appendChild(poster);
    }
    return o + 360 + 35;
  }
  function ya(e, t, a, i) {
    if (!t || !t.length) return a;
    var n,
      r,
      o,
      s,
      l,
      d,
      c,
      p,
      u = a || 860,
      v = {};
    if ((i = i || {}).bentoItems && i.bentoItems.length)
      for (n = 0; n < i.bentoItems.length; n++)
        i.bentoItems[n] &&
          i.bentoItems[n].id &&
          (v[String(i.bentoItems[n].id)] = !0);
    if (i.popularTitle) {
      var f = t.slice().sort(function (e, t) {
          var a = parseFloat(e && e.score) || 0;
          return (parseFloat(t && t.score) || 0) - a;
        }),
        h = [];
      for (r = 0; r < f.length && h.length < 30; r++) {
        var m = f[r];
        m && m.id && (h.push(m));
      }
      h.length && (u = ga(e, h, u, i.popularTitle));
    }
    var g = {},
      y = [];
    for (o = 0; o < t.length; o++) {
      var b = t[o],
        C = b.row ? String(b.row).trim() : "";
      ((C &&
        "all" !== C.toLowerCase() &&
        "todas" !== C.toLowerCase() &&
        "todos" !== C.toLowerCase()) ||
        (C =
          b.genres && b.genres[0] && "Sin clasificar" !== b.genres[0]
            ? b.genres[0]
            : ""),
        C || (C = i.fallbackRow || "Más títulos"),
        g[C] || ((g[C] = []), y.push(C)),
        g[C].push(b));
    }
    var w = {
        "2026 Peliculas teatrales": "Estrenos en cartelera",
        2026: "Novedades 2026",
        "Máscara perfecta": "Máscara perfecta (Especial)",
        "Asesino en serie": "Suspense y asesinos en serie",
        "Películas TOP15 clasificadas": "Películas TOP 15",
        "Dramas clasificados TOP15": "Series y dramas TOP 15",
        "HBO Movie": "Películas HBO",
        "Prime Video Movie": "Películas Prime Video",
        "Apple TV+ Movie": "Películas Apple TV+",
        "Paramount + Movie": "Películas Paramount+",
        "Hulu Movie": "Películas Hulu",
        "Netflix Movie": "Películas Netflix",
        "Disney Movie": "Películas Disney",
        "Netflix Series": "Series Netflix",
        "Disney Series": "Series Disney",
        "HBO Series": "Series HBO",
        "Prime Video Series": "Series Prime Video",
        "Apple TV+ Series": "Series Apple TV+",
        "Paramount + Series": "Series Paramount+",
        "Hulu Series": "Series Hulu",
        "TV Series": "Series de televisión",
        "Serie Turquía": "Series turcas",
        "Drama Coreano": "Dramas coreanos (K-Drama)",
        Telenovelas: "Telenovelas populares",
        "Vida familiar famosa": "Familias famosas y dramas",
        Acción: "Acción y aventura",
        Comedia: "Comedias destacadas",
        Horror: "Terror y horror",
        "Ciencia ficción": "Ciencia ficción y fantasía",
        Suspenso: "Suspense y misterio",
        Crimen: "Crimen y policíaco",
        Familia: "Películas en familia",
        Fantastico: "Fantasía épica",
        Romántico: "Romance y drama",
        "Animación Clásica": "Animación clásica",
        "Película de Animación": "Películas de animación",
        "Serie de Animación": "Series animadas",
        "Dragon Ball Collection": "Colección Dragon Ball",
        "Colección de Marvel": "Colección Marvel",
        "Coalition for DC": "Universo DC",
        "Anime Asiático": "Anime asiático",
        "Anime Europeo y Americano": "Anime internacional",
        "Película de Anime": "Películas de anime",
        "Serie de Anime": "Series de anime",
      },
      S = !1;
    for (s = 0; s < y.length; s++) {
      var x = y[s],
        T = g[x];
      if (T && T.length) {
        var _ = [];
        for (d = 0; d < T.length && _.length < 40; d++) {
          _.push(T[d]);
        }
        if (_.length) {
          u = ga(e, _, u, w[x] || x);
          S = !0;
        }
      }
    }
    var L = [];
    for (p = 0; p < t.length; p++) v[String(t[p].id)] || L.push(t[p]);
    return (
      L.length
        ? (u = ma(e, L, u, i.fallbackRow || "Más títulos del catálogo"))
        : S || ma(e, t, u, i.defaultTitle || "Catálogo"),
      u
    );
  }
  function ba(e) {
    if (
      ((X.resumePosition = 0),
      (X.detail = e),
      (X.detailReturn = { screen: X.screen, focus: X.focus }),
      (X.detailRange = 0),
      (X.detailSeason = 0),
      (X.detailEpisode = null),
      e.seasons && e.seasons.length)
    )
      for (var a = 0; a < e.seasons.length; a++)
        if (e.seasons[a].id === e.id) {
          X.detailSeason = a;
          break;
        }
    (e.episodes && e.episodes.length && (X.detailEpisode = e.episodes[0]),
      dn(e),
      _n(),
      xn(e),
      Mn(e),
      Ca(e),
      lt("detail"),
      Ce || lr());
    var i = t("screen-player");
    i && (i.classList.add("is-mini"), i.classList.add("is-active"));
    var n = le ? le.querySelector(".focusable") : null;
    (n && rt(n),
      e._detailsLoaded
        ? Jr(e, X.detailEpisode)
        : (jr("Preparando la reproducción…"),
          U(e, function (e) {
            e &&
              "detail" === X.screen &&
              X.detail === e &&
              (dn(e), Jr(e, X.detailEpisode));
          })));
  }
  function Ca(n) {
    ((oe = t("detail-left")),
      (se = t("detail-player")),
      (le = t("detail-buttons")),
      (de = t("detail-bottom")),
      a(oe),
      a(le),
      a(de));
    var r,
      o = e("div", "detail-titlewrap");
    if (
      (o.appendChild(e("div", "detail-title", n.title)),
      o.appendChild(e("div", "detail-score", n.score)),
      oe.appendChild(o),
      n.country || n.releaseDate || n.tagline)
    ) {
      var s = [];
      (n.country && s.push(n.country),
        n.releaseDate && s.push(n.releaseDate),
        n.tagline && s.push(n.tagline),
        (r = s.join(" | ")));
    } else {
      var d = [];
      (n.year && "—" !== n.year && d.push(n.year),
        n.duration && "—" !== n.duration && d.push(n.duration),
        d.push("HD"),
        (r = d.join("  ·  ")));
    }
    if ((oe.appendChild(e("div", "detail-meta", r)), x(n))) {
      var c = 0,
        p = /S(\d+)/i.exec(n.alias || "") || /T(\d+)/i.exec(n.title || "");
      if (
        (p && (c = parseInt(p[1], 10) || 0),
        !c && n.seasons && n.seasons.length)
      ) {
        var u = n.seasons[X.detailSeason] || n.seasons[0];
        c = (u && u.number) || 1;
      }
      c || (c = 1);
      var v =
        n.updateCount || n.volumeCount || (n.episodes ? n.episodes.length : 0);
      v && oe.appendChild(e("div", "detail-update", "T" + c + " - E" + v));
    }
    var f = e("div", "detail-genres");
    f.appendChild(e("span", "label", "Género : "));
    for (var h = 0; h < n.genres.length; h++) {
      var m = e("div", "chip", n.genres[h]);
      f.appendChild(m);
    }
    oe.appendChild(f);
    var g = e("div", "detail-row");
    g.appendChild(document.createTextNode("Director : "));
    var y = e("span", "val", n.director);
    (g.appendChild(y), oe.appendChild(g));
    var b = e("div", "detail-row");
    b.appendChild(document.createTextNode("Actors : "));
    var C = e("span", "val", n.actors);
    (b.appendChild(C), oe.appendChild(b));
    var w = e("div", "detail-synopsis");
    (w.appendChild(e("span", "label", "Sinopsis : ")),
      w.appendChild(e("div", "text", n.synopsis)));
    var S = e("div", "detail-more", "Más");
    (w.appendChild(S),
      oe.appendChild(w),
      a(se),
      se.classList.add("focusable"),
      (se._activate = function () {
        Kr(n, X.detailEpisode);
      }),
      (se._onMove = function () {
        return !1;
      }));
    var T = [
      {
        icon: "icon_detail_fullscreen.png",
        label: "Pantalla completa",
        kind: "fullscreen",
      },
      {
        icon: "icon_detail_subtitle_audio.png",
        label: "Idioma",
        kind: "language",
      },
      { icon: "icon_detail_favorite.png", label: "Favorito", kind: "favorite" },
    ];
    x(n) &&
      T.push({
        icon: "icon_detail_subscribe.png",
        label: "Notificaciones",
        kind: "subscribe",
      });
    for (var _ = 0; _ < T.length; _++) {
      var k = e("div", "detail-btn focusable"),
        L = e("img");
      ((L.src = "assets/original/vod/" + T[_].icon),
        (L.alt = ""),
        k.appendChild(L),
        k.appendChild(e("span", null, T[_].label)),
        (k._kind = T[_].kind),
        "favorite" === T[_].kind &&
          X.favs[String(n.id)] &&
          (k.classList.add("is-selected"),
          (k.querySelector("span").textContent = "En favoritos")),
        (k._activate = (function (e, t) {
          return function () {
            if ("fullscreen" === e) Kr(t, X.detailEpisode);
            else if ("language" === e) er(t);
            else if ("favorite" === e) {
              var a = Z(t);
              this.classList.toggle("is-selected", a);
              var i = this.querySelector("span");
              i && (i.textContent = a ? "En favoritos" : "Favorito");
            } else if ("subscribe" === e) {
              var n = this.querySelector("img"),
                r = -1 === n.src.indexOf("subscribed");
              n.src =
                "assets/original/vod/icon_detail_" +
                (r ? "subscribed" : "subscribe") +
                ".png";
            }
          };
        })(T[_].kind, n)),
        le.appendChild(k));
    }
    var M = e("div", "detail-btn focusable"),
      I = e("img");
    ((I.src = "assets/original/vod/icon_detail_quality.png"),
      (I.alt = ""),
      M.appendChild(I));
    var E = e(
      "span",
      null,
      "smooth" === X.streamMode ? "Modo fluido: Sí" : "Modo fluido: No"
    );
    (M.appendChild(E),
      (M._activate = function () {
        (Tn(n, "smooth" !== X.streamMode),
          (E.textContent =
            "smooth" === X.streamMode ? "Modo fluido: Sí" : "Modo fluido: No"));
      }),
      le.appendChild(M),
      (function (t) {
        var a = x(t) && t.episodes ? t.episodes : [],
          n = a.length > 0,
          r = wa(a.length);
        X.detailRange >= r.length && (X.detailRange = 0);
        if (x(t)) {
          var o = e("div", "detail-season focusable");
          (i(o, 80, 42, 280, 53),
            o.appendChild(
              e(
                "span",
                "season-text",
                (function (e) {
                  var t = 0;
                  if (e.seasons && e.seasons.length > 0) {
                    var a = e.seasons[X.detailSeason] || e.seasons[0];
                    t = a && a.number ? a.number : X.detailSeason + 1;
                  }
                  if (!t) {
                    var i =
                      /S(\d+)/i.exec(e.alias || "") ||
                      /T(\d+)/i.exec(e.title || "");
                    i && (t = parseInt(i[1], 10) || 0);
                  }
                  return "Temporada " + (t || 1);
                })(t)
              )
            ));
          var s = e("img", "season-arrow");
          ((s.src = "assets/original/vod/ic_down_icon.png"),
            (s.alt = "▼"),
            o.appendChild(s),
            (o._activate = function () {
              !t.seasons ||
                t.seasons.length < 2 ||
                (function (t, a) {
                  if (xa) return void Ta();
                  if (!a.seasons || a.seasons.length < 2) return;
                  var n = t.querySelector(".season-arrow");
                  n && n.classList.add("is-open");
                  i(
                    (xa = e("div", "season-popup")),
                    80,
                    100,
                    280,
                    Math.min(320, 54 * a.seasons.length)
                  );
                  for (var r = 0; r < a.seasons.length; r++)
                    (function (t) {
                      var i = a.seasons[t],
                        n = e(
                          "div",
                          "season-popup-item focusable" +
                            (t === X.detailSeason ? " is-selected" : "")
                        ),
                        r = "Temporada " + (i.number || t + 1);
                      n.appendChild(e("span", "season-item-text", r));
                      var o = e("img", "season-item-check");
                      ((o.src = "assets/original/vod/icon_nation_selected.png"),
                        (o.alt = ""),
                        n.appendChild(o),
                        (n._activate = function () {
                          if ((Ta(), X.detailSeason !== t)) {
                            ((X.detailSeason = t),
                              (X.detailRange = 0),
                              (X.detailEpisode = null));
                            var e = a.seasons[t];
                            e &&
                              e.id &&
                              (jr("Cargando temporada…"),
                              P("detail", { contentId: e.id }, function (t, i) {
                                (!t &&
                                  i &&
                                  !1 !== i.returnValue &&
                                  (i.item && H(a, i.item),
                                  (a.episodes = i.episodes || []),
                                  (a.seasonId = e.id),
                                  (e._episodes = a.episodes),
                                  (X.detailEpisode = a.episodes[0] || null)),
                                  Ca(a),
                                  X.detailEpisode && Jr(a, X.detailEpisode));
                                var n = de
                                  ? de.querySelector(".detail-season")
                                  : null;
                                n && rt(n);
                              }));
                          } else {
                            var i = de
                              ? de.querySelector(".detail-season")
                              : null;
                            i && rt(i);
                          }
                        }),
                        xa.appendChild(n));
                    })(r);
                  de.appendChild(xa);
                  var o = xa.children[X.detailSeason] || xa.children[0];
                  o && rt(o);
                })(o, t);
            }),
            de.appendChild(o));
        }
        if (n && a.length > 20) {
          var d = e("div", "detail-ranges");
          i(d, 398, 51, 1522, 46);
          for (var c = 0; c < r.length; c++)
            (function (a) {
              var n = e(
                "div",
                "detail-range focusable" +
                  (a === X.detailRange ? " is-selected" : ""),
                r[a].start + 1 + "-" + r[a].end
              );
              (i(n, 160 * a, 0, 150, 46),
                (n._activate = function () {
                  Sa(a, t);
                }),
                d.appendChild(n));
            })(c);
          de.appendChild(d);
        }
        if (n) {
          var p = r[X.detailRange] || { start: 0, end: a.length },
            u = e("div", "detail-episodes scrollable");
          i(u, 80, 149, 1840, 65);
          for (var v = p.start; v < p.end; v++)
            (function (a, n) {
              var r = e(
                "div",
                "detail-episode focusable" +
                  (X.detailEpisode &&
                  (X.detailEpisode.id === a.id || X.detailEpisode === a)
                    ? " is-playing"
                    : "")
              );
              i(r, 160 * n, 0, 150, 65);
              var o =
                void 0 !== a.number && null !== a.number
                  ? String(a.number)
                  : String(v + 1);
              (r.appendChild(e("span", "ep-num", o)),
                (r._ep = a),
                (r._activate = function () {
                  $n(t, a);
                }),
                u.appendChild(r));
            })(a[v], v - p.start);
          de.appendChild(u);
        }
        var f = n ? 240 : 25,
          h = n ? 290 : 91,
          m = e("div", "detail-related", "Quizás te guste");
        (i(m, 80, f, 400, 44), de.appendChild(m));
        var g = e("div", "detail-grid scrollable");
        i(g, 80, h, 1750, n ? 180 : 380);
        var y = parseInt(t.id, 10);
        if (isNaN(y)) {
          y = 0;
          for (var b = 0; b < l.length; b++)
            if (l[b] === t) {
              y = b;
              break;
            }
        }
        for (var C = (3 * y) % Math.max(1, l.length - 6), w = 0; w < 8; w++) {
          var S = l[(C + w) % l.length];
          if (S) {
            var T = e("div", "cell");
            (T.appendChild(xt(S, 0, 0, 210, 308, { gold: !0 })),
              T.appendChild(e("div", "d-name", S.title)),
              g.appendChild(T));
          }
        }
        de.appendChild(g);
      })(n));
  }
  function wa(e) {
    for (var t = [], a = 0; a < e; a += 20)
      t.push({ start: a, end: Math.min(e, a + 20) });
    return t;
  }
  function Sa(e, t) {
    ((X.detailRange = e), Ca(t));
    var a = de.querySelector(".detail-range.is-selected");
    a && rt(a);
  }
  var xa = null;
  function Ta() {
    xa && xa.parentNode && (xa.parentNode.removeChild(xa), (xa = null));
    var e = de ? de.querySelector(".season-arrow") : null;
    e && e.classList.remove("is-open");
  }
  function _a() {
    ((ce = t("search-keyboard")),
      (pe = t("search-hot")),
      (ue = t("search-results")),
      (ve = t("search-empty")),
      (fe = t("search-hot-grid")),
      (he = t("search-result-grid")),
      (ge = t("search-nav")),
      a(ce),
      a(fe),
      a(he),
      ue && ue.classList.add("scrollable"),
      ((me = e("div", "kb-edit focusable"))._activate = function () {}),
      ce.appendChild(me));
    for (
      var i = e("div", "kb-actions"),
        n = [
          { cls: "switch", w: 100.5 },
          { cls: "clear", w: 100.5 },
          { cls: "del", w: 100.5 },
          { cls: "go", w: 120 },
        ],
        r = 0;
      r < n.length;
      r++
    ) {
      var o = e("div", "kb-action focusable " + n[r].cls);
      ((o.style.width = n[r].w + "px"),
        "go" === n[r].cls
          ? (o.textContent = "Busca")
          : o.appendChild(e("div", "ico")),
        (o._kind = n[r].cls),
        (o._activate = (function (e) {
          return function () {
            "switch" === e
              ? Ra()
              : "clear" === e
                ? Aa("")
                : "del" === e
                  ? Aa(X.searchQuery.slice(0, -1))
                  : Pa();
          };
        })(n[r].cls)),
        i.appendChild(o));
    }
    (ce.appendChild(i), (Be = []));
    for (
      var s = [
          ["A", "Á", "B", "C", "D", "E", "É"],
          ["F", "G", "H", "I", "Í", "J", "K"],
          ["L", "M", "N", "Ñ", "O", "Ó", "P"],
          ["Q", "R", "S", "T", "U", "Ú", "Ü"],
          ["V", "W", "X", "Y", "Z", " "],
        ],
        l = 0;
      l < s.length;
      l++
    ) {
      var d = e("div", "kb-row");
      d.style.top = 264 + 88.5 * l + "px";
      for (var c = 0; c < s[l].length; c++) {
        var p = e(
          "div",
          "kb-key focusable" + (" " === s[l][c] ? " space" : ""),
          " " === s[l][c] ? "" : s[l][c]
        );
        ((p._char = s[l][c]),
          (p._activate = (function (e) {
            return function () {
              Aa(X.searchQuery + e);
            };
          })(s[l][c])),
          d.appendChild(p),
          Be.push(p));
      }
      ce.appendChild(d);
    }
    var u = e("div", "kb-feedback focusable", "Feedback");
    ((u._activate = function () {}),
      ce.appendChild(u),
      Ia(),
      ue.classList.remove("is-active"),
      ve.classList.remove("is-active"),
      pe.classList.remove("is-hidden"),
      Ea());
  }
  function ka(t, a) {
    var n = e("div", "search-cell");
    return (
      i(n, (a % 5) * 246, 437 * Math.floor(a / 5), 246, 437),
      n.appendChild(xt(t, 0, 0, 222, 329, { gold: !0 })),
      n.appendChild(e("div", "s-name", t.title)),
      n
    );
  }
  function closeCatalogFilter() {
    var e = catalogFilterDialog;
    ((catalogFilterDialog = null),
      e && e.parentNode && e.parentNode.removeChild(e),
      catalogFilterReturn && at(catalogFilterReturn) && rt(catalogFilterReturn),
      (catalogFilterReturn = null));
  }
  function applyCatalogFilter(e) {
    var t = [],
      a = "";
    for (var i = 0; i < l.length; i++) {
      var n = l[i],
        r = o((n.kind || "") + " " + (n.category || "") + " " + (n.genres || []).join(" ")),
        s = x(n);
      ("movies" === e
        ? !s
        : "series" === e
          ? s
          : "anime" === e
            ? -1 !== r.indexOf("anime") || -1 !== r.indexOf("animacion")
            : "novels" === e
              ? -1 !== r.indexOf("novela") || -1 !== r.indexOf("telenovela")
              : !0) && t.push(n);
    }
    ("movies" === e
      ? (a = "Películas")
      : "series" === e
        ? (a = "Series")
        : "anime" === e
          ? (a = "Anime")
          : "novels" === e && (a = "Novelas"),
      closeCatalogFilter(),
      (X.searchQuery = "Filtro: " + (a || "Todo el catálogo")),
      Ea(),
      qa(t),
      lt("search"),
      Yt(t.length ? t.length + " títulos en " + (a || "el catálogo") : "No hay títulos en este filtro"));
  }
  function openCatalogFilter(returnFocus) {
    if (catalogFilterDialog) return void closeCatalogFilter();
    var a = e("div", "catalog-filter-dialog"),
      i = e("div", "catalog-filter-card"),
      n = e("div", "catalog-filter-title", "Filtrar catálogo"),
      r = e("div", "catalog-filter-sub", "Elige qué deseas ver"),
      o = [
        { id: "all", label: "Todo" },
        { id: "movies", label: "Películas" },
        { id: "series", label: "Series" },
        { id: "anime", label: "Anime" },
        { id: "novels", label: "Novelas" },
      ],
      s = [];
    ((catalogFilterReturn = returnFocus || X.focus),
      a.appendChild(i),
      i.appendChild(n),
      i.appendChild(r));
    for (var l = 0; l < o.length; l++)
      (function (t, n) {
        var r = e("button", "catalog-filter-option focusable", t.label);
        ((r._activate = function () {
          applyCatalogFilter(t.id);
        }),
          (r._onMove = function (e) {
            return "left" === e && n > 0
              ? (rt(s[n - 1]), !0)
              : "right" === e && n < s.length - 1
                ? (rt(s[n + 1]), !0)
                : "up" === e || "down" === e
                  ? !0
                  : !1;
          }),
          i.appendChild(r),
          s.push(r));
      })(o[l], l);
    ((catalogFilterDialog = a),
      (t("app") || document.body).appendChild(a),
      s[0] && rt(s[0]));
  }
  function La() {
    (ce || _a(), lt("search"), X.searchQuery || Ia(), rt(me));
  }
  function Ma() {
    var e = ha("destacado"),
      t = e && e.length ? e.slice(0, 10) : [];
    return (
      t.length ||
        (t = (function () {
          for (var e = M(), t = [], a = 0; a < e.length; a++)
            -1 !==
              String((e[a] && e[a].category) || "")
                .toLowerCase()
                .indexOf("busqueda") && t.push(T(e[a], a + 1));
          return t;
        })()),
      t.length || (t = l.slice(0, 10)),
      t
    );
  }
  function Ia() {
    if (fe && !X.searchQuery) {
      a(fe);
      for (var e = Ma(), t = 0; t < e.length; t++) fe.appendChild(ka(e[t], t));
      wt();
    }
  }
  function Ea() {
    me &&
      (X.searchQuery
        ? ((me.textContent = X.searchQuery),
          me.classList.remove("is-placeholder"))
        : ((me.textContent = "Buscar películas, series, directores y actores."),
          me.classList.add("is-placeholder")));
  }
  function Aa(e) {
    ((X.searchQuery = e), Ea(), Pa());
  }
  function Da() {
    (X.searchTimer && (clearTimeout(X.searchTimer), (X.searchTimer = null)),
      (X.searchQuery = ""),
      Ea(),
      he && a(he),
      (X.searchMatches = []),
      (X.searchPage = 0),
      ge && (ge.textContent = ""),
      ue && ue.classList.remove("is-active"),
      ve && ve.classList.remove("is-active"),
      pe && pe.classList.remove("is-hidden"));
  }
  function Pa() {
    var e = X.searchQuery || "",
      t = o(e.trim());
    if (t) {
      for (var a = [], i = 0; i < l.length; i++) {
        var n = o(l[i].title || ""),
          r = l[i].alias ? o(l[i].alias) : "";
        (-1 !== n.indexOf(t) || (r && -1 !== r.indexOf(t))) && a.push(l[i]);
      }
      if (
        (qa(a),
        X.searchTimer && clearTimeout(X.searchTimer),
        "portal" === p.mode && t.length >= 2)
      ) {
        var s = ++X.searchSeq;
        X.searchTimer = setTimeout(function () {
          P("search", { value: e.trim() }, function (e, t) {
            if (
              s === X.searchSeq &&
              !e &&
              t &&
              !1 !== t.returnValue &&
              t.items &&
              t.items.length
            ) {
              for (var i = a.slice(), n = {}, r = 0; r < i.length; r++)
                n[String(i[r].id)] = !0;
              for (var o = 0; o < t.items.length; o++) {
                var l = T(t.items[o], i.length + 1);
                n[String(l.id)] || ((n[String(l.id)] = !0), i.push(l));
              }
              qa(i);
            }
          });
        }, 350);
      }
    } else Da();
  }
  var Oa = 10;
  function qa(e) {
    ((X.searchMatches = e || []), (X.searchPage = 0), Na(0, -1));
  }
  function Na(e, t) {
    var i = X.searchMatches || [];
    if (
      (pe.classList.add("is-hidden"),
      ue.classList.add("is-active"),
      a(he),
      0 === i.length)
    )
      return (
        ve.classList.add("is-active"),
        void (ge && (ge.textContent = ""))
      );
    ve.classList.remove("is-active");
    var r = Math.ceil(i.length / Oa),
      o = Math.max(0, Math.min(r - 1, e || 0));
    X.searchPage = o;
    var s = o * Oa,
      l = Math.min(i.length, s + Oa);
    ge &&
      (ge.textContent =
        "Resultados " +
        (s + 1) +
        "-" +
        l +
        " de " +
        i.length +
        (r > 1 ? "  ·  Página " + (o + 1) + "/" + r : ""));
    for (var d = s; d < l; d++) {
      var c = d - s,
        p = ka(T(i[d], d + 1), c),
        u = p.querySelector(".poster");
      (u &&
        (function (e, t) {
          u._onMove = function (a) {
            return "down" === a && e >= 5 && l < i.length
              ? (Na(o + 1, t), !0)
              : "up" === a && e < 5 && s > 0 && (Na(o - 1, 5 + t), !0);
          };
        })(c, c % 5),
        he.appendChild(p));
    }
    if (((he.style.height = "874px"), t >= 0)) {
      var v = he.querySelectorAll(".poster.focusable")[t];
      (v || (v = ot(he)), v && rt(v));
    } else if (
      "search" === X.screen &&
      (n(X.focus, ".search-hot") || n(X.focus, ".search-results"))
    ) {
      var f = ot(he);
      f && rt(f);
    }
  }
  function Ra() {
    X.searchNumeric = !X.searchNumeric;
    var t = ce.querySelector(".kb-action.switch .ico");
    t &&
      (t.style.backgroundImage =
        "url(assets/original/search/" +
        (X.searchNumeric ? "ic_vod_search_abc.png" : "ic_vod_search_123.png") +
        ")");
    var a = ce.querySelectorAll(".kb-row:not(.kb-row-num)");
    if (X.searchNumeric) {
      for (var i = 0; i < a.length; i++) a[i].classList.add("hidden");
      if (!ce.querySelector(".kb-row-num"))
        for (
          var n = [
              ["1", "2", "3", "4", "5", "6", "7"],
              ["8", "9", "0", " "],
            ],
            r = 0;
          r < n.length;
          r++
        ) {
          var o = e("div", "kb-row kb-row-num");
          o.style.top = 264 + 88.5 * r + "px";
          for (var s = 0; s < n[r].length; s++) {
            var l = e(
              "div",
              "kb-key focusable" + (" " === n[r][s] ? " space" : ""),
              " " === n[r][s] ? "" : n[r][s]
            );
            ((l._activate = (function (e) {
              return function () {
                Aa(X.searchQuery + e);
              };
            })(n[r][s])),
              o.appendChild(l));
          }
          ce.appendChild(o);
        }
      for (var d = ce.querySelectorAll(".kb-row-num"), c = 0; c < d.length; c++)
        d[c].classList.remove("hidden");
    } else {
      for (var p = 0; p < a.length; p++) a[p].classList.remove("hidden");
      Be.forEach(function (e) {
        e.classList.remove("hidden");
      });
      for (var u = ce.querySelectorAll(".kb-row-num"), v = 0; v < u.length; v++)
        u[v].classList.add("hidden");
    }
  }
  function Va() {
    ((ye = t("settings-menu")),
      (be = t("settings-right")),
      a(ye),
      a(be),
      (je = []));
    for (var n = null, r = 0; r < j.length; r++) {
      var o = j[r];
      if (o.group && o.group !== n) {
        var s = e("div", "settings-group", (n = o.group));
        ye.appendChild(s);
      }
      var l = e("div", "settings-item focusable"),
        d = e("div", "settings-icon");
      ((d.innerHTML = W[o.id] || ""), l.appendChild(d));
      var c = e("div", "settings-text");
      (c.appendChild(e("div", "settings-label", o.label)),
        o.desc && c.appendChild(e("div", "settings-desc", o.desc)),
        l.appendChild(c),
        (l._index = r),
        (l._activate = (function (e) {
          return function () {
            Ua(e, !0);
          };
        })(r)),
        (l._onMove = function (e) {
          if ("right" === e) {
            var t = ot(be.querySelector(".settings-panel.is-active"));
            return (t && rt(t), !0);
          }
          return !1;
        }),
        ye.appendChild(l),
        je.push(l));
    }
    for (var p in (((ze = {}).profile = za()),
    (ze.history = ja()),
    (ze.addons = Wa()),
    (ze.share = (function () {
      var t = e("div", "settings-panel share-panel");
      (t.appendChild(e("div", "share-head", "Compartir XuperTV")),
        t.appendChild(
          e(
            "div",
            "share-sub",
            "Instala XuperTV en cualquier otro televisor LG webOS de tu hogar o de tus amigos directamente desde el instalador IPK."
          )
        ));
      var a = e("div", "share-free");
      (a.appendChild(e("div", "share-free-badge", "100% GRATIS")),
        a.appendChild(
          e(
            "div",
            "share-free-text",
            "Esta aplicación es y siempre será gratuita y sin fines de lucro. No compres suscripciones ni pagues a intermediarios."
          )
        ),
        t.appendChild(a));
      var i = e("div", "share-warning");
      (i.appendChild(
        e(
          "div",
          "share-warning-title",
          "Protege a tu comunidad contra revendedores"
        )
      ),
        i.appendChild(
          e(
            "div",
            "share-warning-text",
            "Si alguien intentó cobrarte por esta app, repórtalo en nuestra comunidad. El código y las descargas son abiertas."
          )
        ),
        t.appendChild(i));
      var n = e("div", "share-qr-box"),
        r = e("img", "share-qr");
      ((r.src = "assets/original/settings/qr_telegram.png"),
        (r.alt = "Telegram QR"),
        n.appendChild(r));
      var o = e("div", "share-qr-text");
      return (
        o.appendChild(
          e("div", "share-qr-title", "Canal oficial de novedades y soporte")
        ),
        o.appendChild(
          e(
            "div",
            "share-qr-line",
            "Únete a nuestro canal para descargar las versiones más recientes, reportar incidencias y conocer nuevas funciones."
          )
        ),
        o.appendChild(e("div", "share-qr-handle", "@CristiancoDEV")),
        o.appendChild(
          e(
            "div",
            "share-qr-url",
            "https://github.com/cristianco7/XUPER-HYDRA-PORT-WEBOS"
          )
        ),
        n.appendChild(o),
        t.appendChild(n),
        t
      );
    })()),
    (ze.playback = (function () {
      var t = Fa("Configuración global de reproducción");
      (t.appendChild(e("div", "sp-hr")),
        t.appendChild(
          e(
            "div",
            "sp-global-note",
            "Estas preferencias se aplican automáticamente a todas las películas y series nuevas."
          )
        ),
        Ba(
          t,
          198,
          "Reproductor",
          ["Normal (directo)", "Modo fluido"],
          "streamMode",
          "smooth" === X.playback.streamMode ? 1 : 0
        ),
        Ba(
          t,
          307,
          "Formato de pantalla",
          ["Pantalla completa", "Normal", "16:9", "4:3"],
          "screen",
          X.playback.screen
        ),
        Ba(
          t,
          416,
          "Audio preferido",
          ["Español", "Portugués", "Inglés"],
          "audio",
          X.playback.audio
        ),
        t.appendChild(i(e("div", "sp-hr"), 0, 535, 1498, 1)),
        t.appendChild(e("div", "sp-subtitle-h", "Subtitulos")));
      var a = e(
        "div",
        "sp-switch focusable " + (X.playback.subtitle ? "on" : "off")
      );
      return (
        (a._activate = function () {
          ((X.playback.subtitle = !X.playback.subtitle),
            (a.className =
              "sp-switch focusable " + (X.playback.subtitle ? "on" : "off")),
            Y(),
            rt(a));
        }),
        t.appendChild(a),
        Ba(
          t,
          680,
          "Idioma",
          ["Español", "Portugués", "Inglés"],
          "subLang",
          X.playback.subLang
        ),
        Ba(
          t,
          793,
          "Tamaño",
          ["Normal", "Grande", "Pequeño"],
          "size",
          X.playback.size
        ),
        (function (t, a) {
          var i = e("div", "pb-row");
          ((i.style.top = a + "px"),
            i.appendChild(e("div", "pb-label", "Estilo")));
          for (var n = ["#ffffff", "#f6e33f", "#ffffff"], r = 0; r < 3; r++) {
            var o = e(
              "div",
              "pb-opt focusable" +
                (r === X.playback.style ? " is-checked" : "")
            );
            ((o.style.marginLeft = (0 === r ? 0 : 28) + "px"),
              o.appendChild(e("div", "radio")));
            var s = e("span", null, "Aa");
            ((s.style.color = n[r]),
              2 === r &&
                ((s.style.background = "#000000"),
                (s.style.display = "inline-block"),
                (s.style.width = "94px"),
                (s.style.height = "50px"),
                (s.style.lineHeight = "50px"),
                (s.style.fontSize = "28px")),
              o.appendChild(s),
              (o._group = "style"),
              (o._index = r),
              (o._activate = function () {
                ((X.playback.style = this._index), nn(), Y());
                for (
                  var e = t.querySelectorAll(".pb-opt"), a = 0;
                  a < e.length;
                  a++
                )
                  "style" === e[a]._group &&
                    e[a].classList.toggle(
                      "is-checked",
                      e[a]._index === this._index
                    );
              }),
              i.appendChild(o));
          }
          t.appendChild(i);
        })(t, 906),
        t
      );
    })()),
    (ze.netdiag = (function () {
      var t = Fa("Diagnóstico de red");
      (t.appendChild(
        e(
          "div",
          "dg-note",
          "Comprueba si tu operador de internet está bloqueando los servidores de XuperTV. La app ya usa un DNS seguro (DNS-over-HTTPS) para evitarlo; esta prueba solo lo muestra."
        )
      ),
        t.appendChild(i(e("div", "sp-hr"), 0, 216, 1478, 1)));
      var n = e("div", "dg-btn focusable", "Analizar red");
      i(n, 52, 242, 330, 66);
      var r = e("div", "dg-btn dg-report-btn focusable", "Generar reporte");
      i(r, 400, 242, 330, 66);
      var o = e("div", "dg-summary", 'Pulsa "Analizar red" para empezar.');
      i(o, 750, 242, 676, 66);
      var s = e("div", "dg-head");
      (i(s, 52, 336, 1380, 40),
        s.appendChild(e("span", "dg-host", "Dominio")),
        s.appendChild(e("span", "dg-local", "DNS del televisor")),
        s.appendChild(e("span", "dg-state", "Estado")),
        s.appendChild(e("span", "dg-ip", "Dirección real (DNS seguro)")));
      var l = e("div", "dg-list");
      i(l, 52, 378, 1380, 450);
      var d = e("div", "dg-env", "");
      (i(d, 52, 832, 1380, 32), ($a = d));
      var c = e(
        "div",
        "dg-foot",
        'Si el estado dice "Bloqueado", tu operador está interceptando el nombre del servidor, pero la app ya conecta por la dirección real. El reproductor Normal y el Modo Fluido usan este mismo DNS seguro. Si el vídeo sigue sin abrir con la conexión en verde, el bloqueo es por dirección: hace falta un túnel (VPN local).'
      );
      return (
        i(c, 52, 872, 1380, 150),
        (n._activate = function () {
          Za(n, o, l);
        }),
        (r._activate = function () {
          !(function (t, i) {
            if (!Xa.report) {
              (Xa.runId++, (Xa.running = !1));
              var n = window.__xuperViewport || {};
              Xa.report = {
                version:
                  (document.querySelector(".welcome-version") || {})
                    .textContent || "desconocida",
                verdict: "sin respuesta",
                partial: !0,
                pending: !0,
                screen: {
                  w: n.w || 0,
                  h: n.h || 0,
                  scale: n.scale || 0,
                  panelW: n.panelW || 0,
                  panelH: n.panelH || 0,
                },
                layers: {},
                hosts: [],
              };
            }
            a(i);
            var r = e(
              "div",
              "dg-report",
              (function (e) {
                var t = [],
                  a = e.screen || {},
                  i = e.layers || {},
                  n = e.hosts || [];
                (t.push("REPORTE DE SOPORTE XUPERTV"),
                  t.push("Versión: " + (e.version || "desconocida")),
                  t.push(
                    "Pantalla: " +
                      (a.w && a.h ? a.w + "×" + a.h : "sin datos") +
                      (a.panelW && a.panelH
                        ? " | panel " + a.panelW + "×" + a.panelH
                        : "") +
                      (a.scale ? " | escala " + a.scale : "")
                  ),
                  t.push(
                    "Red: " +
                      (e.verdict || "sin resultado") +
                      (e.partial ? " (parcial)" : "")
                  ),
                  e.pending &&
                    t.push(
                      "Diagnóstico: sin respuesta / detenido para generar este reporte"
                    ));
                e.serviceError && t.push("Servicio: " + Ka(e.serviceError));
                (t.push("Portal: " + Ya(i.portal)),
                  t.push("Sesión: " + Ya(i.session)),
                  t.push("TV en vivo: " + Ya(i.live)),
                  t.push("Películas/series: " + Ya(i.vod)),
                  t.push(
                    "Reproductor: " +
                      (X.playerMode || "sin reproducción") +
                      " | modo " +
                      (X.streamMode || "normal") +
                      (X.streamError ? " | error " + Ka(X.streamError) : "")
                  ));
                for (var r = 0; r < n.length && r < 5; r++)
                  t.push(
                    "Host " +
                      (r + 1) +
                      ": " +
                      Ka(n[r].host) +
                      " — " +
                      Ka(n[r].verdict || "sin datos")
                  );
                return (
                  t.push(""),
                  t.push(
                    "Privacidad: este reporte no incluye enlaces, tokens, cabeceras ni historial."
                  ),
                  t.push(
                    "Toma una foto de esta pantalla y envíala al soporte."
                  ),
                  t.join("\n")
                );
              })(Xa.report)
            );
            (i.appendChild(r),
              (t.className = "dg-summary ok"),
              (t.textContent =
                "Reporte listo. Toma una foto de esta pantalla y envíala al soporte."));
          })(o, l);
        }),
        (t._ensureDiag = function () {
          Xa.report ? Ja(o, l, Xa.report) : Za(n, o, l);
        }),
        t.appendChild(n),
        t.appendChild(r),
        t.appendChild(o),
        t.appendChild(s),
        t.appendChild(l),
        t.appendChild(d),
        t.appendChild(c),
        t
      );
    })()),
    (ze.parent = (function () {
      var t = e("div", "settings-panel");
      (t.appendChild(
        e("div", "pl-title", "Contenido para adultos (+18)")
      ),
        t.appendChild(
          e(
            "div",
            "pl-tip",
            "Elige si deseas mostrar contenido y canales clasificados para mayores de edad en este televisor."
          )
        ),
        t.appendChild(e("div", "pl-label", "Contenido +18")));
      var a = e(
          "div",
          "sp-switch focusable " + (X.adultEnabled ? "on" : "off")
        ),
        i = e(
          "div",
          "pl-note",
          X.adultEnabled
            ? "Activo: se mostrarán categorías y canales +18."
            : "Desactivado: se ocultarán categorías y canales +18."
        );
      return (
        (a._activate = function () {
          ((X.adultEnabled = !X.adultEnabled),
            (Q.adultEnabled = X.adultEnabled),
            K($, Q),
            (a.className =
              "sp-switch focusable " + (X.adultEnabled ? "on" : "off")),
            (i.textContent = X.adultEnabled
              ? "Activo: se mostrarán categorías y canales +18."
              : "Desactivado: se ocultarán categorías y canales +18."),
            Qt(liveFavoritesOnly),
            hr(X.channel),
            Yt(X.adultEnabled ? "Contenido +18 habilitado" : "Contenido +18 oculto"),
            rt(a));
        }),
        t.appendChild(a),
        t.appendChild(i),
        t
      );
    })()),
    (ze.display = (function () {
      var t = Fa("Pantalla y compatibilidad"),
        a = e(
          "div",
          "sp-global-note",
          "La compatibilidad 720p se aplica al instalar esta versión. Este ajuste no reduce ni modifica la superficie de vídeo."
        ),
        i = e("div", "pb-row"),
        n = [
          { id: "auto", label: "Automático" },
          { id: "hd", label: "Compatibilidad HD" },
        ];
      (t.appendChild(a),
        (i.style.top = "210px"),
        i.appendChild(e("div", "pb-label", "Tamaño de interfaz")));
      for (var r = 0; r < n.length; r++)
        (function (a) {
          var r = e(
            "div",
            "pb-opt focusable" +
              (Q.uiScaleMode === a.id ? " is-checked" : "")
          );
          ((r.style.marginLeft = 0 === a.index ? 0 : 28 + "px"),
            r.appendChild(e("div", "radio")),
            r.appendChild(e("span", null, a.label)),
            (r._activate = function () {
              ((Q.uiScaleMode = a.id),
                K($, Q),
                oo(),
                Yt(
                  "hd" === a.id
                    ? "Compatibilidad HD activada"
                    : "Tamaño automático restaurado"
                ));
              for (var e = i.querySelectorAll(".pb-opt"), t = 0; t < e.length; t++)
                e[t].classList.toggle("is-checked", e[t] === r);
              rt(r);
            }),
            i.appendChild(r));
        })({ id: n[r].id, label: n[r].label, index: r });
      return (t.appendChild(i), t);
    })()),
    (ze.feedback = (function () {
      var t = e("div", "settings-panel");
      (t.appendChild(e("div", "fb-title", "Ayuda y Feedback")),
        t.appendChild(e("div", "fb-hr")),
        t.appendChild(
          e(
            "div",
            "fb-contact",
            "Si tiene alguna duda, puede ponerse en contacto con nosotros a través de los siguientes medios:"
          )
        ),
        t.appendChild(
          e(
            "div",
            "fb-qr-note",
            "Escanee el código QR para enviar sugerencias o comentarios."
          )
        ));
      var a = e("div", "fb-qr");
      t.appendChild(a);
      var i = e("div", "fb-help focusable", "Ayuda");
      return ((i._activate = function () {}), t.appendChild(i), t);
    })()),
    (ze.about = (function () {
      var t = e("div", "settings-panel");
      (t.appendChild(e("div", "sp-title plain", "Sobre nosotros")),
        t.appendChild(i(e("div", "sp-hr soft"), 0, 165, 1498, 1)),
        t.appendChild(
          e(
            "div",
            "sp-about-body",
            "Xuper TV se dedica a ofrecer a los usuarios una amplia variedad de recursos de alta calidad. Aquí encontrarás miles de películas, series, animes y canales en vivo, todo reunido en un solo lugar. Brindamos una experiencia estable, diversa y siempre actualizada, además de contenidos gratuitos para disfrutar."
          )
        ));
      var a = e(
        "div",
        "sp-about-port",
        "Port para LG webOS realizado por CristiancoDEV"
      );
      ((a.style.top = "380px"), t.appendChild(a));
      var n = e("div", "sp-about-mail"),
        r = e("img");
      ((r.src = "assets/original/settings/vod_email_icon.png"),
        (r.alt = ""),
        n.appendChild(r),
        n.appendChild(e("span", null, "escuchamos-tv@outlook.com")),
        t.appendChild(n));
      var o = e("div", "sp-about-update-box");
      (o.appendChild(
        e("div", "sp-about-update-title", "Actualizaciones de XuperTV")
      ),
        o.appendChild(
          e(
            "div",
            "sp-about-update-desc",
            "Versión instalada: v2.2.77. Puedes actualizar la app directamente desde tu televisor sin necesidad de usar un PC."
          )
        ));
      var s = e("div", "sp-about-update-row"),
        l = e(
          "button",
          "sp-about-update-btn focusable",
          "Buscar actualizaciones"
        ),
        d = e("span", "sp-about-update-msg");
      return (
        (l._activate = function () {
          ((l.textContent = "Comprobando..."),
            (d.textContent = ""),
            oa(!1, function (e, t) {
              ((l.textContent = "Buscar actualizaciones"),
                e
                  ? ((d.textContent = "Error: " + ((e && e.message) || e)),
                    (d.style.color = "#ef4444"))
                  : t && t.updateAvailable
                    ? ((d.textContent =
                        "¡Nueva versión disponible: v" + t.latestVersion + "!"),
                      (d.style.color = "#22c55e"))
                    : ((d.textContent =
                        "Tienes la versión más reciente (v2.2.77)."),
                      (d.style.color = "#38bdf8")));
            }));
        }),
        s.appendChild(l),
        s.appendChild(d),
        o.appendChild(s),
        t.appendChild(o),
        t
      );
    })()),
    ze))
      ze.hasOwnProperty(p) && be.appendChild(ze[p]);
  }
  function Ha() {
    (ye || Va(), lt("settings"), Ua(0, !1), rt(je[0]));
  }
  function Ua(e, a) {
    if ("string" == typeof e)
      for (var i = 0; i < j.length; i++)
        if (j[i].id === e) {
          e = i;
          break;
        }
    e = Number(e) || 0;
    var n = (j[e] && j[e].id) || "profile",
      r = t("screen-settings");
    if (
      (r && r.classList.toggle("is-history-view", "history" === n),
      "profile" === n && ze.profile && be)
    ) {
      var o = za();
      (be.replaceChild(o, ze.profile), (ze.profile = o));
    } else if ("history" === n && ze.history && be) {
      var s = ja();
      (be.replaceChild(s, ze.history), (ze.history = s));
    } else if ("addons" === n && ze.addons && be) {
      var l = Wa();
      (be.replaceChild(l, ze.addons), (ze.addons = l));
    } else
      "netdiag" === n &&
        ze.netdiag &&
        ze.netdiag._ensureDiag &&
        ze.netdiag._ensureDiag();
    for (var d = 0; d < je.length; d++)
      je[d].classList.toggle("is-selected", d === e);
    for (var c in ze)
      ze.hasOwnProperty(c) && ze[c].classList.toggle("is-active", c === n);
    a && rt(ot(ze[n]) || je[e]);
  }
  function Fa(t) {
    var a = e("div", "settings-panel");
    return (a.appendChild(e("div", "sp-title", t)), a);
  }
  function Ba(t, a, i, n, r, o) {
    var s = e("div", "pb-row");
    ((s.style.top = a + "px"), s.appendChild(e("div", "pb-label", i)));
    for (var l = 0; l < n.length; l++) {
      var d = e("div", "pb-opt focusable" + (l === o ? " is-checked" : ""));
      ((d.style.marginLeft = (0 === l ? 0 : 28) + "px"),
        d.appendChild(e("div", "radio")),
        d.appendChild(e("span", null, n[l])),
        (d._group = r),
        (d._index = l),
        (d._activate = function () {
          ("streamMode" === this._group
            ? ((X.playback.streamMode =
                1 === this._index ? "smooth" : "normal"),
              (Cn = {}),
              X.playerItem && xn(X.playerItem))
            : (X.playback[this._group] = this._index),
            nn(),
            Y());
          for (var e = t.querySelectorAll(".pb-opt"), a = 0; a < e.length; a++)
            e[a]._group === this._group &&
              e[a].classList.toggle("is-checked", e[a]._index === this._index);
        }),
        s.appendChild(d));
    }
    t.appendChild(s);
  }
  function za() {
    var t = e("div", "settings-panel account-panel"),
      a = e("div", "account-avatar");
    ((a.innerHTML = W.profile),
      t.appendChild(a),
      t.appendChild(e("div", "account-number", Q.id)),
      t.appendChild(
        e("div", "account-type", "Perfil local de este televisor")
      ));
    var i = e("div", "account-card");
    (i.appendChild(e("div", "account-card-title", "Tu cuenta está lista")),
      i.appendChild(
        e(
          "div",
          "account-card-text",
          "Las preferencias, el historial y el capítulo que estabas viendo se guardan automáticamente en este TV."
        )
      ),
      t.appendChild(i));
    var n = e("div", "account-actions-row"),
      r = e("div", "account-action-btn focusable", "📋 Ver mi lista");
    ((r._activate = function () {
      Ua("history", !0);
    }),
      (r._onMove = function (e) {
        return "left" === e ? (rt(je[0]), !0) : "right" === e && (rt(o), !0);
      }));
    var o = e("div", "account-action-btn focusable", "➕ Agregar Addons");
    ((o._activate = function () {
      sa();
    }),
      (o._onMove = function (e) {
        return "left" === e ? (rt(r), !0) : "right" === e && (rt(s), !0);
      }));
    var s = e("div", "account-action-btn focusable", "📲 Compartir APP");
    ((s._activate = function () {
      Ua("share", !0);
    }),
      (s._onMove = function (e) {
        return "left" === e && (rt(o), !0);
      }),
      n.appendChild(r),
      n.appendChild(o),
      n.appendChild(s),
      t.appendChild(n));
    var l = e("div", "account-card account-card-small");
    return (
      l.appendChild(
        e("div", "account-card-title", "Sin registro ni contraseña")
      ),
      l.appendChild(
        e(
          "div",
          "account-card-text",
          "Este perfil no envía tus datos a ningún servidor externo. El historial, tus favoritos y los addons instalados se guardan de forma segura en la memoria de este TV."
        )
      ),
      t.appendChild(l),
      t
    );
  }
  function ja() {
    for (
      var t = e("div", "settings-panel history-panel"),
        a = e("div", "history-tabs"),
        i = [
          { id: "history", label: "Historia" },
          { id: "favs", label: "Mi favoritos" },
        ],
        n = 0;
      n < i.length;
      n++
    )
      (function (t) {
        var i = e(
          "div",
          "history-tab focusable" + (We === t.id ? " is-selected" : ""),
          t.label
        );
        ((i._activate = function () {
          ((We = t.id), Ua("history", !0));
        }),
          a.appendChild(i));
      })(i[n]);
    (t.appendChild(a), t.appendChild(e("div", "history-rule")));
    var r = [];
    if ("history" === We) r = Q.history || [];
    else if ("favs" === We)
      for (var o = 0; o < l.length; o++)
        X.favs &&
          X.favs[l[o].id] &&
          r.push({
            id: l[o].id,
            title: l[o].title,
            poster: l[o].poster || l[o].cover,
            series: x(l[o]),
            position: 0,
          });
    var s = e("div", "history-total", "Total ");
    (s.appendChild(e("span", null, String(r.length))), t.appendChild(s));
    var d = e("div", "history-grid");
    if (r.length)
      for (var c = 0; c < r.length && c < 30; c++)
        (function (t) {
          var a = e("div", "history-card focusable"),
            i = document.createElement("img");
          ((i.className = "history-poster"),
            (i.alt = ""),
            (i.src =
              t.poster || "assets/original/common/bg_placehoder_vertical.png"),
            a.appendChild(i));
          var n = t.series
            ? "Ya miró hasta " +
              (t.episodeNumber ? "epis. " + t.episodeNumber : "un episodio") +
              (t.position ? " · " + ai(t.position) : "")
            : "Ya miró hasta " + ai(t.position || 0);
          (a.appendChild(e("div", "history-progress", n)),
            a.appendChild(
              e("div", "history-card-title", t.title || "Contenido")
            ),
            (a._activate = function () {
              cn(t);
            }),
            d.appendChild(a));
        })(r[c]);
    else
      d.appendChild(
        e("div", "history-grid-empty", "No hay títulos para mostrar todavía.")
      );
    return (t.appendChild(d), t);
  }
  function Wa() {
    var t = e("div", "settings-panel");
    (t.appendChild(e("div", "sp-title", "Addons y Listas M3U")),
      t.appendChild(i(e("div", "sp-hr soft"), 0, 165, 1498, 1)),
      t.appendChild(
        e(
          "div",
          "sp-global-note",
          "Extiende tu catálogo con miles de canales en vivo: Anime 24/7, Telenovelas, Cine continuo, Pluto TV y señales de TV abierta de Latinoamérica y España."
        )
      ));
    var a = e("div", "account-card");
    ((a.style.top = "245px"),
      (a.style.height = "160px"),
      a.appendChild(
        e("div", "account-card-title", "Canales en Vivo e IPTV Personalizado")
      ),
      a.appendChild(
        e(
          "div",
          "account-card-text",
          "Instala listas temáticas con un solo clic o añade tus propios enlaces M3U / M3U8 para disfrutar de televisión en vivo sin límites."
        )
      ),
      t.appendChild(a));
    var n = e(
      "button",
      "account-action-btn focusable",
      "➕ Abrir Administrador de Addons"
    );
    ((n.style.position = "absolute"),
      (n.style.left = "0"),
      (n.style.top = "435px"),
      (n.style.height = "68px"),
      (n.style.lineHeight = "68px"),
      (n.style.padding = "0 36px"),
      (n.style.fontSize = "25px"),
      (n._activate = function () {
        sa();
      }),
      (n._onMove = function (e) {
        if ("left" === e) {
          for (var t = 2, a = 0; a < j.length; a++)
            if ("addons" === j[a].id) {
              t = a;
              break;
            }
          if (je[t]) return (rt(je[t]), !0);
        }
        return !1;
      }),
      t.appendChild(n));
    var r = e(
      "div",
      "sp-global-note",
      '💡 Consejo: También puedes administrar tus listas directamente desde la sección En Vivo pulsando en la categoría "➕ Addons M3U".'
    );
    return ((r.style.top = "535px"), t.appendChild(r), t);
  }
  var Xa = { running: !1, report: null, error: null, runId: 0 },
    $a = null;
  function Ga(e) {
    if (!e) return "Sin datos";
    switch (e.verdict) {
      case "ok":
        return "Correcto";
      case "dns-distinto":
        return "DNS alterado";
      case "dns-local-falla":
        return "Bloqueado";
      case "sin-tcp":
        return "Sin conexión";
      case "tls-falla":
        return "HTTPS falla";
      case "sin-tiempo":
        return "Sin respuesta";
      default:
        return "Sin datos";
    }
  }
  function Qa(e) {
    return e
      ? "ok" === e.verdict
        ? "ok"
        : "dns-distinto" === e.verdict ||
            "dns-local-falla" === e.verdict ||
            "sin-tiempo" === e.verdict ||
            e.timeout
          ? "warn"
          : "bad"
      : "";
  }
  function Ja(t, i, n) {
    a(i);
    var r = (function (e) {
      switch (e) {
        case "ok":
          return {
            cls: "ok",
            text: "La conexión está bien: el catálogo y los servidores de vídeo responden.",
          };
        case "dns-distinto":
          return {
            cls: "warn",
            text: "Tu operador devuelve direcciones distintas a las reales (bloqueo por DNS). La app ya las esquiva sola.",
          };
        case "dns-local-falla":
          return {
            cls: "warn",
            text: "Tu operador bloquea el DNS del televisor (no devuelve estos dominios). La app ya lo esquiva con su DNS seguro.",
          };
        case "doh-sin-respuesta":
          return {
            cls: "bad",
            text: "El DNS seguro no devolvió respuesta. Revisa la conexión del televisor.",
          };
        case "doh-bloqueado":
          return {
            cls: "bad",
            text: "La red bloquea el DNS seguro (Cloudflare y Google por HTTPS).",
          };
        case "sin-salida":
          return {
            cls: "bad",
            text: "Los servidores no aceptan la conexión desde esta red.",
          };
        case "algun-servidor":
          return {
            cls: "warn",
            text: "Un servidor de vídeo no respondió (suele rotar). El resto del catálogo sí responde: vuelve a analizar.",
          };
        case "incompleto":
          return {
            cls: "warn",
            text: "La prueba no terminó: la TV no recibió respuesta de ningún servidor a tiempo. Vuelve a analizar; si se repite, apaga y enciende la TV.",
          };
        case "servicio-sin-respuesta":
          return {
            cls: "bad",
            text: "El servicio de fondo no respondió. El reporte indica si fue el servicio completo o solo el diagnóstico.",
          };
        default:
          return { cls: "", text: "Sin resultado todavía." };
      }
    })(n.verdict);
    ((t.textContent = r.text),
      (t.className = "dg-summary" + (r.cls ? " " + r.cls : "")));
    for (var o = n.hosts || [], s = 0; s < o.length; s++) {
      var l = o[s],
        d = e("div", "dg-row " + Qa(l)),
        c =
          l.doh && l.doh.ok && l.doh.ips.length
            ? l.doh.ips
            : l.system.ips || [],
        p = l.system && l.system.ok ? l.system.ips.join(", ") : "sin respuesta";
      (d.appendChild(e("span", "dg-host", l.host)),
        d.appendChild(e("span", "dg-local", p)),
        d.appendChild(e("span", "dg-state", Ga(l))),
        d.appendChild(e("span", "dg-ip", c.join(", "))),
        i.appendChild(d));
    }
    for (var u = n.providers || [], v = [], f = [], h = 0; h < u.length; h++)
      u[h].reachable ? v.push(u[h].ip) : f.push(u[h].ip);
    var m = u.length > 0,
      g = e("div", "dg-row dns");
    (g.appendChild(e("span", "dg-host", "DNS seguro (DoH)")),
      g.appendChild(
        e(
          "span",
          "dg-local",
          m ? v.length + "/" + u.length + " disponibles" : "sin datos"
        )
      ),
      g.appendChild(
        e(
          "span",
          "dg-state",
          m ? (v.length ? "Correcto" : "Bloqueado") : "No evaluado"
        )
      ),
      g.appendChild(e("span", "dg-ip", v.join(", "))),
      m
        ? v.length
          ? (g.className = "dg-row dns ok")
          : (g.className = "dg-row dns bad")
        : (g.className = "dg-row dns warn"),
      i.appendChild(g));
    var y = n.codec || {},
      b = !!(y.h264 || y.hevc || y.hls),
      C = e("div", "dg-row" + (b ? " ok" : " warn")),
      w = [
        "H.264: " + (y.h264 || "no informado"),
        "HEVC: " + (y.hevc || "no informado"),
        "HLS: " + (y.hls || "no informado"),
      ].join("  ");
    (C.appendChild(e("span", "dg-host", "Códec")),
      C.appendChild(e("span", "dg-local", "")),
      C.appendChild(e("span", "dg-state", b ? "Informado" : "No confirmado")),
      C.appendChild(e("span", "dg-ip", w)),
      i.appendChild(C));
    for (
      var S = n.layers || {},
        x = [
          { key: "portal", label: "Portal" },
          { key: "session", label: "Sesión" },
          { key: "live", label: "Live CDN" },
          { key: "vod", label: "VOD CDN" },
        ],
        T = !1,
        _ = !1,
        k = 0;
      k < x.length;
      k++
    ) {
      var L = x[k],
        M = S[L.key];
      if (M) {
        ("live" !== L.key || M.ok || M.timeout || (T = !0),
          "vod" !== L.key || M.ok || M.timeout || (_ = !0));
        var I = e(
            "div",
            "dg-row " + (M.ok ? "ok" : M.timeout ? "warn" : "bad")
          ),
          E =
            M.error || (M.status ? "HTTP " + M.status : M.ok ? "OK" : "Error");
        "session" === L.key &&
          (E = "userId " + (M.userId || "?") + "  token " + (M.token || "?"));
        var A = M.ms ? " " + M.ms + " ms" : "";
        (I.appendChild(e("span", "dg-host", L.label)),
          I.appendChild(e("span", "dg-local", "")),
          I.appendChild(
            e(
              "span",
              "dg-state",
              M.ok ? "OK" : M.timeout ? "Sin respuesta" : "Error"
            )
          ),
          I.appendChild(e("span", "dg-ip", E + A)),
          i.appendChild(I));
      }
    }
    "ok" === r.cls &&
      (T || _) &&
      ((r = {
        cls: "bad",
        text:
          "El DNS responde bien, pero " +
          (T && _
            ? "los canales en vivo y las películas"
            : T
              ? "los canales en vivo"
              : "las películas") +
          " no se pueden abrir: tu operador bloquea las direcciones de vídeo (bloqueo por IP/SNI). Ese bloqueo no se arregla desde la app; hace falta una VPN en el router.",
      }),
      (t.textContent = r.text),
      (t.className = "dg-summary " + r.cls));
    if (
      (n.partial &&
        "bad" !== r.cls &&
        (t.textContent +=
          " (La prueba no terminó a tiempo: vuelve a analizar.)"),
      $a)
    ) {
      var D = n.screen || {},
        P = [];
      (D.w && D.h && P.push("Pantalla " + D.w + "×" + D.h),
        D.panelW && D.panelH && P.push("panel " + D.panelW + "×" + D.panelH),
        D.scale && P.push("escala " + Math.round(100 * D.scale) / 100),
        n.version && P.push("versión " + n.version));
      var O = document.querySelector(".welcome-version"),
        q = O ? String(O.textContent || "").replace(/[^\d.]/g, "") : "";
      (n.version &&
        q &&
        n.version !== q &&
        P.push(
          "SERVICIO DESACTUALIZADO (app " + q + "): desenchufa la TV 30 s"
        ),
        ($a.textContent = P.join(" · ")));
    }
  }
  function Ka(e) {
    var t = String(null == e ? "" : e);
    return (t = (t = (t = t.replace(
      /https?:\/\/[^\s"']+/gi,
      "[URL OCULTA]"
    )).replace(
      /(token|signature|authorization|cookie|key)=?[^\s,&]*/gi,
      "$1=[OCULTO]"
    ))
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")).slice(0, 150);
  }
  function Ya(e) {
    return e
      ? e.ok
        ? e.status
          ? "OK (HTTP " + e.status + ")"
          : "OK"
        : e.timeout
          ? "sin respuesta"
          : "error" + (e.error ? ": " + Ka(e.error) : "")
      : "sin datos";
  }
  function Za(t, i, n) {
    var r = Xa.runId + 1;
    function o(e) {
      var a;
      Xa.runId === r &&
        Xa.running &&
        ((Xa.running = !1),
        Xa.runId++,
        (Xa.report = {
          version:
            (document.querySelector(".welcome-version") || {}).textContent ||
            "desconocida",
          verdict: "servicio-sin-respuesta",
          partial: !0,
          serviceError: e,
          screen:
            ((a = window.__xuperViewport || {}),
            {
              w: a.w || 0,
              h: a.h || 0,
              scale: a.scale || 0,
              panelW: a.panelW || 0,
              panelH: a.panelH || 0,
            }),
          layers: {},
          hosts: [],
          providers: [],
        }),
        (t.textContent = "Analizar de nuevo"),
        Ja(i, n, Xa.report));
    }
    ((Xa.runId = r),
      (Xa.running = !0),
      (Xa.error = null),
      (t.textContent = "Analizando…"),
      (i.className = "dg-summary"),
      (i.textContent =
        "Consultando el DNS del televisor, el DNS seguro y los servidores…"),
      a(n),
      n.appendChild(e("div", "dg-row", "Analizando…")));
    var s = !1,
      l = setTimeout(function () {
        s ||
          ((s = !0),
          o("ping no respondió en 25 segundos (el servicio no arrancó)"));
      }, 25e3);
    P(
      "ping",
      {},
      function (e, t) {
        s ||
          ((s = !0),
          clearTimeout(l),
          (!e && t) || o("ping falló: " + Ka(e || "sin respuesta")));
      },
      24e3
    );
    var d = setTimeout(function () {
        Xa.running &&
          Xa.runId === r &&
          (i.textContent =
            "Analizando… tu red está respondiendo lento, espera un momento.");
      }, 9e3),
      c = setTimeout(function () {
        Xa.running &&
          Xa.runId === r &&
          o(
            "ping respondió, pero netdiag no devolvió resultado en 45 segundos"
          );
      }, 45e3);
    P(
      "netdiag",
      (function () {
        var e = window.__xuperViewport || {},
          t = xe || document.querySelector("video");
        function a(e) {
          return (t && t.canPlayType(e)) || "";
        }
        return {
          screenW: e.w || 0,
          screenH: e.h || 0,
          screenScale: e.scale || 0,
          panelW: e.panelW || 0,
          panelH: e.panelH || 0,
          codecH264: a('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
          codecHEVC: a('video/mp4; codecs="hvc1.1.6.L93.B0"'),
          codecHLS: a("application/x-mpegURL"),
          liveUrl: (A.live && A.live.url) || "",
          liveHeaders: (A.live && A.live.headers) || {},
          vodUrl: (A.vod && A.vod.url) || "",
          vodHeaders: (A.vod && A.vod.headers) || {},
        };
      })(),
      function (e, a) {
        if (Xa.runId === r)
          if (
            (clearTimeout(d),
            clearTimeout(c),
            (Xa.running = !1),
            (t.textContent = "Analizar de nuevo"),
            t.parentNode &&
              -1 !== t.parentNode.className.indexOf("is-active") &&
              rt(t),
            !e && a)
          )
            ((Xa.report = a), Ja(i, n, a));
          else {
            ((Xa.error = e || "sin respuesta"),
              (i.className = "dg-summary bad"));
            var o = String(e || "");
            /denied|permission|not permitted|bloqueado el servicio/i.test(o)
              ? (i.textContent = E)
              : /exist|not found|no disponible/i.test(o)
                ? (i.textContent =
                    "El servicio de fondo no está instalado en la TV. Reinstala la app usando el instalador .bat")
                : /timeout|tiempo|espera/i.test(o)
                  ? (i.textContent =
                      "Tiempo de espera agotado. La conexión es muy lenta o el DNS de tu operador no responde.")
                  : (i.textContent =
                      "No se pudo ejecutar la prueba (" +
                      (o || "el servicio no respondió") +
                      ").");
          }
      },
      45e3
    );
  }
  var ei = 5e3,
    ti = null;
  function ai(e) {
    e = Math.max(0, Math.floor(e || 0));
    var t = Math.floor(e / 3600),
      a = Math.floor((e % 3600) / 60),
      i = e % 60;
    return r(t) + ":" + r(a) + ":" + r(i);
  }
  function ii(e) {
    if ("number" == typeof e && isFinite(e) && e > 0) return e;
    if ("string" != typeof e) return 0;
    var t = e.trim();
    if (!t || "—" === t || "-" === t) return 0;
    var a = t.match(/(\d+)\s*h(?:our|ora|s)?/i),
      i = t.match(/(\d+)\s*m(?:in|uto|s)?/i),
      n = t.match(/(\d+)\s*s(?:ec|eg)?/i);
    if (a || i || n)
      return (
        3600 * (a ? parseInt(a[1], 10) : 0) +
        60 * (i ? parseInt(i[1], 10) : 0) +
        (n ? parseInt(n[1], 10) : 0)
      );
    if (-1 !== t.indexOf(":")) {
      var r = t.split(":");
      if (2 === r.length) {
        var o = Number(r[0]),
          s = Number(r[1]);
        if (isFinite(o) && isFinite(s) && o >= 0 && s >= 0) return 60 * o + s;
      } else if (3 === r.length) {
        ((o = Number(r[0])), (s = Number(r[1])));
        var l = Number(r[2]);
        if (
          isFinite(o) &&
          isFinite(s) &&
          isFinite(l) &&
          o >= 0 &&
          s >= 0 &&
          l >= 0
        )
          return 3600 * o + 60 * s + l;
      }
    }
    var d = Number(t);
    return isFinite(d) && d > 0 ? d : 0;
  }
  var ni = null;
  function ri() {
    ni && (clearInterval(ni), (ni = null));
  }
  function oi(e, t) {
    if (Ae && De && Oe) {
      Ye && (e = Ze);
      var a = ii(t);
      if (
        (!a &&
          X.playerEpisode &&
          X.playerEpisode.duration &&
          (a = ii(X.playerEpisode.duration)),
        !a &&
          X.playerItem &&
          X.playerItem.duration &&
          (a = ii(X.playerItem.duration)),
        !a &&
          xe &&
          isFinite(xe.duration) &&
          xe.duration > 0 &&
          (a = xe.duration),
        !a && pn && pn.length)
      ) {
        var i = pn[pn.length - 1];
        i && i.end > 0 && (a = Math.round(i.end + 60));
      }
      if (((e = Number(e) || 0), (Ae.textContent = ai(e)), !a || a <= 0))
        e > (a = x(X.playerItem) ? 2700 : 6300) && (a = Math.round(1.15 * e));
      De.textContent = ai(a);
      var n = Math.min(100, Math.max(0, (e / a) * 100));
      if (
        ((Oe.style.width = n.toFixed(2) + "%"),
        Ne && (Ne.style.left = n.toFixed(2) + "%"),
        xe && xe.buffered && xe.buffered.length > 0)
      )
        try {
          var r = xe.buffered.end(xe.buffered.length - 1);
          br && (r += Cr);
          var o = Math.min(100, Math.max(0, (r / a) * 100));
          qe && (qe.style.width = o.toFixed(2) + "%");
        } catch (e) {}
    }
  }
  function si(e) {
    (Re || (Re = t("player-osd-icon")),
      Re &&
        (ti && (clearTimeout(ti), (ti = null)),
        "pause" === e
          ? ((Re.style.backgroundImage =
              "url(assets/original/common/icon_status_pause.png)"),
            Re.classList.add("is-active"))
          : "forward" === e
            ? ((Re.style.backgroundImage =
                "url(assets/original/common/icon_status_forward.png)"),
              Re.classList.add("is-active"),
              (ti = setTimeout(function () {
                Re.classList.remove("is-active");
              }, 900)))
            : "backward" === e
              ? ((Re.style.backgroundImage =
                  "url(assets/original/common/icon_status_backward.png)"),
                Re.classList.add("is-active"),
                (ti = setTimeout(function () {
                  Re.classList.remove("is-active");
                }, 900)))
              : Re.classList.remove("is-active")));
  }
  function li(e) {
    if (xe) {
      var t = xe.duration;
      (isNaN(t) || t <= 0) && (t = 86400);
      var a = xe.currentTime || 0,
        i = Math.max(0, Math.min(t, a + e));
      try {
        xe.currentTime = i;
      } catch (e) {}
      (oi(i, xe.duration), pi(), si(e > 0 ? "forward" : "backward"));
    }
  }
  function di() {
    if (xe)
      if (xe.paused) (Mr(), si("none"), pi());
      else {
        try {
          xe.pause();
        } catch (e) {}
        (si("pause"), pi());
      }
  }
  function ci() {
    (X.infoTimer && clearTimeout(X.infoTimer),
      (X.infoTimer = setTimeout(function () {
        ((X.infoTimer = null), "player" !== X.screen || X.channelsOpen || ui());
      }, ei)));
  }
  function pi() {
    ((X.infobar = !0),
      "vod" === X.playerMode
        ? (Me && Me.classList.add("is-active"),
          we && we.classList.remove("is-active"))
        : (we && we.classList.add("is-active"),
          Me && Me.classList.remove("is-active")),
      ci());
  }
  function ui() {
    (X.infoTimer && (clearTimeout(X.infoTimer), (X.infoTimer = null)),
      (X.infobar = !1),
      we && we.classList.remove("is-active"),
      Me && Me.classList.remove("is-active"));
  }
  function vi() {
    pi();
  }
  function fi() {
    ui();
  }
  var hi = null,
    mi = null,
    gi = null,
    yi = null,
    bi = null,
    Ci = null,
    wi = null,
    Si = null,
    xi = null,
    Ti = null,
    _i = null,
    ki = null,
    Li = null,
    Mi = null,
    Ii = null,
    Ei = null,
    Ai = null,
    Di = null,
    Pi = null,
    Oi = null,
    qi = null,
    Ni = null,
    Ri = null,
    Vi = null,
    Hi = null,
    Ui = null,
    Fi = null,
    Bi = null,
    zi = !1,
    ji = !1,
    Wi = null,
    Xi = 0,
    $i = !1,
    Gi = 0,
    Qi = null,
    Ji = !1,
    Ki = !1,
    Yi = 0,
    Zi = "normal",
    en = "white",
    tn = "contain",
    an = 0;
  function nn() {
    ((Zi =
      ["normal", "big", "small"][Number(X.playback.size) || 0] || "normal"),
      (en =
        ["white", "yellow", "black"][Number(X.playback.style) || 0] || "white"),
      Ki || (Ji = !!X.playback.subtitle),
      Zn(
        ["cover", "contain", "16-9", "4-3"][Number(X.playback.screen) || 0] ||
          "contain"
      ),
      gn());
  }
  function rn() {
    return ["es", "pt", "en"][Number(X.playback.subLang) || 0] || "es";
  }
  function on(e, t) {
    var a = String(e || t || "").toLowerCase(),
      i = t || "es";
    return "es" === i
      ? /^(es|spa|esp|lat|cast)|espa|latino|latin|castell/i.test(a)
      : "pt" === i
        ? /^(pt|por)|portu/.test(a)
        : "en" === i && /^(en|eng|ing)|ingl/.test(a);
  }
  function sn(e, t, a) {
    var i = X.playerItem;
    if (i && i.id && !(e < 3)) {
      var n = Date.now();
      if (a || !(n - an < 15e3)) {
        an = n;
        for (
          var r = X.playerEpisode,
            o = String(i.id),
            s = [
              {
                id: o,
                title: i.title || i.name || "Contenido",
                poster: i.poster || i.cover || "",
                series: !!x(i),
                episodeId: r && r.id ? String(r.id) : "",
                episodeNumber: (r && (r.number || r.seriesNumber)) || "",
                position: Math.floor(e),
                duration: Math.floor(t || i.duration || 0),
                updatedAt: n,
              },
            ],
            l = Q.history || [],
            d = 0;
          d < l.length && s.length < 30;
          d++
        )
          String(l[d].id) !== o && s.push(l[d]);
        ((Q.history = s), K($, Q));
      }
    }
  }
  var ln = null;
  function dn(e) {
    var t = ln;
    if (t && e && String(t.id) === String(e.id)) {
      X.resumePosition = Math.max(0, Number(t.position) || 0);
      if (!(t.episodeId && e.episodes)) return;
      for (var a = 0; a < e.episodes.length; a++)
        if (String(e.episodes[a].id) === t.episodeId)
          return (
            (X.detailEpisode = e.episodes[a]),
            void (X.playerEpisode = e.episodes[a])
          );
    }
  }
  function cn(e) {
    if (e) {
      for (var t = 0; t < l.length; t++)
        if (String(l[t].id) === String(e.id)) return ((ln = e), void ba(l[t]));
      for (var a = o(e.title || ""), i = 0; i < l.length; i++) {
        for (
          var n = l[i], r = n._catalogSeasons || [], s = !1, d = 0;
          d < r.length;
          d++
        )
          if (String(r[d].id) === String(e.id)) {
            s = !0;
            break;
          }
        if (s || (a && o(n.title || "") === a)) return ((ln = e), void ba(n));
      }
      var c = T(
        {
          id: e.id,
          title: e.title,
          poster: e.poster,
          type: e.series ? "teleplay" : "movie",
          portal: !0,
        },
        0
      );
      ((c._portal = !0), (ln = e), ba(c));
    }
  }
  var pn = [],
    un = {},
    vn = {},
    fn = null;
  function hn(e) {
    if (!e) return 0;
    var t = e.replace(",", ".").split(":");
    return 3 === t.length
      ? 3600 * parseFloat(t[0]) + 60 * parseFloat(t[1]) + parseFloat(t[2])
      : 0;
  }
  function mn(e) {
    var t = ++Yi;
    if (!e || !e.url) return ((pn = []), void (Bi && (Bi.innerHTML = "")));
    try {
      var a = new XMLHttpRequest();
      (a.open("GET", e.url, !0),
        (a.onload = function () {
          t === Yi &&
            a.status >= 200 &&
            a.status < 300 &&
            (pn = (function (e) {
              var t = [];
              if (!e) return t;
              for (
                var a = e
                    .replace(/\r\n/g, "\n")
                    .replace(/\r/g, "\n")
                    .split("\n\n"),
                  i = 0;
                i < a.length;
                i++
              ) {
                var n = a[i].trim().split("\n");
                if (n.length >= 2) {
                  var r = -1 !== n[0].indexOf("--\x3e") ? n[0] : n[1],
                    o = -1 !== n[0].indexOf("--\x3e") ? n.slice(1) : n.slice(2);
                  if (r && -1 !== r.indexOf("--\x3e")) {
                    var s = r.split("--\x3e"),
                      l = hn(s[0].trim()),
                      d = hn(s[1].trim()),
                      c = o
                        .join("<br>")
                        .replace(/<font[^>]*>/gi, "")
                        .replace(/<\/font>/gi, "")
                        .trim();
                    c && t.push({ start: l, end: d, text: c });
                  }
                }
              }
              return t;
            })(a.responseText));
        }),
        a.send());
    } catch (e) {}
  }
  function gn() {
    Bi &&
      (Bi.classList.remove("size-small", "size-normal", "size-big"),
      Bi.classList.add("size-" + Zi),
      Bi.classList.remove("color-white", "color-yellow", "color-black"),
      Bi.classList.add("color-" + en));
  }
  function yn(e) {
    if (Bi)
      if (Ji && pn && pn.length) {
        for (var t = null, a = 0; a < pn.length; a++)
          if (e >= pn[a].start && e <= pn[a].end) {
            t = pn[a];
            break;
          }
        if (t) {
          var i = '<span class="player-subtitles-text">' + t.text + "</span>";
          Bi.innerHTML !== i && (Bi.innerHTML = i);
        } else "" !== Bi.innerHTML && (Bi.innerHTML = "");
      } else "" !== Bi.innerHTML && (Bi.innerHTML = "");
  }
  function bn() {
    return "detail" === X.screen
      ? X.detail || null
      : X.playerItem || X.detail || null;
  }
  var Cn = {},
    wn = "";
  function Sn(e) {
    if (!e) return "";
    if (x(e))
      return (
        "series:" +
        (e.seriesContentId || e.seriesId || e.seasonId || e.id || "")
      );
    var t = kn(e);
    return t && t.id ? t.id : e.id || "";
  }
  function xn(e) {
    var t = Sn(e);
    t && Cn.hasOwnProperty(t)
      ? (X.streamMode = Cn[t] ? "smooth" : "normal")
      : (X.streamMode =
          "smooth" === X.playback.streamMode ? "smooth" : "normal");
  }
  function Tn(e, t) {
    var a = Sn(e);
    ((X.streamMode = t ? "smooth" : "normal"), a && (Cn[a] = !!t));
  }
  function _n() {
    ((wn = ""),
      (Xi = 0),
      ($i = !1),
      (X.audioPreferenceCode = ""),
      (X.episodeBrowserPage = 0),
      (Qi = null),
      (Ji = !1),
      (Ki = !1),
      Yi++,
      (X.trackIndex = 0),
      (pn = []),
      Bi && (Bi.innerHTML = ""));
  }
  function kn(e) {
    return e && x(e)
      ? "player" === X.screen && X.playerEpisode
        ? X.playerEpisode
        : X.detailEpisode
          ? X.detailEpisode
          : (e.episodes && e.episodes[0]) || null
      : null;
  }
  function Ln(e) {
    if (!e) return "";
    var t = kn(e);
    return t && t.id ? t.id : e.id || "";
  }
  function Mn(e, t) {
    if (((t = t || function () {}), !e)) return t(null);
    var a = Ln(e);
    if (!a) return t(null);
    if (un[a]) return (An(un[a]), t(un[a]));
    if (vn[a]) vn[a].push(t);
    else {
      vn[a] = [t];
      var i = kn(e),
        n = { contentId: a },
        r = e.seasonId || e.id;
      (i && i.id && r && i.id !== r && (n.seriesContentId = r),
        P("mediaInfo", n, function (e, t) {
          var i = vn[a] || [];
          delete vn[a];
          var n = !e && t && !1 !== t.returnValue ? t : null;
          n && ((un[a] = n), An(n));
          for (var r = 0; r < i.length; r++)
            try {
              i[r](n);
            } catch (e) {}
        }));
    }
  }
  function audioTracks(e) {
    var t = String(e || "").split(/[,\/]/),
      a = [],
      i = 0;
    for (i = 0; i < t.length; i++) t[i].trim() && a.push(t[i].trim());
    return a;
  }
  function audioCode(e) {
    var t = String(e || "").toLowerCase().replace(/^\s+|\s+$/g, "");
    return /^(?:es|spa|esp)(?:[-_ ]?(?:419|lat|latam|la|mx|us|co|ar|cl|pe|ve|ec|uy|py|bo|do|pr))\b/.test(t) ||
      /(?:latino|latam|américa latina|america latina)/.test(t)
      ? "es-lat"
      : /^(?:es|spa|esp)(?:[-_ ]?(?:es|españa|espana|castellano))\b/.test(t) ||
          /(?:españa|espana|castellano)/.test(t)
        ? "es-es"
        : /^(?:es|spa|esp)\b/.test(t)
          ? "es"
          : /^(?:pt|por)\b/.test(t)
            ? "pt"
            : /^(?:en|eng|ing)\b/.test(t)
              ? "en"
              : /^(?:ja|jpn|jap)\b/.test(t)
                ? "ja"
                : t;
  }
  function preferredAudioIndex(e) {
    var t = audioTracks(e),
      a = ["es", "pt", "en"][Number(X.playback.audio) || 0] || "es",
      i = 0,
      n = -1;
    if (!t.length) return 0;
    if ($i && X.audioPreferenceCode)
      for (i = 0; i < t.length; i++)
        if (audioCode(t[i]) === X.audioPreferenceCode) return i;
    if ("es" === a) {
      for (i = 0; i < t.length; i++)
        if ("es-lat" === audioCode(t[i])) return i;
      for (i = 0; i < t.length; i++)
        if ("es" === audioCode(t[i])) return i;
      for (i = 0; i < t.length; i++)
        if ("es-es" === audioCode(t[i])) return i;
    }
    for (i = 0; i < t.length; i++)
      if (on(t[i], a)) {
        n = i;
        break;
      }
    return n >= 0 ? n : 0;
  }
  function In(e) {
    return preferredAudioIndex(e);
  }
  function En(e) {
    for (var t = [], a = (e && e.subtitles) || [], i = 0; i < a.length; i++)
      t.push({ lang: a[i].lang, url: a[i].url, format: a[i].format });
    return (
      t.sort(function (e, t) {
        return (
          (/^(es|spa|esp)$/i.test(e.lang || "") ? 0 : 1) -
          (/^(es|spa|esp)$/i.test(t.lang || "") ? 0 : 1)
        );
      }),
      t
    );
  }
  function An(e) {
    var t = En(e);
    if (Ki) {
      if (Ji) {
        if (!t.length) return ((Ji = !1), (Qi = null), void mn(null));
        var a = !1;
        if (Qi)
          for (var i = 0; i < t.length; i++)
            if (t[i].url === Qi.url) {
              ((Qi = t[i]), (a = !0));
              break;
            }
        a || mn((Qi = t[0]));
      }
    } else {
      if (!X.playback.subtitle) return ((Ji = !1), (Qi = null), void mn(null));
      if (!t.length) return ((Ji = !1), (Qi = null), void mn(null));
      ((Ji = !0), (Qi = t[0]));
      for (var n = 0; n < t.length; n++)
        if (on(t[n].lang, rn())) {
          Qi = t[n];
          break;
        }
      mn(Qi);
    }
  }
  function Dn() {
    (Wi && clearTimeout(Wi),
      (Wi = setTimeout(function () {
        On();
      }, 8e3)));
  }
  function Pn() {
    if ((hi || lr(), hi)) {
      ((zi = !0),
        (ji = !1),
        ui(),
        qn(),
        hi.classList.add("is-active"),
        Bi && Bi.classList.add("shift-up"),
        Mn(X.playerItem, function () {
          zi && qn();
        }),
        Dn());
      var e = X.playerItem;
      if (x(e) && yi) {
        var t = yi.querySelector(".psv-ep-btn");
        if (t) return void rt(t);
      }
      x(e) && _i ? rt(_i) : bi && rt(bi);
    }
  }
  function On() {
    (Wi && (clearTimeout(Wi), (Wi = null)),
      (zi = !1),
      hi && hi.classList.remove("is-active"),
      Bi && Bi.classList.remove("shift-up"),
      "player" !== X.screen || ji || rt(Ce));
  }
  function qn() {
    var e = X.focus ? n(X.focus, ".psv-row") : null,
      t = e ? e.id : "",
      a = e && X.focus ? X.focus.textContent : "";
    if (
      (Rn(),
      (function () {
        if (!Si) return;
        Si.classList.remove("is-hidden");
      })(),
      Kn(),
      Yn(),
      Nn(),
      zi && t && hi)
    )
      for (var i = hi.querySelectorAll(".psv-row"), r = 0; r < i.length; r++)
        if (i[r].id === t) {
          for (
            var o = i[r].querySelectorAll(".focusable"), s = null, l = 0;
            l < o.length;
            l++
          )
            if (o[l].textContent === a) {
              s = o[l];
              break;
            }
          var d = s || ot(i[r]);
          d && rt(d, !0);
          break;
        }
  }
  function Nn() {
    if (hi) {
      for (var e = hi.querySelectorAll(".psv-row"), t = 0; t < e.length; t++)
        e[t].classList.remove("is-row-focused");
      var a = X.focus ? n(X.focus, ".psv-row") : null;
      a && a.classList.add("is-row-focused");
    }
  }
  function Rn() {
    if (gi) {
      var t = X.playerItem;
      if (t && x(t)) {
        if (((gi.style.display = "block"), yi)) {
          a(yi);
          var i = Vn(t),
            n = i[X.playerSeasonIndex] || i[0],
            r =
              n &&
              n.id === (t.seasonId || t.id) &&
              t.episodes &&
              t.episodes.length
                ? t.episodes
                : (n && n._episodes) || t.episodes || [];
          if (r.length) {
            for (var o = 0, s = 0; s < r.length; s++)
              if (
                X.playerEpisode &&
                (r[s].id === X.playerEpisode.id ||
                  r[s].number === X.playerEpisode.number)
              ) {
                o = s;
                break;
              }
            var l = wa(r.length);
            (void 0 === X.playerEpisodeRange ||
              X.playerEpisodeRange >= l.length) &&
              (X.playerEpisodeRange = Math.floor(o / 20));
            for (
              var d = l[X.playerEpisodeRange] || l[0],
                c = e("div", "psv-episode-numbers scrollable"),
                p = d.start;
              p < d.end;
              p++
            )
              (function (t, a) {
                var i =
                    a === o
                      ? "▶"
                      : String(
                          void 0 !== t.number && null !== t.number
                            ? t.number
                            : a + 1
                        ),
                  n = e(
                    "button",
                    "psv-ep-btn focusable" + (a === o ? " is-selected" : ""),
                    i
                  );
                ((n._activate = function () {
                  Xn(t);
                }),
                  c.appendChild(n));
              })(r[p], p);
            yi.appendChild(c);
            for (
              var u = e("div", "psv-episode-ranges scrollable"), v = 0;
              v < l.length;
              v++
            )
              (function (t, a) {
                var i = e(
                  "button",
                  "psv-range-btn focusable" +
                    (t === X.playerEpisodeRange ? " is-selected" : ""),
                  a.start + 1 + "-" + a.end
                );
                ((i._activate = function () {
                  ((X.playerEpisodeRange = t), Rn());
                  var e = yi.querySelector(".psv-ep-btn");
                  e && rt(e);
                }),
                  u.appendChild(i));
              })(v, l[v]);
            yi.appendChild(u);
          } else
            yi.appendChild(
              e("div", "psv-selection-empty", "Temporadas y episodios")
            );
        }
      } else gi.style.display = "none";
    }
  }
  function Vn(e) {
    return e && e.seasons && e.seasons.length
      ? e.seasons
      : [{ id: e ? e.id : "", number: 1 }];
  }
  function Hn(e, t, a) {
    return (
      (a = a || function () {}),
      e && t
        ? t.id === (e.seasonId || e.id) && e.episodes && e.episodes.length
          ? ((t._episodes = e.episodes), a(e.episodes))
          : t._episodes
            ? a(t._episodes)
            : t._loading
              ? ((t._wait = t._wait || []), void t._wait.push(a))
              : ((t._loading = !0),
                (t._wait = [a]),
                void P("detail", { contentId: t.id }, function (e, a) {
                  t._loading = !1;
                  var i =
                    !e && a && !1 !== a.returnValue && a.episodes
                      ? a.episodes
                      : [];
                  i.length && (t._episodes = i);
                  var n = t._wait || [];
                  t._wait = [];
                  for (var r = 0; r < n.length; r++)
                    try {
                      n[r](i);
                    } catch (e) {}
                }))
        : a([])
    );
  }
  function Un(e, t, a) {
    var i = t && void 0 !== t.number && null !== t.number ? t.number : a + 1,
      n = String((t && (t.title || t.name)) || "").trim(),
      r = String((e && e.title) || "")
        .trim()
        .replace(/[\s\-–_]*[TtSs]\d+$/, "");
    return (
      r && 0 === n.indexOf(r) && (n = n.substring(r.length)),
      ((n = n.replace(/^[\s\-–_:.]+/, "").trim()) &&
        !/^(?:[TtSs]?\d+[\s\-–_.:]*)+$/.test(n)) ||
        (n = "Episodio " + i),
      n
    );
  }
  function Fn(e) {
    var t = String((e && e.duration) || "").trim(),
      a = /^(\d+):(\d+)(?::(\d+))?$/.exec(t);
    return a
      ? a[3]
        ? (parseInt(a[1], 10) || 0) + " h " + (parseInt(a[2], 10) || 0) + " min"
        : (parseInt(a[1], 10) || 0) + " min"
      : t;
  }
  function Bn() {
    var t = X.playerItem;
    if (t && x(t) && (zi && On(), ki || lr(), ki)) {
      if (!((t.episodes && t.episodes.length) || t._detailsLoaded))
        return (
          jr("Cargando capítulos…"),
          void U(t, function () {
            "player" === X.screen &&
              (!X.playerEpisode &&
                t.episodes &&
                t.episodes.length &&
                ((X.playerEpisode = t.episodes[0]),
                (X.detailEpisode = t.episodes[0])),
              Bn());
          })
        );
      (!X.playerEpisode &&
        t.episodes &&
        t.episodes.length &&
        ((X.playerEpisode = t.episodes[0]),
        (X.detailEpisode = t.episodes[0]),
        (X.playerSeasonIndex = X.detailSeason || 0)),
        (X.episodeBrowserOpen = !0),
        (X.browserSeason = X.playerSeasonIndex || 0),
        ki.classList.add("is-active"),
        fi(),
        (function () {
          var t = X.playerItem;
          if (!t || !ki) return;
          var i = Vn(t);
          X.browserSeason >= i.length && (X.browserSeason = 0);
          X.browserSeason < 0 && (X.browserSeason = 0);
          var n = i[X.browserSeason],
            r = i[X.playerSeasonIndex] || i[0],
            o = X.playerEpisode;
          Li && (Li.textContent = t.title || "");
          if (Mi)
            if (o) {
              var s = [];
              (r && r.number && s.push("T" + r.number),
                o.number && s.push("E" + o.number),
                (Mi.textContent =
                  "Reproduciendo " + s.join(" ") + " · " + Un(t, o)));
            } else Mi.textContent = "Elige un episodio";
          Di &&
            (Di.textContent =
              "Episodios · Temporada " +
              ((n && n.number) || X.browserSeason + 1));
          ((function (t, i) {
            if (!Ii || !Ei) return;
            (a(Ii), (Ei.style.display = "flex"));
            for (var n = 0; n < i.length; n++)
              (function (t) {
                var a = e(
                  "div",
                  "pe-season focusable",
                  "Temporada " + (i[t].number || t + 1)
                );
                (t === X.browserSeason && a.classList.add("is-selected"),
                  (a._onFocus = function () {
                    X.browserSeason !== t && Wn(t, !1);
                  }),
                  (a._onMove = function (e) {
                    if ("right" === e) {
                      var t =
                        (Ai && Ai.querySelector(".pe-ep.is-current")) ||
                        (Ai && ot(Ai));
                      return t && rt(t), !0;
                    }
                    return !1;
                  }),
                  (a._activate = function () {
                    Wn(t, !0);
                  }),
                  Ii.appendChild(a));
              })(n);
          })(0, i),
            jn(t, n));
        })());
      var i =
        (Ai ? Ai.querySelector(".pe-ep.is-current") : null) ||
        (Ai ? ot(Ai) : null) ||
        (Ei && "none" !== Ei.style.display ? ot(Ii) : null);
      i && rt(i);
    }
  }
  function zn(e) {
    ki &&
      X.episodeBrowserOpen &&
      ((X.episodeBrowserOpen = !1),
      ki.classList.remove("is-active"),
      !e && "player" === X.screen && Ce && rt(Ce));
  }
  function changeEpisodePage(e, t) {
    var a = X.playerItem;
    if (!a) return !1;
    var i = Vn(a)[X.browserSeason],
      n = i && i._episodes ? i._episodes : [];
    if (!i || !n.length) return !1;
    var r = Math.ceil(n.length / 20),
      o = Math.max(0, Math.min(r - 1, (X.episodeBrowserPage || 0) + e));
    return o === X.episodeBrowserPage
      ? !1
      : ((X.episodeBrowserPage = o),
        jn(a, i),
        setTimeout(function () {
          var e = Ai && (Ai.querySelectorAll(".pe-ep")[t || 0] || ot(Ai));
          e && rt(e);
        }, 0),
        !0);
  }
  function jn(t, i) {
    if (Ai && i) {
      a(Ai);
      var r =
        i.id === (t.seasonId || t.id) && t.episodes && t.episodes.length
          ? t.episodes
          : i._episodes || [];
      if (!r.length)
        return (
          Ai.appendChild(e("div", "pe-loading", "Cargando episodios…")),
          void Hn(t, i, function (e) {
            if (
              X.episodeBrowserOpen &&
              Vn(t)[X.browserSeason] === i &&
              (jn(t, i), n(X.focus, "#pe-episodes"))
            ) {
              var a = Ai.querySelector(".pe-ep.is-current") || ot(Ai);
              a && rt(a);
            }
          })
        );
      var o = 20,
        s = Math.max(0, Math.min(Math.ceil(r.length / o) - 1, X.episodeBrowserPage || 0)),
        l = s * o,
        d = Math.min(r.length, l + o);
      X.episodeBrowserPage = s;
      for (var c = l; c < d; c++)
        (function (a, i) {
          var n = e("div", "pe-ep focusable"),
            r = void 0 !== a.number && null !== a.number ? a.number : i + 1;
          n.appendChild(e("div", "pe-num", String(r)));
          var o = e("div", "pe-thumb"),
            s = e("div", "pe-thumb-play", "▶");
          (o.appendChild(s), n.appendChild(o));
          var l = e("div", "pe-info");
          l.appendChild(e("div", "pe-name", Un(t, a, i)));
          var d = [],
            c = Fn(a);
          (c && d.push(c),
            a.quality && d.push(String(a.quality).split(",")[0].toUpperCase()),
            l.appendChild(e("div", "pe-meta", d.join("   ·   "))),
            a.description && l.appendChild(e("div", "pe-desc", a.description)),
            n.appendChild(l));
          var p =
            X.playerEpisode &&
            (X.playerEpisode.id === a.id ||
              (void 0 !== X.playerEpisode.number &&
                X.playerEpisode.number === a.number));
          (n.appendChild(e("div", "pe-badge", "▶ REPRODUCIENDO")),
            p && n.classList.add("is-current"),
            (n._onMove = function (e) {
              var t = Ai ? Ai.querySelectorAll(".pe-ep") : [],
                a = 0;
              for (a = 0; a < t.length; a++) if (t[a] === n) break;
              return "left" === e
                ? (Ii && rt(Ii.children[X.browserSeason] || ot(Ii)), !0)
                : ("right" === e || "down" === e) &&
                    a === t.length - 1 &&
                    s + 1 < Math.ceil(r.length / o)
                  ? changeEpisodePage(1, 0)
                  : ("left" === e || "right" === e ? !0 : !1);
            }),
            (n._activate = function () {
              Xn(a);
            }),
            Ai.appendChild(n));
        })(r[c], c);
      r.length > o &&
        Ai.appendChild(
          e(
            "div",
            "pe-loading",
            "Capítulos " + (l + 1) + "-" + d + " de " + r.length + " · usa → para ver más"
          )
        );
    }
  }
  function Wn(e, t) {
    var a = X.playerItem,
      i = Vn(a);
    if (
      i[e] &&
      ((X.browserSeason = e),
      (X.episodeBrowserPage = 0),
      (function () {
        if (Ii)
          for (var e = Ii.children, t = 0; t < e.length; t++)
            e[t].classList.toggle("is-selected", t === X.browserSeason);
      })(),
      Di &&
        (Di.textContent = "Episodios · Temporada " + (i[e].number || e + 1)),
      jn(a, i[e]),
      t)
    ) {
      var n = Ai ? Ai.querySelector(".pe-ep.is-current") || ot(Ai) : null;
      n && rt(n);
    }
  }
  function Xn(e) {
    var t = X.playerItem;
    if (t && e) {
      var a = Vn(t),
        i = a[X.playerSeasonIndex];
      i &&
        i.id === (t.seasonId || t.id) &&
        t.episodes &&
        t.episodes.length &&
        (i._episodes = t.episodes);
      var n =
          void 0 !== X.playerSeasonIndex && null !== X.playerSeasonIndex
            ? X.playerSeasonIndex
            : X.browserSeason || 0,
        r = a[n];
      (r &&
        (X.detailSeason !== n &&
          ((X.detailSeason = n), (X.detailNeedsRebuild = !0)),
        r.id && (t.seasonId = r.id),
        r._episodes && (t.episodes = r._episodes)),
        zn(),
        zi && On(),
        $n(t, e));
    }
  }
  function $n(e, t) {
    if (e && t) {
      ((X.playerItem = e),
        (X.playerEpisode = t),
        (X.detailEpisode = t),
        (X.playerSeasonIndex = X.detailSeason || 0),
        (autoNextKey = ""),
        Ce && we && ao(),
        Jn(e),
        X.episodeSwitchTimer && clearTimeout(X.episodeSwitchTimer),
        (X.episodeSwitchSeq = (X.episodeSwitchSeq || 0) + 1));
      var a = X.episodeSwitchSeq;
      (zr(),
        jr("Cambiando capítulo…"),
        (X.episodeSwitchTimer = setTimeout(function () {
          ((X.episodeSwitchTimer = null),
            a === X.episodeSwitchSeq && "player" === X.screen && Jr(e, t));
        }, 600)));
    }
  }
  function Gn() {
    (ke || (ke = t("next-episode-loading")),
      ke &&
        (ke.classList.remove("is-active"), (ke.style.backgroundImage = "")));
  }
  var autoNextKey = "";
  function Qn() {
    var e = X.playerItem;
    if (e && x(e) && "player" === X.screen) {
      var t =
        String(e.id || "") + "|" + String((X.playerEpisode && X.playerEpisode.id) || "");
      if (t && t === autoNextKey) return;
      autoNextKey = t;
      for (
        var a = (function (e) {
            var t = Vn(e),
              a = t[X.playerSeasonIndex] || t[0];
            return a
              ? a.id === (e.seasonId || e.id) && e.episodes && e.episodes.length
                ? e.episodes
                : a._episodes || []
              : [];
          })(e),
          i = X.playerEpisode,
          n = -1,
          r = 0;
        r < a.length;
        r++
      )
        if (i && (a[r].id === i.id || a[r].number === i.number)) {
          n = r;
          break;
        }
      if (!(n < 0))
        if (
          ((function (e) {
            if ((ke || (ke = t("next-episode-loading")), ke)) {
              var a = (e && (e.backdrop || e.landscape || e.poster)) || "";
              ((ke.style.backgroundImage = a
                ? 'url("' + String(a).replace(/"/g, "%22") + '")'
                : ""),
                ke.classList.add("is-active"));
            }
          })(e),
          n + 1 < a.length)
        )
          $n(e, a[n + 1]);
        else {
          var o = Vn(e),
            s = (X.playerSeasonIndex || 0) + 1,
            l = o[s];
          if (l) {
            var d = i;
            Hn(e, l, function (t) {
              X.playerItem === e &&
                X.playerEpisode === d &&
                "player" === X.screen &&
                (t && t.length
                  ? ((X.detailSeason = s),
                    (X.playerSeasonIndex = s),
                    (e.seasonId = l.id || e.seasonId),
                    (e.episodes = t),
                    (l._episodes = t),
                    $n(e, t[0]))
                  : Gn());
            });
          } else Gn();
        }
    }
  }
  function Jn(e) {
    if (de)
      for (
        var t = de.querySelectorAll(".detail-episode"), a = 0;
        a < t.length;
        a++
      ) {
        var i = !(
          !t[a]._ep ||
          !X.detailEpisode ||
          t[a]._ep.id !== X.detailEpisode.id
        );
        t[a].classList.toggle("is-playing", i);
      }
  }
  function Kn() {
    var e = "relay" === X.streamMode || "smooth" === X.streamMode;
    if (Ci) {
      Ci.classList.toggle("is-selected", e);
      var t = Ci.querySelector(".psv-check");
      t && (t.style.display = e ? "block" : "none");
    }
    if (wi) {
      wi.classList.toggle("is-selected", !e);
      var a = wi.querySelector(".psv-check");
      a && (a.style.display = e ? "none" : "block");
    }
  }
  function Yn() {
    if (Ti)
      for (var e = Ti.querySelectorAll(".psv-btn"), t = 0; t < e.length; t++) {
        var a = e[t].getAttribute("data-aspect") === tn;
        e[t].classList.toggle("is-selected", a);
        var i = e[t].querySelector(".psv-check");
        i && (i.style.display = a ? "block" : "none");
      }
  }
  function Zn(e) {
    ((tn = e || "contain"),
      xe &&
        (xe.classList.remove(
          "aspect-cover",
          "aspect-contain",
          "aspect-16-9",
          "aspect-4-3"
        ),
        xe.classList.add("aspect-" + tn)),
      Yn());
  }
  function er(e) {
    if ((mi || lr(), mi)) {
      (Wi && (clearTimeout(Wi), (Wi = null)), (ji = !0), (fn = X.focus));
      var t = e || bn();
      ("detail" === X.screen && (t = X.detail || t),
        ar(),
        ir(),
        gn(),
        mi.classList.add("is-active"),
        Mn(t, function () {
          ji && (ar(), ir());
        }));
      var a = (Pi && Pi.querySelector(".focusable")) || Oi || Fi;
      a && rt(a);
    }
  }
  function tr() {
    ((ji = !1),
      mi && mi.classList.remove("is-active"),
      zi
        ? (bi && rt(bi), Dn())
        : fn && at(fn)
          ? rt(fn)
          : "player" === X.screen && rt(Ce),
      (fn = null));
  }
  function ar() {
    if (Pi) {
      a(Pi);
      var t = un[Ln(bn())];
      t && !$i && (Xi = preferredAudioIndex(t.audio));
      var i = (function (e) {
        for (
          var t = [], a = audioTracks(e && e.audio), i = 0;
          i < a.length;
          i++
        ) {
          var n = a[i].trim();
          n && t.push({ index: i, code: n, label: nr(n) });
        }
        return t;
      })(t);
      i.length || (i = [{ index: Xi || 0, label: "Español" }]);
      for (var n = 0; n < i.length; n++)
        (function (t) {
          var a = e("button", "dps-btn focusable");
          ((a.textContent = t.label),
            Xi === t.index && a.classList.add("is-selected"),
            (a._activate = function () {
              (or(t.index), ar(), Dn());
            }),
            Pi.appendChild(a));
        })(i[n]);
    }
  }
  function ir() {
    var t = En(un[Ln(bn())]);
    if (Oi) {
      var i = Oi.parentNode;
      (i && i.classList.toggle("is-hidden", !t.length),
        Oi.classList.toggle("is-on", Ji));
      var n = Oi.querySelector(".dps-switch-text");
      n && (n.textContent = Ji ? "ON" : "OFF");
    }
    if (
      (qi && qi.classList.toggle("is-visible", Ji && t.length > 0),
      Ni && Ni.classList.toggle("is-visible", Ji && t.length > 0),
      Ri && Ri.classList.toggle("is-visible", Ji && t.length > 0),
      Ji)
    ) {
      if (Vi) {
        a(Vi);
        for (var r = 0; r < t.length; r++)
          (function (t) {
            var a = e("button", "dps-btn focusable");
            ((a.textContent = nr(t.lang || "Sub")),
              Qi && Qi.url === t.url && a.classList.add("is-selected"),
              (a._activate = function () {
                ((Qi = t), (Ji = !0), (Ki = !0), mn(t), ir(), Dn());
              }),
              Vi.appendChild(a));
          })(t[r]);
      }
      if (Hi)
        for (
          var o = Hi.querySelectorAll(".dps-btn"), s = 0;
          s < o.length;
          s++
        ) {
          var l = o[s].getAttribute("data-size");
          o[s].classList.toggle("is-selected", l === Zi);
        }
      if (Ui)
        for (
          var d = Ui.querySelectorAll(".dps-btn"), c = 0;
          c < d.length;
          c++
        ) {
          var p = d[c].getAttribute("data-style");
          d[c].classList.toggle("is-selected", p === en);
        }
    }
  }
  function nr(e) {
    var a = String(e || "").toLowerCase().replace(/^\s+|\s+$/g, ""),
      t = a.split(/[-_]/)[0],
      i = audioCode(a);
    return "es-lat" === i
      ? "Español latino"
      : "es-es" === i
        ? "Español España"
        : /^(spa|esp|es|castellano|latino|lat|latam)$/.test(t)
          ? "Español"
      : /^(eng|ing|en)$/.test(t)
        ? "Inglés"
        : /^(jpn|jap|ja)$/.test(t)
          ? "Japonés"
          : /^(kor|cor|ko)$/.test(t)
            ? "Coreano"
            : /^(por|pt)$/.test(t)
              ? "Portugués"
              : /^(fra|fre|fr|franc)$/.test(t)
                ? "Francés"
                : /^(ita|it)$/.test(t)
                  ? "Italiano"
                  : /^(deu|ger|de)$/.test(t)
                    ? "Alemán"
                    : /^(chi|zho|zh)$/.test(t)
                      ? "Chino"
                      : t
                        ? t.charAt(0).toUpperCase() + t.slice(1)
                        : "Pista";
  }
  function rr(e) {
    if (!xe) return !1;
    var t;
    try {
      t = xe.audioTracks;
    } catch (e) {
      return !1;
    }
    if (!t || !t.length || !(e >= 0 && e < t.length)) return !1;
    try {
      for (var a = 0; a < t.length; a++) t[a].enabled = a === e;
      return !0;
    } catch (e) {
      return !1;
    }
  }
  function or(e) {
    var a = un[Ln(bn())],
      i = audioTracks(a && a.audio),
      n = i[e] ? audioCode(i[e]) : "";
    ((X.audioPreferenceCode = n), (Xi = e), ($i = !0));
    if ("player" !== X.screen || !xe) return;
    if ("relay" === X.streamMode || "smooth" === X.streamMode)
      if (br) {
        var t = Cr + (xe.currentTime || 0);
        Gr(br + "?start=" + Math.floor(t) + "&a=" + e);
      } else sr();
    else
      rr(e)
        ? ((Gi = Date.now() + 5e3), jr("Idioma cambiado"))
        : jr(
            "Esta TV no permite cambiar audio en Normal. Usa Modo Fluido para esa pista."
          );
  }
  /* Compatibilidad de pista (port de XuperMH v2.31.1): informa al servicio si
     el panel decodifica HEVC y si es UHD, para que no entregue 4K/HEVC a un
     SoC que no puede, y permite probar otra copia cuando el primer intento
     falla con error de media. */
  var panelHevc = null,
    panelUhd = null,
    panelUhdAsked = !1,
    copyTryKey = "",
    copyTryCount = 0;
  function panelInfo() {
    try {
      return (
        JSON.parse((window.PalmSystem && window.PalmSystem.deviceInfo) || "{}") ||
        {}
      );
    } catch (e) {
      return {};
    }
  }
  function xHevcCapable() {
    if ("boolean" == typeof panelHevc) return panelHevc;
    var e = panelInfo(),
      t = Number(e.platformVersionMajor) || 0;
    panelHevc =
      !t ||
      t >= 4 ||
      /OLED|^\d{2}(UB|UF|UH|UJ|SJ|EG|EF|EC9)/i.test(String(e.modelName || ""));
    try {
      panelHevc ||
        !window.webOS ||
        !webOS.deviceInfo ||
        webOS.deviceInfo(function (e) {
          e && e.uhd && (panelHevc = !0);
        });
    } catch (e) {}
    return panelHevc;
  }
  function xUhdPanel() {
    if ("boolean" != typeof panelUhd) {
      var e = panelInfo();
      panelUhd =
        (Number(e.screenWidth) || 0) >= 3800 ||
        (Number(e.screenHeight) || 0) >= 2100;
    }
    if (!panelUhdAsked) {
      panelUhdAsked = !0;
      try {
        window.webOS &&
          webOS.deviceInfo &&
          webOS.deviceInfo(function (e) {
            e && "boolean" == typeof e.uhd && (panelUhd = e.uhd);
          });
      } catch (e) {}
    }
    return panelUhd;
  }
  try {
    /* Precalienta deviceInfo al arrancar para que el primer título ya use la
       capacidad real del panel (UHD / HEVC) y no el valor provisional. */
    xHevcCapable();
    xUhdPanel();
  } catch (e) {}
  function xNextCopy() {
    var e = X.playerItem;
    if (!e) return !1;
    var t = Ln(e) + "|" + ((X.playerEpisode && X.playerEpisode.id) || "");
    t !== copyTryKey && ((copyTryKey = t), (copyTryCount = 0));
    var a =
        (window.__xuperStreamInfo && window.__xuperStreamInfo.availableTracks) ||
        [],
      i = (X.trackIndex || 0) + 1;
    if (copyTryCount >= 2 || i >= a.length) return !1;
    copyTryCount++;
    X.trackIndex = i;
    var n = a[i] || {};
    return (
      jr(
        "Probando otra copia compatible" +
          (n.height ? " (" + n.height + "p " + (n.codec || "") + ")" : "") +
          "…"
      ),
      setTimeout(function () {
        "vod" === X.playerMode && X.playerItem === e && sr();
      }, 0),
      !0
    );
  }
  function sr() {
    if (xe) {
      var e = br ? Cr + (xe.currentTime || 0) : xe.currentTime || 0,
        t = X.playerItem;
      (zr(),
        jr("Cambiando reproductor…"),
        Qr(t, function (t) {
          if (t) {
            if (-1 !== t.indexOf(":8787/s/")) {
              var a = t + "?start=" + Math.floor(e);
              (Xi && (a += "&a=" + Xi), Gr(a));
            } else if ((Gr(t), e > 0))
              try {
                xe.currentTime = e;
              } catch (e) {}
          } else X.streamError || jr("Sin fuente de reproducción");
        }));
    }
  }
  function lr() {
    if (
      ((Ce = t("player-stage")),
      (we = t("player-infobar")),
      (Me = t("player-vod-infobar")),
      (Se = t("player-channels")),
      ($e = t("player-categories")),
      (Ge = t("pcat-grid")),
      (Qe = t("pcat-sub")),
      (xe = t("player-video")),
      (_e = t("player-status")),
      (ke = t("next-episode-loading")),
      (Le = t("player-mode-hint")),
      (Re = t("player-osd-icon")),
      (Te = Ce ? Ce.querySelector(".player-frame") : null),
      (Ie = t("vod-infobar-poster")),
      (Ee = t("vod-infobar-title")),
      (Ae = t("vod-time-current")),
      (De = t("vod-time-total")),
      (Pe = t("vod-seekbar")),
      (Oe = t("vod-seek-progress")),
      (qe = t("vod-seek-buffered")),
      (Ne = t("vod-seek-thumb")),
      Pe &&
        (Pe.classList.add("focusable"),
        (Pe._activate = function () {
          Ur(!0);
        }),
        (Pe._onMove = function (e) {
          return "left" === e
            ? (Br(-1), !0)
            : "right" === e
              ? (Br(1), !0)
              : ("down" === e || "up" === e) && (Ur(!1), !0);
        })),
      (hi = t("player-playsetting-view")),
      (gi = t("psv-sec-selection")),
      (yi = t("psv-episodes-row")),
      (_i = t("psv-btn-episodes")),
      (bi = t("psv-btn-config")),
      (Ci = t("psv-btn-p1")),
      (wi = t("psv-btn-p2")),
      (Si = t("psv-sec-audio")),
      t("psv-sec-quality"),
      t("psv-quality-row"),
      t("psv-sec-aspect"),
      t("psv-sec-player"),
      (xi = t("psv-btn-feedback")),
      (Ti = t("psv-aspect-row")),
      (ki = t("player-episodes")),
      (Li = t("pe-title")),
      (Mi = t("pe-sub")),
      (Ii = t("pe-seasons")),
      (Ei = t("pe-seasons-col")),
      (Ai = t("pe-episodes")),
      (Di = t("pe-season-label")),
      _i &&
        (_i._activate = function () {
          Bn();
        }),
      xi &&
        (xi._activate = function () {
          Dn();
        }),
      bi &&
        (bi._activate = function () {
          er();
        }),
      Ci &&
        (Ci._activate = function () {
          (Tn(bn(), !0), Kn(), Dn(), sr());
        }),
      wi &&
        (wi._activate = function () {
          (Tn(bn(), !1), Kn(), Dn(), sr());
        }),
      Ti)
    )
      for (var i = Ti.querySelectorAll(".psv-btn"), n = 0; n < i.length; n++)
        (function (e) {
          e._activate = function () {
            Zn(e.getAttribute("data-aspect"));
          };
        })(i[n]);
    if (
      ((mi = t("dialog-playsettings")),
      (Pi = t("dps-audio-options")),
      (Oi = t("dps-sub-switch")),
      (qi = t("dps-row-lang")),
      (Ni = t("dps-row-size")),
      (Ri = t("dps-row-style")),
      (Vi = t("dps-lang-options")),
      (Hi = t("dps-size-options")),
      (Ui = t("dps-style-options")),
      (Fi = t("dps-btn-exit")),
      (Bi = t("player-subtitles")),
      Oi &&
        (Oi._activate = function () {
          if (((Ki = !0), (Ji = !Ji))) {
            var e = En(un[Ln(bn())]);
            (!Qi && e.length && (Qi = e[0]), Qi && mn(Qi));
          } else mn(null);
          (ir(), Dn());
        }),
      Hi)
    )
      for (var r = Hi.querySelectorAll(".dps-btn"), o = 0; o < r.length; o++)
        (function (e) {
          e._activate = function () {
            ((Zi = e.getAttribute("data-size") || "normal"), gn(), ir());
          };
        })(r[o]);
    if (Ui)
      for (var s = Ui.querySelectorAll(".dps-btn"), l = 0; l < s.length; l++)
        (function (e) {
          e._activate = function () {
            ((en = e.getAttribute("data-style") || "white"), gn(), ir());
          };
        })(s[l]);
    (Fi &&
      (Fi._activate = function () {
        tr();
      }),
      gn(),
      nn(),
      setInterval(function () {
        xe &&
          !X.streamError &&
          _e &&
          _e.classList.contains("is-active") &&
          (xe.paused ||
            xe.readyState < 2 ||
            (xe.currentTime || 0) <= 0 ||
            jr(""));
      }, 2e3),
      a(we),
      a(Se),
      Ce.classList.add("focusable"),
      (Ce._onMove = function (e) {
        return "vod" === X.playerMode
          ? "left" === e
            ? (li(-10), !0)
            : "right" === e
              ? (li(10), !0)
              : "down" === e
                ? (Pn(), !0)
                : "up" === e && (Fr(), !0)
          : "left" === e
            ? (no(), !0)
            : "right" === e
              ? (ro(), !0)
              : "up" === e
                ? (Kt(X.channel - 1), !0)
                : "down" === e && (Kt(X.channel + 1), !0);
      }),
      (Ce._activate = function () {
        "vod" !== X.playerMode ? (X.infobar ? ui() : pi()) : di();
      }),
      we.appendChild(e("div", "pi-logo")),
      we.appendChild(e("div", "pi-index")));
    var d = e("div", "pi-namerow"),
      c = e("div", "pi-name");
    d.appendChild(c);
    var p = e("div", "pi-uhd");
    ((p.style.left = "20px"),
      d.appendChild(p),
      we.appendChild(d),
      we.appendChild(e("div", "pi-date")),
      we.appendChild(e("div", "pi-range")),
      we.appendChild(e("div", "pi-now")),
      we.appendChild(e("div", "pi-next")));
    var u = e("div", "pi-seek");
    (u.appendChild(e("div", "bar")),
      we.appendChild(u),
      we.appendChild(e("div", "pi-menu", "info")),
      we.appendChild(e("div", "pi-quality", "HD")),
      we.appendChild(e("div", "pi-scale", "Normal")),
      we.appendChild(e("div", "pi-func", "Selecion de función")));
    for (
      var v = e("div", "pi-actions"),
        f = [
          { label: "Pip", right: 446, w: 67, hidden: !0 },
          { label: "HD", right: 389, w: 67 },
          { label: "Anterior", right: 333, w: 67 },
          { label: "Formato", right: 249, w: 120 },
          { label: "Favorito", right: 219, w: 67 },
          { label: "Reproductor 1", right: 151, w: 90 },
          { label: "Bloquear", right: 107, w: 67 },
          { label: "Feedback", right: 50, w: 67 },
        ],
        h = 0;
      h < f.length;
      h++
    ) {
      var m = f[h];
      if (!m.hidden) {
        var g = e("div", "pi-act focusable", m.label);
        ((g.style.width = 1.5 * m.w + "px"),
          (g.style.left = 1920 - 1.5 * m.right - 1.5 * m.w + "px"),
          (g._kind = m.label),
          (g._activate = (function (e) {
            return function () {
              if ("Anterior" === e) Kt(X.channel - 1);
              else if ("Formato" === e) {
                var t = we.querySelector(".pi-scale");
                ((t.textContent =
                  "Normal" === t.textContent
                    ? "16:9"
                    : "16:9" === t.textContent
                      ? "4:3"
                      : "Normal"),
                  io());
              } else if ("Favorito" === e) {
                var a = F[X.channel];
                a &&
                  (toggleLiveFavorite(a),
                  hr(X.channel),
                  Yt(
                    X.liveFavorites[liveChannelKey(a)]
                      ? "Canal agregado a favoritos"
                      : "Canal quitado de favoritos"
                  ));
              }
            };
          })(m.label)),
          v.appendChild(g));
      }
    }
    we.appendChild(v);
    var y = e("div", "pc-header"),
      titleRow = e("div", "pc-title-row"),
      titleText = e("div", "pc-title", "Canales de TV"),
      catBadge = e("span", "pc-cat-badge", Mt ? Mt.name : "Todos"),
      toolbar = e("div", "pc-toolbar"),
      channelSearch = e("button", "pc-toolbar-btn pc-btn-search focusable"),
      channelFilter = e("button", "pc-toolbar-btn pc-btn-filter focusable"),
      channelFavorites = e("button", "pc-toolbar-btn pc-btn-fav focusable"),
      channelAll = e("button", "pc-toolbar-btn pc-btn-all focusable");

    titleRow.appendChild(titleText);
    titleRow.appendChild(catBadge);
    y.appendChild(titleRow);

    (channelSearch.setAttribute("aria-label", "Buscar canales"),
      (channelSearch.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M19 19l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg><span>Buscar</span>'),
      channelFavorites.setAttribute("aria-label", "Canales favoritos"),
      (channelFavorites.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l4 8 9 1-6.5 6 1.7 9L16 22.5 7.8 27l1.7-9L3 12l9-1z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg><span>Favoritos</span>'),
      channelFavorites.classList.toggle("is-active", liveFavoritesOnly),
      channelFilter.setAttribute("aria-label", "Filtrar categorías"),
      (channelFilter.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h22M5 16h22M5 24h22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="11" cy="8" r="3" fill="currentColor"/><circle cx="22" cy="16" r="3" fill="currentColor"/><circle cx="15" cy="24" r="3" fill="currentColor"/></svg><span>Filtrar</span>'),
      (channelSearch._activate = function () {
        openLiveChannelSearch(channelSearch);
      }),
      (channelFavorites._activate = function () {
        liveFavoritesOnly = !liveFavoritesOnly;
        syncLiveFavoriteButtons();
        hr(X.channel);
        Yt(liveFavoritesOnly ? "★ Mostrando canales favoritos" : "Mostrando todos los canales");
        rt(channelFavorites);
      }),
      (channelFilter._activate = function () {
        pr(channelFilter);
      }),
      channelAll.setAttribute("aria-label", "Todos los canales"),
      (channelAll.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 16h18M16 7v18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Todos</span>'),
      (channelAll._activate = function () {
        selectAllLiveChannels(channelAll);
      }),
      (channelSearch._onMove = function (e) {
        if ("right" === e) return rt(channelFilter), !0;
        if ("down" === e) return (F.length && fr(X.channel), !0);
        return !1;
      }),
      (channelFavorites._onMove = function (e) {
        if ("left" === e) return rt(channelFilter), !0;
        if ("right" === e) return rt(channelAll), !0;
        if ("down" === e) return (F.length && fr(X.channel), !0);
        return !1;
      }),
      (channelFilter._onMove = function (e) {
        if ("left" === e) return rt(channelSearch), !0;
        if ("right" === e) return rt(channelFavorites), !0;
        if ("down" === e) return (F.length && fr(X.channel), !0);
        return !1;
      }),
      (channelAll._onMove = function (e) {
        if ("left" === e) return rt(channelFavorites), !0;
        if ("right" === e || "up" === e) return !0;
        if ("down" === e) return (F.length && fr(X.channel), !0);
        return !1;
      }),
      toolbar.appendChild(channelSearch),
      toolbar.appendChild(channelFilter),
      toolbar.appendChild(channelFavorites),
      toolbar.appendChild(channelAll),
      y.appendChild(toolbar),
      Se.appendChild(y));
    var b = e("div", "pc-categories scrollable");
    ((b.id = "pc-categories"),
      Se.appendChild(b),
      Se.appendChild(e("div", "pc-div")));
    var C = e("div", "pc-list scrollable");
    (Se.appendChild(C), dr(), hr());
    var w = e("div", "pc-menu");
    (w.appendChild(e("div", "ic")),
      w.appendChild(e("div", "l1", "[OK] Reproducir · [→] Favorito")),
      w.appendChild(e("div", "l2", "[↑] Buscar · ← Menú")),
      Se.appendChild(w));
  }
  function closeLiveChannelSearch(returnFocus) {
    var e = Se && Se.querySelector(".pc-search-box");
    ((liveSearchOpen = !1),
      liveSearchInput && liveSearchInput.blur && liveSearchInput.blur(),
      (liveSearchInput = null),
      e && e.parentNode && e.parentNode.removeChild(e),
      hr(X.channel),
      returnFocus && rt(returnFocus));
  }
  function openLiveChannelSearch(returnFocus) {
    if (!Se) return;
    if (liveSearchOpen) return void closeLiveChannelSearch(returnFocus);
    liveSearchOpen = !0;
    var box = e("div", "pc-search-box"),
      label = e("label", "pc-search-label", "Buscar canal"),
      input = document.createElement("input"),
      clear = e("button", "pc-search-clear focusable", "Limpiar");
    ((input.type = "search"),
      (input.className = "pc-search-input focusable"),
      (input.placeholder = "Escribe el nombre del canal"),
      (input.value = liveSearchText),
      (input._onMove = function (e) {
        return "left" === e || "up" === e
          ? (closeLiveChannelSearch(returnFocus), !0)
          : "down" === e &&
              (function () {
                var e = visibleLiveIndexes(),
                  t = e.indexOf(X.channel) >= 0 ? X.channel : e[0];
                return void 0 !== t && fr(t), !0;
              })();
      }),
      (input._activate = function () {
        hr(X.channel);
      }),
      input.addEventListener("input", function () {
        ((liveSearchText = input.value || ""), hr(X.channel));
      }),
      (clear._activate = function () {
        ((input.value = ""), (liveSearchText = ""), hr(X.channel), rt(input));
      }),
      (clear._onMove = function (e) {
        if ("left" === e) return (rt(input), !0);
        if ("down" === e) {
          var t = visibleLiveIndexes(),
            a = t.indexOf(X.channel) >= 0 ? X.channel : t[0];
          return void 0 !== a && fr(a), !0;
        }
        return !1;
      }),
      label.appendChild(input),
      box.appendChild(label),
      box.appendChild(clear),
      Se.appendChild(box),
      (liveSearchInput = input),
      hr(X.channel),
      rt(input),
      setTimeout(function () {
        try {
          input.focus();
        } catch (e) {}
      }, 0));
  }
  function dr() {
    if (Se) {
      var t = Se.querySelector(".pc-categories");
      if (t) {
        var i =
            Lt && Lt.length
              ? Lt
              : [
                  { id: 76182, name: "Todos" },
                  { id: 76206, name: "Deportes" },
                  { id: 76205, name: "Cine y Series" },
                  { id: 76188, name: "Colombia" },
                  { id: 76191, name: "España" },
                  { id: 76197, name: "México" },
                  { id: "addons", name: "➕ Addons M3U", isAddon: !0 },
                ];
        X.adultEnabled ||
          (i = i.filter(function (e) {
            return !!(e && (e.isAddon || !isAdultLiveChannel(e)));
          }));
        for (var n = "", r = 0; r < i.length; r++)
          n += i[r].id + "|";
        var o = X.focus && X.focus._cat ? X.focus._cat : null;
        if (n !== Je) {
          a(t);
          for (var s = [], l = 0; l < i.length; l++) {
            var d = i[l],
              c = e("button", "pc-cat-pill focusable", d.name);
            ((c._cat = d),
              (c._idx = l),
              (c._activate = (function (e) {
                return function () {
                  Xt(e);
                };
              })(d)),
              (c._onMove = (function (e) {
                return function (a) {
                  if ("left" === a)
                    return (
                      e > 0 && s[e - 1] && (rt(s[e - 1]), vr(t, s[e - 1])),
                      !0
                    );
                  if ("right" === a)
                    return (
                      e < s.length - 1 && s[e + 1]
                        ? (rt(s[e + 1]), vr(t, s[e + 1]))
                        : rt(Ce),
                      !0
                    );
                  /* Las categorías se abren únicamente con el botón Filtrar;
                     subir desde Todos no debe abrir un panel inesperado. */
                  if ("up" === a) return !0;
                  if ("down" === a) {
                    var i = Se.querySelector(".pc-row-addon-promo");
                    if (i) return (rt(i), !0);
                    if (F.length) return (fr(X.channel), !0);
                  }
                  return !1;
                };
              })(l)),
              t.appendChild(c),
              s.push(c));
          }
          ((t._pills = s), (Je = n));
        }
        for (var p = Mt || i[0], u = t._pills || [], v = 0; v < u.length; v++) {
          var f = u[v];
          f._cat && p && f._cat.id === p.id
            ? f.classList.add("is-selected")
            : f.classList.remove("is-selected");
        }
        if (o) {
          for (var h = null, m = 0; m < u.length; m++)
            if (u[m]._cat && u[m]._cat.id === o.id) {
              h = u[m];
              break;
            }
          h && (X.focus !== h && rt(h), vr(t, h));
        }
      }
    }
  }
  function cr() {
    if (Se) {
      var e = Se.querySelector(".pc-categories"),
        t = e ? e.querySelector(".pc-cat-pill.is-selected") : null;
      e && t && vr(e, t);
    }
  }
  var categoryPickerReturnFocus = null;
  function pr(returnFocus) {
    categoryPickerReturnFocus = returnFocus || X.focus;
    if (
      ($e ||
        (($e = t("player-categories")),
        (Ge = t("pcat-grid")),
        (Qe = t("pcat-sub"))),
      $e && Ge)
    ) {
      ((X.categoryPickerOpen = !0),
        $e.classList.add("is-active"),
        ui(),
        (function () {
          if (!Ge) return;
          var t = Lt && Lt.length ? Lt : DEFAULT_LIVE_CATEGORIES.slice();
          X.adultEnabled ||
            (t = t.filter(function (e) {
              return !!(e && (e.isAddon || !isAdultLiveChannel(e)));
            }));
          (a(Ge),
            Qe &&
              (Qe.textContent = t.length
                ? t.length + " categorías · selecciona para ver canales"
                : "Cargando categorías…"));
          for (var i = 0; i < t.length; i++)
            (function (t) {
              var a = e("div", "pcat-tile focusable");
              (a.appendChild(e("div", "pcat-name", t.name)),
                Mt && Mt.id === t.id && a.classList.add("is-selected"),
                (a._cat = t),
                (a._activate = function () {
                  Xt(t);
                  ur(!0);
                  Yt("Categoría: " + t.name);
                  if ("home" === X.screen) {
                    Qt(liveFavoritesOnly);
                  } else if ("player" === X.screen) {
                    hr(0);
                  }
                  if (categoryPickerReturnFocus && at(categoryPickerReturnFocus)) {
                    rt(categoryPickerReturnFocus);
                  } else {
                    var ret = Se ? Se.querySelector(".pc-btn-filter") : null;
                    if (ret && at(ret)) {
                      rt(ret);
                    } else if ("player" === X.screen && Ce) {
                      rt(Ce);
                    } else if ("home" === X.screen) {
                      var homeFast = document.querySelector(".live-fast .f-all");
                      if (homeFast && at(homeFast)) {
                        rt(homeFast);
                      } else if (Fe[0] && at(Fe[0])) {
                        rt(Fe[0]);
                      }
                    }
                  }
                }),
                Ge.appendChild(a));
            })(t[i]);
        })());
      var i = Ge.querySelector(".pcat-tile.is-selected") || ot(Ge);
      i && rt(i);
    }
  }
  function ur(e) {
    if (
      $e &&
      X.categoryPickerOpen &&
      ((X.categoryPickerOpen = !1), $e.classList.remove("is-active"), !e)
    ) {
      if (categoryPickerReturnFocus && at(categoryPickerReturnFocus)) {
        rt(categoryPickerReturnFocus);
      } else {
        var t = Se ? Se.querySelector(".pc-btn-filter") : null;
        if (t && at(t)) {
          rt(t);
        } else if ("player" === X.screen && Ce) {
          rt(Ce);
        } else if ("home" === X.screen) {
          var homeFast = document.querySelector(".live-fast .f-all");
          if (homeFast && at(homeFast)) {
            rt(homeFast);
          } else if (Fe[0] && at(Fe[0])) {
            rt(Fe[0]);
          }
        }
      }
    }
  }
  function vr(e, t) {
    if (e && t) {
      var a = t.offsetLeft,
        i = t.offsetWidth,
        n = e.scrollLeft,
        r = e.clientWidth;
      a < n
        ? (e.scrollLeft = a - 20)
        : a + i > n + r && (e.scrollLeft = a + i - r + 20);
    }
  }
  function fr(e) {
    if (F.length) {
      var visible = visibleLiveIndexes();
      if (!visible.length) return;
      e = Math.max(0, Math.min(F.length - 1, Number(e) || 0));
      /* Si Favoritos acaba de ocultar el canal reproducido, ↓ debe entrar al
         primer favorito visible, nunca conservar un foco en una fila ausente. */
      if (visible.indexOf(e) < 0) e = visible[0];
      (Xe[e] || hr(e), Xe[e] && rt(Xe[e]));
    }
  }
  function closeLiveFavoriteConfirm(returnFocus) {
    var e = liveFavoritePrompt;
    ((liveFavoritePrompt = null),
      e && e.parentNode && e.parentNode.removeChild(e),
      returnFocus && at(returnFocus) && rt(returnFocus));
  }
  function hr(t) {
    var previousFocus = X.focus,
      previousChannel =
        previousFocus && void 0 !== previousFocus._channel
          ? previousFocus._channel
          : -1,
      previousWasFavorite =
        previousFocus &&
        previousFocus.classList &&
        previousFocus.classList.contains("pc-channel-fav");
    if (Se) {
      var i = Se.querySelector(".pc-list");
      if (i) {
        if ((a(i), (Xe = {}), Mt && Mt.isAddon)) {
          var n = e("div", "pc-row-addon-promo focusable");
          n.appendChild(e("div", "promo-icon", "⚙️"));
          var o = e("div", "promo-info");
          (o.appendChild(
            e("div", "promo-text", "➕ Administrar Addons y Listas M3U")
          ),
            o.appendChild(
              e(
                "div",
                "promo-sub",
                "Instala listas recomendadas o agrega tu enlace"
              )
            ),
            n.appendChild(o),
            (n._activate = function () {
              sa();
            }),
            (n._onMove = function (e) {
              if ("up" === e) {
                var t =
                  Se.querySelector(".pc-cat-pill.is-selected") ||
                  Se.querySelector(".pc-cat-pill");
                return (t && rt(t), !0);
              }
              return "down" === e
                ? (F.length && fr(0), !0)
                : "right" === e && (rt(Ce), !0);
            }),
            i.appendChild(n));
        }
        var visible = visibleLiveIndexes();
        if (!visible.length) {
          var s = e(
            "div",
            "pc-empty-channels",
            liveSearchText
              ? "No hay canales que coincidan con la búsqueda"
              : liveFavoritesOnly
                ? "Aún no tienes canales favoritos en esta categoría"
                : "No hay canales disponibles en esta categoría"
          );
          return (
            (s.style.padding = "30px"),
            (s.style.color = "#888"),
            (s.style.fontSize = "20px"),
            void i.appendChild(s)
          );
        }
        ((t = Number(t)),
          isFinite(t) || (t = X.channel),
          (t = Math.max(0, Math.min(F.length - 1, t || 0))));
        var currentPosition = visible.indexOf(t);
        currentPosition < 0 && (currentPosition = 0);
        for (
          var l = Math.max(0, currentPosition - Math.floor(Ke / 2)),
            d = Math.min(visible.length, l + Ke),
            c = (l = Math.max(0, d - Ke));
          c < d;
          c++
        ) {
          var channelIndex = visible[c];
          var p = e("div", "pc-row focusable");
          p._channel = channelIndex;
          var u = e("div", "ic");
          F[channelIndex].logo &&
            ((u.style.backgroundImage = "url(" + F[channelIndex].logo + ")"),
            (u.style.backgroundSize = "contain"),
            (u.style.backgroundRepeat = "no-repeat"),
            (u.style.backgroundPosition = "center"));
          var v = e("div", "num", r(F[channelIndex].index || channelIndex + 1)),
            f = e("div", "nm", F[channelIndex].name),
            h = e("div", "epg", F[channelIndex].now || "En vivo"),
            m = e(
              "button",
              "pc-channel-fav focusable" +
                (X.liveFavorites[liveChannelKey(F[channelIndex])] || F[channelIndex].fav
                  ? " is-favorite"
                  : ""),
              X.liveFavorites[liveChannelKey(F[channelIndex])] || F[channelIndex].fav
                ? "★"
                : "☆"
            );
          (p.appendChild(u),
            p.appendChild(v),
            p.appendChild(f),
            p.appendChild(h),
            p.appendChild(m),
            channelIndex === X.channel && p.classList.add("is-current"),
            (p._activate = (function (e) {
              return function () {
                (Kt(e, !0), rt(this));
              };
            })(channelIndex)),
            (p._onMove = (function (e, favoriteButton) {
              return function (t) {
                if ("left" === t) {
                  var a = Se.querySelector(".pc-btn-search");
                  return (a && rt(a), !0);
                }
                if ("right" === t) return (rt(favoriteButton), !0);
                if ("up" === t) {
                  if (e > 0) fr(visible[e - 1]);
                  else if (0 === e) {
                    var a = Se.querySelector(".pc-row-addon-promo");
                    if (a) rt(a);
                    else {
                      var i = Se.querySelector(".pc-btn-all");
                      i && rt(i);
                    }
                  }
                  return !0;
                }
                return "down" === t &&
                  (e < visible.length - 1 && fr(visible[e + 1]), !0);
              };
            })(c, m)),
            (m._channel = channelIndex),
            (m._activate = (function (e, t) {
              return function () {
                (toggleChannelFavoriteDirect(e, null),
                  (t = Xe[e] && Xe[e].querySelector(".pc-channel-fav")),
                  t && rt(t));
              };
            })(channelIndex, m)),
            (m._onMove = (function (e, t) {
              return function (a) {
                if ("left" === a) return (rt(t), !0);
                if ("right" === a) return (rt(Ce), !0);
                if ("up" === a || "down" === a) {
                  var i = visible.indexOf(e),
                    n = "up" === a ? i - 1 : i + 1,
                    r = n >= 0 && n < visible.length ? Xe[visible[n]] : null,
                    o = r && r.querySelector(".pc-channel-fav");
                  return o && rt(o), !0;
                }
                return !1;
              };
            })(channelIndex, p)),
            i.appendChild(p),
            (Xe[channelIndex] = p));
        }
        /* Igual que Inicio: no se deja el foco apuntando a una fila eliminada
           cuando hr() refresca la grilla de TV completa. */
        if (
          "player" === X.screen &&
          X.channelsOpen &&
          previousChannel >= 0 &&
          !at(previousFocus) &&
          Xe[previousChannel]
        )
          rt(
            previousWasFavorite
              ? Xe[previousChannel].querySelector(".pc-channel-fav") ||
                Xe[previousChannel]
              : Xe[previousChannel]
          );
      }
    }
  }
  var mr = "",
    gr = "",
    yr = 0,
    br = "",
    Cr = 0,
    wr = !1,
    Sr = null,
    xr = !1,
    Tr = null;
  function _r() {
    var e = (function () {
      if (null !== Tr) return Tr;
      var e = "";
      try {
        window.webOS &&
          window.webOS.systemInfo &&
          window.webOS.systemInfo.version &&
          (e = String(window.webOS.systemInfo.version));
      } catch (t) {
        e = "";
      }
      if (!e && window.PalmSystem && window.PalmSystem.deviceInfo)
        try {
          var t = window.PalmSystem.deviceInfo;
          ("string" == typeof t && (t = JSON.parse(t)),
            t &&
              (t.platformVersion
                ? (e = String(t.platformVersion))
                : t.version
                  ? (e = String(t.version))
                  : void 0 !== t.platformVersionMajor &&
                      null !== t.platformVersionMajor
                    ? (e =
                        String(t.platformVersionMajor) +
                        "." +
                        String(t.platformVersionMinor || 0))
                    : t.sdkVersion && (e = String(t.sdkVersion))));
        } catch (t) {
          e = "";
        }
      if (!e && navigator && navigator.userAgent) {
        var a = /(?:webOS|Web0S)[ \/]([0-9]+(?:\.[0-9]+)?)/i.exec(
          navigator.userAgent
        );
        a && a[1] && (e = a[1]);
      }
      !e &&
        navigator &&
        navigator.userAgent &&
        (/Chrome\/38\./i.test(navigator.userAgent)
          ? (e = "3.0")
          : /Chrome\/53\./i.test(navigator.userAgent)
            ? (e = "3.5")
            : /Chrome\/68\./i.test(navigator.userAgent) && (e = "4.0"));
      var i = parseFloat(e);
      return (Tr = isNaN(i) ? 0 : i);
    })();
    /* Modo Fluido usa siempre fMP4 (igual que XuperMH): el pipeline nativo de
       webOS 1/2/3 no demuxa de forma fiable el MPEG-TS crudo y dejaba la
       pantalla en negro. El Modo Normal no pasa por aquí. */
    return "mp4";
  }
  function kr(e) {
    return (
      "string" == typeof e &&
      (-1 !== e.indexOf(":8787/s/") || -1 !== e.indexOf(":8787/t/"))
    );
  }
  function Lr() {
    Sr && (clearTimeout(Sr), (Sr = null));
  }
  function Mr() {
    if (xe) {
      if (wr && br && "vod" === X.playerMode) {
        var e = br,
          t = Math.max(0, Math.floor(Cr + (xe.currentTime || 0)));
        wr = !1;
        var a = e + "?start=" + t;
        return (Xi && (a += "&a=" + Xi), jr("Reanudando vídeo…"), void Gr(a));
      }
      try {
        var i = xe.play();
        i && i.catch && i.catch(function () {});
      } catch (e) {}
    }
  }
  var Ir = 0,
    Er = null,
    Ar = null;
  function Dr() {
    Ar && (clearTimeout(Ar), (Ar = null));
  }
  function Pr(e) {
    if (!Ar && !X.streamError) {
      var t = (xe && xe.currentTime) || 0;
      Ar = setTimeout(function () {
        ((Ar = null),
          X.streamError ||
            !xe ||
            xe.paused ||
            xe.readyState >= 3 ||
            (xe.currentTime || 0) > t + 0.35 ||
            jr(e));
      }, 700);
    }
  }
  var Or = !1,
    qr = null;
  function Nr() {
    ((Or = !1), qr && (clearTimeout(qr), (qr = null)));
  }
  function Rr() {
    if (((Er = null), xe && Ir)) {
      if (br) {
        if (Or) return void (Ir = 0);
        Or = !0;
        var e = Cr + (xe.currentTime || 0),
          t = Math.max(0, e + Ir);
        Ir = 0;
        var a = (X.playerItem && X.playerItem.duration) || xe.duration || 0;
        (a > 0 && t > a - 2 && (t = Math.max(0, a - 2)), (Cr = Math.floor(t)));
        var i = br + "?start=" + Cr;
        return ((qr = setTimeout(Nr, 12e3)), void Gr(i));
      }
      var n = (xe.currentTime || 0) + Ir;
      Ir = 0;
      var r = xe.duration || 0;
      (n < 0 && (n = 0), r > 0 && n > r - 1 && (n = r - 1));
      try {
        xe.currentTime = n;
      } catch (e) {}
    } else Ir = 0;
  }
  function li(e) {
    xe &&
      ((Ir += e),
      Er && clearTimeout(Er),
      (Er = setTimeout(Rr, 800)),
      si(e > 0 ? "fwd" : "rew"),
      setTimeout(function () {
        si("none");
      }, 600));
  }
  function Vr() {
    return xe ? (br ? Cr + (xe.currentTime || 0) : xe.currentTime || 0) : 0;
  }
  function Hr() {
    var e = xe && isFinite(xe.duration) && xe.duration > 0 ? xe.duration : 0;
    return (
      !e &&
        X.playerEpisode &&
        X.playerEpisode.duration &&
        (e = ii(X.playerEpisode.duration)),
      !e &&
        X.playerItem &&
        X.playerItem.duration &&
        (e = ii(X.playerItem.duration)),
      e || 0
    );
  }
  function Ur(e) {
    if (Ye) {
      var t = Ze,
        a = Vr();
      ((Ye = !1),
        Pe && Pe.classList.remove("is-scrubbing"),
        e && Math.abs(t - a) >= 1 && li(t - a),
        oi(Vr(), Hr()),
        rt(Ce),
        ci());
    }
  }
  function Fr() {
    var e = Hr();
    Pe && e
      ? ((Ze = Math.max(0, Math.min(e - 1, Vr()))),
        (Ye = !0),
        Pe.classList.add("is-scrubbing"),
        pi(),
        X.infoTimer && (clearTimeout(X.infoTimer), (X.infoTimer = null)),
        oi(Ze, e),
        rt(Pe))
      : pi();
  }
  function Br(e) {
    var t = Hr();
    if (Ye && t) {
      var a = Math.max(60, Math.min(300, Math.round(0.05 * t)));
      oi((Ze = Math.max(0, Math.min(t - 1, Ze + e * a))), t);
    }
  }
  function zr() {
    (Lr(), "vod" === X.playerMode && xe) &&
      sn(
        br ? Cr + (xe.currentTime || 0) : xe.currentTime || 0,
        xe && isFinite(xe.duration) && xe.duration > 0
          ? xe.duration
          : ii(
              (X.playerEpisode && X.playerEpisode.duration) ||
                (X.playerItem && X.playerItem.duration) ||
                0
            ),
        !0
      );
    ((X.streamError = ""),
      Dr(),
      jr(""),
      si("none"),
      ri(),
      Er && (clearTimeout(Er), (Er = null), (Ir = 0)),
      Nr(),
      (wr = !1),
      (br = ""),
      (Cr = 0),
      yr++);
    var e = mr;
    if (!e && gr && -1 !== gr.indexOf("127.0.0.1")) {
      var a = /^(http:\/\/127\.0\.0\.1:\d+)/.exec(gr);
      a && (e = a[1]);
    }
    if (e)
      try {
        var i = new XMLHttpRequest();
        (i.open("GET", e + "/media/abort", !0), i.send());
      } catch (e) {}
    try {
      P("abortMedia", {}, function () {});
    } catch (e) {}
    if (((gr = ""), (mr = ""), xe)) {
      ((xe.onerror = null),
        (xe.onwaiting = null),
        (xe.onstalled = null),
        (xe.onloadeddata = null),
        (xe.oncanplay = null),
        (xe.onloadedmetadata = null),
        (xe.ondurationchange = null),
        (xe.onplaying = null),
        (xe.onended = null),
        (xe.ontimeupdate = null),
        (xe.onpause = null),
        (xe.onplay = null));
      try {
        xe.pause();
      } catch (e) {}
      try {
        xe.currentTime = 0;
      } catch (e) {}
      xe.removeAttribute("src");
      try {
        xe.src = "";
      } catch (e) {}
      for (; xe.firstChild;) xe.removeChild(xe.firstChild);
      (xe.classList.remove("is-active"),
        Te && (Te.style.display = "block"),
        (function () {
          Wr && (clearTimeout(Wr), (Wr = null));
          Le || (Le = t("player-mode-hint"));
          Le && (Le.classList.remove("is-active"), (Le.textContent = ""));
        })());
    }
  }
  function jr(e) {
    (_e || (_e = t("player-status")),
      _e &&
        (e
          ? ((_e.textContent = e), _e.classList.add("is-active"))
          : ((_e.textContent = ""), _e.classList.remove("is-active"))));
  }
  var Wr = null,
    Xr = "";
  function $r() {
    if (
      "vod" === X.playerMode &&
      ("smooth" === X.streamMode || "relay" === X.streamMode) &&
      "player" === X.screen &&
      (Le || (Le = t("player-mode-hint")), Le)
    ) {
      var a =
        String((X.playerItem && X.playerItem.id) || "") +
        "|" +
        String((X.playerEpisode && X.playerEpisode.id) || "");
      ("|" !== a && a === Xr) ||
        ((Xr = a),
        (Le.textContent = ""),
        Le.appendChild(e("span", "pmh-title", "Modo Fluido activado")),
        Le.appendChild(
          e(
            "span",
            "pmh-sub",
            "Úsalo cuando las películas van trabadas o se cortan. Si tu TV las reproduce bien en Normal, déjalo en Normal para ver mejor imagen."
          )
        ),
        Le.classList.add("is-active"),
        Wr && clearTimeout(Wr),
        (Wr = setTimeout(function () {
          ((Wr = null), Le && Le.classList.remove("is-active"));
        }, 9e3)));
    }
  }
  function Gr(e, t) {
    if (xe && e) {
      var a = !!(t = t || {}).nativeHls;
      (zr(), (wr = !1), (gr = e));
      var i = /^(http:\/\/127\.0\.0\.1:\d+)/.exec(e);
      if ((i && (mr = i[1]), kr(e))) {
        br = e.split("?")[0];
        var n = /[?&]start=(\d+)/.exec(e);
        ((Cr = n ? parseInt(n[1], 10) : 0),
          (function (e) {
            (Lr(),
              kr(e) &&
                !xr &&
                (Sr = setTimeout(function () {
                  ((Sr = null),
                    !xe ||
                      xe.readyState >= 2 ||
                      (console.warn(
                        "[relay] Watchdog: Modo Fluido no arrancó en 15 s, volviendo a Modo Normal..."
                      ),
                      (xr = !0),
                      (X.streamMode = "normal"),
                      K(STREAM_MODE_KEY, "normal"),
                      jr("Modo Fluido no respondió, usando Modo Normal…"),
                      sr()));
                }, 15e3)));
          })(e));
      } else ((br = ""), (Cr = 0), Lr());
      (jr("Conectando con el vídeo…"), (X.streamError = ""));
      try {
        xe.preload = "auto";
      } catch (e) {}
      var r = (X.playerItem && X.playerItem.streamMime) || "",
        o =
          -1 !== e.indexOf(".m3u8") ||
          -1 !== r.indexOf("mpegurl") ||
          !(!X.playerItem || !X.playerItem.isHls),
        s = o
          ? "application/vnd.apple.mpegurl"
          : -1 !== e.indexOf(".mp4") || -1 !== r.indexOf("mp4")
            ? "video/mp4"
            : "video/mp2t";
      ((xe.onerror = function () {
        (Gn(), Nr());
        var t = xe.error && xe.error.code;
        if (4 === t && "live" === X.playerMode && o && !a) {
          var i = Zr;
          return (
            jr("Reintentando señal con compatibilidad webOS…"),
            void setTimeout(function () {
              "live" === X.playerMode && Zr === i && Gr(e, { nativeHls: !0 });
            }, 0)
          );
        }
        if (
          4 === t &&
          "vod" === X.playerMode &&
          "normal" === X.streamMode &&
          Gi &&
          Date.now() < Gi
        )
          return (
            (Gi = 0),
            (X.streamError =
              "No fue posible cambiar el idioma en reproducción Normal"),
            void jr(X.streamError)
          );
        if (
          4 === t &&
          "vod" === X.playerMode &&
          "normal" === X.streamMode &&
          X.playerItem
        ) {
          var n = X.playerItem,
            r = Ln(n) || Sn(n);
          if (wn !== r)
            return (
              (wn = r),
              (X.streamMode = "smooth"),
              jr("Reintentando película en modo compatible…"),
              void setTimeout(function () {
                "vod" === X.playerMode &&
                  X.playerItem === n &&
                  "smooth" === X.streamMode &&
                  sr();
              }, 0)
            );
        }
        if (
          (3 === t || 4 === t) &&
          "vod" === X.playerMode &&
          X.playerItem &&
          xNextCopy()
        )
          return;
        ((X.streamError =
          "No se pudo abrir el stream (código " + (t || "error") + ")"),
          xe.classList.remove("is-active"),
          Te && (Te.style.display = "block"),
          jr(X.streamError));
      }),
        (xe.onloadeddata = function () {
          (v(), $r());
        }),
        (xe.oncanplay = function () {
          (Nr(), v());
        }),
        (xe.onloadedmetadata = function () {
          if ((v(), "vod" === X.playerMode && "normal" === X.streamMode)) {
            var e = X.playerItem && X.playerItem.streamAudioInfo,
              t = preferredAudioIndex(e);
            rr(t) && (Xi = t);
          }
          if (
            "vod" === X.playerMode &&
            !br &&
            Number(X.resumePosition) > 3
          ) {
            var resumeAt = Math.floor(Number(X.resumePosition) || 0);
            X.resumePosition = 0;
            try {
              xe.currentTime = resumeAt;
              jr("Reanudando desde " + ai(resumeAt) + "…");
            } catch (e) {}
          }
          if ("vod" === X.playerMode) {
            var a = br ? Cr : xe.currentTime || 0,
              i =
                xe && isFinite(xe.duration) && xe.duration > 0
                  ? xe.duration
                  : 0,
              n =
                X.playerEpisode && X.playerEpisode.duration
                  ? ii(X.playerEpisode.duration)
                  : 0,
              r =
                X.playerItem && X.playerItem.duration
                  ? ii(X.playerItem.duration)
                  : 0;
            oi(a, i || n || r || 0);
          }
        }),
        (xe.ondurationchange = function () {
          if ("vod" === X.playerMode) {
            var e = br ? Cr + (xe.currentTime || 0) : xe.currentTime || 0,
              t =
                xe && isFinite(xe.duration) && xe.duration > 0
                  ? xe.duration
                  : 0,
              a =
                X.playerEpisode && X.playerEpisode.duration
                  ? ii(X.playerEpisode.duration)
                  : 0,
              i =
                X.playerItem && X.playerItem.duration
                  ? ii(X.playerItem.duration)
                  : 0;
            oi(e, t || a || i || 0);
          }
        }),
        (xe.onplaying = function () {
          (Lr(), Gn(), v());
        }),
        (xe.onended = function () {
          "vod" === X.playerMode && Qn();
        }),
        (xe.ontimeupdate = function () {
          if (
            (!X.streamError &&
              (xe.currentTime > 0 || xe.readyState >= 2) &&
              v(),
            "vod" === X.playerMode)
          ) {
            var e = br ? Cr + (xe.currentTime || 0) : xe.currentTime || 0,
              t =
                xe && isFinite(xe.duration) && xe.duration > 0
                  ? xe.duration
                  : 0,
              a =
                X.playerEpisode && X.playerEpisode.duration
                  ? ii(X.playerEpisode.duration)
                  : 0,
              i =
                X.playerItem && X.playerItem.duration
                  ? ii(X.playerItem.duration)
                  : 0,
              n = t || a || i || 0;
            (oi(e, n), yn(e), sn(e, n));
          }
        }),
        (xe.onpause = function () {
          (ri(), "vod" === X.playerMode) &&
            (sn(
              br ? Cr + (xe.currentTime || 0) : xe.currentTime || 0,
              xe && isFinite(xe.duration) && xe.duration > 0
                ? xe.duration
                : ii(
                    (X.playerEpisode && X.playerEpisode.duration) ||
                      (X.playerItem && X.playerItem.duration) ||
                      0
                  ),
              !0
            ),
            si("pause"),
            br && (wr = !0));
        }),
        (xe.onplay = function () {
          "vod" === X.playerMode &&
            (si("none"),
            ri(),
            (ni = setInterval(function () {
              if (
                "player" === X.screen &&
                "vod" === X.playerMode &&
                xe &&
                !xe.paused
              ) {
                var e = br ? Cr + (xe.currentTime || 0) : xe.currentTime || 0,
                  t =
                    xe && isFinite(xe.duration) && xe.duration > 0
                      ? xe.duration
                      : 0,
                  a =
                    X.playerEpisode && X.playerEpisode.duration
                      ? ii(X.playerEpisode.duration)
                      : 0,
                  i =
                    X.playerItem && X.playerItem.duration
                      ? ii(X.playerItem.duration)
                      : 0,
                  n = t || a || i || 0;
                (oi(e, n), yn(e), sn(e, n));
              }
            }, 500)));
        }),
        (xe.onwaiting = function () {
          Pr("Cargando vídeo…");
        }),
        (xe.onstalled = function () {
          Pr("Conectando…");
        }));
      for (
        var l = {
            mediaTransportType: o ? "HLS" : "URI",
            option: { transmission: { playTime: { start: 0 } } },
          },
          d = encodeURI(JSON.stringify(l)),
          c = a ? s : s + ";mediaOption=" + d;
        xe.firstChild;
      )
        xe.removeChild(xe.firstChild);
      if ((xe.removeAttribute("src"), a))
        try {
          xe.mediaOption = null;
        } catch (e) {}
      else
        try {
          xe.mediaOption = l;
        } catch (e) {}
      var p = document.createElement("source");
      if ((p.setAttribute("src", e), p.setAttribute("type", c), o))
        try {
          xe.load();
        } catch (e) {}
      if ((xe.appendChild(p), !o))
        try {
          xe.src = e;
        } catch (e) {}
      try {
        xe.currentTime = 0;
      } catch (e) {}
      (xe.classList.add("is-active"), Te && (Te.style.display = "none"));
      try {
        xe.load();
        var u = xe.play();
        u &&
          u.catch &&
          u.catch(function () {
            xe.error ||
              ((X.streamError = "Pulsa OK para iniciar la reproducción"),
              jr(X.streamError));
          });
      } catch (e) {
        ((X.streamError = "Pulsa OK para iniciar la reproducción"),
          jr(X.streamError));
      }
    }
    function v() {
      (Dr(), jr(""));
    }
  }
  function Qr(e, t) {
    var a = yr;
    function i() {
      var i = { contentId: e.id };
      if (
        ((i.playbackMode = X.streamMode),
        (i.forceRelay = "smooth" === X.streamMode || "relay" === X.streamMode),
        i.forceRelay)
      ) {
        var n = _r();
        i.container = n;
      }
      i.trackIndex = X.trackIndex || 0;
      ((i.quality = "auto"),
        (i.hevc = xHevcCapable()),
        (i.uhd = xUhdPanel()));
      var r = X.playerEpisode,
        o = (r && r.id) || (e && e.id) || "",
        s = un[o] || un[Ln(e)],
        l =
          (s && s.audio) || (r && r.streamAudioInfo) || e.streamAudioInfo || "";
      if (
        ((Xi = preferredAudioIndex(l)),
        (i.audioTrack = Xi || 0),
        (i.audioPreference = X.audioPreferenceCode || ""),
        x(e))
      ) {
        var d = X.playerEpisode,
          c = e.seasonId || e.id;
        if (d && d.id) ((i.contentId = d.id), (i.seriesContentId = c));
        else {
          if (!e.episodes || !e.episodes.length) return t("");
          ((X.playerEpisode = e.episodes[0]),
            (i.contentId = e.episodes[0].id),
            (i.seriesContentId = c));
        }
      }
      var done = function (i, n) {
        if (a !== yr) return;
        /* Como XuperMH: si Modo Fluido no se puede resolver, reintenta una vez
           por el camino Normal en lugar de dejar al espectador sin vídeo. */
        if (
          (i || !n || !1 === n.returnValue) &&
          i.forceRelay &&
          !i._retryNormal
        ) {
          i._retryNormal = !0;
          i.forceRelay = !1;
          i.playbackMode = "normal";
          jr("Modo Fluido no respondió, usando Modo Normal…");
          return void P("resolve", i, done);
        }
        if (i || !n || !1 === n.returnValue)
          return (
            (X.streamError =
              "No se pudo resolver el título" + (i ? ": " + i : "")),
            jr(X.streamError),
            t("")
          );
        (D("vod", n),
          (e.streamMime = n.mime || ""),
          (e.streamCodec = n.codec || ""),
          n.duration > 0
            ? ((e.duration = n.duration),
              X.playerEpisode && (X.playerEpisode.duration = n.duration))
            : (e.duration = e.duration || 0),
          (e.subtitles = n.subtitles || []),
          (e.streamAudioInfo = n.audio || e.streamAudioInfo || ""),
          X.playerEpisode &&
            (X.playerEpisode.streamAudioInfo = n.audio || ""),
          (e.isHls = !!n.isHls),
          n.audio && (Xi = preferredAudioIndex(n.audio)));
        var r = {
          audio: n.audio || e.streamAudioInfo,
          subtitles: e.subtitles,
          tracks: n.availableTracks || [],
          selected: n.selectedTrack || {},
          duration: n.duration || 0,
        };
        ((un[Ln(e)] = r), An(r));
        try {
          window.__xuperStreamInfo = {
            selectedTrack: n.selectedTrack || {},
            availableTracks: n.availableTracks || [],
          };
        } catch (e) {}
        var o = n.proxyPath || n.url || "",
          s = Math.floor(Number(X.resumePosition) || 0);
        if (s > 3 && /127\.0\.0\.1:8787\/s\//.test(o)) {
          o += (o.indexOf("?") >= 0 ? "&" : "?") + "start=" + s;
          X.resumePosition = 0;
        }
        t(o);
      };
      P(i.forceRelay ? "resolveSmooth" : "resolve", i, done);
    }
    if (
      x(e) &&
      !X.playerEpisode &&
      (!e.episodes || !e.episodes.length) &&
      !e._detailsLoaded
    )
      return (
        jr("Cargando capítulos…"),
        void U(e, function () {
          a === yr && i();
        })
      );
    i();
  }
  function Jr(e, t) {
    if (xe) {
      (t &&
        ((X.playerEpisode = t), (X.playerSeasonIndex = X.detailSeason || 0)),
        e && (X.playerItem = e));
      var a = e || X.playerItem;
      if ((a && xn(a), zr(), a)) {
        var i = t || X.playerEpisode,
          n = (i && i.id) || (a && a.id) || "",
          r = n ? un[n] : null,
          o = (r && r.audio) || (i && i.streamAudioInfo) || "";
        if (a._portal && !$i && !o) {
          var s = !1,
            l = yr,
            d = function () {
              if (!s && l === yr) {
                s = !0;
                var e = (t && (t.number || t.seriesNumber)) || "";
                (jr(e ? "Cargando capítulo " + e + "…" : "Cargando capítulo…"),
                  Qr(a, function (e) {
                    e
                      ? Gr(e)
                      : X.streamError || jr("Sin fuente de reproducción");
                  }));
              }
            };
          return (
            setTimeout(d, 2500),
            void Mn(a, function (e) {
              d();
            })
          );
        }
        if (a._portal) {
          var c = (t && (t.number || t.seriesNumber)) || "";
          return (
            jr(c ? "Cargando capítulo " + c + "…" : "Cargando capítulo…"),
            void Qr(a, function (e) {
              e ? Gr(e) : X.streamError || jr("Sin fuente de reproducción");
            })
          );
        }
        a.streamUrl && Gr(a.streamUrl);
      }
    }
  }
  function Kr(e, a) {
    Ce || lr();
    var i =
        !a ||
        !X.playerEpisode ||
        X.playerEpisode === a ||
        X.playerEpisode.id === a.id,
      n = "detail" === X.screen && xe && !!xe.src && X.playerItem === e && i;
    ((X.playerMode = "vod"),
      e && X.playerItem !== e && _n(),
      e && (X.playerItem = e),
      a && (X.playerEpisode = a),
      e && xn(e),
      (X.playerReturn = { screen: "detail", focus: X.focus }));
    var r = t("screen-player"),
      o = t("screen-detail");
    (r && (r.classList.remove("is-mini"), r.classList.add("is-active")),
      o && o.classList.remove("is-active"),
      (X.screen = "player"),
      Ce.classList.add("is-vod"),
      ao(),
      rt(Ce),
      vi(),
      n
        ? X.streamError || (Dr(), jr(""), $r())
        : Jr(X.playerItem, X.playerEpisode));
  }
  function Yr(e, t, a) {
    "vod" !== e || "detail" !== X.screen
      ? (Ce || lr(),
        "live" === e && jt(),
        (X.playerMode = e),
        t && X.playerItem !== t && _n(),
        (X.playerItem = t || null),
        (X.playerEpisode = a || null),
        "vod" === e && t && xn(t),
        (X.playerReturn = { screen: X.screen, focus: X.focus }),
        (X.channelsOpen = !1),
        we.classList.remove("is-active"),
        Se.classList.remove("is-active"),
        Ce.classList.toggle("is-vod", "vod" === e),
        ao(),
        lt("player"),
        rt(Ce),
        ao(),
        "vod" === e
          ? (vi(), Jr(X.playerItem, X.playerEpisode))
          : (pi(), to(F[X.channel])))
      : Kr(t, a);
  }
  var Zr = 0,
    eo = null;
  function to(e, t) {
    if (
      (eo && (clearTimeout(eo), (eo = null)),
      e || (e = F[X.channel]),
      e && (e.channelCode || e.streamUrl))
    ) {
      var a = function () {
        var t = ++Zr;
        (jr("Cargando señal " + (e.name || "") + "…"),
          P(
            "resolveLive",
            e.streamUrl
              ? { streamUrl: e.streamUrl }
              : { channelCode: e.channelCode },
            function (e, a) {
              if (t === Zr) {
                if (e || !a || !1 === a.returnValue)
                  return (
                    (X.streamError =
                      "No se pudo conectar con la señal" + (e ? ": " + e : "")),
                    void jr(X.streamError)
                  );
                D("live", a);
                var i = a.proxyPath || a.url;
                if (!i)
                  return (
                    (X.streamError = "Señal no disponible"),
                    void jr(X.streamError)
                  );
                (jr(""), pi(), Gr(i));
              }
            }
          ));
      };
      t ? a() : (eo = setTimeout(a, 180));
    }
  }
  function ao() {
    var e = "live" === X.playerMode,
      t = F[X.channel] || {},
      a = we.querySelector(".pi-index"),
      i = we.querySelector(".pi-name"),
      n = we.querySelector(".pi-date"),
      o = we.querySelector(".pi-range"),
      s = we.querySelector(".pi-now"),
      d = we.querySelector(".pi-next"),
      c = we.querySelector(".pi-uhd"),
      p = we.querySelector(".pi-logo");
    if (e)
      (Me && Me.classList.remove("is-active"),
        we && (we.style.display = ""),
        (a.style.display = "block"),
        (a.textContent = r(t.index || X.channel + 1)),
        (i.textContent = t.name || ""),
        (function () {
          var e = we.querySelector(".pi-namerow");
          if (!e) return;
          we.querySelector(".pi-index");
          var t = e.querySelector(".pi-name"),
            a = e.querySelector(".pi-uhd"),
            i = 165;
          ((e.style.position = "absolute"),
            (e.style.left = 367.5 + i + "px"),
            (e.style.top = "13.5px"),
            (e.style.width = "480px"),
            (e.style.height = "58px"),
            (e.style.display = "block"),
            (t.style.position = "absolute"),
            (t.style.left = "0px"),
            (t.style.top = "8px"),
            (t.style.width = "480px"),
            (t.style.height = "50px"),
            (t.style.lineHeight = "50px"),
            a &&
              ((a.style.left = t.offsetWidth + 30 + "px"),
              (a.style.top = "18.5px")));
        })(),
        (n.textContent = "Hoy"),
        (o.textContent = t.time || ""),
        (s.style.display = "block"),
        (s.textContent = t.now || "En vivo"),
        (d.style.display = t.next ? "block" : "none"),
        t.next && (d.textContent = "Siguiente: " + t.next),
        (c.style.display = t.uhd ? "block" : "none"),
        (p.style.display = "block"),
        p &&
          (t.logo
            ? (p.style.backgroundImage = "url(" + t.logo + ")")
            : (p.style.backgroundImage = "")));
    else {
      we && (we.classList.remove("is-active"), (we.style.display = "none"));
      var u = X.playerItem || l[0];
      if (Ee)
        if (x(u) && X.playerEpisode) {
          var v = X.playerEpisode.title || X.playerEpisode.name,
            f = X.playerEpisode.number || X.playerEpisode.seriesNumber,
            h = v || (f ? "Capítulo " + f : "");
          Ee.textContent = h ? u.title + " - " + h : u.title;
        } else Ee.textContent = u.title;
      (Ie &&
        (Ie.src =
          u.poster ||
          u.cover ||
          "assets/original/common/bg_placehoder_vertical.png"),
        oi(xe ? xe.currentTime : 0, xe ? xe.duration : 0));
    }
    for (var m in Xe)
      Xe.hasOwnProperty(m) &&
        Xe[m].classList.toggle("is-current", Xe[m]._channel === X.channel);
    io();
  }
  function io() {
    var e = we.querySelector(".pi-quality"),
      t = we.querySelector(".pi-scale"),
      a = we.querySelector(".pi-func");
    e &&
      t &&
      a &&
      ((e.style.left = "517.5px"),
      (t.style.left = e.offsetLeft + e.offsetWidth + 30 + "px"),
      (a.style.left = t.offsetLeft + t.offsetWidth + 30 + "px"));
  }
  function no() {
    if ("live" === X.playerMode) {
      ((X.channelsOpen = !0),
        Se.classList.add("is-active"),
        dr(),
        hr(X.channel),
        cr());
      var e = Xe[X.channel];
      if (e) {
        rt(e);
        var t = e.parentNode,
          a = 111 * X.channel;
        (a < t.scrollTop || a + 109.5 > t.scrollTop + t.clientHeight) &&
          (t.scrollTop = Math.max(0, a - 120));
      }
    }
  }
  function ro() {
    ((X.channelsOpen = !1),
      Se && Se.classList.remove("is-active"),
      "player" === X.screen && rt(Ce));
  }
  function oo() {
    var e = t("app");
    if (e) {
      var a = (function () {
          var e =
              window.innerWidth ||
              (document.documentElement &&
                document.documentElement.clientWidth) ||
              0,
            t =
              window.innerHeight ||
              (document.documentElement &&
                document.documentElement.clientHeight) ||
              0;
          (e && t) || ((e = 1920), (t = 1080));
          var a = Math.floor((screen && screen.width) || 0),
            i = Math.floor((screen && screen.height) || 0),
            n = e / t,
            r = a && i ? a / i : 0;
          return (
            a >= 2560 &&
              a >= 1.25 * e &&
              i >= 1.25 * t &&
              Math.abs(n - r) < 0.03 &&
              ((e = a), (t = i)),
            { w: e, h: t, panel: a > 0 && i > 0 ? { w: a, h: i } : null }
          );
        })(),
        i = a.w,
        n = a.h,
        r = Math.min(i / 1920, n / 1080),
        displayScale = 1;
      r *= displayScale;
      ((!isFinite(r) || r <= 0) && (r = 1), (r = Math.round(1e4 * r) / 1e4));
      var o = Math.max(0, Math.round((i - 1920 * r) / 2)),
        s = Math.max(0, Math.round((n - 1080 * r) / 2));
      ((e.style.left = o + "px"),
        (e.style.top = s + "px"),
        (e.style.webkitTransform = "scale(" + r + ")"),
        (e.style.transform = "scale(" + r + ")"),
        (window.__xuperViewport = {
          w: i,
          h: n,
          scale: r,
          uiScaleMode: Q && Q.uiScaleMode ? Q.uiScaleMode : "auto",
          panelW: a.panel ? a.panel.w : 0,
          panelH: a.panel ? a.panel.h : 0,
        }));
    }
  }
  function so() {
    (oo(),
      window.addEventListener("resize", oo, !1),
      window.addEventListener("orientationchange", oo, !1),
      document.addEventListener("visibilitychange", oo, !1),
      setTimeout(oo, 250),
      setTimeout(oo, 1200),
      setTimeout(oo, 3e3),
      document.addEventListener("keydown", ut, !1),
      document.addEventListener(
        "keyup",
        function (e) {
          (461 !== (e.keyCode || e.which) &&
            "Back" !== e.key &&
            "GoBack" !== e.key) ||
            ut(e);
        },
        !1
      ),
      window.addEventListener(
        "popstate",
        function () {
          ct();
        },
        !1
      ),
      document.addEventListener("click", function (e) {
        var t = n(e.target, ".focusable");
        t && (rt(t, !0), t._activate && t._activate());
      }));
    try {
      _a();
    } catch (e) {
      console.error("buildSearch error:", e);
    }
    try {
      window.webOS &&
        "function" == typeof window.webOS.deviceInfo &&
        window.webOS.deviceInfo(function (e) {
          if (e && (e.version || e.versionMajor || e.sdkVersion)) {
            var t = parseFloat(
              String(e.version || e.versionMajor || e.sdkVersion || "")
            );
            !isNaN(t) && t > 0 && (Tr = t);
          }
        });
    } catch (e) {}
    try {
      !(function () {
        if (I()) {
          var e = p.serviceId || "com.webosflux.xuptertv.fidelity.service";
          try {
            window.webOS.service.request("luna://" + e, {
              method: "keepAlive",
              parameters: { subscribe: !0 },
              resubscribe: !0,
              onSuccess: function () {},
              onFailure: function () {},
            });
          } catch (e) {}
          setInterval(function () {
            try {
              window.webOS.service.request("luna://" + e, {
                method: "heartbeat",
                parameters: {},
                onSuccess: function () {},
                onFailure: function () {},
              });
            } catch (e) {}
          }, 15e3);
        }
      })();
    } catch (e) {}
    try {
      P("prewarm", {}, function () {});
    } catch (e) {}
    var e, a;
    ((e = t("welcome-loading-img")),
      (a = 1),
      et && (clearInterval(et), (et = null)),
      tt && (clearTimeout(tt), (tt = null)),
      (tt = setTimeout(function () {
        vt();
      }, 4500)),
      (et = setInterval(function () {
        ++a > 16
          ? vt()
          : e &&
            (e.src =
              "assets/original/welcome/img_welcome_loading" + a + ".png");
      }, 250)));
    try {
      V();
    } catch (e) {
      console.error("loadVodCatalog error:", e);
    }
    try {
      Gt();
    } catch (e) {
      console.error("loadLiveChannels error:", e);
    }
    (setTimeout(function () {
      try {
        oa(!0);
      } catch (e) {}
    }, 6e3),
      (window.__xuper = {
        version: "4.34.4",
        state: X,
        vod: l,
        channels: F,
        api: v,
        portal: f,
        service: P,
        refreshPortal: q,
        reloadVod: V,
        skipWelcome: vt,
        show: function (e) {
          "home" === e
            ? vt()
            : "detail" === e
              ? ba(l[0])
              : "search" === e
                ? La()
                : "settings" === e
                  ? Ha()
                  : "player" === e
                    ? Yr("live")
                    : lt(e);
        },
        selectTab: function (e) {
          (vt(), bt(e, !0));
        },
        openDetail: function (e) {
          ba(l[e] || l[0]);
        },
        openSearch: La,
        openSettings: Ha,
        openPlayer: function (e, t) {
          Yr(e || "live", l[t] || null);
        },
        focus: function (e) {
          var t = "string" == typeof e ? document.querySelector(e) : e;
          t && rt(t);
        },
        key: function (e) {
          ut({ keyCode: e, preventDefault: function () {} });
        },
        search: function (e) {
          (La(), Aa(e));
        },
        settingsPanel: function (e) {
          (Ha(), Ua(e, !0));
        },
      }),
      (function () {
        var e = String(location.search || "").replace(/^\?/, "");
        if (!e) return;
        for (var t = {}, a = e.split("&"), i = 0; i < a.length; i++)
          if (a[i]) {
            var n = a[i].split("=");
            t[decodeURIComponent(n[0])] = decodeURIComponent(
              n.slice(1).join("=") || ""
            );
          }
        if (void 0 !== t.ch) {
          var r = parseInt(t.ch, 10) || 0;
          X.channel = Math.max(0, Math.min(F.length - 1, r));
        }
        var o = t.screen || "home";
        if ("welcome" === o) return;
        (vt(),
          void 0 !== t.tab
            ? bt(parseInt(t.tab, 10) || 0, !0)
            : (bt(0, !1), rt(ne)));
        "detail" === o
          ? ba(l[parseInt(t.vod, 10) || 0])
          : "search" === o
            ? (La(), t.q && Aa(t.q))
            : "settings" === o
              ? (Ha(), void 0 !== t.panel && Ua(parseInt(t.panel, 10) || 0, !0))
              : "player" === o &&
                (Yr(
                  "vod" === t.mode ? "vod" : "live",
                  l[parseInt(t.vod, 10) || 0]
                ),
                "1" === t.channels && no());
        if (t.focus) {
          var s = document.querySelector(t.focus);
          s && rt(s);
        }
      })());
  }
  function lo() {
    (zr(), Da());
  }
  (window.addEventListener("beforeunload", lo),
    window.addEventListener("unload", lo),
    document.addEventListener("visibilitychange", function () {
      document.hidden && lo();
    }),
    (window.onerror = function (e, t, a, i, n) {
      try {
        (console.error(
          "[XuperTV error] " + e + " at " + t + ":" + a + (i ? ":" + i : "")
        ),
          X && "welcome" === X.screen && vt());
      } catch (e) {}
      return !1;
    }),
    "loading" === document.readyState
      ? document.addEventListener("DOMContentLoaded", so)
      : so());
})();
