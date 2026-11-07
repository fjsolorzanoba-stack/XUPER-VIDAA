# Mapa de pantallas, layouts, recursos y clases

Documento de trazabilidad del port `webos/fidelity`. Para cada pantalla indica
qué layout de la APK se usó, qué recursos originales se reutilizan, qué clases
CSS/JS lo implementan, cómo abrirla y qué queda pendiente.

Fuente de verdad: `analysis/xuppertv/decoded/resources/res/` (exportación JADX
del APK `com.xuper.netxxus` 4.34.4). Capturas: `webos/fidelity/shots/`.

---

## 0. Convención de escala

La APK usa **AndroidAutoLayout** con:

- `design_width = 1920`
- `design_width_in_dp = 1280`

Por tanto **1 design dp = 1.5 px** a 1920×1080. El port aplica esa conversión
una sola vez, al escribir el CSS:

| Unidad en el XML | Conversión al port | Ejemplo |
| --- | --- | --- |
| `px` (crudo) | 1 px = 1 px | `layout_width="422px"` → `width: 422px` |
| `dp` | × 1.5 | `paddingTop="159dp"` → `238.5px` |
| `sp` (texto) | × 1.5 | `textSize="21sp"` → `31.5px` |
| `sp` en `values` con `px` | 1 px = 1 px | `textSize="40px"` → `40px` |

AutoLayout trunca a `int` al aplicar la escala; por eso algunas medidas del CSS
llevan medio píxel (p. ej. `139.5px`) y otras están redondeadas.

Las dimensiones de recursos (`drawable-xhdpi`, `mipmap-xhdpi`) se usan tal cual,
sin reescalar, salvo cuando el layout las estira (`fitXY`).

---

## 1. Cobertura

| # | Pantalla | Actividad APK | Estado | Ruta de prueba |
| --- | --- | --- | --- | --- |
| 1 | Bienvenida | `WelcomeActivity` | Implementada | `?screen=welcome` |
| 2 | Inicio | `HomeActivity` | Implementada (7 pestañas) | `?screen=home&tab=N` |
| 2a | TV en vivo (Inicio) | `fragment_home_live` | Implementada (datos demo) | `?screen=home&tab=0` |
| 2b | Destacados / Películas / Series / Kids / UHD | `fragment_featured/movies/series/kids/uhd` | Implementadas | `?screen=home&tab=1..6` |
| 2c | Gratis | `fragment_freefragment` | Implementada | `?screen=home&tab=4` |
| 3 | Detalle VOD | `VodDetailsActivity` | Implementada (parcial) | `?screen=detail&vod=1` |
| 4 | Búsqueda | `VodSearchActivity` | Implementada (parcial) | `?screen=search&q=sintel` |
| 5 | Ajustes | `SettingActivity` | Implementada (6 de 8 paneles) | `?screen=settings&panel=N` |
| 6 | Reproductor live | `LiveFreeActivity` → player | Implementado (aprox.) | `?screen=player` |
| 6b | Reproductor VOD | `VodDetailsActivity` → player | Implementado (aprox.) | `?screen=player&mode=vod&vod=1` |
| — | `LiveFreeActivity` como pantalla propia | `activity_live.xml` | **No reconstruida** | — |
| — | PARTIDOS / Match* | `Match*Activity` | **Fuera de alcance** | — |
| — | Cuenta / Compras | `fragment_account/purchase` | **No reconstruidas** | — |

`activity_live.xml` es solo un contenedor (`mFlLive`) que aloja un fragmento
que no se pudo identificar sin fuentes descompiladas. La rejilla de contenido
gratuito sí se reconstruyó desde `fragment_freefragment.xml` y se usa en la
pestaña GRATIS. Se documenta como pendiente en `DIFERENCIAS_PENDIENTES.md`.

---

## 2. Bienvenida — `WelcomeActivity`

**Layout:** `activity_welcome.xml` + `style/welcome_style`
**CSS:** `#screen-welcome`, `.welcome-name`, `.welcome-version`, `.welcome-loading`
**JS:** `startWelcome()`, `finishWelcome()`

