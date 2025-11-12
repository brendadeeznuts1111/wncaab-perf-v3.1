# TES WebSocket Services Documentation

## Overview

TES uses WebSockets for real-time communication and live data streaming across multiple subsystems. This document provides an overview of all WebSocket endpoints and their usage.

---

## Status Live Feed

**Endpoint**: `ws://localhost:3002/api/dev/status/live` (tes-repo)  
**Endpoint**: `ws://localhost:3004/api/dev/status/live` (tmux-sentinel)

**Purpose**: Real-time status updates for TES subsystems

**Features**:
- Vector-based status data (sessions, directions, metrics)
- Sub-millisecond updates
- Automatic reconnection
- Fallback to HTTP polling

**Documentation**: See [Enhanced Status System](./ENHANCED-STATUS-SYSTEM.md) for complete details.

**Usage Example**:
```javascript
const ws = new WebSocket('ws://localhost:3002/api/dev/status/live');
ws.onmessage = (event) => {
  const status = JSON.parse(event.data);
  console.log('Status update:', status);
};
```

---

## Worker Updates Stream

**Endpoint**: `ws://localhost:3003/ws/workers/telemetry` (tes-repo)  
**Endpoint**: `ws://localhost:3005/ws/workers/telemetry` (tmux-sentinel)

**Purpose**: Real-time worker snapshot and telemetry streaming

**Features**:
- Worker registry updates
- Performance metrics
- Health status changes

**Documentation**: See [Worker Telemetry & Tmux](./WORKER-TELEMETRY-TMUX.md) for details.

---

## Server Metrics Live Stream

**Endpoint**: `ws://localhost:3002/ws/server-metrics/live`

**Purpose**: Real-time Bun native metrics streaming

**Features**:
- HTTP request metrics
- WebSocket connection counts
- Memory usage
- CPU metrics

**Documentation**: See [Bun Native Metrics Integration](./BUN-NATIVE-METRICS-INTEGRATION.md) for details.

**Update Frequency**: Every 500ms

---

## External WebSocket Services

### NowGoal WebSocket

**Endpoint**: `wss://live.nowgoal26.com/ws`

**Purpose**: External sports data streaming

**Features**:
- JWT authentication
- Binary message compression (deflate)
- Automatic reconnection with exponential backoff
- Channel subscription management

**Documentation**: See [NowGoal Protocol Reference](./NOWGOAL-PROTOCOL-REFERENCE.md) for complete protocol details.

---

## WebSocket Client Utilities

### Connection Management

All WebSocket connections in TES include:
- Automatic reconnection logic
- Heartbeat/keepalive mechanisms
- Error handling and logging
- State management

### Debugging

Use Chrome DevTools to inspect WebSocket connections:
1. Open Chrome DevTools (`chrome://inspect`)
2. Navigate to your application
3. Go to Network tab → WS filter
4. Click on WebSocket connection to view messages

---

## Related Documentation

- [Enhanced Status System](./ENHANCED-STATUS-SYSTEM.md) - Status endpoint details
- [Worker Telemetry & Tmux](./WORKER-TELEMETRY-TMUX.md) - Worker WebSocket streams
- [Bun Native Metrics Integration](./BUN-NATIVE-METRICS-INTEGRATION.md) - Metrics streaming
- [NowGoal Protocol Reference](./NOWGOAL-PROTOCOL-REFERENCE.md) - External WebSocket protocol

---

**Last Updated**: 2025-01-XX  
**Status**: Production Ready

