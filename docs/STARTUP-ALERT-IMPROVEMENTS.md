# Startup Alert Improvements

**Grepable Tag:** `[#TELEGRAM:startup-alerts]`  
**Version:** `2.1.0`  
**Date:** 2025-01-27

---

## Problem

Previous startup alerts were generic and not actionable:
- Same message every time: "System Startup - Live odds monitoring system initialized successfully"
- No context about system health
- No indication of restart patterns
- No actionable information for operators

**Example of old alert:**
```
ℹ️ Performance Metrics
Severity: INFO
System Startup
Live odds monitoring system initialized successfully
Details: version: 2.0.0, mode: NORMAL, matches: 663637
```

---

## Solution

Enhanced startup alerts now provide:

### 1. **Restart Pattern Detection**
- Detects if system is restarting frequently (3+ restarts in last hour)
- Escalates to CRITICAL severity when restart pattern detected
- Provides specific action items for investigation

### 2. **System Health Metrics**
- Current state: Active pollers, match IDs, mode, memory usage, PID
- Recent activity: Movements detected, alerts sent, errors (last hour)
- System status: OPERATIONAL vs RESTART PATTERN

### 3. **Actionable Information**
- Clear action items based on detected issues
- Severity levels: INFO (normal), WARNING (recent restart/errors), CRITICAL (restart pattern)
- Quick links to health endpoints

### 4. **Better Formatting**
- Structured sections with emojis for quick scanning
- HTML formatting for better readability in Telegram
- Clear visual indicators (✅ normal, ⚠️ warning, 🚨 critical)

---

## New Alert Format

### Normal Startup (INFO)
```
✅ System Status: OPERATIONAL

📊 Current State:
• Active Pollers: 1
• Match IDs: 663637
• Mode: NORMAL
• Memory: 45.23 MB / 67.89 MB
• PID: 12345

📈 Recent Activity (Last Hour):
• Movements Detected: 12
• Alerts Sent: 8
• Errors: 0

🎯 Action Items:
• ✅ System startup normal - no action needed

🔗 Quick Links:
• Health: http://localhost:3001/health
• Metrics: http://localhost:3001/metrics
```

### Restart Pattern Detected (CRITICAL)
```
🚨 System Status: RESTART PATTERN

📊 Current State:
• Active Pollers: 1
• Match IDs: 663637
• Mode: NORMAL
• Memory: 45.23 MB / 67.89 MB
• PID: 12346

📈 Recent Activity (Last Hour):
• Movements Detected: 0
• Alerts Sent: 3
• Errors: 2
• Last Startup: 2 min ago

🎯 Action Items:
• ⚠️ RESTART PATTERN DETECTED: 3 restarts in last hour
• 🔍 ACTION REQUIRED: Check logs for crash/error patterns
• 📋 Investigate: Process manager, memory limits, error logs

🔗 Quick Links:
• Health: http://localhost:3001/health
• Metrics: http://localhost:3001/metrics
```

### High Error Rate (WARNING)
```
⚠️ System Status: OPERATIONAL

📊 Current State:
• Active Pollers: 1
• Match IDs: 663637
• Mode: NORMAL
• Memory: 45.23 MB / 67.89 MB
• PID: 12347

📈 Recent Activity (Last Hour):
• Movements Detected: 5
• Alerts Sent: 3
• Errors: 15

🎯 Action Items:
• ⚠️ HIGH ERROR RATE: 15 errors in last hour
• 🔍 ACTION: Review error logs and API connectivity

🔗 Quick Links:
• Health: http://localhost:3001/health
• Metrics: http://localhost:3001/metrics
```

---

## Implementation Details

### Function: `sendActionableStartupAlert()`

**Location:** `src/index-unified.ts` (lines 98-245)

**Features:**
1. **Restart Detection**: Queries `system_metrics` table for recent activity
2. **Activity Analysis**: Checks movements, alerts, and errors from last hour
3. **Severity Calculation**: 
   - CRITICAL: 3+ restarts in last hour
   - WARNING: High error rate (>10) or recent restart (<5 min)
   - INFO: Normal startup
4. **Action Items**: Dynamic based on detected issues

**Called After:**
- Database schema initialized
- Telegram alerts initialized
- Pollers started
- System operational check passed

---

## Benefits

1. **Actionable**: Clear action items based on detected issues
2. **Contextual**: Shows system state and recent activity
3. **Proactive**: Detects restart patterns before they become critical
4. **Informative**: Provides all relevant metrics in one alert
5. **Time-saving**: Quick links to health endpoints for deeper investigation

---

## Configuration

No configuration needed. The alert automatically:
- Detects restart patterns (threshold: 3 restarts/hour)
- Detects high error rates (threshold: >10 errors/hour)
- Detects recent restarts (threshold: <5 minutes ago)

---

## Related Documentation

- [TELEGRAM.md](./TELEGRAM.md) — `[#TELEGRAM:alert-system]` — Main Telegram documentation
- [TELEGRAM-FEATURES-STATUS.md](./TELEGRAM-FEATURES-STATUS.md) — `[#TELEGRAM:features-status]` — Feature status
- [PRODUCTION-RUNBOOK.md](./PRODUCTION-RUNBOOK.md) — `[#PROD:runbook]` — Production operations

---

**Last Updated:** 2025-01-27  
**Maintained By:** Production System Documentation

