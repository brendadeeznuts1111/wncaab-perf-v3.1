/**
 * Telegram Top Peer Rating - TES-NGWS-001.14
 * 
 * Utilities for managing Telegram top peer ratings (frequently used peers).
 * 
 * Reference: https://core.telegram.org/api/top-rating
 * Config Reference: https://core.telegram.org/constructor/config (rating_e_decay)
 * 
 * @module src/lib/telegram-top-peer-rating
 */

import { generateRgBlock, logHeadersForRg } from "./telegram-alert-system.ts";
import { getTelegramConfigManager, DEFAULT_CONFIG_VALUES } from "./telegram-config.ts";

/**
 * Top peer category types
 * 
 * Reference: https://core.telegram.org/type/TopPeerCategory
 * Reference: https://core.telegram.org/api/top-rating
 * 
 * These categories represent different types of frequently used peers
 * in Telegram's top peer rating system.
 */
export enum TopPeerCategory {
  /**
   * Most used bots
   * Constructor: topPeerCategoryBotsPM#ab661b5b
   */
  BOTS_PM = 'topPeerCategoryBotsPM',
  
  /**
   * Most used inline bots
   * Constructor: topPeerCategoryBotsInline#148677e2
   */
  BOTS_INLINE = 'topPeerCategoryBotsInline',
  
  /**
   * Users we've chatted most frequently with
   * Constructor: topPeerCategoryCorrespondents#637b7ed
   */
  CORRESPONDENTS = 'topPeerCategoryCorrespondents',
  
  /**
   * Often-opened groups and supergroups
   * Constructor: topPeerCategoryGroups#bd17a14a
   */
  GROUPS = 'topPeerCategoryGroups',
  
  /**
   * Most frequently visited channels
   * Constructor: topPeerCategoryChannels#161d9628
   */
  CHANNELS = 'topPeerCategoryChannels',
  
  /**
   * Most frequently called users
   * Constructor: topPeerCategoryPhoneCalls#1e76a78c
   */
  PHONE_CALLS = 'topPeerCategoryPhoneCalls',
  
  /**
   * Users to which the users often forwards messages to
   * Constructor: topPeerCategoryForwardUsers#a8406ca9
   */
  FORWARD_USERS = 'topPeerCategoryForwardUsers',
  
  /**
   * Chats to which the users often forwards messages to
   * Constructor: topPeerCategoryForwardChats#fbeec0f0
   */
  FORWARD_CHATS = 'topPeerCategoryForwardChats',
  
  /**
   * Most frequently used Main Mini Bot Apps
   * Constructor: topPeerCategoryBotsApp#fd9e7bec
   * Reference: https://core.telegram.org/api/bots/webapps#main-mini-apps
   */
  BOTS_APP = 'topPeerCategoryBotsApp',
}

/**
 * Top peer information
 */
export interface TopPeer {
  peerId: string;
  rating: number;
}

/**
 * Top peer category peers
 */
export interface TopPeerCategoryPeers {
  category: TopPeerCategory;
  count: number;
  peers: TopPeer[];
}

/**
 * Telegram Top Peer Rating Manager
 * 
 * Manages frequently used peers (users, bots, channels, groups) ratings.
 * 
 * ⚠️ NOTE: This requires MTProto API (not Bot API).
 * Bot API does not support top peer rating management.
 * 
 * Reference: https://core.telegram.org/api/top-rating
 */
export class TelegramTopPeerRating {
  private apiUrl: string;
  private botToken: string;
  
  constructor() {
    // Note: Bot API doesn't support top peer rating
    // This would require MTProto client library
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN || "";
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    if (!this.botToken) {
      throw new Error('TES-NGWS-001.14: TELEGRAM_BOT_TOKEN must be set');
    }
  }
  
  /**
   * Get top peers for specified categories
   * 
   * ⚠️ LIMITATION: Bot API does not support top peer rating.
   * This method provides documentation and structure for MTProto implementation.
   * 
   * Reference: https://core.telegram.org/api/top-rating
   * MTProto Method: contacts.getTopPeers
   * 
   * @param categories - Categories to fetch top peers for
   * @param offset - Offset for pagination
   * @param limit - Maximum number of peers to return
   * @returns Top peer category peers
   */
  async getTopPeers(
    categories: TopPeerCategory[],
    offset: number = 0,
    limit: number = 10
  ): Promise<TopPeerCategoryPeers[]> {
    const rgBlock = generateRgBlock({
      scope: "PEER_RATING",
      domain: "telegram.org",
      type: "QUERY",
      meta: "TOP_PEERS_REQUEST",
      version: "TELEGRAM-API-MTPROTO",
      ticket: "TES-NGWS-001.14",
      bunApi: "TelegramTopPeerRating",
      ref: `categories:${categories.join(",")}|offset:${offset}|limit:${limit}`
    });
    
    logHeadersForRg(rgBlock);
    
    // Bot API limitation: Cannot access top peer ratings
    console.warn('[TELEGRAM_TOP_PEER] ⚠️  Bot API does not support top peer rating');
    console.warn('[TELEGRAM_TOP_PEER] Use MTProto client library (gramjs/pyrogram/telethon)');
    console.warn('[TELEGRAM_TOP_PEER] Reference: https://core.telegram.org/api/top-rating');
    
    return [];
  }
  
