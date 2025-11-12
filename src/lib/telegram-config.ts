/**
 * Telegram Config - TES-NGWS-001.15
 * 
 * TypeScript interfaces and utilities for Telegram Config object.
 * 
 * Reference: https://core.telegram.org/constructor/config
 * Method: https://core.telegram.org/method/help.getConfig
 * 
 * The Config object contains system-wide Telegram configuration including:
 * - Data center (DC) options and routing
 * - Rate limits and size constraints
 * - Time limits for message operations
 * - Top peer rating decay parameters
 * - Feature flags and capabilities
 * 
 * @module src/lib/telegram-config
 */

/**
 * Telegram Config interface
 * 
 * Represents the complete Telegram system configuration returned by help.getConfig.
 * 
 * Reference: https://core.telegram.org/constructor/config
 */
export interface TelegramConfig {
  // Flags
  flags: number;
  default_p2p_contacts?: boolean;
  preload_featured_stickers?: boolean;
  revoke_pm_inbox?: boolean;
  blocked_mode?: boolean;
  force_try_ipv6?: boolean;
  
  // Core configuration
  date: number;                    // Current date at server
  expires: number;                  // Config expiration timestamp
  test_mode: boolean;               // Whether connected to test DCs
  this_dc: number;                  // ID of DC that returned reply
  
  // Data center options
  dc_options: DcOption[];           // DC IP list
  dc_txt_domain_name: string;       // Domain for encrypted DC list from DNS TXT
  
  // Size limits
  chat_size_max: number;            // Max members for normal groups
  megagroup_size_max: number;      // Max members for supergroups
  forwarded_count_max: number;      // Max messages that can be forwarded at once
  
  // Online status timing
  online_update_period_ms: number;        // Update online status every N ms
  offline_blur_timeout_ms: number;        // Delay before offline status sent
  offline_idle_timeout_ms: number;        // Time without activity = offline
  online_cloud_timeout_ms: number;        // Cloud sync timeout
  notify_cloud_delay_ms: number;          // Delay offline notification if other client online
  notify_default_delay_ms: number;        // Delay notification if other client online
  
  // Push notifications (not for client use)
  push_chat_period_ms?: number;
  push_chat_limit?: number;
  
  // Time limits
  edit_time_limit: number;          // Max age for editable messages (seconds)
  revoke_time_limit: number;        // Max age for deletable channel/supergroup messages
  revoke_pm_time_limit: number;    // Max age for deletable private messages
  
  // Top peer rating
  rating_e_decay: number;          // Exponential decay rate for top peer rating (seconds)
  
  // Stickers
  stickers_recent_limit: number;   // Max number of recent stickers
  
  // Channel media
  channels_read_media_period: number; // Auto-mark read period for channel media
  
  // Temporary sessions
  tmp_sessions?: number;            // Temporary passport sessions
  
  // VoIP call timeouts
  call_receive_timeout_ms: number;  // Max outgoing ring time
  call_ring_timeout_ms: number;    // Max incoming ring time
  call_connect_timeout_ms: number;  // VoIP connection timeout
  call_packet_timeout_ms: number;  // Packet timeout for VoIP calls
  
  // URLs and prefixes
  me_url_prefix: string;           // Domain for parsing deep links
  autoupdate_url_prefix?: string;  // URL for auto-updating app
  gif_search_username?: string;    // Bot username for GIF search
  venue_search_username?: string;  // Bot username for venue search
  img_search_username?: string;    // Bot username for image search
  static_maps_provider?: string;   // Map provider ID for venues
  
  // Message limits
  caption_length_max: number;       // Max caption length (UTF-8 codepoints)
  message_length_max: number;       // Max message length (UTF-8 codepoints)
  
  // Web files
  webfile_dc_id: number;           // DC ID for downloading webfiles
  
