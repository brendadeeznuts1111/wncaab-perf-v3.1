/**
 * Validation Utilities
 * 
 * Input validation and parsing helpers for API endpoints.
 * Provides number parsing, CSV parsing, and validation error responses.
 * 
 * @module lib/validation
 */

import type { ApiHeadersOptions } from './headers.ts';
import { jsonResponse } from './headers.ts';

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse and validate a number query parameter
 * Clamps value to [min, max] range and handles NaN/invalid inputs
 * 
 * @param value - Query parameter value
 * @param defaultValue - Default value if invalid
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 1)
 * @returns Validated and clamped number
 */
export function parseNumberParam(value: string | null, defaultValue: number, min: number = 0, max: number = 1): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Parse and validate a CSV string of numbers
 * 
 * @param value - CSV string (e.g., "1,2,3,4,5")
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Array of validated numbers
 */
export function parseCsvNumbers(value: string, min: number = -Infinity, max: number = Infinity): number[] {
  return value
    .split(',')
    .map(p => parseFloat(p.trim()))
    .filter(p => !isNaN(p) && p >= min && p <= max);
}

// ============================================================================
// Validation Error Response
// ============================================================================

/**
 * Create a validation error response with standardized headers
 * 
 * @param message - Error message
 * @param field - Field name that failed validation
 * @param received - Value that was received
 * @param expected - Expected format/range
 * @param options - API header options
 * @returns Error response with validation details
 */
export function validationErrorResponse(
  message: string,
  field?: string,
  received?: unknown,
  expected?: string,
  options?: Partial<ApiHeadersOptions>
): Response {
  const error: Record<string, unknown> = {
    error: message,
    timestamp: new Date().toISOString(),
  };
  
  if (field) error.field = field;
  if (received !== undefined) error.received = received;
  if (expected) error.expected = expected;
  
  return jsonResponse(error, 400, {
    ...options,
    scope: options?.scope || 'validation',
  });
}

// ============================================================================
// HTML Utilities
// ============================================================================

/**
 * Escape HTML string for safe rendering
 * ✅ Uses Bun.escapeHTML() - optimized for large input (480 MB/s - 20 GB/s on M1X)
 * 
 * Performance: Bun.escapeHTML() is highly optimized with SIMD instructions
 * Handles non-string types automatically (converts to string first)
 * 
 * @param str - String to escape (or value that will be converted to string)
 * @returns Escaped HTML string safe for rendering in HTML
 * 
 * [#REF] https://bun.com/docs/runtime/utils#bun-escapehtml
 */
export function escapeHtml(str: string | undefined | null | number | boolean | object): string {
  // Bun.escapeHTML() handles non-string types automatically, but we need to handle null/undefined
  if (str == null) return '';
  return Bun.escapeHTML(str);
}

