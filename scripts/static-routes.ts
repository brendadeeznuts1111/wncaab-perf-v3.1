/**
 * Static Routes Manifest - The Immutable Static File Manifest
 * 
 * Centralized manifest for all static file routes served by Bun.serve().
 * This provides:
 * - Security: Explicit file list prevents path traversal attacks
 * - Maintainability: Add new files by adding one line here
 * - Performance: O(1) exact route matching (fastest Bun route)
 * - Grepability: All served files documented in one place
 * 
 * Usage:
 *   import { generateStaticRoutes } from './static-routes.ts';
 *   Bun.serve({
 *     routes: {
 *       ...Object.fromEntries(generateStaticRoutes().map(r => [r.path, r.handler])),
 *     }
 *   });
 * 
 * Grep Patterns:
 *   # Find all /public/ routes:
 *   rg "path: '/public/" scripts/static-routes.ts
 * 
 *   # Find all routes:
 *   rg "path:" scripts/static-routes.ts | grep -E "path: '/"
 * 
 *   # Query auto-generated tags in index files:
 *   rg "static-public-tension-states-json" .remote.index
 *   rg "static-js-tension-controller-js" .remote.index
 */

/// <reference types="bun-types" />

export interface StaticFileConfig {
  /** Public route path (e.g., "/public/tension-states.json") */
  path: string;
  /** File system path relative to project root (e.g., "./public/tension-states.json") */
  file: string;
  /** Whether file is immutable (affects Cache-Control header) */
  immutable?: boolean;
}

/**
 * Static files manifest - Add new files here to serve them
 * 
 * Security: Only files listed here are served. Path traversal impossible.
 * Performance: Exact routes = O(1) lookup (fastest possible)
 * Maintainability: One array to rule them all
 * 
 * Grep-friendly auto-tags: Each path becomes grepable tag
 * Example: "static-public-tension-states-json"
 */
export const STATIC_FILES: StaticFileConfig[] = [
  // Public API contracts (immutable, versioned)
  {
    path: '/public/tension-states.json',
    file: './public/tension-states.json',
    immutable: true,
  },

  // JavaScript modules (immutable, cacheable)
  {
    path: '/js/tension-controller.js',
    file: './public/js/tension-controller.js',
    immutable: true,
  },

  // HTML pages
  {
    path: '/public/index.html',
    file: './public/index.html',
    immutable: false,
  },
  {
    path: '/index.html',
    file: './public/index.html',
    immutable: false,
  },

  // Future files: Add one line here
  // Example:
  // {
  //   path: '/public/config.json',
  //   file: './public/config.json',
  //   immutable: false,
  // },
];

/**
 * Generate exact routes for Bun.serve (O(1) performance)
 * 
 * Returns array of objects with { path, handler } structure
 * 
 * @returns Array of route objects
 */
export function generateStaticRoutes() {
  return STATIC_FILES.map(({ path, file, immutable }) => ({
    path,
    handler: () => new Response(Bun.file(file), {
      headers: {
        'Content-Type': getMimeType(file),
        'Cache-Control': immutable
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600',
      },
    }),
  }));
}

/**
 * Utility: Mime type detection
 */
function getMimeType(file: string): string {
  if (file.endsWith('.json')) return 'application/json';
  if (file.endsWith('.js')) return 'application/javascript';
  if (file.endsWith('.html')) return 'text/html';
  if (file.endsWith('.css')) return 'text/css';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.ico')) return 'image/x-icon';
  return 'text/plain';
}

/**
 * Get all static file paths (for documentation/debugging)
 */
export function getStaticFilePaths(): string[] {
  return STATIC_FILES.map(f => f.path);
}

/**
 * Generate grep-friendly auto-tags from static file paths
 * 
 * Converts paths like "/public/tension-states.json" to "static-public-tension-states-json"
 * Useful for indexing and searching across codebase
 * 
 * @returns Array of auto-generated tags
 * 
 * Example usage:
 *   rg "static-public-tension-states-json" .remote.index
 * 
 * Quick reference command (one-liner):
 *   bun -e "import { generateStaticRouteTags } from './scripts/static-routes.ts'; console.log(generateStaticRouteTags().join('\n'));"
 */
export function generateStaticRouteTags(): string[] {
  return STATIC_FILES.map(({ path }) => {
    // Convert "/public/tension-states.json" → "static-public-tension-states-json"
    return `static-${path.replace(/^\//, '').replace(/\//g, '-').replace(/\./g, '-')}`;
  });
}