  /**
   * Toggle top peer ratings on/off
   * 
   * ⚠️ LIMITATION: Bot API does not support this.
   * Requires MTProto client library.
   * 
   * Reference: https://core.telegram.org/api/top-rating
   * MTProto Method: contacts.toggleTopPeers
   * 
   * @param enabled - Enable or disable top peer ratings
   * @returns Success status
   */
  async toggleTopPeers(enabled: boolean): Promise<boolean> {
    const rgBlock = generateRgBlock({
      scope: "PEER_RATING",
      domain: "telegram.org",
      type: "CONFIG",
      meta: enabled ? "TOP_PEERS_ENABLED" : "TOP_PEERS_DISABLED",
      version: "TELEGRAM-API-MTPROTO",
      ticket: "TES-NGWS-001.14",
      bunApi: "TelegramTopPeerRating",
      ref: `enabled:${enabled}`
    });
    
    logHeadersForRg(rgBlock);
    
    console.warn('[TELEGRAM_TOP_PEER] ⚠️  Bot API does not support top peer rating toggle');
    console.warn('[TELEGRAM_TOP_PEER] Use MTProto client library for this functionality');
    
    return false;
  }
  
  /**
   * Reset top peer rating for a specific peer
   * 
   * ⚠️ LIMITATION: Bot API does not support this.
   * Requires MTProto client library.
   * 
   * Reference: https://core.telegram.org/api/top-rating
   * MTProto Method: contacts.resetTopPeerRating
   * 
   * @param category - Category to reset rating for
   * @param peerId - Peer ID to reset
   * @returns Success status
   */
  async resetPeerRating(category: TopPeerCategory, peerId: string): Promise<boolean> {
    const rgBlock = generateRgBlock({
      scope: "PEER_RATING",
      domain: "telegram.org",
      type: "ACTION",
      meta: "PEER_RATING_RESET",
      version: "TELEGRAM-API-MTPROTO",
      ticket: "TES-NGWS-001.14",
      bunApi: "TelegramTopPeerRating",
      ref: `category:${category}|peer_id:${peerId}`
    });
    
    logHeadersForRg(rgBlock);
    
    console.warn('[TELEGRAM_TOP_PEER] ⚠️  Bot API does not support peer rating reset');
    console.warn('[TELEGRAM_TOP_PEER] Use MTProto client library for this functionality');
    
    return false;
  }
  
  /**
   * Calculate peer rating update
   * 
   * Implements the rating calculation algorithm from Telegram API docs.
   * 
   * Reference: https://core.telegram.org/api/top-rating
   * Config: https://core.telegram.org/constructor/config (rating_e_decay)
   * 
   * Formula:
   * rating += e^((dateOpened - normalizeRate) / config.rating_e_decay)
   * 
   * @param currentRating - Current peer rating
   * @param dateOpened - Timestamp when peer was opened/used
   * @param normalizeRate - Timestamp when ratings were last normalized
   * @param ratingEDecay - Exponential decay constant (from config, defaults to 28 days)
   * @returns Updated rating
   */
  calculateRatingUpdate(
    currentRating: number,
    dateOpened: number,
    normalizeRate: number,
    ratingEDecay?: number
  ): number {
    // Use config manager to get rating_e_decay, or use default
    const configManager = getTelegramConfigManager();
    const decay = ratingEDecay ?? configManager.getRatingDecay() ?? DEFAULT_CONFIG_VALUES.rating_e_decay;
    
    const timeDelta = dateOpened - normalizeRate;
    const ratingDelta = Math.exp(timeDelta / decay);
    return currentRating + ratingDelta;
  }
}

/**
 * Get or create Telegram top peer rating manager instance
 */
export function getTelegramTopPeerRating(): TelegramTopPeerRating {
  return new TelegramTopPeerRating();
}

/**
 * Top peer rating implementation notes
 * 
 * For Bot API applications:
 * - Top peer rating is primarily a client-side feature
 * - Bots don't typically need this functionality
 * - If needed, implement via MTProto client library
 * 
 * For MTProto implementation:
 * 1. Use contacts.getTopPeers to fetch ratings
 * 2. Store ratings locally in database
 * 3. Update ratings when peers are used
 * 4. Use calculateRatingUpdate() helper for updates
 * 5. Sort peers by rating for display
 * 
 * Category Usage:
 * - BOTS_PM: Track most frequently messaged bots
 * - BOTS_INLINE: Track most used inline bots (@gif, @vid, etc.)
 * - CORRESPONDENTS: Track most frequently chatted users
 * - GROUPS: Track most opened groups/supergroups
 * - CHANNELS: Track most visited channels
 * - PHONE_CALLS: Track most called users
 * - FORWARD_USERS: Track users messages are forwarded to
 * - FORWARD_CHATS: Track chats messages are forwarded to
 * - BOTS_APP: Track most used Mini Bot Apps
 * 
 * Reference: https://core.telegram.org/type/TopPeerCategory
 */
export const TOP_PEER_RATING_NOTES = {
  botApiLimitation: 'Bot API does not support top peer rating management',
  mtprotoRequired: 'Use MTProto client library (gramjs/pyrogram/telethon)',
  reference: 'https://core.telegram.org/api/top-rating',
  categoryReference: 'https://core.telegram.org/type/TopPeerCategory',
  useCase: 'Primarily for client applications, not bot applications',
  categories: {
    BOTS_PM: 'Most used bots',
    BOTS_INLINE: 'Most used inline bots',
    CORRESPONDENTS: 'Users we\'ve chatted most frequently with',
    GROUPS: 'Often-opened groups and supergroups',
    CHANNELS: 'Most frequently visited channels',
    PHONE_CALLS: 'Most frequently called users',
    FORWARD_USERS: 'Users to which messages are often forwarded',
    FORWARD_CHATS: 'Chats to which messages are often forwarded',
    BOTS_APP: 'Most frequently used Main Mini Bot Apps'
  }
};

