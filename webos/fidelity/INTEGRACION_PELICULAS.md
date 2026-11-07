# Integración de películas (catálogo VOD)

Este documento describe cómo el port carga el catálogo de películas, qué
contrato acepta y qué límites tiene. Está escrito para que puedas conectar un
catálogo propio autorizado sin tocar el código de las pantallas.

> **Regla de oro:** el port no extrae tokens de sesión de Android, no descifra
> TLS y no elude autenticación ni DRM. Solo consume un catálogo que tú
> controles (archivo local o backend autorizado).

---

## 1. Qué funciona hoy

El pipeline completo está implementado y verificado en el navegador:

```
data/catalog.js  ->  loadVodCatalog()  ->  VOD[]  ->  Inicio / Detalle / Búsqueda / Reproductor
```

- `config/api.js` arranca en `mode: 'catalog'`, `useBundledCatalog: true` y
  `baseUrl: ''`.
- `data/catalog.js` aporta **6 películas abiertas** (dominio público / Creative
  Commons) con póster local y `streamUrl` reproducible.
- El catálogo se normaliza y se reparte por secciones (`destacado`, `pelicula`,
  `serie`, `gratis`, `infantil`, `uhd`).
- Inicio, Detalle, Búsqueda y el reproductor VOD consumen `VOD[]`.
- El reproductor VOD usa un `<video>` HTML5 real con `streamUrl`.
- Si configuras un backend y falla (red, CORS, timeout, JSON inválido o
  respuesta sin películas), se cae al catálogo local y la interfaz no queda
  vacía.

Verificación rápida en la consola del navegador:

```js
window.__xuper.vod.length          // 6 con el catálogo incluido
window.__xuper.api                 // { loading, source, error }
window.__xuper.api.source          // 'bundled' | 'api' | 'bundled-fallback'
window.__xuper.reloadVod()         // vuelve a cargar el catálogo
```

Capturas de referencia del pipeline: `shots/home-featured.png`,
`shots/detail.png`, `shots/player-vod.png`.

---

## 2. Catálogo incluido (muestra)

Las 6 películas son material abierto, **no** contenido de XuperTV. Sirven para
probar el pipeline, no para afirmar paridad de catálogo.

| Título | Año | Sección | Fuente |
| --- | --- | --- | --- |
| Big Buck Bunny | 2008 | infantil, pelicula | `media.w3.org` (Blender, CC) |
| Sintel | 2010 | pelicula | `archive.org` (Blender, CC) |
| Elephants Dream | 2006 | pelicula | `archive.org` (Blender, CC) |
| Tears of Steel | 2012 | uhd, pelicula | `archive.org` (Blender, CC) |
| El maquinista de la General | 1926 | gratis, pelicula | `archive.org` (dominio público) |
| Luna nueva (His Girl Friday) | 1940 | gratis, pelicula | `archive.org` (dominio público) |

Los pósteres viven en `assets/catalog/` (400 px de ancho). Los `streamUrl`
apuntan a MP4 progresivos; `archive.org` y `media.w3.org` respondieron `206`
en las pruebas. La reproducción real depende de la red y del soporte de códec
del televisor.

Para sustituir la muestra por tu catálogo:

1. Edita `data/catalog.js` (misma forma de `items`), **o**
2. Apunta `config/api.js` a tu backend (siguiente sección).

No hace falta tocar `js/app.js`.

---

## 3. Contrato de configuración (`config/api.js`)

```js
window.XUPERTV_API = {
  enabled: true,
  mode: 'catalog',              // 'catalog' | 'xuper'

  useBundledCatalog: true,      // fallback local si no hay URL o falla

  baseUrl: '',                  // p. ej. 'https://mi-backend.example'
  catalogUrl: '',               // URL completa; tiene prioridad sobre baseUrl+catalogPath
  catalogPath: '/api/portalCore/getHome',
  searchUrl: '',
  searchPath: '/api/portalCore/v3/searchByName',
  detailUrl: '',
  detailPath: '/api/portalCore/v3/getProgram',

  session: {                    // solo lo usa mode:'xuper'
    userId: '', userToken: '', portalCode: '',
    homePageCode: '', version: '4.34.4'
  },

  imageBaseUrl: '',             // prefijo para pósteres/fondos relativos
  headers: {},                  // cabeceras extra (no subas secretos al repo)
  timeoutMs: 10000
};
```

