# Build the XuperTV webOS IPK in one step.
#
# 1. ares-package the web app AND the Node service (so ffmpeg travels inside
#    the IPK).
# 2. Rewrite data.tar.gz so ffmpeg keeps its execute bit. Windows stat()
#    reports 0666, and a non-executable ffmpeg breaks the smooth-mode relay.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools/build-ipk.ps1
#   powershell -ExecutionPolicy Bypass -File tools/build-ipk.ps1 -Out dist-test
param(
    [string]$Out = 'dist'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$app = Join-Path $root 'webos\fidelity'
$svc = Join-Path $root 'webos\services\com.webosflux.xuptertv.fidelity.service'
$ffmpeg = Join-Path $svc 'ffmpeg'

if (-not (Test-Path $ffmpeg)) {
    Write-Host "FFmpeg no está presente; restaurando desde tools/vendor/..."
    & (Join-Path $PSScriptRoot 'setup-ffmpeg.ps1')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ffmpeg)) {
        throw "No se pudo restaurar el binario FFmpeg en $ffmpeg."
    }
}

$appInfo = Get-Content (Join-Path $app 'appinfo.json') -Raw | ConvertFrom-Json
$svcInfo = Get-Content (Join-Path $svc 'package.json') -Raw | ConvertFrom-Json
$version = $appInfo.version
if ($svcInfo.version -ne $version) {
    Write-Warning "appinfo.json=$version pero service/package.json=$($svcInfo.version). Mantén ambas versiones iguales."
}

Push-Location $root
try {
    ares-package $app $svc -o $Out -e shots -e '*.md'
    if ($LASTEXITCODE -ne 0) { throw "ares-package falló con código $LASTEXITCODE" }

    $ipk = Join-Path $root "$Out\com.webosflux.xuptertv.fidelity_${version}_all.ipk"
    if (-not (Test-Path $ipk)) { throw "No se generó $ipk" }

    python (Join-Path $root 'tools\fix_ipk_modes.py') $ipk
    if ($LASTEXITCODE -ne 0) { throw "fix_ipk_modes.py falló con código $LASTEXITCODE" }

    $file = Get-Item $ipk
    $hash = (Get-FileHash $ipk -Algorithm SHA256).Hash
    Write-Host ""
    Write-Host "IPK:    $($file.FullName)"
    Write-Host "Tamaño: $($file.Length) bytes"
    Write-Host "SHA256: $hash"
} finally {
    Pop-Location
}
