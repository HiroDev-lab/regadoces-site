#!/usr/bin/env bash
# =====================================================================
# DEPLOY DO SITE REGADOCES NA NUVEM HOSPEDAGEM (cPanel + Node.js/Passenger)
# ---------------------------------------------------------------------
# O que faz:
#   1. gera o build "standalone" do Next.js localmente (o servidor tem
#      pouca memória para rodar o build)
#   2. monta o pacote: standalone + .next/static + public + app.js
#      (SEM a pasta /data e SEM /uploads — os dados que estão no servidor
#      são preservados)
#   3. envia o zip pela API do cPanel, extrai por cima da versão antiga
#      e reinicia a aplicação (tmp/restart.txt)
#
# Pré-requisitos (uma vez):
#   - token de API do cPanel salvo em ~/.regadoces-cpanel-token
#     (cPanel → Gerenciar tokens de API)
#   - a aplicação Node já criada no cPanel ("Setup Node.js App"):
#     raiz regadoces-app, URL /, arquivo app.js, Node 22, modo Production,
#     variáveis ADMIN_SLUG, SESSION_SECRET, NEXT_PUBLIC_WHATSAPP
#
# Uso (Git Bash, na pasta do projeto):  bash scripts/deploy-nuvem.sh
# =====================================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash: não converter "/home/..." em caminho do Windows

CP_USER="${CPANEL_USER:?defina CPANEL_USER (usuário do cPanel)}"
CP_HOST="${CPANEL_HOST:?defina CPANEL_HOST (ex.: https://servidor:2083)}"
APP_DIR="${CPANEL_APP_DIR:-/home/$CP_USER/regadoces-app}"
TOKEN_FILE="$HOME/.regadoces-cpanel-token"
[ -f "$TOKEN_FILE" ] || { echo "Falta o token do cPanel em $TOKEN_FILE"; exit 1; }
AUTH="Authorization: cpanel $CP_USER:$(cat "$TOKEN_FILE")"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
ZIP="$WORK/regadoces-deploy.zip"

echo "1/4 build..."
cd "$ROOT"
rm -rf .next
npm run build > "$WORK/build.log" 2>&1 || { tail -30 "$WORK/build.log"; exit 1; }

echo "2/4 pacote..."
mkdir -p "$WORK/deploy/.next/static"
cp -r .next/standalone/. "$WORK/deploy/"
cp -r .next/static/. "$WORK/deploy/.next/static/"
cp -r public "$WORK/deploy/public"
rm -rf "$WORK/deploy/data"          # nunca sobrescrever os dados do servidor
printf '%s\n' \
  '// Ponto de entrada para o Passenger (cPanel "Setup Node.js App").' \
  'process.env.HOSTNAME = "127.0.0.1";' \
  'process.env.NODE_ENV = "production";' \
  'require("./server.js");' > "$WORK/deploy/app.js"
( cd "$WORK/deploy" && /c/Windows/System32/tar.exe -a -cf "$(cygpath -w "$ZIP")" . )
echo "   $(du -h "$ZIP" | cut -f1)"

api2() { # módulo função query...
  curl -s -m 600 -H "$AUTH" "$CP_HOST/json-api/cpanel?cpanel_jsonapi_user=$CP_USER&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=$1&cpanel_jsonapi_func=$2&$3"
}
enc() { node -e "console.log(encodeURIComponent(process.argv[1]))" "$1"; }

echo "3/4 envio..."
# apaga o build antigo (a extração não remove arquivos que deixaram de existir)
api2 Fileman fileop "op=unlink&sourcefiles=$(enc "$APP_DIR/.next/server")" > /dev/null
api2 Fileman fileop "op=unlink&sourcefiles=$(enc "$APP_DIR/.next/static")" > /dev/null
# cache de runtime do Next (páginas/fetch) — se ficar, o site pode servir HTML antigo
api2 Fileman fileop "op=unlink&sourcefiles=$(enc "$APP_DIR/.next/cache")" > /dev/null
( cd "$WORK" && curl -s -m 900 -H "$AUTH" -F "dir=$APP_DIR" -F "overwrite=1" -F "file-1=@regadoces-deploy.zip" \
    "$CP_HOST/execute/Fileman/upload_files" | grep -q '"succeeded":1' ) || { echo "falha no upload"; exit 1; }
api2 Fileman fileop "op=extract&sourcefiles=$(enc "$APP_DIR/regadoces-deploy.zip")&destfiles=$(enc "$APP_DIR")" | grep -q '"result":1' || { echo "falha ao extrair"; exit 1; }
api2 Fileman fileop "op=unlink&sourcefiles=$(enc "$APP_DIR/regadoces-deploy.zip")" > /dev/null

echo "4/4 reinicia..."
curl -s -m 60 -H "$AUTH" --data-urlencode "dir=$APP_DIR/tmp" --data-urlencode "file=restart.txt" \
  --data-urlencode "content=$(date)" "$CP_HOST/execute/Fileman/save_file_content" > /dev/null
sleep 8
for u in / /produtos /painel; do
  printf '   %-22s HTTP %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' -m 90 "https://regadoces.com.br$u")"
done
rm -rf "$WORK"
echo "pronto: https://regadoces.com.br"
