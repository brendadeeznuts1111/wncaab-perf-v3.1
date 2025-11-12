# TES-DEPLOY-001: Full Interactive Worker & Secrets Deployment

**Script:** `scripts/full-deploy-tes-worker.ts`  
**DRI Mode:** Dry-Run Recursive Interactive  
**Audit Trail:** `logs/worker-events.log` (rg-searchable)

**Date:** 2025-11-12  
**Status:** ✅ Complete with Dry-Run Support  
**Epic:** TES-NGWS-001.5 - Security-Hardened WebSocket Foundation

---

## Quick Start

### Dry-Run (Safe Preview)

```bash
bun scripts/full-deploy-tes-worker.ts --env=staging --dry-run
```

### Production Deployment

```bash
bun scripts/full-deploy-tes-worker.ts --env=production
```

### Interactive Mode (No --env flag)

```bash
bun scripts/full-deploy-tes-worker.ts --dry-run

# Prompts: "Select environment: [staging|production]"
```

---

## Command Syntax

```bash
bun scripts/full-deploy-tes-worker.ts [OPTIONS]

OPTIONS:
  --env=<staging|production>    Target environment (optional, triggers interactive prompt if omitted)
  --dry-run                     Execute in dry-run mode (safe preview, no side effects)
  --help                        Display this documentation
```

---

## Execution Flow

```
[INIT] → [ENV_RESOLUTION] → [DEPLOY_FLOW] → [FINAL_STATUS]
  ↓            ↓                 ↓                ↓
Audit      Interactive      Recursive         Success/
Log        Prompt OR        Dry-Run           Error Exit
           Flag Parse       Checks
```

---

## Overview

This guide covers the complete deployment process for TES-NGWS-001.5, including secret setup, deployment, and validation. All scripts support dry-run mode for safe testing.

---

## Prerequisites

1. **Cloudflare Account & Wrangler CLI**
   ```bash
   npm install -g wrangler
   # or
   bunx wrangler --version
   
   wrangler login
   ```

2. **Bun Runtime** (for TypeScript scripts)
   ```bash
   bun --version  # Should be >= 1.3.0
   ```

3. **Project Dependencies**
   - KV namespace created
   - Durable Objects configured
   - Worker code ready

---

## Step 1: Secret Setup (Dry-Run First)

### Dry-Run Secret Setup

**Preview what secrets would be set without actually setting them:**

```bash
# Dry-run with auto-generated keys
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --dry-run --generate-keys

# Output shows:
# - Which secrets would be set
# - Generated key previews (first 16 + last 8 chars)
# - Optional secrets skipped
```

**Example Output:**
```
🔍 DRY RUN MODE - No secrets will be set

Setting: VERSION_SIGNING_KEY
Generated key: 330766fc6ed056eb...d161c07c
🔍 [DRY RUN] Would set VERSION_SIGNING_KEY
   Value preview: 330766fc6ed056eb...d161c07c

⏭️  [DRY RUN] Skipping optional secret VERSION_SIGNING_KEY_V2
⏭️  [DRY RUN] Skipping optional secret TES_PROXY_IPS
```

### Actual Secret Setup

**After reviewing the dry-run, set secrets:**

```bash
# Interactive setup (prompts for each secret)
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging

# Auto-generate signing keys
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --generate-keys

# Skip existing secrets
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --skip-existing
```

### Verify Secrets

```bash
bunx wrangler secret list --env=staging
```

---

## Step 2: Deployment (Dry-Run First)

### Dry-Run Deployment

**Preview deployment without actually deploying:**

```bash
# Dry-run deployment
bun run scripts/deploy-staging-ngws-001.5.ts --env=staging --dry-run

# Output shows:
# - Pre-flight checks
# - Secret verification
# - Build verification
# - What would be deployed
# - Health check skipped
```

