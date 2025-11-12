# Bun Debugging Guide

This guide covers debugging techniques for the Bun development server using Bun's built-in debugging features.

## Quick Start

### Enable Debugging

```bash
# Basic debugging (starts WebSocket server on available port)
bun --inspect scripts/dev-server.ts

# Break at first line (useful for scripts that exit quickly)
bun --inspect-brk scripts/dev-server.ts

# Wait for debugger to attach before executing
bun --inspect-wait scripts/dev-server.ts

# Specify custom port
bun --inspect=4000 scripts/dev-server.ts
bun --inspect=localhost:4000 scripts/dev-server.ts
```

### Using debug.bun.sh

When you run with `--inspect`, Bun will output:

```
------------------ Bun Inspector ------------------

Listening at:
  ws://localhost:6499/0tqxs9exrgrm

Inspect in browser:
  https://debug.bun.sh/#localhost:6499/0tqxs9exrgrm

------------------ Bun Inspector ------------------
```

Open the `debug.bun.sh` URL in your browser to start debugging.

## Debugging Features

### 1. Setting Breakpoints

1. Open `debug.bun.sh` URL
2. Navigate to **Sources** tab
3. Find your file (e.g., `scripts/dev-server.ts`)
4. Click line numbers to set breakpoints
5. Make a request to trigger the breakpoint

### 2. Inspecting Variables

When paused at a breakpoint:
- **Console**: Run code in current scope
- **Variables Panel**: View all local variables
- **Call Stack**: See execution path

### 3. Execution Controls

- **Continue** (▶️): Resume until next breakpoint
- **Step Over** (⤵️): Execute next line
- **Step Into** (⤴️): Enter function calls
- **Step Out** (⤵️⤴️): Exit current function

## Network Request Debugging

The `BUN_CONFIG_VERBOSE_FETCH` environment variable lets you log network requests made with `fetch()` or `node:http` automatically. **It works seamlessly with both APIs** - no additional configuration needed.

| Value | Description |
|-------|-------------|
| `curl` | Print requests as **single-line** `curl` commands (copy-paste ready) |
| `true` | Print request & response info **without** curl command |
| `false` | Don't print anything (default) |

**Key Features:**
- ✅ Works with both `fetch()` and `node:http` requests automatically
- ✅ Set to `curl` for copy-paste ready curl commands
- ✅ Set to `true` for request/response info without curl command

### Enable Verbose Fetch Logging

**Via Environment Variable:**
```bash
# Print requests as curl commands (copy-paste ready)
BUN_CONFIG_VERBOSE_FETCH=curl bun run dev

# Print request & response info
BUN_CONFIG_VERBOSE_FETCH=true bun run dev
```

**Programmatically (in code):**
```typescript
// Option 1: Print as curl commands (single-line, copy-paste ready)
process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

await fetch("https://example.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ foo: "bar" }),
});

// Option 2: Print without curl command (request/response info only)
process.env.BUN_CONFIG_VERBOSE_FETCH = "true";

await fetch("https://example.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ foo: "bar" }),
});
```

**Note:** `BUN_CONFIG_VERBOSE_FETCH` is supported in both `fetch()` and `node:http` requests automatically, so it works seamlessly with either API. No additional configuration needed.

**Example with `node:http`:**
```typescript
import http from 'node:http';

process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

// node:http requests will also be logged
const req = http.request('http://example.com', (res) => {
  // Handle response
});
req.end();
```

### Example Output

**With `curl` format (single-line, copy-paste ready):**
```bash
[fetch] $ curl --http1.1 "https://example.com/" -X POST -H "content-type: application/json" -H "Connection: keep-alive" -H "User-Agent: Bun/1.3.2" -H "Accept: */*" -H "Host: example.com" -H "Accept-Encoding: gzip, deflate, br" --compressed -H "Content-Length: 13" --data-raw "{\"foo\":\"bar\"}"

[fetch] > HTTP/1.1 POST https://example.com/
[fetch] > content-type: application/json
[fetch] > Connection: keep-alive
[fetch] > User-Agent: Bun/1.3.2
[fetch] > Accept: */*
[fetch] > Host: example.com
[fetch] > Accept-Encoding: gzip, deflate, br
[fetch] > Content-Length: 13

[fetch] < 200 OK
[fetch] < Accept-Ranges: bytes
[fetch] < Cache-Control: max-age=604800
[fetch] < Content-Type: text/html; charset=UTF-8
[fetch] < Date: Tue, 18 Jun 2024 05:12:07 GMT
[fetch] < Etag: "3147526947"
[fetch] < Expires: Tue, 25 Jun 2024 05:12:07 GMT
[fetch] < Last-Modified: Thu, 17 Oct 2019 07:18:26 GMT
[fetch] < Server: EOS (vny/044F)
[fetch] < Content-Length: 1256
```

**Note:** 
- The `[fetch] $` line is a **single-line curl command** that you can copy-paste directly into your terminal to replicate the exact request.
- Lines with `[fetch] >` show the **request from your local code** (outgoing).
- Lines with `[fetch] <` show the **response from the remote server** (incoming).

