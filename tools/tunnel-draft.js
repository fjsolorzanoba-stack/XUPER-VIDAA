/*
 * Application level tunnel for the webOS service.
 *
 * WHY
 * ---
 * DNS-over-HTTPS (dnsx.js) fixes a poisoned resolver, but it does nothing when
 * the carrier blocks the address itself or when the server only answers to
 * connections coming from another country.  On Android the usual answer is a
 * VPN; webOS does not let an installed app create a TUN interface without
 * root, so the app cannot build a system VPN.
 *
 * What it CAN do is send its own traffic (catalogue and video) through a
 * SOCKS5 or HTTP CONNECT proxy that exits somewhere else.  That is the same
 * effect the user sees with a "local VPN": one setting, saved on the TV, and
 * every request leaves through the tunnel.
 *
 * HOW
 * ---
 * Node 0.12 (webOS 4) cannot create a socket asynchronously inside an
 * http.Agent, so this module does not subclass the agent.  Instead, for every
 * target `host:port` it opens a tiny TCP relay on 127.0.0.1; the request is
 * pointed there, TLS keeps the real hostname for SNI and the original Host
 * header is restored.  Each relayed connection opens its own SOCKS5/CONNECT
 * session upstream, so the exit server resolves the name (the poisoned ISP
 * resolver never participates) and the carrier sees only the tunnel endpoint.
 *
 * Everything is off by default: with no configuration the service behaves
 * exactly as before (DoH + direct connection).
 *
 * ES5/CommonJS on purpose: webOS 4 ships Node.js 0.12 inside its services.
 */
'use strict';

var net = require('net');
var tls = require('tls');
var fs = require('fs');

/* /media/developer/temp is the only world-writable persistent directory the
   dev-mode service can reach; /tmp is the volatile fallback. */
var CONFIG_PATHS = [
  '/media/developer/temp/xuper-tunnel.json',
  '/tmp/xuper-tunnel.json'
];

var CONNECT_TIMEOUT = 12000;
var IDLE_MS = 10 * 60 * 1000;
var MAX_FORWARDS = 8;
var SWEEP_MS = 60 * 1000;

var config = { enabled: false, endpoints: [], user: '', pass: '' };
var forwards = {};      // "host:port" -> forwarder
var forwardCount = 0;
var lastGood = 0;
var sweeper = null;

function now() { return Date.now(); }

function log(text) {
  try { console.log('[xuper-tunnel] ' + text); } catch (eLog) { /* ignore */ }
}

function once(fn) {
  var called = false;
  return function () {
    if (called) { return; }
    called = true;
    return fn.apply(null, arguments);
  };
}

function copy(obj) {
  var out = {};
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) { out[k] = obj[k]; }
  }
  return out;
}

/* ------------------------------------------------------------- endpoints */
/* Accepts  socks5://host:port , http://host:port , https://host:port  or a
 * bare host:port (SOCKS5).  Several entries may be separated by comma,
 * semicolon, space or newline; they are tried in order. */
function parseEndpoint(text) {
  var str = String(text || '').replace(/^\s+|\s+$/g, '');
  if (!str) { return null; }

  var type = 'socks5';
  var secure = false;
  var match = /^(socks5h?|socks|http|https):\/\//i.exec(str);
  if (match) {
    var scheme = match[1].toLowerCase();
    str = str.slice(match[0].length);
    if (scheme === 'http' || scheme === 'https') {
      type = 'http';
      secure = (scheme === 'https');
    }
  }
  str = str.replace(/\/.*$/, '');

  var host = '';
  var port = 0;
  var lastColon = str.lastIndexOf(':');
  if (lastColon > 0 && str.indexOf(':') === lastColon) {
    host = str.slice(0, lastColon);
    port = parseInt(str.slice(lastColon + 1), 10);
  } else {
    host = str;
  }
  host = host.replace(/^\[|\]$/g, '');
  if (!host) { return null; }
  if (!(port > 0 && port < 65536)) {
    port = type === 'socks5' ? 1080 : 8080;
  }
  return { type: type, host: host, port: port, secure: secure };
}

