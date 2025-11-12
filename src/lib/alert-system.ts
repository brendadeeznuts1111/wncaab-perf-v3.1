/**
 * Alert System Integration - TES-NGWS-001.12
 * 
 * Real-time alerting for steam moves and critical events.
 * Supports Telegram, Slack, email, and custom webhook integrations.
 * 
 * @module src/lib/alert-system
 */

import { NowGoalTick } from "../models/nowgoal-tick.ts";
import { getTESDomainConfigCached } from "../config/tes-domain-config.ts";
import { getTelegramAlertSystem, TelegramAlertSystem } from "./telegram-alert-system.ts";

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

/**
 * Alert channel types
 */
export type AlertChannel = "telegram" | "slack" | "email" | "webhook" | "console";

/**
 * Alert configuration
 */
export interface AlertConfig {
  /**
   * Enabled alert channels
   */
  channels: AlertChannel[];
  
  /**
   * Slack webhook URL (if slack channel enabled)
   */
  slackWebhookUrl?: string;
  
  /**
   * Email recipient (if email channel enabled)
   */
  emailRecipient?: string;
  
  /**
   * Custom webhook URL (if webhook channel enabled)
   */
  webhookUrl?: string;
  
  /**
   * Minimum severity to alert (default: WARNING)
   */
  minSeverity?: AlertSeverity;
  
  /**
   * Rate limiting: max alerts per minute (default: 10)
   */
  rateLimit?: number;
}

/**
 * Default alert configuration
 */
const DEFAULT_CONFIG: AlertConfig = {
  channels: ["console"],
  minSeverity: AlertSeverity.WARNING,
  rateLimit: 10,
};

/**
 * Alert rate limiter
 */
class AlertRateLimiter {
  private alerts: number[] = [];
  private readonly windowMs: number = 60000; // 1 minute
  
  constructor(private readonly maxAlerts: number) {}
  
  /**
   * Check if alert should be rate limited
   */
  shouldAllow(): boolean {
    const now = Date.now();
    
    // Remove old alerts outside window
    this.alerts = this.alerts.filter(timestamp => now - timestamp < this.windowMs);
    
    if (this.alerts.length >= this.maxAlerts) {
      return false;
    }
    
    this.alerts.push(now);
    return true;
  }
  
  /**
   * Reset rate limiter
   */
  reset(): void {
    this.alerts = [];
  }
}

/**
 * Alert System
 */
export class AlertSystem {
  private config: AlertConfig;
  private rateLimiter: AlertRateLimiter;
  private telegram: TelegramAlertSystem | null = null;
  
  constructor(config: Partial<AlertConfig> = {}, ws?: WebSocket | null) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rateLimiter = new AlertRateLimiter(this.config.rateLimit || 10);
    
