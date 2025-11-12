# TES-NGWS-001.5: Secret Setup Guide

**Quick Start:** Set all required secrets for TES-NGWS-001.5 deployment

## Automated Setup (Recommended)

```bash
# Interactive setup (prompts for each secret)
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging

# Auto-generate signing keys
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --generate-keys

# Skip existing secrets
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --skip-existing
```

## Manual Setup

### 1. Required: VERSION_SIGNING_KEY

```bash
# Generate a new key (64 hex characters = 32 bytes)
openssl rand -hex 32

# Set the secret
wrangler secret put VERSION_SIGNING_KEY --env=staging
# Paste the generated key when prompted
```

### 2. Optional: VERSION_SIGNING_KEY_V2 (for dual-key rotation)

```bash
# Generate a new key
openssl rand -hex 32

# Set the secret
wrangler secret put VERSION_SIGNING_KEY_V2 --env=staging
# Paste the generated key when prompted
```

### 3. Optional: TES_PROXY_IPS (for proxy IP whitelist)

```bash
# Set trusted proxy IPs (comma-separated)
wrangler secret put TES_PROXY_IPS --env=staging
# Example: 192.0.2.1,198.51.100.0/24
```

## Verify Secrets

```bash
# List all secrets for environment
wrangler secret list --env=staging

# Should show:
# VERSION_SIGNING_KEY
# VERSION_SIGNING_KEY_V2 (if set)
# TES_PROXY_IPS (if set)
```

## Key Format

- **Signing Keys:** 64 hex characters (32 bytes)
  - Example: `3ef9f8e81449ffbec4eac669ade77e8d4a8af06a1e8aa027a974657ce3a33e69`
  - Generated with: `openssl rand -hex 32`

- **Proxy IPs:** Comma-separated IP addresses or CIDR ranges
  - Example: `192.0.2.1,198.51.100.0/24`

## Troubleshooting

### Error: "Not authenticated"
```bash
wrangler login
```

### Error: "wrangler CLI not found"
```bash
npm install -g wrangler
# or
bunx wrangler --version
```

### Error: "Secret already exists"
- Use `--skip-existing` to skip existing secrets
- Or manually overwrite: `wrangler secret put SECRET_NAME --env=staging`

## Next Steps

After setting secrets:

1. ✅ Verify secrets: `wrangler secret list --env=staging`
2. ✅ Deploy to staging: `./scripts/deploy-staging-ngws-001.5.sh`
3. ✅ Run security tests: `bun run scripts/test-ngws-001.5-security.ts --env=staging`

---

**See also:**
- `docs/TES-NGWS-001.5-STAGING-DEPLOYMENT.md` - Full deployment guide
- `docs/TES-NGWS-001.5-KEY-ROTATION.md` - Key rotation documentation

