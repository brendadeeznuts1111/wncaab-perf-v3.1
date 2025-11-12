#!/usr/bin/env bash
# TES-NGWS-001.5: Staging Deployment Script
# Deploys TES-NGWS-001.5 security-hardened WebSocket foundation to Cloudflare Workers staging

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENV="staging"
WORKER_NAME="tes-ngws-001-flux-veto-staging"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  TES-NGWS-001.5: Staging Deployment                    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pre-flight checks
echo -e "${BLUE}[1/7]${NC} Running pre-flight checks..."
cd "$PROJECT_ROOT"

# Check wrangler CLI
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ wrangler CLI not found. Install with: npm install -g wrangler${NC}"
    exit 1
fi

# Check authentication
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated. Running: wrangler login${NC}"
    wrangler login
fi

# Verify wrangler.toml exists
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}❌ wrangler.toml not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-flight checks passed${NC}"
echo ""

# Step 2: Verify secrets
echo -e "${BLUE}[2/7]${NC} Verifying secrets..."
SECRETS_OK=true

# Check VERSION_SIGNING_KEY
if ! wrangler secret list --env="$ENV" 2>/dev/null | grep -q "VERSION_SIGNING_KEY"; then
    echo -e "${YELLOW}⚠️  VERSION_SIGNING_KEY not set for $ENV${NC}"
    echo -e "${CYAN}   Set with: wrangler secret put VERSION_SIGNING_KEY --env=$ENV${NC}"
    SECRETS_OK=false
else
    echo -e "${GREEN}✅ VERSION_SIGNING_KEY configured${NC}"
fi

# Check VERSION_SIGNING_KEY_V2 (optional)
if ! wrangler secret list --env="$ENV" 2>/dev/null | grep -q "VERSION_SIGNING_KEY_V2"; then
    echo -e "${YELLOW}⚠️  VERSION_SIGNING_KEY_V2 not set (optional for dual-key rotation)${NC}"
    echo -e "${CYAN}   Set with: wrangler secret put VERSION_SIGNING_KEY_V2 --env=$ENV${NC}"
else
    echo -e "${GREEN}✅ VERSION_SIGNING_KEY_V2 configured${NC}"
fi

# Check TES_PROXY_IPS (optional)
if ! wrangler secret list --env="$ENV" 2>/dev/null | grep -q "TES_PROXY_IPS"; then
    echo -e "${YELLOW}⚠️  TES_PROXY_IPS not set (optional for proxy IP whitelist)${NC}"
    echo -e "${CYAN}   Set with: wrangler secret put TES_PROXY_IPS --env=$ENV${NC}"
else
    echo -e "${GREEN}✅ TES_PROXY_IPS configured${NC}"
fi

if [ "$SECRETS_OK" = false ]; then
    echo -e "${RED}❌ Some required secrets are missing${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 3: Build verification
echo -e "${BLUE}[3/7]${NC} Verifying build configuration..."
if [ ! -f "src/workers/flux-veto-worker.ts" ]; then
    echo -e "${RED}❌ Worker entry point not found: src/workers/flux-veto-worker.ts${NC}"
    exit 1
fi

if [ ! -f "src/version-management-do.ts" ]; then
    echo -e "${RED}❌ VersionManagementDO not found: src/version-management-do.ts${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build configuration verified${NC}"
echo ""

# Step 4: Type check (if TypeScript available)
echo -e "${BLUE}[4/7]${NC} Running type check..."
if command -v bun &> /dev/null; then
    if bun --bun tsc --noEmit --skipLibCheck src/workers/flux-veto-worker.ts src/version-management-do.ts 2>/dev/null; then
        echo -e "${GREEN}✅ Type check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Type check warnings (continuing...)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  bun not found, skipping type check${NC}"
fi
echo ""

# Step 5: Deploy to staging
echo -e "${BLUE}[5/7]${NC} Deploying to Cloudflare Workers staging..."
echo -e "${CYAN}   Worker: $WORKER_NAME${NC}"
echo -e "${CYAN}   Environment: $ENV${NC}"
echo ""

if wrangler deploy --env="$ENV" --name="$WORKER_NAME"; then
    echo -e "${GREEN}✅ Deployment successful${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
echo ""

# Step 6: Get deployment URL
echo -e "${BLUE}[6/7]${NC} Retrieving deployment URL..."
DEPLOYMENT_URL=$(wrangler deployments list --env="$ENV" --name="$WORKER_NAME" 2>/dev/null | head -n 1 | awk '{print $NF}' || echo "")
if [ -z "$DEPLOYMENT_URL" ]; then
    # Fallback: construct URL from worker name
    DEPLOYMENT_URL="https://${WORKER_NAME}.workers.dev"
fi

echo -e "${GREEN}✅ Deployment URL: ${CYAN}$DEPLOYMENT_URL${NC}"
echo ""

# Step 7: Health check
echo -e "${BLUE}[7/7]${NC} Running health check..."
HEALTH_URL="${DEPLOYMENT_URL}/health"
echo -e "${CYAN}   Checking: $HEALTH_URL${NC}"

if HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null); then
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
    BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        echo -e "${CYAN}   Response: $BODY${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check returned HTTP $HTTP_CODE${NC}"
        echo -e "${CYAN}   Response: $BODY${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Health check failed (worker may still be initializing)${NC}"
fi
echo ""

# Summary
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║  Deployment Summary                                      ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}✅ Staging deployment complete${NC}"
echo -e "${CYAN}   URL: $DEPLOYMENT_URL${NC}"
echo -e "${CYAN}   Environment: $ENV${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Run security validation tests:"
echo -e "     ${CYAN}bun run scripts/test-ngws-001.5-security.ts --env=staging --url=$DEPLOYMENT_URL${NC}"
echo -e "  2. Test WebSocket connection:"
echo -e "     ${CYAN}bun run scripts/test-ngws-001.5-websocket.ts --env=staging --url=$DEPLOYMENT_URL${NC}"
echo -e "  3. Monitor logs:"
echo -e "     ${CYAN}wrangler tail --env=$ENV${NC}"
echo ""

