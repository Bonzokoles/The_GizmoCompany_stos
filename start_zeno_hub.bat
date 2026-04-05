@echo off
chcp 65001 >nul 2>&1
title ZENO HUB - Browser + MyBonzo + Watchdog + Tunnel
color 0A

echo.
echo  ======================================================
echo   ZENO HUB - Full Stack Launcher v2.0
echo   Browser + MyBonzo + Podman + Watchdog + Tunnel
echo  ======================================================
echo   %date% %time%
echo  ======================================================
echo.

cd /d "%~dp0"
set "ZENO_DIR=%~dp0"
set "MYBONZO_DIR=U:\WWW_MyBonzo_com"

:: Node (NVM4W) w PATH
set "PATH=C:\nvm4w\nodejs;C:\ProgramData\nvm;%PATH%"

:: Katalog na logi
if not exist "logs" mkdir logs

:: =============================================
:: PHASE 1: PODMAN MACHINE
:: =============================================
echo [PHASE 1/8] Podman Machine...
podman machine inspect podman-machine-default >nul 2>&1
if errorlevel 1 (
    echo   Maszyna Podman nie istnieje - inicjalizacja ^(moze potrwac kilka minut^)...
    podman machine init
    if errorlevel 1 (
        echo   [BLAD] Nie mozna zainicjowac maszyny Podman!
        pause
        exit /b 1
    )
    echo   [OK] Maszyna Podman zainicjalizowana
)

for /f "tokens=*" %%a in ('podman machine inspect podman-machine-default --format "{{.State}}" 2^>nul') do set MACHINE_STATE=%%a
if /i not "%MACHINE_STATE%"=="running" (
    echo   Uruchamianie maszyny Podman...
    podman machine start podman-machine-default
    if errorlevel 1 (
        echo   [BLAD] Nie mozna uruchomic maszyny Podman!
        pause
        exit /b 1
    )
    timeout /t 5 /nobreak >nul
)
echo   [OK] Maszyna Podman dziala
echo.

:: =============================================
:: PHASE 2: SIECI PODMAN
:: =============================================
echo [PHASE 2/8] Sieci Podman...
podman network exists zeno-net 2>nul
if errorlevel 1 (
    echo   Tworzenie zeno-net...
    podman network create zeno-net >nul 2>&1
)
podman network exists plausible-net 2>nul
if errorlevel 1 (
    echo   Tworzenie plausible-net...
    podman network create plausible-net >nul 2>&1
)
echo   [OK] Sieci gotowe
echo.

:: =============================================
:: PHASE 3: KONTENERY (10 serwisow)
:: =============================================
echo [PHASE 3/8] Kontenery (11 serwisow)...

echo   [01/10] zeno-umami-db (PostgreSQL)
podman start zeno-umami-db >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-umami-db ^
        -e POSTGRES_DB=umami -e POSTGRES_USER=umami -e POSTGRES_PASSWORD=umami ^
        -v umami-db-data:/var/lib/postgresql/data ^
        --restart unless-stopped ^
        docker.io/library/postgres:16-alpine >nul 2>&1
)

echo   [02/10] zeno-searxng-redis (Valkey)
podman start zeno-searxng-redis >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-searxng-redis ^
        --network zeno-net ^
        -v searxng-redis-data:/data ^
        --restart unless-stopped ^
        docker.io/valkey/valkey:8-alpine ^
        valkey-server --save 30 1 --loglevel warning >nul 2>&1
)

timeout /t 3 /nobreak >nul

echo   [03/10] zeno-umami (Analytics)
podman start zeno-umami >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-umami ^
        -p 5183:3000 ^
        -e DATABASE_URL=postgresql://umami:umami@zeno-umami-db:5432/umami ^
        -e DISABLE_TELEMETRY=1 ^
        --restart unless-stopped ^
        ghcr.io/umami-software/umami:postgresql-latest >nul 2>&1
)

