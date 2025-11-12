# TES-NGWS-001.5: Deployment Order

## Issue: Worker Doesn't Exist Yet

The error `This Worker does not exist on your account` means the worker needs to be deployed **first** before secrets can be set.

## Correct Deployment Order

### Option 1: Deploy First, Then Set Secrets (Recommended)

1. **Deploy the worker** (even without secrets - it will use fallback values):
   ```bash
   wrangler deploy --env=staging
   ```

2. **Then set secrets**:
   ```bash
   bun run scripts/setup-ngws-001.5-secrets.ts --env=staging
   ```

3. **Redeploy** to pick up the secrets:
   ```bash
   wrangler deploy --env=staging
   ```

### Option 2: Set Secrets Before First Deploy

You can set secrets even if the worker doesn't exist yet, but you need to specify the worker name explicitly:

```bash
# Set secret with explicit worker name
wrangler secret put VERSION_SIGNING_KEY --env=staging --name=tes-ngws-001-flux-veto-staging
```

However, Cloudflare may still require the worker to exist first.

## Quick Fix: Deploy Now

Run this to deploy the worker first:

```bash
# Deploy to staging (will create the worker)
wrangler deploy --env=staging

# Then set secrets
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging

# Redeploy to activate secrets
wrangler deploy --env=staging
```

## Fixed Configuration

I've updated `wrangler.toml` to fix the configuration warnings:
- ✅ Added environment-specific KV namespaces
- ✅ Added environment-specific Durable Objects bindings
- ✅ Added environment-specific variables
- ✅ Added environment-specific migrations

The configuration is now properly structured for staging and production environments.

