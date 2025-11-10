# Development Workflow

**Grepable Tag**: `[#GUIDE:development-workflow]`

**Date**: December 2024  
**Status**: ✅ **PRODUCTION-READY**  
**Version**: v14.2.1

---

## 🚀 **Quick Start**

### **Development** (auto-restart on file changes):

```bash
bun run dev
```

The `--hot` flag is automatically applied in the dev script. No manual configuration needed.

### **Production** (no auto-restart):

```bash
bun run prod
```

---

## 🔥 **Hot Reload**

### **Development Mode**

The dev server is configured with hot module replacement (HMR) for fast development iteration:

**Features:**
- ✅ Auto-restart on file changes
- ✅ HMR for HTML imports (assets bundled on-demand)
- ✅ Browser console logs echoed to terminal
- ✅ Fast development iteration

**Usage:**
```bash
# Start dev server with hot reload
bun run dev

# Server will auto-restart when you save files
# HTML imports will hot-reload in browser
# Console logs appear in terminal
```

**Configuration:**
- `package.json`: `"dev": "bun --hot scripts/dev-server.ts"`
- `dev-server.ts`: `development: { hmr: true, console: true }`

### **Production Mode**

For production deployments, use the production script (no auto-restart):

```bash
bun run prod
```

---

## 📋 **Available Scripts**

### **Development**
- `bun run dev` - Start dev server with hot reload
- `bun run dev:server` - Start dev server (legacy, no hot reload)

### **Production**
- `bun run prod` - Start production server (no hot reload)

### **Other Commands**
- `bun run build:tension` - Build tension visualization
- `bun run index:ai-immunity` - Build AI immunity index
- `bun run validate:*` - Run validation scripts

---

## ⚙️ **Server Configuration**

### **Port Configuration**

Port is handled automatically by Bun with the following priority:

1. CLI flag: `bun --port=4002 dev-server.ts` (highest priority)
2. `BUN_PORT` environment variable
3. `PORT` environment variable
4. `NODE_PORT` environment variable
5. Default: 3002

**Random Port Assignment:**

To use a random available port, set `port: 0` in `Bun.serve()`:

```typescript
const server = Bun.serve({
  port: 0,  // Random available port
  // ... rest of config
});

console.log(`Server running on random port: ${server.port}`);
```

**Example:**
```bash
# Use default port (3002)
bun run dev

# Override port
bun --port=8080 run dev

# Or use environment variable
BUN_PORT=5000 bun run dev

# Random port (requires code change: port: 0)
# Access via server.port property
```

### **Hostname Configuration**

- Default: `0.0.0.0` (all interfaces)
- Override: `HOSTNAME=localhost bun run dev`

### **Idle Timeout**

- Default: 120 seconds (2 minutes)
- Override: `IDLE_TIMEOUT=60 bun run dev`

---

## 🔧 **Development Tips**

### **Hot Reload Behavior**

- **File Changes**: Server automatically restarts when TypeScript/JavaScript files change
- **HTML Imports**: Assets are bundled on-demand with HMR (no full page reload)
- **Static Files**: Changes to static files require manual refresh

### **Console Logging**

Browser console logs are automatically echoed to the terminal when `console: true` is enabled in development mode.

### **Performance**

- Development: Assets bundled on-demand (slower initial load, faster iteration)
- Production: Pre-built manifest (faster load, no runtime bundling)

---

## 📊 **Server Endpoints**

### **Dashboard**
- `GET /` - HTML dashboard
- `GET /health` - Health check
- `GET /ready` - Readiness check

### **API Endpoints**
- `GET /api/dev/endpoints` - List all API endpoints
- `GET /api/dev/configs` - Show all configs
- `GET /api/dev/workers` - Worker telemetry
- `GET /api/dev/status` - System status
- `GET /api/dev/metrics` - Server metrics

### **Visualization**
- `GET /tension` - Tension mapping visualization
- `GET /tension-map` - Tension map (alias)

---

## 🛡️ **Security**

### **Development**
- Hot reload enabled
- Console logging enabled
- Development mode features active

### **Production**
- Hot reload disabled
- Console logging disabled
- Optimized for performance

---

## ✅ **Status**

```
Hot Reload:        ✅ Enabled (dev script)
Auto-restart:      ✅ Enabled (--hot flag)
HMR:               ✅ Enabled (development config)
Console Logging:   ✅ Enabled (development config)
Production Mode:   ✅ Available (prod script)
```

---

**The forge pumps automatically. Development workflow optimized for speed.** 🔥