function parseEndpoints(value) {
  var list = [];
  if (!value) { return list; }
  var raw = value;
  if (typeof raw === 'string') { raw = raw.split(/[\s,;]+/); }
  if (!raw.length && typeof value === 'string') { raw = [value]; }
  for (var i = 0; i < raw.length; i++) {
    var ep = parseEndpoint(raw[i]);
    if (!ep) { continue; }
    var duplicate = false;
    for (var j = 0; j < list.length; j++) {
      if (list[j].type === ep.type && list[j].host === ep.host && list[j].port === ep.port) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) { list.push(ep); }
  }
  return list;
}

function endpointText(ep) {
  if (!ep) { return ''; }
  return (ep.secure ? 'https://' : ep.type + '://') + ep.host + ':' + ep.port;
}

function endpointList() {
  var out = [];
  for (var i = 0; i < config.endpoints.length; i++) {
    out.push(endpointText(config.endpoints[i]));
  }
  return out;
}

/* ------------------------------------------------------------ persistence */
function configPath() {
  for (var i = 0; i < CONFIG_PATHS.length; i++) {
    try {
      fs.writeFileSync(CONFIG_PATHS[i] + '.tmp', '{}');
      try { fs.unlinkSync(CONFIG_PATHS[i] + '.tmp'); } catch (eUnlink) { /* ignore */ }
      return CONFIG_PATHS[i];
    } catch (eProbe) { /* try the next one */ }
  }
  return '';
}

function load() {
  for (var i = 0; i < CONFIG_PATHS.length; i++) {
    var raw;
    try {
      raw = fs.readFileSync(CONFIG_PATHS[i], 'utf8');
    } catch (eRead) { continue; }
    var data;
    try { data = JSON.parse(raw); } catch (eParse) { continue; }
    if (!data || typeof data !== 'object') { continue; }
    config.enabled = data.enabled === true;
    config.endpoints = parseEndpoints(data.endpoints || data.endpoint || '');
    config.user = String(data.user || '');
    config.pass = String(data.pass || '');
    log('config cargada de ' + CONFIG_PATHS[i] + ' (' + config.endpoints.length + ' servidor/es)');
    return true;
  }
  return false;
}

function save() {
  var data = {
    enabled: !!config.enabled,
    endpoints: endpointList(),
    user: config.user,
    pass: config.pass
  };
  var body = JSON.stringify(data);
  for (var i = 0; i < CONFIG_PATHS.length; i++) {
    try {
      fs.writeFileSync(CONFIG_PATHS[i], body);
      return CONFIG_PATHS[i];
    } catch (eWrite) { /* try the next one */ }
  }
  return '';
}

/* ------------------------------------------------------------- transports */
/* Minimal fixed-length reader: the SOCKS5 exchange is a sequence of binary
 * fields and mixing it with 'data' events gets unreadable fast. */
function reader(socket) {
  var buffer = new Buffer(0);
  var waiting = null;

  function pump() {
    if (!waiting || buffer.length < waiting.size) { return; }
    var take = buffer.slice(0, waiting.size);
    buffer = buffer.slice(waiting.size);
    var pending = waiting;
    waiting = null;
    pending.cb(take);
  }

  socket.on('data', function (chunk) {
    buffer = Buffer.concat([buffer, chunk]);
    pump();
  });

  return {
    read: function (size, cb) {
      waiting = { size: size, cb: cb };
      pump();
    }
  };
}

function dialProxy(ep, cb) {
  var done = once(cb);
  var socket = null;
  var settled = false;

  function ready() {
    if (settled) { return; }
    settled = true;
    try { socket.setTimeout(0); } catch (eT) { /* ignore */ }
    try { socket.setNoDelay(true); } catch (eN) { /* ignore */ }
    done(null, socket);
  }

  try {
    if (ep.secure) {
      socket = tls.connect({
        host: ep.host,
        port: ep.port,
        servername: ep.host,
        rejectUnauthorized: false
      }, ready);
    } else {
      socket = net.connect({ host: ep.host, port: ep.port }, ready);
    }
  } catch (eConnect) {
    return done(eConnect);
  }

  socket.setTimeout(CONNECT_TIMEOUT, function () {
    if (settled) { return; }
    settled = true;
    try { socket.destroy(); } catch (eD) { /* ignore */ }
    done(new Error('tiempo agotado al conectar con ' + ep.host + ':' + ep.port));
  });
  socket.on('error', function (err) {
    if (settled) { return; }
    settled = true;
    done(err);
  });
}

