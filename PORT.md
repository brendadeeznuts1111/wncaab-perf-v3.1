# Port Management

**Grepable Tag:** `[#PORT:management]`  
**Version:** `1.0.0`  
**Last Updated:** 2025-11-10

---

## Quick Fix

**Grepable Tag:** `[#PORT:quick-fix]`

```bash
# Kill stuck process and restart
kill $(lsof -ti:3001) && sleep 1 && bun run start

# Check port status
bun run check:port 3001

# Use different port
PORT=3002 bun run start
```

---

## Commands

**Grepable Tag:** `[#PORT:commands]`

| Command | Description |
|--------|-------------|
| `bun run start` | Start server (port 3001) |
| `bun run start:port` | Start on port 3002 |
| `bun run stop` | Kill process on port 3001 |
| `bun run restart` | Graceful restart |
| `bun run force-restart` | Force kill and restart |
| `bun run check:port 3001` | Check port availability |

---

## Configuration

**Grepable Tag:** `[#PORT:config]`

### Default Ports
- `src/index-unified.ts` - Port 3001 (or `PORT` env var)
- `scripts/dev-server.ts` - Port 3002 (or `BUN_PORT` env var)

### Environment Variables
- `PORT` - Used by index-unified.ts (default: 3001)
- `BUN_PORT` - Used by dev-server.ts (default: 3002)
- `NODE_PORT` - Alternative port variable

---

## Troubleshooting

**Grepable Tag:** `[#PORT:troubleshooting]`

### Port in Use
```bash
# 1. Check what's using it
bun run check:port 3001

# 2. Kill the process
bun run stop

# 3. Verify it's free
lsof -i :3001

# 4. Start server
bun run start
```

### Process Won't Die
```bash
# Force kill
kill -9 $(lsof -ti:3001)

# Or use force-restart
bun run force-restart
```

---

## Port Check Utility

**Grepable Tag:** `[#PORT:utility]`

The port check script (`scripts/check-port.ts`) detects:
- Port availability
- Process using the port (PID, command)
- Provides kill command

**Example Output:**
```
❌ Port 3001 is IN USE
   Process: bun (PID: 27454)
   Kill with: kill 27454
```

---

## Version History

- **v1.0.0** - Initial port management documentation







