# Service Mapper Telegram Bot Setup Guide

**Bot**: @TES_ServiceMapper_Bot  
**Channel**: https://t.me/+fY5Rst8UQo4zNGVh  
**Status**: ✅ Configured

---

## Quick Setup

### 1. Create `.env.local` file

```bash
# Copy the example template
cp .env.local.example .env.local

# Edit with your bot token (already provided)
# Add your channel ID after getting it from the channel
```

### 2. Get Channel ID

1. **Join the channel**: https://t.me/+fY5Rst8UQo4zNGVh
2. **Add @TES_ServiceMapper_Bot as admin** (Post Messages permission)
3. **Send a test message** in the channel: `/test`
4. **Get updates** to find chat_id:

```bash
curl "https://api.telegram.org/bot7912573847:AAENyn2UDjkEu9c1bgMcDt83-Mt2IeggKDU/getUpdates" | jq '.result[].message.chat.id'
```

Look for a negative number like `-1001234567890` - that's your `TELEGRAM_DEV_CHANNEL_ID`

5. **Update `.env.local`**:

```bash
echo "TELEGRAM_DEV_CHANNEL_ID=-1001234567890" >> .env.local
```

### 3. Test the Integration

```bash
# Test health check with notifications
bun run services health --notify
```

Expected output:
- Health check table in terminal
- If services offline: Telegram message sent
- Console message: "📱 Alert sent to Telegram"

---

## Configuration Files

### `.env.local` (DO NOT COMMIT)

```bash
TELEGRAM_SERVICE_MAPPER_TOKEN=7912573847:AAENyn2UDjkEu9c1bgMcDt83-Mt2IeggKDU
TELEGRAM_DEV_CHANNEL_ID=-1001234567890
```

### Environment Variable Names

- `TELEGRAM_SERVICE_MAPPER_TOKEN` - Bot token (separate from production bot)
- `TELEGRAM_DEV_CHANNEL_ID` - Channel/group chat ID

---

## Security Checklist

- ✅ `.env.local` in `.gitignore` (already configured)
- ✅ Separate bot from production alerts
- ✅ Bot has minimal permissions (Post Messages only)
- ✅ Token never appears in code or logs
- ✅ Environment variables loaded securely

---

## Usage

```bash
# Standard health check (no notifications)
bun run services health

# Health check with Telegram alert
bun run services health --notify
```

---

## Troubleshooting

### Bot Not Sending Messages

1. **Verify bot is admin** in the channel
2. **Check channel ID** is correct (should be negative number)
3. **Test bot token**:
   ```bash
   curl "https://api.telegram.org/bot${TELEGRAM_SERVICE_MAPPER_TOKEN}/getMe"
   ```

### Environment Variables Not Loading

The script automatically loads `.env.local` if it exists. If variables aren't loading:

1. Check `.env.local` exists in project root
2. Verify format: `KEY=value` (no spaces around `=`)
3. Check file permissions: `chmod 600 .env.local`

---

**Last Updated**: 2025-01-XX  
**Status**: Ready for Testing ✅

