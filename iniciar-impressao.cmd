@echo off
title Mega Lanches - Impressao
setlocal
set "MEGA_DIR=%~dp0"
if not exist "%MEGA_DIR%\scripts\print-agent.js" set "MEGA_DIR=D:\Usuario\Desktop\mega-lanches"
if not exist "%MEGA_DIR%\scripts\print-agent.js" set "MEGA_DIR=%~dp0"
if not exist "%MEGA_DIR%\scripts\print-agent.js" (
  echo Nao encontrei scripts\print-agent.js.
  echo Coloque este arquivo dentro da pasta mega-lanches ou ajuste MEGA_DIR.
  pause
  exit /b 1
)
cd /d "%MEGA_DIR%"
set "MEGA_SERVER_URL=https://megalanches-cardapio.com.br"
set "PRINT_TOKEN="
set "PRINT_INTERFACE=printer:POS-80"
set "PRINT_WINDOWS_MODE=raw"
set "PRINT_RAW_SCALE_X=2"
set "PRINT_RAW_SCALE_Y=2"
set "PRINT_RAW_BOLD=1"
set "PRINT_MAX_COLS=34"
echo Iniciando agente de impressao Mega Lanches...
echo Servidor: %MEGA_SERVER_URL%
echo Impressora: %PRINT_INTERFACE%
node scripts\print-agent.js
echo.
echo O agente de impressao foi finalizado.
pause