var SOCKS_ERRORS = {
  1: 'fallo general del servidor',
  2: 'conexion no permitida por las reglas del servidor',
  3: 'red inalcanzable desde el servidor',
  4: 'servidor inalcanzable desde el servidor',
  5: 'conexion rechazada por el destino',
  6: 'tiempo agotado en el destino',
  7: 'comando no soportado',
  8: 'tipo de direccion no soportado'
};

function socks5(ep, host, port, cb) {
  dialProxy(ep, function (err, socket) {
    if (err) { return cb(err); }

    var done = once(function (e, s) {
      if (e) {
        try { socket.destroy(); } catch (eD) { /* ignore */ }
      }
      cb(e, s);
    });
    var input = reader(socket);

    var greeting = config.user
      ? new Buffer([0x05, 0x02, 0x00, 0x02])
      : new Buffer([0x05, 0x01, 0x00]);
    socket.write(greeting);

    input.read(2, function (hello) {
      if (hello[0] !== 0x05) { return done(new Error('el servidor no habla SOCKS5')); }
      if (hello[1] === 0xff) { return done(new Error('el servidor rechazo los metodos de acceso')); }
      if (hello[1] === 0x02) { return authenticate(); }
      return request();
    });

    function authenticate() {
      var user = new Buffer(config.user, 'utf8');
      var pass = new Buffer(config.pass, 'utf8');
      var auth = new Buffer(3 + user.length + pass.length);
      auth[0] = 0x01;
      auth[1] = user.length;
      user.copy(auth, 2);
      auth[2 + user.length] = pass.length;
      pass.copy(auth, 3 + user.length);
      socket.write(auth);
      input.read(2, function (res) {
        if (res[1] !== 0x00) { return done(new Error('usuario o clave del tunel rechazados')); }
        request();
      });
    }

    function request() {
      var name = new Buffer(String(host), 'utf8');
      var ipv4 = net.isIPv4(host);
      if (!ipv4 && name.length > 255) { return done(new Error('nombre de destino demasiado largo')); }
      var header = new Buffer(ipv4 ? 4 + 4 + 2 : 4 + 1 + name.length + 2);
      header[0] = 0x05;
      header[1] = 0x01;
      header[2] = 0x00;
      header[3] = ipv4 ? 0x01 : 0x03;
      if (ipv4) {
        var octets = String(host).split('.');
        for (var i = 0; i < 4; i++) { header[4 + i] = parseInt(octets[i], 10) & 0xff; }
        header.writeUInt16BE(port, 8);
      } else {
        header[4] = name.length;
        name.copy(header, 5);
        header.writeUInt16BE(port, 5 + name.length);
      }
      socket.write(header);

      input.read(4, function (reply) {
        if (reply[0] !== 0x05) { return done(new Error('respuesta SOCKS no valida')); }
        if (reply[1] !== 0x00) {
          return done(new Error(SOCKS_ERRORS[reply[1]] || ('el tunel no pudo abrir la conexion (' + reply[1] + ')')));
        }
        var atyp = reply[3];
        if (atyp === 0x01) { return input.read(4 + 2, function () { done(null, socket); }); }
        if (atyp === 0x04) { return input.read(16 + 2, function () { done(null, socket); }); }
        input.read(1, function (len) {
          input.read((len[0] & 0xff) + 2, function () { done(null, socket); });
        });
      });
    }
  });
}

function httpConnect(ep, host, port, cb) {
  dialProxy(ep, function (err, socket) {
    if (err) { return cb(err); }

    var done = once(function (e, s) {
      if (e) {
        try { socket.destroy(); } catch (eD) { /* ignore */ }
      }
      cb(e, s);
    });

    var head = 'CONNECT ' + host + ':' + port + ' HTTP/1.1\r\n' +
      'Host: ' + host + ':' + port + '\r\n' +
      'Proxy-Connection: keep-alive\r\n';
    if (config.user) {
      head += 'Proxy-Authorization: Basic ' +
        new Buffer(config.user + ':' + config.pass, 'utf8').toString('base64') + '\r\n';
    }
    head += '\r\n';
    socket.write(head);

    var buffer = new Buffer(0);

    function onData(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      var end = buffer.indexOf('\r\n\r\n');
      if (end === -1) {
        if (buffer.length > 16384) {
          socket.removeListener('data', onData);
          return done(new Error('respuesta no valida del proxy'));
        }
        return;
      }
      socket.removeListener('data', onData);
      var text = buffer.slice(0, end).toString('utf8');
      var rest = buffer.slice(end + 4);
      var status = parseInt((/^HTTP\/1\.[01] (\d{3})/.exec(text) || [])[1], 10) || 0;
      if (status !== 200) {
        return done(new Error('el proxy respondio ' + (status || 'sin codigo') + ' al abrir el tunel'));
      }
      if (rest.length) {
        try { socket.unshift(rest); } catch (eUnshift) { /* ignore */ }
      }
      done(null, socket);
    }

    socket.on('data', onData);
  });
}

