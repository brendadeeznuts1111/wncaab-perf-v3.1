/**
 * Spline Worker - Parallel Rendering Worker
 */

import { SplineRenderer } from './spline-renderer.ts';
const renderer = new SplineRenderer();
import { getEnvironmentData, parentPort } from 'bun:worker_threads';

const { JOBS, CURVE_TYPE } = getEnvironmentData() as { JOBS?: string; CURVE_TYPE?: string };

const jobs = parseInt(JOBS || '100', 10);
const curveType = (CURVE_TYPE || 'catmull-rom') as 'catmull-rom' | 'bezier' | 'cubic' | 'linear';

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

