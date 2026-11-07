# Reglas críticas: reproducción, Modo Fluido y desbloqueo de red (DoH)

## 1. Reproducción y Modo Fluido (Zona Protegida)

La reproducción es una zona estrictamente protegida. No modificar, reemplazar,
simplificar ni eliminar código de reproducción salvo que el usuario diga explícitamente:
**"modificar reproducción"** o **"modificar Modo Fluido"**.

Para cambios visuales (menús, CSS, pantallas, foco, textos o diseño), editar
solamente los recursos visuales necesarios. No tocar estas rutas ni cambiar su
comportamiento:

- `webos/fidelity/js/app.js`: `streamMode`, `forceRelay`, `resolveSmooth`,
  `restartCurrentPlayback`, `playUrl`, seek y cambio de episodio.
- `webos/services/com.webosflux.xuptertv.fidelity.service/index.js`: rutas
  `resolve` y `resolveSmooth`, y la condición que llama `relay.register`.
- `webos/services/com.webosflux.xuptertv.fidelity.service/ffmpeg-relay.js`.
- `webos/services/com.webosflux.xuptertv.fidelity.service/ffmpeg`.

### Contrato obligatorio de reproducción:
- **Normal** usa el proxy directo (`proxy.baseUrl() + '/media/...'`).
- **Modo Fluido** usa obligatoriamente `resolveSmooth` y una URL local del relay:
  - Todas las versiones de webOS (1/2/3/3.5/4+): `http://127.0.0.1:8787/s/<token>.mp4`
    (MP4 fragmentado). Autorizado 2026-11-06 con "fMP4 como XuperMH": el
    pipeline nativo de webOS 1/2/3 no demuxa de forma fiable el MPEG-TS crudo y
    dejaba la pantalla en negro; XuperMH v2.31.1 usa siempre fMP4 en esas TVs.
    El relay conserva el soporte `/t/<token>.ts` por compatibilidad, pero la app
    ya no lo solicita. El contenedor lo elige la app (`_r()` en `app.js`,
    `container` en el payload de `resolveSmooth`) y nunca cambia el camino Normal.
- **Modo Fluido nunca debe quedar en negro**: si el `<video>` no llega a
  `readyState >= 2` en 15 s, `watchdog de arranque` (`relayStartWatch`) vuelve a
  Normal una sola vez por título con aviso al espectador.
- Al instalar o actualizar la IPK, comprobar que `ffmpeg` conserva permiso
  ejecutable (`chmod 755 .../service/ffmpeg`). El empaquetador de Windows puede perderlo.

---

## 2. Evasión de bloqueos de red y censura DNS (DoH y camuflaje SNI)

En varios países y proveedores de internet (por ejemplo Chile, Cable Éxito, Claro,
Movistar, etc.), los operadores secuestran el puerto UDP 53 con reglas de filtrado
e inyectan respuestas envenenadas para bloquear el catálogo y las CDNs de video.
La arquitectura anti-bloqueo se basa en cuatro pilares obligatorios que **JAMÁS
deben simplificarse, omitirse ni eliminarse**:

1. **Resolución DoH obligatoria y previa (`resolveHostIp`):**
   - En `proxy.js`, ninguna conexión hacia el CDN abre un socket sin tener la IP
     IPv4 literal obtenida por DoH (Cloudflare, Google, AdGuard, AliDNS, DNS.SB, NextDNS).
   - Node.js en webOS conecta directamente a la IP Anycast (ej. `66.225.197.106` o
     `104.18.30.197`) sin tocar jamás el resolver nativo del televisor ni el puerto
     UDP 53 del operador chileno o local.
   - La lista de resolutores en `dnsx.js` debe mantener múltiples proveedores Anycast
     independientes de distintas nubes y continentes (Asia, Europa, América) para
     evitar que un bloqueo por IP en el puerto 443 anule la resolución.

