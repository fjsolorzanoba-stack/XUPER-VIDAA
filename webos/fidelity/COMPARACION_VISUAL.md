# Comparación visual 1920×1080

Comparación entre la geometría declarada en los layouts de la APK y lo que
realmente pinta el port en Chromium a 1920×1080.

> **Alcance honesto:** no existen capturas verificables de XuperTV en Android TV
> dentro de este repositorio. Por tanto esta comparación es
> **geometría + recursos + render**, no una comparación píxel a píxel contra el
> original. Los puntos que solo puede confirmar una referencia visual están
> marcados como *pendiente de referencia visual*.

---

## 1. Método

1. Se convierte cada medida del XML con la regla de AutoLayout
   (`design_width 1920` / `design_width_in_dp 1280` → **1 dp = 1.5 px**);
   los valores en `px` crudos se mantienen.
2. Se abre la pantalla en Chrome a `1920×1080`, `device-scale-factor=1`.
3. Se desactivan transiciones/animaciones y se mide el `getBoundingClientRect()`
   de cada elemento.
4. Se compara el valor medido con el esperado y se tolera **±1 px** por
   redondeo de AutoLayout.
5. Se captura la pantalla completa en `shots/`.

Script de medición (resumen):

```js
var s = document.createElement('style');
s.textContent = '*{transition:none!important;animation:none!important}';
document.head.appendChild(s);
// getBoundingClientRect() de cada selector
```

Todas las capturas de `shots/` son **1920×1080** reales (verificado con
`System.Drawing`).

---

## 2. Bienvenida

Captura: `shots/welcome.png`

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Nombre | `marginTop 417dp` | y `625.5` | y `625.5` | ✅ |
| Versión | `marginTop 18dp` tras el nombre | y `≈692.5` | y `692.5` | ✅ |
| Carga | `222dp × 20dp` | `333×30`, centrado | `793.5,748.5 333×30` | ✅ |
| Fondo | `wind_bg` | cubre 1920×1080 | cubre | ✅ |
| Versión mostrada | runtime `4.99.2` | `v4.99.2` | `v4.99.2` | ✅ |

Observaciones:

- El fondo `wind_bg.webp` se estira a 1920×1080 (el recurso es de
  `mipmap-xhdpi`); no se recorta.
- El nombre y la versión están centrados horizontalmente porque el
  `WelcomeRootView` usa `gravity="center_horizontal"`.
- La altura de la caja de texto depende de la métrica de la fuente del sistema;
  el apilado vertical se calculó con `line-height` explícito. Diferencia
  potencial de 1–3 px en el bloque nombre/versión → *pendiente de referencia
  visual*.
- `launchAd` está `gone`; no se replica.

---

## 3. Inicio

Capturas: `shots/home-live.png`, `home-featured.png`, `home-movies.png`,
`home-series.png`, `home-free.png`, `home-kids.png`, `home-uhd.png`.

### 3.1 Estructura

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Pager | `marginTop 93dp` | y `139.5` | y `139.5` | ✅ |
| Scrim | `420dp` de ancho | `630×1080` | `630×1080` | ✅ |
| Lista de pestañas | `236dp×600dp`, `paddingTop 159dp` | `354×900`, top `238.5` | `354×900`, top `238.5` | ✅ |
| Ítem de pestaña | `53dp + 9dp` | `354×93` | `354×93` | ✅ |
| Título de pestaña | `193dp×53dp`, `paddingLeft 56dp` | `289.5×79.5`, left `40.5` | `289.5×79.5`, left `40.5` | ✅ |
| Logo | `300dp×67dp` en `43/28dp` | `450×100.5` en `64.5/42` | `450×100.5` en `64.5/42` | ✅ |
| Notificaciones | margen derecho `99dp` | borde derecho en `1771.5` | `1441.9+329.6 = 1771.5` | ✅ |
| Póster vertical | `287dp×493dp` | `430.5×739.5` | `430.5×739.5` | ✅ |
| Póster apaisado | `287dp×245dp` | `430.5×367.5` | `430.5×367.5` | ✅ |
| Foco de póster | escala `1.05` | `452×776.5` | `452×776.5` | ✅ |

### 3.2 Scrim sobre el pager

El `mGridTabBg` se dibuja **encima** del ViewPager. Se verificó con sonda de
píxeles sobre `home-free.png` a `y=300`:

