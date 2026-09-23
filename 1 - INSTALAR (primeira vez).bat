@echo off
title Instalando o site Regadoces - NAO FECHE ESTA JANELA
cd /d "%~dp0"
echo.
echo  Preparando a instalacao... NAO FECHE esta janela.
echo.

rem ===== Verifica se o Node.js ja existe e se e novo o suficiente =====
set NEED_NODE=1
where node >nul 2>nul
if errorlevel 1 goto node_check_done
set NODE_MAJOR=0
for /f "tokens=1 delims=v." %%A in ('node -v') do set NODE_MAJOR=%%A
if %NODE_MAJOR% GEQ 20 set NEED_NODE=0
:node_check_done

if %NEED_NODE%==0 goto instalar_site

rem ===== Baixa e instala o Node.js automaticamente =====
echo  O motor do site (Node.js) nao foi encontrado neste computador.
echo  Baixando e instalando automaticamente... isso demora alguns minutos.
echo.
echo  ATENCAO: se aparecer uma pergunta de permissao do Windows,
echo  clique em "SIM".
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $base='https://nodejs.org/dist/latest-v24.x/'; $html=(Invoke-WebRequest $base -UseBasicParsing).Content; $m=[regex]::Match($html,'node-v[\d\.]+-x64\.msi').Value; Invoke-WebRequest ($base+$m) -OutFile \"$env:TEMP\node-setup.msi\""
if not exist "%TEMP%\node-setup.msi" goto erro_download

echo  Download concluido. Instalando o Node.js...
msiexec /i "%TEMP%\node-setup.msi" /passive /norestart
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 goto erro_node
del "%TEMP%\node-setup.msi" >nul 2>nul
echo  Node.js instalado com sucesso!
echo.

:instalar_site
rem ===== Instala as dependencias do site =====
echo  Instalando o site... isso demora alguns minutos.
echo  NAO FECHE esta janela. Vai aparecer "PRONTO" quando acabar.
echo.
call npm install
if errorlevel 1 goto erro_npm
echo.
echo  ============================================
echo   PRONTO! Agora e so usar o "2 - ABRIR O SITE"
echo  ============================================
echo.
pause
exit /b

:erro_download
echo.
echo  ERRO: nao consegui baixar o Node.js.
echo  Verifique se o computador esta conectado na internet e tente de novo.
echo.
pause
exit /b

:erro_node
echo.
echo  ERRO: a instalacao do Node.js nao terminou.
echo  Se apareceu uma pergunta de permissao, era preciso clicar em "SIM".
echo  Feche esta janela e de dois cliques neste arquivo de novo.
echo.
pause
exit /b

:erro_npm
echo.
echo  ERRO: a instalacao do site falhou.
echo  Verifique a internet, feche esta janela e tente de novo.
echo  Se continuar dando erro, mande uma foto desta janela para o Jean.
echo.
pause
exit /b