  // Language
  suggested_lang_code?: string;    // Suggested language code
  lang_pack_version?: number;       // Language pack version
  base_lang_pack_version?: number; // Basic language pack version
  
  // Reactions
  reactions_default?: Reaction;     // Default message reaction
  
  // Autologin
  autologin_token?: string;        // Autologin token for URL authorization
}

/**
 * Data center option
 */
export interface DcOption {
  id: number;
  ip_address: string;
  port: number;
  ipv6?: boolean;
  media_only?: boolean;
  tcpo_only?: boolean;
  cdn?: boolean;
  static?: boolean;
  secret?: string;
}

/**
 * Reaction (default reaction)
 */
export interface Reaction {
  emoticon?: string;
  document_id?: number;
}

/**
 * Telegram Config Manager
 * 
 * Manages Telegram system configuration retrieval and caching.
 * 
 * ⚠️ NOTE: Bot API does not expose config directly.
 * This requires MTProto API via help.getConfig.
 */
export class TelegramConfigManager {
  private config: TelegramConfig | null = null;
  private configExpires: number = 0;
  
  /**
   * Get Telegram configuration
   * 
   * ⚠️ LIMITATION: Bot API does not support config retrieval.
   * This requires MTProto client library.
   * 
   * Reference: https://core.telegram.org/method/help.getConfig
   * 
   * @param forceRefresh - Force refresh even if cached config is valid
   * @returns Telegram configuration
   */
  async getConfig(forceRefresh: boolean = false): Promise<TelegramConfig | null> {
    // Check cache validity
    if (!forceRefresh && this.config && Date.now() < this.configExpires) {
      return this.config;
    }
    
    // Bot API limitation: Cannot retrieve config
    console.warn('[TELEGRAM_CONFIG] ⚠️  Bot API does not support config retrieval');
    console.warn('[TELEGRAM_CONFIG] Use MTProto client library (gramjs/pyrogram/telethon)');
    console.warn('[TELEGRAM_CONFIG] Method: help.getConfig');
    console.warn('[TELEGRAM_CONFIG] Reference: https://core.telegram.org/method/help.getConfig');
    
    return null;
  }
  
  /**
   * Get default rating decay value
   * 
   * Returns the default exponential decay rate for top peer rating calculations.
   * Default: 2419200 seconds (28 days) if config unavailable.
   * 
   * Reference: https://core.telegram.org/api/top-rating
   * 
   * @returns Rating decay in seconds
   */
  getRatingDecay(): number {
    if (this.config?.rating_e_decay) {
      return this.config.rating_e_decay;
    }
    // Default: 28 days in seconds (from Telegram API docs)
    return 2419200;
  }
  
  /**
   * Get message edit time limit
   * 
   * Returns the maximum age (in seconds) for editable messages.
   * 
   * @returns Edit time limit in seconds
   */
  getEditTimeLimit(): number {
    if (this.config?.edit_time_limit) {
      return this.config.edit_time_limit;
    }
    // Default: 48 hours (common Telegram default)
    return 172800;
  }
  
  /**
   * Get message revoke time limit
   * 
   * Returns the maximum age (in seconds) for deletable channel/supergroup messages.
   * 
   * @returns Revoke time limit in seconds
   */
  getRevokeTimeLimit(): number {
    if (this.config?.revoke_time_limit) {
      return this.config.revoke_time_limit;
    }
    // Default: 48 hours (common Telegram default)
    return 172800;
  }
  
  /**
   * Get private message revoke time limit
   * 
   * Returns the maximum age (in seconds) for deletable private messages.
   * 
   * @returns PM revoke time limit in seconds
   */
  getRevokePmTimeLimit(): number {
    if (this.config?.revoke_pm_time_limit) {
      return this.config.revoke_pm_time_limit;
    }
    // Default: 48 hours (common Telegram default)
    return 172800;
  }
  
