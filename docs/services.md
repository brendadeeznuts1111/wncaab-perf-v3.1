# TES Development Service Registry

**Ticket**: TES-OPS-004.B.8.17  
**Status**: ✅ Complete  
**Date**: 2025-01-XX

---

## Overview

Complete inventory of tools, APIs, and services in the TES development ecosystem. The service mapper provides a single source of truth for all development resources across both worktrees.

---

## Quick Start

```bash
# List all services
./scripts/service-mapper.ts list

# Check health of all services
./scripts/service-mapper.ts health

# Interactive exploration
./scripts/service-mapper-tui.ts

# Show worktree details
./scripts/service-mapper.ts worktree tes-repo
```

---

## Service Categories

### Development APIs

| Service | Worktree | Port | URL |
|---------|----------|------|-----|
| Dev Server | tes-repo | 3002 | http://localhost:3002 |
| Worker Telemetry API | tes-repo | 3003 | http://localhost:3003 |
| Dev Server (Tmux) | tmux-sentinel | 3004 | http://localhost:3004 |
| Worker Telemetry API (Tmux) | tmux-sentinel | 3005 | http://localhost:3005 |

**Features**:
- REST API endpoints
- Dashboard interfaces
- Health check endpoints
- Real-time metrics

### WebSocket Feeds

| Service | Worktree | Port | URL |
|---------|----------|------|-----|
| Status Live Feed | tes-repo | 3002 | ws://localhost:3002/api/dev/status/live |
| Worker Updates | tes-repo | 3003 | ws://localhost:3003/ws/workers/telemetry |
| Status Live Feed (Tmux) | tmux-sentinel | 3004 | ws://localhost:3004/api/dev/status/live |

**Features**:
- Real-time status updates
- Worker snapshot streaming
- Live telemetry data

### Tools

| Tool | Description | Debug URL |
|------|-------------|-----------|
| Bun Runtime | JavaScript runtime v1.3+ | chrome://inspect |
| Bun Inspector | Chrome DevTools integration | chrome://inspect |
| Chrome DevTools | Frontend debugging | http://localhost:3002 |
| Cursor IDE | AI-powered editor | cursor://settings |
| Tmux | Terminal multiplexer | tmux attach -t tes-dev-{worktree} |

### Orchestration

| Session | Worktree | Command |
|---------|-----------|---------|
| Tmux Main Session | tes-repo | `tmux attach -t tes-dev-tes-repo` |
| Tmux Feature Session | tmux-sentinel | `tmux attach -t tes-dev-tmux-sentinel` |

---

## CLI Commands

### List Services

```bash
# List all services
./scripts/service-mapper.ts list

# List by category
./scripts/service-mapper.ts list development
./scripts/service-mapper.ts list websocket
./scripts/service-mapper.ts list tools
./scripts/service-mapper.ts list orchestration
```

### Documentation

```bash
# List all available documentation
./scripts/service-mapper.ts docs

# Open docs for specific service
./scripts/service-mapper.ts docs "Dev Server"
./scripts/service-mapper.ts docs "Bun Runtime"
```

### Debug Interfaces

```bash
# List all debug interfaces
./scripts/service-mapper.ts debug

# Open debug interface for service
./scripts/service-mapper.ts debug "Bun Inspector"
./scripts/service-mapper.ts debug "Chrome DevTools"
```

### Worktree Details

```bash
# Show default worktree
./scripts/service-mapper.ts worktree

# Show specific worktree
./scripts/service-mapper.ts worktree tes-repo
./scripts/service-mapper.ts worktree tmux-sentinel
```

### Health Check

```bash
# Check health of all services
./scripts/service-mapper.ts health

# Output shows:
# - Service name
# - Health status (🟢 Healthy / ⚪ Offline)
# - Response latency
```

---

## Worktree Variants

### Port Mapping

| Service | Main Worktree | Tmux Worktree |
|---------|--------------|---------------|
| Dev Server | 3002 | 3004 |
| Worker API | 3003 | 3005 |
| WebSocket Status | 3002 | 3004 |

### Log Locations

| Worktree | Log Directory |
|----------|---------------|
| tes-repo | `.tes/logs/tes-repo/` |
| tmux-sentinel | `.tes/logs/tmux-sentinel/` |

---

## Debug URLs

### Chrome DevTools

```bash
# Open Chrome DevTools
open chrome://inspect

# Or via service mapper
./scripts/service-mapper.ts debug "Chrome DevTools"
```

### Bun Inspector

```bash
# Start with inspector
bun --inspect scripts/dev-server.ts

# Open Chrome DevTools
open chrome://inspect

# Or via service mapper
./scripts/service-mapper.ts debug "Bun Inspector"
```

### Tmux Sessions

```bash
# Attach to main worktree session
tmux attach -t tes-dev-tes-repo

# Attach to tmux sentinel session
tmux attach -t tes-dev-tmux-sentinel

# Or via service mapper
./scripts/service-mapper.ts debug "Tmux Main Session"
```

### Log Files

```bash
# View dev server logs
tail -f .tes/logs/tes-repo/dev-server.log

# View worker telemetry logs
tail -f .tes/logs/tes-repo/worker-telemetry.log

# View tmux session logs
tail -f .tes/logs/tes-repo/tmux-session.log
```

---

## Dashboard Integration

The service map widget is available in the dashboard:

```html
<section id="service-map">
  <h2>🔍 Service Map</h2>
  <service-map-widget></service-map-widget>
</section>
```

**Features**:
- Real-time health status
- Auto-refresh every 5 seconds
- Color-coded status indicators
- Clickable service URLs

---

## Service Metadata

Each service includes:

- **name**: Service identifier
- **description**: What the service does
- **worktree**: Which worktree it belongs to
- **url**: Access URL
- **debugUrl**: Debug interface URL
- **docsUrl**: Documentation URL
- **logsPath**: Log file location
- **statusCommand**: Health check command
- **metadata**: Additional properties (port, type, etc.)

---

## Examples

### Check if Dev Server is Running

```bash
./scripts/service-mapper.ts health | grep "Dev Server"
# Output: Dev Server | 🟢 Healthy | 23ms
```

### Open Chrome DevTools

```bash
./scripts/service-mapper.ts debug "Bun Inspector"
# Opens: chrome://inspect in browser
```

### Show Tmux Worktree Details

```bash
./scripts/service-mapper.ts worktree tmux-sentinel
# Shows ports, scripts, environment, commands
```

### Interactive Mode

```bash
./scripts/service-mapper-tui.ts
# Opens interactive menu for exploration
```

---

## Troubleshooting

### Service Shows as Offline

1. **Check if service is running**:
   ```bash
   curl http://localhost:3002/api/dev/health
   ```

2. **Check port availability**:
   ```bash
   lsof -i :3002
   ```

3. **Check logs**:
   ```bash
   tail -f .tes/logs/tes-repo/dev-server.log
   ```

### Worktree Not Found

1. **Verify worktree exists**:
   ```bash
   ls ~/tes-repo
   ls ~/tmux-sentinel
   ```

2. **Check configuration**:
   ```bash
   cat .cursor/worktrees.json
   ```

3. **Run validation**:
   ```bash
   bun run scripts/validate-worktrees.ts
   ```

---

## Related Documentation

- **Service Mapper**: `scripts/service-mapper.ts`
- **TUI Mode**: `scripts/service-mapper-tui.ts`
- **Dashboard Widget**: `src/dashboard/components/service-map-widget.ts`
- **Worktree Config**: `.cursor/worktrees.json`
- **Worktree Docs**: `docs/worktrees.md`

---

**Last Updated**: 2025-01-XX

