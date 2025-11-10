/**
 * JWT Extractor - TES-NGWS-001.2
 * 
 * Type-safe JWT extraction using Bun.CookieMap for dual transport
 * (Cookie + Authorization header) with rg audit logging.
 * 
 * @module src/lib/jwt-extractor
 */

import type { Bun } from "bun";

/**
 * Extract JWT from request using Bun.CookieMap (cookie) or Authorization header
 * 
 * Supports dual transport:
 * - Cookie: `Cookie: tes-jwt=<token>`
 * - Header: `Authorization: Bearer <token>`
 * 
 * @param request - HTTP Request object
 * @returns JWT token string or null if not found
 */
export function extractJwtFromRequest(request: Request): string | null {
  // Parse Cookie header into Map-like object using Bun.CookieMap
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookieMap = new Bun.CookieMap(cookieHeader);
  
  // Type-safe access with fallback to Authorization header
  const jwt = cookieMap.get("tes-jwt") || 
              request.headers.get("Authorization")?.replace("Bearer ", "") ||
              null;
  
  if (!jwt) {
    // Log missing JWT with rg metadata
    const rgBlock = `[HEADERS_BLOCK_START:v1]{error:JWT_MISSING}~[AUTH][nowgoal26.com][SECURITY][MISSING_CREDENTIAL][HTTP/1.1][TES-NGWS-001][Bun.CookieMap][#REF:https://bun.sh/docs/api/cookiemap ][HEADERS_BLOCK_END]`;
    logHeadersForRg(rgBlock);
    return null;
  }
  
  // Log successful extraction with source metadata
  const source = cookieMap.has("tes-jwt") ? "COOKIE" : "HEADER";
  const rgBlock = `[HEADERS_BLOCK_START:v1]{jwtSource:${source}}~[AUTH][nowgoal26.com][SECURITY][JWT_EXTRACT][HTTP/1.1][TES-NGWS-001][Bun.CookieMap][#REF:https://bun.sh/docs/api/cookiemap ][HEADERS_BLOCK_END]`;
  logHeadersForRg(rgBlock);
  
  return jwt;
}

/**
 * Log headers block for rg indexing
 * 
 * @param rgBlock - Formatted rg block string
 */
function logHeadersForRg(rgBlock: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} ${rgBlock}\n`;
  
  // Append to headers index log file
  try {
    Bun.write("logs/headers-index.log", logLine, { createPath: true, flag: "a" });
  } catch (error) {
    // Fallback to console if file write fails
    console.error(`[JWT Extractor] Failed to write rg log: ${error}`);
  }
}

/**
 * Extract JWT from WebSocket upgrade request
 * 
 * WebSocket upgrade requests use the same cookie/header transport
 * 
 * @param request - WebSocket upgrade Request object
 * @returns JWT token string or null if not found
 */
export function extractJwtFromWebSocket(request: Request): string | null {
  return extractJwtFromRequest(request);
}

