# Cursor Worktrees Configuration Guide

**Ticket**: TES-OPS-004.B.8.16  
**Status**: ✅ Configured  
**Date**: 2025-01-XX

---

## Overview

This project uses **Cursor worktrees** for isolated, concurrent development across multiple environments. Each worktree runs independent services on distinct ports to prevent conflicts.

---

## Worktree Architecture

### Current Worktrees

| Worktree | Branch | Dev Port | Worker Port | Tmux Session |
|----------|--------|----------|-------------|--------------|
| `tes-repo` | `main` | 3002 | 3003 | `tes-dev-tes-repo` |
| `tmux-sentinel` | `feature/tmux-sentinel` | 3004 | 3005 | `tes-dev-tmux-sentinel` |

### Port Isolation Matrix

Each worktree uses distinct ports to prevent conflicts:

| Service | Main Worktree | Tmux Worktree |
|---------|--------------|---------------|
| Dev Server | `3002` | `3004` |
| Worker Telemetry API | `3003` | `3005` |
| WebSocket Status | `3002` (same) | `3004` (same) |
| Logs | `.tes/logs/tes-repo/` | `.tes/logs/tmux-sentinel/` |

---

## Quick Start

### Start Main Worktree

```bash
cd ~/tes-repo
bun run scripts/tmux-tes-dev.ts start
# Dashboard: http://localhost:3002
```

### Start Tmux Sentinel Worktree

```bash
cd ~/tmux-sentinel
bun run scripts/tmux-tes-dev.ts start
# Dashboard: http://localhost:3004
```

### Validate Configuration

```bash
bun run scripts/validate-worktrees.ts
```

---

## Worktree Detection

The system automatically detects the current worktree using `import.meta.dir`:

```typescript
// src/lib/worktree-config.ts
export function detectWorktree(): string {
  const dirPath = import.meta.dir;
  // Extracts worktree name from path
  // Example: /home/user/tmux-sentinel/scripts → 'tmux-sentinel'
}
```

**Critical**: Never use `process.cwd()` – it follows the shell's directory, not the worktree.

---

## Configuration Files

### `.cursor/worktrees.yml`

Defines worktree configurations for Cursor IDE:

```yaml
worktrees:
  - name: tes-repo
    path: ~/tes-repo
    environment:
      DEV_SERVER_PORT: 3002
      WORKER_API_PORT: 3003
```

### Environment Variables

Each worktree can have its own `.env` file:

```bash
# ~/tes-repo/.env
DEV_SERVER_PORT=3002
WORKER_API_PORT=3003

# ~/tmux-sentinel/.env
DEV_SERVER_PORT=3004
WORKER_API_PORT=3005
ENABLE_SENTINEL_FEATURES=true
```

---

## Development Workflow

### Scenario 1: CPU Fix in Main Worktree

```bash
# In ~/tes-repo (main)
git checkout fix/TES-OPS-004-B-8.14-cpu-metric
bun run scripts/dev-server.ts &
curl http://localhost:3002/api/dev/status | jq '.vector.others.cpu'

# Merge to tmux-sentinel
cd ~/tmux-sentinel
git merge fix/TES-OPS-004-B-8.14-cpu-metric
bun run scripts/tmux-tes-dev.ts start &
curl http://localhost:3004/api/dev/status | jq '.vector.others.cpu'
```

### Scenario 2: Tmux Feature Development

```bash
# In ~/tmux-sentinel (feature)
git checkout feature/tmux-sentinel
bun run scripts/tmux-tes-dev.ts start

# Test tmux orchestration without affecting main
tmux ls
# Should show: tes-dev-tmux-sentinel

# Main worktree untouched
cd ~/tes-repo
bun test
# Runs tests against main dev server on 3002
```

---

## Log Isolation

Each worktree writes to its own log directory:

```bash
~/tes-repo/.tes/logs/tes-repo/
  ├── dev-server.log
  └── worker-telemetry.log

~/tmux-sentinel/.tes/logs/tmux-sentinel/
  ├── dev-server.log
  └── worker-telemetry.log
```

Logs are automatically isolated using `import.meta.dir`:

```typescript
const worktreeConfig = getWorktreeConfig();
const LOG_DIR = worktreeConfig.logDirectory;
// Resolves to: {worktree-root}/.tes/logs/{worktree-name}/
```

---

## Tmux Session Naming

Tmux sessions are automatically named based on worktree:

```bash
# Main worktree
tmux session: tes-dev-tes-repo

# Tmux sentinel worktree
tmux session: tes-dev-tmux-sentinel
```

**Verification**:

```bash
tmux ls | grep tes-dev
# Output:
# tes-dev-tes-repo: 3 windows (created ...)
# tes-dev-tmux-sentinel: 3 windows (created ...)
```

---

## Troubleshooting

### Issue: "Port already in use"

**Solution**: Check if another worktree is using the port:

```bash
lsof -i :3002
# If occupied, kill or use different port in .env
```

### Issue: `import.meta.dir` resolves to wrong worktree

**Solution**: Ensure you're running the script from the correct directory:

```bash
cd ~/tmux-sentinel
bun run scripts/tmux-tes-dev.ts start
# NOT: cd ~/tes-repo && bun ../tmux-sentinel/scripts/tmux-tes-dev.ts start
```

### Issue: Logs showing up in wrong worktree

**Solution**: Verify `LOG_DIR` uses `import.meta.dir`:

```typescript
const LOG_DIR = `${import.meta.dir}/../.tes/logs`;
// NOT: `${process.cwd()}/.tes/logs` (shell-dependent)
```

---

## Best Practices

1. **Always commit in the correct worktree** – don't cross-pollute branches
2. **Use worktree-specific branches** – `feature/tmux-sentinel`, not `tmux-fixes`
3. **Test shared code in main first** – then merge to feature worktrees
4. **Run `validate-worktrees` before demos** – ensures no port conflicts
5. **Keep `.env` isolated** – never commit worktree-specific configs

---

## Validation

Run the validation script to check worktree configuration:

```bash
bun run scripts/validate-worktrees.ts
```

## Setup Automation

Use the setup script to initialize a worktree:

```bash
# Setup main worktree
bun run scripts/setup-worktree.ts tes-repo

# Setup tmux-sentinel worktree
bun run scripts/setup-worktree.ts tmux-sentinel
```

The setup script will:
1. Install dependencies (`bun install`)
2. Run validation (`bun run scripts/validate-worktrees.ts`)
3. Create log directories
4. Verify port availability

**Expected Output**:

```
🔍 Validating Worktree Configuration...

📂 Current Worktree: tes-repo

🌳 tes-repo:
   ✅ Dev Server running on 3002
   ✅ Worker API running on 3003
   ✅ Logs isolated: ~/tes-repo/.tes/logs/tes-repo
   ✅ Tmux session exists: tes-dev-tes-repo

🌳 tmux-sentinel:
   ⚠️  Dev Server offline on 3004
   ⚠️  Worker API offline on 3005
   ✅ Logs isolated: ~/tmux-sentinel/.tes/logs/tmux-sentinel
   ⚠️  Tmux session not found: tes-dev-tmux-sentinel

✅ Validation passed
```

---

## Related Documentation

- **ADR-007**: Worktree Strategy Architecture Decision Record
- **TES-OPS-004.B.8.16**: Cursor Worktrees Configuration Ticket
- **`.cursor/worktrees.yml`**: Cursor IDE configuration

---

**Last Updated**: 2025-01-XX

