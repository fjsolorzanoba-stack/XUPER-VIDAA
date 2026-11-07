# Restore the bundled FFmpeg binary used by the smooth-mode relay.
#
# The executable itself is git-ignored (31.8 MB, and git should not carry
# platform binaries). Its source archive is vendored under tools/vendor so a
# clean clone can rebuild the IPK without downloading anything:
#
#   tools/vendor/ffmpeg-7.0.2-armhf-static.tar.xz
#   SHA-256 7D41F558CB1F3395B313F8CEABED78B3731C79A0962ABF405EBB5CD393E93991
#
# Result:
#   webos/services/com.webosflux.xuptertv.fidelity.service/ffmpeg
#   SHA-256 0AFBA4A11110E6E402053E0FC14C33A7EB207D7A588688AE87DBA471A0F06C71
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools/setup-ffmpeg.ps1
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$svc = Join-Path $root 'webos\services\com.webosflux.xuptertv.fidelity.service'
$archive = Join-Path $root 'tools\vendor\ffmpeg-7.0.2-armhf-static.tar.xz'
$dest = Join-Path $svc 'ffmpeg'

$expectedArchive = '7D41F558CB1F3395B313F8CEABED78B3731C79A0962ABF405EBB5CD393E93991'
$expectedBinary = '0AFBA4A11110E6E402053E0FC14C33A7EB207D7A588688AE87DBA471A0F06C71'

if (-not (Test-Path $archive)) {
    throw "Falta $archive. Es el archivo de FFmpeg 7.0.2 armhf estático (GPLv3)."
}

$hash = (Get-FileHash $archive -Algorithm SHA256).Hash
if ($hash -ne $expectedArchive) {
    throw "SHA-256 inesperado para $archive`n  esperado: $expectedArchive`n  obtenido: $hash"
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('ffmpeg-restore-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $tmp | Out-Null
try {
    tar -xJf $archive -C $tmp 'ffmpeg-7.0.2-armhf-static/ffmpeg'
    if ($LASTEXITCODE -ne 0) { throw "tar falló con código $LASTEXITCODE" }

    $extracted = Join-Path $tmp 'ffmpeg-7.0.2-armhf-static\ffmpeg'
    $binHash = (Get-FileHash $extracted -Algorithm SHA256).Hash
    if ($binHash -ne $expectedBinary) {
        throw "SHA-256 inesperado para el binario extraído`n  esperado: $expectedBinary`n  obtenido: $binHash"
    }

    Copy-Item $extracted $dest -Force
    Write-Host "FFmpeg restaurado en $dest"
    Write-Host "SHA-256: $binHash"
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
