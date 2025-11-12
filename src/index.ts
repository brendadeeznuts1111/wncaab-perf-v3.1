/**
 * NowGoal WebSocket Integration - TES-NGWS-001.11
 * 
 * Main entry point for NowGoal WebSocket connection and data pipeline.
 * 
 * @module src/index
 */

import { connectNowGoalWebSocket } from "./lib/nowgoal-websocket.ts";
import { SteamPatternAnalyzer } from "./lib/steam-pattern-analyzer.ts";
import { NowGoalTick } from "./models/nowgoal-tick.ts";
import { getAlertSystem } from "./lib/alert-system.ts";
import { AlertSeverity } from "./lib/alert-system.ts";
import { getTelegramAlertSystem } from "./lib/telegram-alert-system.ts";
import { getTelegramAlertSystemV2 } from "./lib/telegram-alert-system-v2.ts";

/**
 * Main integration function
 */
async function main() {
  console.log('🚀 Starting NowGoal WebSocket integration...');
  
  // Initialize analyzer
  const analyzer = new SteamPatternAnalyzer();
  
  // Initialize Telegram alert system V2 (enhanced with cooldowns)
  // Falls back to V1 if V2 not available
  let telegram: any = null;
  try {
    telegram = getTelegramAlertSystemV2();
    console.log('[Telegram] Using enhanced alert system V2 (with cooldowns)');
  } catch (error) {
    console.warn('[Telegram] V2 not available, trying V1:', error instanceof Error ? error.message : String(error));
    telegram = getTelegramAlertSystem();
  }
  
  // Initialize alert system (will use Telegram if configured)
  let alertSystem = getAlertSystem();
  
  // Notify system startup
  await alertSystem.notifySystemEvent(
    AlertSeverity.INFO,
    "System Startup",
    "NowGoal WebSocket integration started",
    { pid: process.pid }
  );
  
  // Cleanup old ticks every 5 minutes
  setInterval(() => {
    analyzer.cleanup(60000); // 1 minute max age
  }, 300000); // Every 5 minutes
  
  // Telegram heartbeat (every 5 minutes)
  if (telegram) {
    setInterval(() => {
      // Support both V1 and V2 method names
      if (typeof telegram.sendSystemHeartbeatAlert === 'function') {
        telegram.sendSystemHeartbeatAlert().catch((error) => {
          console.error('[Telegram] Heartbeat failed:', error);
        });
      } else if (typeof telegram.sendHeartbeat === 'function') {
        telegram.sendHeartbeat().catch((error) => {
          console.error('[Telegram] Heartbeat failed:', error);
        });
      }
    }, 300000); // Every 5 minutes
  }
  
  // Connect to NowGoal WebSocket
  const wsManager = await connectNowGoalWebSocket(
    {
      wsUrl: 'wss://www.nowgoal26.com:9800/stream', // Actual WebSocket URL
      channels: ['nba_change_xml', 'ch_nbaGoal8_xml'], // NBA channels (use ['change_xml', 'ch_goal8_xml'] for general/WNCAAB)
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
        console.log('✅ Connected to NowGoal WebSocket');
        
        // Update alert system with WebSocket reference
        alertSystem.setWebSocket(ws);
        if (telegram) {
          // Support both V1 and V2 method names
          if (typeof telegram.setWebSocketReference === 'function') {
            telegram.setWebSocketReference(ws);
          } else if (typeof telegram.setWebSocket === 'function') {
            telegram.setWebSocket(ws);
          }
        }
        
        // No need to send subscription message - channels are in URL
        // WebSocket automatically subscribes to channels specified in URL
      },
      
      onMessage: (tick: NowGoalTick, ws) => {
        // Analyze for steam patterns
        if (analyzer.detectSteam(tick)) {
          // Send via enhanced Telegram V2 if available (with cooldowns)
          if (telegram) {
            // Support both V1 and V2 method names
            if (typeof telegram.sendSteamMovementAlert === 'function') {
              telegram.sendSteamMovementAlert(tick).catch((error: Error) => {
                console.error('[Telegram] Steam alert failed:', error.message);
              });
            } else if (typeof telegram.sendSteamAlert === 'function') {
              telegram.sendSteamAlert(tick).catch((error: Error) => {
                console.error('[Telegram] Steam alert failed:', error.message);
              });
            }
          }
          
          // Also send via unified alert system (for fallback channels)
          alertSystem.notifySteamMove(tick);
          
          // Also convert to SteamDataPoint for defensive-bookmaker-detection.ts compatibility
          const steamPoint = analyzer.toSteamDataPoint(tick);
          console.log('📊 Steam detected:', steamPoint);
        }
      },
      
      onError: (error, ws) => {
        console.error('❌ WebSocket error:', error);
        alertSystem.notifySystemEvent(
          AlertSeverity.WARNING,
          "WebSocket Error",
          error.message,
          { error: error.toString() }
        );
      },
      
      onClose: (code, reason, ws) => {
        console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      },
      
      onReconnect: (attempt, delay) => {
        console.log(`🔄 Reconnecting (attempt ${attempt}) in ${delay}ms`);
      },
      
      onParseError: (error, rawXml) => {
        console.error('⚠️ XML parse error:', error);
        console.error('Raw XML preview:', rawXml.substring(0, 200));
      },
    }
  );
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    wsManager.close(1000, 'Graceful shutdown');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    wsManager.close(1000, 'Graceful shutdown');
    process.exit(0);
  });
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

