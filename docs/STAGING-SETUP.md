# Staging Environment Setup Guide

**Grepable Tag:** `[#TELEGRAM:staging-setup]`  
**Version:** `1.0.0`  
**Status:** ✅ Ready for Implementation

---

## Overview

Staging environment allows testing Telegram alert configurations before pushing to production. This guide walks through setting up a staging supergroup and configuring the system to use it.

---

## Prerequisites

- Telegram Bot Token (same bot can be used for staging and production)
- Access to create Telegram supergroups
- Admin rights in staging supergroup

---

## Step 1: Create Staging Supergroup

1. **Create Telegram Supergroup**
   - Open Telegram
   - Create new supergroup: "🧪 Staging - Steam Alerts Testing"
   - Add your bot (`@bballasiasteam_bot`) as admin
   - Grant permissions: Send Messages, Pin Messages, Manage Topics

2. **Create Topics**
   - Create topic: "🧪 Steam Alerts (Staging)" → Note thread_id (usually 1)
   - Create topic: "🧪 Performance Metrics (Staging)" → Note thread_id (usually 2)
   - Create topic: "🧪 Security Events (Staging)" → Note thread_id (usually 3)

3. **Get Supergroup ID**
   ```bash
   # Use Telegram bot API or @userinfobot
   # Supergroup ID will be negative (e.g., -1001234567890)
   ```

---

## Step 2: Configure Environment Variables

### Staging Environment File (`.env.staging`)

**⚠️ SECURITY: Never hardcode tokens. Use secure secret management.**

```bash
# Staging Configuration
# Get token from @BotFather - never hardcode!
TELEGRAM_BOT_TOKEN="your_token_here"  # Prompt for or use Bun.secrets
TELEGRAM_SUPERGROUP_ID="-1001234567890"  # Your staging supergroup ID
TELEGRAM_TOPIC_STEAM="1"                  # Staging steam topic thread_id
TELEGRAM_TOPIC_PERFORMANCE="2"            # Staging performance topic thread_id
TELEGRAM_TOPIC_SECURITY="3"               # Staging security topic thread_id
TELEGRAM_TOPIC_ERRORS="1"                 # Usually same as steam
TELEGRAM_TOPIC_HEARTBEAT="1"              # Usually same as steam

# Other environment variables
GOALOO_MATCH_IDS="663637"                 # Test match ID
POLL_INTERVAL_MS="2000"
PORT="3001"
```

### Production Environment File (`.env.production`)

**⚠️ SECURITY: Use Bun.secrets or secure secret manager for production.**

```bash
# Production Configuration
# Use Bun.secrets or secure secret injection
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"  # From Bun.secrets or env injection
TELEGRAM_SUPERGROUP_ID="-1003482161671"  # Production supergroup ID
TELEGRAM_TOPIC_STEAM="5"                 # Production steam topic thread_id
TELEGRAM_TOPIC_PERFORMANCE="7"           # Production performance topic thread_id
TELEGRAM_TOPIC_SECURITY="9"              # Production security topic thread_id
TELEGRAM_TOPIC_ERRORS="5"                # Usually same as steam
TELEGRAM_TOPIC_HEARTBEAT="5"             # Usually same as steam

# Other environment variables
GOALOO_MATCH_IDS="663637,663638"
POLL_INTERVAL_MS="2000"
PORT="3001"
```

---

## Step 3: Switch Between Environments

### Using Environment Files

```bash
# Load staging environment
export $(cat .env.staging | xargs)
bun run start

# Load production environment
export $(cat .env.production | xargs)
bun run start
```

### Using Environment Variables Directly

```bash
# Staging
export TELEGRAM_SUPERGROUP_ID="-1001234567890"
export TELEGRAM_TOPIC_STEAM="1"
export TELEGRAM_TOPIC_PERFORMANCE="2"
export TELEGRAM_TOPIC_SECURITY="3"
bun run start

# Production
export TELEGRAM_SUPERGROUP_ID="-1003482161671"
export TELEGRAM_TOPIC_STEAM="5"
export TELEGRAM_TOPIC_PERFORMANCE="7"
export TELEGRAM_TOPIC_SECURITY="9"
bun run start
```

