# Telegram Alert System

**Grepable Tag:** `[#TELEGRAM:alert-system]`  
**Version:** `2.0.0`  
**Status:** ✅ Production Ready

---

## Quick Setup

```bash
# 1. Run setup script
bash scripts/setup-telegram.sh

# 2. Test configuration
bun run test:telegram

# 3. Verify topics
bun run scripts/find-telegram-topics.ts
```

---

## Configuration

**Grepable Tag:** `[#TELEGRAM:config]`

### Environment Variables

**⚠️ SECURITY: Never hardcode tokens in code or commit them to version control.**

```env
# Get token from @BotFather on Telegram
# Store in .env file (never commit) or use Bun.secrets
TELEGRAM_BOT_TOKEN="your_token_here"  # Never hardcode!
TELEGRAM_SUPERGROUP_ID="-1003482161671"
TELEGRAM_TOPIC_STEAM="5"
TELEGRAM_TOPIC_PERFORMANCE="7"
TELEGRAM_TOPIC_SECURITY="9"
```

### Secure Token Management

**Recommended approaches:**

1. **Environment Variables** (Development/Staging)
   ```bash
   # Store in .env file (in .gitignore)
   export TELEGRAM_BOT_TOKEN="your_token_here"
   ```

2. **Bun.secrets** (Production)
   ```bash
   # Set secret via Bun CLI
   bun secret set TELEGRAM_BOT_TOKEN
   # Access via Bun.env.TELEGRAM_BOT_TOKEN
   ```

3. **Secure Secret Manager** (Production)
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Environment-specific secret injection

### Bot Details

- **Username:** `@bballasiasteam_bot`
- **Supergroup:** `Smoke-China` (`-1003482161671`)
- **Topics:** Steam (5), Performance (7), Security (9)

### Staging Environment

For pre-production testing, configure a staging supergroup:

```bash
# Staging configuration
export TELEGRAM_SUPERGROUP_ID="-1001234567890"  # Staging supergroup ID
export TELEGRAM_TOPIC_STEAM="1"                  # Staging topic IDs
export TELEGRAM_TOPIC_PERFORMANCE="2"
export TELEGRAM_TOPIC_SECURITY="3"
```

See [STAGING-SETUP.md](./STAGING-SETUP.md) for complete staging setup guide.

---

## Alert Types

**Grepable Tag:** `[#TELEGRAM:alert-types]`

| Type | Topic ID | Cooldown | Description |
|------|----------|----------|-------------|
| **STEAM** | 5 | 1000ms | Steam movement alerts |
| **PERFORMANCE** | 7 | 60s | System metrics & heartbeat |
| **SECURITY** | 9 | 0ms | Security events |

---

## Features

**Grepable Tag:** `[#TELEGRAM:features]`

### Auto-Pinning
Critical steam movements (≥1 point line move or steam index >2.0) are automatically pinned.

### Cooldowns
- Steam alerts: 1 second cooldown per match
- Performance alerts: 60 second cooldown
- Security alerts: No cooldown

### HTML Formatting
Alerts use HTML formatting with bold text, code blocks, and emojis.

---

## Commands

**Grepable Tag:** `[#TELEGRAM:commands]`

```bash
# Test steam alert
bun run test:telegram

# Test pin functionality
bun run test:telegram:pin

# Verify configuration
bun run verify:telegram

# Find topic IDs
bun run scripts/find-telegram-topics.ts
```

---

## Troubleshooting

**Grepable Tag:** `[#TELEGRAM:troubleshooting]`

**No alerts received:**
1. Verify bot is admin in supergroup
2. Check topic IDs match configuration
3. Review logs: `tail -f logs/headers-index.log | rg TELEGRAM`

**Alerts too frequent:**
- Adjust cooldowns in `src/config/telegram-channels-v2.ts`
- Increase steam detection threshold

**Missing topics:**
- Topics must be created manually in Telegram
- Use `find-telegram-topics.ts` to discover IDs

---

## Implementation

**Grepable Tag:** `[#TELEGRAM:implementation]`

- **V2 System:** `src/lib/telegram-alert-system-v2.ts`
- **Config:** `src/config/telegram-channels-v2.ts`
- **Fallback:** V1 system (`telegram-alert-system.ts`) if V2 unavailable

---

## Related Documentation

- [COMMANDS.md](../COMMANDS.md) - `[#COMMANDS:reference]`
- [PORT.md](../PORT.md) - `[#PORT:management]`
- [STATUS.md](../STATUS.md) - `[#STATUS:system]`
- [docs/PRODUCTION-SYSTEM.md](./PRODUCTION-SYSTEM.md) - `[#PROD:system-overview]` v1.2.0
- [docs/TELEGRAM-CONFIG-TEMPLATE.md](./TELEGRAM-CONFIG-TEMPLATE.md) - `[#TELEGRAM:config-template]` - RFC pinning & human-in-loop configuration
- [docs/STAGING-SETUP.md](./STAGING-SETUP.md) - `[#TELEGRAM:staging-setup]` - Staging environment setup guide
- [docs/RELEASE-v1.2.0.md](./RELEASE-v1.2.0.md) - `[#RELEASE:v1.2.0]` - Version 1.2.0 release notes

---

## Version History

- **v2.0.0** - Enhanced with cooldowns, HTML formatting, auto-pinning
- **v1.0.0** - Initial implementation
