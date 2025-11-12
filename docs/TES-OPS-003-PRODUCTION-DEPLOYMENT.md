# TES-OPS-003: Production Deployment Guide

## Overview

This guide covers deploying TES-OPS-003 features (Endpoint Checker & Domain Configuration) to production environments.

## Environment Variables

### Development (Default)
```bash
# Defaults (no env vars needed)
TES_API_DOMAIN=localhost:3002
TES_COOKIE_DOMAIN=localhost
NODE_ENV=development  # or BUN_ENV=development
```

### Production
```bash
# Required for production deployment
export TES_API_DOMAIN="api.nowgoal26.com"
export TES_COOKIE_DOMAIN=".nowgoal26.com"
export NODE_ENV="production"  # or BUN_ENV="production"
export NOWGOAL_DOMAIN="nowgoal26.com"  # Optional, defaults to nowgoal26.com
```

## Production Configuration

### 1. Domain Configuration

The TES domain configuration automatically detects production mode when:
- `NODE_ENV=production` OR `BUN_ENV=production`

**Production Defaults:**
- `apiDomain`: `api.nowgoal26.com` (or `TES_API_DOMAIN` if set)
- `cookieDomain`: `.nowgoal26.com` (or `TES_COOKIE_DOMAIN` if set)
- `apiBaseUrl`: `https://api.nowgoal26.com`
- `isDevelopment`: `false`

### 2. Cookie Domain Behavior

**Development:**
- Cookie domain: `localhost` (no wildcard)
- Cookies scoped to exact hostname

**Production:**
- Cookie domain: `.nowgoal26.com` (wildcard)
- Cookies accessible across subdomains:
  - `api.nowgoal26.com`
  - `app.nowgoal26.com`
  - `admin.nowgoal26.com`
  - etc.

### 3. Endpoint Checker in Production

The endpoint checker (`/api/dev/endpoints/check`) will:
- Use `TES_API_DOMAIN` for base URLs
- Test against production endpoints
- Verify cookies use `.nowgoal26.com` domain
- Report domain mismatches

**Security Note:** Consider rate-limiting or restricting `/api/dev/endpoints/check` in production to prevent information disclosure.

## Verification Steps

### Pre-Deployment Checklist

1. **Verify Environment Variables:**
   ```bash
   echo $TES_API_DOMAIN      # Should be: api.nowgoal26.com
   echo $TES_COOKIE_DOMAIN   # Should be: .nowgoal26.com
   echo $NODE_ENV            # Should be: production
   ```

2. **Test Domain Configuration:**
   ```bash
   curl https://api.nowgoal26.com/api/dev/endpoints/check | jq '.tesDomainConfig'
   ```
   
   Expected output:
   ```json
   {
     "apiDomain": "api.nowgoal26.com",
     "cookieDomain": ".nowgoal26.com",
     "apiBaseUrl": "https://api.nowgoal26.com",
     "isDevelopment": false
   }
   ```

3. **Verify Cookie Domain:**
   ```bash
   # Test auth endpoint (once implemented)
   curl -v https://api.nowgoal26.com/api/auth/token \
     -H "X-CSRF-Token: <token>" \
     2>&1 | grep -i "set-cookie"
   ```
   
   Expected: `Set-Cookie: tes-jwt=...; Domain=.nowgoal26.com; ...`

4. **Run Endpoint Checker:**
   ```bash
   curl https://api.nowgoal26.com/api/dev/endpoints/check | jq '.summary'
   ```

### Post-Deployment Verification

1. **Check Cookie Endpoints Report:**
   ```bash
   curl https://api.nowgoal26.com/api/dev/endpoints/check | jq '.cookieEndpointsReport'
   ```
   
   Verify:
   - `found[].cookieDomain` matches `.nowgoal26.com`
   - `found[].matchesTESConfig` is `true`

2. **Verify Skipped Endpoints:**
   ```bash
   curl https://api.nowgoal26.com/api/dev/endpoints/check | jq '.skippedReport'
   ```
   
   Should show only WebSocket endpoints skipped.

3. **Check Domain Metadata in Headers:**
   ```bash
   curl https://api.nowgoal26.com/api/dev/endpoints/check | \
     jq '.results[].headers[] | select(.metadata.domain == "api.nowgoal26.com")' | head -5
   ```

