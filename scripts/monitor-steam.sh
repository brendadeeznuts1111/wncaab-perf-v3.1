#!/usr/bin/env bash
# Real-Time Steam Detection Monitor - TES-NGWS-001.11b

# Monitor steam detections with colorized output

LOG_FILE="logs/headers-index.log"

echo "🚨 Steam Detection Monitor"
echo "=========================="
echo "Watching: $LOG_FILE"
echo "Press CTRL+C to stop"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

tail -f "$LOG_FILE" 2>/dev/null | while read line; do
  if echo "$line" | rg -q "\[STEAM_DETECTED\]"; then
    # Extract key info
    GAME_ID=$(echo "$line" | rg -o "gameId:([0-9]+)" -r '$1' || echo "unknown")
    TYPE=$(echo "$line" | rg -o "MULTI_RAPID|LARGE_SINGLE" || echo "unknown")
    VELOCITY=$(echo "$line" | rg -o "velocity:([0-9.]+)" -r '$1' || echo "0")
    STEAM_INDEX=$(echo "$line" | rg -o "steamIndex:([0-9.]+)" -r '$1' || echo "0")
    
    # Color based on type
    if [[ "$TYPE" == "LARGE_SINGLE" ]]; then
      COLOR="$RED"
      ICON="🔥"
    else
      COLOR="$YELLOW"
      ICON="⚡"
    fi
    
    echo -e "${COLOR}${ICON} STEAM DETECTED${NC} | Game: $GAME_ID | Type: $TYPE | Velocity: ${VELOCITY}% | Index: $STEAM_INDEX"
  elif echo "$line" | rg -q "\[TELEGRAM_SENT\]"; then
    echo -e "${GREEN}✉️  Telegram alert sent${NC}"
  elif echo "$line" | rg -q "\[WS_OPEN\]"; then
    echo -e "${BLUE}🔌 WebSocket connected${NC}"
  elif echo "$line" | rg -q "ERROR|FATAL"; then
    echo -e "${RED}❌ ERROR: $line${NC}"
  fi
done







