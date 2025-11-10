#!/usr/bin/env bun
/**
 * Full Pipeline Command - WebSocket → AI → Strip → Gauge → Edge → Grep (v1.4.2)
 * 
 * Complete pipeline integration for women's sports betting streams
 */

import { autoMaparse } from '../cli/ai-maparse';
import { gaugeWNBATOR, formatGaugeResult } from '../macros/womens-sports-gauge';
import { mapEdgeRelation } from '../macros/tension-map';

// Mock WebSocket stream (replace with real WebSocket in production)
async function* mockWebSocketStream(): AsyncGenerator<string> {
  const mockData = [
    { prices: [100, 102, 105, 110, 118], tensor: { oddsSkew: 0.92, volumeVelocity: 47000, volatilityEntropy: 0.41, timeDecay: 323, momentumCurvature: 0.89 } },
    { prices: [118, 120, 125, 130, 135], tensor: { oddsSkew: 0.88, volumeVelocity: 52000, volatilityEntropy: 0.38, timeDecay: 280, momentumCurvature: 0.85 } },
    { prices: [135, 138, 142, 145, 150], tensor: { oddsSkew: 0.95, volumeVelocity: 61000, volatilityEntropy: 0.45, timeDecay: 200, momentumCurvature: 0.92 } }
  ];
  
  for (const data of mockData) {
    yield JSON.stringify(data);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Pipeline processor
async function processPipeline() {
  console.log('🚀 Starting Full Pipeline: WebSocket → AI → Gauge → Edge\n');
  
  let signalCount = 0;
  
  for await (const rawData of mockWebSocketStream()) {
    try {
      const data = JSON.parse(rawData);
      
      // Step 1: AI Maparse
      const maparseResult = autoMaparse({ prices: data.prices });
      
      // Step 2: WNBATOR Gauge
      const gaugeResult = gaugeWNBATOR(data.tensor);
      
      // Step 3: Edge Mapping (using maparse params)
      const edgeResult = mapEdgeRelation(maparseResult.conflict, maparseResult.entropy, maparseResult.tension);
      
      // Step 4: Filter high-value signals
      if (gaugeResult.betSignal === '💎 HIGH-VALUE') {
        signalCount++;
        console.log(`\n💎 HIGH-VALUE SIGNAL #${signalCount}`);
        console.log(`   Pattern: ${maparseResult.pattern}`);
        console.log(`   Edge: ${edgeResult.hex} | Width:${edgeResult.width}px | Opacity:${(edgeResult.opacity * 100).toFixed(0)}%`);
        console.log(`   Gap: ${gaugeResult.gap}`);
        console.log('');
      } else {
        // Output monitor signals as JSON
        const output = {
          hex: edgeResult.hex,
          width: edgeResult.width,
          gap: gaugeResult.gap,
          betSignal: gaugeResult.betSignal,
          pattern: maparseResult.pattern
        };
        console.log(JSON.stringify(output));
      }
    } catch (error) {
      console.error(`❌ Pipeline error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Pipeline complete. Found ${signalCount} high-value signals.`);
}

// CLI interface
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('Full Pipeline - WebSocket → AI → Gauge → Edge → Grep');
    console.log('');
    console.log('Usage:');
    console.log('  bun pipeline.ts --mock              # Use mock WebSocket stream');
    console.log('  bun pipeline.ts --stream=<url>       # Connect to real WebSocket');
    console.log('');
    console.log('Options:');
    console.log('  --mock         Use mock data stream');
    console.log('  --stream=<url>  WebSocket URL');
    console.log('  --filter=high   Only show high-value signals');
    process.exit(0);
  }
  
  if (args.includes('--mock')) {
    processPipeline().catch(error => {
      console.error(`❌ Pipeline failed: ${error.message}`);
      process.exit(1);
    });
  } else {
    console.log('💡 Use --mock for testing or --stream=<url> for real WebSocket');
    console.log('   Example: bun pipeline.ts --mock');
    process.exit(0);
  }
}

