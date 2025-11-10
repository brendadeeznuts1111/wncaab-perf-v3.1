/**
 * Application Constants
 * 
 * Centralized constants for ports, timeouts, URLs, and default values.
 * Used across dev-server, worker-telemetry-api, and spline-api.
 * 
 * @module lib/constants
 */

// ============================================================================
// Port Configuration
// ============================================================================

/** Default port for dev server */
export const DEFAULT_PORT = 3002;

/** Port for worker telemetry API */
export const WORKER_API_PORT = 3000;

/** Port for spline API */
export const SPLINE_API_PORT = 3001;

// ============================================================================
// Timeout Configuration
// ============================================================================

/** Default idle timeout in seconds */
export const DEFAULT_IDLE_TIMEOUT = 120; // seconds

/** Worker API timeout in milliseconds */
export const WORKER_API_TIMEOUT = 500; // milliseconds

/** Worker API check timeout in milliseconds */
export const WORKER_API_CHECK_TIMEOUT = 1000; // milliseconds

// ============================================================================
// URLs & External Resources
// ============================================================================

/** Repository URL */
export const REPO_URL = 'https://github.com/brendadeeznuts1111/wncaab-perf-v3.1';

// ============================================================================
// Default Values
// ============================================================================

/** Default package information */
export interface PackageInfo {
  version?: string;
  name?: string;
  description?: string;
  author?: string;
  license?: string;
}

export const DEFAULT_PACKAGE_INFO: PackageInfo = {
  version: '3.1.0',
  name: 'wncaab-perf-v3.1',
  description: 'WNCAAB Performance Metrics & Visualization',
  author: 'WNCAAB Syndicate',
  license: 'MIT',
};

// ============================================================================
// Server Configuration
// ============================================================================

/** Default server hostname */
export const DEFAULT_HOSTNAME = '0.0.0.0';

/** Server identifier for X-Server header */
export const SERVER_NAME = 'wncaab-dev-server';

