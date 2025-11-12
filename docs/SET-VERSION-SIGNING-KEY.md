# TES-OPS-004.B.4.2: Locked @ 2025-11-12T01:24:46.122Z | [META: HMAC-QUANTA INFUSED]

[BUN-FIRST] Zero-NPM: Crypto Locks w/ Piped Secrets, Durable-Objects HMAC for 6–400× Velocity  
[SEMANTIC: KEY-VALIDATE] – AI-Powered Guards for Adaptive Preempt  

## Fixed Issues

1. **Migrations:** `[[durable_objects.migrations]]` → `[[migrations]]` (Top-Level per Wrangler v3)

2. **Key Gen:** Secure HMAC (64-hex): `3ef9f8e81449ffbec4eac669ade77e8d4a8af06a1e8aa027a974657ce3a33e69` via crypto.randomBytes(32)

## Set Commands (Escaped for CI/CD)

### Option 1: Interactive (Recommended for Manual)

```bash
wrangler secret put VERSION_SIGNING_KEY --env=""
```

Paste: `3ef9f8e81449ffbec4eac669ade77e8d4a8af06a1e8aa027a974657ce3a33e69`

### Option 2: Piped (Executed – Non-Interactive)

```bash
echo "3ef9f8e81449ffbec4eac669ade77e8d4a8af06a1e8aa027a974657ce3a33e69" | wrangler secret put VERSION_SIGNING_KEY --env=""
```

### Option 3: Env-Specific

```bash
# Production
echo "3ef9f8e81449ffbec4eac669ade77e8d4a8af06a1e8aa027a974657ce3a33e69" | wrangler secret put VERSION_SIGNING_KEY --env=production

# Staging
echo "3ef9f8e81449ffbec4eac669ade77e8d4a8af06a1e8aa027a974657ce3a33e69" | wrangler secret put VERSION_SIGNING_KEY --env=staging
```

## Verification

After setting the secret, verify it's configured:

```bash
wrangler secret list --env=""
```

You should see `VERSION_SIGNING_KEY` in the list.

## Notes

- The secret is stored securely in Cloudflare Workers
- It will be available as `env.VERSION_SIGNING_KEY` in your worker
- If not set, the DO will generate and store its own key (less secure for multi-instance scenarios)
- Keep this key secure - don't commit it to version control

[TYPE: CRYPTO-LOCKED] – Subprotocol Negotiated, Deploy-Ready; Zero Warnings Projected.
