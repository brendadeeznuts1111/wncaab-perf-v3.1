# 🚀 Developer Portal - Quick Reference

## 📍 **Server Location**

**Default Port**: `3002`  
**Dashboard URL**: http://localhost:3002  
**Base API URL**: http://localhost:3002/api

---

## 🎯 **Main Dashboard**

### **HTML Dashboard**
- **URL**: http://localhost:3002/
- **Description**: Beautiful, modern UI with auto-refresh, color-coded status indicators, direct links to all endpoints, and real-time worker status

---

## 📊 **Monitoring & Health Endpoints**

### **System Status**
- **URL**: http://localhost:3002/api/dev/status
- **Description**: Complete system overview including:
  - Server metrics (pendingRequests, pendingWebSockets)
  - Service status (Worker API, Spline API, Dev API, Tension API)
  - Worker summary (idle/working/error counts)
  - Event loop metrics
  - Config status
  - **Lifecycle metrics** (sessions, tension, forecast)
  - Endpoint counts

### **Server Metrics**
- **URL**: http://localhost:3002/api/dev/metrics
- **Description**: Real-time server metrics including:
  - Pending requests and WebSocket connections
  - Worker pool size and status
  - Production metrics (spline renders, curve detections, worker spawns/terminations)
  - Rate limit hits and timeouts
  - Uptime
  - **Lifecycle metrics** (active sessions, phase distribution, tension levels)

### **Event Loop Monitoring**
- **URL**: http://localhost:3002/api/dev/event-loop
- **Description**: Event loop health metrics:
  - Tick count and long tick count
  - Average and max tick duration
  - Health status (green/yellow/red)
  - Recommendations

### **Worker Telemetry**
- **URL**: http://localhost:3002/api/dev/workers
- **Description**: Live worker registry with:
  - Worker status (idle/working/error)
  - Queue depth
  - Resource usage (RSS, heap)
  - Performance metrics

---

## 🔄 **TES Lifecycle Endpoints**

### **Lifecycle Health Check**
- **URL**: http://localhost:3002/api/lifecycle/health
- **Description**: TES lifecycle health check with:
  - Manager initialization status
  - Active sessions count
  - Tension level (OPTIMAL/LOW/MEDIUM/HIGH/CRITICAL)
  - Forecast (stable vs evict_imminent)
  - Phase distribution
  - Returns 200 (healthy) or 503 (degraded/unhealthy)

### **Lifecycle Export**
- **URL**: http://localhost:3002/api/lifecycle/export
- **Description**: Export lifecycle visualization data (JSON format)

### **TES Dashboard**
- **URL**: http://localhost:3002/tes-dashboard.html
- **Description**: TES lifecycle dashboard with hex-ring visualization (D3.js)

---

## 🔧 **Configuration Endpoints**

### **All Endpoints List**
- **URL**: http://localhost:3002/api/dev/endpoints
- **Description**: Complete list of all API endpoints organized by service

### **Configs**
- **URL**: http://localhost:3002/api/dev/configs
- **Description**: Show all loaded configs (bunfig.toml, bun-ai.toml)

---

## 🎨 **Visualization Endpoints**

### **Tension Mapping**
- **URL**: http://localhost:3002/tension
- **Description**: Tension mapping visualization

### **Tension Health**
- **URL**: http://localhost:3002/api/tension/health
- **Description**: Tension mapping health check

---

## 🚀 **Quick Start Commands**

```bash
# Start the dev server
bun run dev

# Or check if it's already running
curl http://localhost:3002/api/dev/status

# Open dashboard in browser
open http://localhost:3002
```

---

## 📋 **All Monitoring URLs**

| Endpoint | URL | Purpose |
|----------|-----|---------|
| **Dashboard** | http://localhost:3002/ | Main HTML dashboard |
| **System Status** | http://localhost:3002/api/dev/status | Complete system overview |
| **Server Metrics** | http://localhost:3002/api/dev/metrics | Real-time metrics |
| **Event Loop** | http://localhost:3002/api/dev/event-loop | Event loop health |
| **Workers** | http://localhost:3002/api/dev/workers | Worker telemetry |
| **Lifecycle Health** | http://localhost:3002/api/lifecycle/health | TES lifecycle health |
| **Lifecycle Export** | http://localhost:3002/api/lifecycle/export | Lifecycle data export |
| **TES Dashboard** | http://localhost:3002/tes-dashboard.html | TES hex-ring visualization |
| **Endpoints List** | http://localhost:3002/api/dev/endpoints | All API endpoints |
| **Configs** | http://localhost:3002/api/dev/configs | Configuration files |

---

## 🔍 **Health Check Quick Test**

```bash
# Test all health endpoints
curl http://localhost:3002/api/dev/status | jq '.lifecycle'
curl http://localhost:3002/api/dev/metrics | jq '.lifecycle'
curl http://localhost:3002/api/lifecycle/health | jq '.status'
```

---

**Last Updated**: December 2024  
**Port**: 3002 (default, can be overridden with PORT/BUN_PORT env vars)