echo   [04/10] zeno-meilisearch
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

echo   [05/10] zeno-websurfx (Meta Search)
podman start zeno-websurfx >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-websurfx ^
        --network zeno-net ^
        -p 8888:8080 ^
        -v "%ZENO_DIR%config\websurfx:/etc/xdg/websurfx:Z" ^
        docker.io/neonmmd/websurfx:latest >nul 2>&1
)
podman network connect zeno-net zeno-websurfx >nul 2>&1

echo   [06/10] zeno-sist2 (Document Indexer)
podman start zeno-sist2 >nul 2>&1
if errorlevel 1 (
    podman run -d --name zeno-sist2 ^
        -p 4090:4090 -p 8085:8080 ^
        -e SIST2_ADMIN=1 ^
        --entrypoint python3 ^
        docker.io/sist2app/sist2:x64-linux ^
        /root/sist2-admin/sist2_admin/app.py >nul 2>&1
)

echo   [07/10] plausible-db (PostgreSQL)
podman start plausible-db >nul 2>&1
if errorlevel 1 (
    podman run -d --name plausible-db --network plausible-net ^
        -e POSTGRES_DB=plausible -e POSTGRES_USER=plausible -e POSTGRES_PASSWORD=plausible ^
        -v plausible-db-data:/var/lib/postgresql/data ^
        --restart unless-stopped ^
        docker.io/library/postgres:16-alpine >nul 2>&1
)

echo   [08/10] plausible-events-db (ClickHouse)
podman start plausible-events-db >nul 2>&1
if errorlevel 1 (
    podman run -d --name plausible-events-db --network plausible-net ^
        -v plausible-events-data:/var/lib/clickhouse ^
        -v "%ZENO_DIR%plausible-ce\clickhouse\clickhouse-config.xml:/etc/clickhouse-server/config.d/logging.xml:Z" ^
        -v "%ZENO_DIR%plausible-ce\clickhouse\clickhouse-user-config.xml:/etc/clickhouse-server/users.d/logging.xml:Z" ^
        --restart unless-stopped ^
        docker.io/clickhouse/clickhouse-server:24.3.3.102-alpine >nul 2>&1
)

timeout /t 3 /nobreak >nul

echo   [09/10] plausible (Plausible CE)
podman start plausible >nul 2>&1
if errorlevel 1 (
    podman run -d --name plausible --network plausible-net ^
        -p 8100:8000 ^
        -e BASE_URL=http://localhost:8100 ^
        -e SECRET_KEY_BASE="fSDMf2LxaQYA22uiZSA3ZpxV3llPA2cwu7c1ZF9gqmOvElsOHXOFwXuHS9+tTZGa" ^
        -e DATABASE_URL="postgres://plausible:plausible@plausible-db:5432/plausible" ^
        -e CLICKHOUSE_DATABASE_URL="http://plausible-events-db:8123/plausible_events_db" ^
        -e DISABLE_REGISTRATION=false ^
        -e HTTP_PORT=8000 ^
        --restart unless-stopped ^
        ghcr.io/plausible/community-edition:v3.2.0 >nul 2>&1
)

echo   [10/11] zeno-superset (Apache Superset BI)
podman start zeno-superset >nul 2>&1
if errorlevel 1 echo          [INFO] Superset niedostepny - brak kontenera

echo   [11/11] mydia (Media Manager :4100)
podman start mydia >nul 2>&1
if errorlevel 1 (
    podman run -d --name mydia ^
        -e SECRET_KEY_BASE=tZobFJrMXyfwmjaUj28AiOwfqO4UPbeunhulE0k4JM1K/wJBtZKGH14IRf9qM1h0 ^
        -e GUARDIAN_SECRET_KEY=1lmw61uwVhMvVHvGOQsXZBJP1fmB5p3bq0E9UfUhewd68G4l5hGZewPRx1ZStgUW ^
        -e TZ=Europe/Warsaw -e PUID=1000 -e PGID=1000 ^
        -e PHX_HOST=localhost -e PORT=4100 ^
        -e MOVIES_PATH=/media/movies -e TV_PATH=/media/tv ^
        -p 4100:4100 ^
        --restart unless-stopped ^
        ghcr.io/getmydia/mydia:latest >nul 2>&1
)

