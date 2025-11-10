# Dev Server - Unified API Dashboard

**Date**: November 09, 2025  
**Status**: ✅ **READY**  
**Port**: 3002

Unified dev server that aggregates all APIs, configs, and worker telemetry in one place.

---

## 🚀 **Quick Start**

```bash
# Start the dev server
bun run dev

# Or
bun run dev:server
```

**Dashboard**: http://localhost:3002

---

## 📊 **Features**

### **1. HTML Dashboard**
- Beautiful, modern UI with auto-refresh
- Color-coded status indicators
- Direct links to all endpoints
- Real-time worker status

### **2. API Endpoints**

#### **Worker API** (Port 3000)
- `GET /api/workers/registry` - Live worker state
- `POST /api/workers/scale` - Manual worker scaling
- `GET /api/workers/snapshot/:id` - Heap snapshot
- `WS /ws/workers/telemetry` - Live telemetry stream

#### **Spline API** (Port 3001)
- `GET /api/spline/render` - Render spline path
- `POST /api/spline/predict` - Predict next points
- `POST /api/spline/preset/store` - Store preset
- `WS /ws/spline-live` - Live spline streaming

#### **Dev API** (Port 3002)
- `GET /api/dev/endpoints` - List all API endpoints
- `GET /api/dev/configs` - Show all configs
- `GET /api/dev/workers` - Worker telemetry
- `GET /api/dev/status` - System status
- `GET /` - HTML dashboard

---

## ⚙️ **Configs**

The dev server automatically loads and displays:
- `bunfig.toml` - Runtime configuration
- `bun-ai.toml` - AI immunity configuration

Access via: `GET /api/dev/configs`

---

## 👷 **Workers**

Worker telemetry integration:
- Live worker registry
- Status monitoring (idle/working/error)
- Queue depth tracking
- Resource usage (RSS, heap)

Access via: `GET /api/dev/workers`

---

## 📡 **System Status**

Complete system overview:
- Service status (Worker API, Spline API, Dev API)
- Worker summary
- Config status
- Endpoint counts

Access via: `GET /api/dev/status`

---

## 🎯 **Usage Examples**

### **View Dashboard**
```bash
# Start server
bun run dev

# Open in browser
open http://localhost:3002
```

### **Get All Endpoints**
```bash
curl http://localhost:3002/api/dev/endpoints
```

### **View Configs**
```bash
curl http://localhost:3002/api/dev/configs
```

### **Check Workers**
```bash
curl http://localhost:3002/api/dev/workers
```

### **System Status**
```bash
curl http://localhost:3002/api/dev/status
```

---

## 🔧 **Implementation**

**File**: `scripts/dev-server.ts`

- ✅ HTML dashboard with auto-refresh
- ✅ API endpoint aggregation
- ✅ Config loading (bunfig.toml, bun-ai.toml)
- ✅ Worker telemetry integration
- ✅ System status endpoint
- ✅ CORS enabled
- ✅ Error handling

---

## 📋 **Ports**

| Service | Port | Status |
|---------|------|--------|
| Worker API | 3000 | Optional |
| Spline API | 3001 | Optional |
| Dev Server | 3002 | Required |

---

**Status**: ✅ **READY**

The dev server provides a unified view of all APIs, configs, and workers! 🚀✨💎