| Elemento APK | Geometría XML | Implementación | Recurso |
| --- | --- | --- | --- |
| `mImgBg` | match_parent | `background` de `#screen-welcome` | `welcome/wind_bg.webp` |
| `mTextAppName` | `27sp`, `marginTop 417dp`, centrado | `.welcome-name` top `625.5px`, `40.5px` | — (texto) |
| `mTvVersion` | `19sp`, alpha `.7` | `.welcome-version` top `692.5px`, `28.5px`, `opacity:.7` | — (texto) |
| `mImgLoading` | `333×30px`, 16 fotogramas | `.welcome-loading` centrado, `333×30` | `welcome/img_welcome_loading1..16.png` |

Notas verificadas:

- La versión en runtime está fija en el código de `WelcomeActivity.g5()`:
  **`v4.99.2`**. No es la `versionName` del manifiesto (4.34.4).
- El nombre visible depende del backend (`mTextAppName`); se usa
  **`Xuper Hydra`** como valor observado en el binario y se marca como
  dependiente de servidor.
- El logo de la app (`icon_app.png`) no se muestra en esta pantalla.
- El indicador de carga es una animación de 16 PNG; el port la reproduce con
  `setInterval` sobre los fotogramas originales.

**Captura:** `shots/welcome.png`.

---

## 3. Inicio — `HomeActivity`

**Layout raíz:** `activity_home.xml`
**CSS:** `#screen-home`, `.home-pages`, `.home-page`, `.home-sidebar-bg`,
`.home-tabs`, `.tab-item`, `.tab-title`, `.home-logo`, `.home-notify`,
`.notify-*`, `.poster*`, `.live-*`, `.free-*`
**JS:** `buildHome()`, `buildTabs()`, `buildNotify()`, `selectTab()`,
`buildLivePage()`, `buildFeaturedPage()`, `buildMoviesPage()`,
`buildSeriesPage()`, `buildFreePage()`, `buildKidsPage()`, `buildUhdPage()`

### 3.1 Estructura

| Elemento APK | Geometría XML | Implementación |
| --- | --- | --- |
| `mViewPager` (ViewPager2) | match_parent, `marginTop 93dp` | `.home-pages` top `139.5px`, 7 páginas de `1920×940.5` |
| `mGridTabBg` | `420dp × match_parent`, degradado `#000→transparent` | `.home-sidebar-bg` `630×1080`, **encima** del pager |
| `mGridTab` | `236dp × 600dp`, `paddingTop 159dp`, `clipToPadding=false` | `.home-tabs` `354×900`, `padding-top:238.5px`, `overflow:hidden` |
| `item_tab_recyclerview` | item `53dp` + `9dp` | `.tab-item` `354×93` |
| Título de pestaña | `193dp × 53dp`, `paddingLeft 56dp`, `21sp` | `.tab-title` `289.5×79.5`, `padding-left:84px`, `31.5px` |
| `mViewLogo` (NotificationBarRootView) | `300dp × 67dp` en `43dp/28dp` | `.home-logo` `450×100.5` en `64.5/42` |
| `mTextAppName` | oculto (`gone`) dentro de `mViewLogo`, 19sp, `alpha .7` | `.home-logo span` visible como *fallback* |
| `mTextNotice` | aviso `700dp×32dp` en `128dp/57dp`, `gone` | **no reconstruido** (lo activa el backend) |
| `mRlNotify` | margen derecho `39dp` + `60dp` | `.home-notify` `right:148.5px`, alto `60px` |

El logo real de la home lo sirve el backend; los hijos estáticos están `gone`.
El port muestra un texto de reserva documentado, no un logo inventado.

### 3.2 Pestañas

Orden implementado (8 entradas, la última recortada por el alto de 900 px):

| # | Etiqueta | Página | Sección de catálogo |
| --- | --- | --- | --- |
| 0 | TV | live | canales demo |
| 1 | DESTACADOS | featured | `destacado` |
| 2 | PELICULA | movies | `pelicula` |
| 3 | SERIES | series | `serie` |
| 4 | GRATIS | free | `gratis` |
| 5 | KIDS | kids | `infantil` |
| 6 | 4K UHD | uhd | `uhd` |
| 7 | Perfil | — | pendiente |

En la APK las etiquetas y sus iconos son dinámicos (`xa.l.d(context, title)`);
por eso el port usa **solo texto** y documenta los iconos como pendientes. El
orden real lo define el backend.

