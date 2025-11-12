/**
 * Telegram Alert System - TES-NGWS-001.12
 * 
 * Telegram Bot API integration for TES Sentinel alerts with rg-compatible audit logging.
 * Uses supergroup topics for organized, scalable alerting.
 * 
 * @module src/lib/telegram-alert-system
 */

import { NowGoalTick } from "../models/nowgoal-tick.ts";
import { getTESDomainConfigCached } from "../config/tes-domain-config.ts";

/**
 * Telegram configuration
 */
export interface TelegramConfig {
  /**
   * Bot token from @BotFather
   */
  botToken: string;
  
  /**
   * Supergroup ID (negative number for supergroups)
   */
  supergroupId: string;
  
  /**
   * Topic IDs for different alert types
   */
  topicIds: {
    steam: string;
    performance: string;
    security: string;
    errors: string;
    heartbeat: string;
  };
}

/**
 * RG metadata generator for Telegram events
 */
export function generateRgBlock(params: {
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
 * Log RG metadata to headers-index.log
 */
export function logHeadersForRg(rgBlock: string): void {
  const logLine = `${new Date().toISOString()} ${rgBlock}\n`;
  Bun.write("logs/headers-index.log", logLine, { createPath: true, flag: "a" }).catch((error) => {
    console.error(`[Telegram Alert] Failed to write RG log: ${error}`);
  });
}

/**
 * Telegram Alert System
 * 
 * Sends alerts to Telegram supergroup topics with rg-compatible audit logging.
 */
export class TelegramAlertSystem {
  private apiUrl: string;
  private ws: WebSocket | null = null;
  
  constructor(private config: TelegramConfig) {
    this.apiUrl = `https://api.telegram.org/bot${config.botToken}`;
    
    // Log configuration with rg metadata
    this.logConfig();
  }
  
  /**
   * Log configuration with rg metadata
   */
  private logConfig(): void {
    const rgBlock = generateRgBlock({
      scope: "CONFIG",
      domain: "telegram.org",
      type: "INIT",
      meta: "TELEGRAM_CONFIG_LOADED",
      version: "TELEGRAM-API-V1",
      ticket: "TES-NGWS-001.12",
      bunApi: "TelegramAlertSystem",
      ref: `supergroup:${this.config.supergroupId}`
    });
    
    logHeadersForRg(rgBlock);
    console.log(`[TELEGRAM_CONFIG] Supergroup: ${this.config.supergroupId}`);
  }
  
  /**
   * Set WebSocket reference for connection status checks
   */
  setWebSocket(ws: WebSocket | null): void {
    this.ws = ws;
  }
  
  /**
   * Send steam alert to Telegram steam topic
   */
  async sendSteamAlert(tick: NowGoalTick): Promise<void> {
    const message = this.formatSteamMessage(tick);
    const topicId = this.config.topicIds.steam;
    
    const rgBlock = generateRgBlock({
      scope: "ALERT",
      domain: "telegram.org",
      type: "NOTIFICATION",
      meta: "STEAM_ALERT_SENT",
      version: "TELEGRAM-API-V1",
      ticket: "TES-NGWS-001.12",
      bunApi: "TelegramBotAPI",
      ref: `chat:${this.config.supergroupId}|topic:${topicId}|gameId:${tick.gameId}`
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
          chat_id: this.config.supergroupId,
          message_thread_id: parseInt(topicId),
          text: message,
          parse_mode: "Markdown",
          disable_notification: false, // Always notify for steam
        }),
      });
      
      const result = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (result.ok) {
        const successRgBlock = generateRgBlock({
          scope: "ALERT",
          domain: "telegram.org",
          type: "SUCCESS",
          meta: "TELEGRAM_SENT",
          version: "TELEGRAM-API-V1",
          ticket: "TES-NGWS-001.12",
          bunApi: "TelegramBotAPI",
          ref: `message_id:${result.result.message_id}|responseTime:${responseTime}ms|gameId:${tick.gameId}`
        });
        
        logHeadersForRg(successRgBlock);
        console.log(`[TELEGRAM_SENT] message_id:${result.result.message_id} | topic:${topicId} | ${responseTime}ms`);
      } else {
        throw new Error(result.description || `HTTP ${response.status}`);
      }
    } catch (error) {
      const failureRgBlock = generateRgBlock({
        scope: "ALERT",
        domain: "telegram.org",
        type: "ERROR",
        meta: "TELEGRAM_SEND_FAILED",
        version: "TELEGRAM-API-V1",
        ticket: "TES-NGWS-001.12",
        bunApi: "TelegramBotAPI",
        ref: `error:${error instanceof Error ? error.message : String(error)}|gameId:${tick.gameId}`
      });
      
      logHeadersForRg(failureRgBlock);
      console.error(`[TELEGRAM_FAIL] ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to console alert
      console.error(`[STEAM_ALERT_FALLBACK] ${message}`);
    }
  }
  
  /**
   * Format steam alert message with Markdown
   */
  private formatSteamMessage(tick: NowGoalTick): string {
    const velocity = (tick.newValue - tick.oldValue).toFixed(4);
    const velocityAbs = Math.abs(parseFloat(velocity));
    const emoji = velocityAbs > 0.1 ? "🚨" : "⚠️";
    
    return [
      `${emoji} **STEAM ALERT** | ${tick.market.league}`,
      "",
      `📊 **Game:** ${tick.market.homeTeam} vs ${tick.market.awayTeam}`,
      `🎲 **Odds:** ${tick.oldValue} → **${tick.newValue}**`,
      `⚡ **Velocity:** ${velocity}`,
      `🏦 **Bookmaker:** ${tick.bookmakerId}`,
      `📈 **Type:** ${tick.oddsType}`,
      `⏱️ **Time:** ${new Date(tick.timestamp).toLocaleTimeString()}`,
      "",
      `[View Game](https://live.nowgoal26.com/basketball/${tick.gameId})`
    ].join("\n");
  }
  
  /**
   * Send heartbeat to Telegram heartbeat topic
   */
  async sendHeartbeat(): Promise<void> {
    const topicId = this.config.topicIds.heartbeat;
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    const message = [
      "💓 **TES Sentinel Heartbeat**",
      "",
      `⏱️ **Uptime:** ${(uptime / 3600).toFixed(2)} hours`,
      `📊 **Memory:** ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      `🔌 **WebSocket:** ${this.isConnected() ? "✅ CONNECTED" : "❌ DISCONNECTED"}`,
      `🆔 **PID:** ${process.pid}`,
    ].join("\n");
    
    const rgBlock = generateRgBlock({
      scope: "MONITOR",
      domain: "telegram.org",
      type: "STATUS",
      meta: "HEARTBEAT",
      version: "TELEGRAM-API-V1",
      ticket: "TES-NGWS-001.12",
      bunApi: "TelegramBotAPI",
      ref: `uptime:${uptime}s|memory:${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
    });
    
    await this.sendMessage(topicId, message, true, rgBlock);
  }
  
  /**
   * Send performance metrics alert
   */
  async sendPerformanceMetrics(metrics: {
    messageRate: number;
    steamDetections: number;
    errorRate: number;
    avgLatency: number;
  }): Promise<void> {
    const topicId = this.config.topicIds.performance;
    
    const message = [
      "📈 **Performance Metrics**",
      "",
      `📊 **Message Rate:** ${metrics.messageRate.toFixed(2)} msg/s`,
      `🚨 **Steam Detections:** ${metrics.steamDetections}`,
      `❌ **Error Rate:** ${metrics.errorRate.toFixed(2)}%`,
      `⏱️ **Avg Latency:** ${metrics.avgLatency.toFixed(2)} ms`,
    ].join("\n");
    
    const rgBlock = generateRgBlock({
      scope: "MONITOR",
      domain: "telegram.org",
      type: "METRICS",
      meta: "PERFORMANCE_METRICS",
      version: "TELEGRAM-API-V1",
      ticket: "TES-NGWS-001.12",
      bunApi: "TelegramBotAPI",
      ref: `msgRate:${metrics.messageRate}|steam:${metrics.steamDetections}`
    });
    
    await this.sendMessage(topicId, message, true, rgBlock);
  }
  
  /**
   * Send security event alert
   */
  async sendSecurityEvent(
    event: string,
    details: Record<string, any>
  ): Promise<void> {
    const topicId = this.config.topicIds.security;
    
    const detailsText = Object.entries(details)
      .map(([key, value]) => `**${key}:** ${value}`)
      .join("\n");
    
    const message = [
      "🔐 **Security Event**",
      "",
      `**Event:** ${event}`,
      "",
      detailsText,
    ].join("\n");
    
    const rgBlock = generateRgBlock({
      scope: "SECURITY",
      domain: "telegram.org",
      type: "ALERT",
      meta: "SECURITY_EVENT",
      version: "TELEGRAM-API-V1",
      ticket: "TES-NGWS-001.12",
      bunApi: "TelegramBotAPI",
      ref: `event:${event}`
    });
    
    await this.sendMessage(topicId, message, false, rgBlock);
  }
  
  /**
   * Send error alert
   */
  async sendError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const topicId = this.config.topicIds.errors;
    
    const contextText = context 
      ? "\n\n**Context:**\n" + Object.entries(context)
          .map(([key, value]) => `**${key}:** ${value}`)
          .join("\n")
      : "";
    
    const message = [
      "🐛 **System Error**",
      "",
      `**Error:** ${error.message}`,
      `**Stack:** \`\`\`${error.stack?.substring(0, 200)}...\`\`\``,
      contextText,
    ].join("\n");
    
    const rgBlock = generateRgBlock({
      scope: "ERROR",
      domain: "telegram.org",
      type: "ALERT",
      meta: "ERROR_ALERT",
      version: "TELEGRAM-API-V1",
      ticket: "TES-NGWS-001.12",
      bunApi: "TelegramBotAPI",
      ref: `error:${error.message}`
    });
    
    await this.sendMessage(topicId, message, false, rgBlock);
  }
  
  /**
   * Send message to Telegram topic
   */
  private async sendMessage(
    topicId: string,
    text: string,
    silent: boolean,
    rgMetadata: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-TES-Metadata": rgMetadata
        },
        body: JSON.stringify({
          chat_id: this.config.supergroupId,
          message_thread_id: parseInt(topicId),
          text,
          parse_mode: "Markdown",
          disable_notification: silent,
        }),
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(result.description || `HTTP ${response.status}`);
      }
      
      logHeadersForRg(rgMetadata);
    } catch (error) {
      const failureRgBlock = generateRgBlock({
        scope: "ALERT",
        domain: "telegram.org",
        type: "ERROR",
        meta: "TELEGRAM_SEND_FAILED",
        version: "TELEGRAM-API-V1",
        ticket: "TES-NGWS-001.12",
        bunApi: "TelegramBotAPI",
        ref: `error:${error instanceof Error ? error.message : String(error)}|topic:${topicId}`
      });
      
      logHeadersForRg(failureRgBlock);
      console.error(`[TELEGRAM_FAIL] Topic ${topicId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Check if WebSocket is connected
   */
  private isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Get or create Telegram alert system from environment variables
 */
export function getTelegramAlertSystem(ws?: WebSocket | null): TelegramAlertSystem | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supergroupId = process.env.TELEGRAM_SUPERGROUP_ID;
  
  if (!botToken || !supergroupId) {
    console.warn("[Telegram] Bot token or supergroup ID not configured. Telegram alerts disabled.");
    return null;
  }
  
  const system = new TelegramAlertSystem({
    botToken,
    supergroupId,
    topicIds: {
      steam: process.env.TELEGRAM_TOPIC_STEAM || "1",
      performance: process.env.TELEGRAM_TOPIC_PERFORMANCE || "2",
      security: process.env.TELEGRAM_TOPIC_SECURITY || "3",
      errors: process.env.TELEGRAM_TOPIC_ERRORS || "4",
      heartbeat: process.env.TELEGRAM_TOPIC_HEARTBEAT || "5",
    },
  });
  
  if (ws) {
    system.setWebSocket(ws);
  }
  
  return system;
}

