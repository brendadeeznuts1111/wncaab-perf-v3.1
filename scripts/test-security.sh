#!/bin/bash
# scripts/test-security.sh
# Test script for ultra-secure CI mode

set -e

echo "=== Testing Ultra-Secure CI Mode ==="
echo ""

echo "✅ Test 1: --no-addons flag"
bun --no-addons run index:scan

echo ""
echo "✅ Test 2: Environment variable"
export BUN_NO_ADDONS=1
bun run index:scan

echo ""
echo "✅ Test 3: Validation"
bun run validate:remote --strict
bun run validate:config --strict

echo ""
echo "🚀 All security tests passed!"