| x | RGB | Lectura |
| --- | --- | --- |
| 20 | `0,0,0` | scrim opaco |
| 100 | `41,41,41` | scrim casi opaco |
| 300 | `109,107,108` | scrim translúcido, se ve el póster |
| 600 | `19,18,21` | scrim casi transparente |

Esto confirma que el degradado oscurece el lateral izquierdo **y** que las
pestañas se superponen al arte, como en la APK.

### 3.2b Póster enfocado (título y degradado)

Medido en `?screen=home&tab=1` con el primer póster enfocado
(`shots/home-featured.png`):

| Propiedad | Valor XML/CSS | Medido |
| --- | --- | --- |
| Título visible | `visibility` normal + `is-focused` | `display:block`, `opacity:1` |
| Tamaño del título | `21sp` → `31.5px` | `31.5px`, `line-height:38px` |
| Color | `color_ffffff` | `rgb(255,255,255)` |
| `paddingLeft` | `19dp` → `28.5px` | `28.5px` |
| `bottom` | `6dp` → `9px` | `9px` |
| Degradado | `80dp` → `120px` | `120px`, `rgba(0,0,0,.72) → transparente` |
| Escala del póster | `1.05` | `452×776.5` (1.05 de `430.5×739.5`) |

El degradado y el título solo se muestran con foco, igual que `view_poster.xml`
(`mTvTitle` + `shape_bg_poster_title`). Sin foco el título está oculto y el
póster no escala.

### 3.3 TV en vivo

Captura: `shots/home-live.png`

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Vídeo principal | `1280×720px` en `128dp/0` | `192,139.5 1279.5×720` | `192,139.5 1279.5×720` | ✅ |
| Lista | `259dp×480dp`, top `26dp`, right `27dp` | `1491,178.5 388.5×720` | `1491,178.5 388.5×720` | ✅ |
| Fila | `67dp` + `13dp` | `100.5` + `19.5` | `100.5` + `19.5` | ✅ |
| Info inferior | `80dp` alto | `192,739.5 1279.5×120` | `192,739.5 1279.5×120` | ✅ |
| Nombre de canal | `layout_toLeftOf` icono | alineado a la derecha | right `112.5`, `text-align:right` | ✅ (corregido) |
| Botones rápidos | `53dp`, hueco `27dp` | `79.5` + `40.5` | `79.5` + `40.5` | ✅ |

El nombre del canal estaba alineado a la izquierda en una versión previa; se
corrigió a alineación derecha porque el XML lo ata al icono de pantalla
completa con `layout_toLeftOf`.

### 3.4 Gratis

Captura: `shots/home-free.png`

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Cabecera live | `left 60dp` | x `90` | x `90` | ✅ |
| Cabecera VOD | `left 67dp` | x `100.5` | x `100.5` | ✅ |
| Rejilla | `paddingTop 20dp` tras cabecera | y `61.5` | y `61.5` | ✅ |
| Columna | `167dp` + `32dp` | `250` + `48` | `250` + `48` | ✅ |
| Tile live | `167dp×173dp` | `250×259.5` | `250×259.5` | ✅ |
| Tile VOD | `167dp×300dp` | `250×450` | `250×450` | ✅ |

---

## 4. Detalle VOD

Captura: `shots/detail.png`

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Panel izquierdo | `806px`, `80/50` | `80,50 806×…` | `80,50 806×369` | ✅ |
| Título | `52px` bold | alto `62` | `134.3×62` | ✅ (ancho depende del texto) |
| Puntuación | `36px` `#ffaa00` | tras el título | `214.3,69 60.9×43` | ✅ |
| Meta | `28px` bold, `marginTop 18px` | y `130` | y `130` | ✅ |
| Sinopsis | `marginTop 18px`, 2 líneas | y `345` | y `345` | ✅ |
| Ventana de vídeo | `765×430` en `right 80`, top `50` | `1075,50 765×430` | `1075,50 765×430` | ✅ |
| Botones | `276×68` en `80/540`, hueco `30` | `80,540` | `80,540` | ✅ |
| Panel inferior | `marginTop 610px` | y `610` | y `610` | ✅ |
| Relacionado | `210×308` | `80,701 210×308` | `80,701 210×308` | ✅ |

Pendiente:

- Marquesina del texto de los botones (existe en el XML, no se anima).
- Ancho de `129px` del TextView del botón: se respeta, pero la marquesina no.

Reconstruido después de esta medición:

- Episodios/temporadas de series con datos reales del portal (`T1-E9`,
  selector de temporada, rangos de 20, `Más`/`Menos`, relacionados).