2. **Conexión transparente con SNI real y camuflaje de respaldo (CacheFly):**
   - En `proxy.js`, `mediaRequest` usa primero el protocolo original de la CDN (`http` o `https`)
     sin forzar elevación a TLS y con el hostname real en el SNI (`servername: host`).
   - Si el CDN es de CacheFly y la conexión falla por bloqueo DPI del operador
     (reset TCP / timeout) o responde 403/451, `forward` reintenta una sola vez
     forzando HTTPS con `servername: 'cachefly.net'` (el camuflaje de la 1.6.17,
     necesario en redes como Claro Argentina o ETB).
   - En `forward` se mantiene el reintento adaptativo: HTTP que falla por DPI
     reintenta en HTTPS, y HTTPS que falla por la pila TLS antigua de webOS 1/2/3
     reintenta en HTTP.
   - El camuflaje es solo un respaldo: una red que no bloquee el nombre real
     sigue usando SNI real y conexión transparente.

3. **Flujo Modo Fluido protegido en webOS:**
   - En `index.js`, `resolveStream` pre-resuelve la IP por DoH antes de registrar la ruta.
   - FFmpeg lee primero del proxy local en `127.0.0.1` (conserva el camuflaje SNI y
     los reintentos del CDN); si ese camino no emite, reintenta contra el CDN
     directo. Entrega MP4 fragmentado limpio al elemento `<video>`.

4. **Verificación de permisos ejecutables:**
   - El binario `ffmpeg` conserva modo `0755` dentro del paquete IPK (`tools/fix_ipk_modes.py`).

5. **Rescate por semillas (bloqueo regional `portal100024`):**
   - En `magis.js` el pool de semillas se cachea en `/tmp/xuper-seeds.json`, se
     filtra por `exp`, se marca como muerto lo que el portal responde
     `aaa100027`/`aaa100028` y se reintenta con otra semilla ante
     `portal100024`.
   - No reducir el rescate a una sola semilla aleatoria: en países bloqueados
     es la única salida y varias semillas del pool pueden estar caducadas.
   - Las semillas son sesiones prestadas del plugin de referencia
     (`analysis/kino-plugin-xuper/src/session.js`); no son credenciales de usuario.

---

## 3. Protocolo de comprobación obligatorio antes de entregar

Antes de entregar cualquier cambio que afecte la app, comprobar:

1. `node --check` de todos los archivos JavaScript modificados.
2. `node scratch/verify_agents_rule.js` (verificación automática de componentes).
3. Que el modo fluido siga enviando `forceRelay` y llame `resolveSmooth`.
4. Que el servicio siga registrando `resolveSmooth` y llame `relay.register`.
5. Que `proxy.js` mantenga la resolución previa `resolveHostIp`, el SNI real y el camuflaje de respaldo `cachefly.net`.
6. Que `dnsx.js` conserve el pool multirresolutor DoH en paralelo.
7. Que el binario `ffmpeg` conserve modo `0755` dentro de la IPK construida.
8. Que `services.json` declare `commands` exclusivamente con `"public": false` (y jamás `"public": true`, ver sección 4).
9. Que el autotest de `ffmpeg` siga diferido con `setTimeout` en `ffmpeg-relay.js`.
10. Que `magis.js` conserve el rescate por semillas (`portal100024`) con pool, expiración y marcas de semilla muerta.
11. Que ningún servicio declare una `function` dentro de un bloque (ver sección 5): webOS 3.x no carga el servicio.
12. Que `version.json` y los tags/releases de GitHub se publiquen obligatoriamente con el IPK (ver sección 6).
13. Que el modo fluido fMP4 se mantenga en todas las versiones con su watchdog anti-pantalla-negra.
14. Que TV en vivo mantenga favoritos (`liveFavorites`), botones de cabecera (`f-fav`, `f-all`, `f-srch`), tecla amarilla y foco al primer canal visible (ver sección 7).
15. Que el carrusel de catálogo mantenga rieles `.catalog-rail` y loop horizontal de retorno estilo Netflix (ver sección 7).

Si una tarea visual requiere tocar alguna de estas rutas o módulos protegidos,
detenerse y pedir autorización explícita al usuario antes de hacerlo.

---

## 4. Registro del servicio Luna (causa de "el servicio no arrancó" y "Unknown method")

