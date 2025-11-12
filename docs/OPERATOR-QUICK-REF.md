# TES-DEPLOY-001: Operator Quick Reference Card

**Status:** ✅ **PRODUCTION-HARDENED**  
**Last Updated:** 2025-11-12

---

## 🚀 Quick Commands

### Standard Deployment (Recommended)
```bash
# Automatic validation via predeploy hook
bunx wrangler deploy --env=staging
```

### Manual Validation
```bash
# Validate before deploying
bun run validate:wrangler

# Validate specific environment
bun run validate:wrangler:staging
bun run validate:wrangler:production
```

### Full Interactive Deployment
```bash
# Complete deployment with secrets setup
bun run scripts/full-deploy-tes-worker.ts --env=staging
```

---

## 🛡️ Protection Status Check

### Verify No Bun APIs in Worker Code
```bash
rg "Bun\." src/workers/ src/version-management-do.ts || echo "✓ No Bun APIs found"
```

### Simulate Pre-Deploy Validation
```bash
npm run predeploy
```

### View Audit Trail
```bash
tail -f logs/tes-audit.log | rg "DEPLOY"
```

---

## 📊 Protection Layers

| Layer | Command | Purpose |
|-------|---------|---------|
| **Pre-deploy Hook** | Automatic | Build failures, config errors |
| **CI/CD Gate** | `.github/workflows/validate-worker.yml` | Bun API usage, syntax errors |
| **Static Analysis** | `rg 'Bun\.(env|file|write)'` | Runtime incompatibility |
| **Build Validation** | `wrangler deploy --dry-run` | Missing bindings, KV errors |

---

## 🔍 Troubleshooting

### Validation Fails
```bash
# Check for Bun APIs
rg -i "Bun\.(env|CSRF|Crypto|write|file)" src/workers/

# Check build errors
bunx wrangler deploy --dry-run --env=staging

# Verify secrets
bunx wrangler secret list --env=staging
```

### Deployment Fails
```bash
# Check worker logs
bunx wrangler tail --env=staging

# Verify endpoints
curl https://tes-ngws-001-flux-veto-staging.utahj4754.workers.dev/health
```

---

## 📚 Documentation Links

- **[Pre-Deployment Checklist](./docs/DEPLOY-CHECKLIST.md)** - Full checklist
- **[Retrospective](./docs/TES-NGWS-001.5-RETROSPECTIVE.md)** - Lessons learned
- **[Deployment Guide](./docs/TES-DEPLOY-001-FULL-INTERACTIVE-SETUP.md)** - Complete guide

---

## ✅ Success Criteria

Before considering deployment successful:

- [ ] `validate:wrangler` passes
- [ ] No Bun APIs in worker code (`rg` check)
- [ ] Health endpoint returns 200
- [ ] Security tests pass (6/6)
- [ ] All secrets configured

---

**Mission Status:** ✅ **DEPLOYMENT SYSTEM OPERATIONAL**

