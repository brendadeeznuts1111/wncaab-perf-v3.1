/**
 * Fetch Debugging Utility
 * 
 * Helper functions for enabling Bun's verbose fetch logging programmatically.
 * Useful for debugging network requests in development.
 * 
 * When `BUN_CONFIG_VERBOSE_FETCH` is set to `curl`, Bun prints fetch requests
 * as **single-line curl commands** that can be copy-pasted directly into your
 * terminal to replicate the request.
 * 
 * @example
 * ```typescript
 * import { enableVerboseFetch } from './lib/fetch-debug.ts';
 * 
 * // Enable curl output (single-line, copy-paste ready)
 * enableVerboseFetch('curl');
 * 
 * // Make requests - they'll be logged as single-line curl commands
 * await fetch('https://api.example.com/data');
 * ```
 */

/**
 * Enable verbose fetch logging
 * 
 * @param mode - 'curl' for single-line curl commands (copy-paste ready), 'true' for request/response info, 'false' to disable
 * 
 * @example
 * ```typescript
 * // Enable curl output (single-line, copy-paste ready)
 * enableVerboseFetch('curl');
 * 
 * // Enable request/response logging
 * enableVerboseFetch('true');
 * 
 * // Disable verbose logging
 * enableVerboseFetch('false');
 * ```
 */
export function enableVerboseFetch(mode: 'curl' | 'true' | 'false' = 'curl'): void {
  process.env.BUN_CONFIG_VERBOSE_FETCH = mode;
  
  if (mode === 'curl') {
    console.log('[Fetch Debug] Enabled: Requests will be printed as single-line curl commands (copy-paste ready)');
  } else if (mode === 'true') {
    console.log('[Fetch Debug] Enabled: Requests and responses will be logged');
  } else {
    console.log('[Fetch Debug] Disabled');
  }
}

/**
 * Disable verbose fetch logging
 */
export function disableVerboseFetch(): void {
  enableVerboseFetch('false');
}

/**
 * Check if verbose fetch is enabled
 */
export function isVerboseFetchEnabled(): boolean {
  const value = process.env.BUN_CONFIG_VERBOSE_FETCH;
  return value === 'curl' || value === 'true';
}

