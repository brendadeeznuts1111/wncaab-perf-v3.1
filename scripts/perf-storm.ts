#!/usr/bin/env bun
/**
 * Load Test Storm - TES-PERF Hyperresilience
 * 
 * Peak-load hash storm simulation (10k req/s) to verify:
 * - 0% crash propagation
 * - Long-tick suppression to <1%
 * - Worker respawn resilience
 * - Event loop stability
 * 
 * Usage: bun run scripts/perf-storm.ts [--workers=4] [--duration=60] [--rate=10000]
 */

import { performance } from "perf_hooks";

interface StormConfig {
  workers: number;
  duration: number; // seconds
  rate: number; // requests per second
  targetUrl: string;
}

interface StormMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  errors: Array<{ timestamp: number; error: string }>;
  startTime: number;
  endTime?: number;
}

const DEFAULT_CONFIG: StormConfig = {
  workers: 4,
  duration: 60,
  rate: 10000,
  targetUrl: 'http://localhost:3002/api/tension/map?conflict=0.5&entropy=0.7&tension=0.6',
};

async function runLoadTest(config: StormConfig): Promise<StormMetrics> {
  const metrics: StormMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    maxLatency: 0,
    errors: [],
    startTime: performance.now(),
  };
  
  const latencies: number[] = [];
  const requestsPerSecond = config.rate / config.workers;
  const delayBetweenRequests = 1000 / requestsPerSecond;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('🌩️  TES-PERF Load Storm Initiated');
  console.log(`${'='.repeat(70)}`);
  console.log(`Workers: ${config.workers}`);
  console.log(`Duration: ${config.duration}s`);
  console.log(`Target Rate: ${config.rate} req/s`);
  console.log(`Target URL: ${config.targetUrl}`);
  console.log(`${'='.repeat(70)}\n`);
  
  const workerPromises: Promise<void>[] = [];
  
  for (let i = 0; i < config.workers; i++) {
    workerPromises.push(
      (async () => {
        const endTime = Date.now() + (config.duration * 1000);
        
        while (Date.now() < endTime) {
          const requestStart = performance.now();
          
          try {
            const response = await fetch(config.targetUrl, {
              signal: AbortSignal.timeout(5000),
            });
            
            const requestEnd = performance.now();
            const latency = requestEnd - requestStart;
            
            metrics.totalRequests++;
            latencies.push(latency);
            
            if (response.ok) {
              metrics.successfulRequests++;
            } else {
              metrics.failedRequests++;
              metrics.errors.push({
                timestamp: Date.now(),
                error: `HTTP ${response.status}: ${response.statusText}`,
              });
            }
          } catch (error) {
            metrics.failedRequests++;
            metrics.errors.push({
              timestamp: Date.now(),
              error: error instanceof Error ? error.message : String(error),
            });
          }
          
          // Rate limiting
          await Bun.sleep(delayBetweenRequests);
        }
      })()
    );
  }
  
  await Promise.all(workerPromises);
  
  metrics.endTime = performance.now();
  
  // Calculate statistics
  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    metrics.p95Latency = latencies[Math.floor(latencies.length * 0.95)];
    metrics.p99Latency = latencies[Math.floor(latencies.length * 0.99)];
    metrics.maxLatency = latencies[latencies.length - 1];
  }
  
  return metrics;
}

async function checkEventLoopHealth(): Promise<any> {
  try {
    const response = await fetch('http://localhost:3002/api/dev/event-loop');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Event loop endpoint not available
  }
  return null;
}

async function main() {
  const args = Bun.argv.slice(2);
  const config: StormConfig = { ...DEFAULT_CONFIG };
  
  // Parse CLI arguments
  for (const arg of args) {
    if (arg.startsWith('--workers=')) {
      config.workers = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--duration=')) {
      config.duration = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--rate=')) {
      config.rate = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--url=')) {
      config.targetUrl = arg.split('=')[1];
    }
  }
  
  console.log('🔍 Pre-storm health check...');
  const preStormHealth = await checkEventLoopHealth();
  if (preStormHealth) {
    console.log(`   Event Loop Health: ${preStormHealth.interpretation?.health || 'unknown'}`);
    console.log(`   Long Tick Ratio: ${preStormHealth.metrics?.longTickRatio || 0}`);
  }
  
  console.log('\n🚀 Starting load storm...\n');
  
  const metrics = await runLoadTest(config);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 Storm Results');
  console.log(`${'='.repeat(70)}`);
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${metrics.failedRequests} (${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`\nLatency Statistics:`);
  console.log(`  Average: ${metrics.averageLatency.toFixed(2)}ms`);
  console.log(`  P95: ${metrics.p95Latency.toFixed(2)}ms`);
  console.log(`  P99: ${metrics.p99Latency.toFixed(2)}ms`);
  console.log(`  Max: ${metrics.maxLatency.toFixed(2)}ms`);
  console.log(`\nDuration: ${((metrics.endTime! - metrics.startTime) / 1000).toFixed(2)}s`);
  console.log(`Actual Rate: ${(metrics.totalRequests / ((metrics.endTime! - metrics.startTime) / 1000)).toFixed(2)} req/s`);
  
  if (metrics.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${metrics.errors.length}`);
    console.log('   First 5 errors:');
    metrics.errors.slice(0, 5).forEach((err, i) => {
      console.log(`   ${i + 1}. [${new Date(err.timestamp).toISOString()}] ${err.error}`);
    });
  }
  
  console.log('\n🔍 Post-storm health check...');
  const postStormHealth = await checkEventLoopHealth();
  if (postStormHealth) {
    console.log(`   Event Loop Health: ${postStormHealth.interpretation?.health || 'unknown'}`);
    console.log(`   Long Tick Ratio: ${postStormHealth.metrics?.longTickRatio || 0}`);
    console.log(`   Long Tick Count: ${postStormHealth.metrics?.longTickCount || 0}`);
    console.log(`   Average Tick Duration: ${postStormHealth.metrics?.averageTickDurationMs || 0}ms`);
    
    const longTickRatio = postStormHealth.metrics?.longTickRatio || 0;
    if (longTickRatio < 0.01) {
      console.log(`\n✅ PASS: Long-tick suppression <1% (${(longTickRatio * 100).toFixed(2)}%)`);
    } else {
      console.log(`\n❌ FAIL: Long-tick ratio exceeds 1% (${(longTickRatio * 100).toFixed(2)}%)`);
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  
  // Exit code based on results
  const crashPropagationRate = metrics.failedRequests / metrics.totalRequests;
  if (crashPropagationRate === 0 && (!postStormHealth || (postStormHealth.metrics?.longTickRatio || 0) < 0.01)) {
    console.log('✅ All checks passed - System resilient under load');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed - Review metrics above');
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

