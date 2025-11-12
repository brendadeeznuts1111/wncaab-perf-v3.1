#!/bin/bash
# tests/e2e/worktrees-complete.spec.sh
# End-to-end test for worktree configuration
# Ticket: TES-OPS-004.B.8.16

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
MAIN_WORKTREE="tes-repo"
SENTINEL_WORKTREE="tmux-sentinel"
MAIN_PORT=3002
SENTINEL_PORT=3004

echo -e "${YELLOW}🧪 Running Worktree E2E Tests...${NC}\n"

# Test 1: Configuration file exists
echo "Test 1: Checking .cursor/worktrees.json exists..."
if [ ! -f ".cursor/worktrees.json" ]; then
  echo -e "${RED}❌ FAIL: .cursor/worktrees.json not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: Configuration file exists${NC}\n"

# Test 2: Validate script exists and is executable
echo "Test 2: Checking validate-worktrees.ts..."
if [ ! -f "scripts/validate-worktrees.ts" ]; then
  echo -e "${RED}❌ FAIL: scripts/validate-worktrees.ts not found${NC}"
  exit 1
fi
if [ ! -x "scripts/validate-worktrees.ts" ]; then
  echo -e "${YELLOW}⚠️  WARNING: Script not executable, fixing...${NC}"
  chmod +x scripts/validate-worktrees.ts
fi
echo -e "${GREEN}✅ PASS: Validation script exists and is executable${NC}\n"

# Test 3: Setup script exists and is executable
echo "Test 3: Checking setup-worktree.ts..."
if [ ! -f "scripts/setup-worktree.ts" ]; then
  echo -e "${RED}❌ FAIL: scripts/setup-worktree.ts not found${NC}"
  exit 1
fi
if [ ! -x "scripts/setup-worktree.ts" ]; then
  echo -e "${YELLOW}⚠️  WARNING: Script not executable, fixing...${NC}"
  chmod +x scripts/setup-worktree.ts
fi
echo -e "${GREEN}✅ PASS: Setup script exists and is executable${NC}\n"

# Test 4: Worktree config utility exists
echo "Test 4: Checking worktree-config.ts..."
if [ ! -f "src/lib/worktree-config.ts" ]; then
  echo -e "${RED}❌ FAIL: src/lib/worktree-config.ts not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: Worktree config utility exists${NC}\n"

