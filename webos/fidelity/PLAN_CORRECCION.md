# Plan de corrección

Plan para cerrar las diferencias de `DIFERENCIAS_PENDIENTES.md` sin afirmar
fidelidad antes de tener evidencia. Se generó una **build de prueba 1.1.1**
(`dist/`) a petición del usuario; la **release final** no se empaqueta hasta
completar la fase 5.

---

## 0. Regla de trabajo

Cada cambio visual sigue este ciclo:

1. Leer el layout/recurso de origen.
2. Convertir la medida (1 dp = 1.5 px; `px` crudo = 1 px).
3. Implementar en `css/style.css` / `js/app.js`.
4. Capturar a 1920×1080 en `shots/`.
5. Medir con el script de `COMPARACION_VISUAL.md`.
6. Anotar el resultado (y lo que siga pendiente) en
   `COMPARACION_VISUAL.md` / `DIFERENCIAS_PENDIENTES.md`.

Un cambio no se marca como cerrado si solo "se ve bien": debe tener medida o
referencia.

---

## Fase 1 — Referencia visual (bloqueante)

**Objetivo:** sustituir "derivado del XML" por "comparado con el original".

| Tarea | Entregable | Criterio de aceptación |
| --- | --- | --- |
| 1.1 Capturar XuperTV en un dispositivo/emulador autorizado | Set de PNG 1920×1080 de welcome, home (7 pestañas), detalle, búsqueda, ajustes y reproductor | Mismo encuadre y resolución que `shots/` |
| 1.2 Emparejar capturas | `shots/reference/<pantalla>.png` | Nombres 1:1 con las del port |
| 1.3 Comparar lado a lado | Tabla de diferencias por pantalla | Cada diferencia con coordenada y recurso |
| 1.4 Ajustar A1–A9 | CSS/JS corregido | Medida dentro de ±1 px o diferencia justificada |

Sin esta fase no se puede afirmar fidelidad total. Si no hay dispositivo
autorizado, el estado sigue siendo "geometría verificada, referencia pendiente".

---

## Fase 2 — Tipografía y métricas de texto

**Objetivo:** eliminar las diferencias de altura de caja (A2/A3) y de ancho de
texto.

| Tarea | Detalle |
| --- | --- |
| 2.1 Inventariar `textSize`, `includeFontPadding`, `lineSpacing` de los layouts usados | Tabla por pantalla |
| 2.2 Elegir pila de fuentes | `sans-serif` real de webOS 4 o fuente métricamente equivalente |
| 2.3 Fijar alturas de línea | Igualar `wrap_content` con `line-height` medido |
| 2.4 Revisar apilados | Welcome (nombre/versión/carga), detalle (título/meta/sinopsis), ajustes |
| 2.5 Verificar truncados | `ellipsize=END` en menú de ajustes; `singleLine` en tips |

Criterio: los bloques de texto caen en la misma coordenada que la referencia
(±1 px) y los truncados coinciden.

---

## Fase 3 — Reproductor VOD (`MFInfoBar`)

**Objetivo:** dejar de reutilizar la barra live en VOD (A18).

| Tarea | Layout / recurso | Detalle |
| --- | --- | --- |
| 3.1 Leer `layout_mf_infobar.xml` | — | Póster `150×220` en `80/…`, nombre `36px` top `450`, seekbar bottom `140`, fila de teclas, `PlaySettingView` |
| 3.2 Implementar la barra | `.mf-*` nuevo | No reutilizar `.pi-*` |
| 3.3 Conectar VOD | `openPlayer('vod')` | Mostrar póster, nombre, progreso y tiempo |
| 3.4 Conectar live | `openPlayer('live')` | Mantener `layout_live_infobar.xml` |
| 3.5 Verificar | `shots/player-vod.png` | Barra VOD distinta de la live |

Criterio: en VOD se ve la barra de `MFInfoBar`, no la live; el botón de ajustes
de reproducción abre su panel.

---

## Fase 4 — Detalle y ajustes pendientes

