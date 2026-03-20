@echo off
setlocal

REM Główny folder bazy filmów
set "BASE=M:\MOVIES_DATA_BASE"

echo Tworzenie struktury katalogów...
if not exist "%BASE%" mkdir "%BASE%"
if not exist "%BASE%\posters" mkdir "%BASE%\posters"

echo Kopiowanie plików HTML / JSON...
copy /Y "%~dp0MOVIES_DATA_BASE_index.html" "%BASE%" >nul
copy /Y "%~dp0movies_data.json" "%BASE%" >nul
copy /Y "%~dp0movies_data_template.json" "%BASE%" >nul

echo Start lokalnej apki filmowej...
start "" "%BASE%\MOVIES_DATA_BASE_index.html"

echo Gotowe.
endlocal