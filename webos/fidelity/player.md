# Reproductor — estado real

## 1. Reproductor de la APK (análisis estático)

- `tv.danmaku.ijk.media.player.widget.IjkVideoView` (81 métodos):
  `setVideoURI(Uri)`, `setVideoURI(Uri, Map)`, `setVideoPath(String)`,
  `setMediaController`, tracks, render Surface/TextureView.
- `tv.danmaku.ijk.media.player.IjkMediaPlayer` (144 métodos):
  `setDataSource(Context, Uri, Map)`, `setDataSource(String)`,
  `setOption(int, String, *)` (`OPT_CATEGORY_PLAYER/FORMAT/CODEC/SWS`),
  `prepareAsync()`, `start()`, `seekTo()`, nativo vía
  `libijkplayer.so` / `libijkffmpeg.so` / `libijksdl.so`.
- Wrappers `yc.a`, `yc.e`, `yc.e.h/j`, `yc.h`, `yc.h.m`.
- `LocalPlayActivity` usa `IjkVideoView` directamente; live/VOD pasan por
  wrappers.
- Sin clases MediaDrm / Widevine / ExoPlayer / Media3 / VLC detectadas.

## 2. Reproductor del port

### Live

- Barra: `layout_live_infobar.xml`.
- Superficie: `img_thubnail_default.png` con velo oscuro cuando no hay stream.
- Controles: menú, calidad, escala, función y acciones (incluye cambio de
  reproductor, favorito, etc.).
- Panel de canales: `layout_live_player_controller.xml` / `frag_live_channel`.

### VOD

- `<video>` HTML5 real con `streamUrl` del catálogo.
- Mientras hay fotograma se oculta el placeholder; si falla, se restaura.
- Se ocultan `pi-now` y `pi-next`.
- **La barra inferior reutiliza la de live como aproximación documentada.** La
  barra real de la APK es `MFInfoBar` (`layout_mf_infobar.xml`: póster
  `150×220`, nombre `36px`, seekbar al pie, fila de teclas, `PlaySettingView`).
  Reconstruirla es la tarea P1 de `PLAN_CORRECCION.md`.

### Auto-ocultado de la barra (live y VOD)

Comportamiento implementado en `showInfobar()`, `hideInfobar()` y
`scheduleInfoHide()`:

| Acción | Resultado |
| --- | --- |
| Entrar al reproductor | barra visible |
| 5 s sin pulsar nada | barra oculta (`display:none`) |
| Flecha arriba/abajo/izquierda/derecha | barra visible y temporizador reiniciado |
| OK con la barra oculta | barra visible |
| OK con la barra visible | barra oculta |
| Back con la barra visible | barra oculta |
| Back con la barra oculta | sale del reproductor |
| Panel de canales abierto | la barra no se oculta |

El valor de **5 s** es una suposición: la constante no está en los recursos
decodificados. Hay que medirla en la app real (WSA/Android TV) y ajustarla si
difiere. Ver `DIFERENCIAS_PENDIENTES.md` (A22).

## 3. Compatibilidad con webOS 4 (Chromium 53)

- Se usa `<video>` nativo; no se empaqueta ningún decodificador.
- MP4 progresivo y HLS dependen del soporte del televisor.
- No se fuerza ningún códec ni DRM.
- El soporte real debe validarse en el LG 43LM6300PDB; no se afirma.

## 4. Evidencia

- `shots/player.png` — barra live.
- `shots/player-channels.png` — panel de canales.
- `shots/player-vod.png` — VOD con `<video>` y barra aproximada.
- En headless no se decodifica fotograma: la superficie sale negra.

## 5. Límites

- No se extraen URLs, tokens ni cabeceras de la app Android.
- No se intercepta TLS.
- No se elude DRM ni autenticación.
- `streamUrl` solo se reproduce si el catálogo autorizado lo entrega.
