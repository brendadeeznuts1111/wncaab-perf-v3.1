# Production-Ready Basketball Odds Pipeline: Final Implementation

## ✅ All Systems Verified & Operational

### Verification Results Summary

```
📊 Summary:
   ✅ Passed: 8/8
   ⚠️  Warnings: 0
   ❌ Failed: 0

🎉 All checks passed! System is production-ready.
```

---

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Goaloo901 API (live.goaloo901.com)        │
│                    flashdata/get, ajax/type=19               │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Bun-Native Poller (2s intervals)                          │
│  • fetch() with retry logic                                │
│  • parseFlashdata() + parseAjaxType19()                   │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Movement Detection Layer                                  │
│  • detectMovement() with 0.5pt threshold                   │
│  • steamIndex calculation                                  │
│  • Line/Odds % change tracking                            │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SQLite Database (odds-movements.db)                       │
│  • total_movements (movement tracking)                      │
│  • system_metrics (performance)                            │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Telegram Alert System V2                                  │
│  • sendTelegramAlert() → Topic 5 (Steam)                   │
│  • pinTelegramMessage() for critical moves                 │
│  • Cooldown management (1s/60s/0ms)                       │
└────────────────────┬──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Health Check Server (port 3001)                           │
│  • /health, /metrics, /diagnostics, /discover              │
└─────────────────────────────────────────────────────────────┘
```

---

## Telegram Topic Configuration (Verified ✅)

| Topic ID | Name | Purpose | Cooldown |
|----------|------|---------|----------|
| **5** | **Steam Alerts** | Line movements ≥0.5pt, steam index | 1s |
| **7** | **Performance Metrics** | Poller stats, latency, DB metrics | 60s |
| **9** | **Security Events** | Errors, auth failures, IP blocks | Instant |

**Test Results:** Messages sent successfully (IDs: 56, 57, 58)

**Verified Configuration:**
- Bot: `@bballasiasteam_bot` (Token: `***REDACTED***`)
- Supergroup: `Smoke-China` (ID: `-1003482161671`)
- Topics: 5 (Steam), 7 (Performance), 9 (Security)

---

## Quick Start Commands

```bash
# Create environment file (if not exists)
cat > .env << EOF
TELEGRAM_BOT_TOKEN="your_token_here"
TELEGRAM_CHAT_ID="-1003482161671"
GOALOO_MATCH_IDS="663637,663638"
POLL_INTERVAL_MS="2000"
PORT="3001"
EOF

# Verify production readiness
bun run verify:production

# Start unified pipeline (Goaloo901 polling)
bun run start:unified

# Start with specific matches
GOALOO_MATCH_IDS="663637,663638" bun run start:unified

# Start with discovery mode
bun run start:discovery

# Start NowGoal WebSocket integration (alternative system)
bun run src/index.ts

# Run health check
curl http://localhost:3001/health

# Discover matches in range
curl http://localhost:3001/discover?start=663600&end=663800

# Compile to binary (production)
bun build src/index-unified.ts --outfile bball-poller --compile
./bball-poller
```

**Note:** The system uses `fast-xml-parser` (already included), not `xml2js`. No additional XML parsing dependencies needed.

---

## What Happens When Running

```bash
$ bun run start:unified

🚀 Starting Unified Live Odds Pipeline...

📊 Configuration:
   - Bot Token: ***REDACTED*** (use Bun.secrets or .env)
   - Supergroup ID: -1003482161671
   - Discovery Mode: disabled
   - Match IDs: 663637
   - Polling interval: 2000ms

[TELEGRAM_CONFIG] Supergroup: -1003482161671
🎯 Starting Total Market Poller for match 663637
✅ Started poller for match 663637

🏥 Health check: http://localhost:3001/health
🔍 Discovery: http://localhost:3001/discover?start=663600&end=663800
📊 Metrics: http://localhost:3001/metrics
📊 Diagnostics: http://localhost:3001/diagnostics

✅ All systems operational. Monitoring 1 match(es).

Poll 1/3 for match 663637...
[Goaloo] Match 663637: Success

Poll 2/3 for match 663637...
[Goaloo] Match 663637: Success

[11-11 14:30:22] 📊 Total: 231.5→230.5 | Index: 1.85 📌
[Telegram] ✉️ Sent STEAM_ALERTS alert to topic 5
[Telegram] 📌 Pinned critical steam alert for match 663637

Poll 3/3 for match 663637...
[Goaloo] Match 663637: Success
```

**Telegram Output (Topic 5 - Steam Alerts):**

```
🚨 TOTAL LINE STEAM
Severity: WARNING
Time: 2025-11-11T14:30:22Z

Total Line Steam: 231.5 → 230.5

🚨 TOTAL LINE STEAM
Match ID: 663637
Time: 2025-11-11T14:30:22.000Z
Line Movement: 231.5 → 230.5 (-1.0)
Over Odds: 1.95 (-5.1%) → 1.85
Under Odds: 1.91 (+5.5%) → 2.01
Steam Index: 1.85
Score: 0-0

Details:
• matchId: 663637
• lineMovement: -1
• steamIndex: 1.85
• timestamp: 1731336622000

View Dashboard
```

**Note:** Critical alerts (≥1.0pt movement or steam index >2.0) are automatically pinned to the top of the topic.

---

## Monitoring Endpoints

### Health Check

```bash
curl http://localhost:3001/health

{
  "status": "operational",
  "timestamp": 1731336622000,
  "uptime": 3600.5,
  "active_pollers": 2,
  "match_ids": [663637, 663638],
  "recent_moves": 47,
  "discovery_mode": false,
  "env": {
    "poll_interval": 2000,
    "max_retries": "3",
    "telegram_configured": true
  }
}
```

### Metrics

```bash
curl http://localhost:3001/metrics