**With `true` format (no curl command, request/response info only):**
```bash
[fetch] > HTTP/1.1 POST https://example.com/
[fetch] > content-type: application/json
[fetch] > Connection: keep-alive
[fetch] > User-Agent: Bun/1.3.2
[fetch] > Accept: */*
[fetch] > Host: example.com
[fetch] > Accept-Encoding: gzip, deflate, br
[fetch] > Content-Length: 13

[fetch] < 200 OK
[fetch] < Accept-Ranges: bytes
[fetch] < Cache-Control: max-age=604800
[fetch] < Content-Type: text/html; charset=UTF-8
[fetch] < Date: Tue, 18 Jun 2024 05:12:07 GMT
[fetch] < Etag: "3147526947"
[fetch] < Expires: Tue, 25 Jun 2024 05:12:07 GMT
[fetch] < Last-Modified: Thu, 17 Oct 2019 07:18:26 GMT
[fetch] < Server: EOS (vny/044F)
[fetch] < Content-Length: 1256
```

**Note:** When set to `true`, Bun prints request/response info **without** the curl command. Use `curl` mode if you want copy-paste ready curl commands.

**Output Format:**
- Lines with `[fetch] $` - **Single-line curl command** (copy-paste ready when `curl` mode)
- Lines with `[fetch] >` - **Request from your local code** (outgoing)
- Lines with `[fetch] <` - **Response from the remote server** (incoming)

### Use Cases

- **API Debugging**: See exact requests/responses
- **Copy-Paste Testing**: Copy the single-line curl command to test manually in terminal
- **Request Inspection**: Verify headers, body, method
- **Network Troubleshooting**: Debug failed requests
- **Integration Testing**: Verify API calls match expectations
- **Request Replication**: Copy curl command to reproduce issues in different environments

## Stack Traces & Sourcemaps

### Automatic Sourcemaps

Bun automatically generates sourcemaps for transpiled files:
- TypeScript → JavaScript (with sourcemaps)
- JSX/TSX → JavaScript (with sourcemaps)
- Click stack trace file paths to jump to source

### Syntax-Highlighted Source Code Preview

Bun **automatically** prints a syntax-highlighted source code preview when an unhandled exception or rejection occurs. This helps you quickly identify where errors occurred in your code.

**Automatic Behavior:**
When an unhandled error is thrown, Bun automatically displays:
- Syntax-highlighted source code snippet
- Error message
- Stack trace with clickable file paths (thanks to sourcemaps)

**Example - Unhandled Exception (Automatic):**
```typescript
// Bun automatically shows syntax-highlighted preview - no code needed!
throw new Error("Something went wrong");
```

**Manual Inspection with `Bun.inspect()`:**
You can simulate this automatic behavior programmatically by calling `Bun.inspect(error)`. This is useful when:
- You want to log errors with the same formatting in your error handlers
- You need to inspect caught errors programmatically
- You want to customize error output

```typescript
// Create an error
const err = new Error("Something went wrong");
console.log(Bun.inspect(err, { colors: true }));
```

This prints a syntax-highlighted preview of the source code where the error occurred, along with the error message and stack trace.

**Note:** Bun does this automatically for unhandled exceptions/rejections. Use `Bun.inspect()` when you want to manually get the same formatted output.

**Using in Error Handlers:**
In our error handler (`scripts/dev-server.ts`), we use `Bun.inspect()` to get the same formatted output for caught errors:

```typescript
error(error) {
  // Bun automatically prints syntax-highlighted previews for unhandled errors
  // For caught errors, we use Bun.inspect() to simulate the same behavior
  if (error instanceof Error) {
    console.error('Server error:', Bun.inspect(error, { colors: true }));
  }
  // ... rest of error handling
}
```

This ensures that even errors caught by our error handler get the same helpful syntax-highlighted preview in the console.

**Output:**
```
1 | // Create an error
2 | const err = new Error("Something went wrong");
                ^
error: Something went wrong
      at file.js:2:13
```

**Features:**
- ✅ **Automatic**: Works for unhandled exceptions and rejections
- ✅ **Syntax Highlighted**: Color-coded source code
- ✅ **Sourcemap Aware**: Points to original TypeScript/JSX source
- ✅ **Clickable Paths**: Stack trace file paths are clickable in terminal
- ✅ **Context**: Shows surrounding code lines for context

**Note:** This feature works seamlessly with Bun's automatic sourcemap generation, so even if your code is transpiled (TypeScript → JavaScript), the preview will show your original source code.

**Try it yourself:**
```bash
# Run the example to see Bun.inspect() in action
bun run example:debug-inspect
```

### V8 Stack Trace API

Bun implements V8 Stack Trace API for Node.js compatibility:

```typescript
// Customize stack trace format
Error.prepareStackTrace = (err, stack) => {
  return stack.map(callSite => {
    return callSite.getFileName();
  });
};

const err = new Error("Something went wrong");
console.log(err.stack);
// [ "error.js" ]
```

### CallSite Methods

