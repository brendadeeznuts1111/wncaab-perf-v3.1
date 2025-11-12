/**
 * Telegram Channel Manager - TES-NGWS-001.13
 * 
 * Utilities for programmatically creating and managing Telegram channels/supergroups.
 * 
 * Reference: https://core.telegram.org/method/channels.createChannel
 * 
 * @module src/lib/telegram-channel-manager
 */

import { generateRgBlock, logHeadersForRg } from "./telegram-alert-system.ts";

/**
 * Channel creation options
 * 
 * Reference: https://core.telegram.org/method/channels.createChannel
 */
export interface CreateChannelOptions {
  /**
   * Channel title
   */
  title: string;
  
  /**
   * Channel description/about text
   */
  about?: string;
  
  /**
   * Create as broadcast channel (one-way messaging)
   */
  broadcast?: boolean;
  
  /**
   * Create as supergroup (allows two-way messaging)
   */
  megagroup?: boolean;
  
  /**
   * Create as forum (allows topics/threads)
   */
  forum?: boolean;
  
  /**
   * Create for importing messages from another service
   */
  forImport?: boolean;
  
  /**
   * Time-to-live period for messages (in seconds)
   * Messages will auto-delete after this period
   */
  ttlPeriod?: number;
}

/**
 * Channel creation result
 */
export interface CreateChannelResult {
  success: boolean;
  channelId?: string;
  channelUsername?: string;
  error?: string;
}

/**
 * Telegram Channel Manager
 * 
 * Provides programmatic channel creation and management using Telegram MTProto API.
 * Note: This requires MTProto client library (like gramjs, pyrogram, or telethon).
 * 
 * For Bot API usage, channels must be created manually via Telegram client.
 */
export class TelegramChannelManager {
  private apiUrl: string;
  private botToken: string;
  
  constructor() {
    // Note: Bot API doesn't support channel creation
    // This would require MTProto client library
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN || "";
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    if (!this.botToken) {
      throw new Error('TES-NGWS-001.13: TELEGRAM_BOT_TOKEN must be set');
    }
  }
  
  /**
   * Create a new Telegram channel/supergroup
   * 
   * ⚠️ LIMITATION: Bot API does not support channel creation.
   * This method provides documentation and structure for MTProto implementation.
   * 
   * To create channels programmatically, you need:
   * 1. MTProto client library (gramjs, pyrogram, telethon)
   * 2. User account (not bot account)
   * 3. API credentials (api_id, api_hash from https://my.telegram.org)
   * 
   * Reference: https://core.telegram.org/method/channels.createChannel
   * 
   * @param options - Channel creation options
   * @returns Channel creation result
   */
  async createChannel(options: CreateChannelOptions): Promise<CreateChannelResult> {
    const rgBlock = generateRgBlock({
      scope: "CHANNEL",
      domain: "telegram.org",
      type: "CREATION",
      meta: "CHANNEL_CREATE_ATTEMPT",
      version: "TELEGRAM-API-MTPROTO",
      ticket: "TES-NGWS-001.13",
      bunApi: "TelegramChannelManager",
      ref: `title:${options.title}|type:${options.broadcast ? 'broadcast' : options.megagroup ? 'supergroup' : 'channel'}`
    });
    
    logHeadersForRg(rgBlock);
    
    // Bot API limitation: Cannot create channels
    // This would require MTProto client implementation
    console.warn('[TELEGRAM_CHANNEL] ⚠️  Bot API does not support channel creation');
    console.warn('[TELEGRAM_CHANNEL] Use MTProto client library (gramjs/pyrogram/telethon) for programmatic creation');
    console.warn('[TELEGRAM_CHANNEL] Or create channels manually via Telegram client');
    
    return {
      success: false,
      error: 'Bot API does not support channel creation. Use MTProto client or create manually.'
    };
  }
  
  /**
   * Get channel information
   * 
   * Uses Bot API getChat method to retrieve channel details.
   * 
   * @param channelId - Channel ID (negative number for supergroups/channels)
   * @returns Channel information
   */
  async getChannelInfo(channelId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
        }),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        const rgBlock = generateRgBlock({
          scope: "CHANNEL",
          domain: "telegram.org",
          type: "INFO",
          meta: "CHANNEL_INFO_RETRIEVED",
          version: "TELEGRAM-API-V2",
          ticket: "TES-NGWS-001.13",
          bunApi: "TelegramBotAPI",
          ref: `channel_id:${channelId}`
        });
        
        logHeadersForRg(rgBlock);
        return result.result;
      } else {
        throw new Error(result.description || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`[TELEGRAM_CHANNEL] Get info failed:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Create forum topics in a supergroup
   * 
   * Creates topics/threads in an existing forum supergroup.
   * Note: Requires supergroup to be created as forum (forum: true).
   * 
   * @param channelId - Supergroup ID
   * @param topicNames - Array of topic names to create
   * @returns Array of created topic IDs
   */
  async createForumTopics(channelId: string, topicNames: string[]): Promise<number[]> {
    // Bot API doesn't support topic creation directly
    // Topics must be created manually via Telegram client
    console.warn('[TELEGRAM_CHANNEL] ⚠️  Bot API does not support topic creation');
    console.warn('[TELEGRAM_CHANNEL] Create topics manually via Telegram client');
    console.warn('[TELEGRAM_CHANNEL] Then use find-telegram-topics.ts to discover topic IDs');
    
    return [];
  }
}

/**
 * Get or create Telegram channel manager instance
 */
export function getTelegramChannelManager(): TelegramChannelManager {
  return new TelegramChannelManager();
}

/**
 * Manual channel creation guide
 * 
 * Since Bot API doesn't support channel creation, use this guide:
 * 
 * 1. Create Supergroup:
 *    - Open Telegram client
 *    - New Group → Add members → Convert to Supergroup
 *    - Settings → Group Type → Supergroup
 * 
 * 2. Create Forum (optional):
 *    - Settings → Group Type → Forum
 *    - Enables topic/thread support
 * 
 * 3. Add Bot:
 *    - Settings → Administrators → Add Administrator
 *    - Select your bot
 *    - Grant permissions: Send Messages, Pin Messages, Manage Topics
 * 
 * 4. Get Supergroup ID:
 *    - Use @userinfobot or Bot API getChat
 *    - ID will be negative (e.g., -1003482161671)
 * 
 * 5. Create Topics (if forum):
 *    - Click "Create Topic" in forum
 *    - Name topics (e.g., "Steam Alerts", "Performance")
 *    - Note topic IDs (use find-telegram-topics.ts)
 * 
 * 6. Configure:
 *    - Set TELEGRAM_SUPERGROUP_ID environment variable
 *    - Set TELEGRAM_TOPIC_* environment variables
 */
export const CHANNEL_CREATION_GUIDE = {
  steps: [
    'Create supergroup manually via Telegram client',
    'Convert to forum if topics are needed',
    'Add bot as administrator',
    'Get supergroup ID (negative number)',
    'Create topics and note their IDs',
    'Configure environment variables'
  ],
  reference: 'https://core.telegram.org/method/channels.createChannel'
};

