#!/bin/bash
set -euo pipefail
cd /root/mega-lanches

PORT=$(sed -n 's/^WPP_PORT=//p' .env | tr -d '\r'); [ -n "$PORT" ] || PORT=21465
SESSION=$(sed -n 's/^WPP_SESSION=//p' .env | tr -d '\r'); [ -n "$SESSION" ] || SESSION=megaslanches_v3
TOKEN=$(sed -n 's/^WPP_TOKEN=//p' .env | tr -d '\r')
FAIL_FILE="/tmp/mega-wpp-watchdog-failures"
RECOVERY_FILE="/tmp/mega-wpp-watchdog-last-recovery"
MAX_FAILURES=3
RECOVERY_COOLDOWN=300

ST=$(curl -m 12 -s -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:${PORT}/api/${SESSION}/check-connection-session" || true)

if echo "$ST" | grep -Eiq '"status"[[:space:]]*:[[:space:]]*(true|"connected")|"message"[[:space:]]*:[[:space:]]*"connected"|"response"[[:space:]]*:[[:space:]]*"connected"'; then
  rm -f "$FAIL_FILE"
  exit 0
fi

FAILURES=0
[ -f "$FAIL_FILE" ] && FAILURES=$(cat "$FAIL_FILE" 2>/dev/null || echo 0)
case "$FAILURES" in ''|*[!0-9]*) FAILURES=0;; esac
FAILURES=$((FAILURES + 1))
printf '%s' "$FAILURES" > "$FAIL_FILE"

if [ "$FAILURES" -lt "$MAX_FAILURES" ]; then
  echo "[$(date '+%F %T')] WPP sem resposta ($FAILURES/$MAX_FAILURES). Aguardando nova verificacao."
  exit 0
fi

NOW=$(date +%s)
LAST_RECOVERY=0
[ -f "$RECOVERY_FILE" ] && LAST_RECOVERY=$(cat "$RECOVERY_FILE" 2>/dev/null || echo 0)
case "$LAST_RECOVERY" in ''|*[!0-9]*) LAST_RECOVERY=0;; esac
if [ $((NOW - LAST_RECOVERY)) -lt "$RECOVERY_COOLDOWN" ]; then
  echo "[$(date '+%F %T')] WPP continua sem resposta, mas a recuperacao esta em cooldown."
  exit 0
fi

printf '%s' "$NOW" > "$RECOVERY_FILE"
rm -f "$FAIL_FILE"
echo "[$(date '+%F %T')] WPP falhou $MAX_FAILURES vezes. Executando recovery..."
/bin/bash /root/mega-lanches/scripts/wpp_unlock_and_reconnect.sh
