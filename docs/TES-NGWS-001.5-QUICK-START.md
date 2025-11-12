# TES-NGWS-001.5: Quick Start Deployment Guide

## 🚀 Quick Deploy to Staging

```bash
# 1. Set required secrets
wrangler secret put VERSION_SIGNING_KEY --env=staging

# 2. Deploy
./scripts/deploy-staging-ngws-001.5.sh

# 3. Run security validations
bun run scripts/test-ngws-001.5-security.ts --env=staging
```

## 📋 Pre-Deployment Checklist

- [ ] Wrangler CLI installed and authenticated
- [ ] KV namespace created and configured in `wrangler.toml`
- [ ] `VERSION_SIGNING_KEY` secret set for staging
- [ ] (Optional) `VERSION_SIGNING_KEY_V2` secret set for dual-key rotation
- [ ] (Optional) `TES_PROXY_IPS` secret set for proxy IP whitelist

## 🔒 Security Validations

The deployment script automatically runs:
1. ✅ Health check
2. ✅ CSRF token generation
3. ✅ Subprotocol negotiation
4. ✅ Host header validation
5. ✅ Sec-WebSocket-Key format validation
6. ✅ Version registry endpoint

## 📚 Full Documentation

See `docs/TES-NGWS-001.5-STAGING-DEPLOYMENT.md` for complete deployment guide.

