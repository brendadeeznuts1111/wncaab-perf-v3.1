# Tmux Integration: Worker Telemetry & Dev Server Orchestration

## Overview

Complete tmux integration for unified TES development environment orchestration. Both the dev server and Worker Telemetry API run in a single tmux session with multiple panes for centralized process management.

## Session Architecture

```
tmux session: tes-dev
├── Pane 0: Dev Server (port 3002)
│   $ bun run scripts/dev-server.ts
│   → Dashboard, API endpoints, WebSocket
├── Pane 1: Worker Telemetry API (port 3000)
│   $ bun run scripts/worker-telemetry-api.ts
│   → Worker snapshots, metrics aggregation
└── Pane 2: Real-time Logs (combined)
    $ tail -f logs/dev-server.log logs/workers.log
    → Centralized operational view
```

## Quick Start

### Start Full Environment

```bash
# Start unified tmux session
./scripts/tmux-tes-dev.ts start

# Attach to session
./scripts/tmux-tes-dev.ts attach

# Check status
./scripts/tmux-tes-dev.ts status

# Stop session
./scripts/tmux-tes-dev.ts kill
```

## API Endpoints

### GET /api/dev/tmux/status

Get tmux session status (JSON).

**Response:**
```json
{
  "online": true,
  "session": "tes-dev",
  "panes": [
    {
      "index": "0",
      "title": "dev-server",
      "command": "bun run scripts/dev-server.ts"
    },
    {
      "index": "1",
      "title": "telemetry",
      "command": "bun run scripts/worker-telemetry-api.ts"
    }
  ],
  "services": {
    "devServer": true,
    "telemetry": true
  }
}
```

### POST /api/dev/tmux/start

Start tmux session (non-blocking).

**Response:**
```json
{
  "success": true,
  "message": "Tmux session started",
  "session": "tes-dev"
}
```

### POST /api/dev/tmux/stop

Stop tmux session.

**Response:**
```json
{
  "success": true,
  "message": "Tmux session stopped",
  "session": "tes-dev"
}
```

## Dashboard Integration

### Enhanced Error Recovery

Worker snapshot download errors now include tmux-aware recovery:

- **Manual Start:** Shows command to run manually
- **One-Click Start:** Button to start full tmux environment
- **Retry:** After starting, retry download without losing context

### Tmux Control Panel

The dashboard includes a tmux control panel (can be added to dashboard HTML):

```html
<tmux-control-panel></tmux-control-panel>
```

**Features:**
- Real-time status indicator
- Start/Stop/Attach buttons
- Pane details view
- Auto-refresh every 5 seconds

## Script: `scripts/tmux-tes-dev.ts`

TypeScript/Bun script for tmux orchestration.

**Commands:**
- `start` - Create and start new tes-dev session
- `attach` - Attach to existing session
- `kill` - Terminate session
- `status` - Show session status (default)
- `status --json` - Output JSON for API consumption

**Features:**
- Automatic session/window creation
- Process detection and cleanup
- Health verification
- JSON output for API integration

## Workflow Examples

### Starting Both Services

```bash
# Terminal 1: Start unified environment
./scripts/tmux-tes-dev.ts start

# Both services now running in tes-dev session
# - Pane 0: Dev server (port 3002)
# - Pane 1: Telemetry API (port 3000)
# - Pane 2: Combined logs
```

### Monitoring

```bash
# Check status
./scripts/tmux-tes-dev.ts status

# Attach to see all panes
./scripts/tmux-tes-dev.ts attach

# From within tmux:
# Ctrl+B → Arrow keys: Navigate panes
# Ctrl+B → d: Detach (session keeps running)
# Ctrl+B → x: Close current pane
```

### Dashboard Integration

```javascript
// Start tmux session from dashboard
async function startTmuxSession() {
  const response = await fetch('/api/dev/tmux/start', { method: 'POST' });
  const data = await response.json();
  // Show success notification
}

// Check status
async function checkTmuxStatus() {
  const response = await fetch('/api/dev/tmux/status');
  const data = await response.json();
  return data.online;
}
```

## Benefits

| Feature | Without Tmux | With Tmux Integration |
|---------|--------------|----------------------|
| **Process Lifecycle** | Manual, error-prone | Automated, robust |
| **Log Aggregation** | Scattered terminals | Centralized pane 2 |
| **Error Recovery** | Restart manually | One-click from dashboard |
| **Session Persistence** | Dies on SSH disconnect | Survives detaches |
| **Operability** | Context switching | Single-pane-of-glass |

## Troubleshooting

### Session Not Starting

```bash
# Check if tmux is installed
which tmux

# Check for existing session
tmux list-sessions

# Kill existing session
tmux kill-session -t tes-dev

# Try starting again
./scripts/tmux-tes-dev.ts start
```

### Port Conflicts

```bash
# Check if ports are in use
lsof -i :3002  # Dev server
lsof -i :3000  # Telemetry API

# Kill processes if needed
kill $(lsof -ti:3002)
kill $(lsof -ti:3000)
```

### View Logs

```bash
# From within tmux session
tmux capture-pane -t tes-dev:0.2 -p -S -50

# Or attach and navigate
./scripts/tmux-tes-dev.ts attach
# Then navigate to pane 2 (logs)
```

## Related Documentation

- [Worker Telemetry tmux Integration](./docs/WORKER-TELEMETRY-TMUX.md)
- [tmux Quick Reference](./docs/TMUX-QUICK-REFERENCE.md)
- [Dev Server tmux Integration](./docs/DEV-SERVER-TMUX-INTEGRATION.md)

