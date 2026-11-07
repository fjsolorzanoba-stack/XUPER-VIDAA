# Inventario de recursos originales

Procedencia: `analysis/xuppertv/decoded/resources/` (exportación JADX del APK
`com.xuper.netxxus` 4.34.4, SHA-256
`e70ce12782eec9f43393b69d88e2d243d8812ae38d2acf08856baa877c1ab856`).
Copia de trabajo: `webos/fidelity/assets/original/`.

Solo se reutilizan recursos del APK autorizado. No hay iconos, pósteres ni
tipografías inventadas. Los elementos generados en runtime (pósteres, logos de
canal, QR, iconos de pestaña) se representan con el placeholder original o se
marcan como pendientes.

Resumen: **141 archivos** en 6 carpetas (13 common, 39 home, 21 search,
26 settings, 23 vod, 19 welcome — incluye la fuente y el fondo webp).

---

## 1. Welcome — 19 archivos

Origen: `res/mipmap-xhdpi/`, `res/drawable-*`, `assets/`.

| Archivo | Dimensiones | Uso |
| --- | --- | --- |
| `wind_bg.webp` | 3840×2160 (webp) | Fondo de `activity_welcome.xml`; el CSS lo escala a 1920×1080 |
| `icon_app.png` | 1024×1024 | Icono de app (no visible en welcome) |
| `img_welcome_loading1.png` … `16.png` | 333×30 | 16 fotogramas del indicador de carga |
| `amazingkids.otf` | fuente | Solo para artwork infantil; no se usa como fuente de UI |

`amazingkids.otf` y `wind_bg.webp` no son imágenes raster; el resto son PNG.

---

## 2. Home — 39 archivos

Origen: `res/drawable-*`, `res/mipmap-*`.

| Archivo | Dimensiones | Uso |
| --- | --- | --- |
| `bg_home_live_divider.png` | 500×1 | Separador de la lista de canales |
| `home_live_btn_all_normal/focus.png` | 80×80 | Botón rápido "Todos" |
| `home_live_btn_fav_normal/focus.png` | 80×80 | Botón rápido "Favoritos" |
| `home_live_btn_search_normal/focus.png` | 80×80 | Botón rápido "Buscar" |
| `home_live_channel_up.png` | 25×18 | Flecha superior de la lista |
| `home_live_channel_down.png` | 25×18 | Flecha inferior de la lista |
| `home_live_channel_play_normal/focus.png` | 18×25 | Glifo de reproducción del canal actual |
| `icon_category_adult/anime/national/show/sports.png` | 45×45 | Iconos de categorías (menú de categorías, fuera de alcance) |
| `icon_free_live.png` | 36×32 | Cabecera "En vivo" de GRATIS |
| `icon_free_movie.png` | 37×32 | Cabecera "Películas" de GRATIS |
| `icon_free_tv.png` | 34×32 | Cabecera TV (no usada en esta pasada) |
| `icon_free_more.png` | 98×100 | Tarjeta "Más" |
| `icon_full_screen.png` | 77×77 | Icono de pantalla completa del info bar live |
| `icon_home_app.png` | 220×220 | Logo de app (fallback; el logo real es dinámico) |
| `icon_home_personal.png` | 36×36 | Acceso a perfil |
| `icon_home_search.png` | 36×36 | Acceso a búsqueda |
| `icon_live_free_placeholder.png` | 250×200 | Placeholder de tile live en GRATIS |
| `icon_navigation_title_kids.png` | 117×47 | Título KIDS (dinámico en la APK) |
| `icon_navigation_title_uhd.png` | 88×49 | Título 4K UHD (dinámico en la APK) |
| `icon_notify_message.png` | 60×60 | Notificación "Mensaje" normal |
| `icon_notify_message_focus.png` | 24×28 | Notificación "Mensaje" foco |
| `icon_notify_personal.png` | 26×28 | Notificación "Perfil" normal |
| `icon_notify_personal_focus.png` | 26×28 | Notificación "Perfil" foco |
| `icon_notify_records.png` | 60×60 | Notificación "Récord" normal |
| `icon_notify_records_focus.png` | 29×28 | Notificación "Récord" foco |
| `icon_notify_search.png` | 28×28 | Acción buscar normal |
| `icon_notify_search_focus.png` | 28×28 | Acción buscar foco |
| `icon_notify_setting.png` | 28×29 | Acción ajustes normal |
| `icon_notify_setting_focus.png` | 28×29 | Acción ajustes foco |
| `ic_live_channel_function.png` | 32×32 | Función de canal |
| `live_channel_default_icon.png` | 150×80 | Placeholder de logo de canal |

