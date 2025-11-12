# TES-DEPLOY-001: Pre-Deployment Checklist

**Date:** 2025-11-12  
**Status:** ✅ Active  
**Purpose:** Prevent deployment failures by validating builds before deployment

---

## 🚀 Quick Reference

```bash
# Validate before deploying
bun run validate:wrangler

# Validate specific environment
bun run validate:wrangler:staging
bun run validate:wrangler:production

# Full deployment (includes validation via predeploy hook)
bunx wrangler deploy --env=staging
```

---

## ✅ Pre-Deployment Checklist

### 1. **Build Validation** (Automatic via `predeploy` hook)

```bash
# This runs automatically before deployment
bun run validate:wrangler
```

**What it checks:**
- ✅ Worker builds successfully
- ✅ No Bun-specific dependencies in Workers code
- ✅ All imports resolve correctly
- ✅ Durable Objects configured correctly
- ✅ KV namespaces configured correctly
- ✅ Environment variables are valid

**If validation fails:**
- Fix build errors before deploying
- Check for `Bun.*` API usage in worker code
- Verify all imports are Workers-compatible

---

### 2. **Secrets Verification** (Manual)

```bash
# Check secrets are set
bunx wrangler secret list --env=staging
bunx wrangler secret list --env=production

# Required secrets:
# - VERSION_SIGNING_KEY (required)
# - VERSION_SIGNING_KEY_V2 (optional, for key rotation)
# - TES_PROXY_IPS (optional, for proxy IP whitelist)
# - CSRF_SECRET (optional, defaults to deterministic value)
```

**If secrets missing:**
```bash
# Set required secrets
bun run setup:secrets:ngws --env=staging
```

---

### 3. **Configuration Verification** (Manual)

```bash
# Verify wrangler.toml configuration
cat wrangler.toml | grep -A 5 "\[env.staging"
cat wrangler.toml | grep -A 5 "\[env.production"

# Check for placeholder values
rg "your-kv-namespace-id|your-preview-kv-namespace-id" wrangler.toml
```

**If placeholders found:**
- Create KV namespaces: `bunx wrangler kv namespace create "KV" --env=staging`
- Update `wrangler.toml` with actual namespace IDs

---

### 4. **Local Testing** (Recommended)

```bash
# Test endpoints locally (if using wrangler dev)
bunx wrangler dev --env=staging --local

# Or test security validations
bun run scripts/test-ngws-001.5-security.ts --env=staging
```

---

## 🔍 Common Issues & Fixes

### Issue: "Bun is not defined"

**Cause:** Using Bun-specific APIs in Workers code

**Fix:**
```typescript
// ❌ Bad
Bun.env.TOKEN_MULTIPLIER = env.TOKEN_MULTIPLIER;

// ✅ Good
// Use env parameter directly (Workers) or Bun.env (Bun runtime)
```

---

### Issue: "Could not resolve 'bun'"

**Cause:** Importing Bun-specific modules in Workers code

**Fix:**
- Use Web Crypto API instead of `Bun.CSRF`
- Use `crypto.subtle` instead of `Bun.Crypto`
- Create runtime-compatible implementations

---

### Issue: "KV namespace not valid"

**Cause:** Placeholder namespace IDs in `wrangler.toml`

**Fix:**
```bash
# Create namespaces
bunx wrangler kv namespace create "KV" --env=staging
bunx wrangler kv namespace create "KV" --preview --env=staging

# Update wrangler.toml with returned IDs
```

---

### Issue: "Worker does not exist"

**Cause:** Trying to set secrets before first deployment

**Fix:**
```bash
# Deploy worker first (even with errors)
bunx wrangler deploy --env=staging

# Then set secrets
bun run setup:secrets:ngws --env=staging
```

---

## 📋 Deployment Workflow

### Standard Deployment

```bash
# 1. Validate (automatic via predeploy hook)
bunx wrangler deploy --env=staging
# ↑ Runs validate:wrangler automatically

# 2. Verify deployment
curl https://tes-ngws-001-flux-veto-staging.utahj4754.workers.dev/health

# 3. Run security tests
bun run scripts/test-ngws-001.5-security.ts --env=staging
```

### Emergency Deployment (Skip Validation)

```bash
# Only if absolutely necessary
bunx wrangler deploy --env=staging --skip-predeploy
```

---

## 🎯 Success Criteria

Before considering deployment successful:

- [ ] `validate:wrangler` passes without errors
- [ ] All required secrets are set
- [ ] KV namespaces configured correctly
- [ ] Health endpoint returns 200
- [ ] Security tests pass (6/6)
- [ ] Version registry endpoint accessible
- [ ] CSRF token generation works

---

## 📚 Related Documentation

- **Retrospective:** `docs/TES-NGWS-001.5-RETROSPECTIVE.md`
- **Deployment Guide:** `docs/TES-DEPLOY-001-FULL-INTERACTIVE-SETUP.md`
- **Security Tests:** `scripts/test-ngws-001.5-security.ts`
- **Secret Setup:** `scripts/setup-ngws-001.5-secrets.ts`

---

## 🔗 Quick Links

- **Staging Worker:** `https://tes-ngws-001-flux-veto-staging.utahj4754.workers.dev`
- **Production Worker:** `https://tes-ngws-001-flux-veto-prod.utahj4754.workers.dev` (when deployed)
- **Cloudflare Dashboard:** https://dash.cloudflare.com/

---

**Last Updated:** 2025-11-12  
**Maintained By:** TES Deployment Team

