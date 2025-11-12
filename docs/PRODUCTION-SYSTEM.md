# Production System: Goaloo901 → Telegram Live Odds Pipeline

**Grepable Tag:** `[#PROD:system-overview]`  
**Version:** `1.2.0`  
**Status:** ✅ Production Ready

---

## System Overview: Fully Integrated & Operational

**Grepable Tag:** `[#PROD:overview]`

```
Goaloo901 Live API → Bun Poller → SQLite DB → Telegram Topics → Pinned Alerts
     (2s polling)      (V2 alerts)   (deduped)     (Topics 1,2,3)   (Steam Index)
```

---

## System Architecture

**Grepable Tag:** `[#PROD:architecture]`

```
Goaloo901 Live API → Bun Poller → SQLite DB → Telegram Topics → Pinned Alerts
     (2s polling)      (V2 alerts)   (deduped)     (Topics 1,2,3)   (Steam Index)
```

---

## Core Components

**Grepable Tag:** `[#PROD:components]`

### 1. Data Ingestion Layer

**File:** `parsers/goaloo-live-parser.ts`

- `fetch()` with retry + diagnostics
- `parseFlashdata()` (JSON endpoint)
- `parseAjaxType19()` (provider data)
- Error handling with actionable suggestions

### 2. Movement Detection

**File:** `detectors/total-movement-detector.ts`

- 0.5pt line movement threshold
- Steam index calculation
- % change tracking (over/under)
- Second-precision timestamps

### 3. Storage & Audit

**File:** `SQLite (bun:sqlite native)`

- `raw_odds_log` (immutable)
- `total_movements` (hypertable)
- `system_metrics` (performance)
- Deduplication via `data_hash`

### 4. Telegram Alert System V2

**File:** `alerts/telegram-alert-system-v2.ts`

- Topic-based routing (Steam, Performance, Security)
- `sendTelegramAlert()` with cooldowns
- `pinTelegramMessage()` for critical moves
- Auto-pinning (≥1pt or steam index >2.0)

### 5. Port Management

**File:** `scripts/port-commands.ts`

- `check:port 3001` - Detects IPv4/IPv6 binding
- `start` - Starts server
- `stop` - Graceful shutdown
- `restart` - Stop + start
- `force-restart` - Kill -9 + start

### 6. Match Discovery

**File:** `utils/match-discovery.ts`

- `scanRange(start, end, concurrency)`
- Saves to `active-matches.json`
- Loads on startup for quick recovery
- Auto-detects valid match IDs

---

## Data Flow Example

**Grepable Tag:** `[#PROD:data-flow]`

**Timeline: Mavericks vs Bucks (Match 663637)**

```
T+0:00  → Game start (04:30 UTC)
        → Goaloo901 API: total line 231.5
        → Parser extracts: line=231.5, over=1.89, under=1.97
        → Movement detector: No change (initial)
        → SQLite: INSERT raw log

T+1:20  → Line moves: 231.5 → 230.5 (-1.0pt)
        → Detector: |movement| ≥ 0.5 → TRIGGER
        → Steam index: 1.85 (heavy steam)
        → SQLite: INSERT total_movements
        → Telegram: sendSteamAlert() → Topic 1
        → Alert message: "Total: 231.5→230.5 | Index: 1.85 📌"
        → Auto-pin: YES (|movement| ≥ 1.0pt)

T+1:45  → Another move: 230.5 → 229.5 (-1.0pt)
        → New steam index: 2.34 (extreme)
        → Telegram: sendSteamAlert() → Topic 1
        → Dashboard: WS broadcast to clients
```

---

## Deployment Commands

**Grepable Tag:** `[#PROD:deployment]`

```bash
# 1. Ensure clean start
bun run force-restart

# 2. Verify health
curl http://localhost:3001/health

# 3. Check Telegram for startup alert (Topic 2)

# 4. Monitor for first steam alert (Topic 1)
#    Expected within 5-15 min of game start

# 5. Watch logs
tail -f poller.log | grep "📊 Total"

# 6. Metrics
watch -n 30 'curl -s http://localhost:3001/metrics | jq'
```

---

## Monitoring Dashboard

**Grepable Tag:** `[#PROD:monitoring]`

### Real-time Metrics (per match)

```bash
# Total movements last hour
curl http://localhost:3001/metrics | jq '.recent_moves'

# Average steam index
curl http://localhost:3001/metrics | jq '.avg_steam'

# Max line movement
curl http://localhost:3001/metrics | jq '.max_line_move'
```

## System Health

**Grepable Tag:** `[#PROD:health]`

### Enhanced Health Check Response

```bash
curl http://localhost:3001/health | jq
```

