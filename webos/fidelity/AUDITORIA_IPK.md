# Auditoría del IPK y del estado de empaquetado

Fecha de auditoría: 2026-10-25. Alcance: árbol `webos/fidelity`, APK de origen
en `analysis/xuppertv/apk/Xuper.apk` y el único IPK presente en el árbol.

> **Conclusión corta:** hay dos IPK. El de `webos/fidelity/` es un artefacto
> **anterior** que **no** contiene la reconstrucción. El de `dist/` es la
> **build 1.4.1** generada a petición del usuario, con el port completo,
> FFmpeg incluido y verificada en la TV; mantiene las diferencias de
> `DIFERENCIAS_PENDIENTES.md`.

---

## 0. Estado actual: 1.4.1 (FFmpeg incluido, instalación en un paso)

| Dato | Valor |
| --- | --- |
| Archivo | `dist/com.webosflux.xuptertv.fidelity_1.4.1_all.ipk` |
| Tamaño | 22 429 678 bytes (21,4 MiB) |
| SHA-256 | `EB24581DA813684E12B4C7769EA3F6B475E153E61DEF98E8A523C8E382A8D430` |
| App | 1.4.1 |
| Servicio | 1.4.1 |
| FFmpeg | 7.0.2 armhf estático (GPLv3), `usr/palm/services/.../ffmpeg`, modo 0755 |

El binario FFmpeg viaja **dentro del IPK**. No hace falta copiarlo por SSH ni
ejecutar `chmod` a mano: `ares-package` en Windows guarda los ficheros como
0666, por lo que el build pasa por `tools/fix_ipk_modes.py`, que reescribe
`data.tar.gz` y deja `ffmpeg` en 0755. Instalado y verificado en la TV
(43LM6300PDB, webOS 4.10.0): el servicio responde `relayAvailable: true` y el
relay produjo un MP4 fragmentado válido (`ftypiso5…moov`) a partir del TS HEVC
real.

Procedencia y restauración del binario:

| Dato | Valor |
| --- | --- |
| Build | FFmpeg 7.0.2 armhf estático (GPLv3) |
| Archivo fuente | `tools/vendor/ffmpeg-7.0.2-armhf-static.tar.xz` (16 MB, en git) |
| SHA-256 del archivo | `7D41F558CB1F3395B313F8CEABED78B3731C79A0962ABF405EBB5CD393E93991` |
| SHA-256 del binario | `0AFBA4A11110E6E402053E0FC14C33A7EB207D7A588688AE87DBA471A0F06C71` |
| Licencia | `ffmpeg-LICENSE.txt` (GPLv3) junto al binario |

El ejecutable extraído está en `.gitignore` (31,8 MB); `tools/setup-ffmpeg.ps1`
lo restaura desde el archivo vendorizado y verifica ambos SHA-256.
`tools/build-ipk.ps1` lo invoca solo si falta, así que un clon limpio compila
sin descargas externas.

