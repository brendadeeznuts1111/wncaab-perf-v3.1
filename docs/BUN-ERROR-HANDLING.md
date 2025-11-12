# Bun Error Handling - Implementation Guide

This document demonstrates how we handle errors in Bun's development server following the [official Bun documentation](https://bun.com/docs/runtime/http/error-handling).

## Development Mode

To activate development mode, set `development: true`:

```typescript
Bun.serve({
  development: true,
  fetch(req) {
    throw new Error("woops!");
  },
});
```

In development mode, Bun will surface errors in-browser with a built-in error page showing stack traces and error details.

## Error Handler

To handle server-side errors, implement an `error` handler. This function should return a `Response` to serve to the client when an error occurs. This response will **supersede** Bun's default error page in `development` mode.

### Basic Pattern

```typescript
Bun.serve({
  fetch(req) {
    throw new Error("woops!");
  },
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});
```

## Our Implementation

**Location**: `scripts/dev-server.ts` (lines 14637-14680)

### Development Mode Error Page

In development mode, we return an HTML error page with:
- Error message
- Stack trace (if available)
- Styled error display matching Bun's built-in error page

```typescript
error(error) {
  // Use Bun.inspect() for syntax-highlighted error preview in console
  // This provides better debugging output with source code context
  // [#REF] https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview
  if (error instanceof Error) {
    console.error('Server error:', Bun.inspect(error, { colors: true }));
  } else {
    console.error('Server error:', error);
  }
  
  const isDev = IS_DEVELOPMENT;
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  if (isDev) {
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Server Error</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    h1 { color: #f48771; }
    pre { background: #252526; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .error { color: #f48771; }
    .stack { color: #ce9178; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Server Error</h1>
  <div class="error">
    <pre>${errorMessage}</pre>
  </div>
  ${errorStack ? `<div class="stack"><pre>${errorStack}</pre></div>` : ''}
</body>
</html>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
          ...CORS_HEADERS,
        },
      }
    );
  }
  
  // Production mode: JSON error response
  const errorResp = errorResponse(errorMessage, 500);
  return appendCorsHeaders(errorResp);
}
```

**Key Features:**
- ✅ **Syntax-Highlighted Console Output**: Uses `Bun.inspect(error, { colors: true })` for better terminal debugging
- ✅ **Development HTML Page**: Rich error page with stack traces
- ✅ **Production JSON Response**: Clean error responses without exposing internals
- ✅ **CORS Support**: All error responses include CORS headers

### Production Mode

In production mode (`development: false`), we return a JSON error response:

```json
{
  "error": "Error message here"
}
```

## Error Handling in Routes

### Try-Catch Pattern

Individual routes should handle errors explicitly:

```typescript
'/api/dev/status': async (req, server) => {
  try {
    const status = await getEnhancedStatus();
    return Response.json(status);
  } catch (error) {
    return errorResponse(
      `Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
      500,
      { domain: 'dev', scope: 'status', version: 'v2.0' }
    );
  }
}
```

### Error Response Helper

We use a centralized `errorResponse` helper from `lib/headers.ts`:

```typescript
export function errorResponse(
  message: string, 
  status: number = 500, 
  options?: Partial<ApiHeadersOptions>
): Response {
  return jsonResponse({ error: message }, status, {
    ...options,
    scope: options?.scope || 'error',
  });
}
```

## Benefits

1. **Development Experience**: Rich error pages with stack traces
2. **Syntax-Highlighted Console**: `Bun.inspect()` provides source code previews in terminal
3. **Production Safety**: Clean JSON error responses without exposing internals
4. **CORS Support**: All error responses include CORS headers
5. **Consistent Format**: Standardized error response structure

## Testing

### Test Error Handling

```bash
# Trigger an error (development mode)
curl http://localhost:3002/api/dev/test-error

# Expected in development: HTML error page with stack trace
# Expected in production: JSON error response
```

### Test Error Handler

```typescript
// In a route handler
'/api/test-error': () => {
  throw new Error('Test error for error handler');
}
```

## References

- [Bun Error Handling Documentation](https://bun.com/docs/runtime/http/error-handling)
- [Bun Debugging Guide](https://bun.com/docs/runtime/debugger)
- [Bun.inspect() Syntax-Highlighted Errors](https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview)
- `scripts/dev-server.ts` - Error handler implementation
- `lib/headers.ts` - Error response helpers

