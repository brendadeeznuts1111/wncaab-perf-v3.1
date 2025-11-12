/**
 * Example: Live Poller with Telegram Alerts - TES-NGWS-001.12
 * 
 * Example integration showing how to use TelegramAlertSystemV2 with a live poller.
 * This demonstrates the complete alert flow for Goaloo901 or similar polling systems.
 * 
 * @module examples/live-poller-telegram-integration
 */

import { TelegramAlertSystemV2 } from "../src/lib/telegram-alert-system-v2.ts";
import { AlertSeverity } from "../src/config/telegram-channels-v2.ts";

/**
 * Example metrics interface
 */
interface PollerMetrics {
  totalPolls: number;
  inserts: number;
  duplicates: number;
  totalLatency: number;
  activeMatches: number;
}

/**
 * Example movement interface
 */
interface Movement {
  type: string;
  line: number;
  movement: string;
  lineMovement: 'up' | 'down' | 'stable';
  scoreHome?: number;
  scoreAway?: number;
}

/**
 * Example Live Poller with Telegram Integration
 */
export class ExampleLivePoller {
  private alerts: TelegramAlertSystemV2;
  private metrics: PollerMetrics = {
    totalPolls: 0,
    inserts: 0,
    duplicates: 0,
    totalLatency: 0,
    activeMatches: 0,
  };
  private matchId: number;
  private interval: number | null = null;
  
  constructor(config: { matchId: number }) {
    this.matchId = config.matchId;
    this.alerts = new TelegramAlertSystemV2();
  }
  
  /**
   * Poll once and process movements
   */
  async pollOnce(): Promise<{ success: boolean; inserted: number; movements: Movement[] }> {
    const startTime = Date.now();
    
    try {
      // Simulate fetching odds data
      // In real implementation, this would call Goaloo901 parser
      const movements = this.detectMovements(/* currentData, prevData */);
      
      // Process significant movements
      for (const movement of movements) {
        // Alert on significant line moves (≥0.5 points)
        if (movement.lineMovement !== 'stable' && Math.abs(movement.line) >= 0.5) {
          await this.alerts.sendSteamAlertWithMovement(this.matchId, {
            ...movement,
            scoreHome: 0, // From actual data
            scoreAway: 0, // From actual data
          });
        }
      }
      
      // Update metrics
      this.metrics.totalPolls++;
      this.metrics.inserts += movements.length;
      this.metrics.totalLatency += (Date.now() - startTime);
      
      // Send performance alert every 100 polls
      if (this.metrics.totalPolls % 100 === 0) {
        await this.alerts.sendPerformanceAlert({
          totalPolls: this.metrics.totalPolls,
          inserts: this.metrics.inserts,
          duplicates: this.metrics.duplicates,
          avgLatency: Math.round(this.metrics.totalLatency / this.metrics.totalPolls),
          activeMatches: this.metrics.activeMatches,
        });
      }
      
      return { success: true, inserted: movements.length, movements };
      
    } catch (error) {
      await this.alerts.sendSecurityAlert(
        error instanceof Error ? error : new Error(String(error)),
        `Match ${this.matchId} poll exception`
      );
      return { success: false, inserted: 0, movements: [] };
    }
  }
  
  /**
   * Start polling
   */
  start(config: { intervalMs: number; durationMs?: number }): void {
    console.log(`🚀 Starting live poller for match ${this.matchId}`);
    
    // Send initial heartbeat
    this.alerts.sendHeartbeat().catch(console.error);
    
    // Initial poll
    this.pollOnce().catch(console.error);
    
    // Set up interval
    this.interval = setInterval(() => {
      this.pollOnce().catch(console.error);
    }, config.intervalMs) as unknown as number;
    
    // Auto-stop after duration if specified
    if (config.durationMs) {
      setTimeout(() => this.stop(), config.durationMs);
    }
  }
  
  /**
   * Stop polling
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      
      console.log(`⏹️  Stopped poller for match ${this.matchId}`);
      
      // Send final performance report
      this.alerts.sendPerformanceAlert({
        totalPolls: this.metrics.totalPolls,
        inserts: this.metrics.inserts,
        duplicates: this.metrics.duplicates,
        avgLatency: this.metrics.totalPolls > 0 
          ? Math.round(this.metrics.totalLatency / this.metrics.totalPolls)
          : 0,
        activeMatches: this.metrics.activeMatches,
      }).catch(console.error);
    }
  }
  
  /**
   * Detect movements (example implementation)
   */
  private detectMovements(): Movement[] {
    // Example: Return mock movements
    // In real implementation, compare current vs previous data
    return [
      {
        type: 'spread',
        line: -4.0,
        movement: 'up',
        lineMovement: 'up',
        scoreHome: 0,
        scoreAway: 0,
      },
    ];
  }
}

/**
 * Example usage
 */
if (import.meta.main) {
  const poller = new ExampleLivePoller({ matchId: 663637 });
  
  // Start polling every 2 seconds
  poller.start({ 
    intervalMs: 2000,
    durationMs: 4 * 60 * 60 * 1000 // 4 hours
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down poller...');
    poller.stop();
    process.exit(0);
  });
}

