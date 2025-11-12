# TES-DEPLOY-001: Pre-Production Checklist

**Date:** 2025-11-12  
**Status:** ✅ Critical Items Addressed

---

## ✅ Completed

### 1. KV Namespace Placeholders Fixed

**Production KV Namespaces Created:**
- Production: `98b094fc212047c4b728a62c3f524f8b`
- Production Preview: `37d2c503aa034748b5d61f5c9759062c`
- Staging: `cea14d19173c43a09bc2e031fd10a7d4` (already configured)
- Staging Preview: `b67ad440b249439b8d617daee690720c` (already configured)

**Updated Files:**
- `wrangler.toml` - Production KV namespace IDs updated

### 2. Security Tests Created

**Test Script:** `scripts/test-ngws-001.5-security.ts`
- Health Check
- CSRF Token Generation
- Subprotocol Negotiation
- Host Header Validation
- Sec-WebSocket-Key Format Validation
- Version Registry Endpoint

**Note:** Tests require correct worker URL. Need to verify actual deployment URL.

### 3. Monitoring Scripts Created

**Log Monitoring:** `scripts/monitor-tes-logs.sh`
```bash
./scripts/monitor-tes-logs.sh staging
```

**Endpoint Verification:** `scripts/verify-endpoints.ts`
```bash
bun run scripts/verify-endpoints.ts --env=staging
```

---

## ⚠️ Issues Identified

### Worker URL Resolution

The worker URL format may be different than expected. Cloudflare Workers URLs typically follow:
- `https://<worker-name>.<account-subdomain>.workers.dev`
- Or custom domain if configured

**Action Needed:**
1. Get actual worker URL from `wrangler deployments list`
2. Update test scripts with correct URL
3. Verify health endpoint accessibility

---

## 📋 Remaining Tasks

### High Priority

1. **Verify Actual Worker URL**
   ```bash
   bunx wrangler deployments list --env=staging
   # Extract actual URL and update test scripts
   ```

2. **Run Security Tests with Correct URL**
   ```bash
   bun run scripts/test-ngws-001.5-security.ts --env=staging --url=<actual-url>
   ```

3. **Test Health Endpoint**
   ```bash
   curl <actual-worker-url>/health
   ```

### Medium Priority

4. **Set Up Production Secrets** (when ready)
   ```bash
   bun run scripts/setup-ngws-001.5-secrets.ts --env=production --generate-keys
   ```

5. **Create Default/Dev KV Namespace** (if needed for local dev)
   ```bash
   bunx wrangler kv namespace create "KV"
   ```

---

## 🔍 Monitoring Commands

### Real-Time Log Monitoring

```bash
# Monitor all TES events
./scripts/monitor-tes-logs.sh staging

# Monitor specific events
bunx wrangler tail --env=staging | rg "DEPLOY|ws:upgrade|keyVersion"

# Monitor errors only
bunx wrangler tail --env=staging | rg "ERROR|FAILED"
```

### Audit Log Monitoring

```bash
# Watch audit logs
tail -f logs/worker-events.log | rg "DEPLOY"

# Search deployment events
rg "DEPLOY.*ENV:staging" logs/worker-events.log

# Find errors
rg "UNEXPECTED_ERROR" logs/worker-events.log
```

---

## ✅ Verification Status

- [x] Production KV namespaces created
- [x] Production KV IDs updated in wrangler.toml
- [x] Security test script created
- [x] Monitoring scripts created
- [ ] Actual worker URL verified
- [ ] Health endpoint tested
- [ ] Security tests executed successfully
- [ ] Log tailing verified

---

**Next Steps:**
1. Get actual worker URL from Cloudflare
2. Update test scripts with correct URL
3. Run full security validation suite
4. Set up continuous monitoring