/* Open a tunnelled connection to host:port, trying every configured server. */
function connect(host, port, cb) {
  var list = config.endpoints;
  if (!list.length) { return cb(new Error('tunel sin servidor configurado')); }
  var done = once(cb);
  var start = lastGood % list.length;
  var attempts = 0;
  var errors = [];

  function attempt(index) {
    var ep = list[index];
    var run = ep.type === 'socks5' ? socks5 : httpConnect;
    run(ep, host, port, function (err, socket) {
      if (err) {
        errors.push(endpointText(ep) + ': ' + err.message);
        attempts++;
        if (attempts < list.length) { return attempt((index + 1) % list.length); }
        return done(new Error(errors.join(' | ')));
      }
      lastGood = index;
      done(null, socket);
    });
  }

  attempt(start);
}

/* -------------------------------------------------------------- forwarders */
function isLocal(host) {
  var h = String(host || '').toLowerCase();
  return !h || h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '0.0.0.0';
}

function dropForward(f) {
  if (!f) { return; }
  delete forwards[f.key];
  if (forwardCount > 0) { forwardCount--; }
  try { f.server.close(); } catch (eClose) { /* ignore */ }
  for (var i = 0; i < f.clients.length; i++) {
    try { f.clients[i].destroy(); } catch (eDestroy) { /* ignore */ }
  }
  f.clients = [];
}

function failForward(f, err) {
  var waiters = f.waiters || [];
  f.waiters = [];
  dropForward(f);
  log('no se pudo abrir el relevo local: ' + (err && err.message));
  for (var i = 0; i < waiters.length; i++) { waiters[i](err); }
}

function relay(f, client) {
  client.setNoDelay(true);
  f.clients.push(client);

  connect(f.host, f.port, function (err, upstream) {
    if (err) {
      log('tunel ' + f.key + ': ' + err.message);
      try { client.destroy(); } catch (eC) { /* ignore */ }
      return;
    }
    try { upstream.setNoDelay(true); } catch (eN) { /* ignore */ }
    f.at = now();

    var closed = false;
    function shutdown() {
      if (closed) { return; }
      closed = true;
      var index = f.clients.indexOf(client);
      if (index !== -1) { f.clients.splice(index, 1); }
      try { client.destroy(); } catch (e1) { /* ignore */ }
      try { upstream.destroy(); } catch (e2) { /* ignore */ }
    }

    client.on('error', shutdown);
    upstream.on('error', shutdown);
    client.on('close', shutdown);
    upstream.on('close', shutdown);

    client.pipe(upstream);
    upstream.pipe(client);
  });
}

function pruneOldest() {
  var oldestKey = '';
  var oldestAt = 0;
  for (var key in forwards) {
    if (!Object.prototype.hasOwnProperty.call(forwards, key)) { continue; }
    var f = forwards[key];
    if (f.clients.length) { continue; }
    if (!oldestKey || f.at < oldestAt) { oldestKey = key; oldestAt = f.at; }
  }
  if (oldestKey) { dropForward(forwards[oldestKey]); }
}

function sweep() {
  var cutoff = now() - IDLE_MS;
  for (var key in forwards) {
    if (!Object.prototype.hasOwnProperty.call(forwards, key)) { continue; }
    var f = forwards[key];
    if (!f.clients.length && f.at < cutoff) { dropForward(f); }
  }
}

/* route(host, port, cb) -> cb(null, {port}) to use instead of the real host,
 * or cb(null, null) when the tunnel is off/unavailable. */
