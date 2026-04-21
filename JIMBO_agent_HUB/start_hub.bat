@echo off
title JIMBO Agent HUB — port 4224
color 0A
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   JIMBO Agent HUB — ZenoBrowser         ║
echo  ║   Port : 4224                            ║
echo  ║   Goose: E:\Programs\goose\goose.exe     ║
echo  ║   v1.28.0                                ║
echo  ╚══════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Sprawdz czy tsx jest dostepny
where tsx >nul 2>&1
if errorlevel 1 (
    echo [SETUP] tsx nie znaleziony — instaling...
    npm install
    echo.
)

:: Zainstaluj zależności jeśli brak node_modules
if not exist "node_modules" (
    echo [SETUP] Instaluję zależności...
    npm install
    echo.
)

:: Sprawdz Goose CLI
if not exist "E:\Programs\goose\goose.exe" (
    echo  [WARN] Goose CLI nie znaleziony w E:\Programs\goose\goose.exe
    echo  [WARN] Goose tasks nie beda dzialac — reszta huba OK
    echo.
)

:: Uruchom hub (wczyta .env automatycznie)
echo  [START] Uruchamiam hub na porcie 4224...
echo.
npm start
pause
