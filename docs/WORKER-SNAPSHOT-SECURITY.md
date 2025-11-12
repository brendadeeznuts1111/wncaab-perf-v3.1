# Worker Snapshot Security Implementation - TES-SEC

## ✅ Security Checklist - COMPLETE

### 1. Auth: X-TES-Dev-Token Required ✅

**Protected Endpoints:**
- `GET /api/dev/workers` - Worker telemetry
- `GET /api/workers/registry` - Worker registry
- `POST /api/workers/scale` - Worker scaling
- `GET /api/workers/snapshot/:id` - Worker snapshot download

**Implementation:**
- Validates `X-TES-Dev-Token` header against `TES_DEV_TOKEN` environment variable
- Returns `401 Unauthorized` if missing or invalid
- Logs auth failures via `logTESEvent('worker:*:auth_failed')`

**Usage:**
```bash
# Set token in environment
export TES_DEV_TOKEN="your-secure-token-here"

# Make authenticated request
curl -H "X-TES-Dev-Token: your-secure-token-here" \
     http://localhost:3002/api/dev/workers
```

### 2. Rate Limiting: Max 1 Snapshot per Worker per 10 Seconds ✅

**Implementation:**
- Per-worker rate limiting via `checkWorkerSnapshotRateLimit(workerId)`
- Returns `429 Too Many Requests` with `Retry-After` header
- Logs rate limit violations via `logTESEvent('worker:snapshot:rate_limited')`

**Rate Limit Headers:**
- `Retry-After`: Seconds until retry allowed
- `X-RateLimit-Limit`: `1`
- `X-RateLimit-Remaining`: `0` (when rate limited)
- `X-RateLimit-Reset`: Timestamp when limit resets

### 3. CORS: Restricted to localhost:3002 Only ✅

**Implementation:**
- Validates `Origin` header
- Only allows `http://localhost:3002` or `http://127.0.0.1:3002`
- Returns `403 Forbidden` for unauthorized origins
- Logs CORS violations via `logTESEvent('worker:*:cors_blocked')`

**Note:** Same-origin requests (no Origin header) are allowed automatically.

## Security Flow

```
Request → Auth Check → CORS Check → Rate Limit Check → Handler
           ↓            ↓              ↓
        401/Log      403/Log        429/Log
```

## Testing

### Test Auth Protection:
```bash
# Should fail (no token)
curl http://localhost:3002/api/dev/workers

# Should fail (wrong token)
curl -H "X-TES-Dev-Token: wrong-token" \
     http://localhost:3002/api/dev/workers

# Should succeed (correct token)
curl -H "X-TES-Dev-Token: dev-token-default" \
     http://localhost:3002/api/dev/workers
```

### Test CORS Protection:
```bash
# Should fail (wrong origin)
curl -H "Origin: http://localhost:3000" \
     -H "X-TES-Dev-Token: dev-token-default" \
     http://localhost:3002/api/dev/workers

# Should succeed (correct origin)
curl -H "Origin: http://localhost:3002" \
     -H "X-TES-Dev-Token: dev-token-default" \
     http://localhost:3002/api/dev/workers
```

### Test Rate Limiting:
```bash
# First request - should succeed
curl -H "X-TES-Dev-Token: dev-token-default" \
     http://localhost:3002/api/workers/snapshot/worker-123

# Second request within 10 seconds - should fail with 429
curl -H "X-TES-Dev-Token: dev-token-default" \
     http://localhost:3002/api/workers/snapshot/worker-123
```

## Logging

All security events are logged to `logs/worker-events.log`:
- `worker:snapshot:auth_failed`
- `worker:snapshot:cors_blocked`
- `worker:snapshot:rate_limited`
- `worker:snapshot:success`
- `worker:snapshot:failed`
- `worker:registry:auth_failed`
- `worker:registry:cors_blocked`
- `worker:scale:auth_failed`
- `worker:scale:cors_blocked`

## Metrics

- `tes_worker_snapshot_requests_total` - Counter incremented on each snapshot request

## Production Deployment

1. Set secure token:
   ```bash
   export TES_DEV_TOKEN="$(openssl rand -hex 32)"
   ```

2. Update frontend to include token in requests:
   ```javascript
   fetch('/api/dev/workers', {
     headers: {
       'X-TES-Dev-Token': 'your-token-here'
     }
   })
   ```

3. Monitor logs:
   ```bash
   tail -f logs/worker-events.log | grep -E "auth_failed|cors_blocked|rate_limited"
   ```

