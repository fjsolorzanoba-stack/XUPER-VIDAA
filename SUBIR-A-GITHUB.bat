@echo off
chcp 65001 >nul
title Subir XuperTV Hisense VIDAA a GitHub / Nube
cd /d "%~dp0"

echo ================================================================
echo   SUBIR / ACTUALIZAR SERVIDOR XUPERTV EN GITHUB (RENDER/RAILWAY)
echo ================================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Git instalado en tu PC.
    echo Descargalo gratis desde: https://git-scm.com/download/win
    pause
    exit /b 1
)

if not exist ".git" (
    echo [1/4] Inicializando repositorio Git local...
    git init
    git branch -M main
)

echo [2/4] Preparando archivos corregidos (ignorando node_modules pesados)...
git add .
git commit -m "Servidor XuperTV Hisense VIDAA corregido (VOD + Live TV)"

git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo.
    echo [3/4] Pega aqui la URL de tu repositorio de GitHub
    echo       Ejemplo: https://github.com/tu-usuario/xupertv-vidaa.git
    set /p REPO_URL="URL del repositorio: "
    if "%REPO_URL%"=="" (
        echo No ingresaste una URL. Saliendo...
        pause
        exit /b 1
    )
    git remote add origin "%REPO_URL%"
)

echo.
echo [4/4] Subiendo cambios a GitHub...
git push -u origin main

echo.
echo ================================================================
echo   LISTO: Version subida a GitHub.
echo   Si conectaste Render o Railway, se actualizara automaticamente.
echo ================================================================
pause
