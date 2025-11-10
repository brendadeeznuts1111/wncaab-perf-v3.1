# 🚀 Bun's Latest Unleashed: Blazing Fast Installs, Monorepo Mastery, & Rock-Solid Stability!

Get ready! This Bun release supercharges your development with **significant performance boosts**, empowers **complex monorepos**, and delivers a wave of **rock-solid stability and compatibility fixes** across the board. Dive in to see what's new!

---

## 🔥 **Core Performance & Package Management Boosts**

### ⚡ **Lightning-Fast Installs: Bye-bye, Peer Dependency Sleep!**

**WHAT'S NEW:** We **removed an unnecessary `sleep()`** from Bun's package manager! Previously, it'd wait for peer dependencies to install, even when there were *none*.

**YOUR GAIN:** Experience **noticeably faster `bun install` times**, especially in smaller projects or those without peer dependencies. Every millisecond counts!

**Shoutout:** Big thanks to **@dylan-conway** for this snappy fix!

---

### 🔐 **Enterprise-Ready Registries: Email Support in `.npmrc`**

**WHAT'S NEW:** `bun install` now **reads and forwards the `:email` field** from your `.npmrc` for both default and scoped registries.

**YOUR GAIN:** Seamless authentication with private registries (like Sonatype Nexus) that demand an email alongside username/password or token. Your secure, enterprise workflows just got smoother.

**Example (`.npmrc`):**

```text
//registry.example.com/:email=user@example.com
//registry.example.com/:username=myuser
//registry.example.com/:_password=base64encodedpassword

// Or for token-based auth:
//registry.example.com/:_authToken=xxxxxx
```

**Shoutout:** Another fantastic contribution from **@dylan-conway**!

---

### 🏗️ **Monorepo Magic: Precision Hoisting with `publicHoistPattern` & `hoistPattern`**

**WHAT'S NEW:** Unleash **selective hoisting control** with the `isolated` linker!

- **`publicHoistPattern`** (in `bunfig.toml` or `.npmrc`): Allows you to hoist specific *transitive dependencies* directly to your **root `node_modules`**.
  - **YOUR GAIN (Public):** Ensure critical tools like **ESLint plugins**, **TypeScript `@types/*`**, or global `lib` augmentations are *always discoverable* across your entire monorepo workspace, without abandoning the benefits of isolation.

- **`hoistPattern`**: Gives you fine-grained control over what's hoisted *internally* into `node_modules/.bun/node_modules`.

**Impact:** A game-changer for monorepo developers. Get the **determinism and reliability of `isolated` linking** while explicitly opting-in essential packages for global visibility, banishing "phantom" dependencies.

**Example (`bunfig.toml`):**

```toml
[install]
publicHoistPattern = "@types*"          # Simple string pattern
# OR: publicHoistPattern = [ "@types*", "*eslint*" ] # Array for multiple patterns

hoistPattern = [ "@types*", "*eslint*" ] # Control internal hoisting
```

**Example (`.npmrc`):**

```text
public-hoist-pattern[]=@typescript/*
public-hoist-pattern[]=*eslint*
```

---

## ✨ **Node.js Compatibility & Core API Enhancements**

### 📖 **Streamlined File Reading: `FileHandle.readLines()` Support!**

**WHAT'S NEW:** Bun now fully implements Node.js's **`FileHandle.readLines()`** from `node:fs/promises`.

**YOUR GAIN:** Efficient, backpressure-aware **async iteration over file lines** using `for-await-of`. It handles empty lines, CRLF, and `createReadStream` options (like encoding) flawlessly. Say goodbye to manual line parsing!

**Example:**

```typescript
import { open } from "node:fs/promises";

const file = await open("file.txt");
try {
  for await (const line of file.readLines({ encoding: "utf8" })) {
    console.log(line); // Process line by line
  }
} finally {
  await file.close(); // Always clean up
}
```

**Shoutout:** Massive thanks to **@nektro** for this awesome addition!

---

### 🛡️ **Rock-Solid Node.js Core API Compatibility**

**🐛 Fixes:** A suite of crucial fixes ensures even broader compatibility:

- **N-API Worker Termination:** Resolved crashes when terminating N-API Workers (a big win for `next build` with Turbopack!).
- **Windows Error Codes:** Proper recognition of `UV_ENOEXEC` and `UV_EFTYPE` on Windows.
- **`node:buffer` ESM Export:** `INSPECT_MAX_BYTES` is now a plain number, matching Node.js.
- **`Response.json()` Strictness:** Now throws Node.js-compatible `TypeError` for non-serializable values (Symbol, Function, undefined) and `BigInt`s.

**Deep Dive Contributions:** Special gratitude to **Martin Schwarzl of Cloudflare** for his eagle eye on several critical bugs:

- **Buffer Overwrites:** Fixed out-of-bounds writes in `Buffer.prototype.writeBigInt64/UInt64{LE,BE}`.
- **Process Title:** Resolved assertion failure when setting `process.title` with UTF‑16 characters.
- **ReadableStream Exceptions:** Improved exception handling for `ReadableStream` used by `Response.prototype.body`.