### 3.3 Mosaicos de pósters

`PosterView` + `view_poster.xml`. Fondo `bg_placehoder_vertical.png` estirado
(`background-size:100% 100%`), imagen real encima y oculta si falla.

| Página | Mosaico (x,y,w,h en px) |
| --- | --- |
| Destacados | 3 verticales `430.5×739.5` en x 0/436.5/873 + 2 apaisados `430.5×367.5` en x 1309.5, y 0/373.5 |
| Películas | `918×486` en 0,0 + 4 de `225×247.5` en y 492 (x 0/231/462/693) + 2 verticales `405×739.5` en x 924/1335 |
| Series | idéntico a Películas |
| Kids | `805.5×486` en 0,0 + 2 de `379.5×240` en x 811.5 (y 0/246) + 3 de `400.5/399/379.5×247.5` en y 492 + `541.5×367.5` en x 1197 |
| UHD | 4 verticales `430.5×739.5` en x 0/436.5/873/1309.5 |
| Gratis | rejilla 6 columnas de `250px` con separación `48px`, cabeceras live/VOD |

Área de pósters: `left:90px`, ancho `1830px` (equivale al `paddingLeft 60dp`).

Foco de póster (`PosterView`):

- `wd.a` dibuja un trazo interior azul `#3A66FE` de 4 px en `dispatchDraw()`
  → CSS `::after` con `box-shadow: inset 0 0 0 4px #3A66FE`.
- `xa.b` aplica escala `1.05` → CSS `transform: scale(1.05)`.
- En ítems `sel_poster_nohalo` (gratis, búsqueda, relacionados) se usa el
  9-patch `poster_focus_nohalo.9.png` (borde dorado 2 px, interior
  transparente) → CSS `border-image` con `border-width:3px`, sin escala.
- El título se oculta normalmente y aparece al enfocar con degradado inferior de
  `80dp` y texto blanco `21sp`, `padding` lateral `19dp`.

### 3.4 TV en vivo (pestaña 0)

**Layout:** `fragment_home_live.xml`, `layout_home_channel_item.xml`
**Recursos:** `home/bg_home_live_divider.png`, `home/home_live_btn_*`,
`home/home_live_channel_*`, `home/icon_full_screen.png`,
`home/live_channel_default_icon.png`, `home/icon_free_live.png`,
`common/img_thubnail_default.png`

| Elemento APK | Geometría | Implementación |
| --- | --- | --- |
| `mFlLiveMain` (vídeo) | `1280×720px` en `128dp/0` | `.live-main` `1280×720` (y=140 absoluto) |
| `mIvThumbnail` | match_parent | `.player-frame` con `img_thubnail_default.png` + velo oscuro |
| `mLvChannelList` | `259dp×480dp`, `marginTop 26dp`, `marginRight 27dp`, filas `100.5px` + `13dp` | `.live-list` `388.5×720`, filas `100.5px`, hueco `19.5px` |
| Flechas up/down | `17dp×13dp`, `marginRight 230dp` | `.live-arrow-up/down` |
| `FocusBorderView` | `880dp×507dp` en `115dp/-13dp`, no dibuja nada | `.live-focus` `1320×760.5` en `172.5/-19.5` |
| `mTvChannel` | `layout_toLeftOf` pantalla completa | `.live-channel` `right:112.5px`, `text-align:right` |
| Fondo inferior | `shape_home_live_bottom_bg` `#191919→transparente`, angle 90 | `.live-info` degradado a `120px` de alto |
| `mLlFastBtn` | izquierda `129dp`, abajo `67dp`, botones `53dp`, hueco `27dp` | `.live-fast` botones `80px` |

La lista de canales **no** es enfocable; el foco lo lleva `FocusBorderView`.
La fila enfocada usa `bg_home_live_channel_item` (degradado rojo) y el canal
actual muestra el glifo de reproducción `12×17dp`.

**Captura:** `shots/home-live.png`.

### 3.5 Gratis (pestaña 4)

**Layouts:** `fragment_freefragment.xml`, `item_free_live_area_outer.xml`,
`item_free_vod_area_outer.xml`, `item_free_area_channel_list.xml`,
`item_free_area_vod_list.xml`