function route(host, port, cb) {
  if (!config.enabled || !config.endpoints.length || isLocal(host)) {
    return cb(null, null);
  }
  port = Number(port) || 443;
  var key = host + ':' + port;
  var existing = forwards[key];
  if (existing) {
    existing.at = now();
    if (existing.local) { return cb(null, { port: existing.local }); }
    existing.waiters.push(cb);
    return;
  }

  if (forwardCount >= MAX_FORWARDS) { pruneOldest(); }

  var f = {
    key: key,
    host: host,
    port: port,
    local: 0,
    waiters: [cb],
    clients: [],
    at: now(),
    server: null
  };
  forwards[key] = f;
  forwardCount++;

  f.server = net.createServer(function (client) { relay(f, client); });
  f.server.on('error', function (err) { failForward(f, err); });
  f.server.listen(0, '127.0.0.1', function () {
    var address = f.server.address();
    f.local = address && address.port;
    var waiters = f.waiters;
    f.waiters = [];
    for (var i = 0; i < waiters.length; i++) { waiters[i](null, { port: f.local }); }
    log('relevo ' + key + ' en 127.0.0.1:' + f.local);
  });
}

function closeAll() {
  for (var key in forwards) {
    if (Object.prototype.hasOwnProperty.call(forwards, key)) { dropForward(forwards[key]); }
  }
  forwards = {};
  forwardCount = 0;
}

/* ---------------------------------------------------------------- commands */
function status() {
  var ep = config.endpoints[lastGood % config.endpoints.length] || config.endpoints[0] || null;
  return {
    enabled: !!config.enabled,
    configured: config.endpoints.length > 0,
    endpoint: endpointText(ep),
    endpoints: endpointList(),
    auth: !!config.user,
    forwards: forwardCount,
    file: savePath()
  };
}

function savePath() {
  for (var i = 0; i < CONFIG_PATHS.length; i++) {
    try {
      if (fs.statSync(CONFIG_PATHS[i]).isFile()) { return CONFIG_PATHS[i]; }
    } catch (eStat) { /* ignore */ }
  }
  return '';
}

/* configure({enabled, endpoints, user, pass, action}) -> status
 * Only the fields present in the payload are changed, so the TV UI can flip
 * the switch without repeating the server address. */
function configure(patch) {
  patch = patch || {};
  var changed = false;

  if (patch.endpoints !== undefined || patch.endpoint !== undefined) {
    var next = parseEndpoints(patch.endpoints !== undefined ? patch.endpoints : patch.endpoint);
    config.endpoints = next;
    lastGood = 0;
    changed = true;
  }
  if (patch.user !== undefined) { config.user = String(patch.user || ''); changed = true; }
  if (patch.pass !== undefined) { config.pass = String(patch.pass || ''); changed = true; }
  if (patch.enabled !== undefined) {
    var on = patch.enabled === true || patch.enabled === 'true' || patch.enabled === 1 || patch.enabled === '1';
    if (on !== config.enabled) { changed = true; }
    config.enabled = on;
  }

  if (changed) {
    closeAll();
    var file = save();
    log('configuracion guardada en ' + (file || 'memoria') + ' | activo=' + config.enabled +
      ' | ' + endpointList().join(', '));
  }
  return status();
}

/* probe(host, port, cb) -> { ok, ms, endpoint, error } through the tunnel */
function probe(host, port, cb) {
  var t0 = now();
  if (!config.endpoints.length) {
    return cb(null, { ok: false, ms: 0, endpoint: '', error: 'sin servidor configurado' });
  }
  connect(host, Number(port) || 443, function (err, socket) {
    if (err) {
      return cb(null, {
        ok: false,
        ms: now() - t0,
        endpoint: endpointText(config.endpoints[lastGood % config.endpoints.length]),
        error: err.message
      });
    }
    try { socket.destroy(); } catch (eDestroy) { /* ignore */ }
    cb(null, {
      ok: true,
      ms: now() - t0,
      endpoint: endpointText(config.endpoints[lastGood % config.endpoints.length]),
      error: ''
    });
  });
}

/* -------------------------------------------------------------- lifecycle */
load();

sweeper = setInterval(sweep, SWEEP_MS);
if (sweeper && typeof sweeper.unref === 'function') { sweeper.unref(); }

module.exports = {
  route: route,
  connect: connect,
  configure: configure,
  status: status,
  probe: probe,
  closeAll: closeAll,
  enabled: function () { return !!(config.enabled && config.endpoints.length); },
  endpoints: function () { return endpointList(); },
  parseEndpoints: parseEndpoints
};
