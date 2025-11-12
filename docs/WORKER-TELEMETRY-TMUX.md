# Worker Telemetry API - tmux Integration Guide

## Overview

The Worker Telemetry API is fully integrated with tmux session management, following the TES-NGWS-001.12c standard. It runs in the same tmux session as the dev server, ensuring consistent process management and persistence.

## Session Structure

```
tmux session: sentinel-${workspace-name}
├── Window 1: 🚀 main (dev server)
└── Window 2: 📡 telemetry (Worker Telemetry API)
```

## Quick Start

### Automated Activation

```bash
# Start Worker Telemetry API in tmux
./scripts/activate-telemetry.sh
```

**What it does:**
1. Checks if API is already running
2. Creates/uses tmux session `sentinel-${workspace}`
3. Creates telemetry window if needed
4. Starts API in dedicated window
5. Verifies startup with health check

### Manual tmux Commands

```bash
# Attach to session
tmux attach-session -t sentinel-APPENDIX

# Switch to telemetry window
tmux select-window -t sentinel-APPENDIX:2

# View window output
tmux capture-pane -t sentinel-APPENDIX:2 -p

# Detach (keep running)
# Press: Ctrl+B, then D
```

## Helper Scripts

### `scripts/tmux-telemetry.sh`

A comprehensive helper script for managing the Worker Telemetry API in tmux.

**Commands:**

```bash
# Attach to telemetry window
./scripts/tmux-telemetry.sh attach

# Check status (API + tmux)
./scripts/tmux-telemetry.sh status

# View recent logs
./scripts/tmux-telemetry.sh logs

# Stop the API gracefully
./scripts/tmux-telemetry.sh stop
```

**Status Output Example:**
```
📊 Worker Telemetry API Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ API Status: Running on port 3000
👷 Workers: 47

📦 tmux Session: sentinel-APPENDIX
✅ Session exists
✅ Telemetry window exists
✅ Process appears to be running in tmux

💡 Commands:
  ./scripts/tmux-telemetry.sh attach  - Attach to telemetry window
  ./scripts/tmux-telemetry.sh logs    - View recent logs
  ./scripts/tmux-telemetry.sh stop    - Stop the API
```

## Integration Features

### 1. Session Management

- **Same Session:** Uses `sentinel-${workspace}` session (same as dev server)
- **Auto-Create:** Creates session if it doesn't exist
- **Window Management:** Creates dedicated telemetry window automatically

### 2. Process Detection

- **Port Check:** Detects if port 3000 is in use
- **tmux Check:** Verifies if process is running in tmux
- **Cleanup:** Stops processes running outside tmux

### 3. Health Verification

- **Startup Wait:** Waits up to 30 seconds for API to start
- **Health Check:** Verifies API responds to `/api/workers/registry`
- **Status Reporting:** Clear success/failure messages

## Workflow Examples

### Starting Both Services

```bash
# Terminal 1: Start dev server (in tmux)
bun run dev

# Terminal 2: Start telemetry API (in same tmux session)
./scripts/activate-telemetry.sh

# Both run in: sentinel-APPENDIX
# - Window 1: dev server
# - Window 2: telemetry API
```

### Monitoring

```bash
# Check status of both
./scripts/tmux-telemetry.sh status

# View telemetry logs
./scripts/tmux-telemetry.sh logs

# Attach to see both windows
tmux attach-session -t sentinel-APPENDIX
```

### Stopping

```bash
# Stop telemetry API
./scripts/tmux-telemetry.sh stop

# Or manually in tmux
tmux send-keys -t sentinel-APPENDIX:2 C-c
```

## Troubleshooting

### API Not Starting

```bash
# Check logs
./scripts/tmux-telemetry.sh logs

# Or manually
tmux capture-pane -t sentinel-APPENDIX:2 -p -S -50

# Check if port is in use
lsof -i :3000
```

### Process Not in tmux

```bash
# The activation script automatically detects and stops
# processes running outside tmux, but you can manually check:

# Find PID on port 3000
PID=$(lsof -ti:3000)

# Check if it's in tmux
tmux list-panes -a -F "#{pane_pid}" | grep -q "^${PID}$" && echo "In tmux" || echo "Not in tmux"

# Kill if not in tmux
kill ${PID}
```

### Session Not Found

```bash
# List all sessions
tmux list-sessions

# Create session manually
WORKSPACE=$(basename "$(pwd)" | tr ' ' '-')
tmux new-session -d -s "sentinel-${WORKSPACE}"

# Then run activation script
./scripts/activate-telemetry.sh
```

## Best Practices

1. **Always use tmux:** The activation script handles tmux automatically
2. **Check status first:** Use `./scripts/tmux-telemetry.sh status` before starting
3. **Monitor logs:** Use `./scripts/tmux-telemetry.sh logs` for debugging
4. **Graceful shutdown:** Use `./scripts/tmux-telemetry.sh stop` instead of killing processes

## Related Documentation

- [tmux Quick Reference](./docs/TMUX-QUICK-REFERENCE.md)
- [tmux Setup Guide](./docs/TMUX-SETUP-GUIDE.md)
- [TES-NGWS-001.12c](./docs/TES-NGWS-001.12c-TMUX-SECURITY.md)
- [Dev Server tmux Integration](./docs/DEV-SERVER-TMUX-INTEGRATION.md)

