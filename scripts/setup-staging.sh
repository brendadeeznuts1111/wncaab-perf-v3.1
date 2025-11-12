#!/bin/bash
# Staging Environment Setup Script
# Sets up staging Telegram supergroup configuration

set -euo pipefail

echo "🧪 Setting up Staging Telegram Configuration"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.staging exists
if [ -f .env.staging ]; then
  echo -e "${YELLOW}⚠️  .env.staging file already exists${NC}"
  read -p "Overwrite? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
  fi
fi

# Prompt for staging supergroup ID
echo "Enter your staging supergroup ID (negative number, e.g., -1001234567890):"
read -p "Staging Supergroup ID: " STAGING_SUPERGROUP_ID

if [[ ! $STAGING_SUPERGROUP_ID =~ ^-100[0-9]+$ ]]; then
  echo -e "${RED}❌ Invalid supergroup ID format. Must start with -100${NC}"
  exit 1
fi

# Prompt for topic IDs
echo ""
echo "Enter staging topic thread IDs:"
read -p "Steam Alerts Topic ID (default: 1): " STAGING_TOPIC_STEAM
STAGING_TOPIC_STEAM=${STAGING_TOPIC_STEAM:-1}

read -p "Performance Metrics Topic ID (default: 2): " STAGING_TOPIC_PERFORMANCE
STAGING_TOPIC_PERFORMANCE=${STAGING_TOPIC_PERFORMANCE:-2}

read -p "Security Events Topic ID (default: 3): " STAGING_TOPIC_SECURITY
STAGING_TOPIC_SECURITY=${STAGING_TOPIC_SECURITY:-3}

# Bot token (prompt if not in environment)
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "Enter your Telegram Bot Token (get from @BotFather):"
  read -s BOT_TOKEN
  echo ""
  if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}❌ Bot token is required${NC}"
    exit 1
  fi
else
  BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
  echo "✅ Using TELEGRAM_BOT_TOKEN from environment"
fi

# Create .env.staging file
cat > .env.staging << EOF
# Staging Telegram Configuration
# Created: $(date -Iseconds)
# Supergroup ID: $STAGING_SUPERGROUP_ID
# SECURITY: Never commit this file to version control

TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
TELEGRAM_SUPERGROUP_ID="$STAGING_SUPERGROUP_ID"
TELEGRAM_TOPIC_STEAM="$STAGING_TOPIC_STEAM"
TELEGRAM_TOPIC_PERFORMANCE="$STAGING_TOPIC_PERFORMANCE"
TELEGRAM_TOPIC_SECURITY="$STAGING_TOPIC_SECURITY"
TELEGRAM_TOPIC_ERRORS="$STAGING_TOPIC_STEAM"
TELEGRAM_TOPIC_HEARTBEAT="$STAGING_TOPIC_STEAM"

# Other environment variables (copy from .env if needed)
GOALOO_MATCH_IDS="663637"
POLL_INTERVAL_MS="2000"
PORT="3001"
EOF

echo ""
echo -e "${GREEN}✅ Staging configuration saved to .env.staging${NC}"
echo ""
echo -e "${YELLOW}🔒 Security Reminder:${NC}"
echo "   - .env.staging is in .gitignore (never commit tokens)"
echo "   - For production, use Bun.secrets or secure secret management"
echo "   - Rotate tokens if exposed"
echo ""
echo "📋 Next steps:"
echo "1. Verify bot is admin in staging supergroup: $STAGING_SUPERGROUP_ID"
echo "2. Verify topics exist:"
echo "   - Steam Alerts: Topic ID $STAGING_TOPIC_STEAM"
echo "   - Performance Metrics: Topic ID $STAGING_TOPIC_PERFORMANCE"
echo "   - Security Events: Topic ID $STAGING_TOPIC_SECURITY"
echo ""
echo "3. Test staging configuration:"
echo "   export \$(cat .env.staging | xargs)"
echo "   bun run test:telegram"
echo ""
echo "4. Start with staging:"
echo "   export \$(cat .env.staging | xargs)"
echo "   bun run start"
echo ""
echo "📖 See docs/STAGING-SETUP.md for complete guide"

