#!/bin/bash
# Start Sentinel Script - TES-NGWS-001.12
# Launch script for Transcendent Edge Sentinel with Telegram alerts

set -euo pipefail

echo "🚀 Starting Transcendent Edge Sentinel with Telegram alerts..."
echo "==============================================="

# Verify Telegram env vars
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "⚠️  TELEGRAM_BOT_TOKEN not set - Telegram alerts disabled"
  echo "   Set TELEGRAM_BOT_TOKEN and TELEGRAM_SUPERGROUP_ID to enable"
fi

if [[ -z "${TELEGRAM_SUPERGROUP_ID:-}" ]]; then
  echo "⚠️  TELEGRAM_SUPERGROUP_ID not set - Telegram alerts disabled"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Log startup with rg metadata
STARTUP_RG="[HEADERS_BLOCK_START:v1]{event:STARTUP|pid:$$}~[SYSTEM][tes.internal][INIT][BOOT][BUN-V1.3][TES-NGWS-001.12][StartupScript][#REF:$(date -Iseconds)][TIMESTAMP:$(date +%s)000][HEADERS_BLOCK_END]"
echo "$(date -Iseconds) $STARTUP_RG" >> logs/headers-index.log

# Start with console depth for debugging
exec bun --console-depth=6 src/index.ts

