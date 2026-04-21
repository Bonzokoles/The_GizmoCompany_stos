@echo off
chcp 65001 >nul 2>&1
title ◈ JIMBO HUB — Goose AI Terminal
color 0A

echo.
echo.
echo   ╔══════════════════════════════════════════════════════════════════╗
echo   ║                                                                  ║
echo   ║         ██╗ ██╗  ███╗   ███╗██████╗  ██████╗                      ║
echo   ║         ██║ ██║  ████╗ ████║██╔══██╗██╔═══██╗                    ║
echo   ║         ██║ ██║  ██╔████╔██║██████╔╝██║   ██║                    ║
echo   ║    ██   ██║ ██║  ██║╚██╔╝██║██╔══██╗██║   ██║                    ║
echo   ║    ╚█████╔╝ ██║  ██║ ╚═╝ ██║██████╔╝╚██████╔╝                    ║
echo   ║     ╚════╝  ╚═╝  ╚═╝     ╚═╝╚═════╝  ╚═════╝                     ║
echo   ║                                                                  ║
echo   ║          ██╗  ██╗██╗   ██╗██████╗                               ║
echo   ║          ██║  ██║██║   ██║██╔══██╗                              ║
echo   ║          ███████║██║   ██║██████╔╝                              ║
echo   ║          ██╔══██║██║   ██║██╔══██╗                              ║
echo   ║          ██║  ██║╚██████╔╝██████╔╝                              ║
echo   ║          ╚═╝  ╚═╝ ╚═════╝ ╚═════╝                               ║
echo   ║                                                                  ║
echo   ║        ona tu jest i tanczy dla mnie...                         ║
echo   ║                                                                  ║
echo   ╚══════════════════════════════════════════════════════════════════╝
echo.
echo.

set "GOOSE_EXE=E:\Programs\goose\goose.exe"
if not exist "%GOOSE_EXE%" (
    echo   [BLAD] Goose nie znaleziony: %GOOSE_EXE%
    pause
    exit /b 1
)

echo   Startuje sesje Goose AI...
echo   Wpisz komendy lub obserwuj taski z AgentHubPanel
echo   Ctrl+C = wyjscie
echo.

:: Uruchom sesję Goose — --name dla persistencji z JIMBO Hub
"%GOOSE_EXE%" session --name jimbo-hub

if errorlevel 1 (
    echo.
    echo  [BLAD] Goose zakonczyl sie z bledem. Sprawdz konfiguracje.
    pause
)
