/**
 * Telegram Channel Configuration - TES-NGWS-001.12
 * 
 * Channel definitions with cooldowns and routing for live odds pipeline.
 * 
 * @module src/config/telegram-channels
 */

export interface TelegramChannel {
  name: string;
  topicId: number;
  description: string;
  cooldownMs?: number; // Min time between alerts
}

/**
 * Alert severity levels
 */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Alert types
 */
export type AlertType = 'STEAM' | 'PERFORMANCE' | 'SECURITY';

/**
 * Telegram channel configuration
 * 
 * VERIFIED CONFIGURATION (2025-11-10):
 * - Supergroup: Smoke-China (-1003482161671)
 * - Bot: @bballasiasteam_bot
 * - Topic IDs: 5 (steam/errors/heartbeat), 7 (performance), 9 (security)
 */
export const TELEGRAM_CHANNELS: Record<AlertType, TelegramChannel> = {
  STEAM: {
    name: 'Steam Alerts',
    topicId: parseInt(process.env.TELEGRAM_TOPIC_STEAM || '5'),
    description: 'Line movements, odds changes, market steam detection (≥0.5 point line moves)',
    cooldownMs: 1000, // Don't flood with alerts
  },
  PERFORMANCE: {
    name: 'Performance Metrics',
    topicId: parseInt(process.env.TELEGRAM_TOPIC_PERFORMANCE || '7'),
    description: 'Poller performance, tick rates, latency, DB stats',
    cooldownMs: 60000, // Once per minute max
  },
  SECURITY: {
    name: 'Security Events',
    topicId: parseInt(process.env.TELEGRAM_TOPIC_SECURITY || '9'),
    description: 'Authentication failures, IP blocks, rate limits, errors',
    cooldownMs: 0, // Instant for critical
  },
} as const;

/**
 * Get channel by alert type
 */
export function getChannel(type: AlertType): TelegramChannel {
  return TELEGRAM_CHANNELS[type];
}

/**
 * Get all channels
 */
export function getAllChannels(): Record<AlertType, TelegramChannel> {
  return TELEGRAM_CHANNELS;
}

