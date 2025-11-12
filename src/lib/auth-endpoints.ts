/**
 * Auth Endpoints - CSRF-Protected JWT Acquisition
 * 
 * JWT token acquisition endpoints with CSRF protection and cookie management.
 * 
 * @module src/lib/auth-endpoints
 */

import { createSessionCookie } from "./cookie-factory.ts";
import { generateCsrfToken, verifyCsrfFromRequest } from "./csrf-guard.ts";
import { logSecurityEvent } from "./security-audit.ts";
import { SECURITY_POLICY } from "../config/security-policy.ts";
import { getJwtSecret } from "./secrets-manager.ts";

/**
 * Generate a fresh JWT token
 * 
 * ✅ IMPLEMENTED: JWT generation using Bun crypto (zero-npm)
 * Uses HS256 algorithm with secret from Bun.secrets or environment
 * 
 * @returns JWT token object
 */
async function getFreshJwtToken(): Promise<{ token: string; expiresIn: number }> {
  const secret = await getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = SECURITY_POLICY.jwt.cookie.maxAge;
  const expiresAt = now + expiresIn;
  
  // JWT Header (HS256)
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  // JWT Payload
  const payload = {
    sub: "tes-auth-endpoint",
    iat: now,
    exp: expiresAt,
    jti: crypto.randomUUID(), // JWT ID for uniqueness
  };
  
  // Base64URL encode header and payload
  const base64UrlEncode = (obj: any): string => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };
  
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  
  // Create signature using HMAC-SHA256
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signatureInput);
  
  // Use Bun's crypto.subtle for HMAC
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureArray = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signature = base64UrlEncode(Array.from(new Uint8Array(signatureArray)));
  
  // Construct JWT
  const token = `${encodedHeader}.${encodedPayload}.${signature}`;
  
  return {
    token,
    expiresIn,
  };
}

/**
 * Handle JWT token acquisition endpoint
 * 
 * Requires CSRF token in X-CSRF-Token header
 * Returns JWT token and sets secure cookie
 * 
 * @param request - HTTP Request object
 * @returns Response with JWT token
 */
export async function handleTokenAcquisition(request: Request): Promise<Response> {
  // Verify CSRF token
  if (!(await verifyCsrfFromRequest(request))) {
    logSecurityEvent("CSRF_FAILURE", {
      type: "CSRF",
      api: "Bun.CSRF",
      ref: "https://bun.sh/docs/api/csrf",
    });
    
    return new Response("CSRF token missing or invalid", {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Status": "rejected",
      },
    });
  }
  
  // Generate fresh JWT token
  const jwt = await getFreshJwtToken();
  
  // Create secure session cookie (uses TES domain config automatically - TES-OPS-003.2)
  const sessionCookie = createSessionCookie(
    jwt.token,
    undefined, // Use TES domain config default
    jwt.expiresIn
  );
  
  // Log JWT refresh event
  logSecurityEvent("JWT_REFRESH", {
    type: "AUTH",
    api: "Bun.Cookie",
    ref: "https://bun.sh/docs/api/cookie",
  });
  
  // Build response with Set-Cookie header
  const response = new Response(JSON.stringify({
    token: jwt.token,
    expiresIn: jwt.expiresIn,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
  
  return response;
}

/**
 * Handle CSRF token generation endpoint
 * 
 * Returns CSRF token for SPA clients to use in subsequent requests
 * 
 * @param request - HTTP Request object
 * @returns Response with CSRF token
 */
export async function handleCsrfTokenGeneration(request: Request): Promise<Response> {
  const token = await generateCsrfToken();
  
  logSecurityEvent("CSRF_GEN", {
    type: "CSRF",
    api: "Bun.CSRF",
    ref: "https://bun.sh/docs/api/csrf",
  });
  
  return new Response(JSON.stringify({ token }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

