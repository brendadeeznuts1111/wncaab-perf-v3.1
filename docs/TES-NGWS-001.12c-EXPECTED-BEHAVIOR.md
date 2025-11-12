# TES-NGWS-001.12c: Expected Behavior Reference

**Grepable Tag:** `[#TES-NGWS-001.12c:expected-behavior]`  
**Status:** ✅ **VERIFIED**  
**Date:** 2025-11-11

---

## ✅ Expected Behavior Summary

### **Development (with .env)**

```
✅ Logs FALLBACK_TO_ENV when .env used
✅ Token source: 'env_file'
✅ Console warning displayed
✅ Audit trail: rg "\[FALLBACK_TO_ENV\]" logs/headers-index.log shows entries
```

**Verification:**
```bash
# Check for FALLBACK_TO_ENV entries
rg "\[FALLBACK_TO_ENV\]" logs/headers-index.log

# Expected output: Multiple entries with bunApi:env_file
```

---

### **Production (with Bun.secrets, .env disabled)**

```
✅ No FALLBACK_TO_ENV logs (only Bun.secrets)
✅ Token source: 'bun_secrets'
✅ SECRETS_UPGRADE_V3 logged
✅ Audit trail: rg "\[FALLBACK_TO_ENV\]" logs/headers-index.log shows 0 entries
```

**Verification:**
```bash
# Should show 0 FALLBACK_TO_ENV entries
rg "\[FALLBACK_TO_ENV\]" logs/headers-index.log | wc -l
# Expected: 0

# Should show SECRETS_UPGRADE_V3 entries
rg "\[SECRETS_UPGRADE_V3\]" logs/headers-index.log
# Expected: Multiple entries
```

---

### **Audit: Clear Distinction**

```
✅ Source tracking via rg logs: env_file | process_env | bun_secrets
✅ Clear distinction between sources
✅ Compliance verifiable via audit queries
```

**Audit Queries:**
```bash
# Check FALLBACK_TO_ENV entries (should be 0 in production)
rg "\[FALLBACK_TO_ENV\]" logs/headers-index.log | wc -l

# Check Bun.secrets usage (should be > 0 in production)
rg "\[SECRETS_UPGRADE_V3\]" logs/headers-index.log | wc -l

# Check token source distribution
rg "source:(env_file|process_env|bun_secrets)" logs/headers-index.log | sort | uniq -c

# Check bunApi field in FALLBACK_TO_ENV entries
rg "\[FALLBACK_TO_ENV\].*bunApi:(\w+)" logs/headers-index.log -o | sort | uniq -c
```

---

## 🔍 Verification Script

**Run automated compliance check:**
```bash
bun run scripts/verify-tes-ngws-001.12c-compliance.ts
```

**Expected Output:**

**Development:**
```
✅ DEVELOPMENT COMPLIANT
   - X FALLBACK_TO_ENV entries (expected in dev)
   - Source distinction working correctly
```

**Production:**
```
✅ PRODUCTION COMPLIANT
   - No FALLBACK_TO_ENV entries (correct)
   - Using Bun.secrets (SECRETS_UPGRADE_V3 found)
```

---

## 📋 Quick Reference

| Environment | FALLBACK_TO_ENV | SECRETS_UPGRADE_V3 | Token Source |
|------------|-----------------|-------------------|--------------|
| **Development** | ✅ Logged (when .env used) | ❌ Not logged | `env_file` |
| **Production** | ❌ Not logged | ✅ Logged | `bun_secrets` |

---

## 🚨 Compliance Violations

**If you see FALLBACK_TO_ENV in production:**
```bash
# This is a violation - investigate
rg "\[FALLBACK_TO_ENV\]" logs/headers-index.log

# Action: Ensure bunfig.toml has file = false
# Action: Configure Bun.secrets for production
```

**If you see no token source logs:**
```bash
# Token source unclear - investigate
rg "\[FALLBACK_TO_ENV\]|\[SECRETS_UPGRADE_V3\]" logs/headers-index.log | wc -l
# Expected: > 0 (should have at least one)

# Action: Check TelegramAlertSystem initialization
# Action: Verify token retrieval logic
```

---

## ✅ Status

**The fix is implemented and working correctly:**

- ✅ Code detects `.env` file using `existsSync(".env")`
- ✅ Logs `FALLBACK_TO_ENV` when `.env` is used
- ✅ Token source correctly identified (`env_file` | `process_env` | `bun_secrets`)
- ✅ Production config disables `.env` auto-load (`bunfig.toml`: `file = false`)
- ✅ Clear audit trail via rg logs

**TES-NGWS-001.12c: COMPLIANT** ✅

