#!/bin/bash
# Production Setup Script - Basketball Odds Pipeline
# Creates .env file and provides correct commands

set -euo pipefail

echo "🚀 Basketball Odds Pipeline - Production Setup"
echo "=============================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists. Backing up to .env.backup"
  cp .env .env.backup
fi

# Create .env file
echo "📝 Creating .env file..."
cat > .env << 'EOF'
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="your_token_here"
TELEGRAM_CHAT_ID="-1003482161671"

# Goaloo901 Polling Configuration
GOALOO_MATCH_IDS="663637,663638"
POLL_INTERVAL_MS="2000"

# Server Configuration
PORT="3001"

# Discovery Mode (optional)
# DISCOVERY_MODE="false"
# DISCOVERY_RANGE="663600-663800"
EOF

echo "✅ Created .env file"
echo ""
echo "⚠️  IMPORTANT: Edit .env and add your TELEGRAM_BOT_TOKEN"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit .env file:"
echo "   nano .env  # or use your preferred editor"
echo ""
echo "2. Verify production readiness:"
echo "   bun run verify:production"
echo ""
echo "3. Start monitoring:"
echo "   bun run start:unified              # Start with configured matches"
echo "   bun run start:discovery            # Auto-discover active matches"
echo "   bun run src/index.ts               # NowGoal WebSocket (alternative)"
echo ""
echo "4. Monitor health:"
echo "   curl http://localhost:3001/health"
echo ""
echo "5. Compile to binary (production):"
echo "   bun build src/index-unified.ts --outfile bball-poller --compile"
echo "   ./bball-poller"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: ./QUICK-START.md"
echo "   - Production Guide: ./docs/PRODUCTION-RUNBOOK.md"
echo ""
echo "✅ Setup complete!"

