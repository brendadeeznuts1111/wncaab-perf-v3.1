/**
 * NowGoal WebSocket Connection - TES-NGWS-001.5, TES-NGWS-001.8, TES-NGWS-001.9
 * 
 * WebSocket connection to NowGoal's real-time odds stream.
 * Includes reconnection logic, XML parsing, and data transformation.
 * 
 * @module src/lib/nowgoal-websocket
 */

import { getTESDomainConfigCached } from '../config/tes-domain-config.ts';
import { getFreshJwtToken, refreshJwtTokenIfNeeded } from './nowgoal-jwt-acquisition.ts';
import { NowGoalProtocolAnalyzer } from './protocol-analyzer.ts';
import { SteamPatternAnalyzer } from './steam-pattern-analyzer.ts';
import { transformToNowGoalTick } from './transform-nowgoal.ts';
import type { NowGoalTick } from '../models/nowgoal-tick.ts';

/**
 * NowGoal WebSocket Configuration
 */
export interface NowGoalWebSocketConfig {
  /**
   * WebSocket base URL (default: wss://www.nowgoal26.com:9800/stream)
   */
  wsUrl: string;
  
  /**
   * Channels to subscribe to
   * NBA: ["nba_change_xml", "ch_nbaGoal8_xml"]
   * General: ["change_xml", "ch_goal8_xml"]
   */
  channels?: string[];
  
  /**
   * JWT token for authentication (optional, will be acquired if not provided)
   */
  jwtToken?: string;
  
  /**
   * Token expiration timestamp (optional)
   */
  tokenExpiresAt?: number;
  
  /**
   * Reconnection settings
   */
  reconnect: {
    /**
     * Initial delay in milliseconds (default: 1000)
     */
    initialDelay: number;
    
    /**
     * Maximum delay in milliseconds (default: 60000)
     */
    maxDelay: number;
    
    /**
     * Exponential backoff multiplier (default: 2)
     */
    multiplier: number;
    
    /**
     * Maximum retry attempts (default: Infinity)
     */
    maxRetries: number;
  };
  
  /**
   * Heartbeat/keep-alive interval in milliseconds (default: 30000)
   */
  heartbeatInterval: number;
  
  /**
   * Connection timeout in milliseconds (default: 10000)
   */
  connectionTimeout: number;
}

/**
 * Default WebSocket configuration
 * 
 * REVERSE-ENGINEERED: Actual NowGoal WebSocket endpoints
 * URL: wss://www.nowgoal26.com:9800/stream?channels=<channels>&&token=<jwt>
 * Channels: nba_change_xml, ch_nbaGoal8_xml (NBA) or change_xml, ch_goal8_xml (general)
 */
const DEFAULT_WS_CONFIG: NowGoalWebSocketConfig = {
  wsUrl: 'wss://www.nowgoal26.com:9800/stream', // Actual WebSocket URL
  channels: ['nba_change_xml', 'ch_nbaGoal8_xml'], // Default NBA channels
  reconnect: {
    initialDelay: 1000,
    maxDelay: 60000,
    multiplier: 2,
    maxRetries: Infinity,
  },
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
};

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
  CLOSED = 'CLOSED',
}

/**
 * WebSocket event callbacks
 */
export interface NowGoalWebSocketCallbacks {
  /**
   * Called when WebSocket connection is established
   */
  onOpen?: (ws: WebSocket) => void;
  
  /**
   * Called when a message is received
   */
  onMessage?: (data: any, ws: WebSocket) => void;
  
  /**
   * Called when an error occurs
   */
  onError?: (error: Error, ws: WebSocket) => void;
  
  /**
   * Called when WebSocket connection is closed
   */
  onClose?: (code: number, reason: string, ws: WebSocket) => void;
  
  /**
   * Called when reconnection attempt starts
   */
  onReconnect?: (attempt: number, delay: number) => void;
  
  /**
   * Called when XML parsing fails
   */
  onParseError?: (error: Error, rawXml: string) => void;
}

/**
 * NowGoal WebSocket Connection Manager
 */
export class NowGoalWebSocketManager {
  private ws: WebSocket | null = null;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private config: NowGoalWebSocketConfig;
  private callbacks: NowGoalWebSocketCallbacks;
  private reconnectAttempts = 0;
  private reconnectTimer: Timer | null = null;
  private heartbeatTimer: Timer | null = null;
  private connectionTimeoutTimer: Timer | null = null;
  private currentJwtToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private steamAnalyzer: SteamPatternAnalyzer;
  