| Elemento | Geometría | Implementación |
| --- | --- | --- |
| Cabecera live | `left 60dp`, icono `24dp` + hueco `7dp`, `21sp` | `.free-header` left `90px` |
| Cabecera VOD | `left 67dp` | `.free-header.vod` left `100.5px` |
| Rejilla | `padding 60/20/60dp`, 6 columnas, `hSpacing 32dp`, `vSpacing 7dp` | `.free-grid` left `90px`, top `61.5px`, celdas `250px`, hueco `48px` |
| Tile live | `167dp×173dp` | `.free-tile.t-channel` `250×259.5` |
| Tile VOD | `167dp×300dp` | `.free-tile.t-vod` `250×450` |

**Captura:** `shots/home-free.png`.

### 3.6 Notificaciones

Tres accesos: **Récord**, **Perfil**, **Mensaje**, más separador y reloj.
Los iconos normales y de foco son recursos distintos (círculo gris de 60×60 vs
glifo blanco de ~28 px); el port los apila y los intercambia al enfocar.

**Capturas:** todas las `shots/home-*.png`.

---

## 4. Detalle VOD — `VodDetailsActivity`

**Layout:** `activity_voddetails.xml`
**Sub-layouts:** `layout_vod_detail_left_panel.xml`,
`layout_vod_detail_menu_panel.xml`, `layout_vod_detail_bottom_panel.xml`,
`layout_item_vod_programs.xml`
**CSS:** `.detail-left`, `.detail-title`, `.detail-score`, `.detail-meta`,
`.detail-genres`, `.chip`, `.detail-synopsis`, `.detail-player`,
`.detail-buttons`, `.detail-btn`, `.detail-bottom`, `.detail-related`,
`.detail-grid`
**JS:** `openDetail()`, `buildDetail()`, `makePoster()`

| Elemento APK | Geometría XML | Implementación |
| --- | --- | --- |
| `llMeun` (`VodDetailLeftPanel`) | `806px` ancho, `marginLeft 80px`, `marginTop 50px` | `.detail-left` `80,50 806×369` |
| Título | `52px` bold, máx. `740px`, 2 líneas | `.detail-title` |
| Puntuación | `36px`, `#ffaa00` | `.detail-score` |
| Meta (año/duración) | `28px` bold, `#858d94`, `marginTop 18px` | `.detail-meta` |
| Géneros | chips `38px`, radio `375px`, `marginTop 15px` | `.chip` |
| Sinopsis | `marginTop 18px`, 2 líneas, sangría 7 pestañas | `.detail-synopsis` con `text-indent:140px` |
| `mPlayerWindow` | `765×430px`, `marginTop 50px`, `marginRight 80px` | `.detail-player` `1075,50 765×430` |
| `mLayoutButtons` | `marginLeft 80px`, `marginTop 540px`, botones `276×68`, hueco `30px` | `.detail-buttons`, `.detail-btn` |
| Texto de botón | TextView de `129px`, centrado, marquesina | `.detail-btn` `129px` interno |
| `mScrollView` | `marginTop 610px` | `.detail-bottom` top `610px` |
| Relacionados | título `36px` bold en `80/25`; ítems `210×308px` + nombre `32px` | `.detail-related`, `.detail-grid` |

Pendiente en esta pantalla:

- La **marquesina** del texto de los botones está en el XML pero no se anima.
- El panel de episodios/temporadas (`layout_vod_detail_bottom_panel.xml`) se
  reconstruyó solo para películas (sin lista de episodios).
- `mLayoutNotice` (aviso de suscripción) está `gone` y no se replica.
- Los chips de género y el director/actores son enfocables pero su pantalla
  destino no está reconstruida.

**Capturas:** `shots/detail.png`, `shots/detail-player-focus.png` (ventana de
vídeo enfocada).

---

## 5. Búsqueda — `VodSearchActivity`

**Layouts:** `activity_vodsearch.xml`, `layout_search_keyboard.xml`,
`layout_search_result.xml`, `layout_vod_search_result.xml`,
`layout_search_feedback.xml`
**CSS:** `.search-keyboard`, `.kb-edit`, `.kb-actions`, `.kb-action`,
`.kb-row`, `.kb-key`, `.search-hot`, `.search-hot-title`, `.search-grid`,
`.search-cell`, `.search-results`, `.search-nav`, `.search-empty*`
**JS:** `buildSearch()`, `openSearch()`, `runSearch()`,
`renderSearchResults()`, `toggleSearchNumeric()`