**Full Response:**
```json
{
  "status": "operational",
  "timestamp": 1731336622000,
  "uptime": 1555.0,
  "active_pollers": 1,
  "match_ids": [663637],
  "recent_moves": 47,
  "discovery_mode": false,
  "env": {
    "poll_interval": 2000,
    "max_retries": "3",
    "telegram_configured": true
  },
  "telegram": {
    "supergroup": {
      "supergroup_id": "-1003482161671",
      "supergroup_name": "Smoke-China",
      "bot_username": "@bballasiasteam_bot",
      "bot_id": "8536290035"
    },
    "topics": {
      "steam_alerts": { 
        "topic_id": 5, 
        "topic_name": "🚨 Critical Steam Moves",
        "alerts_sent": 23, 
        "messages_pinned": 5 
      },
      "performance_metrics": { 
        "topic_id": 7, 
        "topic_name": "📈 Performance Metrics",
        "alerts_sent": 12, 
        "messages_pinned": 0 
      },
      "security_events": { 
        "topic_id": 9, 
        "topic_name": "🔐 Security Events",
        "alerts_sent": 2, 
        "messages_pinned": 0 
      }
    },
    "message_statistics": {
      "total_messages_sent": 37,
      "total_messages_pinned": 5,
      "total_alerts_sent": 37,
      "messages_per_topic": {
        "steam_alerts": 23,
        "performance_metrics": 12,
        "security_events": 2
      }
    }
  },
  "market_statistics": {
    "total_market": { 
      "total_movements_detected": 35, 
      "average_steam_index": 1.85,
      "market_type": "total"
    },
    "spread_market": { 
      "total_movements_detected": 8, 
      "average_steam_index": 1.42,
      "market_type": "spread"
    },
    "moneyline_market": { 
      "total_movements_detected": 4, 
      "average_steam_index": 0.95,
      "market_type": "moneyline"
    }
  },
  "sport_statistics": {
    "WNCAAB": { 
      "active_matches_count": 1, 
      "total_movements_detected": 47, 
      "average_steam_index": 1.65,
      "sport_name": "Women's NCAA Basketball"
    },
    "NBA": { 
      "active_matches_count": 0, 
      "total_movements_detected": 0, 
      "average_steam_index": null,
      "sport_name": "National Basketball Association"
    }
  },
  "league_statistics": {
    "WNCAAB": {
      "active_match_ids": [663637],
      "league_timezone": "America/New_York",
      "total_movements_detected": 47,
      "average_steam_index": 1.65,
      "league_full_name": "Women's NCAA Basketball"
    }
  },
  "steam_index_analysis": {
    "steam_index_percentage_changes": {
      "recent_changes_last_hour": [
        { 
          "timestamp": 1731336622000, 
          "steam_index_change": "+0.15", 
          "percentage_change": "+8.8%",
          "change_type": "increase"
        },
        { 
          "timestamp": 1731336500000, 
          "steam_index_change": "+0.23", 
          "percentage_change": "+14.2%",
          "change_type": "increase"
        }
      ],
      "average_percentage_change": "+11.5%",
      "maximum_percentage_change": "+14.2%",
      "minimum_percentage_change": "+8.8%"
    },
    "movement_pattern_analysis": {
      "rapid_changes_count": 12,
      "large_movements_count": 5,
      "moderate_movements_count": 30,
      "total_patterns_analyzed": 47
    }
  }
}
```

### Health Metrics Breakdown

**Grepable Tag:** `[#PROD:health-metrics]`

| Category | Field Path | Description |
|----------|------------|-------------|
| **Supergroup** | `telegram.supergroup.supergroup_id` | Telegram supergroup ID (not a channel) |
| **Supergroup** | `telegram.supergroup.supergroup_name` | Telegram supergroup name |
| **Chat** | `telegram.supergroup.bot_username` | Bot username in supergroup |
| **Message** | `telegram.message_statistics.total_messages_sent` | Total messages sent to supergroup |
| **Alerts** | `telegram.topics.*.alerts_sent` | Alerts sent per topic |
| **Pinned** | `telegram.message_statistics.total_messages_pinned` | Total messages pinned in supergroup |
| **Market** | `market_statistics.*.total_movements_detected` | Movements detected per market type |
| **Sport** | `sport_statistics.*.active_matches_count` | Active matches per sport |
| **League** | `league_statistics.*.active_match_ids` | Active match IDs per league |
| **Timezone** | `league_statistics.*.league_timezone` | Timezone for league games |
| **Index Change** | `steam_index_analysis.steam_index_percentage_changes` | Steam index percentage changes |
| **Analysis** | `steam_index_analysis.movement_pattern_analysis` | Movement pattern analysis breakdown |

### Real-time Metrics Query

**Grepable Tag:** `[#PROD:metrics-query]`

```bash
# Get full health with all details
curl http://localhost:3001/health | jq

# Extract specific fields
curl -s http://localhost:3001/health | jq '.telegram.message_statistics.total_messages_sent'
curl -s http://localhost:3001/health | jq '.telegram.message_statistics.total_messages_pinned'
curl -s http://localhost:3001/health | jq '.market_statistics.total_market.average_steam_index'
curl -s http://localhost:3001/health | jq '.sport_statistics.WNCAAB.total_movements_detected'
curl -s http://localhost:3001/health | jq '.steam_index_analysis.steam_index_percentage_changes.average_percentage_change'
```

### Telegram Supergroup Status

**Grepable Tag:** `[#PROD:telegram-status]`

**Note:** Telegram uses **supergroups** (not channels) for group chats with topics. Channels are one-way broadcast media.