| Tarea | Diferencia | Entregable |
| --- | --- | --- |
| 4.1 Marquesina de botones | A10 | Animación solo cuando el texto excede `129px` |
| 4.2 Episodios/temporadas | A11 | Lista desde `layout_vod_detail_bottom_panel.xml` |
| 4.3 Chips/director/actores | B9 | Pantalla destino o estado "no disponible" explícito |
| 4.4 Contraseña parental | B1/B2 | Entrada numérica, validación, diálogo de cambio |
| 4.5 Interruptor adulto | B3 | Persistencia y bloqueo |
| 4.6 Feedback/ayuda | B4 | Centro de ayuda o enlace autorizado |
| 4.7 Upgrade/caché | B5/B6 | Comprobación y borrado reales |
| 4.8 Búsqueda | B7/B8 | Teclado numérico completo y filtros |

Criterio: ninguna acción enfocable queda "muerta" sin explicación visible.

---

## Fase 5 — Pruebas en el televisor y empaquetado

**Objetivo:** validar en el LG 43LM6300PDB (webOS 4.10.2-29, Chromium 53).

| Tarea | Detalle |
| --- | --- |
| 5.1 Habilitar Developer Mode / clave | Requiere autorización del usuario |
| 5.2 Instalar build de prueba | `ares-install` con el dispositivo emparejado |
| 5.3 Navegar con mando real | D-pad, OK, Back, colores si aplica |
| 5.4 Probar VOD | MP4 progresivo y HLS; medir arranque y errores |
| 5.5 Probar live | Flujo real autorizado o demo |
| 5.6 Revisar 1920×1080 en panel | Sin overscan, sin texto cortado |
| 5.7 Capturar en TV | Fotos/PNG para comparar con `shots/` |

Criterio: la app arranca, navega, reproduce y vuelve sin errores; las capturas
del TV coinciden con las de escritorio.

**Solo después de 5.7 se empaqueta el IPK definitivo.**

---

## Fase 6 — Empaquetado y publicación

Checklist antes de generar la **release** (la build de prueba ya existe):

- [ ] Fase 1 cerrada o aceptada explícitamente como pendiente.
- [ ] Fase 3 cerrada (`MFInfoBar`).
- [x] `config/api.js` con el modo correcto (sin secretos en el repo).
- [x] `data/catalog.js` presente (muestra local).
- [x] `assets/original/` incluido.
- [x] `appinfo.json` con id/versión definitivos (`1.1.1`).
- [x] `requiredPermissions` mínimos y justificados.
- [ ] Pruebas 5.x documentadas.
- [x] `README.md` con estado real.
- [x] Capturas finales en `shots/`.

Comando usado para la build de prueba:

```powershell
ares-package webos\fidelity -o dist -e shots -e "*.md"
```

Resultado: `dist/com.webosflux.xuptertv.fidelity_1.1.1_all.ipk`, 2 266 776 B,
SHA-256 `B3E7C1F0A283A1B97E4A85C8F37910E71D63EA97D2DFF58A35B5D3D971122953`.

**No publicar como release todavía.**

---

## Prioridad recomendada

| Prioridad | Tareas | Motivo |
| --- | --- | --- |
| P0 | 1.1–1.4 | Sin referencia no hay fidelidad demostrable |
| P1 | 3.1–3.5 | Es la diferencia visual más grande |
| P1 | 2.1–2.5 | Afecta a todas las pantallas |
| P2 | 4.1–4.4 | Detalle y control parental |
| P2 | 5.1–5.4 | Valida el objetivo real (TV) |
| P3 | 4.5–4.8 | Funciones secundarias |
| P3 | 6.x | Publicación |

---

## Qué **no** se va a hacer

- Extraer tokens/sesiones del APK o del dispositivo Android.
- Interceptar TLS para recuperar el host o la sesión.
- Eludir DRM, geobloqueo o control parental.
- Inventar pósteres, logos, iconos de pestaña o QR.
- Declarar 100 % de fidelidad sin la fase 1.
- Publicar el IPK antiguo como si fuera el port actual.

---

## Estado de este plan

| Fase | Estado |
| --- | --- |
| 1 Referencia visual | Bloqueada (sin capturas autorizadas) |
| 2 Tipografía | Parcial (convención aplicada; falta referencia) |
| 3 `MFInfoBar` | Pendiente |
| 4 Detalle/ajustes | Parcial (UI sí, acciones no) |
| 5 TV | Bloqueada (autenticación) |
| 6 Empaquetado | Build de prueba 1.1.1 generada; release final pendiente |
