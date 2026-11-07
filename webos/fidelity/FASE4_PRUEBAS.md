# Fase 4 — Pruebas y empaquetado (estado real)

## 1. Appinfo

```json
{
  "id": "com.webosflux.xuptertv.fidelity",
  "version": "1.1.1",
  "vendor": "webosflux",
  "type": "web",
  "main": "index.html",
  "title": "XuperTV",
  "icon": "images/icon.png",
  "largeIcon": "images/icon-large.png",
  "resolution": "1920x1080",
  "bgColor": "#000000",
  "bgImage": "",
  "spinnerOnLaunch": false,
  "uiRevision": 2,
  "requiredPermissions": []
}
```

## 2. Compatibilidad Chromium 53

- HTML/CSS/JS sin módulos ES6, sin `async/await`, sin `fetch`.
- Transporte de catálogo con `XMLHttpRequest`.
- Sin dependencias externas.
- Animaciones y foco con clases CSS y transiciones básicas.

## 3. Pruebas realizadas (PC, Chrome headless 1920×1080)

- [x] Arranque y bienvenida con animación de carga.
- [x] Inicio con 7 pestañas y mosaicos de pósters.
- [x] TV en vivo demo: lista, fila enfocada, info y botones rápidos.
- [x] Gratis: cabeceras y rejilla.
- [x] Detalle VOD con sinopsis, botones y relacionados.
- [x] Búsqueda: populares, resultados y estado vacío.
- [x] Ajustes: 6 paneles y foco del menú.
- [x] Reproductor live y panel de canales.
- [x] Reproductor VOD con `<video>` y `streamUrl`.
- [x] Catálogo: `window.__xuper.vod.length === 6`,
      `window.__xuper.api.source === 'bundled'`.
- [x] Búsqueda `q=sintel` devuelve 1 resultado.
- [x] `?screen=player&mode=vod&vod=1` carga el MP4 de *Sintel*.
- [x] Capturas de todas las pantallas en `shots/`.
- [x] Medición de geometría contra los layouts
      (`COMPARACION_VISUAL.md`).

## 4. Pruebas pendientes

### Referencia visual

- [ ] Comparación píxel a píxel contra XuperTV en Android TV.
- [ ] Ajuste de métricas tipográficas.

### Televisor (requiere autorización)

- [ ] Instalación vía Developer Mode.
- [ ] Navegación con mando LG real.
- [ ] Renderizado 1080p sin overscan.
- [ ] Reproducción MP4/HLS en webOS 4.
- [ ] Rendimiento con catálogo grande.

### Funcionalidad

- [ ] Barra VOD `MFInfoBar`.
- [ ] Marquesina de botones del detalle.
- [ ] Episodios de series.
- [ ] Contraseña parental.
- [ ] Paneles Account/Purchase.
- [ ] `LiveFreeActivity` como pantalla propia.

## 5. Empaquetado

Build de prueba generada a petición del usuario:

| Dato | Valor |
| --- | --- |
| Archivo | `dist/com.webosflux.xuptertv.fidelity_1.1.1_all.ipk` |
| Tamaño | 2 266 776 B (2,16 MB) |
| SHA-256 | `B3E7C1F0A283A1B97E4A85C8F37910E71D63EA97D2DFF58A35B5D3D971122953` |
| Comando | `ares-package webos\fidelity -o dist -e shots -e "*.md"` |

- 159 archivos: código, `config/`, `data/`, `assets/original/` (141) y
  `assets/catalog/` (6 pósteres).
- Verificada sirviendo la copia empaquetada: 9 pantallas, 0 errores de consola,
  0 imágenes rotas, catálogo con 6 películas.
- `ares-package -c` sobre el árbol: “no problems detected”.

El IPK de `webos/fidelity/`
(`com.webosflux.xuptertv.fidelity_1.0.0_all.ipk`, 11 996 B, SHA-256
`B932A03B61DC47619224F668FEFB100D8FE7B59F5FA339F843A98AC60E11550E`) sigue
siendo un artefacto anterior con el prototipo; no debe distribuirse.

Ver `AUDITORIA_IPK.md`.

## 6. Condición para una release

La build 1.1.1 es solo de prueba. Para declararla release:

1. cerrar o aceptar explícitamente la referencia visual,
2. reconstruir `MFInfoBar`,
3. probar en el LG 43LM6300PDB,
4. actualizar capturas y README.

Checklist completo en `PLAN_CORRECCION.md`.

## 7. Riesgos conocidos

| Riesgo | Impacto |
| --- | --- |
| Sin referencia visual | No se puede afirmar fidelidad total |
| Códec/HLS no validado en TV | El VOD podría no reproducir |
| Catálogo real no disponible | Solo se demuestra el pipeline con muestra |
| IPK antiguo | Distribuirlo daría una impresión falsa |
| Build de prueba 1.1.1 | No es release: faltan diferencias documentadas |
| Autenticación del TV | Bloquea la instalación desde este equipo |
