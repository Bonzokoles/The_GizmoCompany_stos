@echo off
chcp 65001 >nul 2>&1
title ZENO Browser + Podman Containers
color 0A

echo ============================================
echo   ZENO Browser - Podman + App Startup
echo ============================================
echo.

cd /d "%~dp0"

:: Upewnij sie ze Node (NVM4W) jest w PATH
set "PATH=C:\nvm4w\nodejs;C:\ProgramData\nvm;%PATH%"

:: ─── PODMAN MACHINE ─────────────────────────────
echo [PODMAN] Sprawdzanie maszyny Podman...
podman machine inspect podman-machine-default >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Maszyna Podman nie istnieje! Uruchom: podman machine init
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('podman machine inspect podman-machine-default --format "{{.State}}" 2^>nul') do set MACHINE_STATE=%%a
if /i not "%MACHINE_STATE%"=="running" (
    echo [PODMAN] Uruchamianie maszyny Podman...
    podman machine start podman-machine-default
    if errorlevel 1 (
        echo [BLAD] Nie mozna uruchomic maszyny Podman!
        pause
        exit /b 1
    )
    timeout /t 5 /nobreak >nul
)
echo [OK] Maszyna Podman dziala
echo.

:: ─── NETWORK ────────────────────────────────────
podman network exists zeno-net 2>nul
if errorlevel 1 (
    echo [PODMAN] Tworzenie sieci zeno-net...
    podman network create zeno-net >nul 2>&1
)
podman network exists plausible-net 2>nul
if errorlevel 1 (
    echo [PODMAN] Tworzenie sieci plausible-net...
    podman network create plausible-net >nul 2>&1
)

:: ─── START CONTAINERS ───────────────────────────
echo [PODMAN] Uruchamianie kontenerow...

echo   [1/9] zeno-umami-db (PostgreSQL)...
podman start zeno-umami-db >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-umami-db ^
        --network zeno-net ^
        -e POSTGRES_DB=umami -e POSTGRES_USER=umami -e POSTGRES_PASSWORD=umami ^
        -v umami-db-data:/var/lib/postgresql/data ^
        --restart unless-stopped ^
        docker.io/library/postgres:16-alpine >nul 2>&1
)
echo         OK

echo   [2/9] zeno-searxng-redis (Valkey)...
podman start zeno-searxng-redis >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-searxng-redis ^
        --network zeno-net ^
        -v searxng-redis-data:/data ^
        --restart unless-stopped ^
        docker.io/valkey/valkey:8-alpine ^
        valkey-server --save 30 1 --loglevel warning >nul 2>&1
)
echo         OK

timeout /t 3 /nobreak >nul

echo   [3/9] zeno-umami (Analytics)...
podman start zeno-umami >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-umami ^
        --network zeno-net ^
        -p 5183:3000 ^
        -e DATABASE_URL=postgresql://umami:umami@zeno-umami-db:5432/umami ^
        -e DISABLE_TELEMETRY=1 ^
        --restart unless-stopped ^
        ghcr.io/umami-software/umami:postgresql-latest >nul 2>&1
)
echo         OK

echo   [4/9] zeno-meilisearch...
podman start zeno-meilisearch >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-meilisearch ^
        -p 7700:7700 ^
        -e MEILI_ENV=development -e MEILI_NO_ANALYTICS=true ^
        -e MEILI_MASTER_KEY=zeno-meili-master-2026 ^
        -v meilisearch-data:/meili_data ^
        --restart unless-stopped ^
        docker.io/getmeili/meilisearch:v1.12 >nul 2>&1
)
echo         OK

echo   [5/9] zeno-websurfx (Meta Search)...
podman start zeno-websurfx >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-websurfx ^
        --network zeno-net ^
        -p 8888:8080 ^
        -v "%~dp0config\websurfx:/etc/xdg/websurfx:Z" ^
        docker.io/neonmmd/websurfx:latest >nul 2>&1
)
podman network connect zeno-net zeno-websurfx >nul 2>&1
echo         OK

echo   [6/6] zeno-sist2 (Document Indexer)...
podman start zeno-sist2 >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-sist2 ^
        -p 4090:4090 -p 8085:8080 ^
        -v V:\chambers\01_sist2:/sist2-admin ^
        -v Z:\:/data/z:ro ^
        -v F:\:/data/f:ro ^
        -v U:\:/data/u:ro ^
        -v Q:\:/data/q:ro ^
        -v R:\:/data/r:ro ^
        -v S:\:/data/s:ro ^
        -v V:\:/data/v:ro ^
        -v W:\:/data/w:ro ^
        -v Y:\:/data/y:ro ^
        -e SIST2_ADMIN=1 ^
        --entrypoint python3 ^
        docker.io/sist2app/sist2:x64-linux ^
        /root/sist2-admin/sist2_admin/app.py >nul 2>&1
)
echo         OK

echo.
echo [PODMAN] Status kontenerow:
timeout /t 2 /nobreak >nul
podman ps --filter "name=zeno-" --format "  {{.Names}}  ->  {{.Status}}"
echo.

:: ─── NODE.JS CHECK ──────────────────────────────
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
if not defined NODE_VER (
    echo [BLAD] Node.js nie jest zainstalowany!
    pause
    exit /b 1
)
echo [OK] Node.js %NODE_VER%

if not exist "node_modules" (
    echo [INFO] Instalowanie zaleznosci...
    call npm install || (
        echo [BLAD] npm install nie powiodlo sie!
        pause
        exit /b 1
    )
)

:: ─── COMPILE + RUN ──────────────────────────────
echo [1/2] Kompilacja Electron...
call npx tsc -p tsconfig.electron.json || (
    echo [BLAD] Kompilacja Electron nie powiodla sie!
    pause
    exit /b 1
)
echo       OK
echo.

echo [2/2] Uruchamianie ZENO Browser...
echo       Websurfx:    http://localhost:8888
echo       Meilisearch: http://localhost:7700
echo       sist2:       http://localhost:8085
echo       Umami:       http://localhost:5183
echo       Plausible:   http://localhost:8100
echo.
echo       Aby zamknac: Ctrl+C lub zamknij okno
echo ============================================
echo.

call npm start