```bash
# Check Telegram supergroup configuration
curl -s http://localhost:3001/health | jq '.telegram.supergroup'

# Check topic statistics (topics are threads within supergroup)
curl -s http://localhost:3001/health | jq '.telegram.topics'

# Check message statistics
curl -s http://localhost:3001/health | jq '.telegram.message_statistics'

# Check pinned messages
curl -s http://localhost:3001/health | jq '.telegram.message_statistics.total_messages_pinned'
```

### Market & Sport Analysis

**Grepable Tag:** `[#PROD:market-analysis]`

```bash
# Market breakdown by type
curl -s http://localhost:3001/health | jq '.market_statistics'

# Sport statistics
curl -s http://localhost:3001/health | jq '.sport_statistics'

# League details with timezone
curl -s http://localhost:3001/health | jq '.league_statistics'
```

### Steam Index Analysis

**Grepable Tag:** `[#PROD:steam-analysis]`

```bash
# Steam index percentage changes
curl -s http://localhost:3001/health | jq '.steam_index_analysis.steam_index_percentage_changes'

# Movement pattern analysis
curl -s http://localhost:3001/health | jq '.steam_index_analysis.movement_pattern_analysis'

# Average percentage change
curl -s http://localhost:3001/health | jq '.steam_index_analysis.steam_index_percentage_changes.average_percentage_change'
```

---

## Tag System

**Grepable Tag:** `[#PROD:tags]`

**Statistics:**
- 146 total tags
- 116 unique patterns
- 6 main categories

| Tag | File | Purpose |
|-----|------|---------|
| `[#TELEGRAM:alert-system]` | docs/TELEGRAM.md | Alert architecture |
| `[#COMMANDS:port-mgmt]` | COMMANDS.md | Port management |
| `[#STATUS:health]` | STATUS.md | Health checks |
| `[#PROD:system-overview]` | This file | System overview |

**Search any tag:**
```bash
rg '\[#TELEGRAM:alert-system\]' --type md
rg '\[#PROD:.*?\]' --type md
```

---

## Troubleshooting

**Grepable Tag:** `[#PROD:troubleshooting]`

| Issue | Command/File | Solution |
|-------|--------------|----------|
| Port 3001 in use | `bun run stop` | Kill process |
| API 502 error | Check `/health` | Run discovery mode |
| No Telegram alerts | Verify `.env` | Check bot permissions |
| High duplicates | Increase `POLL_INTERVAL_MS` | Reduce to 5000ms |
| Need new matches | `/discover?start=663600&end=663800` | Auto-find games |

---

## Production Verification

**Grepable Tag:** `[#PROD:verification]`

```
✅ Environment: .env configured with all variables
✅ Telegram: Bot connected (test IDs: 56,57,58)
✅ Database: SQLite writable, schema initialized
✅ Network: Goaloo901 API reachable (rate limits active)
✅ Port: 3001 stable (PID verified via lsof)
✅ Monitoring: Health, metrics, diagnostics endpoints ready
✅ Alerts: All topics tested (Steam/Performance/Security)
✅ Discovery: Match 663637 configured and active
✅ Binary: Can compile to single executable
✅ Tags: 146 tags, 116 unique patterns for docs
```

---

## Quick Reference

**Grepable Tag:** `[#PROD:quick-ref]`

### Start System
```bash
bun run start              # Start server
bun run restart:sentinel   # Zero-downtime restart
```

### Monitor
```bash
bash scripts/monitor-steam.sh           # Real-time steam monitoring
curl http://localhost:3001/health       # Health check
curl http://localhost:3001/metrics      # Metrics
```

### Telegram
```bash
bun run test:telegram      # Test alerts
bun run verify:telegram    # Verify config
```

### Port Management
```bash
bun run check:port 3001    # Check port status
bun run stop               # Stop server
bun run restart            # Restart gracefully
```

---

## System Status

**Grepable Tag:** `[#PROD:status]`

**Status:** 🟢 **PRODUCTION READY**

**All subsystems integrated and verified. Ready for live game monitoring.**

**Next Action:** Monitor Telegram Topic 1 for first steam alert on match 663637.

---

## Related Documentation

- [COMMANDS.md](../COMMANDS.md) - `[#COMMANDS:reference]`
- [PORT.md](../PORT.md) - `[#PORT:management]`
- [STATUS.md](../STATUS.md) - `[#STATUS:system]`
- [docs/TELEGRAM.md](./TELEGRAM.md) - `[#TELEGRAM:alert-system]`
- [docs/TES-NGWS-001.11b-DEPLOYMENT.md](./TES-NGWS-001.11b-DEPLOYMENT.md) - `[#TES-NGWS-001.11b:deployment]`
- [docs/RELEASE-v1.2.0.md](./RELEASE-v1.2.0.md) - `[#RELEASE:v1.2.0]` - Version 1.2.0 release notes

---

## Version History

- **v1.2.0** - Enhanced with descriptive field names and correct Telegram terminology (supergroup vs channel)
- **v1.1.0** - Enhanced health section with channel, chat, message, alerts, pinned, market, sport, timezone, league, index change, and analysis metrics
- **v1.0.0** - Initial production system overview