| Elemento APK | Geometría XML | Implementación |
| --- | --- | --- |
| `leftKeybord` (`LeftkeybordView`) | `400dp` ancho, fondo `#66000000` | `.search-keyboard` `600×1080`, `rgba(0,0,0,.4)` |
| Campo de edición | `319dp×45dp` | `.kb-edit` top `60px`, `478.5×67.5` |
| Acciones | fila centrada | `.kb-actions` top `175.5px` |
| Filas de teclas | `67.5px` + hueco `1.5px` | `.kb-row` en y 264 / 352.5 / 441 / 529.5 / 618 |
| Tecla | transparente; foco `#c91923`, radio `3dp` | `.kb-key`, `.kb-key.is-focused` |
| Espacio | doble ancho | `.kb-key.space` `138px` |
| Feedback | `319dp×45dp`, abajo `53dp` | `.kb-feedback` |
| Título populares | `24sp` bold en `40dp/49dp` | `.search-hot-title` `60/73.5`, `36px` |
| Rejilla resultados | `padding 40/25/40/53dp`, celdas `152×223dp` | `.search-grid` left `60px`, top `159px`, celdas `228×390` |
| Celda | póster `228×334.5` + nombre `19sp` | `.search-cell`, `.poster` |
| Sin resultados | título top `298.5px`, `padding 231px` | `.search-empty` |

Fondo raíz `#1a1a1a`. El campo de edición **no** tiene borde de foco (así está
en el selector original). El teclado numérico/alfabético se alterna con
`ic_vod_search_123/abc`.

Fuera de alcance en esta pasada: barra de navegación superior
(`layout_search_feedback.xml` como diálogo), filtros de categoría y búsqueda de
canales en vivo.

**Capturas:** `shots/search-hot.png`, `shots/search-results.png`,
`shots/search-empty.png`.

---

## 6. Ajustes — `SettingActivity`

**Layout:** `activity_setting.xml`
**CSS:** `.settings-menu`, `.settings-item`, `.settings-right`,
`.settings-panel`, `.sp-*`, `.pb-*`, `.cr-*`, `.pl-*`, `.fb-*`
**JS:** `buildSettings()`, `openSettings()`, `showSettingsPanel()`,
`buildPlaybackPanel()`, `buildCrPanel()`, `buildParentPanel()`,
`buildFeedbackPanel()`, `buildUpgradePanel()`, `buildAboutPanel()`

### 6.1 Menú izquierdo

`mRadioGroup`: `422px` de ancho, fondo `color_661a1a1a`, `paddingTop 40px`.
Cada entrada mide `90px`, `paddingLeft 58px`, `paddingRight 50px`, `40px`,
`ellipsize=END`.

| # | Texto | Panel | Estado |
| --- | --- | --- | --- |
| 0 | Configuración global de reproducción | `playback` | Implementado |
| 1 | Contenido adulto | `cr` | Implementado |
| 2 | Configuraciones del Control Parental | `parent` | Implementado |
| 3 | Ayuda y Feedback | `feedback` | Implementado |
| 4 | Actualización | `upgrade` | Implementado |
| 5 | Sobre nosotros | `about` | Implementado |
| 6 | Account | `account` | No reconstruido |
| 7 | Purchase | `purchase` | No reconstruido |

Seleccionado sin foco = texto rojo `#c91923`. Seleccionado con foco = texto
blanco + degradado rojo. Si el panel no tiene ningún control enfocable (p. ej.
*Sobre nosotros*), el foco se queda en la entrada del menú.

### 6.2 Reproducción — `fragment_playsetting.xml`