**Example Output:**
```
🔍 DRY RUN MODE - No actual deployment will occur

════════════════════════════════════════════════════════════
  Pre-flight Checks
════════════════════════════════════════════════════════════
✅ wrangler CLI found
✅ Authenticated with Cloudflare
✅ wrangler.toml found

════════════════════════════════════════════════════════════
  Deployment
════════════════════════════════════════════════════════════
🔍 [DRY RUN] Would deploy with: wrangler deploy --env=staging
🔍 [DRY RUN] Skipping actual deployment

[DEPLOY][FINAL_STATUS][ENV:staging][STATUS:DRY_RUN_SUCCESS][DRY_RUN:true]
```

### Actual Deployment

**After reviewing the dry-run, deploy:**

```bash
# Deploy to staging
bun run scripts/deploy-staging-ngws-001.5.ts --env=staging

# Or use the bash script (legacy)
./scripts/deploy-staging-ngws-001.5.sh
```

**Success Output:**
```
✅ Deployment successful
Deployment URL: https://tes-ngws-001-flux-veto-staging.workers.dev

════════════════════════════════════════════════════════════
  Health Check
════════════════════════════════════════════════════════════
✅ Health check passed
Response: {"status":"ok","timestamp":...}

[DEPLOY][FINAL_STATUS][ENV:staging][STATUS:SUCCESS][DRY_RUN:false]
```

---

## Step 3: Security Validation

### Run Security Tests

```bash
# Run all security validations
bun run scripts/test-ngws-001.5-security.ts --env=staging

# With verbose output
bun run scripts/test-ngws-001.5-security.ts --env=staging --verbose
```

**Test Coverage:**
- ✅ Health Check
- ✅ CSRF Token Generation
- ✅ Subprotocol Negotiation
- ✅ Host Header Validation
- ✅ Sec-WebSocket-Key Format Validation
- ✅ Version Registry Endpoint

---

## Complete Workflow Examples

### Example 1: First-Time Setup (Dry-Run First)

```bash
# 1. Preview secret setup
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --dry-run --generate-keys

# 2. Actually set secrets
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --generate-keys

# 3. Preview deployment
bun run scripts/deploy-staging-ngws-001.5.ts --env=staging --dry-run

# 4. Actually deploy
bun run scripts/deploy-staging-ngws-001.5.ts --env=staging

# 5. Run security tests
bun run scripts/test-ngws-001.5-security.ts --env=staging
```

### Example 2: Update Secrets Only

```bash
# Dry-run secret update
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --dry-run

# Update secrets
bun run scripts/setup-ngws-001.5-secrets.ts --env=staging

# Redeploy to activate new secrets
bun run scripts/deploy-staging-ngws-001.5.ts --env=staging
```

### Example 3: Production Deployment

```bash
# Set production secrets
bun run scripts/setup-ngws-001.5-secrets.ts --env=production --generate-keys

# Dry-run production deployment
bun run scripts/deploy-staging-ngws-001.5.ts --env=production --dry-run

# Deploy to production
bun run scripts/deploy-staging-ngws-001.5.ts --env=production
```

---

## Error Handling

### Common Errors

**Error: `This Worker does not exist`**
- **Solution:** Deploy the worker first, then set secrets
- **Fix:** Run `bun run scripts/deploy-staging-ngws-001.5.ts --env=staging` first

**Error: `KV namespace is not valid`**
- **Solution:** Create KV namespace and update `wrangler.toml`
- **Fix:** `bunx wrangler kv namespace create "KV" --env=staging`

**Error: `Not authenticated`**
- **Solution:** Login to Cloudflare
- **Fix:** `wrangler login`

### Error Logging Format

On error, the script logs:
```
[DEPLOY][UNEXPECTED_ERROR][ENV:staging][DRY_RUN:false]
[DEPLOY][ERROR_MESSAGE] <error message>
[DEPLOY][ERROR_STACK] <stack trace>
```

---

## Monitoring

### View Logs

