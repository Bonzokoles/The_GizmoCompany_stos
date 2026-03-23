@echo off
chcp 65001 >nul 2>&1
:: ============================================================
:: SYNC: U:\The_DEVz_HUB_of_work  -->  A:\The_DEVz_HUB_of_work
:: Tryb: MIRROR (1:1) - robocopy /MIR
:: Wywolanie: recznie, przez Task Scheduler, lub z start_zeno_hub.bat
:: ============================================================

set "SRC=U:\The_DEVz_HUB_of_work"
set "DST=A:\The_DEVz_HUB_of_work"
set "LOG=U:\WWW_Zen_BRo_wser_org3\logs\sync_devz_hub.log"
set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"

echo [%TIMESTAMP%] Sync start: %SRC% --^> %DST% >> "%LOG%"

robocopy "%SRC%" "%DST%" ^
    /MIR ^
    /MT:8 ^
    /R:2 ^
    /W:5 ^
    /XD ".git" "chroma_db" "chroma_kb" "__pycache__" "node_modules" ".venv" "venv" ^
    /XF "*.tmp" "*.log" "thumbs.db" ^
    /NP ^
    /LOG+:"%LOG%"

set RC=%errorlevel%
if %RC% LEQ 3 (
    echo [%TIMESTAMP%] Sync OK (rc=%RC%) >> "%LOG%"
) else (
    echo [%TIMESTAMP%] Sync ERROR (rc=%RC%) >> "%LOG%"
)

exit /b 0