---

## Step 4: Test Staging Configuration

### 1. Verify Configuration

```bash
# Check current environment
echo "Supergroup ID: $TELEGRAM_SUPERGROUP_ID"
echo "Steam Topic: $TELEGRAM_TOPIC_STEAM"
echo "Performance Topic: $TELEGRAM_TOPIC_PERFORMANCE"
echo "Security Topic: $TELEGRAM_TOPIC_SECURITY"
```

### 2. Test Alert System

```bash
# Test steam alert
bun run test:telegram

# Verify message appears in staging supergroup
# Check correct topic/thread
```

### 3. Verify Topics

```bash
# Find topic IDs (if needed)
bun run scripts/find-telegram-topics.ts
```

---

## Step 5: Staging vs Production Differences

| Feature | Staging | Production |
|---------|---------|------------|
| **Supergroup** | Staging supergroup | Production supergroup |
| **Thresholds** | Lower (5.0% vs 15.0%) | Higher (15.0%) |
| **Cooldowns** | Faster (10s vs 300s) | Slower (300s) |
| **HIL Timeouts** | Shorter (5min vs 24hr) | Longer (24hr) |
| **Purpose** | Testing & validation | Live trading alerts |

---

## Staging Checklist

Before pushing to production:

- [ ] Staging supergroup created
- [ ] Bot added as admin
- [ ] Topics created and thread_ids noted
- [ ] Environment variables configured
- [ ] Test alerts sent successfully
- [ ] Verify alerts appear in correct topics
- [ ] Test pinning functionality
- [ ] Test cooldown behavior
- [ ] Test threshold triggers
- [ ] Review logs: `tail -f logs/headers-index.log | rg TELEGRAM`
- [ ] All tests passing
- [ ] Ready for production deployment

---

## Troubleshooting

### Alerts Not Appearing in Staging

1. **Check Environment Variables**
   ```bash
   echo $TELEGRAM_SUPERGROUP_ID
   echo $TELEGRAM_TOPIC_STEAM
   ```

2. **Verify Bot Permissions**
   - Bot must be admin in staging supergroup
   - Bot must have "Send Messages" permission
   - Bot must have "Manage Topics" permission (for topic routing)

3. **Check Topic IDs**
   - Topic IDs are different per supergroup
   - Use `find-telegram-topics.ts` to discover IDs
   - Verify thread_id matches actual topic ID

4. **Review Logs**
   ```bash
   tail -f logs/headers-index.log | rg TELEGRAM
   tail -f logs/headers-index.log | rg STAGING
   ```

### Wrong Supergroup Receiving Alerts

- Verify `TELEGRAM_SUPERGROUP_ID` is set correctly
- Check if production `.env` is loaded instead of staging
- Restart application after changing environment variables

### Topic Routing Issues

- Verify `TELEGRAM_TOPIC_*` environment variables match staging topic IDs
- Check that topics exist in staging supergroup
- Ensure bot has permission to post in topics

---

## Best Practices

1. **Separate Environments**
   - Use different supergroups for staging and production
   - Never mix staging and production configurations

2. **Testing Workflow**
   - Always test in staging first
   - Verify all features work in staging
   - Only push to production after staging validation

3. **Configuration Management**
   - Keep `.env.staging` and `.env.production` separate
   - Never commit `.env` files to version control
   - Document staging supergroup ID and topic IDs

4. **Monitoring**
   - Monitor staging alerts during testing
   - Verify alert frequency and content
   - Check for any errors in logs

---

## Related Documentation

- [TELEGRAM.md](./TELEGRAM.md) - `[#TELEGRAM:alert-system]` - Main Telegram documentation
- [TELEGRAM-CONFIG-TEMPLATE.md](./TELEGRAM-CONFIG-TEMPLATE.md) - `[#TELEGRAM:config-template]` - Configuration template with staging example
- [COMMANDS.md](../COMMANDS.md) - `[#COMMANDS:reference]` - Command reference
- [PRODUCTION-SYSTEM.md](./PRODUCTION-SYSTEM.md) - `[#PROD:system-overview]` - Production system overview

---

## Version History

- **v1.0.0** - Initial staging setup guide

