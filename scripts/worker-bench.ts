/**
 * Worker Bench CLI - Stress Testing
 * 
 * Usage: bun run worker-bench.ts --jobs 5000 --curve-type mixed
 */

import { SplineRenderer } from './spline-renderer.ts';
import { Worker, setEnvironmentData } from 'worker_threads';

interface BenchOptions {
  jobs: number;
  curveType: 'catmull-rom' | 'bezier' | 'cubic' | 'linear' | 'mixed';
  workers?: number;
}

async function workerStress(options: BenchOptions) {
  const { jobs, curveType, workers = 4 } = options;

  console.log(`⚡ Worker stress test:`);
  console.log(`   Jobs: ${jobs}`);
  console.log(`   Curve type: ${curveType}`);
  console.log(`   Workers: ${workers}`);

  const startTime = Bun.nanoseconds();

  // Distribute jobs across workers
  const jobsPerWorker = Math.ceil(jobs / workers);
  const workerPromises: Promise<number>[] = [];

  for (let w = 0; w < workers; w++) {
    const workerJobs = Math.min(jobsPerWorker, jobs - w * jobsPerWorker);
    if (workerJobs <= 0) continue;

    const promise = new Promise<number>((resolve) => {
      // ✅ TES-PERF-001: Bun 1.3 environmentData API (zero-copy config sharing)
      // Uses setEnvironmentData() instead of env option for 10× latency reduction
      setEnvironmentData('tes-spline-config', {
        jobs: workerJobs,
        curveType: curveType,
      });
      
      const worker = new Worker(new URL('./spline-worker.ts', import.meta.url), {
        // No env option needed - using environmentData API instead
      });

      let completed = 0;
      worker.onmessage = (event) => {
        completed++;
        if (completed >= workerJobs) {
          worker.terminate();
          resolve(completed);
        }
      };

      worker.postMessage({ start: true });
    });

    workerPromises.push(promise);
  }

  const results = await Promise.all(workerPromises);
  const totalCompleted = results.reduce((sum, count) => sum + count, 0);
  const endTime = Bun.nanoseconds();
  const duration = (endTime - startTime) / 1_000_000; // Convert to ms

  console.log(`✅ Completed ${totalCompleted} jobs in ${duration.toFixed(2)}ms`);
  console.log(`   Throughput: ${(totalCompleted / (duration / 1000)).toFixed(0)} jobs/sec`);
  console.log(`   Avg per job: ${(duration / totalCompleted).toFixed(2)}ms`);
}

// Parse CLI arguments
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const options: BenchOptions = {
    jobs: 1000,
    curveType: 'mixed',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--jobs' && i + 1 < args.length) {
      options.jobs = parseInt(args[++i], 10);
    } else if (arg === '--curve-type' && i + 1 < args.length) {
      options.curveType = args[++i] as BenchOptions['curveType'];
    } else if (arg === '--workers' && i + 1 < args.length) {
      options.workers = parseInt(args[++i], 10);
    } else if (arg.startsWith('--jobs=')) {
      options.jobs = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--curve-type=')) {
      options.curveType = arg.split('=')[1] as BenchOptions['curveType'];
    } else if (arg.startsWith('--workers=')) {
      options.workers = parseInt(arg.split('=')[1], 10);
    }
  }

  workerStress(options).catch(error => {
    console.error('❌ Worker stress test failed:', error);
    process.exit(1);
  });
}

export { workerStress };