## Docker/Container Deployment

### Dockerfile Example
```dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy application files
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV TES_API_DOMAIN=api.nowgoal26.com
ENV TES_COOKIE_DOMAIN=.nowgoal26.com

# Expose port
EXPOSE 3002

CMD ["bun", "run", "scripts/dev-server.ts"]
```

### docker-compose.yml Example
```yaml
version: '3.8'

services:
  tes-api:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - TES_API_DOMAIN=api.nowgoal26.com
      - TES_COOKIE_DOMAIN=.nowgoal26.com
      - NOWGOAL_DOMAIN=nowgoal26.com
    restart: unless-stopped
```

## Kubernetes Deployment

### ConfigMap Example
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tes-domain-config
data:
  TES_API_DOMAIN: "api.nowgoal26.com"
  TES_COOKIE_DOMAIN: ".nowgoal26.com"
  NOWGOAL_DOMAIN: "nowgoal26.com"
```

### Deployment Example
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tes-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: tes-api
        image: tes-api:latest
        envFrom:
        - configMapRef:
            name: tes-domain-config
        env:
        - name: NODE_ENV
          value: "production"
        ports:
        - containerPort: 3002
```

## Security Considerations

### 1. Endpoint Checker Access Control

Consider restricting `/api/dev/endpoints/check` in production:

```typescript
// In dev-server.ts
'/api/dev/endpoints/check': async (req) => {
  // Restrict to internal IPs or admin users
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  if (IS_PRODUCTION && !isInternalIP(clientIP)) {
    return new Response('Forbidden', { status: 403 });
  }
  // ... rest of handler
}
```

### 2. Cookie Security

Production cookies automatically use:
- `Secure`: true (HTTPS only)
- `HttpOnly`: true (no JavaScript access)
- `SameSite`: strict (CSRF protection)
- `Domain`: `.nowgoal26.com` (subdomain access)

### 3. Domain Validation

The `validateTESDomainConfig()` function ensures:
- Cookie domain starts with `.` in production
- Cookie domain doesn't start with `.` in development
- All required fields are present

## Troubleshooting

### Issue: Cookies not working across subdomains

**Symptom:** Cookies set on `api.nowgoal26.com` not accessible on `app.nowgoal26.com`

**Solution:** Verify `TES_COOKIE_DOMAIN` is set to `.nowgoal26.com` (with leading dot)

### Issue: Endpoint checker using wrong domain

**Symptom:** Checker reports `apiDomain: localhost:3002` in production

**Solution:** Verify `NODE_ENV=production` or `BUN_ENV=production` is set

### Issue: Cookie domain mismatch warnings

**Symptom:** Endpoint checker reports cookie domain mismatches

**Solution:** 
1. Check `TES_COOKIE_DOMAIN` matches actual cookie domain
2. Verify cookie factory is using TES domain config (not hardcoded)

## Monitoring

### Key Metrics to Monitor

1. **Endpoint Checker Results:**
   - Success rate: `summary.successful / summary.total`
   - Average response time: `summary.averageResponseTime`
   - Cookie endpoint verification: `cookieEndpointsReport.found[].matchesTESConfig`

2. **Domain Configuration:**
   - Verify `tesDomainConfig.isDevelopment` is `false` in production
   - Monitor for domain mismatch warnings

3. **Cookie Security:**
   - Track cookie-setting endpoints
   - Verify all cookies use correct domain

## Rollback Plan

If issues occur:

1. **Revert Environment Variables:**
   ```bash
   unset TES_API_DOMAIN
   unset TES_COOKIE_DOMAIN
   export NODE_ENV=development
   ```

2. **Restart Service:**
   ```bash
   # Service will use development defaults
   systemctl restart tes-api
   ```

3. **Verify Rollback:**
   ```bash
   curl http://localhost:3002/api/dev/endpoints/check | jq '.tesDomainConfig'
   ```

## References

- [TES-OPS-003 Implementation](./TES-OPS-003-IMPLEMENTATION.md)
- [Domain Configuration Module](../src/config/tes-domain-config.ts)
- [Cookie Factory](../src/lib/cookie-factory.ts)
- [Endpoint Checker](../scripts/dev-server.ts) (search for `/api/dev/endpoints/check`)

