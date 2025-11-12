/**
 * NowGoal WebSocket Connection Test - Binary Sample Collector
 * 
 * Test script to verify NowGoal WebSocket connection and collect binary samples
 * for protocol analysis.
 * 
 * Usage: 
 *   bun run test-nowgoal-connection.ts > binary-samples.log 2>&1 &
 *   sleep 180  # Run for 3 minutes
 *   kill $!
 * 
 * Then analyze:
 *   rg "\[BINARY_HEX\]" binary-samples.log
 *   rg "1f 8b" binary-samples.log    # gzip
 *   rg "78 9c" binary-samples.log    # zlib
 */

import { connectNowGoalWebSocket } from './src/lib/nowgoal-websocket.ts';
import { parseNowGoalXml } from './src/lib/nowgoal-xml-parser.ts';
import { SteamPatternAnalyzer } from './src/lib/steam-pattern-analyzer.ts';
import { NowGoalProtocolAnalyzer } from './src/lib/protocol-analyzer.ts';
import { NowGoalTick } from './src/models/nowgoal-tick.ts';
import { getTESDomainConfigCached } from './src/config/tes-domain-config.ts';

const analyzer = new SteamPatternAnalyzer();
let messageCount = 0;
let binaryCount = 0;
let xmlCount = 0;

console.log('🚀 Connecting to NowGoal WebSocket...');
console.log('📡 Channels: nba_change_xml, ch_nbaGoal8_xml');
console.log('🔐 JWT will be acquired automatically');
console.log('📊 Binary sample collection enabled\n');

const wsManager = await connectNowGoalWebSocket(
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
      console.log('✅ Connected to NowGoal WebSocket');
      console.log('📊 Ready to receive XML messages\n');
    },
    
    onMessage: async (tick: NowGoalTick, ws) => {
      messageCount++;
      
      console.log(`📨 [${messageCount}] Received tick:`);
      console.log(`  Game ID: ${tick.gameId}`);
      console.log(`  League: ${tick.market.league}`);
      console.log(`  Teams: ${tick.market.homeTeam} vs ${tick.market.awayTeam}`);
      console.log(`  Odds Type: ${tick.oddsType}`);
      console.log(`  Old Value: ${tick.oldValue} → New Value: ${tick.newValue}`);
      console.log(`  Timestamp: ${new Date(tick.timestamp).toISOString()}`);
      
      // Analyze for steam patterns
      if (analyzer.detectSteam(tick)) {
        console.log('🚨 STEAM PATTERN DETECTED!');
        const steamPoint = analyzer.toSteamDataPoint(tick);
        console.log('📊 Steam Data Point:', steamPoint);
        
        // Log steam detection with RG block
        const tesConfig = getTESDomainConfigCached();
        const rgBlock = `[HEADERS_BLOCK_START:v1]{gameId:${tick.gameId}|velocity:${Math.abs(tick.newValue - tick.oldValue).toFixed(4)}}~[ANALYSIS][${tesConfig.nowgoalDomain}][DETECTION][STEAM_PATTERN][BUN-V1.3][TES-NGWS-001.11][SteamPatternAnalyzer][#REF:${tick.bookmakerId}][TIMESTAMP:${Date.now()}][HEADERS_BLOCK_END]`;
        console.log(`[STEAM_DETECTED] ${rgBlock}`);
      }
      
      console.log(''); // Blank line for readability
    },
    
    onError: (error, ws) => {
      console.error('❌ WebSocket error:', error.message);
    },
    
    onClose: (code, reason, ws) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    },
    
    onReconnect: (attempt, delay) => {
      console.log(`🔄 Reconnecting (attempt ${attempt}) in ${delay}ms...`);
    },
    
    onParseError: (error, rawXml) => {
      console.error('⚠️ XML parse error:', error.message);
      console.error('Raw XML preview:', rawXml.substring(0, 200));
    },
  }
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  wsManager.close(1000, 'Test complete');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  wsManager.close(1000, 'Test complete');
  process.exit(0);
});

// Keep running
console.log('⏳ Waiting for messages... (Press Ctrl+C to stop)\n');

// Print statistics every 30 seconds
setInterval(() => {
  console.log(`\n📊 Statistics: Total: ${messageCount} | Binary: ${binaryCount} | XML: ${xmlCount}\n`);
}, 30000);