- Botones del detalle alimentados por el catálogo real (reproducir,
  favoritos, notificaciones, `Modo fluido: No/Sí`).

Corrección aplicada:

- La ventana de vídeo mostraba un título y un degradado superpuestos que no
  están respaldados por `activity_voddetails.xml` ni por `VodPlayerWindow`. Se
  retiraron. Ahora solo pinta el placeholder original
  (`img_thubnail_default.png`) y, al enfocar, el borde dorado 2 px de
  `sel_player_window` (`player_window_focus.9.png`).

Evidencia del borde de foco (`shots/detail-player-focus.png`), ventana en
`1075,50 765×430`:

| Punto | RGB | Lectura |
| --- | --- | --- |
| `1075,200` | `230,198,132` | primera columna del borde dorado |
| `1076,200` | `233,202,136` | segunda columna del borde |
| `1077,200` | `12,62,113` | interior (placeholder) |
| `1200,50` | `219,184,114` | borde superior |
| `1200,52` | `3,20,40` | interior |

El 9-patch mide 25×25 con borde de 2 px, así que el CSS usa
`border-width:2px` + `border-image-slice:2` y no rellena el centro.
Recorte ampliado: `shots/crop-player-focus.png`.

---

## 5. Búsqueda

Capturas: `shots/search-hot.png`, `search-results.png`, `search-empty.png`.

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Teclado | `400dp`, `#66000000` | `600×1080` | `600×1080` | ✅ |
| Campo | `319dp×45dp` | `478.5×67.5`, top `60` | `60.8,60 478.5×67.5` | ✅ |
| Fila de teclas | `67.5px` + `1.5px` | primera fila y `264` | y `264`, alto `69` | ✅ |
| Tecla | `67.5px` | `67.5×67.5` | `67.5×67.5` | ✅ |
| Rejilla | `padding 40/25` | left `60`, top `159` | `660,159` (panel) | ✅ |
| Celda | `152dp×223dp` | `228×334.5` | `228×334.5` | ✅ |
| Sin resultados | título `298.5` | y `298.5` | y `298.5` | ✅ |

Observaciones:

- Las teclas son transparentes en reposo; solo el foco pinta `#c91923` con
  radio `3dp`. Se comprobó visualmente en `search-hot.png`.
- El campo de edición **no** muestra borde de foco, igual que el selector
  original.
- La barra de navegación superior y los filtros quedan fuera de esta pasada.

---

## 6. Ajustes

Capturas: `shots/settings-*.png`.

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Menú | `422px`, `color_661a1a1a` | `422×1080` | `422×1080` | ✅ |
| Primera entrada | `marginTop 40px` | y `40`, alto `90` | y `40`, alto `90` | ✅ |
| Panel derecho | contenedor | x `422` | x `422` | ✅ |
| Título | `52/81`, `42px` | y `81` | y `81` | ✅ |
| Fila reproducción | etiqueta `212px` | opciones en x `686` | x `686` | ✅ |
| Opción | `255×74`, margen `28` | `255×74` | `255×74` | ✅ |
| Interruptor | `106×51`, imagen `96×38` | `106×51` | `106×51` | ✅ |
| Cajas parentales | `68×68` | `68×68` | `68×68` | ✅ |
| Botón CR | `572×93` | 2 líneas dentro | 2 líneas, centrado | ✅ (corregido) |

Correcciones aplicadas en esta pasada:

1. **Menú con elipsis**: `personal_setting_bnt` usa `ellipsize=END`; antes se
   recortaba en seco. Ahora `text-overflow: ellipsis`.
2. **Botón de contraseña CR**: el TextView envuelve a 2 líneas y desbordaba la
   caja de `93px`; se fijó `line-height:38px` + flex centrado.
3. **Cajas de contraseña**: fondo normal `color_4dfffff` (blanco 30 %) y foco
   sólido `#c91923` (`shape_edit_focus`), no un contorno.
4. **Panel sin controles**: al abrir *Sobre nosotros* el foco se quedaba en una
   entrada ajena del menú; ahora se mantiene en la entrada seleccionada.

Verificación visual de las capturas:

- `settings-playback.png`: etiquetas largas en 2 líneas, opciones alineadas en
  x `686`, `Aa` en blanco sobre caja negra.
- `settings-cr.png`: botón en 2 líneas centradas, aviso rojo debajo.
- `settings-parent.png`: 4 cajas blancas translúcidas, sin borde de foco falso.
- `settings-about.png`: sin controles enfocables; la entrada del menú conserva
  el foco.

---

