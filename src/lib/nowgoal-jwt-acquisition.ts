/**
 * NowGoal JWT Acquisition - TES-NGWS-001.1 & TES-NGWS-001.2
 * 
 * Reverse-engineered JWT acquisition from NowGoal's authentication system.
 * Implements getFreshJwtToken() using Bun.fetch() with rg-compatible logging.
 * 
 * @module src/lib/nowgoal-jwt-acquisition
 */

import { getTESDomainConfigCached } from '../config/tes-domain-config.ts';

/**
 * NowGoal JWT Acquisition Configuration
 * 
 * ✅ REVERSE-ENGINEERING COMPLETE (2024-12-19)
 * Endpoint details reverse-engineered from NowGoal's live authentication system.
 * See docs/TES-NGWS-001.1-REVERSE-ENGINEERING.md for full details.
 */
export interface NowGoalJwtConfig {
  /**
   * NowGoal authentication endpoint URL
   */
  authEndpoint: string;
  
  /**
   * HTTP method for authentication
   */
  method: 'GET' | 'POST';
  
  /**
   * Request headers required for authentication
   */
  headers: Record<string, string>;
  
  /**
   * Request body/payload (if POST)
   */
  body?: Record<string, any> | string;
  
  /**
   * Query parameters (if GET)
   */
  queryParams?: Record<string, string>;
  
  /**
   * JWT token location in response
   */
  tokenLocation: 'cookie' | 'header' | 'body';
  
  /**
   * Token field name (if in body) or cookie name (if in cookie)
   */
  tokenFieldName: string;
  
  /**
   * Token expiration time in seconds
   */
  tokenExpiration: number;
}

/**
 * Default NowGoal JWT configuration
 * 
 * REVERSE-ENGINEERED: Actual NowGoal authentication endpoint
 * Endpoint: GET https://live.nowgoal26.com/ajax/getwebsockettoken?rnum=<random>
 * Response: Plain text JWT token
 * Token TTL: ~60 seconds
 */
const DEFAULT_NOWGOAL_JWT_CONFIG: NowGoalJwtConfig = {
  authEndpoint: '/ajax/getwebsockettoken', // Actual endpoint
  method: 'GET', // GET request with random number parameter
  headers: {
    'Origin': 'https://live.nowgoal26.com',
    'Referer': 'https://live.nowgoal26.com/basketball',
    'User-Agent': 'TES-NowGoal-Client/1.0',
    'Accept': '*/*',
  },
  queryParams: {
    // rnum will be added dynamically with random number
  },
  tokenLocation: 'body', // Plain text response body
  tokenFieldName: '', // Entire response is the token
  tokenExpiration: 60, // ~60 seconds based on JWT exp claim
};

/**
 * Log header with rg-compatible metadata enrichment
 * 
 * Format: HeaderName:HeaderValue~[SCOPE][domain][HEADER_TYPE][META_PURPOSE][VERSION][TICKET][BUN_API][#REF:url][TIMESTAMP:timestamp]
 * 
 * @param headerName - HTTP header name
 * @param headerValue - HTTP header value
 * @param context - Context metadata
 */
function logHeaderForRg(
  headerName: string,
  headerValue: string,
  context: {
    scope: 'AUTH' | 'STREAM' | 'REQUEST' | 'RESPONSE' | 'WEBSOCKET' | 'NETWORK_CONTROL';
    headerType: 'SECURITY' | 'CLIENT_INFO' | 'NETWORK_CONTROL' | 'API_METADATA' | 'CORS' | 'CACHE' | 'CONTENT';
    metaPurpose: string;
    bunApi: string;
    ref: string;
  }
): void {
  const timestamp = Date.now();
  const version = 'HTTP/1.1';
  const ticket = 'TES-NGWS-001.1';
  const tesConfig = getTESDomainConfigCached();
  const domain = tesConfig.nowgoalDomain;
  
  // RG-compatible serialization format
  const enriched = `${headerName}:${headerValue}~[${context.scope}][${domain}][${context.headerType}][${context.metaPurpose}][${version}][${ticket}][${context.bunApi}][#REF:${context.ref}][TIMESTAMP:${timestamp}]`;
  
  // Log to headers-index.log (async write)
  const logLine = `${new Date().toISOString()} ${enriched}\n`;
  // Use Bun.write without await (fire and forget for logging)
  Bun.write("logs/headers-index.log", logLine).catch((error) => {
    console.error(`[NowGoal JWT] Failed to write rg log: ${error}`);
  });
}

/**
 * Acquire fresh JWT token from NowGoal
 * 
 * TES-NGWS-001.2: Implement getFreshJwtToken() with Bun.fetch() and rg-Compatible Logging
 * 
 * @param config - Optional NowGoal JWT configuration (uses defaults if not provided)
 * @returns JWT token string and expiration time
 * @throws Error if token acquisition fails
 */