```bash
# Tail worker logs
bunx wrangler tail --env=staging

# Filter for specific events
bunx wrangler tail --env=staging | grep "TES-NGWS-001.5\|ws:upgrade\|keyVersion"
```

### Key Metrics

Monitor these in Cloudflare Dashboard:
- WebSocket upgrade success rate
- CSRF token validation failures
- Subprotocol negotiation distribution
- Key version usage (V1 vs V2)

---

## Rollback Procedure

If deployment causes issues:

```bash
# List recent deployments
bunx wrangler deployments list --env=staging

# Rollback to previous version
bunx wrangler rollback --env=staging --message="Rollback TES-NGWS-001.5"
```

---

## Script Reference

### Secret Setup Script

**File:** `scripts/setup-ngws-001.5-secrets.ts`

**Options:**
- `--env=<environment>` - Environment (staging/production)
- `--dry-run` - Preview without setting secrets
- `--generate-keys` - Auto-generate signing keys
- `--skip-existing` - Skip secrets that already exist
- `--interactive` - Interactive mode (default: true)

### Deployment Script

**File:** `scripts/deploy-staging-ngws-001.5.ts`

**Options:**
- `--env=<environment>` - Environment (staging/production)
- `--dry-run` - Preview without deploying

**Logging Format:**
- Success: `[DEPLOY][FINAL_STATUS][ENV:<env>][STATUS:SUCCESS|DRY_RUN_SUCCESS][DRY_RUN:<true|false>]`
- Error: `[DEPLOY][UNEXPECTED_ERROR][ENV:<env>][DRY_RUN:<true|false>]`

---

## Best Practices

1. **Always dry-run first** - Preview changes before applying
2. **Set secrets before deployment** - Required secrets must exist
3. **Verify after deployment** - Run security tests
4. **Monitor logs** - Watch for errors in first 24 hours
5. **Use staging first** - Test in staging before production

---

## Interactive Prompts Explained

### 1. Environment Selection (if --env not provided)

```
⚠️ No --env flag detected. Initiating interactive selection...

Select deployment environment:
  [1] staging    - Test environment, safe for experiments
  [2] production - Live environment, affects real users

Enter choice [1-2]: _
```

**Audit Log Format:** `[DEPLOY][ENV_SELECTED][ENV:staging][INTERACTIVE:true]`

---

### 2. Pre-Deployment Confirmation (Production only)

```
🚨 PRODUCTION DEPLOYMENT DETECTED

Planned Actions:
  • Deploy worker: tes-worker-production
  • Set 4 secrets from .env.production
  • Update 2 KV namespaces
  • Run migration: v3-to-v4-schema

Type "DEPLOY" to confirm: _
```

**Safety:** Requires exact string match. Dry-run mode skips this prompt.

---

### 3. Recursive Dry-Run Prompt (if sub-scripts support it)

```
Dry-run mode active. Execute sub-task "setup-secrets" in dry-run?
  [Y] Yes  [N] No  [A] Yes to all  [Q] Abort

Choice: _
```

**Behavior:** `[A]` sets `isDryRun=true` for all subsequent sub-calls.

---

## Audit Trail & Search Patterns

All events log to `logs/worker-events.log` with `rg`-optimized format:

### Key Search Commands

```bash
# Find all deployments to staging
rg "DEPLOY.*ENV:staging" logs/worker-events.log

# Find failed deployments
rg "FINAL_STATUS.*STATUS:FAILURE" logs/worker-events.log

# Find unexpected errors
rg "UNEXPECTED_ERROR" logs/worker-events.log

# Monitor real-time
tail -f logs/worker-events.log | rg "DEPLOY"
```

### Log Entry Examples

**Success:**
```
[2025-11-12T14:30:22.543Z] [DEPLOY][FINAL_STATUS][ENV:staging][STATUS:SUCCESS][DRY_RUN:false]
```

