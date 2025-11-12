# TES-NGWS-001 Deployment Guide

**Date:** 2025-11-11  
**Status:** ✅ Ready for Deployment

---

## 🚀 Cloudflare Workers Deployment

### Prerequisites

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   # or
   bunx wrangler --version
   ```

2. **Authenticate with Cloudflare**
   ```bash
   wrangler login
   ```

3. **Create KV Namespace**
   ```bash
   # Create production namespace
   wrangler kv:namespace create "KV"
   
   # Create preview namespace (for dev)
   wrangler kv:namespace create "KV" --preview
   ```

4. **Update wrangler.toml**
   - Replace `your-kv-namespace-id` with actual namespace ID from step 3
   - Replace `your-preview-kv-namespace-id` with preview namespace ID

### Deployment Steps

1. **Build Worker**
   ```bash
   bun build src/workers/flux-veto-worker.ts --outdir dist --target bun --minify
   ```

2. **Deploy to Cloudflare**
   ```bash
   wrangler deploy
   ```

3. **Verify Deployment**
   ```bash
   curl https://tes-ngws-001-flux-veto.workers.dev/health
   ```

### Worker Endpoints

- **Health Check:** `GET /health`
- **Verify Flux:** `POST /verify` (with JSON body)
- **Monitor Keys:** `GET /monitor?prefix=flux:&limit=100`
- **Get Pattern:** `GET /flux/:patternId?endpoint=/ajax/getwebsockettoken`

---

## 📊 Monitoring Setup

### Local Monitoring Script

```bash
# Monitor via Worker
bun run scripts/monitor-flux-keys.ts --worker https://tes-ngws-001-flux-veto.workers.dev

# Custom options
bun run scripts/monitor-flux-keys.ts \
  --prefix flux: \
  --limit 50 \
  --interval 3000 \
  --worker https://tes-ngws-001-flux-veto.workers.dev
```

### Environment Variables

Set `CLOUDFLARE_WORKER_URL` to avoid passing `--worker` each time:
```bash
export CLOUDFLARE_WORKER_URL="https://tes-ngws-001-flux-veto.workers.dev"
```

---

## ✅ Completed TODOs

### 1. auth-endpoints.ts - JWT Generation ✅

**Implementation:**
- Uses Bun's native `crypto.subtle` API
- HS256 algorithm with HMAC-SHA256
- Secret from `Bun.secrets` or environment
- Zero-npm dependencies

**Features:**
- Base64URL encoding
- JWT standard format (header.payload.signature)
- Expiration handling
- Unique JWT ID (jti)

### 2. nowgoal-websocket.ts - JSON Transformation ✅

**Implementation:**
- `transformJsonToNowGoalTick()` method added
- Uses existing `transformToNowGoalTick()` utility
- Handles JSON messages from decompressed WebSocket
- Falls back to raw JSON if transformation fails

**Features:**
- RG metadata generation
- Consistent NowGoalTick format
- Error handling with fallback

---

## 🔍 Alternative Endpoints Research

### BetsAPI.com

**Status:** ✅ WebSocket API Available

**Key Points:**
- Requires paid subscription
- API key authentication
- JSON format (easier than XML)
- More reliable than NowGoal (no dashes issue)
- Better documentation

**Next Steps:**
1. Evaluate subscription costs
2. Test with sample API key
3. Implement adapter layer if switching

**Documentation:** `docs/BETSAPI-ALTERNATIVE-RESEARCH.md`

---

## 📋 Deployment Checklist

- [x] Worker code created (`src/workers/flux-veto-worker.ts`)
- [x] Wrangler config created (`wrangler.toml`)
- [x] Monitoring script created (`scripts/monitor-flux-keys.ts`)
- [x] TODOs completed
- [x] Alternative research documented
- [ ] Wrangler CLI installed
- [ ] Cloudflare account authenticated
- [ ] KV namespace created
- [ ] `wrangler.toml` updated with KV IDs
- [ ] Worker deployed
- [ ] Health check verified
- [ ] Monitoring tested

---

## 🧪 Testing

### Test Worker Endpoints

```bash
# Health check
curl https://tes-ngws-001-flux-veto.workers.dev/health

# Verify flux pattern
curl -X POST https://tes-ngws-001-flux-veto.workers.dev/verify \
  -H "Content-Type: application/json" \
  -d '{
    "patternId": "tes-ngws-001-verify",
    "specifics": {
      "vetoEndpoint": "/ajax/getwebsockettoken",
      "userTier": "gold",
      "kellyEdge": 0.15
    }
  }'

# Monitor keys
curl "https://tes-ngws-001-flux-veto.workers.dev/monitor?prefix=flux:&limit=100"
```

### Expected Responses

**Health Check:**
```json
{
  "status": "ok",
  "timestamp": 1734567890123,
  "version": "v9-upgrade",
  "meta": "[META:worker-health][SEMANTIC:zero-npm-deploy]"
}
```

**Verify Flux:**
```json
{
  "pattern": { ... },
  "enforcement": { ... },
  "token": null,
  "aiFeedback": "[AI-FEEDBACK] Token intelligence: 5-8%...",
  "semanticMeta": "[META:worker-flux-v9][SEMANTIC:zero-npm-deploy]"
}
```

---

## 🔧 Configuration

### Environment Variables (Worker)

Set in Cloudflare Dashboard or `wrangler.toml`:
- `TOKEN_MULTIPLIER` - Default: 1.5
- `NOWGOAL_BASE` - Default: https://live.nowgoal26.com
- `JWT_ENDPOINT` - Default: /ajax/getwebsockettoken
- `WS_PROXY` - Default: wss://live.nowgoal26.com/ws

---

## 📈 Performance Targets

- **Token Resolution:** Sub-3ms
- **Validation Speed:** 400× acceleration (Wrangler)
- **Crypto Operations:** Native Bun (zero-npm)
- **KV Lookup:** Durable sessions

---

## 🎯 Next Steps

1. **Deploy Worker**
   - Follow deployment steps above
   - Verify health endpoint

2. **Test Monitoring**
   - Run monitoring script
   - Verify flux pattern detection

3. **Evaluate Alternatives**
   - Review BetsAPI subscription
   - Test WebSocket connection
   - Compare data quality

4. **Production Monitoring**
   - Set up alerts for veto triggers
   - Monitor `flux:*` keys regularly
   - Track endpoint health

---

**Status:** ✅ All tasks complete, ready for deployment

