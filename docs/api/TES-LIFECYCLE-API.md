# TES Lifecycle API Documentation

**Status**: ✅ **IMPLEMENTED**  
**Version**: TES-NGWS-001.9  
**Date**: December 2024

---

## Overview

The TES Lifecycle API provides endpoints for managing and monitoring WebSocket session lifecycles. The API tracks session phases, calculates tension scores, and exports visualization data.

---

## Base URL

```
http://localhost:3002/api/lifecycle
```

Production:
```
https://your-domain.com/api/lifecycle
```

---

## Endpoints

### GET `/api/lifecycle/export`

Export lifecycle visualization data for dashboard rendering.

#### Request

```http
GET /api/lifecycle/export HTTP/1.1
Host: localhost:3002
```

#### Response

**Status**: `200 OK`

**Headers**:
```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
X-APEX-Component: tes-lifecycle-manager
X-APEX-Version: 1.0.0
```

**Body**:
```json
{
  "data": [
    {
      "sessionID": "550e8400-e29b-41d4-a716-446655440000",
      "phase": "ACTIVE",
      "tension": 0.45
    },
    {
      "sessionID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "phase": "RENEW",
      "tension": 0.72
    }
  ],
  "count": 2,
  "timestamp": 1733808000000
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of session visualization data |
| `data[].sessionID` | String | Unique session identifier (UUID) |
| `data[].phase` | String | Current lifecycle phase (`INIT`, `AUTH`, `ACTIVE`, `RENEW`, `EVICT`) |
| `data[].tension` | Number | Tension score (0.0 to 1.0) |
| `count` | Number | Total number of active sessions |
| `timestamp` | Number | Unix timestamp (milliseconds) |

#### Error Responses

**503 Service Unavailable**:
```json
{
  "error": "Lifecycle manager not initialized",
  "data": []
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to export lifecycle data: <error message>"
}
```

#### Example Usage

```bash
# cURL
curl http://localhost:3002/api/lifecycle/export

# JavaScript
const response = await fetch('/api/lifecycle/export');
const data = await response.json();
console.log(`Active sessions: ${data.count}`);
```

---

## Lifecycle Phases

### INIT
**Description**: WebSocket upgrade pending  
**Trigger**: WebSocket connection opened  
**Tension Weight**: 1.0x  
**Typical Duration**: <100ms

### AUTH
**Description**: JWT validated  
**Trigger**: JWT extraction and validation  
**Tension Weight**: 1.5x  
**Typical Duration**: 50-200ms

### ACTIVE
**Description**: Streaming + heartbeats  
**Trigger**: Heartbeat OK  
**Tension Weight**: 1.0x  
**Typical Duration**: Variable (minutes to hours)

### RENEW
**Description**: Subprotocol rotation  
**Trigger**: Renewal opcode (0x01) or 80% TTL  
**Tension Weight**: 2.0x  
**Typical Duration**: 100-500ms

### EVICT
**Description**: Graceful close  
**Trigger**: WebSocket close or timeout  
**Tension Weight**: 1.0x  
**Typical Duration**: <50ms

---

## Tension Calculation

Tension scores are calculated using hybrid metrics fusion:

### Formula

```
base = (latency / 100) + errorRate
advanced = (queueDepth / 100) + (memPressure / 1024)
combined = base * 0.6 + advanced * 0.4
score = min(1.0, combined * phaseWeight)
```

### Metrics

| Metric | Description | Normalization |
|--------|-------------|---------------|
| `latency` | Request latency in milliseconds | 100ms = 1.0 |
| `errorRate` | Error rate (0.0 to 1.0) | Already normalized |
| `queueDepth` | Queue depth (number of pending items) | 100 = 1.0 |
| `memPressure` | Memory pressure in bytes | 1GB = 1.0 |

### Phase Weights

| Phase | Weight | Reason |
|-------|--------|--------|
| `INIT` | 1.0x | Standard weight |
| `AUTH` | 1.5x | Security-critical phase |
| `ACTIVE` | 1.0x | Standard weight |
| `RENEW` | 2.0x | Critical renewal phase |
| `EVICT` | 1.0x | Standard weight |

### Tension Levels

| Level | Score Range | Color | Description |
|-------|-------------|-------|-------------|
| **OPTIMAL** | 0.0 - 0.3 | `#2d5aa0` | System operating normally |
| **LOW** | 0.3 - 0.5 | `#3d7a47` | Minor stress, stable |
| **MEDIUM** | 0.5 - 0.7 | `#8a5a2d` | Elevated stress, monitor |
| **HIGH** | 0.7 - 0.9 | `#a05a2d` | Significant stress, alert |
| **CRITICAL** | 0.9 - 1.0 | `#a02d2d` | System overload, evict imminent |

---

## Integration Hooks

The lifecycle system integrates with WebSocket handlers using an observer pattern:

### WebSocket Lifecycle Events

1. **WebSocket Open** → Transition to `INIT` phase
2. **JWT Validation** → Transition to `AUTH` phase
3. **Heartbeat OK** → Transition to `ACTIVE` phase
4. **Renewal Opcode (0x01)** → Transition to `RENEW` phase
5. **WebSocket Close** → Transition to `EVICT` phase

### Observer Pattern Usage

```typescript
import { integrateLifecycle } from '../src/lib/worker-lifecycle-integration.ts';

// Integrate with existing Bun.serve() server
const server = Bun.serve({
  websocket: {
    open(ws) {
      // Your existing handler
    },
    message(ws, message) {
      // Your existing handler
    },
    close(ws, code, message) {
      // Your existing handler
    },
  },
});

// Add lifecycle hooks (preserves existing functionality)
integrateLifecycle(server);
```

### Manual Phase Transitions

```typescript
import { getLifecycleManager } from '../src/lib/worker-lifecycle-integration.ts';
import { LifecyclePhase } from '../src/lib/tes-lifecycle-manager.ts';

const manager = getLifecycleManager();
if (manager) {
  const tension = await manager.transition('session-id', LifecyclePhase.ACTIVE, {
    latency: 50,
    errorRate: 0.1,
    queueDepth: 50,
    memPressure: 512 * 1024 * 1024,
  });
  
  console.log(`Tension score: ${tension.score}`);
  console.log(`Forecast: ${tension.forecast}`);
}
```

---

## Rate Limiting

Currently, no rate limiting is enforced. Future versions may implement:

- Per-IP rate limiting
- Token-based authentication
- Request throttling

---

## CORS

The API supports CORS for cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Error Handling

All errors are returned as JSON with appropriate HTTP status codes:

- **400 Bad Request**: Invalid request parameters
- **404 Not Found**: Endpoint not found
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service not initialized

---

## References

- [TES Lifecycle Architecture](./TES-LIFECYCLE-ARCHITECTURE.md)
- [TES Lifecycle Deployment](./TES-LIFECYCLE-DEPLOYMENT.md)
- [Bun WebSocket API](https://bun.sh/docs/api/websocket)

---

[DOMAIN:nowgoal26.com][SCOPE:API][META:TES-NGWS-001.9][SEMANTIC:API-DOCS][TYPE:ENDPOINT-REFERENCE][#REF]{BUN-API:1.3.WEBSOCKET}

