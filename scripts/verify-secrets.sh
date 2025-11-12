#!/usr/bin/env bash
# TES-DEPLOY-001: Secrets Verification Script
# Quick status check for secrets and build verification

ENV=${1:-staging}

echo "🔍 Checking secrets for $ENV..."
echo ""

# Check secrets
SECRETS=$(bunx wrangler secret list --env=$ENV 2>/dev/null)

if [ -z "$SECRETS" ] || [ "$SECRETS" = "[]" ]; then
  echo "  ❌ No secrets found"
else
  echo "$SECRETS" | grep -q "VERSION_SIGNING_KEY" && echo "  ✅ VERSION_SIGNING_KEY: set" || echo "  ❌ VERSION_SIGNING_KEY: missing"
  echo "$SECRETS" | grep -q "VERSION_SIGNING_KEY_V2" && echo "  ✅ VERSION_SIGNING_KEY_V2: set (optional)" || echo "  ⚠️  VERSION_SIGNING_KEY_V2: not set (optional)"
  echo "$SECRETS" | grep -q "TES_PROXY_IPS" && echo "  ✅ TES_PROXY_IPS: set (optional)" || echo "  ⚠️  TES_PROXY_IPS: not set (optional)"
fi

echo ""
echo "📊 Build verification:"
echo "  Checking latest deployment..."

# Get deployment info
DEPLOYMENT=$(bunx wrangler deployments list --env=$ENV 2>/dev/null | head -n 2 | tail -n 1)

if [ -n "$DEPLOYMENT" ]; then
  echo "  ✅ Latest deployment found"
  echo "  $DEPLOYMENT"
else
  echo "  ⚠️  No deployments found"
fi

echo ""
echo "🌐 Worker URL:"
WORKER_NAME="tes-ngws-001-flux-veto-${ENV}"
echo "  https://${WORKER_NAME}.workers.dev"

echo ""
echo "💡 Next steps:"
echo "  1. Redeploy to activate secrets: bunx wrangler deploy --env=$ENV"
echo "  2. Verify health: curl https://${WORKER_NAME}.workers.dev/health"
echo "  3. Check logs: bunx wrangler tail --env=$ENV"

