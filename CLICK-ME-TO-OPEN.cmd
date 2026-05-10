@echo off
setlocal

rem Double-click this file to open Neon Nightmare.
rem It starts a local server if one is not already running, then opens the browser.

cd /d "%~dp0"
set "PORT=8787"
set "URL=http://127.0.0.1:%PORT%/neonNightmare.html"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto open_site

where py >nul 2>nul
if not errorlevel 1 (
  start "Neon Nightmare Local Server" /min py -m http.server %PORT% --bind 127.0.0.1
  goto wait_then_open
)

where python >nul 2>nul
if not errorlevel 1 (
  start "Neon Nightmare Local Server" /min python -m http.server %PORT% --bind 127.0.0.1
  goto wait_then_open
)

start "" "%~dp0neonNightmare.html"
exit /b

:wait_then_open
timeout /t 2 /nobreak >nul

:open_site
start "" "%URL%"
exit /b
