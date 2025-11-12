/**
 * @file telemetry.ts
 * @description Error telemetry endpoint for TES operational debugging
 * @ticket TES-OPS-004.B.8.15
 */

import { join } from 'path';

const ERROR_LOG_DIR = '.tes/logs';
const ERROR_LOG_FILE = join(ERROR_LOG_DIR, 'errors.jsonl');

/**
 * @function ensureLogDirectory
 * @description Ensure log directory exists
 */
async function ensureLogDirectory(): Promise<void> {
  try {
    await Bun.write(join(ERROR_LOG_DIR, '.gitkeep'), '');
  } catch {
    // Directory already exists or will be created by Bun.write
  }
}

/**
 * @route POST /api/dev/telemetry/error
 * @description Log operational errors with structured format
 */
export async function handleErrorTelemetry(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    
    // ✅ Store in TES error registry for analysis
    const errorLog = {
      ...body,
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      hostname: process.env.HOSTNAME || 'unknown',
      pid: process.pid,
      timestamp: body.timestamp || Date.now()
    };
    
    // Ensure log directory exists
    await ensureLogDirectory();
    
    // Write to structured log (JSONL format)
    const logLine = JSON.stringify(errorLog) + '\n';
    
    // Append to file (create if doesn't exist)
    try {
      const existing = await Bun.file(ERROR_LOG_FILE).text().catch(() => '');
      await Bun.write(ERROR_LOG_FILE, existing + logLine);
    } catch {
      // File doesn't exist, create it
      await Bun.write(ERROR_LOG_FILE, logLine);
    }
    
    // Return error ID for tracking
    return Response.json({ 
      success: true,
      errorId: errorLog.id,
      message: 'Error logged successfully'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('[Telemetry] Failed to log error:', error);
    
    return Response.json({
      success: false,
      error: 'Failed to log error telemetry',
      message: error instanceof Error ? error.message : String(error)
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * @route GET /api/dev/telemetry/errors
 * @description Retrieve recent error logs
 */
export async function handleGetErrors(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    
    // Read error log file (returns empty string if doesn't exist)
    const file = Bun.file(ERROR_LOG_FILE);
    const content = await file.text().catch(() => '');
    
    if (!content.trim()) {
      return Response.json({
        errors: [],
        total: 0
      });
    }
    
    // Parse JSONL format
    const lines = content.trim().split('\n').filter(line => line.trim());
    const errors = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .slice(-limit) // Get last N errors
      .reverse(); // Most recent first
    
    return Response.json({
      errors,
      total: errors.length,
      limit
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('[Telemetry] Failed to retrieve errors:', error);
    
    return Response.json({
      error: 'Failed to retrieve error logs',
      message: error instanceof Error ? error.message : String(error)
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

