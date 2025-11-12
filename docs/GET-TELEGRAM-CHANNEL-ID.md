# Getting Telegram Channel ID - Quick Guide

## Method 1: Using getUpdates (After Bot Receives Message)

1. **Add @TES_ServiceMapper_Bot to your channel** as admin
2. **Send a test message** in the channel (e.g., `/test`)
3. **Run this command**:

```bash
curl -s "https://api.telegram.org/bot7912573847:AAENyn2UDjkEu9c1bgMcDt83-Mt2IeggKDU/getUpdates" | jq '.result[] | select(.message.chat.type == "channel" or .message.chat.type == "group") | .message.chat.id'
```

Look for a negative number like `-1001234567890` - that's your channel ID.

## Method 2: Using @getmyid_bot

1. **Add @getmyid_bot** to your channel
2. **Send any message** in the channel
3. **@getmyid_bot will reply** with the chat ID

## Method 3: Using Telegram Web/Desktop

1. Open your channel in Telegram Web: https://web.telegram.org
2. Look at the URL - it will contain the channel ID
3. Or use browser DevTools → Network tab → Look for API calls containing chat IDs

## Method 4: Manual Channel ID Format

For channels, the ID format is:
- **Public channels**: `-100` + channel number (e.g., `-1001234567890`)
- **Private channels**: Similar format, negative number

## Once You Have the Channel ID

Update `.env.local`:

```bash
# Edit .env.local and add the channel ID
echo "TELEGRAM_DEV_CHANNEL_ID=-1001234567890" >> .env.local
```

Or edit manually:
```bash
nano .env.local
# Add: TELEGRAM_DEV_CHANNEL_ID=-1001234567890
```

## Test Configuration

```bash
# Test that variables are loaded
bun -e "import { env } from 'bun'; console.log('Token:', env.TELEGRAM_SERVICE_MAPPER_TOKEN ? '✅ Set' : '❌ Missing'); console.log('Chat ID:', env.TELEGRAM_DEV_CHANNEL_ID || '❌ Missing');"

# Test health check with notifications
bun run services health --notify
```

## Current Status

✅ Bot token: Configured (`7912573847:AAENyn2UDjkEu9c1bgMcDt83-Mt2IeggKDU`)  
⏳ Channel ID: **Need to get from channel**

**Next Step**: Add bot to channel, send a message, then get the channel ID using one of the methods above.