echo.
echo   Status kontenerow:
timeout /t 2 /nobreak >nul
podman ps --filter "name=zeno-" --format "    {{.Names}} -> {{.Status}}"
podman ps --filter "name=plausible" --format "    {{.Names}} -> {{.Status}}"
podman ps --filter "name=mydia" --format "    {{.Names}} -> {{.Status}}"
echo.

:: =============================================
:: PHASE 4: NODE.JS + ZENO BUILD
:: =============================================
echo [PHASE 4/8] Node.js + ZENO Build...
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
if not defined NODE_VER (
    echo   [BLAD] Node.js nie jest zainstalowany!
    pause
    exit /b 1
)
echo   Node.js %NODE_VER%

if not exist "node_modules" (
    echo   Instalowanie zaleznosci ZENO...
    call npm install || (
        echo   [BLAD] npm install ZENO nie powiodlo sie!
        pause
        exit /b 1
    )
)

echo   Kompilacja Electron...
call npx tsc -p tsconfig.electron.json || (
    echo   [BLAD] Kompilacja Electron nie powiodla sie!
    pause
    exit /b 1
)
echo   [OK] ZENO Build gotowy
echo.

:: =============================================
:: JIMBO AGENT HUB (background, port 4224)
:: =============================================
echo [BG] JIMBO Agent HUB (port 4224)...
set "HUB_DIR=U:\WWW_Zen_BRo_wser_org3\JIMBO_agent_HUB"
set "HUB_PORT=4224"

:: Kill-before-start: zabij wszystkie procesy na porcie HUB_PORT
echo   [HUB] Czyszczenie portu %HUB_PORT%...
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%HUB_PORT% " ^| findstr "LISTENING"') do (
    echo   [HUB] Zatrzymuje PID %%P na porcie %HUB_PORT%...
    taskkill /PID %%P /F >nul 2>&1
)
:: Zabij tez procesy tsx/node ktore moga trzymac port (np. po crashu)
taskkill /FI "WINDOWTITLE eq JIMBO-agent-HUB" /F >nul 2>&1
timeout /t 3 /nobreak >nul

:: Upewnij sie ze node_modules istnieje
if not exist "%HUB_DIR%\node_modules" (
    echo   [HUB] Instalowanie zaleznosci...
    cmd /c "cd /d %HUB_DIR% && npm install > %ZENO_DIR%logs\hub_install.log 2>&1"
)

start "JIMBO-agent-HUB" /MIN cmd /c "cd /d %HUB_DIR% && npm start > %ZENO_DIR%logs\jimbo_hub.log 2>&1"
echo   [OK] JIMBO Agent HUB uruchomiony -^> http://localhost:%HUB_PORT%  (log: logs\jimbo_hub.log)

:: Goose interactive terminal — widoczne okno, mozna wpisywac komendy
if exist "E:\Programs\goose\goose.exe" (
    echo [BG] Uruchamianie Goose Terminal...
    start "◈ JIMBO HUB — Goose AI Terminal" cmd /k "%HUB_DIR%\start_goose_terminal.bat"
    echo   [OK] Goose Terminal otwarty ^(widoczne okno ^- mozna wpisywac komendy^)
) else (
    echo   [WARN] Goose nie znaleziony: E:\Programs\goose\goose.exe
)

:: Goose Desktop App (opcjonalne — odkomentuj zeby uruchamiac automatycznie)
:: start "" "U:\Goose-1.29.1\dist-windows\Goose.exe"
:: echo   [OK] Goose Desktop uruchomiony
echo.

