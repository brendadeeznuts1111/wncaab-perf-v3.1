# Telegram Features Status

**Grepable Tag:** `[#TELEGRAM:features-status]`  
**Version:** `1.0.0`  
**Date:** 2025-01-27

---

## Overview

This document provides a comprehensive status of Telegram features: what's configured, what's integrated, and what's available but not yet integrated.

---

## ✅ Configured and Active

### 1. Message Pinning

**Status:** ✅ **Integrated and actively used**

**Implementation:**
- `pinTelegramMessage()` — Used in `telegram-alert-system-v2.ts` and `total-market-poller.ts`
- `unpinTelegramMessage()` — Implemented and available
- `unpinAllTelegramMessages()` — Implemented and available

**Usage:**
- Auto-pins critical steam alerts (≥1 point movement or steam index > 2.0)
- Pinning occurs automatically in `TotalMarketPoller.sendSteamAlertWithAutoPin()`
- Message IDs are tracked in `TelegramAlertSystemV2.pinnedMessages` Map

**Files:**
- `src/lib/telegram-alert-system-v2.ts` (lines 322-489)
- `src/pollers/total-market-poller.ts` (lines 184-237)

**Test Script:**
- `scripts/test-telegram-pin.ts`

---

### 2. Basic Telegram Alerts

**Status:** ✅ **Fully integrated and active in production**

**Implementation:**
- `TelegramAlertSystemV2` — Active in production
- Channel routing — Configured via `src/config/telegram-config.ts`
- Cooldowns — Implemented per alert type
- HTML formatting — Active
- Secure token management — Uses Bun.secrets with env var fallback

**Alert Types:**
- `STEAM_ALERTS` — Topic ID 5, 1s cooldown
- `PERFORMANCE` — Topic ID 7, 60s cooldown
- `SECURITY` — Topic ID 9, no cooldown

**Files:**
- `src/lib/telegram-alert-system-v2.ts`
- `src/config/telegram-config.ts`
- `src/index.ts` (integration)
- `src/index-unified.ts` (production entry point)

---

## ⚠️ Created but Not Integrated

### 1. Channel Manager (`telegram-channel-manager.ts`)

**Status:** ⚠️ **Created but not imported/used anywhere**

**Location:** `src/lib/telegram-channel-manager.ts`

**Limitation:**
- Bot API does not support channel creation
- Requires MTProto client library (gramjs, pyrogram, telethon)
- Channels must be created manually via Telegram client

**Features:**
- `createChannel()` — Stub implementation (returns error)
- `getChannelInfo()` — Works via Bot API `getChat`
- `createForumTopics()` — Stub (Bot API limitation)

**Usage Notes:**
- Provides documentation structure for future MTProto integration
- Includes manual channel creation guide (`CHANNEL_CREATION_GUIDE`)
- `getChannelInfo()` can be used if needed

**Recommendation:**
- Keep as reference/documentation for MTProto migration
- Can integrate `getChannelInfo()` if channel info retrieval is needed
- Document in migration guide when moving to MTProto

---

### 2. Top Peer Rating (`telegram-top-peer-rating.ts`)

**Status:** ⚠️ **Created but not imported/used**

**Location:** `src/lib/telegram-top-peer-rating.ts`

**Limitation:**
- Bot API does not support top peer rating management
- Requires MTProto API (`contacts.getTopPeers`, `contacts.toggleTopPeers`)
- Primarily a client-side feature, not typically needed for bots

**Features:**
- `getTopPeers()` — Stub (requires MTProto)
- `toggleTopPeers()` — Stub (requires MTProto)
- `resetPeerRating()` — Stub (requires MTProto)
- `calculateRatingUpdate()` — Helper function (works standalone)

**Dependencies:**
- Imports `telegram-config.ts` for rating decay constants

**Recommendation:**
- Keep as reference for MTProto migration
- `calculateRatingUpdate()` can be used standalone if implementing custom peer tracking
- Document that this is primarily for client applications, not bot applications

---

### 3. Config Manager (`telegram-config.ts` in `src/lib/`)

**Status:** ⚠️ **Created but only used internally by top-peer-rating**

**Location:** `src/lib/telegram-config.ts`

**Note:** This is different from `src/config/telegram-config.ts` (which IS used)

**Limitation:**
- Bot API does not expose Telegram Config object
- Requires MTProto API (`help.getConfig`)
- Config is primarily used by MTProto clients

**Features:**
- `TelegramConfigManager` — Stub implementation
- `getConfig()` — Returns null (Bot API limitation)
- Helper methods with defaults: `getRatingDecay()`, `getEditTimeLimit()`, etc.

**Usage:**
- Only imported by `telegram-top-peer-rating.ts`
- Helper methods provide sensible defaults when config unavailable

**Recommendation:**
- Keep as reference for MTProto migration
- Helper methods with defaults are useful even without MTProto
- Consider extracting defaults to shared constants if needed elsewhere

---

## Summary Table

| Feature | Status | Integration | Bot API Support | MTProto Required |
|---------|--------|-------------|-----------------|------------------|
| **Message Pinning** | ✅ Active | Integrated | ✅ Yes | ❌ No |
| **Basic Alerts** | ✅ Active | Integrated | ✅ Yes | ❌ No |
| **Channel Manager** | ⚠️ Created | Not integrated | ⚠️ Partial | ✅ Yes (full) |
| **Top Peer Rating** | ⚠️ Created | Not integrated | ❌ No | ✅ Yes |
| **Config Manager** | ⚠️ Created | Internal only | ❌ No | ✅ Yes |

---

## Recommendations

### For Current Bot API Implementation

1. **Keep pinning and alerts** — These are working well
2. **Document MTProto modules** — Add notes about future MTProto migration
3. **Optional integration** — Consider integrating `getChannelInfo()` from Channel Manager if needed

### For MTProto Migration

1. **Channel Manager** — Ready for MTProto implementation
2. **Top Peer Rating** — Structure ready, but evaluate if needed for bot use case
3. **Config Manager** — Will be essential for MTProto client

### Documentation Actions

1. ✅ Document Bot API limitations in module files (already done)
2. ✅ Add migration notes for MTProto (already done)
3. ⚠️ Consider creating `MIGRATION-MTPROTO.md` guide
4. ⚠️ Add usage examples for `getChannelInfo()` if integrating

---

## Related Documentation

- [TELEGRAM.md](./TELEGRAM.md) — `[#TELEGRAM:alert-system]` — Main Telegram documentation
- [TELEGRAM-CONFIG-TEMPLATE.md](./TELEGRAM-CONFIG-TEMPLATE.md) — `[#TELEGRAM:config-template]` — Configuration template
- [PRODUCTION-RUNBOOK.md](./PRODUCTION-RUNBOOK.md) — `[#PROD:runbook]` — Production operations

---

## Verification Commands

```bash
# Check pinning integration
rg "pinTelegramMessage" --type ts

# Check channel manager usage
rg "telegram-channel-manager" --type ts

# Check top peer rating usage
rg "telegram-top-peer-rating" --type ts

# Check config manager usage
rg "from.*telegram-config" --type ts
```

---

**Last Updated:** 2025-01-27  
**Maintained By:** Production System Documentation