---

## 3. VOD / Detalle — 23 archivos

Origen: `res/drawable-*`, `res/mipmap-*`.

| Archivo | Dimensiones | Uso |
| --- | --- | --- |
| `icon_detail_display.png` | 44×44 | Botón "Pantalla completa" (variante) |
| `icon_detail_download.png` | 40×40 | Descarga |
| `icon_detail_downloading.png` | 40×40 | Descarga en curso |
| `icon_detail_favorite.png` | 49×49 | Favorito |
| `icon_detail_favorited.png` | 49×49 | Favorito activo |
| `icon_detail_fullscreen.png` | 49×49 | Botón "Pantalla completa" |
| `icon_detail_not_vip.png` | 53×53 | Aviso no VIP |
| `icon_detail_not_vip_unfocus.png` | 53×53 | Aviso no VIP sin foco |
| `icon_detail_quality.png` | 57×44 | Calidad |
| `icon_detail_subscribe.png` | 49×49 | Suscribirse |
| `icon_detail_subscribed.png` | 49×49 | Suscrito |
| `icon_detail_subtitle_audio.png` | 63×43 | Audio/subtítulos |
| `icon_purchase_magis_logo.png` | 640×640 | Logo de compra (fuera de alcance) |
| `icon_ts_tip.png` | 38×37 | Aviso TS |
| `poster_focus.9.png` | 49×49 | Halo de foco (póster) |
| `poster_focus_nohalo.9.png` | 25×25 | Borde dorado 2 px (`sel_poster_nohalo`) |
| `player_window_focus.9.png` | 25×25 | Borde dorado 2 px de `VodPlayerWindow` enfocado |
| `vod_icon_tag_4k.png` | 58×36 | Etiqueta 4K |
| `vod_icon_tag_new.png` | 58×28 | Etiqueta NEW |
| `vod_icon_tag_score_bg.png` | 48×28 | Fondo de puntuación |
| `vod_icon_tag_special.png` | 120×118 | Etiqueta especial |
| `vod_icon_tag_subtitle.png` | 38×28 | Etiqueta subtítulos |
| `vod_icon_tag_ts.png` | 51×52 | Etiqueta TS |

---

## 4. Búsqueda — 21 archivos

Origen: `res/drawable-*`, `res/mipmap-*`.

| Archivo | Dimensiones | Uso |
| --- | --- | --- |
| `icon_category_filter_f/n.png` | 30×28 | Filtro normal/foco |
| `icon_category_search_f/n.png` | 27×29 | Búsqueda normal/foco |
| `icon_search_clear.png` / `_focused.png` | 42×31 | Borrar texto |
| `icon_search_delete.png` / `_focused.png` | 30×36 | Borrar carácter |
| `icon_search_feedback.png` | 40×36 | Feedback |
| `icon_search_space.png` / `_focused.png` | 52×22 | Tecla espacio |
| `ic_vod_search_123.png` / `_default.png` | 61×27 | Conmutador numérico |
| `ic_vod_search_abc.png` / `_default.png` | 74×27 | Conmutador alfabético |
| `ic_vod_search_clear.png` / `_default.png` | 34×37 | Limpiar |
| `ic_vod_search_delete.png` / `_default.png` | 42/43×33 | Borrar |
| `ic_vod_search_space.png` / `_default.png` | 78×12 | Espacio |

---

## 5. Ajustes — 26 archivos

Origen: `res/drawable-*`, `res/mipmap-*`.

