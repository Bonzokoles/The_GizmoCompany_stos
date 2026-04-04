@echo off
title JIMBO Agent HUB
color 0A
echo.
echo  JIMBO Agent HUB — ZenoBrowser
echo  Port: 4222
echo  Goose: E:\Programs\goose\goose.exe
echo.

cd /d "%~dp0"

:: Zainstaluj zależności jeśli brak node_modules
if not exist "node_modules" (
    echo [SETUP] Instaluję zależności...
    npm install
    echo.
)

:: Uruchom hub
npm start
pause
