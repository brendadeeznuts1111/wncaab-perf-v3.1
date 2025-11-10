/**
 * HTTP Headers Utilities
 * 
 * Standardized API headers system organized by concern/domain/scope.
 * Provides consistent CORS headers, API metadata headers, and response helpers.
 * 
 * @module lib/headers
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * API domain types for X-API-Domain header
 */
export type ApiDomain = 'dev' | 'tension' | 'gauge' | 'ai' | 'validate' | 'system' | 'spline' | 'bet-type' | 'glossary';

/**
 * Options for generating standardized API headers
 */
export interface ApiHeadersOptions {
  domain: ApiDomain;
  scope: string;
  version?: string;
  contentType?: string;
  includeTiming?: boolean;
  requestId?: string;
  startTime?: number;
}

// ============================================================================
// CORS Headers
// ============================================================================

/**
 * Standard CORS headers for all API responses
 * ✅ Fixed: Includes Authorization header for cross-origin requests
 */
export const CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Get CORS headers
 * @returns HeadersInit object with CORS headers
 */
export function corsHeaders(): HeadersInit {
  return CORS_HEADERS;
}

/**
 * Append CORS headers to any response
 * ✅ Fixed: Ensures CORS headers are always present, even if not in initial headers
 * @param response - Response object to append CORS headers to
 * @returns Response with CORS headers appended
 */
export function appendCorsHeaders(response: Response): Response {
  // Create new headers object with CORS headers
  const headers = new Headers(response.headers);
  
  // Append CORS headers (will overwrite if already present)
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  // Return new response with updated headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ============================================================================
// Standardized API Headers
// ============================================================================

/**
 * Generate standardized API headers organized by concern/domain/scope
 * 
 * Header Structure:
 * - X-API-Domain: API domain (dev, tension, gauge, ai, validate, system)
 * - X-API-Scope: API scope/concern (mapping, health, help, status, metrics, configs, workers)
 * - X-API-Version: API version (v1.6, v1.4.2, etc.)
 * - X-Request-ID: Unique request identifier (UUID)
 * - X-Response-Time: Response time in milliseconds
 * - X-Server: Server identifier
 * - Standard CORS headers
 * - Content-Type: Appropriate content type
 * 
 * @param options - Header configuration options
 * @returns HeadersInit object with standardized headers
 */
export function apiHeaders(options: ApiHeadersOptions): HeadersInit {
  const headers: HeadersInit = {
    // CORS headers (standard)
    ...corsHeaders(),
    
    // API Domain & Scope (concern/domain/scope organization)
    'X-API-Domain': options.domain,
    'X-API-Scope': options.scope,
    
    // API Version
    'X-API-Version': options.version || 'v1.6',
    
    // Server identification
    'X-Server': 'wncaab-dev-server',
    
    // Request tracking
    'X-Request-ID': options.requestId || crypto.randomUUID(),
  };
  
  // Content-Type (if specified)
  if (options.contentType) {
    headers['Content-Type'] = options.contentType;
  }
  
  // Response timing (if requested)
  if (options.includeTiming && options.startTime) {
    const responseTime = performance.now() - options.startTime;
    headers['X-Response-Time'] = `${responseTime.toFixed(2)}ms`;
  }
  
  return headers;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a JSON response with standardized API headers
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @param options - API header options
 * @returns Response object
 */
export function jsonResponse(data: unknown, status: number = 200, options?: Partial<ApiHeadersOptions>): Response {
  const headers = apiHeaders({
    domain: options?.domain || 'system',
    scope: options?.scope || 'api',
    version: options?.version,
    contentType: 'application/json',
    includeTiming: options?.includeTiming,
    requestId: options?.requestId,
    startTime: options?.startTime,
  });
  
  return Response.json(data, {
    status,
    headers,
  });
}

/**
 * Create an error response with standardized API headers
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param options - API header options
 * @returns Response object
 */
export function errorResponse(message: string, status: number = 500, options?: Partial<ApiHeadersOptions>): Response {
  return jsonResponse({ error: message }, status, {
    ...options,
    scope: options?.scope || 'error',
  });
}

/**
 * Add response metadata to JSON responses with standardized headers
 * @param data - Response data
 * @param status - HTTP status code
 * @param metadata - Additional metadata to include
 * @param options - API header options
 * @returns Response with metadata
 */
export function jsonResponseWithMetadata(
  data: unknown,
  status: number = 200,
  metadata?: { version?: string; timestamp?: string; requestId?: string },
  options?: Partial<ApiHeadersOptions>
): Response {
  const response: Record<string, unknown> = {
    data,
    ...metadata,
    timestamp: metadata?.timestamp || new Date().toISOString(),
  };
  
  return jsonResponse(response, status, {
    ...options,
    version: metadata?.version || options?.version,
    requestId: metadata?.requestId || options?.requestId,
  });
}

// ============================================================================
// ETag Support
// ============================================================================

/**
 * Generate ETag from content (simple hash)
 * ✅ Optimized: Uses Bun's fast string operations
 * @param content - Content to generate ETag for
 * @returns ETag string (quoted)
 */
export function generateETag(content: string): string {
  // Simple hash function optimized for Bun
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Check If-None-Match header and return 304 if match
 * ✅ Optimized: Early return for cache hits
 * ✅ Fixed: Includes CORS headers for cross-origin requests
 * @param req - Request object
 * @param etag - ETag to check against
 * @returns 304 Response if match, null otherwise
 */
export function checkETag(req: Request, etag: string): Response | null {
  const ifNoneMatch = req.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...corsHeaders(), // ✅ Fixed: CORS headers for 304 responses
        'ETag': etag,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
  return null;
}