## 7. Reproductor

Capturas: `shots/player.png`, `player-channels.png`, `player-vod.png`.

| Elemento | XML | Esperado | Medido | Resultado |
| --- | --- | --- | --- | --- |
| Barra | `240px` | y `840`, alto `240` | y `840`, alto `240` | ✅ |
| Logo | `201×120` en `109.5/60` | `109.5,900` | `109.5,900` | ✅ |
| Índice | `48px` en `367.5/13.5` | x `367.5` | `367.5`, alto `58` | ✅ |
| Nombre | índice + `30px` | x `452.5` | x `452.5` | ✅ |
| Fecha | right `100.5`, top `34.5` | borde derecho `1819.5` | `1764.4+55.1 = 1819.5` | ✅ |
| Ahora | `27px` en `367.5/72` | y `912` | y `912` | ✅ |
| Seek | `370.5/271.5`, alto `6` | y `958` | y `958` | ✅ |
| Acciones | top `151.5` | y `991.5` | y `991.5` | ✅ |

Notas:

- Las etiquetas de acción se recortan dentro de su caja (`overflow:hidden`),
  igual que el TextView original de `67dp/90dp`. El solapamiento entre
  *Favorito* y *Reproductor 1* es auténtico del `layout_live_infobar.xml`.
- En VOD se ocultan `pi-now` y `pi-next`, y no hay logo de canal.
- La barra se auto-oculta a los **5 s** sin pulsaciones; una flecha la muestra y
  reinicia el temporizador, OK la alterna y Back la oculta antes de salir. El
  valor de 5 s es una suposición hasta medirlo en la app real (A22).
- **La barra VOD no es la de la APK**: el original usa `MFInfoBar`
  (`layout_mf_infobar.xml`). Es la diferencia visual más grande que queda.
- La superficie de vídeo en headless sale negra (no hay decodificador de
  fotograma en la captura); la barra y el `<video>` sí se montan.

---

## 7 bis. Panel del reproductor y diálogo *Ajuste de reproducir*

Referencia real capturada en WSA (1920×1080):
`scratch/xuper-idioma-dialog.png`, `scratch/panel-crop.png`,
`scratch/ui-idioma.xml`, `scratch/ui-panel-real.xml`. Medición propia:
`scratch/probe-panel.mjs` (Chrome headless 1920×1080).

Diálogo (`dialog-playsettings`), película *La isla olvidada*:

| Elemento | Real | Port | Resultado |
| --- | --- | --- | --- |
| Caja | x 388, y 126, 1145×775 | x 388, y 126, 1145×775 | ✅ |
| Cabecera | alto 91, `#2a2b2d` | alto 91, `#2a2b2d` | ✅ |
| Fila Audio | y 281, alto 66 | y 281, alto 66 | ✅ |
| Interruptor Subtítulo | y 406, alto 46, 106×46 | y 406, alto 46, 106×46 | ✅ |
| Fila Idioma | y 482, alto 66 | y 482, alto 66 | ✅ |
| Fila Tamaño | y 592, alto 66 | y 592, alto 66 | ✅ |
| Fila Estilo | y 702, alto 66 | y 702, alto 66 | ✅ |
| Pills | 255×66, radio 12, `#3c3c41` | 255×66, radio 12, `#3c3c41` | ✅ |
| Foco | rojo `#c91923` | rojo `#c91923` | ✅ |
| Selección | pill oscuro + check blanco a la derecha | igual | ✅ |
| Audio real | Portugués / Español / Inglés (Español por defecto) | Portugués / Español* / Inglés | ✅ |
| Subtítulos reales | Español / Inglés, ON por defecto | Español* / Inglés, ON | ✅ |
| Orden Tamaño | Normal / Grande / Pequeño | Normal* / Grande / Pequeño | ✅ |
| Salida | 380×73, radio 36 | 380×73, radio 36 | ✅ |

Panel del reproductor (`player-playsetting-view`), misma película:

| Elemento | Real | Port | Resultado |
| --- | --- | --- | --- |
| Título IDIOMA | y 292, 32 px | y 292 | ✅ |
| Pill Configuración | 306×72, rojo al enfocar | 306×72 | ✅ |
| RESOLUCIÓN | y 449; pills `1080P` y `4K` | y 449; `1080P*`, `4K` | ✅ |
| FORMATO DE PANTALLA | y 598 | y 598 | ✅ |
| OPCIONES DE REPRODUCTOR | y 747 | y 747 | ✅ |
| FEEDBACK | y 896 | y 896 | ✅ |
| Check de selección | círculo blanco 25 px, inline | igual | ✅ |

