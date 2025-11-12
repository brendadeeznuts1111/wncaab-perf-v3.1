# Telegram Health Notifications - Service Mapper Integration

**Feature**: Optional Telegram notifications for service health checks  
**Status**: ✅ Implemented  
**Ticket**: TES-OPS-004.B.8.17 (v1.1 Enhancement)

---

## Quick Start

### 1. Configure Telegram Bot

Add to your environment (`.env`, `bunfig.toml`, or shell):

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_CHAT_ID="-1001234567890"  # Channel/group ID
```

### 2. Run Health Check with Notifications

```bash
# Standard health check (no notifications)
bun run services health

# Health check with Telegram alert
bun run services health --notify
```

---

## Setup Instructions

### Step 1: Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Create Channel/Group

1. Create a new Telegram channel: `TES Service Mapper`
2. Add your bot as an admin
3. Get the channel ID:
   - Message [@getmyid_bot](https://t.me/getmyid_bot) in your channel
   - Copy the chat ID (format: `-1001234567890` for channels)

### Step 3: Configure Environment

**Option A: bunfig.toml** (Recommended)

```toml
[env]
TELEGRAM_BOT_TOKEN = "your_bot_token_here"
TELEGRAM_CHAT_ID = "-1001234567890"
```

**Option B: Shell Environment**

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_CHAT_ID="-1001234567890"
```

**Option C: .env file**

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=-1001234567890
```

---

## Usage Examples

### Basic Health Check (No Notification)

```bash
bun run services health
```

Output: Standard table format in terminal

### Health Check with Telegram Alert

```bash
bun run services health --notify
```

**Behavior**:
- ✅ If all services healthy → Sends success notification
- 🚨 If services offline → Sends alert with list of offline services
- ⚠️ If errors occur → Includes error services in alert

---

## Notification Format

### Success Notification (All Healthy)

```
✅ TES Service Health Check

All 14 services are healthy! 🎉

Run `bun run services health` for details.
```

### Alert Notification (Services Offline)

```
🚨 TES Service Alert

2 service(s) offline:
• Worker Telemetry API (tes-repo)
• Dev Server (Tmux) (tmux-sentinel)

Status: 12/14 healthy

Run `bun run services health` for details.
```

---

## Features

✅ **Optional** - Only sends when `--notify` flag is used  
✅ **Smart Filtering** - Only alerts for unhealthy/error services  
✅ **Success Notifications** - Optional positive feedback when all healthy  
✅ **Markdown Formatting** - Clean, readable messages  
✅ **Error Handling** - Graceful fallback if Telegram API fails  
✅ **Worktree Context** - Shows which worktree each service belongs to  

---

## Integration with Cron/Systemd

### Cron Example (Every 5 minutes)

```bash
# Add to crontab: crontab -e
*/5 * * * * cd /path/to/project && bun run services health --notify
```

### Systemd Timer Example

**File**: `/etc/systemd/system/tes-health-check.timer`

```ini
[Unit]
Description=TES Service Health Check Timer

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

**File**: `/etc/systemd/system/tes-health-check.service`

```ini
[Unit]
Description=TES Service Health Check

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/project
Environment="TELEGRAM_BOT_TOKEN=your_token"
Environment="TELEGRAM_CHAT_ID=your_chat_id"
ExecStart=/usr/local/bin/bun run services health --notify
```

---

## Troubleshooting

### Notification Not Sending

1. **Check environment variables**:
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID
   ```

2. **Test bot token**:
   ```bash
   curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
   ```

3. **Test chat ID**:
   ```bash
   curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${TELEGRAM_CHAT_ID}"
   ```

### Common Issues

- **"Failed to send Telegram notification"**: Check bot token and chat ID
- **"Chat not found"**: Ensure bot is added as admin to channel/group
- **No notification sent**: Verify `--notify` flag is used and env vars are set

---

## Future Enhancements

- [ ] Bot commands (`/services health`, `/services list`)
- [ ] Custom notification thresholds
- [ ] Alert frequency limiting (rate limiting)
- [ ] Different notification channels per worktree
- [ ] Rich formatting with service icons
- [ ] Historical health trends

---

**Last Updated**: 2025-01-XX  
**Status**: Production Ready ✅

