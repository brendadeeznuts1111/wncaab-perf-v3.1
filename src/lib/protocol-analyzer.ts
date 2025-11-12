/**
 * NowGoal Protocol Analyzer - TES-NGWS-001.11
 * 
 * Analyzes binary messages to identify compression format and protocol type.
 * Used for reverse-engineering NowGoal's binary WebSocket protocol.
 * 
 * @module src/lib/protocol-analyzer
 */

/**
 * Protocol analysis result
 */
export interface ProtocolAnalysisResult {
  type: string;
  decoded?: string;
  confidence: 'high' | 'medium' | 'low';
  metadata?: {
    originalSize: number;
    decompressedSize?: number;
    compressionRatio?: number;
  };
}

/**
 * NowGoal Protocol Analyzer
 * 
 * TES-NGWS-001.11: Binary Protocol Handling
 */
export class NowGoalProtocolAnalyzer {
  /**
   * Analyze binary data to identify protocol type and attempt decompression
   * 
   * Simple version matching the requested interface.
   * Based on NowGoal's actual implementation: binary messages are zlib/deflate compressed JSON
   * Reference: https://live.nowgoal26.com/scripts/common (uses pako.inflate)
   * 
   * @param data - ArrayBuffer to analyze
   * @returns Simple protocol analysis result with type and decoded content
   */
  static analyze(data: ArrayBuffer): { type: string; decoded?: string } {
    const bytes = new Uint8Array(data);
    
    // NowGoal uses zlib/deflate compression (pako.inflate)
    // Try deflate first (raw deflate, no header) - this is what pako.inflate expects
    try {
      // Bun.inflateSync handles both zlib (with header) and deflate (raw)
      const decompressed = Bun.inflateSync(bytes);
      const decoded = new TextDecoder().decode(decompressed);
      
      // NowGoal decompresses to JSON, not XML
      // Check if it's valid JSON
      try {
        JSON.parse(decoded);
        return {
          type: "deflate-json",
          decoded: decoded
        };
      } catch {
        // Not JSON, might be text
        return {
          type: "deflate",
          decoded: decoded
        };
      }
    } catch {}
    
    // Fallback: Test gzip (RFC 1952)
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      try {
        return {
          type: "gzip",
          decoded: new TextDecoder().decode(Bun.gunzipSync(bytes))
        };
      } catch {}
    }
    
    // Fallback: Test zlib (RFC 1950) with header
    if (bytes[0] === 0x78 && (bytes[1] === 0x9c || bytes[1] === 0x01 || bytes[1] === 0xda)) {
      try {
        const decompressed = Bun.inflateSync(bytes);
        const decoded = new TextDecoder().decode(decompressed);
        return {
          type: "zlib",
          decoded: decoded
        };
      } catch {}
    }
    
    // Test snappy (unlikely but possible)
    if (bytes[0] === 0xff && bytes[1] === 0x06 && bytes[2] === 0x00) {
      return { type: "snappy" }; // Would need snappy decoder
    }
    
    // Test protobuf (check for field tags)
    // Fixed: Added parentheses for correct operator precedence
    if (bytes.length > 0 && (bytes[0] & 0x07) === 0) { // Varint field
      return { type: "protobuf" }; // Would need .proto file
    }
    
    return { type: "unknown" };
  }
  
  /**
   * Get hex representation of first N bytes for analysis
   * 
   * @param data - ArrayBuffer to analyze
   * @param count - Number of bytes to return (default: 32)
   * @returns Hex string representation
   */
  static getHexSignature(data: ArrayBuffer, count: number = 32): string {
    const bytes = new Uint8Array(data);
    const slice = bytes.slice(0, Math.min(count, bytes.length));
    return Array.from(slice)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
  }
  
  /**
   * Analyze binary data with enhanced metadata and confidence levels
   * 
   * Enhanced version with detailed analysis results.
   * 
   * @param data - ArrayBuffer to analyze
   * @returns Detailed protocol analysis result
   */
  static analyzeDetailed(data: ArrayBuffer): ProtocolAnalysisResult {
    const bytes = new Uint8Array(data);
    
    // Test gzip (RFC 1952) - signature: 0x1f 0x8b
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      try {
        const decompressed = Bun.gunzipSync(bytes);
        const decoded = new TextDecoder().decode(decompressed);
        return {
          type: "gzip",
          decoded,
          confidence: 'high',
          metadata: {
            originalSize: data.byteLength,
            decompressedSize: decoded.length,
            compressionRatio: data.byteLength / decoded.length,
          },
        };
      } catch (e) {
        return {
          type: "gzip",
          confidence: 'low',
          metadata: {
            originalSize: data.byteLength,
          },
        };
      }
    }
    
    // Test zlib (RFC 1950) - signature: 0x78 0x9c or 0x78 0x01
    if (bytes.length >= 2 && bytes[0] === 0x78 && (bytes[1] === 0x9c || bytes[1] === 0x01 || bytes[1] === 0xda)) {
      try {
        const decompressed = Bun.inflateSync(bytes);
        const decoded = new TextDecoder().decode(decompressed);
        return {
          type: "zlib",
          decoded,
          confidence: 'high',
          metadata: {
            originalSize: data.byteLength,
            decompressedSize: decoded.length,
            compressionRatio: data.byteLength / decoded.length,
          },
        };
      } catch (e) {
        return {
          type: "zlib",
          confidence: 'low',
          metadata: {
            originalSize: data.byteLength,
          },
        };
      }
    }
    
    // Test snappy (unlikely but possible) - signature: 0xff 0x06 0x00
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0x06 && bytes[2] === 0x00) {
      return {
        type: "snappy",
        confidence: 'medium',
        metadata: {
          originalSize: data.byteLength,
        },
      }; // Would need snappy decoder library
    }
    
    // Test protobuf (check for varint field tags)
    // Varint fields have lower 3 bits as field type (0-7)
    if (bytes.length > 0 && (bytes[0] & 0x07) === 0) {
      return {
        type: "protobuf",
        confidence: 'low',
        metadata: {
          originalSize: data.byteLength,
        },
      }; // Would need .proto file and protobuf decoder
    }
    
    // Test for XML-like patterns (might be compressed XML)
    if (bytes.length > 0) {
      // Check if first few bytes decode to '<' character
      try {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(100, bytes.length)));
        if (text.trim().startsWith('<')) {
          return {
            type: "xml",
            decoded: text,
            confidence: 'high',
            metadata: {
              originalSize: data.byteLength,
              decompressedSize: text.length,
            },
          };
        }
      } catch (e) {
        // Not valid UTF-8
      }
    }
    
    return {
      type: "unknown",
      confidence: 'low',
      metadata: {
        originalSize: data.byteLength,
      },
    };
  }
  
  /**
   * Analyze and log protocol information
   * 
   * @param data - ArrayBuffer to analyze
   * @returns Analysis result with logging
   */
  static analyzeWithLogging(data: ArrayBuffer): ProtocolAnalysisResult {
    const result = this.analyzeDetailed(data);
    const hexSig = this.getHexSignature(data, 32);
    
    console.log(`[PROTOCOL_ANALYSIS] type:${result.type} | confidence:${result.confidence} | hex:${hexSig}`);
    
    if (result.decoded) {
      const preview = result.decoded.substring(0, 200);
      console.log(`[PROTOCOL_DECODED] ${preview}${result.decoded.length > 200 ? '...' : ''}`);
    }
    
    return result;
  }
}

