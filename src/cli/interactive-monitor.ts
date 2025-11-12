/**
 * Interactive NowGoal WebSocket Monitor - TES-NGWS-001.12
 * 
 * Interactive monitoring tool using Bun's console stdin reading feature.
 * Allows real-time command input while monitoring WebSocket data.
 * 
 * @module src/cli/interactive-monitor
 */

import { connectNowGoalWebSocket } from "../lib/nowgoal-websocket.ts";
import { SteamPatternAnalyzer } from "../lib/steam-pattern-analyzer.ts";
import { NowGoalTick } from "../models/nowgoal-tick.ts";

/**
 * Interactive monitoring statistics
 */
interface MonitorStats {
  totalMessages: number;
  steamDetections: number;
  lastSteamTime: number | null;
  startTime: number;
}

/**
 * Interactive monitor commands
 */
type MonitorCommand = 
  | "stats" 
  | "steam" 
  | "verbose" 
  | "quiet" 
  | "help" 
  | "exit" 
  | "clear";

/**
 * Interactive NowGoal WebSocket Monitor
 */
class InteractiveMonitor {
  private stats: MonitorStats = {
    totalMessages: 0,
    steamDetections: 0,
    lastSteamTime: null,
    startTime: Date.now(),
  };
  private verbose = false;
  private wsManager: any = null;

  /**
   * Display help message
   */
  private showHelp(): void {
    console.log('\n📋 Interactive Monitor Commands:');
    console.log('  stats    - Show monitoring statistics');
    console.log('  steam    - Show recent steam detections');
    console.log('  verbose  - Toggle verbose logging');
    console.log('  quiet    - Toggle quiet mode (errors only)');
    console.log('  clear    - Clear console');
    console.log('  help     - Show this help message');
    console.log('  exit     - Exit monitor\n');
  }

  /**
   * Display statistics
   */
  private showStats(): void {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const msgRate = this.stats.totalMessages > 0 
      ? (this.stats.totalMessages / uptime).toFixed(2) 
      : '0';
    
    console.log('\n📊 Monitor Statistics:');
    console.log(`  Uptime: ${uptime}s`);
    console.log(`  Total Messages: ${this.stats.totalMessages}`);
    console.log(`  Message Rate: ${msgRate} msg/s`);
    console.log(`  Steam Detections: ${this.stats.steamDetections}`);
    if (this.stats.lastSteamTime) {
      const timeSince = Math.floor((Date.now() - this.stats.lastSteamTime) / 1000);
      console.log(`  Last Steam: ${timeSince}s ago`);
    }
    console.log(`  Verbose Mode: ${this.verbose ? 'ON' : 'OFF'}\n`);
  }

  /**
   * Handle command input
   */
  private async handleCommand(command: string): Promise<void> {
    const cmd = command.trim().toLowerCase() as MonitorCommand;

    switch (cmd) {
      case "stats":
        this.showStats();
        break;
      
      case "steam":
        console.log(`\n🚨 Steam Detections: ${this.stats.steamDetections}`);
        if (this.stats.lastSteamTime) {
          const timeSince = Math.floor((Date.now() - this.stats.lastSteamTime) / 1000);
          console.log(`   Last detected: ${timeSince}s ago\n`);
        } else {
          console.log('   No steam detected yet\n');
        }
        break;
      
      case "verbose":
        this.verbose = !this.verbose;
        console.log(`\n${this.verbose ? '✅' : '🔇'} Verbose mode: ${this.verbose ? 'ON' : 'OFF'}\n`);
        break;
      
      case "quiet":
        this.verbose = false;
        console.log('\n🔇 Quiet mode enabled (errors only)\n');
        break;
      
      case "clear":
        console.clear();
        break;
      
      case "help":
        this.showHelp();
        break;
      
      case "exit":
        console.log('\n🛑 Shutting down monitor...');
        if (this.wsManager) {
          this.wsManager.close(1000, 'Interactive monitor exit');
        }
        process.exit(0);
        break;
      
      default:
        if (command.trim()) {
          console.log(`\n❓ Unknown command: "${command}". Type "help" for commands.\n`);
        }
    }
  }

  /**
   * Start interactive monitoring
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Interactive NowGoal WebSocket Monitor');
    console.log('📝 Type "help" for commands, "exit" to quit\n');

    // Initialize analyzer
    const analyzer = new SteamPatternAnalyzer();

    // Connect to WebSocket
    this.wsManager = await connectNowGoalWebSocket(
      {
        wsUrl: 'wss://www.nowgoal26.com:9800/stream',
        channels: ['nba_change_xml', 'ch_nbaGoal8_xml'],
        reconnect: {
          initialDelay: 1000,
          maxDelay: 60000,
          multiplier: 2,
          maxRetries: Infinity,
        },
        heartbeatInterval: 30000,
      },
      {
        onOpen: (ws) => {
          console.log('✅ Connected to NowGoal WebSocket\n');
        },
        
        onMessage: (tick: NowGoalTick, ws) => {
          this.stats.totalMessages++;
          
          if (this.verbose) {
            console.log(`📨 [${this.stats.totalMessages}] Tick:`, tick);
          }
          
          // Analyze for steam patterns
          if (analyzer.detectSteam(tick)) {
            this.stats.steamDetections++;
            this.stats.lastSteamTime = Date.now();
            
            console.log(`\n🚨 STEAM DETECTED #${this.stats.steamDetections}`);
            console.log(`   Game: ${tick.market.homeTeam} vs ${tick.market.awayTeam}`);
            console.log(`   League: ${tick.market.league}`);
            console.log(`   Odds: ${tick.oldValue} → ${tick.newValue}`);
            console.log(`   Velocity: ${Math.abs(tick.newValue - tick.oldValue).toFixed(4)}\n`);
          }
        },
        
        onError: (error, ws) => {
          console.error('❌ WebSocket error:', error);
        },
        
        onClose: (code, reason, ws) => {
          console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        },
        
        onReconnect: (attempt, delay) => {
          console.log(`🔄 Reconnecting (attempt ${attempt}) in ${delay}ms`);
        },
      }
    );

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      this.wsManager?.close(1000, 'SIGINT');
      process.exit(0);
    });

    // Interactive command loop using Bun's console stdin reading
    console.write('> ');
    for await (const line of console) {
      await this.handleCommand(line);
      console.write('> ');
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  const monitor = new InteractiveMonitor();
  monitor.start().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

