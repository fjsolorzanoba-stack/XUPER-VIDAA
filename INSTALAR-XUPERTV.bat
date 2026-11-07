@echo off
setlocal EnableExtensions
title XuperTV - Instalador para LG webOS
color 0B
cd /d "%~dp0"

set "PS1=%~dp0instalar-tv.ps1"
if not exist "%PS1%" set "PS1=%~dp0tools\instalar-tv.ps1"

echo.
echo   ================================================================
echo      Instalador de XuperTV para televisores LG webOS
echo   ================================================================
echo.

if not exist "%PS1%" (
    echo   [X] No encuentro el archivo "instalar-tv.ps1".
    echo.
    echo       Tienes que EXTRAER la carpeta completa del ZIP antes de
    echo       ejecutar este instalador. No lo abras desde dentro del ZIP.
    echo.
    pause
    exit /b 1
)

where powershell >nul 2>&1
if errorlevel 1 (
    echo   [X] Este Windows no tiene PowerShell.
    echo       Es muy raro: prueba en otro ordenador con Windows 10 u 11.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -NoPause %*
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
    echo   ================================================================
    echo      El instalador no pudo terminar.
    echo      Haz una foto a esta ventana y pasasela a quien te dio el
    echo      archivo, o prueba a reiniciar la TV y repetir.
    echo   ================================================================
) else (
    echo   ================================================================
    echo      Fin. Ya puedes cerrar esta ventana.
    echo   ================================================================
)
echo.
pause
exit /b %RC%
