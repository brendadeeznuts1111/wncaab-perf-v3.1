#!/bin/bash
# scripts/audit-tes-ngws-001.12c.sh
# TES-NGWS-001.12c: Post-Deploy Compliance Audit

set -euo pipefail

LOG_FILE="${1:-logs/headers-index.log}"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Log file not found: $LOG_FILE"
  exit 1
fi

echo "🔍 TES-NGWS-001.12c Compliance Audit"
echo "===================================="
echo "Log file: $LOG_FILE"
echo ""

# 1. Monitor security events in real-time
echo "1️⃣  Security Events (TES-NGWS-001.12c):"
SECURITY_COUNT=$(rg "\[TES-NGWS-001.12c\]\[SECURITY\]" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "   Total security events: $SECURITY_COUNT"
if [ "$SECURITY_COUNT" -gt 0 ]; then
  echo "   Recent events:"
  rg "\[TES-NGWS-001.12c\]\[SECURITY\]" "$LOG_FILE" 2>/dev/null | tail -5 | sed 's/^/     /'
fi
echo ""

# 2. Verify only Bun.secrets used in production
echo "2️⃣  Bun.secrets Usage (SECRETS_UPGRADE_V3):"
BUN_SECRETS_COUNT=$(rg "\[SECRETS_UPGRADE_V3\].*source:bun_secrets" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "   Bun.secrets usage count: $BUN_SECRETS_COUNT"
if [ "$BUN_SECRETS_COUNT" -gt 0 ]; then
  echo "   ✅ Production using Bun.secrets"
else
  echo "   ⚠️  No Bun.secrets usage detected"
fi
echo ""

# 3. Find any .env fallback (should be 0 in prod)
echo "3️⃣  .env Fallback Detection:"
FALLBACK_COUNT=$(rg "\[FALLBACK_TO_ENV\]" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "   Fallback count: $FALLBACK_COUNT"
if [ "$FALLBACK_COUNT" -eq 0 ]; then
  echo "   ✅ No .env fallback detected (production compliant)"
else
  echo "   ⚠️  WARNING: $FALLBACK_COUNT fallback events detected"
  echo "   Recent fallbacks:"
  rg "\[FALLBACK_TO_ENV\]" "$LOG_FILE" 2>/dev/null | tail -3 | sed 's/^/     /'
fi
echo ""

# 4. Generate compliance report (last 24h)
echo "4️⃣  Compliance Report (Last 24h):"
RECENT_LOGS=$(mktemp)
if [ -f "$LOG_FILE" ]; then
  # Get logs from last 24 hours (approximate - based on timestamp in log)
  rg "\[TES-NGWS-001.12c\]" "$LOG_FILE" 2>/dev/null | tail -1000 > "$RECENT_LOGS" || true
  if [ -s "$RECENT_LOGS" ]; then
    echo "   Event breakdown:"
    awk -F'[][]' '{print $2}' "$RECENT_LOGS" | sort | uniq -c | sort -rn | head -10 | sed 's/^/     /'
  else
    echo "   No recent events found"
  fi
  rm -f "$RECENT_LOGS"
fi
echo ""

# 5. Real-time monitoring command
echo "5️⃣  Real-time Monitoring:"
echo "   Run: tail -f $LOG_FILE | rg \"\[TES-NGWS-001.12c\]\[SECURITY\]\""
echo ""

# Summary
echo "📊 Summary:"
echo "   Security events: $SECURITY_COUNT"
echo "   Bun.secrets usage: $BUN_SECRETS_COUNT"
echo "   .env fallbacks: $FALLBACK_COUNT"
echo ""

if [ "$FALLBACK_COUNT" -eq 0 ] && [ "$BUN_SECRETS_COUNT" -gt 0 ]; then
  echo "✅ TES-NGWS-001.12c: COMPLIANT"
else
  echo "⚠️  TES-NGWS-001.12c: REVIEW REQUIRED"
fi

