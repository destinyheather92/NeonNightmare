@echo off
setlocal

rem Open this folder's standalone site through a tiny local web server.
rem This avoids browser issues with directly opening local HTML files.
cd /d "%~dp0"
set "PORT=8787"
set "URL=http://127.0.0.1:%PORT%/neonNightmare.html"

where py >nul 2>nul
if %errorlevel%==0 (
  start "Neon Nightmare Server" /min py -m http.server %PORT% --bind 127.0.0.1
  goto openbrowser
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "Neon Nightmare Server" /min python -m http.server %PORT% --bind 127.0.0.1
  goto openbrowser
)

rem If Python is unavailable, fall back to opening the HTML file directly.
start "" "%~dp0neonNightmare.html"
exit /b

:openbrowser
timeout /t 2 /nobreak >nul
start "" "%URL%"