| Method | Returns |
|--------|---------|
| `getFileName()` | File name or URL |
| `getLineNumber()` | Line number |
| `getColumnNumber()` | Column number |
| `getFunctionName()` | Function name |
| `getMethodName()` | Method name |
| `isAsync()` | `true` if async function |
| `isNative()` | `true` if native function |

## VS Code Debugging

### Setup

1. Install [Bun VSCode Extension](https://bun.com/guides/runtime/vscode-debugger)
2. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Bun Server",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/dev-server.ts",
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Bun Server (Inspect)",
      "type": "bun",
      "request": "attach",
      "url": "ws://localhost:6499"
    }
  ]
}
```

### Usage

1. Press `F5` or go to **Run and Debug**
2. Select "Debug Bun Server"
3. Set breakpoints in VS Code
4. Debug with full VS Code features

## Debugging Our Dev Server

### Common Debugging Scenarios

#### 1. Debug API Routes

```bash
# Start with debugging
bun --inspect scripts/dev-server.ts

# In debug.bun.sh, set breakpoint in route handler:
# Example: scripts/dev-server.ts line 11119 (/api/dev/status)

# Make request
curl http://localhost:3002/api/dev/status
```

#### 2. Debug WebSocket Handlers

```bash
# Start with debugging
bun --inspect scripts/dev-server.ts

# Set breakpoint in websocket.message handler
# Example: scripts/dev-server.ts line 14666

# Connect WebSocket client
wscat -c ws://localhost:3002/ws/server-metrics/live
```

#### 3. Debug Error Handler

```bash
# Start with debugging
bun --inspect scripts/dev-server.ts

# Set breakpoint in error handler
# Example: scripts/dev-server.ts line 14650

# Trigger error (e.g., invalid route)
curl http://localhost:3002/invalid-route
```

#### 4. Debug Network Requests

```bash
# Enable verbose fetch logging
BUN_CONFIG_VERBOSE_FETCH=curl bun --inspect scripts/dev-server.ts

# Make requests and see curl commands
curl http://localhost:3002/api/dev/status
```

**Or use the example script:**
```bash
# Run example that demonstrates verbose fetch
bun run examples/debug-fetch.ts

# Or with environment variable
BUN_CONFIG_VERBOSE_FETCH=curl bun run examples/debug-fetch.ts
```

### Debugging Tips

1. **Use `--inspect-brk`** for startup debugging
2. **Set breakpoints** before making requests
3. **Use console** in debugger to inspect variables
4. **Enable verbose fetch** to see network activity
5. **Check sourcemaps** for TypeScript debugging

## Integration with Development Mode

Our dev server automatically enables debugging features in development:

```typescript
// scripts/dev-server.ts
development: IS_DEVELOPMENT  // true in dev, false in prod
```

**Development Mode Features:**
- ✅ Source maps enabled
- ✅ Detailed error messages
- ✅ Console log echoing
- ✅ Hot Module Reloading (HMR)

**Combined with `--inspect`:**
- ✅ Full debugging support
- ✅ Breakpoints work
- ✅ Variable inspection
- ✅ Step-through debugging

## Environment Variables

### Debugging

```bash
# Enable inspector
BUN_INSPECT=1 bun run dev

# Custom inspector port
BUN_INSPECT=4000 bun run dev
```

### Network Debugging

```bash
# Verbose fetch (curl format)
BUN_CONFIG_VERBOSE_FETCH=curl bun run dev

# Verbose fetch (info format)
BUN_CONFIG_VERBOSE_FETCH=true bun run dev
```

### Development Mode

```bash
# Force development mode
NODE_ENV=development bun run dev

# Force production mode
NODE_ENV=production bun run dev
```

## Troubleshooting

### Debugger Won't Connect

1. Check port availability: `lsof -i :6499`
2. Try different port: `bun --inspect=4000 scripts/dev-server.ts`
3. Verify WebSocket URL format

### Breakpoints Not Hitting

1. Ensure sourcemaps are enabled (automatic in dev mode)
2. Check file paths match exactly
3. Verify code is executing (add `console.log`)

### Sourcemaps Not Working

1. Verify `development: true` is set
2. Check TypeScript compilation
3. Ensure original source files exist

## References

- [Bun Debugging Documentation](https://bun.com/docs/runtime/debugger)
- [Bun Syntax-Highlighted Source Code Preview](https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview)
- [Bun Error Handling](https://bun.com/docs/runtime/http/error-handling)
- [Bun VSCode Extension](https://bun.com/guides/runtime/vscode-debugger)
- [WebKit Inspector Protocol](https://github.com/oven-sh/bun/blob/main/packages/bun-inspector-protocol/src/protocol/jsc/index.d.ts)

## Quick Reference

```bash
# Basic debugging
bun --inspect scripts/dev-server.ts

# Break at start
bun --inspect-brk scripts/dev-server.ts

# Custom port
bun --inspect=4000 scripts/dev-server.ts

# Verbose network
BUN_CONFIG_VERBOSE_FETCH=curl bun --inspect scripts/dev-server.ts

# VS Code debugging
# Press F5 with launch.json configured
```

