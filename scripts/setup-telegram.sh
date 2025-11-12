#!/bin/bash
# Quick Setup Script - TES-NGWS-001.12
# Sets up Telegram bot configuration
# SECURITY: Never hardcode tokens - use Bun.secrets or environment variables

set -euo pipefail

echo "🤖 Setting up Telegram Bot Configuration"
echo "=========================================="
echo ""
echo "⚠️  SECURITY: Bot token will be stored in .env (never commit to git)"
echo ""

# Prompt for bot token (never hardcode)
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "Enter your Telegram Bot Token (get from @BotFather):"
  read -s BOT_TOKEN
  echo ""
  if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Bot token is required"
    exit 1
  fi
else
  BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
  echo "✅ Using TELEGRAM_BOT_TOKEN from environment"
fi

# Bot username (for reference only)
BOT_USERNAME="@bballasiasteam_bot"
SUPERGROUP_ID="-1003482161671"

echo "Bot: $BOT_USERNAME"
echo "Supergroup ID: $SUPERGROUP_ID"
echo ""

# Check if .env exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists"
  read -p "Overwrite? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
  fi
fi

# Create .env file
cat > .env << EOF
# Telegram Bot Configuration - TES-NGWS-001.12
# Bot: $BOT_USERNAME
# Created: $(date -Iseconds)
# SECURITY: Never commit this file to version control

TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
TELEGRAM_SUPERGROUP_ID="$SUPERGROUP_ID"
TELEGRAM_TOPIC_STEAM="1"
TELEGRAM_TOPIC_PERFORMANCE="2"
TELEGRAM_TOPIC_SECURITY="3"
TELEGRAM_TOPIC_ERRORS="4"
TELEGRAM_TOPIC_HEARTBEAT="5"
EOF

echo "✅ Configuration saved to .env"
echo ""
echo "🔒 Security Reminder:"
echo "   - .env is in .gitignore (never commit tokens)"
echo "   - For production, use Bun.secrets or secure secret management"
echo "   - Rotate tokens if exposed"
echo ""
echo "📋 Next steps:"
echo "1. Add bot to your supergroup as admin"
echo "2. Create topics in your supergroup:"
echo "   - Topic #1: 🚨 Critical Steam Moves"
echo "   - Topic #2: 📈 Performance Metrics"
echo "   - Topic #3: 🔐 Security Events"
echo "   - Topic #4: 🐛 System Errors"
echo "   - Topic #5: 💓 Heartbeat"
echo ""
echo "3. Test the bot:"
echo "   bun run test:telegram"
echo ""
echo "4. Start the sentinel:"
echo "   bun run start:sentinel"
echo ""