| Archivo | Dimensiones | Uso |
| --- | --- | --- |
| `icon_function_about.png` | 104×105 | Función "Sobre nosotros" |
| `icon_function_clean.png` | 88×109 | Limpiar caché |
| `icon_function_cr_switch_close/open.png` | 82/104×96 | Control parental |
| `icon_function_feedback.png` | 97×99 | Feedback |
| `icon_function_help_center.png` | 98×99 | Centro de ayuda |
| `icon_function_lock.png` | 101×109 | Bloqueo |
| `icon_function_play_setting.png` | 106×99 | Configuración de reproducción |
| `icon_function_upgrade.png` | 104×105 | Actualización |
| `icon_person_*_normal.png` | 36×36 | Iconos de menú personal (11 variantes) |
| `icon_subtitle_switch_off.png` | 96×38 | Interruptor subtítulos OFF |
| `icon_subtitle_switch_on.png` | 96×38 | Interruptor subtítulos ON |
| `icon_website.png` | 33×33 | Sitio web |
| `icon_whatsapp.png` | 59×60 | WhatsApp |
| `vod_email_icon.png` | 29×22 | Correo |
| `vod_feedback_radio_checked.png` | 24×24 | Radio/triángulo de opción seleccionada |

---

## 6. Comunes — 13 archivos

Origen: `res/drawable-*`.

| Archivo | Dimensiones | Uso |
| --- | --- | --- |
| `bg_placehoder_vertical.png` | 823×536 | Placeholder vertical de póster |
| `bg_vod_more.png` | 375×551 | Fondo de tarjeta "Más" |
| `focus_home_navigation.9.png` | 150×68 | Foco de navegación (referencia) |
| `icon_back_state.png` | 68×68 | Atrás |
| `icon_error.png` | 68×68 | Error |
| `icon_info_back/fast/infobar/menu/ok.png` | 42×24 | Pistas de teclas del reproductor |
| `icon_right_arrow.png` | 24×43 | Flecha |
| `ic_no_person_placeholder.png` | 113×135 | Placeholder de persona |
| `img_thubnail_default.png` | 420×236 | Fondo/placeholder de vídeo |

---

## 7. Layouts XML usados como fuente de verdad

Ruta base: `analysis/xuppertv/decoded/resources/res/layout/`.

| Pantalla | Layouts |
| --- | --- |
| Welcome | `activity_welcome.xml` |
| Home | `activity_home.xml`, `item_tab_recyclerview.xml`, `fragment_home_live.xml`, `layout_home_channel_item.xml` |
| Destacados / Películas / Series / Kids / UHD | `fragment_featured.xml`, `fragment_movies.xml`, `fragment_series.xml`, `fragment_kids.xml`, `fragment_uhd.xml` |
| Gratis | `fragment_freefragment.xml`, `item_free_live_area_outer.xml`, `item_free_vod_area_outer.xml`, `item_free_area_channel_list.xml`, `item_free_area_vod_list.xml` |
| Detalle | `activity_voddetails.xml`, `layout_vod_detail_menu_panel.xml`, `layout_vod_detail_left_panel.xml`, `layout_vod_detail_bottom_panel.xml`, `item_vod_programs.xml` |
| Búsqueda | `activity_vodsearch.xml`, `layout_search_feedback.xml` |
| Ajustes | `activity_setting.xml`, `fragment_playsetting.xml`, `fragment_cr_switch.xml`, `fragment_parentlock.xml`, `fragment_feedback.xml`, `fragment_upgrade.xml`, `fragment_aboutus.xml` |
| Reproductor live | `layout_live_infobar.xml`, `layout_live_player_controller.xml` |
| Reproductor VOD | `fragment_vod_player.xml`, `layout_mf_infobar.xml` (pendiente) |

## 8. Valores usados

Ruta base: `analysis/xuppertv/decoded/resources/res/`.

- `values/colors.xml`, `values-es/strings.xml`
- `values/dimens.xml`, `values/styles.xml`
- `values/arrays.xml` (`play_setting_play_ratio`)

## 9. Recursos dinámicos (no incluidos)

Estos elementos los sirve el backend en la APK y **no** existen como recurso
estático. Se representan con placeholder o se marcan como pendientes:

- pósteres y fondos de películas,
- logo de canal y logos de la lista live,
- iconos y orden de las pestañas (`xa.l.d(context, title)`),
- logo de la home (`mTextAppName` está oculto; se usa fallback),
- QR de feedback y de cuenta,
- avatares de perfil.

## 10. Fuente tipográfica

La APK no incluye Roboto ni una fuente de UI propia. Usa la fuente del sistema
(`sans-serif`) y `assets/amazingkids.otf` solo para artwork infantil. El port
usa la pila `Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif`. La
métrica exacta en webOS 4 puede diferir; está anotado en
`DIFERENCIAS_PENDIENTES.md`.
