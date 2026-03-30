@echo off
REM ============================================================
REM ZENO Browser — VS Code Launcher z MCP + API Keys
REM Ładuje klucze z .env i uruchamia VS Code z pełnym kontekstem
REM ============================================================

echo [ZENO] Ladowanie kluczy API z .env...

cd /d "%~dp0"

REM Ładuj zmienne z .env do środowiska
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        REM Pomijaj komentarze i puste linie
        echo %%A | findstr /r "^#" >nul 2>&1
        if errorlevel 1 (
            if not "%%A"=="" (
                set "%%A=%%B"
            )
        )
    )
    echo [ZENO] Klucze API zaladowane.
) else (
    echo [ZENO] UWAGA: Brak pliku .env! Uruchom scripts\sync-env.ps1
)

echo [ZENO] Uruchamianie VS Code z kontekstem MCP...
code .

echo [ZENO] VS Code uruchomiony.
