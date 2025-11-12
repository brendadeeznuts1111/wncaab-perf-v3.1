#!/usr/bin/env bun
/**
 * Flux Key Monitor - TES-NGWS-001
 * 
 * Monitors flux:* keys in Cloudflare KV for live drains and pattern analysis
 * 
 * Usage:
 *   bun run scripts/monitor-flux-keys.ts [options]
 * 
 * Options:
 *   --prefix <prefix>  Key prefix to monitor (default: flux:)
 *   --limit <number>  Maximum keys to retrieve (default: 100)
 *   --interval <ms>   Polling interval in milliseconds (default: 5000)
 *   --worker <url>    Cloudflare Worker URL (default: from env)
 */

import type { KVNamespace } from '@cloudflare/workers-types';

interface FluxPattern {
  pattern: any;
  expiresAt: number;
  vetoSpecifics?: any;
  fluxEnforcement?: any;
  tokenSnapshot?: string | null;
  semanticMeta?: string;
}

interface MonitorOptions {
  prefix: string;
  limit: number;
  interval: number;
  workerUrl?: string;
}

const DEFAULT_OPTIONS: MonitorOptions = {
  prefix: 'flux:',
  limit: 100,
  interval: 5000,
};

async function monitorFluxKeys(options: MonitorOptions): Promise<void> {
  console.log('🔍 TES-NGWS-001 Flux Key Monitor');
  console.log('================================\n');
  console.log(`Prefix: ${options.prefix}`);
  console.log(`Limit: ${options.limit}`);
  console.log(`Interval: ${options.interval}ms\n`);

  if (options.workerUrl) {
    // Monitor via Cloudflare Worker
    console.log(`📡 Monitoring via Worker: ${options.workerUrl}\n`);
    
    const monitor = async () => {
      try {
        const response = await fetch(`${options.workerUrl}/monitor?prefix=${encodeURIComponent(options.prefix)}&limit=${options.limit}`);
        const data = await response.json();
        
        console.log(`[${new Date().toISOString()}] Monitor Status:`);
        console.log(`  ${JSON.stringify(data, null, 2)}\n`);
        
        // Try to get specific patterns
        if (data.monitorKey) {
          // In a real implementation, you'd list keys and fetch them
          // For now, we'll just show the monitor status
          console.log('💡 Note: Use Worker /flux/:patternId endpoint to retrieve specific patterns\n');
        }
      } catch (error) {
        console.error(`❌ Monitor error: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    };
    
    // Initial check
    await monitor();
    
    // Set up polling
    const intervalId = setInterval(monitor, options.interval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping monitor...');
      clearInterval(intervalId);
      process.exit(0);
    });
    
    console.log('⏳ Monitoring... (Press Ctrl+C to stop)\n');
  } else {
    // Direct KV access (requires KV binding in local dev)
    console.log('⚠️  Direct KV monitoring requires KV binding');
    console.log('💡 Use --worker <url> to monitor via Cloudflare Worker\n');
    
    // Fallback: Show instructions
    console.log('📋 Manual Monitoring Commands:');
    console.log(`  curl "${options.workerUrl || 'https://your-worker.workers.dev'}/monitor?prefix=${options.prefix}&limit=${options.limit}"`);
    console.log(`  curl "${options.workerUrl || 'https://your-worker.workers.dev'}/flux/tes-ngws-001-nowgoal?endpoint=/ajax/getwebsockettoken"`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: MonitorOptions = { ...DEFAULT_OPTIONS };

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  if (arg === '--prefix' && nextArg) {
    options.prefix = nextArg;
    i++;
  } else if (arg === '--limit' && nextArg) {
    options.limit = parseInt(nextArg, 10);
    i++;
  } else if (arg === '--interval' && nextArg) {
    options.interval = parseInt(nextArg, 10);
    i++;
  } else if (arg === '--worker' && nextArg) {
    options.workerUrl = nextArg;
    i++;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: bun run scripts/monitor-flux-keys.ts [options]

Options:
  --prefix <prefix>    Key prefix to monitor (default: flux:)
  --limit <number>    Maximum keys to retrieve (default: 100)
  --interval <ms>     Polling interval in milliseconds (default: 5000)
  --worker <url>      Cloudflare Worker URL
  --help, -h          Show this help message

Examples:
  bun run scripts/monitor-flux-keys.ts --worker https://tes-ngws-001-flux-veto.workers.dev
  bun run scripts/monitor-flux-keys.ts --prefix flux: --limit 50 --interval 3000
`);
    process.exit(0);
  }
}

// Get worker URL from environment if not provided
if (!options.workerUrl) {
  options.workerUrl = process.env.CLOUDFLARE_WORKER_URL || Bun.env.CLOUDFLARE_WORKER_URL;
}

// Run monitor
monitorFluxKeys(options).catch((error) => {
  console.error('💥 Monitor failed:', error);
  process.exit(1);
});

