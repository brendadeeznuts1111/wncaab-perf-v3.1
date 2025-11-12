/**
 * Total Market Poller - TES-NGWS-001.13
 * 
 * Polls Goaloo901 flashdata API for total line movements and sends Telegram alerts.
 * 
 * @module src/pollers/total-market-poller
 */

import { Database } from 'bun:sqlite';
import { GoalooLiveParser, type FlashDataResponse } from '../parsers/goaloo-live-parser.ts';
import { TotalMovementDetector, type TotalMovement } from '../detectors/total-movement-detector.ts';
import { TelegramAlertSystemV2 } from '../lib/telegram-alert-system-v2.ts';
import type { TelegramAlert } from '../config/telegram-config.ts';
import { getChannel } from '../config/telegram-config.ts';

/**
 * Total Market Poller
 * 
 * Polls Goaloo901 API for live total line odds and detects significant movements.
 * Stores movements in SQLite database and sends Telegram alerts with auto-pinning.
 */
export class TotalMarketPoller {
  private db: Database;
  private parser: GoalooLiveParser;
  private alerts: TelegramAlertSystemV2;
  private detector: TotalMovementDetector;
  private matchId: number;
  private interval: number | null = null;
  private prevData: FlashDataResponse | null = null;
  
  // Enhanced tracking for actionable alerts
  private openingLine?: number; // Initial total line at poll start
  private tickCount = 0; // Number of ticks since opening or last alert
  private lastAlertTime?: number; // Timestamp of last alert (for tick reset)
  
  // Metrics tracking
  public metrics = {
    polls: 0,
    inserts: 0,
    errors: 0,
    alerts: 0,
    pinned: 0,
    lastPollTime: 0,
    lastErrorTime: 0,
  };

  /**
   * Create a new total market poller
   * 
   * @param matchId - Match ID to poll
   */
  constructor(matchId: number) {
    this.matchId = matchId;
    this.parser = new GoalooLiveParser();
    this.alerts = new TelegramAlertSystemV2();
    this.detector = new TotalMovementDetector(0.5); // 0.5 point threshold

    // Initialize SQLite database
    this.db = new Database('odds-movements.db');
    this.initializeSchema();
  }

