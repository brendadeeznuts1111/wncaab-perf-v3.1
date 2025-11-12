// TES-OPS-004.B.4: Main Worker Entry Point
// [BUN-FIRST] Zero-NPM: Durable Objects Integration for Stateful Version Management
// Deploy: wrangler publish

import type { DurableObjectNamespace, KVNamespace } from '@cloudflare/workers-types';
import { VersionManagementDO } from './version-management-do.ts';

// Export DO class for wrangler.toml binding
export { VersionManagementDO };

/**
 * Environment interface for TES Worker
 */
export interface Env {
  VERSION_DO: DurableObjectNamespace;
  KV: KVNamespace;
  /** Signing key for version management crypto operations */
  VERSION_SIGNING_KEY?: string;
  TOKEN_MULTIPLIER?: string;
  NOWGOAL_BASE?: string;
  JWT_ENDPOINT?: string;
  WS_PROXY?: string;
}

/**
 * Custom error class for Durable Object operations
 */
export class DurableObjectError extends Error {
  constructor(
    public code: string,
    public details?: { code?: number; hsl?: string },
    message?: string
  ) {
    super(message || `Durable Object Error: ${code}`);
    this.name = 'DurableObjectError';
  }
}

/**
 * TES Worker - Main entry point with Durable Objects integration
 * 
 * Routes:
 * - /version/* → VersionManagementDO operations
 * - /health → Health check
 * - Other routes → Legacy flux-veto-worker endpoints (if needed)
 */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Version management routes → Durable Object
    if (url.pathname.startsWith('/version/')) {
      try {
        // Use deterministic ID from name for persistent DO instance
        // This ensures the same DO instance is used across requests
        const doId = env.VERSION_DO.idFromName('tes-registry-v1');

        // Get Durable Object stub [BUN-FIRST] Native get(id)
        const doStub = env.VERSION_DO.get(doId);

        // Forward request to DO
        return doStub.fetch(req);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            code: 'DO_FETCH_ERROR',
            hsl: '#FF4500',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: Date.now(),
          version: 'tes-ops-004-b4',
          meta: '[META:worker-health][SEMANTIC:durable-objects]',
          hsl: '#9D4EDD',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Default: Not found
    return new Response(
      JSON.stringify({
        error: 'Not found',
        endpoints: {
          version: '/version/bump (POST)',
          registry: '/version/registry (GET)',
          health: '/health (GET)',
        },
        hsl: '#FF4500',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};