:: =============================================
:: LIBRARY CURATION (background, silent)
:: =============================================
echo [BG] Library curation...
start "LibCuration" /MIN cmd /c "cd /d %ZENO_DIR% && npm run curate > logs\curate.log 2>&1"
echo   [OK] Curation uruchomiona (log: logs\curate.log)
echo.

:: =============================================
:: LIBRARIES API (background, port 7070)
:: =============================================
echo [BG] LIBRARIES API (ChromaDB RAG)...
set "LIBS_DIR=U:\The_DEVz_HUB_of_work\knowledge_base\_LIBRARIES"
if exist "%LIBS_DIR%\venv\Scripts\python.exe" (
    start "LibrariesAPI" /MIN cmd /c "cd /d %LIBS_DIR% && venv\Scripts\python.exe api_server.py > %ZENO_DIR%logs\libraries_api.log 2>&1"
) else (
    start "LibrariesAPI" /MIN cmd /c "cd /d %LIBS_DIR% && python api_server.py > %ZENO_DIR%logs\libraries_api.log 2>&1"
)
echo   [OK] Libraries API uruchomiona -^> http://localhost:7070  (log: logs\libraries_api.log)
echo.

:: =============================================
:: JIMBO CHAT BACKEND (background, port 5180)
:: =============================================
echo [BG] JIMBO DEVz Chat Backend...
set "JIMBO_DIR=U:\The_DEVz_HUB_of_work\BUCH_DEVz_CHat_box"
if exist "%JIMBO_DIR%\backend\venv\Scripts\python.exe" (
    start "JIMBO-Chat" /MIN cmd /c "set PYTHONIOENCODING=utf-8 && cd /d %JIMBO_DIR%\backend\app && %JIMBO_DIR%\backend\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 5180 > %ZENO_DIR%logs\jimbo_chat.log 2>&1"
) else (
    start "JIMBO-Chat" /MIN cmd /c "set PYTHONIOENCODING=utf-8 && cd /d %JIMBO_DIR%\backend\app && python -m uvicorn main:app --host 0.0.0.0 --port 5180 > %ZENO_DIR%logs\jimbo_chat.log 2>&1"
)
echo   [OK] JIMBO Chat uruchomiony -^> http://localhost:5180  (log: logs\jimbo_chat.log)
echo.

:: =============================================
:: DEVZ HUB SYNC LOOP (background, co 30 min)
:: =============================================
echo [BG] DevzHub sync loop (U: --> A:, co 30 min)...
start "DevzHub-Sync" /MIN powershell -ExecutionPolicy Bypass -NoProfile -File "%ZENO_DIR%sync_devz_hub_loop.ps1"
echo   [OK] Sync loop aktywny (log: logs\sync_devz_hub.log)
echo.

:: =============================================
:: PHASE 5: MYBONZO ASTRO DEV (background)
:: =============================================
echo [PHASE 5/8] MyBonzo Astro Dev Server...
if exist "%MYBONZO_DIR%\package.json" (
    start "MyBonzo-Astro" /MIN cmd /c "cd /d %MYBONZO_DIR% && npm run dev"
    echo   [OK] MyBonzo uruchomiony -^> http://localhost:4321
) else (
    echo   [SKIP] MyBonzo nie znaleziony w %MYBONZO_DIR%
)
echo.

:: =============================================
:: PHASE 6: CLOUDFLARED TUNNELS (telefon)
:: =============================================
echo [PHASE 6/8] Cloudflared Web Tunnels (dostep z telefonu)...
where cloudflared >nul 2>&1
if errorlevel 1 (
    echo   [SKIP] cloudflared nie zainstalowany
    goto :skip_tunnels
)

:: Tunel ZENO Browser (Vite :5173)
start "Tunnel-ZENO" /MIN cmd /c "cloudflared tunnel --url http://localhost:5173 >logs\tunnel_zeno.log 2>&1"