  /**
   * Initialize database schema for total movements
   */
  private initializeSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS total_movements (
        movement_id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        line_previous REAL,
        line_current REAL,
        line_movement REAL,
        over_previous REAL,
        over_current REAL,
        over_change_percent REAL,
        under_previous REAL,
        under_current REAL,
        under_change_percent REAL,
        steam_index REAL,
        score_home INTEGER,
        score_away INTEGER,
        data_hash TEXT UNIQUE
      )
    `);

    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_total_timestamp ON total_movements(timestamp DESC)`
    );
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_total_steam ON total_movements(steam_index DESC)`
    );
  }

  /**
   * Perform a single poll cycle
   * 
   * Fetches flashdata, detects movements, stores in database, and sends alerts.
   */
  async pollOnce(): Promise<void> {
    const startTime = Date.now();
    this.metrics.polls++;
    this.metrics.lastPollTime = startTime;
    
    try {
      const flashdata = await this.parser.parseFlashdata(this.matchId);

      if (!flashdata || !flashdata.odds.total) {
        return;
      }

      // Capture providers (bookmaker/operator sources)
      const providers = flashdata.odds.total.providers || ['Unknown'];

      // Track opening line (set once on first poll with valid data)
      if (this.openingLine === undefined && flashdata.odds.total.line !== undefined) {
        this.openingLine = flashdata.odds.total.line;
        console.log(`[Poller ${this.matchId}] 📊 Opening line set: ${this.openingLine}`);
      }

      // Increment tick count
      this.tickCount++;

      // Optional: Reset tick count if >5 minutes since last alert (new session)
      if (this.lastAlertTime && startTime - this.lastAlertTime > 300000) {
        this.tickCount = 1; // Reset to current as "new session"
      }

      // Detect movement with enhanced context
      const movement = this.detector.detectMovement(
        flashdata,
        this.prevData,
        providers,
        this.openingLine,
        this.tickCount
      );
      this.prevData = flashdata;

      if (movement) {
        // Store in database
        await this.storeMovement(movement);
        this.metrics.inserts++;

        // Send Telegram alert with auto-pin for major moves
        const { alertSent, pinned } = await this.sendSteamAlertWithAutoPin(movement);
        
        if (alertSent) {
          this.metrics.alerts++;
          this.lastAlertTime = startTime; // Track alert time for tick reset
        }
        if (pinned) {
          this.metrics.pinned++;
        }

        // Console log with second precision
        const timestamp = new Date(movement.timestamp).toISOString();
        console.log(
          `[${timestamp}] 📊 Total: ${movement.linePrevious}→${movement.lineCurrent} | Index: ${movement.steamIndex.toFixed(2)}${pinned ? ' 📌' : ''}`
        );
      }
    } catch (error) {
      this.metrics.errors++;
      this.metrics.lastErrorTime = Date.now();
      console.error(`[Poller ${this.matchId}] Poll error:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Store movement in database with deduplication
   * 
   * @param movement - Movement data to store
   */
  private async storeMovement(movement: TotalMovement): Promise<void> {
    // Use Bun's built-in crypto for hashing
    const hashInput = `${this.matchId}-${movement.timestamp}-${movement.lineCurrent}`;
    const hash = Bun.hash(hashInput).toString(16);

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO total_movements (
        match_id, timestamp, line_previous, line_current, line_movement,
        over_previous, over_current, over_change_percent,
        under_previous, under_current, under_change_percent,
        steam_index, score_home, score_away, data_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      this.matchId,
      movement.timestamp,
      movement.linePrevious,
      movement.lineCurrent,
      movement.lineMovement,
      movement.overPrevious,
      movement.overCurrent,
      movement.overChangePercent,
      movement.underPrevious,
      movement.underCurrent,
      movement.underChangePercent,
      movement.steamIndex,
      movement.scoreHome,
      movement.scoreAway,
      hash
    );
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
      console.warn(`[Poller ${this.matchId}] Timezone conversion failed, using UTC:`, error);
      return new Date(timestamp).toISOString();
    }
  }

  /**
   * Send steam movement alert with automatic pinning for critical moves
   * 
   * @param movement - The detected total movement
   * @returns Object with alert status and pin status
   */
  private async sendSteamAlertWithAutoPin(
    movement: TotalMovement
  ): Promise<{ alertSent: boolean; pinned: boolean }> {
    // Format percentage change (e.g., -1.2% on over odds)
    const overChange =
      movement.overChangePercent !== null
        ? `(${movement.overChangePercent > 0 ? '+' : ''}${movement.overChangePercent.toFixed(1)}%)`
        : '';
    const underChange =
      movement.underChangePercent !== null
        ? `(${movement.underChangePercent > 0 ? '+' : ''}${movement.underChangePercent.toFixed(1)}%)`
        : '';

    // Format providers/bookmakers
    const providersDisplay = movement.providers && movement.providers.length > 0
      ? movement.providers.join(', ')
      : 'Unknown';

    // Format line movement (use opening line if available, otherwise previous)
    const lineFrom = movement.openingLine !== undefined 
      ? `${movement.openingLine} (opening)`
      : movement.linePrevious.toString();
    const lineMovementDisplay = movement.openingLine !== undefined
      ? `${movement.openingLine} → ${movement.lineCurrent} (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)} from opening)`
      : `${movement.linePrevious} → ${movement.lineCurrent} (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)})`;

    const alert: TelegramAlert = {
      type: 'STEAM_ALERTS',
      severity: Math.abs(movement.lineMovement) >= 1 ? 'CRITICAL' : 'WARNING',
      title: `Total Line Steam: ${movement.linePrevious} → ${movement.lineCurrent}`,
      message: `<b>🚨 TOTAL LINE STEAM</b>
<b>Match ID:</b> ${this.matchId}
<b>Time (NY):</b> ${this.formatNYTime(movement.timestamp)}
<b>Time (UTC):</b> ${new Date(movement.timestamp).toISOString()}
<b>Bookmaker(s):</b> ${providersDisplay}
<b>Opening Line:</b> ${movement.openingLine !== undefined ? movement.openingLine.toFixed(1) : 'N/A'}
<b>Tick Count:</b> ${movement.tickCount ?? 0}
<b>Line Movement:</b> ${lineMovementDisplay}
<b>Over Odds:</b> ${movement.overPrevious} ${overChange} → ${movement.overCurrent}
<b>Under Odds:</b> ${movement.underPrevious} ${underChange} → ${movement.underCurrent}
<b>Steam Index:</b> <code>${movement.steamIndex.toFixed(2)}</code>
<b>Score:</b> ${movement.scoreHome}-${movement.scoreAway}`,
      metadata: {
        matchId: this.matchId,
        lineMovement: movement.lineMovement,
        steamIndex: movement.steamIndex,
        timestamp: movement.timestamp,
        providers: movement.providers,
        openingLine: movement.openingLine,
        tickCount: movement.tickCount,
      },
      timestamp: movement.timestamp,
    };

    // Send alert using V2 system (which returns message ID)
    const result = await this.alerts.sendTelegramAlert(alert);

    // Auto-pin for major movements (≥1 point or steam index > 2.0)
    let pinned = false;
    if (
      result.success &&
      result.messageId &&
      (Math.abs(movement.lineMovement) >= 1 || movement.steamIndex > 2.0)
    ) {
      const channel = getChannel('STEAM_ALERTS');
      pinned = await this.alerts.pinTelegramMessage(result.messageId, channel.topicId);

      if (pinned) {
        console.log(`[${this.matchId}] 📌 Pinned critical steam alert (message ${result.messageId})`);
      }
    }

    return { alertSent: result.success, pinned };
  }

  /**
   * Start polling at specified interval
   * 
   * @param intervalMs - Polling interval in milliseconds (default: 2000)
   */
  start(intervalMs: number = 2000): void {
    console.log(`🎯 Starting Total Market Poller for match ${this.matchId}`);

    // Initial poll
    this.pollOnce().catch((error) => {
      console.error(`[Poller ${this.matchId}] Initial poll failed:`, error);
    });

    // Set up interval polling
    this.interval = setInterval(() => {
      this.pollOnce().catch((error) => {
        console.error(`[Poller ${this.matchId}] Poll failed:`, error);
      });
    }, intervalMs) as unknown as number;
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
      console.log(`⏹️  Stopped Total Market Poller for match ${this.matchId}`);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