export async function getFreshJwtToken(
  config: Partial<NowGoalJwtConfig> = {}
): Promise<{ token: string; expiresIn: number; expiresAt: number }> {
  const tesConfig = getTESDomainConfigCached();
  const jwtConfig: NowGoalJwtConfig = {
    ...DEFAULT_NOWGOAL_JWT_CONFIG,
    ...config,
  };
  
  // Build full URL
  const baseUrl = tesConfig.nowgoalApiBaseUrl;
  const url = new URL(jwtConfig.authEndpoint, baseUrl);
  
  // Add random number parameter for anti-caching (GET request)
  if (jwtConfig.method === 'GET') {
    const rnum = Math.random();
    url.searchParams.set('rnum', String(rnum));
    
    // Add any additional query parameters
    if (jwtConfig.queryParams) {
      Object.entries(jwtConfig.queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
  }
  
  // Override base URL for NowGoal auth endpoint (uses live.nowgoal26.com)
  const authUrl = jwtConfig.authEndpoint.startsWith('http') 
    ? jwtConfig.authEndpoint 
    : `https://live.nowgoal26.com${jwtConfig.authEndpoint}${url.search}`;
  
  // Prepare request options
  const requestOptions: RequestInit = {
    method: jwtConfig.method,
    headers: jwtConfig.headers,
  };
  
  // Add body if POST request
  if (jwtConfig.method === 'POST' && jwtConfig.body) {
    requestOptions.body = typeof jwtConfig.body === 'string'
      ? jwtConfig.body
      : JSON.stringify(jwtConfig.body);
  }
  
  // Use authUrl (which has correct domain) instead of url
  const finalUrl = authUrl;
  
  // Log request headers for rg
  Object.entries(jwtConfig.headers).forEach(([name, value]) => {
    logHeaderForRg(name, value, {
      scope: 'REQUEST',
      headerType: name.toLowerCase().includes('auth') || name.toLowerCase().includes('cookie')
        ? 'SECURITY'
        : name.toLowerCase().includes('content')
        ? 'CONTENT'
        : 'CLIENT_INFO',
      metaPurpose: 'JWT_ACQUIRE',
      bunApi: 'Bun.fetch',
      ref: finalUrl,
    });
  });
  
  try {
    // Make authentication request (use authUrl which has correct domain)
    const response = await fetch(authUrl, requestOptions);
    
    // Log response headers for rg
    response.headers.forEach((value, name) => {
      logHeaderForRg(name, value, {
        scope: 'RESPONSE',
        headerType: name.toLowerCase() === 'set-cookie'
          ? 'SECURITY'
          : name.toLowerCase().includes('content')
          ? 'CONTENT'
          : 'NETWORK_CONTROL',
        metaPurpose: name.toLowerCase() === 'set-cookie' ? 'JWT_SET' : 'API_RESPONSE',
        bunApi: 'Bun.fetch',
        ref: finalUrl,
      });
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`NowGoal JWT acquisition failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Extract JWT token based on configured location
    let token: string | null = null;
    
    if (jwtConfig.tokenLocation === 'cookie') {
      // Extract from Set-Cookie header
      const setCookieHeader = response.headers.get('Set-Cookie');
      if (setCookieHeader) {
        const cookieMatch = setCookieHeader.match(new RegExp(`${jwtConfig.tokenFieldName}=([^;]+)`));
        if (cookieMatch) {
          token = cookieMatch[1];
        }
      }
    } else if (jwtConfig.tokenLocation === 'header') {
      // Extract from response header
      token = response.headers.get(jwtConfig.tokenFieldName);
    } else if (jwtConfig.tokenLocation === 'body') {
      // Extract from response body (plain text for NowGoal)
      token = await response.text();
      token = token.trim(); // Remove any whitespace
    }
    
    if (!token) {
      throw new Error(`JWT token not found in ${jwtConfig.tokenLocation}`);
    }
    
    // Decode JWT to get expiration (for NowGoal: exp claim)
    let expiresIn = jwtConfig.tokenExpiration;
    let expiresAt = Date.now() + (expiresIn * 1000);
    
    try {
      // Decode JWT payload to get actual expiration
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
          expiresAt = payload.exp * 1000; // Convert to milliseconds
          expiresIn = Math.floor((expiresAt - Date.now()) / 1000);
        }
      }
    } catch (e) {
      // If JWT decode fails, use configured expiration
      console.warn('[NowGoal JWT] Failed to decode JWT expiration, using configured value');
    }
    
    // Log successful token acquisition
    logHeaderForRg('X-JWT-Acquired', 'true', {
      scope: 'AUTH',
      headerType: 'SECURITY',
      metaPurpose: 'JWT_ACQUIRE_SUCCESS',
      bunApi: 'Bun.fetch',
      ref: finalUrl,
    });
    
    // Console log matching expected format
    console.log(`[JWT_ACQUIRED] Token expires in ${expiresIn}s (at ${new Date(expiresAt).toISOString()})`);
    
    return {
      token,
      expiresIn,
      expiresAt,
    };
  } catch (error) {
    // Log failure
    logHeaderForRg('X-JWT-Acquire-Error', error instanceof Error ? error.message : String(error), {
      scope: 'AUTH',
      headerType: 'SECURITY',
      metaPurpose: 'JWT_ACQUIRE_FAILURE',
      bunApi: 'Bun.fetch',
      ref: finalUrl,
    });
    
    throw error;
  }
}

/**
 * Refresh JWT token if expired or about to expire
 * 
 * TES-NGWS-001.3: JWT Refresh & Lifecycle Management
 * 
 * @param currentToken - Current JWT token (optional)
 * @param expiresAt - Token expiration timestamp (optional)
 * @param refreshThreshold - Refresh if token expires within this many seconds (default: 300)
 * @returns Fresh JWT token
 */
export async function refreshJwtTokenIfNeeded(
  currentToken?: string | null,
  expiresAt?: number | null,
  refreshThreshold: number = 300
): Promise<{ token: string; expiresIn: number; expiresAt: number }> {
  // Check if token needs refresh
  const needsRefresh = !currentToken || 
    !expiresAt || 
    (expiresAt - Date.now()) < (refreshThreshold * 1000);
  
  if (needsRefresh) {
    return await getFreshJwtToken();
  }
  
  // Return existing token if still valid
  return {
    token: currentToken!,
    expiresIn: Math.floor((expiresAt! - Date.now()) / 1000),
    expiresAt: expiresAt!,
  };
}

