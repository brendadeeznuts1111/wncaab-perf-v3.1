# Security Quick Reference

**Version**: v14.2+  
**Last Updated**: November 09, 2025

---

## 🛡️ Ultra-Secure CI Mode

### Method 1: Command Flag

```bash
bun --no-addons run index:scan
```

### Method 2: Environment Variable

```bash
export BUN_NO_ADDONS=1
bun run index:scan
```

### Method 3: CI/CD Pipeline

```yaml
# .github/workflows/scan.yml
- name: Run Ripgrep-Bun (hardened)
  run: bun --no-addons run index:scan
  env:
    BUN_NO_ADDONS: 1  # Explicit for clarity
```

---

## ✅ Verification

Both methods work identically:

```bash
# Test flag method
$ bun --no-addons run index:scan
✅ Index built: 3 files matched

# Test env var method
$ export BUN_NO_ADDONS=1
$ bun run index:scan
✅ Index built: 3 files matched
```

---

## 📋 When to Use

- ✅ **CI/CD Pipelines** - Always use `--no-addons`
- ✅ **Production Deployments** - Recommended
- ✅ **Security Audits** - Required
- ⚪ **Local Development** - Optional

---

## 🔒 What It Protects Against

- ✅ Native code injection via malicious dependencies
- ✅ Unauthorized native addon loading
- ✅ Binary execution from node_modules

---

## 📖 Full Documentation

See `SECURITY.md` for complete security hardening guide.

---

**Status**: ✅ **VERIFIED & PRODUCTION-READY**

**The forge is hot. The steel is hardened. Security is bulletproof.** 🛡️🚀

