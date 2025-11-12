# Secure Token Management Guide

**Grepable Tag:** `[#SECURITY:token-management]`  
**Version:** `1.0.0`

---

## Overview

Telegram bot tokens must never be hardcoded in source code or committed to version control. This guide covers secure token management using Bun.secrets and environment variables.

---

## Security Principles

1. **Never hardcode tokens** in source code
2. **Never commit tokens** to version control
3. **Use Bun.secrets** for production (encrypted OS credential store)
4. **Use environment variables** for development/staging (`.env` files)
5. **Rotate tokens** immediately if exposed

---

## Token Storage Methods

### 1. Bun.secrets (Recommended for Production)

**Most Secure**: Uses OS credential store (Keychain on macOS, Credential Manager on Windows, libsecret on Linux)

```bash
# Set token securely
bun run scripts/setup-telegram-secret.ts

# Or with token as argument
bun run scripts/setup-telegram-secret.ts --token "your_token_here"
```

**Access in code:**
```typescript
import { getTelegramBotToken } from "./lib/secrets-manager";

const token = await getTelegramBotToken();
// Priority: Bun.secrets > TELEGRAM_BOT_TOKEN env var
```

### 2. Environment Variables (Development/Staging)

**For local development and staging environments:**

```bash
# Store in .env file (never commit!)
export TELEGRAM_BOT_TOKEN="your_token_here"
```

**Access in code:**
```typescript
const token = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN;
```

### 3. Secure Secret Managers (Enterprise)

For production deployments, consider:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Kubernetes Secrets

---

## Setup Scripts

### Setup Telegram Secret (Bun.secrets)

```bash
# Interactive prompt
bun run scripts/setup-telegram-secret.ts

# With token argument
bun run scripts/setup-telegram-secret.ts --token "your_token_here"
```

### Setup Telegram Config (Environment Variables)

```bash
# Prompts for token (never hardcodes)
bash scripts/setup-telegram.sh

# Staging setup
bash scripts/setup-staging.sh
```

---

## Token Priority Order

The system checks for tokens in this order:

1. **Bun.secrets** (`telegram-bot-token`) - Most secure
2. **Environment Variable** (`TELEGRAM_BOT_TOKEN`) - Development/staging
3. **Bun.env** (`Bun.env.TELEGRAM_BOT_TOKEN`) - Bun-specific env

---

## Security Checklist

- [ ] No hardcoded tokens in source code
- [ ] `.env` files in `.gitignore`
- [ ] Tokens stored in Bun.secrets for production
- [ ] Environment variables used for development only
- [ ] Token rotation plan documented
- [ ] Access logs enabled for token usage
- [ ] Secrets manager configured for production

---

## Token Rotation

If a token is exposed:

1. **Immediately revoke** the token via @BotFather
2. **Generate new token** via @BotFather
3. **Update storage**:
   ```bash
   # Update Bun.secrets
   bun run scripts/setup-telegram-secret.ts --token "new_token"
   
   # Or update .env file
   export TELEGRAM_BOT_TOKEN="new_token"
   ```
4. **Restart application** to load new token
5. **Verify** alerts are working with new token

---

## Related Documentation

- [TELEGRAM.md](./docs/TELEGRAM.md) - `[#TELEGRAM:alert-system]` - Telegram alert system
- [STAGING-SETUP.md](./docs/STAGING-SETUP.md) - `[#TELEGRAM:staging-setup]` - Staging setup
- [SECURITY.md](./SECURITY.md) - `[#SECURITY]` - Security best practices

---

## Version History

- **v1.0.0** - Initial secure token management guide







