<#
  Crea el ZIP que se comparte con gente que no sabe nada de informatica.

  Dentro queda todo lo necesario para instalar con doble clic:

    XuperTV-instalador-<version>/
      INSTALAR-XUPERTV.bat      <- el usuario hace doble clic aqui
      instalar-tv.ps1
      guia-instalacion.html     <- guia con dibujos (se abre sin internet)
      capturas/                 <- imagenes de la guia
      com.webosflux...ipk       <- la aplicacion
      LEEME.txt

  Uso:
    powershell -ExecutionPolicy Bypass -File tools/make-kit.ps1
    powershell -ExecutionPolicy Bypass -File tools/make-kit.ps1 -Ipk dist\app.ipk -Out dist
#>

[CmdletBinding()]
param(
    [string]$Ipk,
    [string]$Out = 'dist'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Find-Ipk([string]$explicit) {
    if ($explicit) {
        if (-not (Test-Path -LiteralPath $explicit)) { throw "No existe: $explicit" }
        return (Resolve-Path -LiteralPath $explicit).Path
    }
    $dist = Join-Path $root 'dist'
    $f = Get-ChildItem -LiteralPath $dist -Filter '*.ipk' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $f) { throw 'No hay ningun .ipk en dist/. Ejecuta antes tools/build-ipk.ps1.' }
    return $f.FullName
}

$ipkPath = Find-Ipk $Ipk
$ipkName = Split-Path $ipkPath -Leaf

# Version desde el nombre del IPK: com.webosflux.xuptertv.fidelity_1.5.9_all.ipk
$version = 'desconocida'
$m = [regex]::Match($ipkName, '_(\d+(?:\.\d+)*)_')
if ($m.Success) { $version = $m.Groups[1].Value }

