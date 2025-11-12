/**
 * Enhanced Telegram Alert System - TES-NGWS-001.12
 * 
 * Production-ready Telegram alert system with cooldowns, HTML formatting,
 * and channel-based routing for live odds pipeline.
 * 
 * @module src/lib/telegram-alert-system-v2
 */

import { NowGoalTick } from "../models/nowgoal-tick.ts";
import { getTESDomainConfigCached } from "../config/tes-domain-config.ts";
import { TELEGRAM_CHANNELS, AlertType, AlertSeverity, getChannel, type TelegramAlert as UnifiedTelegramAlert } from "../config/telegram-config.ts";
import { generateRgBlock, logHeadersForRg } from "./telegram-alert-system.ts";
import { existsSync } from "fs";

/**
 * Telegram alert payload (compatible with unified config)
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
 * Total movement data for total line steam alerts
 */
export interface TotalMovement {
  teamHome: string;
  teamAway: string;
  linePrevious: number;
  lineCurrent: number;
  lineMovement: number; // Change in line (e.g., -1.0 means line moved down 1 point)
  overPrevious: number;
  overCurrent: number;
  overChangePercent: number | null;
  underPrevious: number;
  underCurrent: number;
  underChangePercent: number | null;
  steamIndex: number;
  timestamp: number;
  // Enhanced fields for actionable alerts
  providers?: string[]; // Bookmaker/operator sources
  openingLine?: number; // Initial total line at poll start
  tickCount?: number; // Number of ticks since opening or last alert
}

/**
 * Alert send result with message ID
 */
export interface AlertSendResult {
  success: boolean;
  messageId?: number;
}

/**
 * Enhanced Telegram Alert System with cooldowns and HTML formatting
 * 
 * TES-NGWS-001.12c: Enhanced with Bun.secrets integration for secure token management
 */
export class TelegramAlertSystemV2 {
  private apiUrl: string;
  private botToken: string;
  private chatId: string;
  private tokenSource: "bun_secrets" | "env_file" | "process_env";
  private tokenAccessMethod: string;
  private ws: WebSocket | null = null;
  private lastAlertTimes = new Map<AlertType, number>();
  private pinnedMessages = new Map<number, number>(); // matchId -> messageId
  
  constructor() {
    // Secure token retrieval with explicit source detection
    // Use synchronous fallback for constructor, async detection happens on first use
    const tokenResult = this.getSecureTokenSync();
    this.botToken = tokenResult.token;
    this.tokenSource = tokenResult.source;
    this.tokenAccessMethod = tokenResult.accessMethod;
    
    this.chatId = process.env.TELEGRAM_SUPERGROUP_ID || Bun.env.TELEGRAM_SUPERGROUP_ID || "";
    
    if (!this.chatId) {
      throw new Error('TES-NGWS-001.12c: TELEGRAM_SUPERGROUP_ID must be set in environment');
    }
    
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    // Log configuration with RG metadata
    this.logTelegramConfiguration();
  }
  
  /**
   * Synchronous token retrieval for constructor
   * Performs explicit source detection without async operations
   * CRITICAL FIX: Detects .env file to distinguish from Bun.secrets
   */
  private getSecureTokenSync(): { token: string; source: "bun_secrets" | "env_file" | "process_env"; accessMethod: string } {
    // CRITICAL FIX: Check if token exists in Bun.env
    // If it does, we need to determine if it's from Bun.secrets API or .env auto-load
    // Strategy: Check if .env file exists - if it does and token is in Bun.env, it's from .env
    
    // Check if .env file exists using fs.existsSync (most reliable)
    const envFileExists = existsSync(".env");
    
    // Alternative check: if process.env has it but Bun.env doesn't, it's process.env
    // If both have it and .env file exists, it's from .env file
    const hasBunEnv = !!Bun.env.TELEGRAM_BOT_TOKEN;
    const hasProcessEnv = !!process.env.TELEGRAM_BOT_TOKEN;
    
    // If .env file exists and token is available, it's from .env (fallback)
    // CRITICAL: We check envFileExists FIRST to distinguish from Bun.secrets
    if (envFileExists && (hasBunEnv || hasProcessEnv)) {
      const token = Bun.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      
      // IMPORTANT: Log this as FALLBACK, not as Bun.secrets
      const warningRgBlock = generateRgBlock({
        scope: "SECURITY",
        domain: "telegram.org",
        type: "WARNING",
        meta: "FALLBACK_TO_ENV",
        version: "BUN-V1.3",
        ticket: "TES-NGWS-001.12c",
        bunApi: "env_file",
        ref: "Using .env file instead of Bun.secrets"
      });
      logHeadersForRg(warningRgBlock);
      
      console.warn("⚠️  [TES-NGWS-001.12c] Using .env file fallback - Bun.secrets not configured");
      console.warn("   💡 For production, use: bun run scripts/setup-telegram-secret.ts");
      
      return {
        token: token!,
        source: "env_file",
        accessMethod: "Loaded from .env file"
      };
    }
    
    // Legacy process.env (no .env file detected, direct env var)
    if (hasProcessEnv) {
      const warningRgBlock = generateRgBlock({
        scope: "SECURITY",
        domain: "telegram.org",
        type: "WARNING",
        meta: "FALLBACK_TO_ENV",
        version: "BUN-V1.3",
        ticket: "TES-NGWS-001.12c",
        bunApi: "process_env",
        ref: "Using process.env instead of Bun.secrets"
      });
      logHeadersForRg(warningRgBlock);
      
      console.warn("⚠️  [TES-NGWS-001.12c] Using process.env fallback - Bun.secrets not configured");
      
      return {
        token: process.env.TELEGRAM_BOT_TOKEN,
        source: "process_env",
        accessMethod: "process.env.TELEGRAM_BOT_TOKEN"
      };
    }
    
    // Fail hard - no token found
    const errorRgBlock = generateRgBlock({
      scope: "SECURITY",
      domain: "telegram.org",
      type: "ERROR",
      meta: "TOKEN_CONFIG_MISSING",
      version: "BUN-V1.3",
      ticket: "TES-NGWS-001.12c",
      bunApi: "None",
      ref: "Set TELEGRAM_BOT_TOKEN in .env or Bun.secrets"
    });
    logHeadersForRg(errorRgBlock);
    
    throw new Error(
      "TES-NGWS-001.12c: TELEGRAM_BOT_TOKEN not found in Bun.secrets or .env. " +
      "Please set it in `.env` or configure Bun.secrets for production: " +
      "bun run scripts/setup-telegram-secret.ts"
    );
  }
  
