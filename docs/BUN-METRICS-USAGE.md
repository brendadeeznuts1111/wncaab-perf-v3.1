# Bun Native Metrics - Usage Examples

This document demonstrates how we use Bun's built-in server metrics following the [official Bun documentation](https://bun.com/docs/runtime/http/metrics#server-pendingrequests-and-server-pendingwebsockets).

## Basic Pattern

### `server.pendingRequests` and `server.pendingWebSockets`

Monitor server activity with built-in counters:

```typescript
const server = Bun.serve({
  fetch(req, server) {
    return new Response(
      `Active requests: ${server.pendingRequests}\n` + 
      `Active WebSockets: ${server.pendingWebSockets}`
    );
  },
});
```

### `server.subscriberCount(topic)`

Get count of subscribers for a WebSocket topic:

```typescript
const server = Bun.serve({
  fetch(req, server) {
    const chatUsers = server.subscriberCount("chat");
    return new Response(`${chatUsers} users in chat`);
  },
  websocket: {
    message(ws) {
      ws.subscribe("chat");
    },
  },
});
```

## Our Implementation

### 1. Direct Usage in Fetch Handlers

**Location**: `scripts/dev-server.ts` (lines 11205-11206)

```typescript
'/api/dev/status': async (req, server) => {
  const status = {
    server: {
      metrics: {
        pendingRequests: server.pendingRequests,
        pendingWebSockets: server.pendingWebSockets,
      },
    },
  };
  return Response.json(status);
}
```

### 2. Helper Functions

**Location**: `scripts/dev-server.ts` (lines 1487-1493)

```typescript
async function getActiveApiSessions(): Promise<number> {
  return devServer.pendingRequests;
}

function getWebSocketConnectionCount(): number {
  return devServer.pendingWebSockets;
}
```

### 3. Subscriber Count by Topic

**Location**: `scripts/dev-server.ts` (lines 1496-1509)

```typescript
function getTotalSubscriberCount(server: typeof devServer): number {
  const topics = ['chat', 'status-live', 'workers', 'version-updates', 'spline-live'];
  return topics.reduce((sum, topic) => {
    return sum + (server.subscriberCount?.(topic) || 0);
  }, 0);
}

function getLiveSubscriberMetrics(server: typeof devServer) {
  return {
    statusPanel: server.subscriberCount?.('status-live') || 0,
    workerUpdates: server.subscriberCount?.('workers') || 0,
    chat: server.subscriberCount?.('chat') || 0,
    spline: server.subscriberCount?.('spline-live') || 0,
    total: getTotalSubscriberCount(server)
  };
}
```

## API Endpoints Using Native Metrics

### `GET /api/dev/status`

Returns comprehensive status including native metrics:

```json
{
  "vector": {
    "sessions": {
      "apiSessions": 2,
      "websocketConnections": 5,
      "websocketSubscribers": 8
    }
  },
  "server": {
    "metrics": {
      "pendingRequests": 2,
      "pendingWebSockets": 5
    }
  }
}
```

### `GET /api/dev/metrics`

Returns real-time server metrics:

```json
{
  "http": {
    "pendingRequests": 2
  },
  "websockets": {
    "pendingConnections": 5,
    "subscribers": {
      "chat": 1,
      "status-live": 2,
      "workers": 1,
      "spline-live": 1
    },
    "totalSubscribers": 5
  }
}
```

## Benefits

1. **Zero Overhead**: Native C++ implementation, no JavaScript tracking
2. **Real-Time**: Always accurate, updated atomically
3. **Simple API**: Direct property access, no event listeners needed
4. **Type-Safe**: Full TypeScript support

## Testing

### Test Basic Metrics

```bash
# Get current metrics
curl http://localhost:3002/api/dev/metrics | jq

# Expected output:
# {
#   "http": { "pendingRequests": 0 },
#   "websockets": { "pendingConnections": 0, "totalSubscribers": 0 }
# }
```

### Test with Load

```bash
# Generate load and watch metrics update
while true; do
  curl -s http://localhost:3002/api/dev/metrics | jq '.http.pendingRequests'
  sleep 0.1
done

# In another terminal:
bombardier -c 10 -d 5s http://localhost:3002/api/dev/status
```

## References

- [Bun HTTP Metrics Documentation](https://bun.com/docs/runtime/http/metrics#server-pendingrequests-and-server-pendingwebsockets)
- `docs/BUN-NATIVE-METRICS-INTEGRATION.md` - Full integration guide
- `scripts/dev-server.ts` - Implementation examples

