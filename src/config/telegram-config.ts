/**
 * Unified Telegram Configuration - TES-NGWS-001.12
 * 
 * Centralized configuration for Telegram alert channels with topic-based routing.
 * 
 * @module src/config/telegram-config
 */

export interface TelegramChannel {
  name: string;
  topicId: number;
  description: string;
  cooldownMs?: number; // Minimum time between alerts (ms)
}

/**
 * Alert severity levels
 */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Alert types mapped to Telegram channels
 */
export type AlertType = 'STEAM_ALERTS' | 'PERFORMANCE' | 'SECURITY';

/**
 * Telegram channel configuration
 * 
 * VERIFIED CONFIGURATION (2025-11-10):
 * - Supergroup: Smoke-China (-1003482161671)
 * - Bot: @bballasiasteam_bot
 * - Topic IDs: 5 (steam/errors/heartbeat), 7 (performance), 9 (security)
 */
export const TELEGRAM_CHANNELS: Record<AlertType, TelegramChannel> = {
  STEAM_ALERTS: {
    name: 'Steam Alerts',
    topicId: parseInt(process.env.TELEGRAM_TOPIC_STEAM || '5'),
    description: 'Line movements, odds changes, market steam detection',
    cooldownMs: 1000, // 1 second cooldown to prevent spam
  },
  PERFORMANCE: {
    name: 'Performance Metrics',
    topicId: parseInt(process.env.TELEGRAM_TOPIC_PERFORMANCE || '7'),
    description: 'Poller performance, tick rates, latency, DB stats',
    cooldownMs: 60000, // 1 minute cooldown
  },
  SECURITY: {
    name: 'Security Events',
    topicId: parseInt(process.env.TELEGRAM_TOPIC_SECURITY || '9'),
    description: 'Authentication failures, IP blocks, rate limits',
    cooldownMs: 0, // No cooldown for critical security events
  },
} as const;

/**
 * Telegram alert payload interface
 */
export interface TelegramAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Get channel configuration by alert type
 * 
 * @param type - Alert type
 * @returns Telegram channel configuration
 */
export function getChannel(type: AlertType): TelegramChannel {
  return TELEGRAM_CHANNELS[type];
}

/**
 * Get all channel configurations
 * 
 * @returns All Telegram channel configurations
 */
export function getAllChannels(): Record<AlertType, TelegramChannel> {
  return TELEGRAM_CHANNELS;
}