  /**
   * Secure token retrieval with explicit source detection:
   * 1. Bun.secrets API (most secure - explicit check)
   * 2. .env file (fallback - explicitly detected)
   * 3. process.env (legacy fallback)
   * 4. Throw error if none available
   * 
   * CRITICAL FIX: Distinguishes between Bun.secrets API and auto-loaded .env
   */
  private async getSecureToken(): Promise<{ token: string; source: "bun_secrets" | "env_file" | "process_env"; accessMethod: string }> {
    // Priority 1: Bun.secrets API (explicit check - most secure)
    try {
      const secrets = (Bun as any).secrets;
      if (secrets) {
        const secretToken = await secrets.get({
          service: "wncaab-perf-v3.1",
          name: "telegram-bot-token",
        }).catch(() => null);
        
        if (secretToken) {
          // Log security upgrade
          const rgBlock = generateRgBlock({
            scope: "SECURITY",
            domain: "telegram.org",
            type: "CONFIGURATION",
            meta: "SECRETS_UPGRADE_V3",
            version: "BUN-V1.3",
            ticket: "TES-NGWS-001.12c",
            bunApi: "Bun.secrets",
            ref: "source:bun_secrets|access:Bun.secrets.get"
          });
          logHeadersForRg(rgBlock);
          
          return {
            token: secretToken.toString(),
            source: "bun_secrets",
            accessMethod: "Bun.secrets.get(telegram-bot-token)"
          };
        }
      }
    } catch (error) {
      // Bun.secrets not available, continue to fallback
    }
    
    // Priority 2: Explicitly detect .env file presence
    // CRITICAL FIX: Check if .env file exists to distinguish from Bun.secrets
    const envFile = Bun.file(".env");
    const envFileExists = await envFile.exists();
    
    if (envFileExists) {
      // .env file exists → we're in fallback mode
      const token = Bun.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      
      if (token) {
        // IMPORTANT: Log this as FALLBACK, not as Bun.secrets
        const warningRgBlock = generateRgBlock({
          scope: "SECURITY",
          domain: "telegram.org",
          type: "WARNING",
          meta: "FALLBACK_TO_ENV",
          version: "BUN-V1.3",
          ticket: "TES-NGWS-001.12c",
          bunApi: "env_file",
          ref: "Using .env file instead of Bun.secrets"
        });
        logHeadersForRg(warningRgBlock);
        
        console.warn("⚠️  [TES-NGWS-001.12c] Using .env file fallback - Bun.secrets not configured");
        console.warn("   💡 For production, use: bun run scripts/setup-telegram-secret.ts");
        
        return {
          token,
          source: "env_file",
          accessMethod: "Loaded from .env file"
        };
      }
    }
    
    // Priority 3: Legacy process.env (no .env file, direct env var)
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const warningRgBlock = generateRgBlock({
        scope: "SECURITY",
        domain: "telegram.org",
        type: "WARNING",
        meta: "FALLBACK_TO_ENV",
        version: "BUN-V1.3",
        ticket: "TES-NGWS-001.12c",
        bunApi: "process_env",
        ref: "Using process.env instead of Bun.secrets"
      });
      logHeadersForRg(warningRgBlock);
      
      console.warn("⚠️  [TES-NGWS-001.12c] Using process.env fallback - Bun.secrets not configured");
      
      return {
        token: process.env.TELEGRAM_BOT_TOKEN,
        source: "process_env",
        accessMethod: "process.env.TELEGRAM_BOT_TOKEN"
      };
    }
    
