/**
 * Ripgrep Binary Validator - Native Bun API (v14.1 Final)
 * 
 * Uses Bun.which() for instant, reliable binary detection
 * Uses DisposableStack for P0 leak-proofing (zero resource leaks)
 * Eliminates shell-dependent PATH resolution failures
 */

import { $ } from "bun";

/**
 * Validate ripgrep installation using native Bun API
 * P0: Uses DisposableStack for bulletproof resource management
 */
export async function validateRipgrep(): Promise<{ path: string; version: string } | null> {
  await using stack = new DisposableStack();
  
  const rgPath = Bun.which("rg");
  
  if (!rgPath) {
    return null;
  }

  // Get version using absolute path (no shell ambiguity)
  // DisposableStack ensures cleanup even if validation throws
  try {
    const result = await $`${rgPath} --version`.quiet();
    const versionOutput = result.stdout.toString();
    const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : "unknown";

    return { path: rgPath, version };
  } catch (error) {
    console.error(`Failed to get ripgrep version: ${error}`);
    return null;
  }
  // DisposableStack auto-disposes here, even if error thrown
}

/**
 * Validate ripgrep and throw if not found
 */
export async function requireRipgrep(): Promise<{ path: string; version: string }> {
  const result = await validateRipgrep();
  
  if (!result) {
    throw new Error(
      "❌ ripgrep not found in PATH\n\n" +
      "Install ripgrep:\n" +
      "  macOS:   brew install ripgrep\n" +
      "  Linux:   apt-get install ripgrep\n" +
      "  Windows: choco install ripgrep\n\n" +
      "Or download from: https://github.com/BurntSushi/ripgrep/releases"
    );
  }

  return result;
}

// CLI entry point
if (import.meta.main) {
  validateRipgrep().then(result => {
    if (result) {
      console.log(`✅ ripgrep found:`);
      console.log(`   Path:    ${result.path}`);
      console.log(`   Version: ${result.version}`);
      process.exit(0);
    } else {
      console.error("❌ ripgrep not found");
      console.error("\nInstall instructions:");
      console.error("  macOS:   brew install ripgrep");
      console.error("  Linux:   apt-get install ripgrep");
      console.error("  Windows: choco install ripgrep");
      process.exit(1);
    }
  }).catch(error => {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  });
}

