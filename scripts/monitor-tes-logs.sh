#!/usr/bin/env bash
# TES-DEPLOY-001: Log Tailing & Monitoring Script
# Monitors TES-NGWS-001.5 deployment logs with filtering

ENV=${1:-staging}
FILTER=${2:-""}

echo "📊 TES-NGWS-001.5 Log Monitoring"
echo "Environment: $ENV"
echo "Filter: ${FILTER:-'all events'}"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Default filter patterns for TES-NGWS-001.5
if [ -z "$FILTER" ]; then
  FILTER="DEPLOY|ws:upgrade|keyVersion|TES-NGWS-001.5|VERSION_SIGNING_KEY|CSRF|subprotocol"
fi

# Tail logs with filtering
bunx wrangler tail --env="$ENV" 2>&1 | grep -E "$FILTER" --color=always