:: Tunel MyBonzo (Astro :4321)
start "Tunnel-MyBonzo" /MIN cmd /c "cloudflared tunnel --url http://localhost:4321 >logs\tunnel_mybonzo.log 2>&1"

:: Named tunnel: analytics.mybonzo.com / plausible / search / superset
start "Tunnel-Analytics" /MIN cmd /c "cloudflared tunnel run umami-analytics >logs\tunnel_umami-analytics.log 2>&1"
echo   [OK] Named tunnel umami-analytics uruchomiony (analytics.mybonzo.com)

echo   [OK] Tunele uruchomione
echo   [INFO] Czekam na URL tuneli (8s)...
timeout /t 8 /nobreak >nul

:: Pokaz URL tuneli
for /f "tokens=*" %%u in ('findstr /R "trycloudflare.com" logs\tunnel_zeno.log 2^>nul') do (
    echo   ZENO:    %%u
)
for /f "tokens=*" %%u in ('findstr /R "trycloudflare.com" logs\tunnel_mybonzo.log 2^>nul') do (
    echo   MyBonzo: %%u
)
echo   [INFO] Pelne URL w logs\tunnel_*.log
echo.

:skip_tunnels

:: =============================================
:: PHASE 7: WATCHDOG (background)
:: =============================================
echo [PHASE 7/8] Watchdog...
if exist "%ZENO_DIR%watchdog.ps1" (
    start "ZENO-Watchdog" /MIN powershell -ExecutionPolicy Bypass -NoProfile -File "%ZENO_DIR%watchdog.ps1"
    echo   [OK] Watchdog aktywny ^(co 30s, log: logs\watchdog.log^)
) else (
    echo   [WARN] watchdog.ps1 nie znaleziony!
)
echo.

:: =============================================
:: STATUS
:: =============================================
echo  ======================================================
echo   ZENO HUB - GOTOWY
echo  ======================================================
echo.
echo   Lokalne serwisy:
echo     ZENO Browser   http://localhost:5173
echo     JIMBO Agent HUB http://localhost:4224
echo     JIMBO Chat     http://localhost:5180
echo     Libraries API  http://localhost:7070
echo     MyBonzo        http://localhost:4321
echo     Websurfx       http://localhost:8888
echo     Meilisearch    http://localhost:7700
echo     sist2          http://localhost:8085
echo     Umami          http://localhost:5183
echo     Plausible      http://localhost:8100
echo     Superset       http://localhost:8088
echo     Mydia          http://localhost:4100
echo.
echo   Tunele (telefon):
echo     URL w: logs\tunnel_zeno.log
echo            logs\tunnel_mybonzo.log
echo.
echo   Watchdog: aktywny (co 30s)
echo   Logi:     logs\watchdog.log
echo.
echo   Zamkniecie: Ctrl+C lub zamknij to okno
echo  ======================================================
echo.

:: =============================================
:: WRANGLER PAGES DEV (Cloudflare bindings local)
:: Czeka az Vite wystartuje, potem startuje na :8788
:: Daje dostep do D1, R2, KV przez http://localhost:8788
:: =============================================
echo [BG] Wrangler CF Pages Dev (port 8788, proxy -^> :5173)...
start "Wrangler-CF-Dev" /MIN cmd /c "cd /d %ZENO_DIR% && npx wait-on http://localhost:5173 --timeout 60000 && npx wrangler pages dev --proxy 5173 --port 8788 > %ZENO_DIR%logs\wrangler_dev.log 2>&1"
echo   [OK] Wrangler uruchomi sie po starcie Vite -^> http://localhost:8788

:: =============================================
:: PHASE 8: ZENO BROWSER (foreground)
:: =============================================
echo [PHASE 8/8] Uruchamianie ZENO Browser...
echo       Vite:        http://localhost:5173
echo       Wrangler CF: http://localhost:8788
echo       Electron:    auto-launch
echo.
call npm run dev