| Elemento | Geometría | Implementación |
| --- | --- | --- |
| Título | `52/81`, `42px` bold | `.sp-title` |
| Separador | top `160px`, `1px` | `.sp-hr` |
| Filas 1–2 | y 227 / 374; etiqueta `212px`, `32px` `#ffffff`, 2 líneas | `.pb-row`, `.pb-label` |
| Filas 3–5 | y 593 / 682 / 803 / 924; etiqueta `30px` `#c4c4c4` centrada | `.pb-label.fixed` |
| Opciones | `255×74px`, primera sin margen, resto `28px` | `.pb-opt` |
| Opción normal | degradado `#51545b→#3a3f43` | `.pb-opt` |
| Opción enfocada | degradado `#d30606→#800000` | `.pb-opt.is-focused` |
| Opción marcada | `vod_feedback_radio_checked.png` `24×24`, caja `30×30`, `left:16px` | `.pb-opt .radio` |
| Interruptor subtítulos | `106×51`, imagen `96×38`, borde foco `3px` rojo | `.sp-switch` |
| Tercer estilo | caja negra `94×50` con `Aa` blanco `28px` | `.pb-opt` variante |

Desviación documentada: el XML centra el indicador de radio; el port lo coloca
a `left:16px` porque así se ve en el recurso y evita tapar el texto de 255 px.

### 6.3 Contenido adulto — `fragment_cr_switch.xml`

| Elemento | Geometría | Implementación |
| --- | --- | --- |
| Cabecera | `59/94`, `42px` + interruptor `106×51` | `.cr-head`, `.cr-head .sw` |
| Texto de ayuda | `59/147`, `28px`, blanco 38 % | `.cr-tip` |
| Botón | `572×93px` en `59/212`, texto en 2 líneas | `.cr-btn` (flex + `line-height:38px`) |
| Aviso | `59/329`, `28px`, `#c91923` | `.cr-warn` |

### 6.4 Control parental — `fragment_parentlock.xml`

| Elemento | Geometría | Implementación |
| --- | --- | --- |
| Título | `80/96`, `48px` bold | `.pl-title` |
| Tip | `80/176`, `28px` | `.pl-tip` |
| Etiqueta | `80/252`, `32px` bold | `.pl-label` |
| Cajas | `68×68px`, separador `20×2px` con márgenes `26px` | `.pl-box`, `.pl-sep` |
| Caja normal | `color_4dfffff` = blanco 30 % | `rgba(255,255,255,.30)` |
| Caja enfocada | `shape_edit_focus` sólido `#c91923` | `.pl-box.is-focused` |
| Nota | `80/416`, `28px` rojo | `.pl-note` |
| OK | `320×80px` en `80/466` | `.pl-ok` |

La captura numérica y la validación de contraseña no se reconstruyeron.

### 6.5 Ayuda y Feedback — `fragment_feedback.xml`

Título `65/81` `42px`; separador `149`; contacto `165`; nota QR `286`;
QR `300×300` en `356`; enlace de ayuda `65/679`, `28px` `#ffaa00`, foco
`#c91923`. El QR lo sirve el backend: el port muestra el hueco documentado, no
un QR inventado.

### 6.6 Actualización — `fragment_upgrade.xml`

Título `52/68`; separador `165`; tarjeta de caché `30/198` alto `461`; tarjeta
de actualización `30/689` alto `291`. Botones con degradado normal y foco rojo.
La comprobación real de versión y el borrado de caché no están implementados.

### 6.7 Sobre nosotros — `fragment_aboutus.xml`

Título `65/81`; separador `165`; cuerpo `52/213`; correo al pie con
`vod_email_icon.png`. Sin controles enfocables.

**Capturas:** `shots/settings-playback.png`, `settings-cr.png`,
`settings-parent.png`, `settings-feedback.png`, `settings-upgrade.png`,
`settings-about.png`.

---

## 7. Reproductor

**Layout live:** `layout_live_infobar.xml`, `layout_live_player_controller.xml`
**Layout VOD real:** `fragment_vod_player.xml` + `layout_mf_infobar.xml`
**CSS:** `.player-stage`, `.player-frame`, `.player-video`, `.player-infobar`,
`.pi-*`, `.player-channels`, `.pc-*`
**JS:** `buildPlayer()`, `openPlayer()`, `updatePlayer()`,
`openChannelPanel()`, `startPlayerVideo()`

