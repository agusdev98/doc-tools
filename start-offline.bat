@echo off
setlocal
cd /d "%~dp0"
set PORT=8787

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/"
  node server.js
  exit /b
)

where py >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/"
  py -3 -m http.server %PORT%
  exit /b
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" "http://localhost:%PORT%/"
  python -m http.server %PORT%
  exit /b
)

echo No se encontro Python para iniciar el servidor local.
echo Abri este proyecto con Live Server o instala Node/Python para usar este archivo.
pause