Reglas de resolución de URL:

- Si existe `catalogUrl`, se usa tal cual.
- Si no, se concatena `baseUrl` + `catalogPath`.
- Lo mismo para `searchUrl`/`searchPath` y `detailUrl`/`detailPath`.
- `{query}` en la URL de búsqueda se sustituye por el texto codificado.
- `{id}` en la URL de detalle se sustituye por el id codificado.

Método HTTP:

- `mode: 'catalog'` → `GET`.
- `mode: 'xuper'` → `POST` con `Content-Type: application/json` y el cuerpo de
  sesión que construye `xuperPayload()`. **No** se envía ninguna credencial de
  Android.

Transporte: `XMLHttpRequest` (no `fetch`) para conservar Chromium 53.

---

## 4. Forma de la respuesta

La respuesta puede ser:

- un array de películas, o
- un objeto que contenga el array en `items`, `movies`, `results`,
  `recommendList`, `movieList`, `totalMovieList`, `programList` o `data`
  (también anidado).

Cada elemento se normaliza con estos alias:

| Dato | Campos aceptados |
| --- | --- |
| id | `id`, `vodId`, `programId`, `program_id`, `tmdb_id` |
| título | `title`, `name`, `programName`, `programTitle`, `original_title` |
| sección | `category`, `section`, `collection`, `homeSection` |
| puntuación | `score`, `vote_average`, `rating`, `movieRate`, `programScore` |
| año | `year`, `release_year`, `programYear`, `release_date` (4 primeros) |
| duración | `duration`, `runtime`, `runtimeMinutes` (número = minutos) |
| géneros | `genres`, `genre` (array o string separado por comas) |
| director | `director` |
| actores | `actors`, `cast` |
| sinopsis | `synopsis`, `overview`, `description`, `programUpdateContent` |
| tipo | `kind`, `type`, `media_type` |
| póster | `posterUrl`, `poster_url`, `poster`, `poster_path`, `image`, `imageUrl`, `cover`, `coverUrl`, `programPoster`, `programImage` |
| fondo | `backdropUrl`, `backdrop_url`, `backdrop`, `backdrop_path` |
| stream | `streamUrl`, `stream_url` |

`category` admite una lista separada por comas, por ejemplo
`"pelicula,gratis"`. Secciones reconocidas: `destacado`, `pelicula`, `serie`,
`gratis`, `infantil`, `uhd`.

Los pósteres relativos se resuelven contra `imageBaseUrl`. Si no hay póster o
falla la carga, se muestra el placeholder original de la APK
(`bg_placehoder_vertical.png`), no un hueco negro.

---

## 5. Backend autorizado (ejemplo)

```js
window.XUPERTV_API = {
  enabled: true,
  mode: 'catalog',
  useBundledCatalog: false,
  baseUrl: 'https://mi-backend.example',
  catalogPath: '/v1/catalog',
  detailPath: '/v1/items/{id}',
  searchPath: '/v1/search?q={query}',
  imageBaseUrl: 'https://cdn.example/posters/',
  headers: { 'X-Client': 'webos-xuper-port' },
  timeoutMs: 8000
};
```

El backend debe:

- responder JSON,
- permitir CORS desde el origen de la app webOS
  (`Access-Control-Allow-Origin`),
- servir pósteres por HTTPS (o por el mismo origen),
- devolver `streamUrl` reproducibles por el televisor (MP4/HLS según soporte).

Si el backend exige autenticación, usa un **proxy propio de corta vida** o una
configuración local que no se distribuya. No pegues tokens de Android en este
repositorio.

---

## 6. Modo `xuper` (documentado, no operativo)

`mode: 'xuper'` existe para dejar claro dónde iría una sesión **emitida por el
proveedor para este cliente**. Requiere `userId`, `userToken` y `portalCode`
válidos. Sin ellos, `loadVodCatalog()` no hace la petición y deja
`window.__xuper.api.error` con el motivo.

Lo que **no** hace y no se va a implementar:

