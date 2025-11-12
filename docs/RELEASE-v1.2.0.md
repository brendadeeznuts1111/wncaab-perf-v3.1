# System Health Monitoring Documentation

## Version 1.2.0 Enhancement Release

**Grepable Tag:** `[#RELEASE:v1.2.0]`  
**Version:** `1.2.0`  
**Release Date:** November 2025  
**Document Owner:** Engineering Team  
**Classification:** Technical Specification Update

---

## Executive Summary

This enhancement release standardizes our system health monitoring schema with correct Telegram platform terminology and implements comprehensive descriptive naming conventions. These changes eliminate ambiguity, improve maintainability, and ensure accurate representation of platform-specific architecture.

---

## Changes at a Glance

### 1. Platform Terminology Correction

| ❌ **Previous** | ✅ **Corrected** | **Clarification** |
|----------------|------------------|-------------------|
| `channel` | `supergroup` | Telegram uses **supergroups** for interactive group chats with topics. Channels are one-way broadcast media. |
| *Not specified* | `topic_id` | Topics are threaded conversations **within** a supergroup, not separate entities. |

---

### 2. Field Naming Standardization

| **Previous Name** | **Enhanced Name** | **Rationale** |
|-------------------|-------------------|---------------|
| `total_messages` | `total_messages_sent` | Explicitly indicates directionality (outbound) |
| `moves` | `total_movements_detected` | Specifies both action and context |
| `alerts` | `alerts_sent` | Clarifies outbound delivery status |
| `pinned` | `messages_pinned` | Uses precise verb form for clarity |
| `matches` | `active_matches_count` | Declares state and metric type |
| `steam_index_changes` | `steam_index_percentage_changes` | Specifies unit of measurement |
| `movement_patterns` | `movement_pattern_analysis` | Indicates analytical processing layer |

---

### 3. New Descriptive Metadata Fields

**Grepable Tag:** `[#RELEASE:v1.2.0:new-fields]`

```json
{
  "topic_name": "Full topic display name (e.g., '🚨 Critical Steam Moves')",
  "topic_id": "Unique topic identifier integer",
  "market_type": "Market classification string",
  "sport_name": "Full sport nomenclature (e.g., 'Women's NCAA Basketball')",
  "league_full_name": "Complete league designation",
  "change_type": "Classification enum [increase|decrease]",
  "percentage_change": "Numeric change value",
  "bot_id": "Bot identifier integer"
}
```

---

### 4. Hierarchical Structure Refactoring

**Grepable Tag:** `[#RELEASE:v1.2.0:structure]`

```diff
- telegram.channel
+ telegram.supergroup

- telegram.total_messages
+ telegram.message_statistics.total_messages_sent

- markets.*
+ market_statistics.*

- sports.*
+ sport_statistics.*

- leagues.*
+ league_statistics.*

- analysis.*
+ steam_index_analysis.*
```

---

### 5. Version Information

**Grepable Tag:** `[#RELEASE:v1.2.0:version]`

**Semantic Version Update:** `v1.1.0` → `v1.2.0`

**Update Classification:** Minor version increment  
**Breaking Changes:** Yes (field names modified)  
**Migration Required:** Yes - Update all dependent queries and dashboards

**Justification:**
- Corrects inaccurate platform terminology
- Improves self-documenting code principles
- Aligns with industry naming best practices

---

## Implementation Checklist

**Grepable Tag:** `[#RELEASE:v1.2.0:checklist]`

- [ ] Update database schema migrations
- [ ] Refactor API endpoints to use new field names
- [ ] Modify data pipeline transformations
- [ ] Update Grafana/Prometheus monitoring dashboards
- [ ] Revise documentation and API specifications
- [ ] Notify downstream consumers of breaking changes
- [ ] Deploy to staging environment for validation
- [ ] Schedule production deployment during maintenance window

---

## Benefits Achieved

**Grepable Tag:** `[#RELEASE:v1.2.0:benefits]`

1. **Accuracy:** Reflects true Telegram architecture
2. **Clarity:** Field names are self-describing
3. **Maintainability:** Reduced cognitive load for developers
4. **Scalability:** Structured hierarchy supports future expansion
5. **Consistency:** Standardized naming across entire system

---

## Migration Guide

**Grepable Tag:** `[#RELEASE:v1.2.0:migration]`

### API Endpoint Updates

**Before:**
```bash
curl http://localhost:3001/health | jq '.telegram.channel'
curl http://localhost:3001/health | jq '.telegram.total_messages'
curl http://localhost:3001/health | jq '.markets.total.moves'
```

**After:**
```bash
curl http://localhost:3001/health | jq '.telegram.supergroup'
curl http://localhost:3001/health | jq '.telegram.message_statistics.total_messages_sent'
curl http://localhost:3001/health | jq '.market_statistics.total_market.total_movements_detected'
```

### Field Mapping Reference

| Old Path | New Path |
|----------|----------|
| `telegram.channel.supergroup_id` | `telegram.supergroup.supergroup_id` |
| `telegram.total_messages` | `telegram.message_statistics.total_messages_sent` |
| `telegram.total_pinned` | `telegram.message_statistics.total_messages_pinned` |
| `markets.total.moves` | `market_statistics.total_market.total_movements_detected` |
| `sports.WNCAAB.matches` | `sport_statistics.WNCAAB.active_matches_count` |
| `leagues.WNCAAB.timezone` | `league_statistics.WNCAAB.league_timezone` |
| `analysis.steam_index_changes` | `steam_index_analysis.steam_index_percentage_changes` |

---

## Support & Questions

**Grepable Tag:** `[#RELEASE:v1.2.0:support]`

For migration assistance or clarification on any changes, please contact the Platform Engineering team via Slack `#platform-engineering` or email `platform-team@company.com`.

---

## Related Documentation

- [Production System Overview](./PRODUCTION-SYSTEM.md) - `[#PROD:system-overview]` v1.2.0
- [Telegram Alert System](./TELEGRAM.md) - `[#TELEGRAM:alert-system]` v2.0.0
- [System Status](../STATUS.md) - `[#STATUS:system]` v1.0.0

---

**Document Status:** ✅ **APPROVED FOR IMPLEMENTATION**  
**Last Reviewed:** November 11, 2025

---

## Version History

- **v1.2.0** - Enhanced with descriptive field names and correct Telegram terminology (supergroup vs channel)
- **v1.1.0** - Enhanced health section with comprehensive metrics
- **v1.0.0** - Initial production system overview

