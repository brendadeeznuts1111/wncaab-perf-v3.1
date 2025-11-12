/**
 * Telegram Channel Configuration - TES-NGWS-001.12
 * 
 * Configuration for Telegram supergroup and topic mappings.
 * 
 * Supports staging and production environments via environment variables:
 * - Production: TELEGRAM_SUPERGROUP_ID="-1003482161671" (Smoke-China)
 * - Staging: TELEGRAM_SUPERGROUP_ID="-1001234567890" (your staging supergroup)
 * 
 * @module src/config/telegram-channels
 */

/**
 * Telegram channel configuration
 * 
 * VERIFIED CONFIGURATION (2025-11-10):
 * - Production Supergroup: Smoke-China (-1003482161671)
 * - Bot: @bballasiasteam_bot
 * - Production Topic IDs: 5 (steam/errors/heartbeat), 7 (performance), 9 (security)
 * 
 * STAGING CONFIGURATION:
 * - Use separate staging supergroup ID via TELEGRAM_SUPERGROUP_ID environment variable
 * - Staging topic IDs typically start at 1, 2, 3 (verify with find-telegram-topics.ts)
 * - See docs/STAGING-SETUP.md for staging setup guide
 */
export const TELEGRAM_CHANNELS = {
  /**
   * Supergroup ID for all TES alerts (negative number for supergroups)
   * Production: "-1003482161671" (Smoke-China)
   * Staging: Set via TELEGRAM_SUPERGROUP_ID environment variable
   */
  sentinelAlerts: process.env.TELEGRAM_SUPERGROUP_ID || "",
  
  /**
   * Topic IDs (verified via testing on 2025-11-10)
   * Note: Telegram assigns topic IDs non-sequentially
   * Actual IDs in supergroup: 5 (steam/errors/heartbeat), 7 (performance), 9 (security)
   */
  topics: {
    /**
     * Topic ID 5: 🚨 Critical Steam Moves
     * Verified: Working (Message IDs: 46, 51)
     */
    steam: process.env.TELEGRAM_TOPIC_STEAM || "5",
    
    /**
     * Topic ID 7: 📈 System Performance Metrics
     * Verified: Working (Message ID: 47)
     */
    performance: process.env.TELEGRAM_TOPIC_PERFORMANCE || "7",
    
    /**
     * Topic ID 9: 🔐 Security Events
     * Verified: Working (Message ID: 48)
     */
    security: process.env.TELEGRAM_TOPIC_SECURITY || "9",
    
    /**
     * Topic ID 5: 🐛 Errors & Warnings
     * Verified: Working (Message ID: 49)
     * Note: Shares topic with steam alerts
     */
    errors: process.env.TELEGRAM_TOPIC_ERRORS || "5",
    
    /**
     * Topic ID 5: 💓 System Heartbeat
     * Verified: Working (Message ID: 50)
     * Note: Shares topic with steam alerts
     */
    heartbeat: process.env.TELEGRAM_TOPIC_HEARTBEAT || "5",
  },
  
  /**
   * Rate limiting configuration
   * Telegram allows 30 msg/sec per supergroup, we use 10 for safety margin
   */
  rateLimit: {
    maxPerSecond: 10,
    burstSize: 30,
  },
} as const;

/**
 * Log configuration with rg metadata
 */
if (import.meta.main) {
  const { generateRgBlock, logHeadersForRg } = await import("../lib/telegram-alert-system.ts");
  
  const rgBlock = generateRgBlock({
    scope: "CONFIG",
    domain: "telegram.org",
    type: "INIT",
    meta: "TELEGRAM_CHANNELS_CONFIG",
    version: "TELEGRAM-API-V1",
    ticket: "TES-NGWS-001.12",
    bunApi: "TelegramChannels",
    ref: `supergroup:${TELEGRAM_CHANNELS.sentinelAlerts}|topics:${Object.values(TELEGRAM_CHANNELS.topics).join(",")}`
  });
  
  logHeadersForRg(rgBlock);
  console.log("✅ Telegram channels configuration loaded");
  console.log(JSON.stringify(TELEGRAM_CHANNELS, null, 2));
}