- leer tokens/sesiones del APK o de un dispositivo Android,
- interceptar TLS para recuperar el host o la sesión,
- reutilizar cookies/credenciales de otra app,
- saltarse DRM, geobloqueo o control parental.

Aunque se rellenara la sesión, el backend de XuperTV valida el terminal y el
cliente; un port webOS no está garantizado como cliente aceptado. Ese acuerdo
es un requisito externo, no una tarea de este repositorio.

---

## 7. Detalle y búsqueda

- **Detalle:** al abrir una ficha se llama a `detailPath` con `{id}` si está
  configurado. La respuesta puede ser un objeto o una colección; los campos que
  falten conservan el valor del catálogo.
- **Búsqueda:** primero se filtra localmente sobre `VOD[]` (búsqueda inmediata
  y offline). Si hay `searchPath`/`searchUrl`, la respuesta remota reemplaza el
  resultado cuando llega.
- **Error de detalle/búsqueda:** no rompe la pantalla; se mantiene el dato del
  catálogo o el resultado local.

---

## 8. Reproductor VOD

- `openPlayer('vod', item)` crea un `<video>` real y le asigna `streamUrl`.
- Mientras hay fotograma, se oculta el placeholder; si falla, se restaura.
- La barra inferior del reproductor VOD **reutiliza la barra de TV en vivo**
  como aproximación documentada. La barra real de la APK es `MFInfoBar`
  (`layout_mf_infobar.xml`) y todavía no está reconstruida; ver
  `DIFERENCIAS_PENDIENTES.md`.
- No se fuerza ningún códec ni DRM. El título se resuelve en vivo con
  `v10/startPlayVOD` + `v14/getSlbInfo` y se sirve por el proxy local con las
  cabeceras `Content-Auth`/`Content-License`.
- **Modo fluido (selector por título, por defecto `No`):**
  - `No`: reproducción directa del TS/MP4 del portal. Inicio rápido, duración y
    seek nativos. Es el camino correcto para H.264 y para los HEVC que ya van
    fluidos.
  - `Sí`: el servicio lanza FFmpeg y remuxea el TS a MP4 fragmentado
    (`-c copy`, HEVC/AAC intactos, `hvc1`, `frag_keyframe+empty_moov+
    default_base_moof`). El TV reproduce el MP4 con su pipeline estable. El
    seek reinicia FFmpeg desde el segundo elegido, con debounce y un solo seek
    en vuelo; hay una pantalla negra breve por el stream por pipe.
  - El MP4 fragmentado no declara duración total: la interfaz usa la del
    catálogo y muestra `--:--:--` cuando el portal la devuelve vacía.

---

## 9. Cómo verificar en 3 minutos

```powershell
cd webos\fidelity
python -m http.server 8899 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8899/index.html` y comprueba:

1. Inicio muestra pósteres reales del catálogo (no placeholders).
2. `?screen=detail&vod=1` abre *Sintel* con sinopsis y botones.
3. `?screen=search&q=sintel` devuelve *Sintel*.
4. `?screen=player&mode=vod&vod=1` carga el MP4 en el `<video>`.
5. En consola: `window.__xuper.api.source === 'bundled'`.

Para probar tu backend, cambia `config/api.js`, recarga y verifica
`window.__xuper.api.source === 'api'`. Si ves `'bundled-fallback'`, revisa
`window.__xuper.api.error` (CORS, 404, timeout o JSON inválido).

---

## 10. Límites explícitos

- El catálogo real **sí** está integrado: snapshot de 610 ítems en
  `data/portal.js` y refresco en vivo de las raíces del portal mediante el
  servicio. Búsqueda, detalle y resolución de reproducción son siempre en vivo.
- **No** se afirma paridad total de catálogo ni de orden de secciones: eso lo
  define el backend y puede cambiar sin aviso.
- Probado en el LG 43LM6300PDB (webOS 4.10.0): búsqueda real, detalle con
  episodios y reproducción directa y en modo fluido. HLS live **no** probado:
  los canales de TV son marcadores.
- El IPK `dist/com.webosflux.xuptertv.fidelity_1.4.1_all.ipk` incluye app,
  servicio y FFmpeg, y se instala en un paso.
- La muestra local demuestra el pipeline, no la disponibilidad permanente de
  títulos concretos de XuperTV.