En webOS, `services.json` define los métodos expuestos por el servicio.
- **Regla crítica de seguridad y bus:** Los métodos deben declararse con `"public": false`
  (comandos privados de la aplicación compañera dentro del mismo paquete).
- **Jamás declarar `"public": true`:** Si se declara `"public": true` sin permisos
  de plataforma ni roles ACG del sistema, `ls-hubd` en webOS 4+, 5+ y 6+ bloquea
  las llamadas con `Denied method call for category /` (causa histórica en `e30aa9e` y `4bb57f9`).
- **Por qué son obligatorios los `commands` con `"public": false` en webOS 3.x:**
  En webOS 1.x, 2.x y 3.x, `ls-hubd` genera su tabla estática de métodos a partir
  de `commands` en `services.json`. Si este bloque se elimina por completo, `ls-hubd`
  desconoce los métodos antes de levantar el proceso y rechaza de inmediato con
  `Unknown method "ping" for category "/"` (el fallo reportado en webOS 3.4.3).
  Al declararlos con `"public": false`, la aplicación del mismo paquete
  (`com.webosflux.xuptertv.fidelity`) tiene acceso total garantizado tanto en webOS 3
  como en webOS 4/5/6/22+.

Además, el autotest de `ffmpeg` no debe ejecutarse durante la carga del módulo:
en TVs de 1 GB (webOS 3.x) el arranque en frío más la copia de 31 MB a `/tmp`
pueden retrasar el primer `ping` más de 25 s y la app lo interpreta como
"el servicio no arrancó". Debe quedar diferido (`setTimeout(..., 4000)` en
`ffmpeg-relay.js`) para que el servicio responda primero a Luna.

El instalador (`tools/instalar-tv.ps1`) comprueba tras instalar que el servicio
exista y responde a `ping`; si no responde, indica desenchufar la TV 30 segundos.

---

## 5. Compatibilidad del JavaScript del servicio con V8 3.28 (webOS 3.x)

El servicio se ejecuta en el Node.js interno del televisor. webOS 3.x usa
**Node 0.12 / V8 3.28**, que en modo estricto (`'use strict'` en la cabecera de
cada archivo) **rechaza cualquier declaración de función dentro de un bloque**:

    SyntaxError: In strict mode code, functions can only be declared at top level
    or immediately within another function.

Una sola declaración de este tipo hace que `index.js` no se cargue, el servicio
no se registre y la app muestre "ping no respondió en 25 segundos (el servicio no
arrancó)". Los televisores nuevos (V8 moderno) lo aceptan, por eso el fallo solo
aparece en webOS 1/2/3.

Regla obligatoria en todos los `.js` del servicio (`index.js`, `netdiag.js`,
`magis.js`, `proxy.js`, `dnsx.js`, `ffmpeg-relay.js`, `ts-indexer.js`,
`upstream.js`):

    /* correcto */
    var doRequest = function (ipList, ipIndex) { ... };
    /* incorrecto dentro de if/try/for/catch/switch: */
    function doRequest(ipList, ipIndex) { ... }

Las funciones declaradas en el nivel superior del archivo o directamente dentro
de otra función siguen siendo válidas. El verificador
`scratch/verify_agents_rule.js` (comprobación 12) detecta declaraciones dentro de
bloques y el protocolo de la sección 3 exige que pase antes de entregar.

Además el servicio debe mantenerse en ES5 puro (sin `const`, `let`, `class`,
arrow functions, template strings, `Promise`, `Set`, `Map`, `.includes`,
`.startsWith`, `.endsWith`, parámetros por defecto ni `for...of`) y pasar:

    npx acorn@8 --ecma5 --silent <archivo>.js

Cuando se añada una función nueva dentro de un callback o un `try`, usar siempre
una expresión de función asignada a `var`.

Además, `index.js` carga los módulos con `loadModule()` (try/catch) y registra
`ping` con valores protegidos (`safeValue`). Si un módulo no se puede cargar en
el televisor, el servicio **igual responde a `ping`** e informa `loadErrors`
(módulo + mensaje) junto con `node` (versión real de Node.js de la TV). La app
muestra esa información en Diagnóstico → fila "Servicio XuperTV". El resto de
métodos afectados responde con el error exacto en lugar de quedarse sin
contestar, que es lo que produce "ping no respondió en 25 segundos".