$outDir = Join-Path $root $Out
if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$stageName = "XuperTV-instalador-$version"
$stage = Join-Path $env:TEMP ('xuper-kit-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
$stageRoot = Join-Path $stage $stageName
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

try {
    # 1. aplicacion
    Copy-Item -LiteralPath $ipkPath -Destination $stageRoot

    # 2. instalador de doble clic
    Copy-Item -LiteralPath (Join-Path $root 'INSTALAR-XUPERTV.bat') -Destination $stageRoot
    Copy-Item -LiteralPath (Join-Path $root 'tools\instalar-tv.ps1') -Destination (Join-Path $stageRoot 'instalar-tv.ps1')

    # 3. guia con las rutas de imagen adaptadas al ZIP
    $guideSrc = Join-Path $root 'docs\instalar\index.html'
    $guideTxt = [System.IO.File]::ReadAllText($guideSrc)
    $guideTxt = $guideTxt.Replace('../screenshots/', 'capturas/')
    $guideTxt = $guideTxt.Replace('INSTRUCCIONES_INSTALACION.md', 'LEEME.txt')
    [System.IO.File]::WriteAllText((Join-Path $stageRoot 'guia-instalacion.html'), $guideTxt, (New-Object System.Text.UTF8Encoding($false)))

    # 4. capturas
    $shotsSrc = Join-Path $root 'docs\screenshots'
    if (Test-Path -LiteralPath $shotsSrc) {
        $shotsDst = Join-Path $stageRoot 'capturas'
        New-Item -ItemType Directory -Path $shotsDst -Force | Out-Null
        Copy-Item -Path (Join-Path $shotsSrc '*') -Destination $shotsDst -Recurse
    }

    # 5. LEEME
    $leeme = @"
XuperTV para LG webOS - instalador ($version)

QUE HACER
  1. Conecta el ordenador y la TV a la MISMA red WiFi.
  2. En la TV, abre la app "Developer Mode" de LG (si no la tienes,
     instalala desde LG Content Store). Activa el modo, espera el
     reinicio y apunta la IP y la clave que muestra.
  3. Doble clic en INSTALAR-XUPERTV.bat
  4. Escribe la IP cuando te la pida.
  5. Escribe la clave de la TV UNA vez (no se ve al escribir). En ese PC,
     el instalador la recuerda cifrada para las próximas actualizaciones.
     Si tu TV tiene "KEY SERVER" en ON no pasa nada: el instalador
     usa la llave de la TV y lo indica en pantalla.
  6. Espera a que diga "LISTO". La app se abre sola en la TV.

GUIA CON DIBUJOS
  Abre guia-instalacion.html con doble clic (funciona sin internet).

SI INSTALAS DESDE EL CELULAR (webOS Dev Manager / app de la TV)
  Tambien puedes instalar el archivo .ipk desde el celular. En ese caso el
  instalador de Windows no participa y la TV puede no reconocer el servicio
  hasta reiniciarse:
    1. Instala el .ipk desde el celular.
    2. Desenchufa la TV de la corriente 30 segundos (no basta con apagarla).
    3. Enchufala y abre XuperTV.
  Si la app dice "el servicio no arrancó" o el diagnostico solo muestra
  "DNS seguro sin datos", "Codec: No confirmado" y "Modo Fluido sin datos",
  es exactamente eso: falta ese reinicio. Vuelve a abrir la app despues.
  En paises donde el portal bloquea por region (portal100024) la app ahora
  reintenta sola con sesiones de respaldo; si aun asi falla, prueba una VPN
  en el router.

SI ALGO FALLA
  Mira el paso 5 de la guia. Casi siempre es:
    - el PC y la TV no estan en la misma red,
    - la IP cambio,
    - o la clave caduco (el Modo Desarrollador dura 50 horas).

  Si te sale "Bad configuration option: pubkeyacceptedalgorithms": estabas
  usando un instalador viejo en un Windows con OpenSSH antiguo. Esta version
  se adapta sola; extrae el ZIP completo en una carpeta limpia y repite.

  Si la imagen de la app se sale de la pantalla, revisa en la TV
  Ajustes - Imagen - Relacion de aspecto - Solo escaneo (Just Scan). Si sigue
  igual, entra en la app a Ajustes - Diagnostico y manda una foto de esa
  pantalla: la ultima linea indica el tamano de pantalla que la TV entrego.

IMPORTANTE
  No ejecutes el instalador desde dentro del ZIP: extrae la carpeta
  completa primero. El archivo .ipk tiene que estar junto al .bat.

Proyecto no oficial, sin relacion con XuperTV ni con LG.
No incluye contenido audiovisual.
"@
    [System.IO.File]::WriteAllText((Join-Path $stageRoot 'LEEME.txt'), $leeme, (New-Object System.Text.UTF8Encoding($true)))

    # 6. comprimir
    $zip = Join-Path $outDir ("XuperTV-instalador-$version.zip")
    if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
    Compress-Archive -Path $stageRoot -DestinationPath $zip -CompressionLevel Optimal

    $size = (Get-Item -LiteralPath $zip).Length
    $hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash

    Write-Host ''
    Write-Host '  Kit listo para compartir:' -ForegroundColor Green
    Write-Host ('    ' + $zip)
    Write-Host ('    ' + ('{0:N1}' -f ($size / 1MB)) + ' MB')
    Write-Host ('    SHA256 ' + $hash)
    Write-Host ''
    Write-Host '  Contenido:' -ForegroundColor Cyan
    Get-ChildItem -LiteralPath $stageRoot | ForEach-Object {
        if ($_.PSIsContainer) {
            $n = (Get-ChildItem -LiteralPath $_.FullName -File | Measure-Object).Count
            Write-Host ('    ' + $_.Name + '/  (' + $n + ' archivos)')
        } else {
            Write-Host ('    ' + $_.Name + '  (' + ('{0:N0}' -f ($_.Length / 1KB)) + ' KB)')
        }
    }
    Write-Host ''
} finally {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
}