    // Initialize Telegram if enabled
    if (this.config.channels.includes("telegram")) {
      this.telegram = getTelegramAlertSystem(ws || undefined);
    }
  }
  
  /**
   * Set WebSocket reference for Telegram connection status
   */
  setWebSocket(ws: WebSocket | null): void {
    if (this.telegram) {
      this.telegram.setWebSocket(ws);
    }
  }
  
  /**
   * Notify about steam move
   */
  async notifySteamMove(tick: NowGoalTick): Promise<void> {
    // Send to Telegram first (primary channel)
    if (this.telegram) {
      await this.telegram.sendSteamAlert(tick);
    }
    
    // Also send via other channels
    const velocity = Math.abs(tick.newValue - tick.oldValue);
    
    const message = {
      severity: AlertSeverity.CRITICAL,
      title: "🚨 STEAM ALERT",
      text: `${tick.market.league} - ${tick.market.homeTeam} vs ${tick.market.awayTeam}`,
      fields: [
        { name: "Game", value: `${tick.market.homeTeam} vs ${tick.market.awayTeam}`, inline: true },
        { name: "League", value: tick.market.league, inline: true },
        { name: "Odds Type", value: tick.oddsType, inline: true },
        { name: "Odds Change", value: `${tick.oldValue} → ${tick.newValue}`, inline: true },
        { name: "Velocity", value: velocity.toFixed(4), inline: true },
        { name: "Game ID", value: tick.gameId, inline: true },
      ],
      timestamp: tick.timestamp,
      metadata: {
        gameId: tick.gameId,
        bookmakerId: tick.bookmakerId,
        velocity,
      },
    };
    
    await this.sendAlert(message);
  }
  
  /**
   * Notify about system event
   */
  async notifySystemEvent(
    severity: AlertSeverity,
    title: string,
    text: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (this.shouldFilter(severity)) {
      return;
    }
    
    const message = {
      severity,
      title,
      text,
      fields: metadata ? Object.entries(metadata).map(([name, value]) => ({
        name,
        value: String(value),
        inline: true,
      })) : [],
      timestamp: Date.now(),
      metadata: metadata || {},
    };
    
    await this.sendAlert(message);
  }
  
  /**
   * Check if alert should be filtered by severity
   */
  private shouldFilter(severity: AlertSeverity): boolean {
    const minSeverity = this.config.minSeverity || AlertSeverity.WARNING;
    const severityOrder = [AlertSeverity.INFO, AlertSeverity.WARNING, AlertSeverity.CRITICAL];
    
    return severityOrder.indexOf(severity) < severityOrder.indexOf(minSeverity);
  }
  
  /**
   * Send alert to configured channels
   */
  private async sendAlert(message: {
    severity: AlertSeverity;
    title: string;
    text: string;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    timestamp: number;
    metadata: Record<string, any>;
  }): Promise<void> {
    // Rate limiting
    if (!this.rateLimiter.shouldAllow()) {
      console.warn("[ALERT] Rate limit exceeded, skipping alert");
      return;
    }
    
    // Send to each enabled channel (Telegram already sent in notifySteamMove)
    const promises = this.config.channels
      .filter(channel => channel !== "telegram") // Telegram handled separately
      .map(channel => {
        switch (channel) {
          case "slack":
            return this.sendToSlack(message);
          case "email":
            return this.sendToEmail(message);
          case "webhook":
            return this.sendToWebhook(message);
          case "console":
            return this.sendToConsole(message);
          default:
            return Promise.resolve();
        }
      });
    
    await Promise.allSettled(promises);
    
    // Log alert with RG metadata
    this.logAlert(message);
  }
  
  /**
   * Send alert to Slack
   */
  private async sendToSlack(message: {
    severity: AlertSeverity;
    title: string;
    text: string;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    timestamp: number;
  }): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      console.warn("[ALERT] Slack webhook URL not configured");
      return;
    }
    
    const slackMessage = {
      text: `${message.title}: ${message.text}`,
      attachments: [{
        color: message.severity === AlertSeverity.CRITICAL ? "danger" : 
                message.severity === AlertSeverity.WARNING ? "warning" : "good",
        fields: message.fields,
        ts: Math.floor(message.timestamp / 1000),
      }],
    };
    
    try {
      const response = await fetch(this.config.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackMessage),
      });
      
      if (!response.ok) {
        console.error(`[ALERT] Slack webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[ALERT] Slack webhook error:`, error);
    }
  }
  
  /**
   * Send alert to email (placeholder - implement with your email service)
   */
  private async sendToEmail(message: {
    title: string;
    text: string;
    severity: AlertSeverity;
  }): Promise<void> {
    if (!this.config.emailRecipient) {
      console.warn("[ALERT] Email recipient not configured");
      return;
    }
    
    // TODO: Implement email sending (e.g., using SendGrid, AWS SES, etc.)
    console.log(`[ALERT] Email would be sent to ${this.config.emailRecipient}: ${message.title} - ${message.text}`);
  }
  
  /**
   * Send alert to custom webhook
   */
  private async sendToWebhook(message: {
    severity: AlertSeverity;
    title: string;
    text: string;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    timestamp: number;
    metadata: Record<string, any>;
  }): Promise<void> {
    if (!this.config.webhookUrl) {
      console.warn("[ALERT] Webhook URL not configured");
      return;
    }
    
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) {
        console.error(`[ALERT] Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[ALERT] Webhook error:`, error);
    }
  }
  
  /**
   * Send alert to console
   */
  private async sendToConsole(message: {
    severity: AlertSeverity;
    title: string;
    text: string;
    fields: Array<{ name: string; value: string; inline: boolean }>;
  }): Promise<void> {
    const emoji = message.severity === AlertSeverity.CRITICAL ? "🚨" :
                   message.severity === AlertSeverity.WARNING ? "⚠️" : "ℹ️";
    
    console.log(`${emoji} [${message.severity.toUpperCase()}] ${message.title}: ${message.text}`);
    
    if (message.fields.length > 0) {
      message.fields.forEach(field => {
        console.log(`   ${field.name}: ${field.value}`);
      });
    }
  }
  
  /**
   * Log alert with RG metadata
   */
  private logAlert(message: {
    severity: AlertSeverity;
    title: string;
    text: string;
    metadata: Record<string, any>;
  }): void {
    const tesConfig = getTESDomainConfigCached();
    const timestamp = Date.now();
    
    const rgBlock = `[HEADERS_BLOCK_START:v1]{severity:${message.severity}|title:${message.title}}~[ALERT][${tesConfig.nowgoalDomain}][NOTIFICATION][ALERT_SENT][HTTP/1.1][TES-NGWS-001.12][AlertSystem][#REF:${message.metadata.gameId || 'system'}][TIMESTAMP:${timestamp}][HEADERS_BLOCK_END]`;
    
    const logLine = `${new Date().toISOString()} ${rgBlock}\n`;
    Bun.write("logs/headers-index.log", logLine).catch((error) => {
      console.error(`[ALERT] Failed to write RG log: ${error}`);
    });
  }
}

/**
 * Default alert system instance
 */
let defaultAlertSystem: AlertSystem | null = null;

/**
 * Get or create default alert system
 */
export function getAlertSystem(ws?: WebSocket | null): AlertSystem {
  if (!defaultAlertSystem) {
    const config: Partial<AlertConfig> = {};
    
    // Telegram is primary channel if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_SUPERGROUP_ID) {
      config.channels = ["telegram", "console"];
    } else {
      config.channels = ["console"];
    }
    
    // Load from environment variables
    if (process.env.SLACK_WEBHOOK_URL) {
      config.channels = [...(config.channels || []), "slack"];
      config.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    }
    
    if (process.env.ALERT_WEBHOOK_URL) {
      config.channels = [...(config.channels || []), "webhook"];
      config.webhookUrl = process.env.ALERT_WEBHOOK_URL;
    }
    
    defaultAlertSystem = new AlertSystem(config, ws);
  } else if (ws) {
    // Update WebSocket reference if provided
    defaultAlertSystem.setWebSocket(ws);
  }
  
  return defaultAlertSystem;
}

