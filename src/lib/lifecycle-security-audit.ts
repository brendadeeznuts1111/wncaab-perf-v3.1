/**
 * Lifecycle Security Audit - TES-NGWS-001.9a
 * 
 * Extended security audit logging for lifecycle events with enriched rg metadata.
 * Provides unified audit trail for phase transitions, tension spikes, and forecast alerts.
 * 
 * @module src/lib/lifecycle-security-audit
 */

import { logSecurityEvent } from "./security-audit.ts";
import type { LifecyclePhase } from "./tes-lifecycle-manager.ts";

/**
 * Lifecycle event types
 */
export type LifecycleEventType = "TRANSITION" | "TENSION_SPIKE" | "FORECAST_ALERT";

/**
 * Lifecycle event metadata
 */
interface LifecycleEventMetadata {
  sessionID?: string;
  phase?: LifecyclePhase;
  tension?: number;
  domain?: string;
  scope?: string;
  ref?: string;
  [key: string]: any;
}

/**
 * KV batch storage for audit trail
 * Local dev: In-memory Map fallback
 * Production: Cloudflare Workers KV or Redis
 */
interface KVBatchStorage {
  append(key: string, value: string): Promise<void>;
}

class InMemoryBatchStorage implements KVBatchStorage {
  private batches: Map<string, string[]> = new Map();

  async append(key: string, value: string): Promise<void> {
    const batch = this.batches.get(key) || [];
    batch.push(value);
    this.batches.set(key, batch);
    
    // Auto-flush batches larger than 100 entries
    if (batch.length >= 100) {
      await this.flush(key);
    }
  }

  async flush(key: string): Promise<void> {
    const batch = this.batches.get(key);
    if (!batch || batch.length === 0) return;
    
    // In production, this would write to KV or Redis
    console.log(`[Lifecycle Audit] Batch ${key}: ${batch.length} entries`);
    this.batches.delete(key);
  }
}

// Global batch storage instance
let batchStorage: KVBatchStorage = new InMemoryBatchStorage();

/**
 * Set batch storage implementation
 * 
 * @param storage - KV batch storage implementation
 */
export function setBatchStorage(storage: KVBatchStorage): void {
  batchStorage = storage;
}

/**
 * Log lifecycle event with enriched rg metadata
 * 
 * @param phase - Lifecycle phase
 * @param event - Event type
 * @param metadata - Event metadata
 */
export function logLifecycleEvent(
  phase: LifecyclePhase,
  event: LifecycleEventType,
  metadata: LifecycleEventMetadata = {}
): void {
  const domain = metadata.domain || "nowgoal26.com";
  const scope = metadata.scope || "LIFECYCLE";
  const sessionID = metadata.sessionID || "unknown";
  const tension = metadata.tension !== undefined ? metadata.tension : 0;
  const ref = metadata.ref || "https://bun.sh/docs/api/websocket";

  // Build enriched rg metadata block
  const rgBlock = [
    "[HEADERS_BLOCK_START:v1]",
    `{event:${event},phase:${phase}}`,
    `~[LIFECYCLE][${domain}][${scope}][${event}]`,
    `[WS][TES-NGWS-001][Bun.WebSocket]`,
    `[#REF:${ref}${tension > 0 ? `,tension:${tension.toFixed(3)}` : ""}]`,
    `[SESSION:${sessionID}]`,
    `[TIMESTAMP:${Date.now()}]`,
    "[HEADERS_BLOCK_END]",
  ].join("");

  // Log to rg index
  logHeadersForRg(rgBlock);

  // Batch for KV storage
  batchStorage.append("tes:lifecycle:audit:batch", rgBlock).catch((error) => {
    console.warn(`[Lifecycle Audit] Batch append failed:`, error);
  });

  // Publish to Redis pub/sub if available (future enhancement)
  // redis.publish("tes:lifecycle:hyperstream", JSON.stringify({
  //   phase,
  //   event,
  //   metadata,
  //   timestamp: Date.now(),
  // }));

  // Also log via standard security audit
  logSecurityEvent(event as any, {
    domain,
    type: "LIFECYCLE",
    protocol: "WebSocket",
    api: "Bun.WebSocket",
    ref,
    sessionID,
    phase: phase.toString(),
    tension: tension.toString(),
  });
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
    console.error(`[Lifecycle Audit] Failed to write rg log: ${error}`);
  }
}

/**
 * Query lifecycle events from log file using rg
 * 
 * @param pattern - rg pattern to search for
 * @returns Array of matching log lines
 */
export async function queryLifecycleEvents(pattern: string): Promise<string[]> {
  try {
    const logFile = Bun.file("logs/headers-index.log");
    if (!(await logFile.exists())) {
      return [];
    }

    const content = await logFile.text();
    const lines = content.split("\n");

    // Simple pattern matching (for production, use actual rg)
    const regex = new RegExp(pattern, "i");
    return lines.filter((line) => regex.test(line) && line.includes("LIFECYCLE"));
  } catch (error) {
    console.error(`[Lifecycle Audit] Failed to query events: ${error}`);
    return [];
  }
}

/**
 * Flush all pending audit batches
 */
export async function flushAuditBatches(): Promise<void> {
  if (batchStorage instanceof InMemoryBatchStorage) {
    // Get all batch keys and flush them
    const batches = (batchStorage as any).batches;
    if (batches) {
      for (const key of batches.keys()) {
        await (batchStorage as InMemoryBatchStorage).flush(key);
      }
    }
  }
}