---

## 🔨 **Bundler & Transpiler Perfection (`bun build`)**

### 🎯 **What's Fixed & Improved:**

- **Better CJS Output:** Improved `__esModule` handling for accurate CJS output when imported from ESM.
- **Clearer HTML Errors:** `bun build --no-bundle` now gives a clear error for HTML entrypoints ("HTML imports are only supported when bundling").
- **Reliable Sourcemaps:** **Fixed sourcemaps for `compile: true`**, restoring correct file names and line numbers in error stacks for single-file executables. Debugging compiled apps just got a whole lot easier!
- **`import.meta` in Bytecode:** `bun build --bytecode` now correctly handles `import.meta.url` or `import.meta.dir` references.
- **Windows React Stability:** Fixed an assertion failure on Windows affecting React projects with `react-jsxdev` in `tsconfig.json`.
- **Memory & Transpilation Resilience:** Addressed memory management for error strings, assertion failures with invalid `async` function syntax, and a "Scope mismatch" panic with TypeScript enums containing functions.
- **Macro Reliability:** Fixed a race condition with `with {type: "macro"}` when executed simultaneously across multiple threads.

---

## 🛠️ **Crucial Bugfixes Across the Ecosystem**

### 🧪 **`bun test` Stability**

- **No more crashes** when formatting errors for extremely deeply nested objects.

---

### 📦 **`bun install` / `bun pm` Reliability**

- **macOS `EXDEV` Fix:** Resolved `bun install --linker=isolated` failures on macOS due to `EXDEV` (Cross-device link) errors on non-system APFS volumes. Installs now complete reliably!
- **Monorepo Self-Linking:** Correctly symlinks self-referencing workspace dependencies (e.g., `workspace:*`), ensuring packages can resolve their own exports.
- **Determinism Restored:** Fixed a bug that could cause non-deterministic hoisting in `node_modules/.bun/node_modules`, preventing unintended "phantom" dependencies.
- **Package Packing:** `bun pm pack` now always includes files declared via `"bin"` and `"directories.bin"`, matching `npm pack` behavior.

---

### 🌐 **Platform & Tooling Fixes**

- **`bunx` on Windows:** Fixed a panic with non-ASCII characters in npm package names on Windows.
- **Windows Locale Support:** **Critical fix for hangs** when running `package.json` scripts on Windows with non-English locales by converting environment variables to "WTF-8" at startup. This resolves a regression from Bun v1.2.23.

---

### 🗄️ **Database & Client Improvements**

- **`Bun.SQL` / MySQL Robustness:** Improved error handling for boxed primitives, fixed 100% CPU spin with TLS connections on macOS, and resolved a regression causing idle connections to keep the event loop alive.
- **`Bun.RedisClient` Validation:** Now validates connection URLs and throws on invalid parameters, avoiding silent defaults.
- **`Bun.S3Client` Memory Leak:** Crucial fix for a memory leak in `listObjects` response parsing (ETag handling) that caused unbounded memory growth.

---

### 🔧 **System Integration & Debugging**

- **`bun:ffi` Debuggability:** Provides actionable `dlopen` (linking) errors with library paths and OS errors, and clearer errors for missing `ptr` fields in symbol definitions.
- **Bun Shell (`$`) Stability:** Fixed memory leaks in arguments and on garbage collection, resolved blocking I/O on macOS for large pipes, and addressed Windows path issues.

---

### 🌍 **Web Standards & APIs**

- **WebSocket Consistency:** Correctly includes `Set-Cookie` headers on upgrades and safely handles fragmented close frames without panicking.
- **Web API Accuracy:** Fixed excessive memory growth in `fetch()` response consumption, accurate `URL` heap size accounting (avoiding pathological GC), and assertion failures in `URLSearchParams.prototype.toJSON()` and `Headers.prototype.append()`.
  - *(More thanks to **Martin Schwarzl of Cloudflare** for these!)*

---

### 📝 **Data Format & Console**

- **YAML (`Bun.YAML`) Reliability:** Resolved parsing `...` inside double-quoted strings and ensured correct double-quoting for round-trip stringification.
- **Console Error Handling:** Fixed incorrect error handling when printing `Set` or `Map` subclasses with non-numeric `size` properties.
  - *(Thanks again to **Martin Schwarzl & Cloudflare!**)*

---

### 🔥 **Developer Experience**

- **Hot Reload Resilience (macOS):** `bun --hot` now defers reload when Vim's atomic write creates a temporary file, preventing "Module not found" errors.
- **Template Fixes:** React templates (react-app, react-shadcn, react-tailwind) now correctly reference `src/index.ts` in dev/start scripts.

---

## 🎉 **Summary: What This Means for You**

This release delivers **tangible performance improvements**, **monorepo superpowers**, and **rock-solid stability** across the entire Bun ecosystem. Whether you're building small projects or enterprise monorepos, debugging compiled apps, or integrating with private registries—**Bun just got better, faster, and more reliable!**

**Upgrade now** and experience the difference:

```bash
bun upgrade
```

---

**Happy coding! 🚀**

