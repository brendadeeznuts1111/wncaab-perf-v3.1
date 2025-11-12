# Documentation Index

**Grepable Tag:** `[#DOCS:index]`  
**Version:** `1.1.0`  
**Last Updated:** 2025-01-27

---

## Core Documentation

**Grepable Tag:** `[#DOCS:core]`

| Document | Tag | Description |
|----------|-----|-------------|
| [COMMANDS.md](./COMMANDS.md) | `[#COMMANDS:reference]` | Command reference |
| [PORT.md](./PORT.md) | `[#PORT:management]` | Port management |
| [STATUS.md](./STATUS.md) | `[#STATUS:system]` | System status |
| [docs/TELEGRAM.md](./TELEGRAM.md) | `[#TELEGRAM:alert-system]` | Telegram alerts |
| [docs/TELEGRAM-CONFIG-TEMPLATE.md](./TELEGRAM-CONFIG-TEMPLATE.md) | `[#TELEGRAM:config-template]` | Telegram supergroup configuration template |
| [docs/STAGING-SETUP.md](./STAGING-SETUP.md) | `[#TELEGRAM:staging-setup]` | Staging environment setup guide |
| [docs/PRODUCTION-SYSTEM.md](./PRODUCTION-SYSTEM.md) | `[#PROD:system-overview]` | Complete system overview |

---

## Technical Documentation

**Grepable Tag:** `[#DOCS:technical]`

### Steam Detection
- [TES-NGWS-001.11b: Steam Tuning](./docs/TES-NGWS-001.11b-STEAM-TUNING.md) - `[#TES-NGWS-001.11b:steam-tuning]`
- [TES-NGWS-001.11b: Deployment](./docs/TES-NGWS-001.11b-DEPLOYMENT.md) - `[#TES-NGWS-001.11b:deployment]`
- [Steam Detection Monitoring](./docs/STEAM-DETECTION-MONITORING.md) - `[#STEAM:monitoring]`

### Production
- [Production Runbook](./docs/PRODUCTION-RUNBOOK.md) - `[#PROD:runbook]`
- [Production Readiness](./docs/PRODUCTION-READINESS.md) - `[#PROD:readiness]`
- [Release v1.2.0](./docs/RELEASE-v1.2.0.md) - `[#RELEASE:v1.2.0]` - System health monitoring enhancement

### Monitoring & Status
- [Enhanced Status System](./docs/ENHANCED-STATUS-SYSTEM.md) - `[#STATUS:enhanced]` - Comprehensive system status with vector format
- [Bun Native Metrics Integration](./docs/BUN-NATIVE-METRICS-INTEGRATION.md) - `[#METRICS:native]` - Zero-cost observability using Bun's native metrics
- [TES Endpoint Discovery](./docs/TES-ENDPOINT-DISCOVERY.md) - `[#ENDPOINT:discovery]` - Automated endpoint metadata management
- [TES Performance Monitoring](./docs/TES-PERFORMANCE-MONITORING.md) - `[#MON:performance]` - Performance metrics and monitoring

### Protocol & Implementation
- [NowGoal Protocol](./docs/NOWGOAL-PROTOCOL-REFERENCE.md) - `[#PROTOCOL:nowgoal]`
- [Binary Protocol Decoding](./docs/BINARY-PROTOCOL-DECODING.md) - `[#PROTOCOL:binary]`

### Telegram Enhancements
- [Enhanced Alerts Implementation](./docs/ENHANCED-ALERTS-IMPLEMENTATION.md) - `[#TELEGRAM:enhanced-alerts]`
- [Startup Alert Improvements](./docs/STARTUP-ALERT-IMPROVEMENTS.md) - `[#TELEGRAM:startup-alerts]`
- [Telegram Features Status](./docs/TELEGRAM-FEATURES-STATUS.md) - `[#TELEGRAM:features-status]`

---

## Issues Tracking

**Grepable Tag:** `[#DOCS:issues]`

| Issue ID | Title | Status | Tags |
|----------|-------|--------|------|
| [TELEGRAM-ALERTS-ENHANCEMENT-001](./issues/TELEGRAM-ALERTS-ENHANCEMENT-001.md) | Enhanced Total Line Steam Alerts | ✅ Complete | `[DOMAIN:defensive-bookmaking]` `[SCOPE:lucksport-ah]` `[META:winodds-enforcement]` `[SEMANTIC:veto-scale]` `[TYPE:holding-pattern]` `[#REF]{BUN-API}` |

**See:** [Issues Index](./issues/README.md) - `[#ISSUES:index]` for complete issue tracking

---

## Quick Reference

**Grepable Tag:** `[#DOCS:quick-ref]`

```bash
# Find all grepable tags
rg '\[#.*?\]' --type md

# Find specific tag
rg '\[#TELEGRAM:.*?\]' --type md

# Find version info
rg 'Version.*v\d+\.\d+\.\d+' --type md
```

---

## Version History

- **v1.1.0** - Added Issues Tracking section, Telegram Enhancements section
- **v1.0.0** - Initial documentation index

