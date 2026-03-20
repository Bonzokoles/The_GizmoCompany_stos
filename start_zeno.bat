@echo off
chcp 65001 >nul 2>&1
title ZENO Browser
color 0A

echo ============================================
echo        ZENO Browser - Uruchamianie
echo ============================================
echo.

cd /d "%~dp0"

:: Upewnij się że Node (NVM4W) jest w PATH
set "PATH=C:\nvm4w\nodejs;C:\ProgramData\nvm;%PATH%"

:: Sprawdź czy node jest dostępny
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
if not defined NODE_VER (
    echo [BLAD] Node.js nie jest zainstalowany!
    echo Pobierz z: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js %NODE_VER%

:: Sprawdź czy node_modules istnieje
if not exist "node_modules" (
    echo [INFO] Instalowanie zależności...
    call npm install || (
        echo [BLAD] Instalacja zależności nie powiodła się!
        pause
        exit /b 1
    )
    echo.
)

:: Kompiluj Electron (preload + main)
echo [1/2] Kompilacja Electron...
call npx tsc -p tsconfig.electron.json || (
    echo [BLAD] Kompilacja Electron nie powiodła się!
    pause
    exit /b 1
)
echo       OK
echo.

:: Uruchom aplikację
echo [2/2] Uruchamianie ZENO Browser...
echo       Vite: http://localhost:5173
echo       Electron otworzy się automatycznie
echo.
echo       Aby zamknąć: Ctrl+C lub zamknij okno
echo ============================================
echo.

call npm run dev