  constructor(
    config: Partial<NowGoalWebSocketConfig> = {},
    callbacks: NowGoalWebSocketCallbacks = {}
  ) {
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
    this.callbacks = callbacks;
    this.steamAnalyzer = new SteamPatternAnalyzer();
  }
  
  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED && 
           this.ws !== null && 
           this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Connect to NowGoal WebSocket
   * 
   * TES-NGWS-001.5: Develop connectNowGoalWebSocket() Function
   */
  async connect(): Promise<void> {
    if (this.state === WebSocketState.CONNECTING || 
        this.state === WebSocketState.CONNECTED) {
      console.warn('[NowGoal WS] Already connecting or connected');
      return;
    }
    
    this.state = WebSocketState.CONNECTING;
    
    try {
      // Acquire or refresh JWT token
      await this.ensureValidToken();
      
      if (!this.currentJwtToken) {
        throw new Error('Failed to acquire JWT token');
      }
      
      // Build WebSocket URL with authentication
      const wsUrl = this.buildWebSocketUrl();
      
      // Log connection attempt
      this.logWebSocketEvent('CONNECT_ATTEMPT', {
        url: wsUrl,
        tokenPreview: this.currentJwtToken.substring(0, 20) + '...',
      });
      
      // Create WebSocket connection
      // REVERSE-ENGINEERED: Token goes in URL query parameter, not headers
      // Bun WebSocket doesn't support custom headers in constructor
      this.ws = new WebSocket(wsUrl);
      
      // Set up connection timeout
      this.connectionTimeoutTimer = setTimeout(() => {
        if (this.state === WebSocketState.CONNECTING) {
          this.ws?.close();
          this.handleError(new Error('WebSocket connection timeout'));
        }
      }, this.config.connectionTimeout);
      
      // Set up event handlers
      this.setupEventHandlers();
      
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Build WebSocket URL with authentication
   * 
   * REVERSE-ENGINEERED: wss://www.nowgoal26.com:9800/stream?channels=<channels>&&token=<jwt>
   */
  private buildWebSocketUrl(): string {
    const baseUrl = this.config.wsUrl;
    const channels = this.config.channels || ['nba_change_xml', 'ch_nbaGoal8_xml'];
    const channelsParam = channels.join(',');
    
    // Build URL with channels and token
    const url = new URL(baseUrl);
    url.searchParams.set('channels', channelsParam);
    
    // Add token if available (will be added after JWT acquisition)
    if (this.currentJwtToken) {
      url.searchParams.set('token', this.currentJwtToken);
    }
    
    return url.toString();
  }
  
  /**
   * Ensure we have a valid JWT token
   */
  private async ensureValidToken(): Promise<void> {
    const wasRefreshed = !this.currentJwtToken || 
      (this.tokenExpiresAt && this.tokenExpiresAt - Date.now() < 300000); // 5 minutes
    
    const refreshed = await refreshJwtTokenIfNeeded(
      this.currentJwtToken,
      this.tokenExpiresAt,
      300 // Refresh if expires within 5 minutes
    );
    
    this.currentJwtToken = refreshed.token;
    this.tokenExpiresAt = refreshed.expiresAt;
    
    // Log if token was refreshed
    if (wasRefreshed) {
      console.log(`[JWT_REFRESH] Token refreshed, expires at ${new Date(refreshed.expiresAt).toISOString()}`);
    }
  }
  
  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    // onopen handler
    this.ws.onopen = (event) => {
      if (this.connectionTimeoutTimer) {
        clearTimeout(this.connectionTimeoutTimer);
        this.connectionTimeoutTimer = null;
      }
      
      this.state = WebSocketState.CONNECTED;
      this.reconnectAttempts = 0;
      
      // Log WebSocket extensions (compression negotiation)
      // Bun automatically negotiates permessage-deflate if server supports it
      const extensions = (this.ws as any).extensions || 'none';
      const hasCompression = extensions.includes('permessage-deflate') || extensions.includes('deflate');
      
      // Enhanced logging matching browser validation
      console.log(`[WS_OPEN] Connection established with compression: ${extensions}`);
      
      this.logWebSocketEvent('CONNECTED', {
        url: this.config.wsUrl,
        extensions: extensions,
        compressionEnabled: hasCompression,
        readyState: this.ws?.readyState,
      });
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Start token refresh timer (tokens expire in ~60 seconds)
      this.startTokenRefreshTimer();
      
      // Call user callback
      this.callbacks.onOpen?.(this.ws!);
    };
    
    // onmessage handler - Enhanced message handler with binary detection
    this.ws.onmessage = async (event) => {
      const data = event.data;
      
      // Handle Blob by converting to ArrayBuffer
      if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        await this.handleBinaryMessage(arrayBuffer);
        return;
      }
      
      // Handle ArrayBuffer
      // Note: If permessage-deflate is negotiated, Bun should auto-decompress
      // Binary ArrayBuffer here likely means uncompressed heartbeat or fallback
      if (data instanceof ArrayBuffer) {
        // Log binary heartbeat for monitoring
        if (data.byteLength <= 16) {
          // Small binary messages are likely heartbeats
          console.log(`[BINARY_HEARTBEAT] ${data.byteLength} bytes`);
        }
        await this.handleBinaryMessage(data);
        return;
      }
      
      // String messages
      if (typeof data === "string") {
        // NowGoal sends "ok" as a keepalive/heartbeat message - skip it
        // Reference: https://live.nowgoal26.com/scripts/common
        // Their code: if(r!="ok"){...process message...}
        if (data === "ok") {
          // Heartbeat/keepalive - silently ignore
          return;
        }
        
        try {
          if (data.startsWith('<')) {
            // XML - parse it (Bun automatically decompresses if permessage-deflate was negotiated)
            const rgMetadata = this.getRgMetadata();
            const parsedData = await this.parseXmlMessage(data);
            
            if (parsedData !== null) {
              const transformedData = this.transformData(parsedData);
              
              // Detect steam patterns
              const isSteam = this.steamAnalyzer.detectSteam(transformedData);
              
              // Log steam detection with RG block
              if (isSteam) {
                const steamRgBlock = this.generateRgBlock({
                  scope: "ANALYSIS",
                  domain: getTESDomainConfigCached().nowgoalDomain,
                  type: "DETECTION",
                  meta: "STEAM_PATTERN",
                  version: "BUN-V1.3",
                  ticket: "TES-NGWS-001.11",
                  bunApi: "SteamPatternAnalyzer"
                });
                console.log(`[STEAM_DETECTED] ${steamRgBlock}`);
              }
              
              // Call user callback
              this.callbacks.onMessage?.(transformedData, this.ws!);
            }
          } else if (data.startsWith('{')) {
            // JSON - log it for analysis
            console.log(`[JSON_MESSAGE] ${data.substring(0, 200)}`);
          } else {
            // Plain text
            console.log(`[TEXT_MESSAGE] ${data.substring(0, 200)}`);
          }
        } catch (error) {
          this.handleParseError(error instanceof Error ? error : new Error(String(error)), data);
        }
      }
    };
    
    // onerror handler
    this.ws.onerror = (event) => {
      const error = new Error('WebSocket error occurred');
      this.handleError(error);
    };
    
    // onclose handler
    this.ws.onclose = (event) => {
      this.state = WebSocketState.CLOSED;
      this.stopHeartbeat();
      this.stopTokenRefreshTimer();
      
      this.logWebSocketEvent('CLOSED', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      
      // Call user callback
      this.callbacks.onClose?.(event.code, event.reason, this.ws!);
      
      // Attempt reconnection if not intentionally closed
      if (event.code !== 1000 && this.reconnectAttempts < this.config.reconnect.maxRetries) {
        this.scheduleReconnect();
      }
    };
  }
  
  /**
   * Parse XML message
   * 
   * TES-NGWS-001.8: Integrate fast-xml-parser for Parsing
   * 
   * Handles both string XML and binary data (which may be compressed/encoded)
   */
  private async parseXmlMessage(data: string | Blob | ArrayBuffer): Promise<any> {
    // Convert data to string if needed
    let xmlString: string;
    if (typeof data === 'string') {
      xmlString = data;
    } else if (data instanceof Blob) {
      xmlString = await data.text();
    } else {
      // ArrayBuffer - decode as UTF-8 (non-fatal to handle binary data)
      xmlString = new TextDecoder('utf-8', { fatal: false }).decode(data);
    }
    
    // Check if this looks like XML (starts with < or whitespace + <)
    const trimmed = xmlString.trim();
    const isXml = trimmed.startsWith('<');
    
    if (!isXml) {
      // This might be binary data or a different format
      // Log it but don't try to parse as XML
      this.logWebSocketEvent('BINARY_DATA_RECEIVED', {
        length: xmlString.length,
        preview: xmlString.substring(0, 100),
        isXml: false,
        firstBytes: Array.from(new Uint8Array(data instanceof ArrayBuffer ? data.slice(0, 10) : new TextEncoder().encode(xmlString).slice(0, 10))).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '),
      });
      
      // Return null to indicate this message should be skipped
      return null;
    }
    
    // Log raw XML for debugging
    this.logWebSocketEvent('XML_RECEIVED', {
      length: xmlString.length,
      preview: xmlString.substring(0, 100),
    });
    
    // Import and use the new XML parser
    const { parseNowGoalXml } = await import('./nowgoal-xml-parser.ts');
    
    // Parse XML with rg metadata
    const tick = parseNowGoalXml(xmlString, this.getRgMetadata());
    
    return tick;
  }
  
  /**
   * Handle binary message (ArrayBuffer)
   * 
   * TES-NGWS-001.11: Binary Protocol Handling with Protocol Analyzer
   */
  private async handleBinaryMessage(data: ArrayBuffer): Promise<void> {
    // Use protocol analyzer to identify format
    const analysis = NowGoalProtocolAnalyzer.analyzeWithLogging(data);
    
    const rgBlock = this.generateRgBlock({
      scope: "STREAM",
      domain: getTESDomainConfigCached().nowgoalDomain,
      type: "DATA",
      meta: "BINARY_MESSAGE",
      version: analysis.type.toUpperCase(),
      ticket: "TES-NGWS-001.11",
      bunApi: "WebSocket"
    });
    
    // Handle based on analysis result
    if (analysis.decoded) {
      // NowGoal uses deflate-compressed JSON (not XML!)
      // Reference: https://live.nowgoal26.com/scripts/common
      // They use: JSON.parse(pako.inflate(data, {to:"string"}))
      
      // Try parsing as JSON first (NowGoal's actual format)
      if (analysis.type === "deflate-json" || analysis.type === "zlib") {
        try {
          const jsonData = JSON.parse(analysis.decoded);
          
          // Log JSON message for analysis
          console.log(`[JSON_DECOMPRESSED] type:${analysis.type} | keys:${Object.keys(jsonData).join(',')}`);
          
          // NowGoal sends JSON objects, not XML ticks
          // Transform JSON to NowGoalTick format for consistency
          try {
            const transformedTick = this.transformJsonToNowGoalTick(jsonData);
            this.callbacks.onMessage?.(transformedTick, this.ws!);
          } catch (transformError) {
            // If transformation fails, pass raw JSON as fallback
            console.warn(`[TRANSFORM_FAIL] ${transformError instanceof Error ? transformError.message : String(transformError)}, passing raw JSON`);
            this.callbacks.onMessage?.(jsonData, this.ws!);
          }
          return;
        } catch (error) {
          // Not valid JSON, fall through to XML/text handling
          console.log(`[DECODE_FAIL] Not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Fallback: Try parsing as XML (for compatibility)
      if (analysis.decoded.startsWith('<')) {
        try {
          const parsedData = await this.parseXmlMessage(analysis.decoded);
          if (parsedData !== null) {
            const transformedData = this.transformData(parsedData);
            
            // Detect steam patterns
            const isSteam = this.steamAnalyzer.detectSteam(transformedData);
            
            // Log steam detection with RG block
            if (isSteam) {
              const steamRgBlock = this.generateRgBlock({
                scope: "ANALYSIS",
                domain: getTESDomainConfigCached().nowgoalDomain,
                type: "DETECTION",
                meta: "STEAM_PATTERN",
                version: "BUN-V1.3",
                ticket: "TES-NGWS-001.11",
                bunApi: "SteamPatternAnalyzer"
              });
              console.log(`[STEAM_DETECTED] ${steamRgBlock}`);
            }
            
            this.callbacks.onMessage?.(transformedData, this.ws!);
          }
        } catch (error) {
          this.handleParseError(error instanceof Error ? error : new Error(String(error)), analysis.decoded);
        }
      } else {
        // Decoded but not XML or JSON - log for analysis
        console.log(`[DECODED_${analysis.type.toUpperCase()}] ${analysis.decoded.substring(0, 200)}`);
      }
    } else {
      // Could not decode - use fallback decompression methods
      const firstByte = new Uint8Array(data)[0];
      
      if (firstByte === 0x1f && new Uint8Array(data)[1] === 0x8b) {
        await this.handleGzipCompressed(data, rgBlock);
      } else if (firstByte === 0x78) {
        await this.handleZlibCompressed(data, rgBlock);
      } else {
        // Unknown binary format - log raw bytes for analysis
        this.logRawBytes(data, rgBlock);
      }
    }
  }

  /**
   * Generate RG block for logging
   */
  private generateRgBlock(params: {
    scope: string;
    domain: string;
    type: string;
    meta: string;
    version: string;
    ticket: string;
    bunApi: string;
  }): string {
    const timestamp = Date.now();
    const tesConfig = getTESDomainConfigCached();
    const domain = params.domain || tesConfig.nowgoalDomain;
    return `{${params.meta}}~[${params.scope}][${domain}][${params.type}][${params.meta}][${params.version}][${params.ticket}][${params.bunApi}][#REF:${this.config.wsUrl}][TIMESTAMP:${timestamp}]`;
  }

  /**
   * Get RG metadata for current connection
   */
  private getRgMetadata(): string {
    return `[WEBSOCKET][${getTESDomainConfigCached().nowgoalDomain}][CONNECTION][WS_MESSAGE][WS/13][TES-NGWS-001.5][Bun.WebSocket][#REF:${this.config.wsUrl}][TIMESTAMP:${Date.now()}]`;
  }
  
  /**
   * Transform JSON message to NowGoalTick format
   * 
   * TES-NGWS-001.9: Transform JSON to NowGoalTick for consistency
   * 
   * @param jsonData - JSON object from decompressed WebSocket message
   * @returns Transformed NowGoalTick
   */
  private transformJsonToNowGoalTick(jsonData: any): NowGoalTick {
    // Generate RG metadata for this transformation
    const rgMetadata = this.generateRgBlock({
      scope: "STREAM",
      domain: getTESDomainConfigCached().nowgoalDomain,
      type: "DATA",
      meta: "JSON_TRANSFORM",
      version: "BUN-V1.3",
      ticket: "TES-NGWS-001.9",
      bunApi: "transform-nowgoal"
    });
    
    // Use existing transform utility (handles both XML and JSON structures)
    // The transform function is flexible enough to handle JSON objects
    return transformToNowGoalTick(jsonData, rgMetadata);
  }

  /**
   * Transform parsed XML data
   * 
   * TES-NGWS-001.9: Define NowGoal Data Model & Transformer
   * 
   * Data is already transformed to NowGoalTick by parseNowGoalXml, just return it
   */
  private transformData(parsedData: any): any {
    // Data is already transformed to NowGoalTick by parseNowGoalXml
    // Just return it as-is
    return parsedData;
  }
  
  /**
   * Handle GZIP compressed data
   */
  private async handleGzipCompressed(data: ArrayBuffer, rgMetadata: string): Promise<void> {
    try {
      const decompressed = Bun.gunzipSync(new Uint8Array(data));
      const text = new TextDecoder().decode(decompressed);
      
      // Log successful decompression
      console.log(`[GZIP_DECOMPRESSED] Original:${data.byteLength} → Decompressed:${text.length} bytes`);
      
      // Try parsing as XML
      if (text.startsWith('<')) {
        const parsedData = await this.parseXmlMessage(text);
        if (parsedData !== null) {
          const transformedData = this.transformData(parsedData);
          
          // Detect steam patterns
          const isSteam = this.steamAnalyzer.detectSteam(transformedData);
          
          // Log steam detection with RG block
          if (isSteam) {
            const steamRgBlock = this.generateRgBlock({
              scope: "ANALYSIS",
              domain: getTESDomainConfigCached().nowgoalDomain,
              type: "DETECTION",
              meta: "STEAM_PATTERN",
              version: "BUN-V1.3",
              ticket: "TES-NGWS-001.11",
              bunApi: "SteamPatternAnalyzer"
            });
            console.log(`[STEAM_DETECTED] ${steamRgBlock}`);
          }
          
          this.callbacks.onMessage?.(transformedData, this.ws!);
        }
      } else {
        console.log(`[GZIP_TEXT] ${text.substring(0, 200)}`);
      }
    } catch (e) {
      console.error(`[GZIP_FAIL] ${e instanceof Error ? e.message : String(e)}`);
      this.logWebSocketEvent('GZIP_DECOMPRESS_FAIL', {
        error: e instanceof Error ? e.message : String(e),
        dataLength: data.byteLength,
      });
    }
  }

  /**
   * Handle ZLIB compressed data
   */
  private async handleZlibCompressed(data: ArrayBuffer, rgMetadata: string): Promise<void> {
    try {
      // Bun.inflateSync handles zlib decompression
      const decompressed = Bun.inflateSync(new Uint8Array(data));
      const text = new TextDecoder().decode(decompressed);
      
      // Log successful decompression
      console.log(`[ZLIB_DECOMPRESSED] Original:${data.byteLength} → Decompressed:${text.length} bytes`);
      
      // Try parsing as XML
      if (text.startsWith('<')) {
        const parsedData = await this.parseXmlMessage(text);
        if (parsedData !== null) {
          const transformedData = this.transformData(parsedData);
          
          // Detect steam patterns
          const isSteam = this.steamAnalyzer.detectSteam(transformedData);
          
          // Log steam detection with RG block
          if (isSteam) {
            const steamRgBlock = this.generateRgBlock({
              scope: "ANALYSIS",
              domain: getTESDomainConfigCached().nowgoalDomain,
              type: "DETECTION",
              meta: "STEAM_PATTERN",
              version: "BUN-V1.3",
              ticket: "TES-NGWS-001.11",
              bunApi: "SteamPatternAnalyzer"
            });
            console.log(`[STEAM_DETECTED] ${steamRgBlock}`);
          }
          
          this.callbacks.onMessage?.(transformedData, this.ws!);
        }
      } else {
        console.log(`[ZLIB_TEXT] ${text.substring(0, 200)}`);
      }
    } catch (e) {
      console.error(`[ZLIB_FAIL] ${e instanceof Error ? e.message : String(e)}`);
      this.logWebSocketEvent('ZLIB_DECOMPRESS_FAIL', {
        error: e instanceof Error ? e.message : String(e),
        dataLength: data.byteLength,
      });
    }
  }

  /**
   * Log raw bytes for pattern analysis
   */
  private logRawBytes(data: ArrayBuffer, rgMetadata: string): void {
    const hexBytes = Array.from(new Uint8Array(data).slice(0, 32))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join(' ');
    
    // Log first 32 bytes in hex for pattern analysis
    console.log(`[BINARY_HEX] ${hexBytes} | length:${data.byteLength} | rg:${rgMetadata}`);
    
    this.logWebSocketEvent('BINARY_RAW_BYTES', {
      hexPreview: hexBytes,
      length: data.byteLength,
      rgMetadata,
    });
  }

  /**
   * Handle parse error
   */
  private handleParseError(error: Error, rawXml: string | ArrayBuffer | Blob): void {
    // Convert rawXml to string preview for logging
    let xmlPreview = '';
    if (typeof rawXml === 'string') {
      xmlPreview = rawXml.substring(0, 200);
    } else if (rawXml instanceof ArrayBuffer) {
      xmlPreview = new TextDecoder().decode(rawXml.slice(0, 200));
    } else if (rawXml instanceof Blob) {
      // For Blob, we can't easily preview without async, so just note it
      xmlPreview = `[Blob: ${rawXml.size} bytes]`;
    } else {
      xmlPreview = String(rawXml).substring(0, 200);
    }
    
    this.logWebSocketEvent('PARSE_ERROR', {
      error: error.message,
      xmlPreview,
    });
    
    this.callbacks.onParseError?.(error, typeof rawXml === 'string' ? rawXml : xmlPreview);
  }
  
  /**
   * Start heartbeat/keep-alive
   * 
   * TES-NGWS-001.7: Stream Heartbeat/Keep-alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected() && this.ws) {
        // Send ping message
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        this.logWebSocketEvent('HEARTBEAT_SENT', {});
      }
    }, this.config.heartbeatInterval);
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Start token refresh timer
   * 
   * REVERSE-ENGINEERED: JWT tokens expire in ~60 seconds, refresh 5s before expiry
   */
  private tokenRefreshTimer: Timer | null = null;
  
  private startTokenRefreshTimer(): void {
    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    if (!this.tokenExpiresAt) return;
    
    const refreshMs = this.tokenExpiresAt - Date.now() - 5000; // Refresh 5s before expiry
    
    if (refreshMs > 0) {
      this.tokenRefreshTimer = setTimeout(() => {
        this.logWebSocketEvent('JWT_REFRESH_SCHEDULED', {
          expiresAt: this.tokenExpiresAt,
          refreshIn: refreshMs,
        });
        
        // Refresh token and reconnect
        this.ensureValidToken().then(() => {
          if (this.isConnected()) {
            // Close and reconnect with new token
            this.ws?.close();
            // Reconnection logic will handle the reconnect
          } else {
            // If not connected, just update token for next connection attempt
            this.logWebSocketEvent('JWT_REFRESHED', {
              newExpiresAt: this.tokenExpiresAt,
            });
          }
        }).catch((error) => {
          this.handleError(error instanceof Error ? error : new Error(String(error)));
        });
      }, refreshMs);
    }
  }
  
  /**
   * Stop token refresh timer
   */
  private stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }
  
  /**
   * Schedule reconnection with exponential backoff
   * 
   * TES-NGWS-001.6: Implement Robust Reconnection Logic
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }
    
    this.state = WebSocketState.RECONNECTING;
    this.reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnect.initialDelay * Math.pow(this.config.reconnect.multiplier, this.reconnectAttempts - 1),
      this.config.reconnect.maxDelay
    );
    
    this.logWebSocketEvent('RECONNECT_SCHEDULED', {
      attempt: this.reconnectAttempts,
      delay,
    });
    
    this.callbacks.onReconnect?.(this.reconnectAttempts, delay);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
  
  /**
   * Handle error
   */
  private handleError(error: Error): void {
    this.state = WebSocketState.ERROR;
    
    this.logWebSocketEvent('ERROR', {
      error: error.message,
      stack: error.stack,
    });
    
    this.callbacks.onError?.(error, this.ws!);
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.config.reconnect.maxRetries) {
      this.scheduleReconnect();
    }
  }
  
  /**
   * Log WebSocket event with rg-compatible format
   */
  private logWebSocketEvent(event: string, metadata: Record<string, any>): void {
    const timestamp = Date.now();
    const tesConfig = getTESDomainConfigCached();
    const domain = tesConfig.nowgoalDomain;
    
    // RG-compatible serialization format
    const enriched = `X-WS-${event}:${JSON.stringify(metadata)}~[WEBSOCKET][${domain}][NETWORK_CONTROL][WS_${event}][WS/13][TES-NGWS-001.5][Bun.WebSocket][#REF:${this.config.wsUrl}][TIMESTAMP:${timestamp}]`;
    
    // Log to headers-index.log
    const logLine = `${new Date().toISOString()} ${enriched}\n`;
    // Use Bun.write without await (fire and forget for logging)
    Bun.write("logs/headers-index.log", logLine).catch((error) => {
      console.error(`[NowGoal WS] Failed to write rg log: ${error}`);
    });
  }
  
  /**
   * Send message through WebSocket
   */
  send(data: string | ArrayBuffer | Blob): void {
    if (!this.isConnected() || !this.ws) {
      throw new Error('WebSocket is not connected');
    }
    
    this.ws.send(data);
  }
  
  /**
   * Close WebSocket connection
   */
  close(code?: number, reason?: string): void {
    this.stopHeartbeat();
    this.stopTokenRefreshTimer();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(code || 1000, reason);
      this.ws = null;
    }
    
    this.state = WebSocketState.DISCONNECTED;
  }
}

/**
 * Connect to NowGoal WebSocket
 * 
 * TES-NGWS-001.5: Develop connectNowGoalWebSocket() Function
 * 
 * Convenience function to create and connect a WebSocket manager
 */
export async function connectNowGoalWebSocket(
  config?: Partial<NowGoalWebSocketConfig>,
  callbacks?: NowGoalWebSocketCallbacks
): Promise<NowGoalWebSocketManager> {
  const manager = new NowGoalWebSocketManager(config, callbacks);
  await manager.connect();
  return manager;
}

