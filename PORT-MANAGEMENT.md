# Port Management Quick Reference

## 🚨 Quick Fix for Port Conflicts

### Kill stuck process and restart:
```bash
kill 16438 && sleep 1 && bun run start
```

### Check port status:
```bash
bun run check:port 3001
```

### Use different port:
```bash
PORT=3002 bun run start
```

---

## 📋 Available Commands

### Start/Stop/Restart
- `bun run start` - Start main server (port 3001)
- `bun run start:port` - Start on port 3002
- `bun run stop` - Kill process on port 3001
- `bun run restart` - Graceful restart
- `bun run force-restart` - Force kill and restart

### Diagnostics
- `bun run check:port [port]` - Check if port is available
- `lsof -i :3001` - Show what's using port 3001

---

## 🔧 Port Configuration

### Default Ports
- `src/index.ts` - No server (WebSocket client only)
- `src/index-unified.ts` - Port 3001 (or PORT env var)
- `scripts/dev-server.ts` - Port 3002 (or PORT env var)

### Environment Variables
- `PORT` - Used by index-unified.ts (default: 3001)
- `BUN_PORT` - Used by dev-server.ts (default: 3002)
- `NODE_PORT` - Alternative port variable

---

## 🛠️ Troubleshooting

### Port is in use
```bash
# 1. Check what's using it
bun run check:port 3001

# 2. Kill the process
kill $(lsof -ti:3001)

# 3. Verify it's free
lsof -i :3001

# 4. Start server
bun run start
```

### Process won't die
```bash
# Force kill
kill -9 $(lsof -ti:3001)

# Or use force-restart script
bun run force-restart
```

### Use alternative port
```bash
# Start on port 3002
PORT=3002 bun run start

# Update health check URL
curl http://localhost:3002/health
```

---

## 📝 Prevention Tips

1. **Always use proper shutdown**: CTRL+C instead of `--dry-run`
2. **Check port before starting**: `bun run check:port 3001`
3. **Use restart scripts**: `bun run restart` handles cleanup
4. **Monitor processes**: `ps aux | grep bun` to see running instances

---

## ✅ Production Checklist

- [x] Port management scripts added
- [x] Port check utility created
- [ ] Process manager configured (systemd/supervisor)
- [ ] Health check endpoint verified
- [ ] Telegram alerts configured
- [ ] Database write permissions verified

