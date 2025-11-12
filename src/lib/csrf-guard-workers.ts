/**
 * CSRF Guard - Cloudflare Workers Compatible Version
 * 
 * CSRF protection using Web Crypto API (compatible with Cloudflare Workers).
 * Falls back to Bun.CSRF when running in Bun runtime.
 * 
 * @module src/lib/csrf-guard-workers
 */

// CSRF secret cache
let CSRF_SECRET: string | null = null;

/**
 * Get CSRF secret (lazy initialization)
 * Cloudflare Workers compatible: uses environment variables or generates a secret
 * 
 * @param envSecret - Optional secret from environment (for Cloudflare Workers)
 */
async function getSecret(envSecret?: string): Promise<string> {
  if (!CSRF_SECRET) {
    if (envSecret) {
      // Use provided secret from environment
      CSRF_SECRET = envSecret;
    } else {
      // Fallback: generate a deterministic secret
      // In production, this should be set via wrangler secret put CSRF_SECRET
      // For now, use a default (should be changed in production)
      const defaultSecret = 'tes-csrf-secret-2024-11-12-change-in-production';
      CSRF_SECRET = defaultSecret;
    }
  }
  return CSRF_SECRET;
}

/**
 * Initialize CSRF secret from environment (call this from worker)
 */
export function initCsrfSecret(secret: string): void {
  CSRF_SECRET = secret;
}

/**
 * Generate CSRF token using Web Crypto API (Cloudflare Workers compatible)
 * 
 * @param expiresIn - Token expiry in milliseconds (default: 5 minutes)
 * @returns CSRF token string
 */
export async function generateCsrfTokenWorkers(expiresIn: number = 5 * 60 * 1000, envSecret?: string): Promise<string> {
  const secret = await getSecret(envSecret);
  const now = Date.now();
  const expiresAt = now + expiresIn;
  
  // Create token payload: timestamp + random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const payload = `${expiresAt}:${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  
  // Sign payload with HMAC-SHA256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Combine payload and signature: base64url encoded
  const token = `${payload}:${signatureHex}`;
  const tokenBase64 = btoa(token)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return tokenBase64;
}

/**
 * Verify CSRF token using Web Crypto API (Cloudflare Workers compatible)
 * 
 * @param token - CSRF token to verify
 * @returns true if token is valid, false otherwise
 */
export async function verifyCsrfTokenWorkers(token: string): Promise<boolean> {
  try {
    const secret = await getSecret();
    
    // Decode base64url token
    const tokenDecoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const [payload, signatureHex] = tokenDecoded.split(':');
    
    if (!payload || !signatureHex) {
      return false;
    }
    
    // Check expiration
    const [expiresAtStr] = payload.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false;
    }
    
    // Verify signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const expectedSignature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison
    if (signatureHex.length !== expectedSignatureHex.length) {
      return false;
    }
    
    let match = 0;
    for (let i = 0; i < signatureHex.length; i++) {
      match |= signatureHex.charCodeAt(i) ^ expectedSignatureHex.charCodeAt(i);
    }
    
    return match === 0;
  } catch (error) {
    console.error('[CSRF] Verification error:', error);
    return false;
  }
}

/**
 * Generate CSRF token (Cloudflare Workers compatible)
 * Always uses Web Crypto API for Workers compatibility
 * 
 * @param expiresIn - Token expiry in milliseconds (default: 5 minutes)
 * @param envSecret - Optional secret from environment
 */
export async function generateCsrfToken(expiresIn: number = 5 * 60 * 1000, envSecret?: string): Promise<string> {
  return generateCsrfTokenWorkers(expiresIn, envSecret);
}

/**
 * Verify CSRF token (Cloudflare Workers compatible)
 * Always uses Web Crypto API for Workers compatibility
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  return verifyCsrfTokenWorkers(token);
}

/**
 * Log headers block for rg indexing (no-op in Workers, logs to console)
 */
function logHeadersForRg(rgBlock: string): void {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} ${rgBlock}`;
  
  // In Cloudflare Workers, we can't write to files, so log to console
  console.log(`[CSRF] ${logLine}`);
}

/**
 * Middleware function to verify CSRF token from request headers
 */
export async function verifyCsrfFromRequest(request: Request): Promise<boolean> {
  const csrfToken = request.headers.get("X-CSRF-Token");
  
  if (!csrfToken) {
    const rgBlock = `[HEADERS_BLOCK_START:v1]{csrfValid:false,error:MISSING_TOKEN}~[SECURITY][nowgoal26.com][CSRF][TOKEN_VERIFY][HTTP/1.1][TES-NGWS-001][WebCrypto][#REF:MISSING_TOKEN ][HEADERS_BLOCK_END]`;
    logHeadersForRg(rgBlock);
    return false;
  }
  
  return await verifyCsrfToken(csrfToken);
}

