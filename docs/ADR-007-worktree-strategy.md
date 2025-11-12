# ADR-007: Cursor Worktrees Strategy for Multi-Environment Development

**Status**: Accepted  
**Date**: 2025-01-XX  
**Deciders**: TES Operations Team  
**Tags**: `TES-OPS-004-B-8.16`, `worktrees`, `development-infrastructure`, `multi-environment`

## Context

The TES project requires **isolated, concurrent development** across multiple feature branches:

1. **Main Worktree** (`tes-repo`): CPU metric fixes, core features
2. **Feature Worktree** (`tmux-sentinel`): Tmux orchestration features

**Problems**:
- Both worktrees share the same `.git` but run **concurrent dev servers**
- Risk of port collisions (both try to use port 3002)
- State bleed between worktrees (logs, tmux sessions)
- No isolation between feature development and mainline fixes

## Decision

We will configure **Cursor worktrees** with **automatic port isolation** and **worktree-aware configuration** to enable concurrent development without conflicts.

### Implementation Strategy

1. **Worktree Detection**: Use `import.meta.dir` to detect current worktree
2. **Port Isolation**: Automatic port offset based on worktree name
3. **Log Isolation**: Worktree-specific log directories
4. **Tmux Session Naming**: Worktree-specific session names
5. **Environment Variables**: Per-worktree `.env` files

### Port Isolation Matrix

| Worktree | Dev Port | Worker Port | Offset |
|----------|----------|------------|--------|
| `tes-repo` | 3002 | 3003 | +0 |
| `tmux-sentinel` | 3004 | 3005 | +2 |

### Worktree Detection

```typescript
// src/lib/worktree-config.ts
export function detectWorktree(): string {
  const dirPath = import.meta.dir;
  // /home/user/tmux-sentinel/scripts → 'tmux-sentinel'
  const parts = dirPath.split('/').filter(Boolean);
  return parts[parts.length - 2]; // Parent of 'scripts'
}
```

**Critical**: Never use `process.cwd()` – it follows the shell's directory, not the worktree.

### Port Configuration

```typescript
// Automatic port offset based on worktree
const worktreeConfig = getWorktreeConfig();
const DEV_SERVER_PORT = worktreeConfig.devServerPort; // 3002 or 3004
const WORKER_API_PORT = worktreeConfig.workerApiPort; // 3003 or 3005
```

### Log Isolation

```typescript
// Each worktree writes to its own log directory
const LOG_DIR = `${import.meta.dir}/../.tes/logs/${worktreeName}`;
// ~/tes-repo/.tes/logs/tes-repo/
// ~/tmux-sentinel/.tes/logs/tmux-sentinel/
```

### Tmux Session Naming

```typescript
// Worktree-specific session names
const SESSION_NAME = `tes-dev-${worktreeName}`;
// tes-dev-tes-repo
// tes-dev-tmux-sentinel
```

## Consequences

### Positive

- ✅ **Zero Conflicts**: Port isolation prevents collisions
- ✅ **Isolated Development**: Feature worktrees don't affect main
- ✅ **Concurrent Testing**: Test both worktrees simultaneously
- ✅ **Clean State**: Logs and sessions isolated per worktree
- ✅ **Automatic Detection**: No manual configuration needed

### Negative

- ⚠️ **Port Management**: Must remember which worktree uses which ports
- ⚠️ **Environment Variables**: Need per-worktree `.env` files
- ⚠️ **Validation Required**: Must run validation script before demos

### Mitigations

- **Port Management**: Validation script checks all ports
- **Environment Variables**: Documented in `.cursor/worktrees.yml`
- **Validation**: Automated script catches conflicts early

## Implementation Checklist

- [x] Worktree detection utility (`src/lib/worktree-config.ts`)
- [x] Port isolation in `dev-server.ts` (via Bun's automatic handling)
- [x] Port isolation in `worker-telemetry-api.ts`
- [x] Worktree-specific tmux session names
- [x] Log isolation per worktree
- [x] `.cursor/worktrees.yml` configuration
- [x] Validation script (`scripts/validate-worktrees.ts`)
- [x] Documentation (`docs/worktrees.md`)
- [x] ADR-007-worktree-strategy.md

## References

- **Issue**: TES-OPS-004.B.8.16
- **Implementation**: `src/lib/worktree-config.ts`
- **Validation**: `scripts/validate-worktrees.ts`
- **Documentation**: `docs/worktrees.md`

## Related ADRs

- ADR-005: CPU Metric Standardization (tested in worktrees)
- ADR-006: Error Inspection (works across worktrees)

---

**Approved by**: TES Operations Team  
**Implementation Date**: 2025-01-XX  
**Review Date**: 2026-01-XX

