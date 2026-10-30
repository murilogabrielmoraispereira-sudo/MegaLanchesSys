#!/bin/bash
set -euo pipefail
cd /root/mega-lanches

PORT=$(sed -n 's/^WPP_PORT=//p' .env | tr -d '\r'); [ -n "$PORT" ] || PORT=21465
SESSION=$(sed -n 's/^WPP_SESSION=//p' .env | tr -d '\r'); [ -n "$SESSION" ] || SESSION=megaslanches_v3
SECRET=$(sed -n 's/^WPP_SECRET_KEY=//p' .env | tr -d '\r'); [ -n "$SECRET" ] || SECRET=megaSecret2026
PUBLIC=$(sed -n 's/^PUBLIC_URL=//p' .env | tr -d '\r')
WHTOKEN=$(sed -n 's/^WPP_WEBHOOK_TOKEN=//p' .env | tr -d '\r')

pm2 stop wppconnect >/dev/null 2>&1 || true
pkill -9 -f "userDataDir/${SESSION}" || true
find "userDataDir/${SESSION}" -maxdepth 1 -type f -name 'Singleton*' -delete 2>/dev/null || true

pm2 restart wppconnect --update-env >/dev/null
sleep 12

TOKEN=$(curl -s -X POST "http://127.0.0.1:${PORT}/api/${SESSION}/${SECRET}/generate-token" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{process.stdout.write(JSON.parse(d).token||'')}catch{}})")
[ -n "$TOKEN" ] || { echo "ERRO_TOKEN"; exit 1; }

awk -v tok="$TOKEN" 'BEGIN{d=0} /^WPP_TOKEN=/{print "WPP_TOKEN="tok; d=1; next} {print} END{if(!d) print "WPP_TOKEN="tok}' .env > .env.new && mv .env.new .env

HOOK="${PUBLIC}/webhook/wppconnect"
[ -n "$WHTOKEN" ] && HOOK="${HOOK}?token=${WHTOKEN}"

curl -m 20 -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"waitQrCode\":false,\"autoClose\":0,\"webhook\":\"${HOOK}\"}" \
  "http://127.0.0.1:${PORT}/api/${SESSION}/start-session" >/dev/null || true

pm2 restart mega-lanches --update-env >/dev/null
pm2 save >/dev/null || true

for tentativa in 1 2 3 4 5 6 7 8; do
  sleep 5
  STATUS=$(curl -m 10 -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:${PORT}/api/${SESSION}/check-connection-session" || true)
  if echo "$STATUS" | grep -Eiq '"status"[[:space:]]*:[[:space:]]*true|"message"[[:space:]]*:[[:space:]]*"connected"'; then
    echo "$STATUS"
    exit 0
  fi
done

echo "ERRO_RECONECTAR: sessao nao confirmou conexao apos 40 segundos."
exit 1