| Elemento APK | Geometría XML | Implementación |
| --- | --- | --- |
| Barra inferior | `240px` alto, `rgba(12,13,15,.902)` | `.player-infobar` bottom `240px` |
| Logo de canal | `201×120px` en `109.5/60` | `.pi-logo` |
| Índice | `48px` en `367.5/13.5` | `.pi-index` |
| Nombre | `40.5px` a la derecha del índice + `30px` | `.pi-name` |
| Badge UHD | `58.5×28.5` | `.pi-uhd` |
| Fecha | derecha `100.5`, top `34.5` | `.pi-date` |
| Ahora / después | `27px`, y `72` | `.pi-now`, `.pi-next` |
| Barra de progreso | `left 370.5`, `right 271.5`, top `118`, alto `6` | `.pi-seek` |
| Fila de menús | top `149.5` | `.pi-menu`, `.pi-quality`, `.pi-scale`, `.pi-func` |
| Acciones | top `151.5`, márgenes derechos 446/389/333/249/219/151/107/50 | `.pi-actions`, `.pi-act` |
| Panel de canales | `679.5px` ancho, `rgba(9,12,28,.8)` | `.player-channels` |

Para VOD se usa `<video>` real y se ocultan `pi-now`/`pi-next`; el logo y el
índice no aplican. La barra VOD de la APK es `MFInfoBar`, distinta de la barra
live: **el port reutiliza la barra live como aproximación documentada**.

**Capturas:** `shots/player.png`, `shots/player-channels.png`,
`shots/player-vod.png`.

---

## 8. Mapa de clases Android → implementación

| Clase / vista APK | Responsabilidad | Implementación en el port |
| --- | --- | --- |
| `HomeActivity` | Pager + pestañas + notificaciones | `#screen-home` + `buildHome()` |
| `HomeLiveRootView` | Vídeo, lista y botones rápidos | `.live-main`, `.live-list`, `.live-fast` |
| `MemoryListView` | Lista de canales no enfocable | `.live-list` (foco gestionado por JS) |
| `FocusBorderView` | Zona de foco invisible | `.live-focus` |
| `PosterView` | Póster + foco + título | `.poster` (+ `makePoster()`) |
| `VodDetailRootView` | Raíz del detalle | `#screen-detail` |
| `VodDetailLeftPanel` | Título, meta, sinopsis | `.detail-left` |
| `VodDetailMenuPanel` | Botones de acción | `.detail-buttons` |
| `VodPlayerWindow` | Ventana de vídeo del detalle | `.detail-player` |
| `VodDetailBottomScrollView` | Relacionados/episodios | `.detail-bottom` |
| `LeftkeybordView` | Teclado en pantalla | `.search-keyboard` |
| `MarqueTextView` | Texto con marquesina | `.detail-btn` (marquesina pendiente) |
| `MFInfoBar` | Barra del reproductor VOD | **pendiente** (se usa la live) |
| `AutoRelativeLayout` / `AutoLinearLayout` | Posicionamiento AutoLayout | `position:absolute` + px calculados |
| `selector_*` / `shape_*` | Estados de foco y fondos | `.is-focused`, `.is-selected`, degradados |

---

## 9. Recursos por carpeta

| Carpeta | Archivos | Contenido |
| --- | --- | --- |
| `assets/original/welcome` | 19 | fondo, 16 fotogramas de carga, icono, fuente |
| `assets/original/home` | 39 | pestañas, notificaciones, live, gratis |
| `assets/original/vod` | 23 | pósters, etiquetas, iconos de detalle, foco de ventana |
| `assets/original/search` | 21 | teclado, filtros, acciones |
| `assets/original/settings` | 26 | funciones, interruptores, radio, iconos de menú |
| `assets/original/common` | 13 | placeholders, pistas de teclas, flechas |

Detalle completo y procedencia: `INVENTARIO_RECURSOS.md`.

---

## 10. Recursos dinámicos (no inventados)

Se representan con placeholder original o se dejan pendientes:

- pósteres y fondos de películas (catálogo/backend),
- logo de canal y logos de la lista live,
- iconos y orden de las pestañas,
- logo de la home,
- QR de feedback y de cuenta,
- avatares de perfil.

---

## 11. Enlaces de prueba

```
?screen=welcome
?screen=home&tab=0..6
?screen=detail&vod=1
?screen=search&q=sintel
?screen=settings&panel=0..5
?screen=player
?screen=player&channels=1
?screen=player&mode=vod&vod=1
```

Parámetros adicionales: `ch` (canal), `focus` (selector CSS a enfocar).