**Error:**
```
[2025-11-12T14:31:45.123Z] [DEPLOY][UNEXPECTED_ERROR][ENV:production][ERROR_MESSAGE:Worker startup failed][DRY_RUN:false]
```

---

## Dry-Run vs Actual Execution

| Action | Dry-Run Mode | Actual Deployment |
|--------|--------------|-------------------|
| **Worker Deploy** | `wrangler deploy --dry-run` | `wrangler deploy` |
| **Secrets Set** | Validates `.env` file exists | `wrangler secret put` |
| **KV Sync** | Lists files to sync | `wrangler kv:bulk put` |
| **Durable Objects** | Shows migration plan | Applies migrations |
| **Audit Log** | Writes `[DRY_RUN:true]` entries | Writes `[DRY_RUN:false]` entries |
| **Exit Code** | `0` (if valid) | `0` (if successful) |

**Recursive Dry-Run:** All sub-scripts (`setup-secrets`, `sync-kv`) inherit the parent `--dry-run` flag automatically.

---

## Troubleshooting

### Error: "Worker doesn't exist yet"

**Cause:** Attempting to set secrets before first deployment.  
**Fix:** Run `wrangler deploy --env=<env>` manually once, then retry.

### Error: "ENOENT: .env.production not found"

**Cause:** Missing environment variable file for secrets.  
**Fix:** Create from template: `cp .env.template .env.production`

### Error: "Migrations conflict"

**Cause:** Durable Objects schema version mismatch.  
**Fix:** 
```bash
# Check current migration tag
wrangler deploy --env=staging --dry-run

# If safe, force apply
wrangler deploy --env=staging --force
```

### Warning: "Duplicate [env.production] section"

**Cause:** `wrangler.toml` has conflicting environment sections.  
**Fix:** Script auto-resolves this; verify with `wrangler.toml validate`.

### Audit Log Not Writing

**Cause:** `logs/` directory missing or permissions issue.  
**Fix:**
```bash
mkdir -p logs
chmod 755 logs
```

---

## Exit Codes

| Code | Meaning | Audit Log Indicator |
|------|---------|---------------------|
| `0`  | Success | `[STATUS:SUCCESS]` |
| `1`  | Unexpected error | `[UNEXPECTED_ERROR]` |
| `2`  | User abort (Ctrl+C) | `[STATUS:ABORTED]` |
| `3`  | Configuration invalid | `[STATUS:INVALID_CONFIG]` |

---

## Integration Examples

### CI/CD Pipeline (GitHub Actions)

```yaml
- name: Staging Dry-Run
  run: bun scripts/full-deploy-tes-worker.ts --env=staging --dry-run

- name: Production Deploy
  if: github.ref == 'refs/heads/main'
  run: bun scripts/full-deploy-tes-worker.ts --env=production
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

### Local Development Loop

```bash
# Terminal 1: Watch audit logs
tail -f logs/worker-events.log | rg "DEPLOY"

# Terminal 2: Iterative dry-run
while true; do
  bun scripts/full-deploy-tes-worker.ts --env=staging --dry-run
  read -p "Press Enter to re-run..."
done
```

---

## Security Notes

- **Never commit `.env.production`** to version control
- **Always dry-run first** on production environments
- **Audit logs contain sensitive paths**: Secure `logs/` directory appropriately
- **Interactive prompts prevent accidental production deploys**: Do not bypass in CI

---

## References

- **Secret Setup Guide:** `docs/TES-NGWS-001.5-SECRET-SETUP.md`
- **Staging Deployment:** `docs/TES-NGWS-001.5-STAGING-DEPLOYMENT.md`
- **Key Rotation:** `docs/TES-NGWS-001.5-KEY-ROTATION.md`
- **Subprotocol Handshake:** `docs/TES-NGWS-001.5-SUBPROTO-HANDSHAKE.md`

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-12  
**Maintainer:** TES Ops Team

**Status:** ✅ **READY FOR USE**

All scripts support dry-run mode for safe testing. Always preview changes before applying!