{
  "total_moves": 127,
  "avg_steam": 1.23,
  "max_line_move": 2.0,
  "unique_matches": 3,
  "poller": {
    "polls": 1800,
    "inserts": 127,
    "errors": 3,
    "alerts": 45,
    "pinned": 12
  },
  "active_pollers": 2,
  "timestamp": 1731336622000
}
```

### Diagnostics

```bash
curl http://localhost:3001/diagnostics

{
  "memory": {
    "rss": 52428800,
    "heapTotal": 25165824,
    "heapUsed": 12345678
  },
  "uptime": 3600.5,
  "active_pollers": 2,
  "match_ids": [663637, 663638],
  "discovery_mode": false,
  "timestamp": 1731336622000
}
```

---

## Steaming Runbook: What to Look For

### Normal Activity

- Line moves 0.5pt every 15-30 minutes
- Steam index 0.5-1.5
- Over/under odds adjust gradually

### Heavy Steam

- Line moves ≥1.0pt in <5 min
- Steam index >2.0
- **Action:** Pinned alert triggers, investigate sharp action

### Pre-Game Steam Pattern

```
231.5 → 231.0 → 230.5 → 229.5 (1 hour before tip)
^ Each move accompanied by odds adjustment
^ Indicates sharp money on the under
```

### Live Game Steam

`⏱️ Real-time line movement tied to score updates`

---

## Troubleshooting Guide

### Port Already in Use

```
[Telegram] ❌ Failed to start server. Is port 3001 in use?
```

**Action:** 
```bash
# Kill process using port 3001
kill $(lsof -ti:3001)

# Or use a different port
PORT=3002 bun run start:unified
```

See [TROUBLESHOOTING-PORT.md](../TROUBLESHOOTING-PORT.md) for detailed solutions.

### Goaloo901 API Returns 502

```
[Goaloo] Match 663637: Goaloo901 API gateway error. Upstream unavailable.
[Goaloo] Suggestions:
  • Match ID may have expired
  • Use match discovery tool
  • Check goaloo901.com status
```

**Action:** Run discovery mode to find active matches

### No Telegram Alerts Sending

```
[Telegram] ❌ Failed to send alert: Forbidden: bot was blocked
```

**Action:** Add bot to supergroup, ensure it has topic permissions

### Database Write Errors

```
[Database] ❌ SQLite error: database is locked
```

**Action:** Ensure single process, check file permissions

### High Duplicate Rate

```
[Poller] Duplicates: 45/50 polls (90%)
```

**Action:** Increase poll interval to 5s, check if match is live

---

## Performance Tuning

```bash
# High-frequency trading (risky)
POLL_INTERVAL_MS="1000"  # 1s polling (respect rate limits!)
MAX_RETRIES="1"
ALERT_COOLDOWN_STEAM="500"

# Conservative mode
POLL_INTERVAL_MS="5000"  # 5s polling
MAX_RETRIES="5"
ALERT_COOLDOWN_STEAM="2000"
```

---

## AI Immunity System

The system includes AI immunity protection against training data extraction:

**Index Files:**
- `.ai-immunity.index` - Grep-compatible index for fast queries
- `.ai-immunity.semantic` - Semantic embeddings for similarity search
- `.ai-immunity.enriched.json` - Full metadata with Grok embeddings

**Current Status:**
- ✅ `bun-ai.toml` indexed with score 0.97 (high confidence)
- ✅ Tag: `ai-hoisted-ai-disable`
- ✅ 512-dimensional Grok embedding generated

**Verification:**
```bash
# Check AI immunity index health
bun --no-addons run scripts/index-ai-immunity.ts --heal --verify

# Query high-confidence tags
rg -f .ai-immunity.index "score-0.9"

# Rebuild if needed
bun --no-addons run scripts/index-ai-immunity.ts --rebuild
```

See [AI Immunity Production Runbook](./guides/AI-IMMUNITY-PRODUCTION-RUNBOOK.md) for detailed documentation.

---

## Production Deployment Checklist

- [x] **Environment**: `.env` configured with all vars ✅
- [x] **Telegram**: Bot added to supergroup (verified IDs: 56,57,58) ✅
- [x] **Database**: Write permissions verified ✅
- [x] **Network**: Goaloo901 API reachable ✅
- [x] **Rate Limits**: 2s interval configured ✅
- [x] **Monitoring**: Health endpoint ready ✅
- [x] **Alerts**: All channels tested ✅
- [x] **Discovery**: Match ID `663637` configured ✅
- [x] **Error Handling**: Enhanced diagnostics active ✅
- [x] **Binary**: Can compile to single executable ✅
- [x] **AI Immunity**: Index verified and operational ✅

---

## System Status: ✅ PRODUCTION READY

**Next Steps:**

1. Run `bun run start:unified` (or `bun run start:discovery` for auto-match discovery)
2. Monitor Telegram Topic 5 for steam alerts
3. Check `/health` endpoint periodically
4. Use `/discover` to find new matches
5. Review `/metrics` for performance analysis

**All components verified and operational. Ready for live game monitoring.**

---

## Important Notes

### Entry Points
- **`bun run start:unified`** - Goaloo901 polling pipeline (recommended)
- **`bun run src/index.ts`** - NowGoal WebSocket integration (alternative system)

### Topic IDs (Verified)
- **Topic 5**: Steam Alerts (not Topic 1)
- **Topic 7**: Performance Metrics (not Topic 2)
- **Topic 9**: Security Events (not Topic 3)

### Dependencies
- Uses `fast-xml-parser` (already included), not `xml2js`
- No additional XML parsing dependencies needed

### Database Schema
- `total_movements` - Line movement tracking
- `system_metrics` - Performance metrics
- Note: `raw_odds_log` table not currently implemented (can be added if needed)