  /**
   * Get maximum message length
   * 
   * Returns the maximum message length in UTF-8 codepoints.
   * 
   * @returns Maximum message length
   */
  getMessageLengthMax(): number {
    if (this.config?.message_length_max) {
      return this.config.message_length_max;
    }
    // Default: 4096 characters (Telegram default)
    return 4096;
  }
  
  /**
   * Get maximum caption length
   * 
   * Returns the maximum caption length in UTF-8 codepoints.
   * 
   * @returns Maximum caption length
   */
  getCaptionLengthMax(): number {
    if (this.config?.caption_length_max) {
      return this.config.caption_length_max;
    }
    // Default: 1024 characters (Telegram default)
    return 1024;
  }
  
  /**
   * Get maximum forwarded messages count
   * 
   * Returns the maximum number of messages that can be forwarded at once.
   * 
   * @returns Maximum forwarded count
   */
  getForwardedCountMax(): number {
    if (this.config?.forwarded_count_max) {
      return this.config.forwarded_count_max;
    }
    // Default: 100 messages (Telegram default)
    return 100;
  }
  
  /**
   * Get maximum supergroup size
   * 
   * Returns the maximum number of members allowed in a supergroup.
   * 
   * @returns Maximum supergroup size
   */
  getMegagroupSizeMax(): number {
    if (this.config?.megagroup_size_max) {
      return this.config.megagroup_size_max;
    }
    // Default: 200,000 members (Telegram default)
    return 200000;
  }
  
  /**
   * Check if config is expired
   * 
   * @returns True if config needs refresh
   */
  isExpired(): boolean {
    if (!this.config) return true;
    return Date.now() >= this.configExpires;
  }
  
  /**
   * Set cached config
   * 
   * @param config - Config to cache
   */
  setConfig(config: TelegramConfig): void {
    this.config = config;
    // Cache expires when config.expires timestamp is reached
    this.configExpires = config.expires * 1000; // Convert to milliseconds
  }
}

/**
 * Get or create Telegram config manager instance
 */
export function getTelegramConfigManager(): TelegramConfigManager {
  return new TelegramConfigManager();
}

/**
 * Default config values (fallbacks when config unavailable)
 * 
 * These are common Telegram defaults used when config cannot be retrieved.
 */
export const DEFAULT_CONFIG_VALUES = {
  rating_e_decay: 2419200,           // 28 days in seconds
  edit_time_limit: 172800,            // 48 hours in seconds
  revoke_time_limit: 172800,          // 48 hours in seconds
  revoke_pm_time_limit: 172800,      // 48 hours in seconds
  message_length_max: 4096,          // UTF-8 codepoints
  caption_length_max: 1024,         // UTF-8 codepoints
  forwarded_count_max: 100,          // messages
  megagroup_size_max: 200000,        // members
  chat_size_max: 200,                // members (basic groups)
  stickers_recent_limit: 20,         // stickers
  online_update_period_ms: 30000,    // 30 seconds
  offline_blur_timeout_ms: 5000,     // 5 seconds
  offline_idle_timeout_ms: 30000,    // 30 seconds
} as const;

/**
 * Config usage notes
 * 
 * For Bot API applications:
 * - Config is primarily used by MTProto clients
 * - Bot API has its own rate limits and constraints
 * - Use defaults provided here for reference
 * 
 * For MTProto implementation:
 * 1. Call help.getConfig to retrieve config
 * 2. Cache config until expires timestamp
 * 3. Use rating_e_decay for top peer calculations
 * 4. Respect time limits (edit_time_limit, revoke_time_limit)
 * 5. Use message_length_max for validation
 */
export const CONFIG_USAGE_NOTES = {
  botApiLimitation: 'Bot API does not expose config directly',
  mtprotoRequired: 'Use MTProto client library (gramjs/pyrogram/telethon)',
  method: 'help.getConfig',
  reference: 'https://core.telegram.org/method/help.getConfig',
  constructor: 'https://core.telegram.org/constructor/config'
};

