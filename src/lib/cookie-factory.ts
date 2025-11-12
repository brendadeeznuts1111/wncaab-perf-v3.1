/**
 * Cookie Factory - TES-NGWS-001.2m
 * 
 * Immutable cookie serialization using Bun.Cookie with rg audit logging.
 * All cookies are frozen to prevent runtime mutation.
 * 
 * @module src/lib/cookie-factory
 */

import type { Bun } from "bun";
import { getTESDomainConfigCached } from "../config/tes-domain-config.ts";

/**
 * Create secure, immutable cookie with rg audit logging
 * 
 * Uses TES domain configuration for dynamic cookie domain setting (TES-OPS-003.2)
 * 
 * @param name - Cookie name (e.g., "tes-jwt")
 * @param value - Cookie value (JWT token)
 * @param options - Optional cookie configuration
 * @returns Frozen Bun.Cookie object
 */
export function createSecureCookie(
  name: string,
  value: string,
  options?: Partial<Bun.CookieOptions>
): Bun.Cookie {
  const cookie = new Bun.Cookie(name, value);
  
  // Get TES domain configuration for dynamic cookie domain
  const tesConfig = getTESDomainConfigCached();
  
  // Apply security hardening defaults
  cookie.httpOnly = options?.httpOnly ?? true;
  cookie.secure = options?.secure ?? true;
  cookie.sameSite = options?.sameSite ?? "strict";
  cookie.maxAge = options?.maxAge ?? 3600;
  cookie.path = options?.path ?? "/";
  // Use TES domain configuration (TES-OPS-003.2: Dynamic TES Cookie Domain Setting)
  cookie.domain = options?.domain ?? tesConfig.cookieDomain;
  
  // Apply any additional options
  if (options?.expires) cookie.expires = options.expires;
  if (options?.partitioned !== undefined) cookie.partitioned = options.partitioned;
  
  // Serialize for rg logging BEFORE any mutations
  const rgBlock = `[HEADERS_BLOCK_START:v1]{cookie:${name}}~[AUTH][${cookie.domain}][SECURITY][COOKIE_SET][HTTP/1.1][TES-NGWS-001][Bun.Cookie][#REF:${cookie.serialize()} ][HEADERS_BLOCK_END]`;
  logHeadersForRg(rgBlock);
  
  // Freeze to prevent runtime mutation
  return Object.freeze(cookie);
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
    console.error(`[Cookie Factory] Failed to write rg log: ${error}`);
  }
}

/**
 * Create session cookie for JWT token
 * 
 * Convenience wrapper for creating tes-jwt session cookies.
 * Uses TES domain configuration for dynamic cookie domain (TES-OPS-003.2)
 * 
 * @param jwtToken - JWT token string
 * @param domain - Cookie domain (optional, uses TES domain config if not provided)
 * @param maxAge - Cookie max age in seconds (default: 3600)
 * @returns Frozen Bun.Cookie object
 */
export function createSessionCookie(
  jwtToken: string,
  domain?: string,
  maxAge: number = 3600
): Bun.Cookie {
  // Get TES domain configuration if domain not provided
  const tesConfig = getTESDomainConfigCached();
  const cookieDomain = domain ?? tesConfig.cookieDomain;
  
  return createSecureCookie("tes-jwt", jwtToken, {
    domain: cookieDomain,
    maxAge,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
}

