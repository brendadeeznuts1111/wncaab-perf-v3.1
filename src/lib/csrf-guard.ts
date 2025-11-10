/**
 * CSRF Guard - TES-NGWS-001.1h
 * 
 * CSRF protection using Bun.CSRF for securing JWT acquisition endpoint.
 * All token generation and verification events are logged in rg format.
 * 
 * @module src/lib/csrf-guard
 */

import { CSRF } from "bun";

// CSRF secret from environment or default (should be set in production)
const CSRF_SECRET = process.env.CSRF_SECRET || Bun.env.CSRF_SECRET || "tes-csrf-secret-default-change-in-production";

/**
 * Generate CSRF token with rg audit logging
 * 
 * @param expiresIn - Token expiry in milliseconds (default: 5 minutes)
 * @returns CSRF token string
 */
export function generateCsrfToken(expiresIn: number = 5 * 60 * 1000): string {
  const token = CSRF.generate({
    secret: CSRF_SECRET,
    encoding: "hex",
    expiresIn,
  });
  
  // Log token generation with rg metadata (truncated for security)
  const tokenPreview = token.substring(0, 8) + "...";
  const rgBlock = `[HEADERS_BLOCK_START:v1]{csrfToken:${tokenPreview}}~[SECURITY][nowgoal26.com][CSRF][TOKEN_GEN][HTTP/1.1][TES-NGWS-001][Bun.CSRF][#REF:https://bun.sh/docs/api/csrf ][HEADERS_BLOCK_END]`;
  logHeadersForRg(rgBlock);
  
  return token;
}

/**
 * Verify CSRF token with rg audit logging
 * 
 * @param token - CSRF token to verify
 * @returns true if token is valid, false otherwise
 */
export function verifyCsrfToken(token: string): boolean {
  const isValid = CSRF.verify(token, { secret: CSRF_SECRET });
  
  // Log verification attempts (success/failure) for audit
  const rgBlock = `[HEADERS_BLOCK_START:v1]{csrfValid:${isValid}}~[SECURITY][nowgoal26.com][CSRF][TOKEN_VERIFY][HTTP/1.1][TES-NGWS-001][Bun.CSRF][#REF:${isValid ? "SUCCESS" : "FAILURE"} ][HEADERS_BLOCK_END]`;
  logHeadersForRg(rgBlock);
  
  return isValid;
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
    console.error(`[CSRF Guard] Failed to write rg log: ${error}`);
  }
}

/**
 * Middleware function to verify CSRF token from request headers
 * 
 * @param request - HTTP Request object
 * @returns true if CSRF token is valid, false otherwise
 */
export function verifyCsrfFromRequest(request: Request): boolean {
  const csrfToken = request.headers.get("X-CSRF-Token");
  
  if (!csrfToken) {
    const rgBlock = `[HEADERS_BLOCK_START:v1]{csrfValid:false,error:MISSING_TOKEN}~[SECURITY][nowgoal26.com][CSRF][TOKEN_VERIFY][HTTP/1.1][TES-NGWS-001][Bun.CSRF][#REF:MISSING_TOKEN ][HEADERS_BLOCK_END]`;
    logHeadersForRg(rgBlock);
    return false;
  }
  
  return verifyCsrfToken(csrfToken);
}

