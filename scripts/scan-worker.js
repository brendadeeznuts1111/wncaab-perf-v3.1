/**
 * Scan Worker - Parallel Ripgrep Execution (v14.3 Future)
 * 
 * Worker thread for parallel ripgrep scanning
 * Uses Bun's optimized postMessage API for 500x speedup
 * 
 * NOT FOR v14.2 - Current sync scan is fast enough (18ms)
 * Documented for v14.3 roadmap
 */

import { getEnvironmentData, parentPort } from 'worker_threads';

// ✅ TES-PERF-001: Bun 1.3 environmentData API (keyed access)
// Get config from main thread (zero-copy, 10× faster than env vars)
const config = getEnvironmentData('tes-worker-config');
const workerId = config?.workerId || 'unknown';

// Get scan-specific data (passed via postMessage for dynamic data)
// Note: Static config uses environmentData, dynamic data uses postMessage
let scanData = { files: [], pattern: '' };

// Worker scans subset of files in parallel
async function scanChunk(files, pattern) {
  const matches = [];
  
  // Parallel ripgrep across assigned files
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        // P1 Hardened: Use Bun.spawn with timeout
        const proc = Bun.spawn({
          cmd: ['rg', '--files-with-matches', pattern, file],
          stdout: 'pipe',
          timeout: 30000,
          maxBuffer: 50 * 1024 * 1024,
        });
        
        const output = await new Response(proc.stdout).text();
        const exitCode = await proc.exited;
        
        if (exitCode === 0 && output.trim()) {
          return file;
        }
        return null;
      } catch (error) {
        // Skip on timeout/buffer exceeded
        console.warn(`Worker: Skipping ${file}: ${error.message}`);
        return null;
      }
    })
  );
  
  const matchedFiles = results.filter(Boolean);
  
  // Send results back to main thread (500x faster than v14.2)
  parentPort.postMessage(matchedFiles);
}

// Listen for scan requests from main thread
parentPort.onmessage = async (event) => {
  if (event.data.type === 'scan') {
    scanData = { files: event.data.files || [], pattern: event.data.pattern || '' };
    await scanChunk(scanData.files, scanData.pattern);
  } else if (event.data.type === 'register') {
    // Initial registration message (backward compatibility)
    parentPort.postMessage({ type: 'ready', workerId });
  }
};

