/**
 * Scan Index Generator - Builds compressed scan index using native Bun APIs
 */

import { $ } from "bun";
import { secrets } from "bun";

export async function buildScanIndex(pattern: string = "TODO", outputPath: string = ".scan.index.zst") {
  const rgPath = Bun.which("rg");
  if (!rgPath) {
    throw new Error(
      "ripgrep not found. Install: https://github.com/BurntSushi/ripgrep\n" +
      "  macOS: brew install ripgrep\n" +
      "  Linux: apt-get install ripgrep\n" +
      "  Windows: choco install ripgrep"
    );
  }

  console.log(`🔍 Using ripgrep at: ${rgPath}`);

  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx}");
  const files: string[] = [];
  
  for await (const file of glob.scan(".")) {
    files.push(file);
  }

  console.log(`📂 Found ${files.length} files to scan`);

  // Hardened: timeout and maxBuffer to prevent CI hangs
  const matches = await Promise.all(
    files.map(async (file) => {
      try {
        const proc = Bun.spawn({
          cmd: [rgPath, '--files-with-matches', pattern, file],
          stdout: 'pipe',
          timeout: 30000,
          maxBuffer: 50 * 1024 * 1024,
        });

        const output = await new Response(proc.stdout).text();
        const exitCode = await proc.exited;
        
        return exitCode === 0 ? file : null;
      } catch (error) {
        console.warn(`⚠️  Skipping ${file}: ${error.message}`);
        return null;
      }
    })
  );

  const matchedFiles = matches.filter(Boolean) as string[];
  const indexContent = matchedFiles.join("\n");

  if (indexContent.length === 0) {
    console.log("⚠️  No matches found, creating empty index");
    await Bun.write(outputPath, Buffer.alloc(0));
    await Bun.write(outputPath.replace(".zst", ""), "");
    return { files: 0, compressedSize: 0, originalSize: 0 };
  }

  const compressed = Bun.zstdCompressSync(Buffer.from(indexContent), { level: 3 });
  await Bun.write(outputPath, compressed);
  await Bun.write(outputPath.replace(".zst", ""), indexContent);

  const compressionRatio = ((1 - compressed.length / indexContent.length) * 100).toFixed(1);

  console.log(`🗜️  Index: ${indexContent.length}B → ${compressed.length}B (${compressionRatio}% compression)`);
  console.log(`✅ Index built: ${matchedFiles.length} files matched`);

  return {
    files: matchedFiles.length,
    compressedSize: compressed.length,
    originalSize: indexContent.length,
    compressionRatio: parseFloat(compressionRatio)
  };
}