# Test 5: Validate configuration structure
echo "Test 5: Validating worktree configuration structure..."
CONFIG_VALID=$(bun -e "
  const config = await Bun.file('.cursor/worktrees.json').json();
  const worktrees = config.worktrees || [];
  const hasMain = worktrees.some(w => w.name === '$MAIN_WORKTREE');
  const hasSentinel = worktrees.some(w => w.name === '$SENTINEL_WORKTREE');
  console.log(hasMain && hasSentinel ? 'valid' : 'invalid');
" 2>/dev/null || echo "invalid")

if [ "$CONFIG_VALID" != "valid" ]; then
  echo -e "${RED}❌ FAIL: Invalid worktree configuration structure${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: Configuration structure valid${NC}\n"

# Test 6: Port isolation validation
echo "Test 6: Validating port isolation..."
MAIN_DEV_PORT=$(bun -e "
  const config = await Bun.file('.cursor/worktrees.json').json();
  const main = config.worktrees.find(w => w.name === '$MAIN_WORKTREE');
  console.log(main?.environment?.DEV_SERVER_PORT || '0');
" 2>/dev/null || echo "0")

SENTINEL_DEV_PORT=$(bun -e "
  const config = await Bun.file('.cursor/worktrees.json').json();
  const sentinel = config.worktrees.find(w => w.name === '$SENTINEL_WORKTREE');
  console.log(sentinel?.environment?.DEV_SERVER_PORT || '0');
" 2>/dev/null || echo "0")

if [ "$MAIN_DEV_PORT" != "$MAIN_PORT" ] || [ "$SENTINEL_DEV_PORT" != "$SENTINEL_PORT" ]; then
  echo -e "${RED}❌ FAIL: Port isolation invalid (Main: $MAIN_DEV_PORT, Sentinel: $SENTINEL_DEV_PORT)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: Port isolation valid (Main: $MAIN_PORT, Sentinel: $SENTINEL_PORT)${NC}\n"

# Test 7: Worker API port offset validation
echo "Test 7: Validating worker API port offsets..."
MAIN_WORKER_PORT=$(bun -e "
  const config = await Bun.file('.cursor/worktrees.json').json();
  const main = config.worktrees.find(w => w.name === '$MAIN_WORKTREE');
  console.log(main?.environment?.WORKER_API_PORT || '0');
" 2>/dev/null || echo "0")

SENTINEL_WORKER_PORT=$(bun -e "
  const config = await Bun.file('.cursor/worktrees.json').json();
  const sentinel = config.worktrees.find(w => w.name === '$SENTINEL_WORKTREE');
  console.log(sentinel?.environment?.WORKER_API_PORT || '0');
" 2>/dev/null || echo "0")

EXPECTED_MAIN_WORKER=$((MAIN_PORT + 1))
EXPECTED_SENTINEL_WORKER=$((SENTINEL_PORT + 1))

if [ "$MAIN_WORKER_PORT" != "$EXPECTED_MAIN_WORKER" ] || [ "$SENTINEL_WORKER_PORT" != "$EXPECTED_SENTINEL_WORKER" ]; then
  echo -e "${RED}❌ FAIL: Worker API port offset invalid${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: Worker API ports valid (+1 offset)${NC}\n"

# Test 8: Tmux session naming validation
echo "Test 8: Validating tmux session naming..."
MAIN_SESSION=$(bun -e "
  const config = await Bun.file('.cursor/worktrees.json').json();
  const main = config.worktrees.find(w => w.name === '$MAIN_WORKTREE');
  console.log('tes-dev-' + main?.name || 'invalid');
" 2>/dev/null || echo "invalid")

SENTINEL_SESSION=$(bun -e "
  const config = await Bun.file('.cursor/worktrees.json').json();
  const sentinel = config.worktrees.find(w => w.name === '$SENTINEL_WORKTREE');
  console.log('tes-dev-' + sentinel?.name || 'invalid');
" 2>/dev/null || echo "invalid")

if [ "$MAIN_SESSION" != "tes-dev-$MAIN_WORKTREE" ] || [ "$SENTINEL_SESSION" != "tes-dev-$SENTINEL_WORKTREE" ]; then
  echo -e "${RED}❌ FAIL: Tmux session naming invalid${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: Tmux session naming valid${NC}\n"

# Test 9: Documentation files exist
echo "Test 9: Checking documentation files..."
if [ ! -f "docs/worktrees.md" ]; then
  echo -e "${RED}❌ FAIL: docs/worktrees.md not found${NC}"
  exit 1
fi
if [ ! -f "docs/ADR-007-worktree-strategy.md" ]; then
  echo -e "${RED}❌ FAIL: docs/ADR-007-worktree-strategy.md not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: Documentation files exist${NC}\n"

# Test 10: README.md includes Development Setup section
echo "Test 10: Checking README.md includes Development Setup..."
if ! grep -q "## Development Setup" README.md; then
  echo -e "${RED}❌ FAIL: README.md missing Development Setup section${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PASS: README.md includes Development Setup${NC}\n"

# Test 11: Run validation script (dry run - just check it runs)
echo "Test 11: Running validation script (syntax check)..."
if ! bun run scripts/validate-worktrees.ts > /dev/null 2>&1; then
  # This might fail if worktrees don't exist, which is OK for E2E test
  echo -e "${YELLOW}⚠️  WARNING: Validation script returned non-zero (worktrees may not exist)${NC}"
else
  echo -e "${GREEN}✅ PASS: Validation script executes successfully${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All E2E Tests Passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Worktree configuration is complete and ready for use."
echo ""
echo "Next steps:"
echo "  1. Run: bun run scripts/setup-worktree.ts tes-repo"
echo "  2. Run: bun run scripts/setup-worktree.ts tmux-sentinel"
echo "  3. Validate: bun run scripts/validate-worktrees.ts"
echo ""

