# Command Reference

**Grepable Tag:** `[#COMMANDS:reference]`  
**Version:** `1.0.0`  
**Last Updated:** 2025-11-10

---

## Server Management

**Grepable Tag:** `[#COMMANDS:server]`

```bash
# Start server (port 3001)
bun run start

# Start on alternative port
bun run start:port

# Stop server
bun run stop

# Restart gracefully
bun run restart

# Force restart
bun run force-restart

# Zero-downtime restart
bun run restart:sentinel
```

---

## Port Management

**Grepable Tag:** `[#COMMANDS:port]`

```bash
# Check port status
bun run check:port 3001

# Find process using port
lsof -i :3001

# Kill process on port
kill $(lsof -ti:3001)
```

---

## Monitoring

**Grepable Tag:** `[#COMMANDS:monitoring]`

```bash
# Start unified pipeline
bun run start:unified

# Discovery mode (auto-find matches)
bun run start:discovery

# Monitor steam detections
bash scripts/monitor-steam.sh

# Verify restart
bun run verify:restart
```

---

## Telegram

**Grepable Tag:** `[#COMMANDS:telegram]`

```bash
# Test steam alert
bun run test:telegram

# Test pin functionality
bun run test:telegram:pin

# Verify configuration
bun run verify:telegram

# Setup Telegram
bun run setup:telegram
```

---

## Health & Diagnostics

**Grepable Tag:** `[#COMMANDS:health]`

```bash
# Health check
curl http://localhost:3001/health

# Metrics
curl http://localhost:3001/metrics

# Diagnostics
curl http://localhost:3001/diagnostics
```

---

## Development

**Grepable Tag:** `[#COMMANDS:dev]`

```bash
# Dev server (hot reload)
bun run dev

# Production server
bun run prod

# Run tests
bun run test:suite

# Performance benchmark
bun run monitor:perf
```

---

## Compilation

**Grepable Tag:** `[#COMMANDS:build]`

```bash
# Compile to binary
bun build src/index-unified.ts --outfile ball-poller --compile

# Run compiled binary
./ball-poller
```

---

## Version History

- **v1.0.0** - Initial command reference