Notas:

- La app real **remapea** las calidades del portal (`720p`→`1080P`,
  `1080p`→`4K`) en `ud/n1.dd()`; el port lo replica y añade el pill `4K`
  sintético cuando el portal solo ofrece la copia 720p (no hay rendición
  separada a la que cambiar).
- El panel real no tiene fila SUBTÍTULO: el idioma, tamaño y estilo viven en el
  diálogo, al que se entra por `IDIOMA → Configuración`.
- Los subtítulos se piden al CDN a través del proxy del servicio
  (`/sub/<token>.srt`) porque el CDN no manda CORS.
- Cambiar el idioma de audio requiere el relay FFmpeg (`&a=<índice>`): el
  `<video>` de webOS no puede elegir PIDs dentro del TS.
- La fila FEEDBACK existe y se enfoca, pero el diálogo real de feedback
  (920×784) sigue pendiente (A23).

---

## 8. Diferencias residuales (no bloqueantes de geometría)

| # | Diferencia | Estado |
| --- | --- | --- |
| 1 | Sin capturas de referencia de Android TV | **Parcial:** panel y diálogo comparados contra WSA real; resto pendiente |
| 2 | Métrica de fuente: el APK usa `sans-serif` del sistema; el port cae a Roboto/Arial | Pendiente de referencia visual |
| 3 | Logo de la home dinámico | Fallback de texto documentado |
| 4 | Iconos de pestaña dinámicos | Solo texto |
| 5 | Pósteres/logos de canal del backend | Placeholder original |
| 6 | QR de feedback | Hueco documentado |
| 7 | Barra VOD `MFInfoBar` | Reutiliza la barra live (aproximación documentada) |
| 8 | Marquesina de botones de detalle | Botones reconstruidos con metadatos reales; la marquesina no se anima |
| 9 | Episodios de series | Reconstruido: temporadas, rangos, `T1-E9`, `Más`/`Menos` |
| 10 | Panel Account/Purchase | Pendiente |
| 11 | `LiveFreeActivity` como pantalla propia | Rejilla gratis reconstruida; canales live son marcadores |
| 12 | Pruebas en el televisor | Verificadas en LG 43LM6300PDB (webOS 4.10.0) |

---

## 9. Veredicto

- **Geometría:** verificada contra los layouts con medición real; las
  diferencias encontradas son de redondeo (±1 px) o de ancho de texto.
- **Recursos:** todos originales del APK, con inventario y procedencia.
- **Fidelidad píxel a píxel:** **no se puede afirmar** sin capturas de
  referencia de Android TV. Este documento demuestra fidelidad *derivada del
  layout*, no igualdad visual absoluta.
- **Comparación reproducible:** sí; cualquier cambio de CSS puede re-medirse
  con el método de la sección 1.

---

## 10. Índice de capturas (23 PNG)

Las capturas de pantalla son 1920×1080; el recorte es 830×470.

| Archivo | Pantalla |
| --- | --- |
| `welcome.png` | Bienvenida |
| `home-live.png` | Inicio → TV |
| `home-featured.png` | Inicio → Destacados |
| `home-movies.png` | Inicio → Película |
| `home-series.png` | Inicio → Series |
| `home-free.png` | Inicio → Gratis |
| `home-kids.png` | Inicio → Kids |
| `home-uhd.png` | Inicio → 4K UHD |
| `detail.png` | Detalle VOD |
| `detail-player-focus.png` | Detalle con la ventana de vídeo enfocada |
| `crop-player-focus.png` | Recorte 830×470 del borde dorado |
| `search-hot.png` | Búsqueda con populares |
| `search-results.png` | Búsqueda `q=sintel` |
| `search-empty.png` | Búsqueda sin resultados |
| `settings-playback.png` | Ajustes → Reproducción |
| `settings-cr.png` | Ajustes → Contenido adulto |
| `settings-parent.png` | Ajustes → Control parental |
| `settings-feedback.png` | Ajustes → Ayuda y Feedback |
| `settings-upgrade.png` | Ajustes → Actualización |
| `settings-about.png` | Ajustes → Sobre nosotros |
| `player.png` | Reproductor live |
| `player-channels.png` | Reproductor con panel de canales |
| `player-vod.png` | Reproductor VOD |

La captura `player-vod.png` pesa muy poco porque la superficie de `<video>` en
headless no decodifica fotograma; la barra sí está montada.