Build en un paso:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-ipk.ps1
```

> El SHA-256 de la tabla corresponde al artefacto instalado. Una
> reconstrucción puede cambiar el hash por las marcas de tiempo internas del
> tar, no por el contenido (mismo código, mismo FFmpeg, mismos modos).

Instalación en la TV de pruebas:

```powershell
node tools\tv_deploy.mjs dist\com.webosflux.xuptertv.fidelity_1.4.1_all.ipk
```

`ares-install` sube el IPK pero falla después en su comprobación remota
(`Unable to exec`). `tv_deploy.mjs` hace la subida por SFTP y llama al servicio
Luna de instalación, que sí completa: `ipk parsing → app closing → installing →
installed`. Verificado en la 43LM6300PDB.

> Nota de red: la TV de pruebas está en `192.168.1.18`. `192.168.1.1` es el
> router (responde a ping pero no expone SSH); no es la TV.

---

## 1. APK de origen (no modificado)

| Dato | Valor |
| --- | --- |
| Archivo | `analysis/xuppertv/apk/Xuper.apk` |
| SHA-256 | `e70ce12782eec9f43393b69d88e2d243d8812ae38d2acf08856baa877c1ab856` |
| Paquete | `com.xuper.netxxus` |
| versionName | `4.34.4` |
| versionCode | `43404` |
| Clases | 9045 |
| Recursos | 2473 |
| Motor de vídeo | `IjkVideoView` + `IjkMediaPlayer` (sin MediaDrm/Widevine/ExoPlayer detectado) |

El APK no se ha ejecutado, parcheado ni vuelto a firmar. Todo el análisis es
estático (JADX/REA + exportación de recursos).

---

## 2. IPK antiguo presente en el árbol

| Dato | Valor |
| --- | --- |
| Archivo | `webos/fidelity/com.webosflux.xuptertv.fidelity_1.0.0_all.ipk` |
| Tamaño | 11 996 bytes |
| SHA-256 | `B932A03B61DC47619224F668FEFB100D8FE7B59F5FA339F843A98AC60E11550E` |
| Package | `com.webosflux.xuptertv.fidelity` |
| Version | `1.0.0` |
| Architecture | `all` |
| Formato | webOS Package Format v2 |

Contenido real del IPK:

```
usr/palm/applications/com.webosflux.xuptertv.fidelity/
  appinfo.json                         371 B
  index.html                         2 672 B
  css/style.css                      4 143 B
  js/app.js                          9 109 B
  images/icon.png                      800 B
  images/icon-large.png              1 333 B
  assets/*.xml.bak                  ~9,8 KB
  README_FIDELITY.md / FASE4_PRUEBAS.md / player.md
usr/palm/packages/com.webosflux.xuptertv.fidelity/packageinfo.json
```

### 2.1 Discrepancia con el código actual

| Archivo | Dentro del IPK | Código actual |
| --- | --- | --- |
| `index.html` | 2 672 B | 4 132 B |
| `css/style.css` | 4 143 B | 48 657 B |
| `js/app.js` | 9 109 B | 75 517 B |
| `config/api.js` | no existe | 1 900 B |
| `data/catalog.js` | no existe | 4 555 B |
| `assets/original/` | no existe | 141+ archivos |
| `assets/catalog/` | no existe | 6 pósteres |

Por tanto, el IPK **no** incluye: catálogo, pipeline de películas, recursos
originales decodificados, pantallas de fidelidad, motor de foco nuevo, barra de
reproductor ni las correcciones de esta pasada.

### 2.2 Riesgo de distribución

- El IPK antiguo muestra una interfaz de prototipo, no la reconstrucción.
- No tiene `config/api.js`, así que no puede cargar el catálogo.
- No tiene `assets/original/`, así que no puede reproducir la estética real.
- Distribuirlo daría una impresión falsa del estado del port.

**Acción:** no publicar este IPK antiguo. Usar la build de prueba de la
sección 3 para instalar en el televisor.

---

## 3. IPK de prueba generado (1.1.1) — histórico

> Sección histórica. La build vigente es la 1.4.1 de la sección 0; se conserva
> este registro porque documenta la primera verificación del empaquetado.

Generado con `ares-package` 3.2.6 a petición explícita del usuario para
instalación manual en el televisor.

| Dato | Valor |
| --- | --- |
| Archivo | `dist/com.webosflux.xuptertv.fidelity_1.1.1_all.ipk` |
| Tamaño | 2 266 776 bytes (2,16 MB) |
| SHA-256 | `B3E7C1F0A283A1B97E4A85C8F37910E71D63EA97D2DFF58A35B5D3D971122953` |
| Package | `com.webosflux.xuptertv.fidelity` |
| Version | `1.1.1` |
| Architecture | `all` |
| Comando | `ares-package webos\fidelity -o dist -e shots -e "*.md"` |

Contenido: **159 archivos**, 2,46 MB instalados.

| Bloque | Contenido |
| --- | --- |
| Código | `index.html`, `css/style.css`, `js/app.js` |
| Catálogo | `config/api.js`, `data/catalog.js`, `assets/catalog/*.jpg` (6) |
| Recursos originales | `assets/original/` (141 archivos) |
| Iconos | `images/icon.png` 80×80, `images/icon-large.png` 130×130 |

Excluidos a propósito: `shots/` (16 MB), los 10 `.md` y el IPK antiguo.

### 3.1 Verificación de la build

Se extrajo el IPK (`control.tar.gz` + `data.tar.gz`) y se sirvió la copia
empaquetada en local:

- Las **42** URLs de `url(...)` del CSS resuelven; 0 archivos faltantes.
- 9 pantallas abiertas (`welcome`, `home` destacados/TV/gratis, `detail`,
  `search`, `settings`, `player` live y VOD): **0 imágenes rotas, 0 errores de
  consola**.
- Catálogo: `__xuper.vod.length = 6`, `api.source = 'bundled'`.
- `ares-package -c` sobre el árbol: “no problems detected”.
- Barra del reproductor: se oculta sola a los **5 s** de inactividad, reaparece
  con una flecha y se alterna con OK (probado en la copia empaquetada).
- `ares-package` **minifica solo el JS**: `js/app.js` pasa de 76 639 B a
  39 273 B; `style.css` e `index.html` se copian sin cambios. La build
  minificada se probó de nuevo: 0 errores de consola.

### 3.2 Límites de esta build

- No es una release: faltan `MFInfoBar` de VOD, marquesina, episodios,
  contraseña parental, paneles Account/Purchase y la referencia visual de
  Android TV.
- El auto-ocultado usa **5 s** porque el recurso decodificado no expone la
  constante; hay que medirlo en la app real (WSA) y ajustarlo si difiere.
- El catálogo es la muestra local de 6 películas abiertas, no el de XuperTV.
- La reproducción en webOS 4 (códecs, HLS, CORS, certificados) **no** está
  validada en el televisor.
- No se ha instalado desde este equipo: la instalación la hará el usuario.

---

## 4. Cumplimiento

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| No eludir DRM/autenticación | Cumple | No hay claves, licencias, tokens ni interceptación TLS. `mode:'xuper'` exige sesión emitida por el proveedor y no la fabrica. |
| No extraer endpoints/credenciales | Cumple | El host/sesión de XuperTV se resuelve en runtime en Android; no se ha recuperado ni codificado. |
| No ejecutar/modificar el APK | Cumple | Solo análisis estático y exportación de recursos. |
| No instalar en el televisor sin autorización | Cumple | El IPK se generó a petición del usuario; **no** se ha instalado desde este equipo. |
| Recursos originales con procedencia | Cumple | `assets/original/` + `INVENTARIO_RECURSOS.md`. |
| No inventar visuales no verificables | Parcial | Las piezas sin referencia están marcadas en `DIFERENCIAS_PENDIENTES.md` como *pendiente de referencia visual*. |
| Comparación visual 1920×1080 | Parcial | Hecha contra geometría XML, **no** contra capturas verificables de Android TV. Ver `COMPARACION_VISUAL.md`. |
| README con estado real | Cumple | `README.md` y `README_FIDELITY.md` actualizados. |

---

## 5. Evidencia y trazabilidad

| Evidencia | Ruta |
| --- | --- |
| SHA-256 del APK | `analysis/xuppertv/reports/apk_sha256.txt` |
| Informes 01–07 | `analysis/xuppertv/reports/` |
| Recursos decodificados | `analysis/xuppertv/decoded/resources/` |
| Recursos reutilizados | `webos/fidelity/assets/original/` |
| Capturas 1920×1080 | `webos/fidelity/shots/` |
| Contrato de catálogo | `webos/fidelity/INTEGRACION_PELICULAS.md` |

---

## 6. Veredicto

- **Código fuente:** estado de reconstrucción avanzado, verificable en navegador.
- **IPK antiguo:** obsoleto respecto al código; no acredita el trabajo actual.
- **IPK de prueba 1.1.1:** contiene el port completo, verificado en local; apto
  para instalar y probar en el LG 43LM6300PDB.
- **Release final:** no. Faltan las diferencias de
  `DIFERENCIAS_PENDIENTES.md` y la comparación con referencia visual.
- **Fidelidad:** no se afirma 100 %. La comparación es derivada de XML; falta
  referencia visual verificable de Android TV.
