/**
 * Spline Worker - Parallel Rendering Worker
 */

import { SplineRenderer } from './spline-renderer.ts';
const renderer = new SplineRenderer();
import { getEnvironmentData, parentPort } from 'worker_threads';

// ✅ TES-PERF-001: Bun 1.3 environmentData API (keyed access)
// Get config from main thread (zero-copy, 10× faster than env vars)
const config = getEnvironmentData('tes-spline-config') as { jobs?: number; curveType?: string } | undefined;

const jobs = config?.jobs || 100;
const curveType = (config?.curveType || 'catmull-rom') as 'catmull-rom' | 'bezier' | 'cubic' | 'linear';

parentPort.onmessage = async (event) => {
  if (event.data.start) {
    // Process jobs
    for (let i = 0; i < jobs; i++) {
      const type = curveType === 'mixed' 
        ? (['catmull-rom', 'bezier', 'cubic', 'linear'][i % 4] as typeof curveType)
        : curveType;

      const path = renderer.render({
        type,
        points: 100,
        tension: 0.5,
      });

      parentPort.postMessage({ completed: i + 1, points: path.length });
    }
  }
};

