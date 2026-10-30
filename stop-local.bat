@echo off
setlocal
set "WIN_DIR=%~dp0"
if "%WIN_DIR:~-1%"=="\" set "WIN_DIR=%WIN_DIR:~0,-1%"
for /f "usebackq delims=" %%i in (`wsl.exe wslpath -u "%WIN_DIR%"`) do set "WSL_DIR=%%i"
wsl.exe bash -lc "cd '%WSL_DIR%' && ./stop-local.sh %*"
pause
endlocal
