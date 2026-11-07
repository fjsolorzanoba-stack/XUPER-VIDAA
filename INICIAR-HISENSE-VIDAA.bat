@echo off
chcp 65001 >nul 2>&1
title XuperTV Hydra - Servidor para Hisense VIDAA OS
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] No se encontro Node.js instalado en esta PC.
    echo Descargalo e instalalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Intentar habilitar el puerto 8899 en el Firewall de Windows (si tiene permisos)
netsh advfirewall firewall show rule name="XuperTV Hisense VIDAA" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="XuperTV Hisense VIDAA" dir=in action=allow protocol=TCP localport=8899 >nul 2>&1
)

echo.
echo ====================================================================
echo   Iniciando XuperTV Hydra para Televisores Hisense (VIDAA OS)...
echo   No cierres esta ventana mientras uses la app en tu TV.
echo ====================================================================
echo.

REM Abrir la guia visual con la IP detectada en el navegador de la PC
start "" cmd /c "ping 127.0.0.1 -n 3 >nul && start http://127.0.0.1:8899/instalar"

node "%~dp0tools\vidaa_server.mjs" 8899
pause
