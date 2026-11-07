@echo off
setlocal EnableExtensions
title XuperTV - Diagnostico del televisor
color 0E
cd /d "%~dp0"

set "PS1=%~dp0instalar-tv.ps1"
if not exist "%PS1%" set "PS1=%~dp0tools\instalar-tv.ps1"

echo.
echo   ================================================================
echo      Diagnostico de XuperTV  (NO instala nada)
echo   ================================================================
echo.
echo   Entra en el televisor por SSH y mira por que el servicio no
echo   arranca: version instalada, sintaxis de los modulos con el Node
echo   de la TV, si responde "ping" por Luna y los ultimos errores del
echo   registro del sistema.
echo.
echo   Al terminar guarda todo en:
echo       tools\diagnostico-xupertv-tv.txt
echo.

if not exist "%PS1%" (
    echo   [X] No encuentro el archivo "instalar-tv.ps1".
    echo       Extrae la carpeta completa del ZIP antes de ejecutar esto.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Diagnose -NoPause %*
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
    echo   ================================================================
    echo      El diagnostico no pudo terminar.
    echo      Haz una foto a esta ventana y pasasela a quien te dio el
    echo      archivo.
    echo   ================================================================
) else (
    echo   ================================================================
    echo      Fin. Envia el archivo tools\diagnostico-xupertv-tv.txt
    echo   ================================================================
)
echo.
pause
exit /b %RC%
