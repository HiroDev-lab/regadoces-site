@echo off
title Site Regadoces - DEIXE ESTA JANELA ABERTA ENQUANTO USA O SITE
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Falta instalar! De dois cliques primeiro no arquivo:
  echo  "1 - INSTALAR (primeira vez)"
  echo.
  pause
  exit /b
)
if not exist node_modules (
  echo.
  echo  Falta instalar! De dois cliques primeiro no arquivo:
  echo  "1 - INSTALAR (primeira vez)"
  echo.
  pause
  exit /b
)
echo.
echo  Ligando o site... o navegador abre sozinho em alguns segundos.
echo  Para FECHAR o site depois, e so fechar esta janela preta.
echo.
start "" cmd /c "timeout /t 7 >nul & start http://localhost:3000"
npm run dev