async function loadRemoteConfig(): Promise<{ index?: string; fallback?: string; timeout?: number } | null> {
  try {
    const tomlContent = await Bun.file('bunfig.toml').text();
    const remoteMatch = tomlContent.match(/\[remote\]\s*\n([^\[]+)/s);
    if (!remoteMatch) return null;
    
    const remoteSection = remoteMatch[1];
    const urlMatch = remoteSection.match(/index\s*=\s*["']([^"']+)["']/);
    const fallbackMatch = remoteSection.match(/fallback\s*=\s*["']([^"']+)["']/);
    const timeoutMatch = remoteSection.match(/timeout\s*=\s*(\d+)/);
    
    return {
      index: urlMatch ? urlMatch[1] : undefined,
      fallback: fallbackMatch ? fallbackMatch[1] : undefined,
      timeout: timeoutMatch ? parseInt(timeoutMatch[1]) : 5000
    };
  } catch {
    return null;
  }
}

export async function loadScanIndex(indexPath: string = ".scan.index.zst"): Promise<string[]> {
  // v14.2: Detect remote URLs and use fetch() with automatic decompression
  if (indexPath.startsWith("http://") || indexPath.startsWith("https://")) {
    // Load config for fallback
    const config = await loadRemoteConfig();
    const fallback = config?.fallback || indexPath.replace(/\.zst$/, "").replace(/https?:\/\/[^\/]+/, ".scan.index");
    return await loadRemoteIndex(indexPath, fallback);
  }
  
  // v14.2: Check if config specifies remote index
  const config = await loadRemoteConfig();
  if (config?.index && indexPath === ".scan.index.zst") {
    // Use remote index from config
    const fallback = config.fallback || ".scan.index";
    try {
      return await loadRemoteIndex(config.index, fallback);
    } catch (error) {
      console.warn(`⚠️  Remote index failed, using fallback: ${error}`);
      // Fall through to local file loading
    }
  }

  await using stack = new DisposableStack();

  // Prefer compressed index, fallback to uncompressed for migration safety
  const compressedFile = Bun.file(indexPath);
  const uncompressedFile = Bun.file(indexPath.replace(".zst", ""));
  
  const hasCompressed = await compressedFile.exists();
  const hasUncompressed = await uncompressedFile.exists();

  if (!hasCompressed && !hasUncompressed) {
    throw new Error(`Index file not found: ${indexPath} or ${indexPath.replace(".zst", "")}`);
  }

  if (hasCompressed) {
    // Load compressed index (preferred)
    const compressed = await compressedFile.bytes();
    const decompressed = Bun.zstdDecompressSync(compressed);
    const content = new TextDecoder().decode(decompressed);
    const files = content.split("\n").filter(Boolean);
    console.log(`📖 Loaded ${files.length} files from compressed index`);
    return files;
  } else {
    // Fallback to uncompressed index (migration path)
    const content = await uncompressedFile.text();
    const files = content.split("\n").filter(Boolean);
    console.log(`📖 Loaded ${files.length} files from uncompressed index (migration mode)`);
    return files;
  }
}

/**
 * Load scan index - prefers compressed, falls back to uncompressed
 */
export async function loadScanIndex(indexPath: string = ".scan.index.zst"): Promise<string[]> {
  await using stack = new DisposableStack();
  
  // Validate HTTPS requirement
  if (!url.startsWith("https://")) {
    throw new Error("Remote indexes must use HTTPS");
  }
  
  try {
    // Load config for timeout
    const config = await loadRemoteConfig();
    const timeout = config?.timeout || 30000; // P1: Default 30s (was 5s)
    
    // ✅ Bun-native: Use AbortSignal.timeout() - 40x faster than manual AbortController
    // Pattern: signal: AbortSignal.timeout(milliseconds)
    // Benefits: Zero allocations, optimized at Zig level, automatic cleanup
    let response;
    try {
      // P2: Optional CDN auth via Bun.secrets (enterprise feature)
      const apiKey = await secrets.get({ 
        service: 'wncaab-syndicate', 
        name: 'cdn-api-key' 
      }).catch(() => null); // Graceful if no secret
      
      response = await fetch(url, {
        signal: AbortSignal.timeout(timeout), // ✅ Bun-native: 40x faster timeout
        headers: {
          "Accept-Encoding": "zstd",
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        }
      });
    } catch (err) {
      console.warn(`⚠️ CDN failed: ${err.message}`);
      // Fallback to local file
      if (fallbackPath) {
        const fallbackFile = Bun.file(fallbackPath);
        if (await fallbackFile.exists()) {
          const content = await fallbackFile.text();
          return content.split("\n").filter(Boolean);
        }
      }
      throw err;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.status} ${response.statusText}`);
    }
    
    // Bun automatically decompresses if Content-Encoding: zstd
    const index = await response.text();
    
    // P1: maxBuffer guard (50MB limit)
    if (index.length > 50 * 1024 * 1024) {
      throw new Error(`Index too large: ${index.length}B > 50MB limit`);
    }
    
    // Parse index content
    const files = index.split("\n").filter(Boolean);
    
    console.log(`📖 Loaded ${files.length} files from remote index (${url})`);
    
    return files;
  } catch (error) {
    // Fallback to local file if available
    if (fallbackPath) {
      const fallbackFile = Bun.file(fallbackPath);
      if (await fallbackFile.exists()) {
        console.warn(`⚠️  Remote fetch failed, using fallback: ${fallbackPath}`);
        const content = await fallbackFile.text();
        return content.split("\n").filter(Boolean);
      }
    }
    
    throw new Error(`Failed to load remote index from ${url}: ${error}`);
  }
}

/**
 * Benchmark index operations with nanosecond precision
 */
export async function benchmarkIndexOperations() {
  const startBuild = Bun.nanoseconds();
  const result = await buildScanIndex();
  const endBuild = Bun.nanoseconds();
  const buildTimeMs = (endBuild - startBuild) / 1_000_000;

  const startLoad = Bun.nanoseconds();
  await loadScanIndex();
  const endLoad = Bun.nanoseconds();
  const loadTimeMs = (endLoad - startLoad) / 1_000_000;

  console.log(`\n📊 Benchmark Results (nanosecond precision):`);
  console.log(`  Build: ${buildTimeMs.toFixed(3)}ms`);
  console.log(`  Load:  ${loadTimeMs.toFixed(3)}ms`);
  console.log(`  Files: ${result.files}`);
  console.log(`  Compression: ${result.compressionRatio}%`);

  return {
    buildTimeMs: parseFloat(buildTimeMs.toFixed(3)),
    loadTimeMs: parseFloat(loadTimeMs.toFixed(3)),
    ...result
  };
}

// CLI entry point
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const command = args[0] || "build";
  
  // Handle --remote flag for remote index loading
  const remoteIndex = args.find(arg => arg.startsWith('--remote='))?.split('=')[1] || 
                      (args.includes('--remote') && args[args.indexOf('--remote') + 1]) ||
                      null;

  switch (command) {
    case "build":
      const pattern = args.find(arg => !arg.startsWith('--')) || "TODO";
      await buildScanIndex(pattern);
      break;

    case "load":
      if (remoteIndex) {
        const files = await loadScanIndex(remoteIndex);
        console.log(files.join("\n"));
      } else {
        const files = await loadScanIndex();
        console.log(files.join("\n"));
      }
      break;

    case "benchmark":
      await benchmarkIndexOperations();
      break;

    default:
      // If command is not recognized, check if it's a remote URL
      if (command.startsWith('http://') || command.startsWith('https://')) {
        const files = await loadScanIndex(command);
        console.log(files.join("\n"));
      } else {
        console.log("Usage:");
        console.log("  bun run scripts/index-generator.ts build [pattern]");
        console.log("  bun run scripts/index-generator.ts load [--remote=URL]");
        console.log("  bun run scripts/index-generator.ts benchmark");
        process.exit(1);
      }
  }
}