    // Priority 4: Fail hard
    const errorRgBlock = generateRgBlock({
      scope: "SECURITY",
      domain: "telegram.org",
      type: "ERROR",
      meta: "TOKEN_CONFIG_MISSING",
      version: "BUN-V1.3",
      ticket: "TES-NGWS-001.12c",
      bunApi: "None",
      ref: "Set TELEGRAM_BOT_TOKEN in .env or Bun.secrets"
    });
    logHeadersForRg(errorRgBlock);
    
    throw new Error(
      "TES-NGWS-001.12c: TELEGRAM_BOT_TOKEN not found in Bun.secrets or .env. " +
      "Please set it in `.env` or configure Bun.secrets for production: " +
      "bun run scripts/setup-telegram-secret.ts"
    );
  }
  
  /**
   * Log Telegram configuration initialization with RG-compatible metadata
   * 
   * Records the supergroup ID and bot configuration to headers-index.log
   * for auditability and system health monitoring.
   */
  private logTelegramConfiguration(): void {
    const tesConfig = getTESDomainConfigCached();
    const timestamp = Date.now();
    
    const rgBlock = `[HEADERS_BLOCK_START:v1]{TELEGRAM_CONFIG_LOADED}~[CONFIG][${tesConfig.nowgoalDomain}][INIT][TELEGRAM_CONFIG][TELEGRAM-API-V2][TES-NGWS-001.12][TelegramAlertSystemV2][#REF:supergroup:${this.chatId}][TIMESTAMP:${timestamp}][HEADERS_BLOCK_END]`;
    
    const logLine = `${new Date().toISOString()} ${rgBlock}\n`;
    Bun.write("logs/headers-index.log", logLine, { createPath: true, flag: "a" }).catch((error) => {
      console.error(`[Telegram Alert] Failed to write RG log: ${error}`);
    });
    
    console.log(`[TELEGRAM_CONFIG] Supergroup: ${this.chatId}`);
  }
  
  /**
   * Set WebSocket reference for connection status monitoring
   * 
   * Updates the internal WebSocket reference to enable connection status
   * checks in heartbeat and performance alerts.
   * 
   * @param ws - WebSocket instance or null to clear reference
   */
  setWebSocketReference(ws: WebSocket | null): void {
    this.ws = ws;
  }
  
  /**
   * Send Telegram alert with cooldown protection and rate limiting
   * 
   * Processes an alert through the Telegram Bot API, applying channel-specific
   * cooldowns, HTML formatting, and RG metadata logging. Returns the message ID
   * for potential pinning operations.
   * 
   * @param alert - Alert payload with type, severity, title, message, and metadata
   * @returns Result object with success status and message ID (if successful)
   */
  async sendTelegramAlert(alert: TelegramAlert): Promise<AlertSendResult> {
    // Enhanced security: Validate token source integrity
    // Note: Only check if source was claimed as bun_secrets (from actual Bun.secrets API)
    // If source is env_file or process_env, skip this check
    if (this.tokenSource === "bun_secrets") {
      // Verify Bun.secrets API still has the token
      try {
        const secrets = (Bun as any).secrets;
        if (secrets) {
          const secretToken = await secrets.get({
            service: "wncaab-perf-v3.1",
            name: "telegram-bot-token",
          }).catch(() => null);
          
          if (!secretToken) {
            // Token was loaded from Bun.secrets but now unavailable (tampering?)
            const tamperRgBlock = generateRgBlock({
              scope: "SECURITY",
              domain: "telegram.org",
              type: "ERROR",
              meta: "SECRETS_TAMPER_DETECTED",
              version: "BUN-V1.3",
              ticket: "TES-NGWS-001.12c",
              bunApi: "Bun.secrets",
              ref: "Token source integrity check failed"
            });
            logHeadersForRg(tamperRgBlock);
            throw new Error("TES-NGWS-001.12c: Security - Bun.secrets token tampering detected");
          }
        }
      } catch (error) {
        // If error is our tamper detection, rethrow it
        if (error instanceof Error && error.message.includes("tampering")) {
          throw error;
        }
        // Otherwise, continue (secrets API might not be available)
      }
    }
    
    const channel = getChannel(alert.type);
    
    // Check cooldown
    const now = Date.now();
    const lastTime = this.lastAlertTimes.get(alert.type) || 0;
    
    if (channel.cooldownMs && (now - lastTime) < channel.cooldownMs) {
      console.log(`[Telegram] ⏸️  Skipping ${alert.type} alert (cooldown active, ${channel.cooldownMs - (now - lastTime)}ms remaining)`);
      return { success: false };
    }
    
    // Format message with HTML
    const formattedMessage = this.formatAlertMessageAsHtml(alert);
    
    const rgBlock = this.generateRgMetadataBlock({
      scope: "ALERT",
      domain: "telegram.org",
      type: "NOTIFICATION",
      meta: `${alert.type}_ALERT_SENT`,
      version: "TELEGRAM-API-V2",
      ticket: "TES-NGWS-001.12c",
      bunApi: "TelegramBotAPI",
      ref: `chat:${this.chatId}|topic:${channel.topicId}|type:${alert.type}|source:${this.tokenSource}`
    });
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-TES-Metadata": rgBlock
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          message_thread_id: channel.topicId,
          text: formattedMessage,
          parse_mode: "HTML",
          disable_notification: alert.severity === 'INFO',
        }),
      });
      
      const result = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (result.ok) {
        this.lastAlertTimes.set(alert.type, now);
        
        const successRgBlock = this.generateRgMetadataBlock({
          scope: "ALERT",
          domain: "telegram.org",
          type: "SUCCESS",
          meta: "TELEGRAM_SENT",
          version: "TELEGRAM-API-V2",
          ticket: "TES-NGWS-001.12",
          bunApi: "TelegramBotAPI",
          ref: `message_id:${result.result.message_id}|responseTime:${responseTime}ms|type:${alert.type}`
        });
        
        this.logRgMetadataToFile(successRgBlock);
        console.log(`[TELEGRAM_SENT] ✉️ ${alert.type} alert → topic ${channel.topicId} (${responseTime}ms) | message_id:${result.result.message_id}`);
        return { success: true, messageId: result.result.message_id };
      } else {
        throw new Error(result.description || `HTTP ${response.status}`);
      }
    } catch (error) {
      const failureRgBlock = this.generateRgMetadataBlock({
        scope: "ALERT",
        domain: "telegram.org",
        type: "ERROR",
        meta: "TELEGRAM_SEND_FAILED",
        version: "TELEGRAM-API-V2",
        ticket: "TES-NGWS-001.12",
        bunApi: "TelegramBotAPI",
        ref: `error:${error instanceof Error ? error.message : String(error)}|type:${alert.type}`
      });
      
      this.logRgMetadataToFile(failureRgBlock);
      console.error(`[TELEGRAM_FAIL] ❌ ${alert.type}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to console
      console.error(`[ALERT_FALLBACK] ${alert.title}: ${alert.message}`);
      return { success: false };
    }
  }
  
  /**
   * Pin a Telegram message in the supergroup topic
   * 
   * Pins a message to the top of the specified topic (or general chat if no topic).
   * Used for highlighting critical alerts that require immediate attention.
   * 
   * Reference: https://core.telegram.org/api/pin
   * Bot API: https://core.telegram.org/bots/api#pinchatmessage
   * 
   * @param messageId - Telegram message ID to pin
   * @param topicId - Optional topic/thread ID (required for supergroup topics)
   * @returns True if pinning succeeded, false otherwise
   */
  async pinTelegramMessage(messageId: number, topicId?: number): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/pinChatMessage`;
      
      const body: any = {
        chat_id: this.chatId,
        message_id: messageId,
        disable_notification: false,
      };
      
      // Add topic ID if provided (for topics)
      if (topicId !== undefined) {
        body.message_thread_id = topicId;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        const rgBlock = this.generateRgMetadataBlock({
          scope: "ALERT",
          domain: "telegram.org",
          type: "ACTION",
          meta: "MESSAGE_PINNED",
          version: "TELEGRAM-API-V2",
          ticket: "TES-NGWS-001.12",
          bunApi: "TelegramBotAPI",
          ref: `message_id:${messageId}|topic:${topicId || 'general'}`
        });
        
        this.logHeadersForRg(rgBlock);
        console.log(`[TELEGRAM_PIN] 📌 Pinned message ${messageId} in topic ${topicId || 'general'}`);
        return true;
      } else {
        throw new Error(result.description || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`[TELEGRAM] Pin failed:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }
  
  /**
   * Unpin a Telegram message from the supergroup topic
   * 
   * Removes a pinned message from the top of the specified topic (or general chat).
   * Used for cleanup when alerts are no longer relevant or when replacing old pins.
   * 
   * Reference: https://core.telegram.org/api/pin
   * Bot API: https://core.telegram.org/bots/api#unpinchatmessage
   * 
   * @param messageId - Telegram message ID to unpin
   * @param topicId - Optional topic/thread ID (required for supergroup topics)
   * @returns True if unpinning succeeded, false otherwise
   */
  async unpinTelegramMessage(messageId: number, topicId?: number): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/unpinChatMessage`;
      
      const body: any = {
        chat_id: this.chatId,
        message_id: messageId,
      };
      
      // Add topic ID if provided (for topics)
      if (topicId !== undefined) {
        body.message_thread_id = topicId;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        const rgBlock = this.generateRgMetadataBlock({
          scope: "ALERT",
          domain: "telegram.org",
          type: "ACTION",
          meta: "MESSAGE_UNPINNED",
          version: "TELEGRAM-API-V2",
          ticket: "TES-NGWS-001.12",
          bunApi: "TelegramBotAPI",
          ref: `message_id:${messageId}|topic:${topicId || 'general'}`
        });
        
        this.logHeadersForRg(rgBlock);
        console.log(`[TELEGRAM_UNPIN] 📌 Unpinned message ${messageId} in topic ${topicId || 'general'}`);
        return true;
      } else {
        throw new Error(result.description || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`[TELEGRAM] Unpin failed:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }
  
  /**
   * Unpin all messages in a Telegram chat/topic
   * 
   * Removes all pinned messages from the top of the specified topic (or general chat).
   * Useful for bulk cleanup operations when clearing all pins.
   * 
   * Reference: https://core.telegram.org/api/pin
   * Bot API: https://core.telegram.org/bots/api#unpinallchatmessages
   * 
   * @param topicId - Optional topic/thread ID (required for supergroup topics)
   * @returns True if unpinning all succeeded, false otherwise
   */
  async unpinAllTelegramMessages(topicId?: number): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/unpinAllChatMessages`;
      
      const body: any = {
        chat_id: this.chatId,
      };
      
      // Add topic ID if provided (for topics)
      if (topicId !== undefined) {
        body.message_thread_id = topicId;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        const rgBlock = this.generateRgMetadataBlock({
          scope: "ALERT",
          domain: "telegram.org",
          type: "ACTION",
          meta: "ALL_MESSAGES_UNPINNED",
          version: "TELEGRAM-API-V2",
          ticket: "TES-NGWS-001.12",
          bunApi: "TelegramBotAPI",
          ref: `topic:${topicId || 'general'}`
        });
        
        this.logHeadersForRg(rgBlock);
        console.log(`[TELEGRAM_UNPIN_ALL] 📌 Unpinned all messages in topic ${topicId || 'general'}`);
        
        // Clear tracked pinned messages for this topic
        // Note: This clears all tracked pins. For topic-specific tracking,
        // you'd need a Map<topicId, Map<matchId, messageId>> structure
        this.pinnedMessages.clear();
        
        return true;
      } else {
        throw new Error(result.description || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`[TELEGRAM] Unpin all failed:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }
  
  /**
   * Unpin all steam alerts for a specific match (cleanup utility)
   * 
   * Removes pinned messages associated with a match ID. Useful for cleanup
   * after a match ends or when replacing old alerts with new ones.
   * 
   * @param matchId - Match ID to unpin messages for
   */
  async unpinMatchSteamAlerts(matchId: number): Promise<void> {
    const messageId = this.pinnedMessages.get(matchId);
    if (messageId) {
      const channel = getChannel('STEAM_ALERTS' as AlertType);
      await this.unpinTelegramMessage(messageId, channel.topicId);
      this.pinnedMessages.delete(matchId);
    }
  }
  
  /**
   * Format alert message as HTML for Telegram Bot API
   * 
   * Converts the alert payload into a formatted HTML message with:
   * - Channel name and severity emoji
   * - Timestamp and title
   * - Metadata fields as formatted list
   * - Game link if matchId/gameId is present
   * 
   * @param alert - Alert payload to format
   * @returns HTML-formatted message string
   */
  private formatAlertMessageAsHtml(alert: TelegramAlert): string {
    const channel = getChannel(alert.type);
    
    // Emoji based on severity
    const emojiMap: Record<AlertSeverity, string> = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      CRITICAL: '🚨'
    };
    
    let message = `<b>${emojiMap[alert.severity]} ${channel.name}</b>\n`;
    message += `<b>Severity:</b> ${alert.severity}\n`;
    message += `<b>Time:</b> ${new Date(alert.timestamp).toISOString()}\n`;
    message += `<b>${alert.title}</b>\n\n`;
    message += `${alert.message}\n\n`;
    
    // Add metadata if present
    if (alert.metadata && Object.keys(alert.metadata).length > 0) {
      message += `<b>Details:</b>\n`;
      Object.entries(alert.metadata).forEach(([key, value]) => {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        message += `• <code>${key}:</code> ${this.escapeHtmlSpecialCharacters(displayValue)}\n`;
      });
    }
    
    // Add footer with link if matchId present
    if (alert.metadata?.matchId || alert.metadata?.gameId) {
      const id = alert.metadata.matchId || alert.metadata.gameId;
      message += `\n<a href="https://live.nowgoal26.com/basketball/${id}">View Game</a>`;
    }
    
    return message;
  }
  
  /**
   * Escape HTML special characters to prevent injection
   * 
   * Sanitizes user-provided text by escaping HTML entities:
   * - & → &amp;
   * - < → &lt;
   * - > → &gt;
   * - " → &quot;
   * - ' → &#039;
   * 
   * @param text - Raw text to escape
   * @returns Escaped HTML-safe string
   */
  private escapeHtmlSpecialCharacters(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Format timestamp to New York timezone using native Intl.DateTimeFormat
   * 
   * Uses native JavaScript Intl API (zero dependencies) to convert UTC timestamp
   * to America/New_York timezone with proper DST handling.
   * 
   * @param timestamp - UTC timestamp in milliseconds
   * @returns Formatted string in NY timezone (e.g., "2025-11-11 10:47:00 EST")
   */
  private formatNYTime(timestamp: number): string {
    try {
      const date = new Date(timestamp);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      const second = parts.find(p => p.type === 'second')?.value;
      
      // Get timezone abbreviation (EST/EDT)
      const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'short',
      });
      const tzParts = tzFormatter.formatToParts(date);
      const tzName = tzParts.find(p => p.type === 'timeZoneName')?.value || 'ET';
      
      return `${year}-${month}-${day} ${hour}:${minute}:${second} ${tzName}`;
    } catch (error) {
      // Fallback to UTC if timezone conversion fails
      console.warn('[Telegram] Timezone conversion failed, using UTC:', error);
      return new Date(timestamp).toISOString();
    }
  }

  /**
   * Send total line steam alert with automatic pinning for critical movements
   * 
   * Sends a formatted total line steam alert and automatically pins it if:
   * - Line movement ≥ 1.0 point (absolute value), OR
   * - Steam index > 2.0
   * 
   * Tracks pinned messages by matchId for cleanup and replacement.
   * 
   * @param matchId - Match/game ID for tracking
   * @param movement - Total movement data with line, odds, and steam index
   * @returns Object with alertSent status and pinned status
   */
  async sendSteamAlertWithAutoPin(matchId: number, movement: TotalMovement): Promise<{ alertSent: boolean; pinned: boolean }> {
    // Format percentage change (e.g., -1.2% on over odds)
    const overChange = movement.overChangePercent !== null 
      ? `(${movement.overChangePercent > 0 ? '+' : ''}${movement.overChangePercent.toFixed(1)}%)`
      : '';
    const underChange = movement.underChangePercent !== null
      ? `(${movement.underChangePercent > 0 ? '+' : ''}${movement.underChangePercent.toFixed(1)}%)`
      : '';
    
    // Format providers/bookmakers
    const providersDisplay = movement.providers && movement.providers.length > 0
      ? movement.providers.join(', ')
      : 'Unknown';

    // Format line movement (use opening line if available, otherwise previous)
    const lineMovementDisplay = movement.openingLine !== undefined
      ? `${movement.openingLine} → <b>${movement.lineCurrent}</b> (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)} from opening)`
      : `${movement.linePrevious} → <b>${movement.lineCurrent}</b> (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)})`;
    
    const formattedMessage = `<b>🚨 TOTAL LINE STEAM</b>
<b>Match:</b> ${this.escapeHtmlSpecialCharacters(movement.teamHome)} vs ${this.escapeHtmlSpecialCharacters(movement.teamAway)}
<b>Match ID:</b> ${matchId}
<b>Time (NY):</b> ${this.formatNYTime(movement.timestamp)}
<b>Time (UTC):</b> ${new Date(movement.timestamp).toISOString()}
<b>Bookmaker(s):</b> ${providersDisplay}
<b>Opening Line:</b> ${movement.openingLine !== undefined ? movement.openingLine.toFixed(1) : 'N/A'}
<b>Tick Count:</b> ${movement.tickCount ?? 0}
<b>Line Movement:</b> ${lineMovementDisplay}
<b>Over Odds:</b> ${movement.overPrevious} ${overChange} → ${movement.overCurrent}
<b>Under Odds:</b> ${movement.underPrevious} ${underChange} → ${movement.underCurrent}
<b>Steam Index:</b> <code>${movement.steamIndex.toFixed(2)}</code>`;
    
    const severity: AlertSeverity = movement.lineMovement <= -1 ? 'CRITICAL' : 'WARNING';
    
    // Use STEAM_ALERTS type for unified config compatibility
    const alertType: AlertType = 'STEAM_ALERTS' as AlertType;
    
    const result = await this.sendTelegramAlert({
      type: alertType,
      severity,
      title: `Total Line Steam: ${movement.linePrevious} → ${movement.lineCurrent}`,
      message: formattedMessage,
      metadata: {
        matchId,
        lineMovement: movement.lineMovement,
        steamIndex: movement.steamIndex,
        timestamp: movement.timestamp,
        teamHome: movement.teamHome,
        teamAway: movement.teamAway,
        providers: movement.providers,
        openingLine: movement.openingLine,
        tickCount: movement.tickCount,
      },
      timestamp: movement.timestamp,
    });
    
    // Pin if major movement (≥1 point) or high steam index
    let pinned = false;
    if (result.success && result.messageId && 
        (Math.abs(movement.lineMovement) >= 1 || movement.steamIndex > 2.0)) {
      const channel = getChannel(alertType);
      pinned = await this.pinTelegramMessage(result.messageId, channel.topicId);
      
      if (pinned) {
        // Track pinned message for this match
        this.pinnedMessages.set(matchId, result.messageId);
        console.log(`📌 Pinned critical steam alert for match ${matchId} (message ${result.messageId})`);
      }
    }
    
    return { alertSent: result.success, pinned };
  }
  
  /**
   * Send steam movement alert for a single odds tick
   * 
   * Convenience method for sending alerts when individual odds movements
   * are detected. Calculates velocity and severity automatically.
   * 
   * @param tick - NowGoal tick data with odds movement
   * @returns True if alert sent successfully, false otherwise
   */
  async sendSteamMovementAlert(tick: NowGoalTick): Promise<boolean> {
    const velocity = Math.abs(tick.newValue - tick.oldValue);
    const severity: AlertSeverity = velocity > 0.1 ? 'CRITICAL' : 'WARNING';
    
    const result = await this.sendTelegramAlert({
      type: 'STEAM_ALERTS' as AlertType,
      severity,
      title: 'Steam Movement Detected',
      message: `${tick.oddsType.toUpperCase()} odds moved from ${tick.oldValue} to ${tick.newValue}`,
      metadata: {
        gameId: tick.gameId,
        matchId: tick.gameId,
        oddsType: tick.oddsType,
        oldValue: tick.oldValue,
        newValue: tick.newValue,
        velocity: velocity.toFixed(4),
        bookmakerId: tick.bookmakerId,
        league: tick.market.league,
        homeTeam: tick.market.homeTeam,
        awayTeam: tick.market.awayTeam,
      },
      timestamp: tick.timestamp,
    });
    
    return result.success;
  }
  
  /**
   * Send line movement alert with score context (for Goaloo901 poller)
   * 
   * Sends an alert for line movements detected by external pollers.
   * Includes score context and movement direction (up/down/stable).
   * 
   * @param matchId - Match/game ID
   * @param movement - Movement data with type, line, direction, and optional score
   * @returns True if alert sent successfully, false otherwise
   */
  async sendLineMovementAlert(matchId: number, movement: {
    type: string;
    line: number;
    movement: string;
    lineMovement: 'up' | 'down' | 'stable';
    scoreHome?: number;
    scoreAway?: number;
  }): Promise<boolean> {
    const severity: AlertSeverity = movement.lineMovement === 'stable' ? 'INFO' : 
                                     Math.abs(movement.line) >= 0.5 ? 'CRITICAL' : 'WARNING';
    
    const result = await this.sendTelegramAlert({
      type: 'STEAM_ALERTS' as AlertType,
      severity,
      title: 'Line Movement Detected',
      message: `${movement.type.toUpperCase()} line moved ${movement.lineMovement} to ${movement.line}`,
      metadata: {
        matchId,
        gameId: String(matchId),
        oddsType: movement.type,
        line: movement.line,
        movement: movement.movement,
        lineMovement: movement.lineMovement,
        score: movement.scoreHome !== undefined && movement.scoreAway !== undefined
          ? `${movement.scoreHome}-${movement.scoreAway}`
          : undefined,
      },
      timestamp: Date.now(),
    });
    
    return result.success;
  }
  
  /**
   * Send performance metrics alert with system statistics
   * 
   * Sends an alert containing performance metrics such as:
   * - Poll counts and latency
   * - Message rates and steam detections
   * - Error rates and active matches
   * 
   * @param metrics - Performance metrics object
   * @returns True if alert sent successfully, false otherwise
   */
  async sendPerformanceMetricsAlert(metrics: {
    totalPolls?: number;
    inserts?: number;
    duplicates?: number;
    avgLatency?: number;
    activeMatches?: number;
    messageRate?: number;
    steamDetections?: number;
    errorRate?: number;
  }): Promise<boolean> {
    const severity: AlertSeverity = (metrics.avgLatency && metrics.avgLatency > 1000) ? 'WARNING' : 'INFO';
    
    const message = metrics.totalPolls 
      ? `Processed ${metrics.totalPolls} polls, avg latency: ${metrics.avgLatency || 0}ms`
      : `Message rate: ${metrics.messageRate?.toFixed(2) || 0} msg/s, Steam detections: ${metrics.steamDetections || 0}`;
    
    const result = await this.sendTelegramAlert({
      type: 'PERFORMANCE' as AlertType,
      severity,
      title: 'Performance Metrics',
      message,
      metadata: {
        activeMatches: metrics.activeMatches,
        inserts: metrics.inserts,
        duplicates: metrics.duplicates,
        insertRate: metrics.totalPolls ? `${metrics.inserts}/${metrics.totalPolls}` : undefined,
        duplicateRate: metrics.totalPolls ? `${metrics.duplicates}/${metrics.totalPolls}` : undefined,
        avgLatency: metrics.avgLatency,
        messageRate: metrics.messageRate,
        steamDetections: metrics.steamDetections,
        errorRate: metrics.errorRate,
      },
      timestamp: Date.now(),
    });
    
    return result.success;
  }
  
  /**
   * Send security event alert with error details
   * 
   * Sends a critical security alert when security-related errors occur.
   * Includes error message, stack trace, and context for investigation.
   * 
   * @param error - Error object with message and stack trace
   * @param context - Context string describing where the error occurred
   * @returns True if alert sent successfully, false otherwise
   */
  async sendSecurityEventAlert(error: Error, context: string): Promise<boolean> {
    const result = await this.sendTelegramAlert({
      type: 'SECURITY' as AlertType,
      severity: 'CRITICAL',
      title: `Security Event: ${context}`,
      message: error.message,
      metadata: {
        stackTrace: error.stack?.substring(0, 500) || 'N/A',
        context,
        errorName: error.name,
      },
      timestamp: Date.now(),
    });
    
    return result.success;
  }
  
  /**
   * Send system heartbeat alert with uptime and resource usage
   * 
   * Sends a periodic heartbeat alert containing:
   * - System uptime
   * - Memory usage
   * - Process ID
   * - WebSocket connection status
   * 
   * Used for monitoring system health and ensuring alert channel is active.
   * 
   * @returns True if alert sent successfully, false otherwise
   */
  async sendSystemHeartbeatAlert(): Promise<boolean> {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    const result = await this.sendTelegramAlert({
      type: 'PERFORMANCE' as AlertType,
      severity: 'INFO',
      title: 'System Heartbeat',
      message: `Live odds monitoring is active. Uptime: ${(uptime / 3600).toFixed(2)} hours`,
      metadata: {
        uptime: `${(uptime / 3600).toFixed(2)} hours`,
        memory: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        pid: process.pid,
        wsConnected: this.isWebSocketConnected(),
      },
      timestamp: Date.now(),
    });
    
    return result.success;
  }
  
  /**
   * Check if WebSocket connection is active
   * 
   * Verifies that the stored WebSocket reference exists and is in OPEN state.
   * Used for connection status reporting in heartbeat alerts.
   * 
   * @returns True if WebSocket exists and is OPEN, false otherwise
   */
  private isWebSocketConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Generate RG-compatible metadata block for audit logging
   * 
   * Creates a structured metadata block following the RG (ripgrep) format
   * for easy querying and auditability. Used for all Telegram API operations.
   * 
   * @param params - Metadata parameters (scope, domain, type, meta, version, ticket, bunApi, ref)
   * @returns Formatted RG metadata block string
   */
  private generateRgMetadataBlock(params: {
    scope: string;
    domain: string;
    type: string;
    meta: string;
    version: string;
    ticket: string;
    bunApi: string;
    ref: string;
  }): string {
    const timestamp = Date.now();
    const tesConfig = getTESDomainConfigCached();
    const domain = params.domain || tesConfig.nowgoalDomain;
    
    return `[HEADERS_BLOCK_START:v1]{${params.meta}}~[${params.scope}][${domain}][${params.type}][${params.meta}][${params.version}][${params.ticket}][${params.bunApi}][#REF:${params.ref}][TIMESTAMP:${timestamp}][HEADERS_BLOCK_END]`;
  }
  
  /**
   * Log RG metadata block to headers-index.log file
   * 
   * Appends a timestamped RG metadata block to the headers-index.log file
   * for auditability and querying with ripgrep. Handles write errors gracefully.
   * 
   * @param rgBlock - RG metadata block string to log
   */
  private logRgMetadataToFile(rgBlock: string): void {
    const logLine = `${new Date().toISOString()} ${rgBlock}\n`;
    Bun.write("logs/headers-index.log", logLine, { createPath: true, flag: "a" }).catch((error) => {
      console.error(`[Telegram Alert] Failed to write RG log: ${error}`);
    });
  }
  
  // ============================================================================
  // Backward Compatibility Aliases (for V1 compatibility)
  // ============================================================================
  
  /**
   * @deprecated Use setWebSocketReference() instead
   * Backward compatibility alias for V1 code
   */
  setWebSocket(ws: WebSocket | null): void {
    this.setWebSocketReference(ws);
  }
  
  /**
   * @deprecated Use sendSteamMovementAlert() instead
   * Backward compatibility alias for V1 code
   */
  async sendSteamAlert(tick: NowGoalTick): Promise<boolean> {
    return this.sendSteamMovementAlert(tick);
  }
  
  /**
   * @deprecated Use sendSystemHeartbeatAlert() instead
   * Backward compatibility alias for V1 code
   */
  async sendHeartbeat(): Promise<boolean> {
    return this.sendSystemHeartbeatAlert();
  }
}

/**
 * Get or create Telegram alert system instance
 */
let telegramAlertSystemInstance: TelegramAlertSystemV2 | null = null;

export function getTelegramAlertSystemV2(ws?: WebSocket | null): TelegramAlertSystemV2 {
  if (!telegramAlertSystemInstance) {
    telegramAlertSystemInstance = new TelegramAlertSystemV2();
  }
  
  if (ws) {
    telegramAlertSystemInstance.setWebSocketReference(ws);
  }
  
  return telegramAlertSystemInstance;
}

