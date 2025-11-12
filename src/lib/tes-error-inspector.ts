/**
 * @file tes-error-inspector.ts
 * @description Bun-native error inspection with syntax highlighting for TES operational debugging
 * @ticket TES-OPS-004.B.8.15
 */

/**
 * @interface ErrorContext
 * @description Additional operational context for error reporting
 */
export interface ErrorContext {
  route?: string;
  workerId?: string;
  sessionId?: string;
  component?: string;
  metrics?: Record<string, number | string>;
}

/**
 * @function inspectTESError
 * @description Wraps Bun.inspect() for TES-specific error formatting with syntax highlighting
 * @param error - Error object or string
 * @param context - Additional operational context
 * @returns Formatted, syntax-highlighted error string
 */
export function inspectTESError(error: unknown, context: ErrorContext = {}): string {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Add TES operational context to error message
  if (context.route) {
    errorObj.message = `[${context.route}] ${errorObj.message}`;
  }
  
  if (context.component) {
    errorObj.message = `[${context.component}] ${errorObj.message}`;
  }
  
  // Add context metadata to error message if metrics provided
  if (context.metrics && Object.keys(context.metrics).length > 0) {
    const metricsStr = JSON.stringify(context.metrics, null, 2);
    errorObj.message += `\nContext:\n${metricsStr}`;
  }
  
  // Use Bun's native inspect for syntax highlighting
  return Bun.inspect(errorObj, {
    colors: true,          // Syntax highlighting
    depth: 5,              // Deep object inspection
    showHidden: false,     // Don't show internals
    showProxy: false       // Clean output
  });
}

/**
 * @function logTESError
 * @description Logs error with source preview and telemetry
 * @param error - Error object or string
 * @param context - Additional operational context
 * @param level - Log level ('error' or 'warning')
 */
export function logTESError(
  error: unknown,
  context: ErrorContext = {},
  level: 'error' | 'warning' = 'error'
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const inspected = inspectTESError(error, context);
  
  // Print to console with TES prefix
  console[level === 'error' ? 'error' : 'warn'](
    `[TES-${level.toUpperCase()}]\n${inspected}`
  );
  
  // Send to telemetry endpoint (non-blocking)
  fetch('http://localhost:3002/api/dev/telemetry/error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: Date.now(),
      level,
      message: errorObj.message,
      stack: errorObj.stack,
      context
    }),
    keepalive: true
  }).catch(() => {
    // Silently fail if telemetry endpoint is unavailable
    // This prevents error logging from causing cascading failures
  });
}

