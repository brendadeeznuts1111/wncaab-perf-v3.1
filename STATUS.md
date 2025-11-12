# System Status

**Grepable Tag:** `[#STATUS:system]`  
**Version:** `1.0.0`  
**Last Updated:** 2025-11-10

---

## Current Status

**Grepable Tag:** `[#STATUS:current]`

- **Server:** Running (PID: 27454)
- **Port:** 3001 (LISTENING)
- **Health:** http://localhost:3001/health ✅
- **Status:** OPERATIONAL

---

## Health Endpoint

**Grepable Tag:** `[#STATUS:health]`

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "operational",
  "active_pollers": 1,
  "match_ids": [663637],
  "recent_moves": 0,
  "uptime": 125.3
}
```

---

## Monitoring Endpoints

**Grepable Tag:** `[#STATUS:endpoints]`

| Endpoint | Description |
|----------|-------------|
| `/health` | System status & uptime |
| `/metrics` | Poller metrics & statistics |
| `/diagnostics` | Detailed diagnostic info |
| `/discover` | Match discovery (query params: start, end) |

---

## Production Checklist

**Grepable Tag:** `[#STATUS:checklist]`

- [x] Environment configured
- [x] Telegram bot connected
- [x] Database writable
- [x] Network reachable
- [x] Port 3001 stable
- [x] Steam detection active (3% threshold)
- [x] Monitoring endpoints active

---

## Version History

- **v1.0.0** - Initial system status documentation







