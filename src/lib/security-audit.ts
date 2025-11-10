/**
 * Security Audit - Unified rg Audit Trail
 * 
 * Centralized security event logging with rg-compatible format
 * for all authentication and authorization events.
 * 
 * @module src/lib/security-audit
 */

type SecurityEvent = "COOKIE_SET" | "JWT_EXTRACT" | "CSRF_VERIFY" | "JWT_REFRESH" | "CSRF_GEN" | "JWT_MISSING" | "CSRF_FAILURE";

interface SecurityEventMetadata {
  domain?: string;
  type?: string;
  protocol?: string;
  api?: string;
  ref?: string;
  [key: string]: string | undefined;
}

/**
 * Log security event with rg-compatible format
 * 
 * @param event - Security event type
 * @param metadata - Event metadata
 */
export function logSecurityEvent(
  event: SecurityEvent,
  metadata: SecurityEventMetadata = {}
): void {
  const rgBlock = [
    "[HEADERS_BLOCK_START:v1]",
    `{event:${event}}`,
    `~[SECURITY][${metadata.domain || "nowgoal26.com"}][${metadata.type || "AUTH"}][${event}]`,
    `[${metadata.protocol || "HTTP/1.1"}][TES-NGWS-001][${metadata.api || "Bun"}]`,
    `[#REF:${metadata.ref || "https://bun.sh/security"} ]`,
    "[HEADERS_BLOCK_END]"
  ].join("");
  
  logHeadersForRg(rgBlock);
  
  // Optionally publish to Redis for real-time monitoring (if available)
  // redis.publish("tes:security:audit", rgBlock);
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
    console.error(`[Security Audit] Failed to write rg log: ${error}`);
  }
}

/**
 * Query security events from log file using rg
 * 
 * @param pattern - rg pattern to search for
 * @returns Array of matching log lines
 */
export async function querySecurityEvents(pattern: string): Promise<string[]> {
  try {
    const logFile = Bun.file("logs/headers-index.log");
    if (!(await logFile.exists())) {
      return [];
    }
    
    const content = await logFile.text();
    const lines = content.split("\n");
    
    // Simple pattern matching (for production, use actual rg)
    const regex = new RegExp(pattern, "i");
    return lines.filter(line => regex.test(line));
  } catch (error) {
    console.error(`[Security Audit] Failed to query events: ${error}`);
    return [];
  }
}

