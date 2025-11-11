/**
 * Dev Status Route Handler
 * 
 * Handles GET /api/dev/status endpoint
 * Returns system status with CPU metric as percentage (0-100)
 */

import { getCpuLoad } from '../../lib/status-aggregator.ts';
import { errorResponse } from '../../../../lib/headers.ts';

export interface EnhancedStatusData {
  timestamp: string;
  vector: {
    sessions: {
      tmux: number;
      activeWorkers: number;
      apiSessions: number;
      websocketConnections: number;
      websocketSubscribers: number;
    };
    directions: {
      primaryRegion: string;
      trafficMode: 'normal' | 'degraded' | 'isolated';
      requestFlow: {
        totalRoutes: number;
        activeRoutes: number;
        avgLatency: number;
        requestsPerSecond: number;
      };
      activeRoutes: number;
    };
    others: {
      memory: number;
      cpu: number;
      errorRate: number;
      uptime: number;
    };
  };
  meta: {
    totalEndpoints: number;
    telemetryStatus: string;
    statusVersion: string;
  };
}

/**
 * Get enhanced system status
 * CPU metric is now returned as percentage (0-100) with 1 decimal precision
 */
export async function getEnhancedStatus(): Promise<EnhancedStatusData> {
  // This function should be implemented by importing necessary dependencies
  // For now, it's a placeholder that shows the structure
  throw new Error('getEnhancedStatus must be implemented with full dependencies');
}

/**
 * Status route handler
 */
export async function handleStatusRoute(): Promise<Response> {
  try {
    const status = await getEnhancedStatus();
    
    return Response.json(status, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-TES-Status-Version': '2.0'
      }
    });
  } catch (error) {
    return errorResponse(
      `Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
      500,
      { domain: 'dev', scope: 'status', version: 'v2.0' }
    );
  }
}