---

## 6. Publicación obligatoria de tags y releases en GitHub (Regla permanente)

Para que los usuarios puedan actualizar la app vía OTA desde sus televisores o descargar la última versión de GitHub:
- Al incrementar la versión o compilar un release, es **OBLIGATORIO** actualizar `version.json` (versión, `ipkUrl`, sha256 del IPK generado, changelog y fecha), `currentVer` en `webos/fidelity/js/app.js`, y `appinfo.json`.
- Crear el tag de Git localmente y subirlo al repositorio remoto (`git tag -a vX.X.XX -m "..." && git push origin vX.X.XX`).
- Crear la Release en GitHub con el archivo `.ipk` compilado adjunto (`gh release create vX.X.XX dist/com.webosflux.xuptertv.fidelity_X.X.XX_all.ipk --title "..." --notes "..."`).
- **Excepción única:** SOLO se omitirá la subida del tag y la creación del release si el usuario indica explícitamente: **"no la subas"** o **"no subas el tag"**.

---

## 7. TV en Vivo (Favoritos, Navegación y Controles) y Carrusel Netflix (Zona Protegida)

Los controles de navegación de canales en vivo, el sistema de favoritos y el carrusel continuo de catálogo son zonas protegidas. **Ningún agente ni PR debe modificar, simplificar, reemplazar, desmantelar o eliminar este comportamiento ni su diseño visual**, salvo que el usuario dé autorización explícita diciendo:
**"modificar TV en vivo"**, **"modificar favoritos de TV"** o **"modificar carrusel"**.

### Contrato obligatorio de TV en Vivo:
1. **Sistema de Favoritos (`X.liveFavorites` / `Q.liveFavorites`):**
   - Cada canal posee su botón de estrella (`.pc-channel-fav` / `pc-fav-star`) que permite marcarlo o desmarcarlo como favorito.
   - La cabecera incluye el botón de filtro de favoritos (`.f-fav` / `channelFavorites`) que alterna `liveFavoritesOnly` y muestra aviso visual (*"★ Mostrando canales favoritos"* / *"Mostrando todos los canales"*).
   - Acceso rápido desde control remoto con la **tecla amarilla** (`ColorF2Yellow` / keycode 405) para añadir o quitar favoritos de forma inmediata.
   - El estado de favoritos se persiste entre sesiones.
2. **Barra de Acciones Dark Fidelity y Foco Estable:**
   - La barra de herramientas mantiene el orden canónico y diseño oscuro consistente con la barra lateral y Account: **Buscar**, **Filtrar**, **Favoritos** y **Todos** (`.live-fast`, `.pc-search`, `.pc-filter`, `.pc-fav`, `.pc-all`).
   - El botón **Todos** (`selectAllLiveChannels`) restaura la lista completa de canales sin forzar la apertura del modal de categorías.
   - **Estabilidad de foco:** Al aplicar filtros de categorías o búsquedas por texto, el foco del cursor debe posicionarse automáticamente en el primer canal visible (`visibleLiveIndexes()[0]`), impidiendo que el foco quede en el vacío o se descoloque la lista.
   - Al navegar verticalmente en la lista de canales, el foco no debe saltar bruscamente ni reordenar los elementos.

### Contrato obligatorio del Carrusel de Películas y Series (Estilo Netflix):
1. **Rieles horizontales de catálogo (`.catalog-rail`):**
   - Las filas de categorías populares, películas, series y crimen deben renderizarse en contenedores horizontales con scroll oculto (`.catalog-rail`), cargando todas las tarjetas correspondientes sin recortes arbitrarios.
2. **Loop y retorno fluido:**
   - Al navegar con la flecha derecha y llegar al último elemento visible de la fila, el carrusel debe volver suavemente al primer elemento (`rail.scrollLeft = 0; rt(rail.children[0]);`), permitiendo una navegación infinita idéntica a Netflix en lugar de bloquear el movimiento.


