/**
 * Node.js Compatibility Import Auditor
 * 
 * Finds all Node.js compatibility imports (node:*) in the codebase
 * Helps identify migration targets for native Bun APIs
 */

import { glob } from "bun";

interface ImportMatch {
  file: string;
  line: number;
  import: string;
  suggested: string;
}

/**
 * Find all Node.js compatibility imports
 */
async function findNodeImports(): Promise<ImportMatch[]> {
  const files = await glob("**/*.{ts,tsx,js,jsx}", {
    cwd: ".",
    absolute: true
  }).then(files => Array.from(files));

  const matches: ImportMatch[] = [];

  for (const file of files) {
    const content = await Bun.file(file).text();
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Match: import ... from "node:..."
      const importMatch = line.match(/import\s+.*\s+from\s+["'](node:[^"']+)["']/);
      if (importMatch) {
        const nodeImport = importMatch[1];
        const suggested = suggestNativeAPI(nodeImport);
        
        matches.push({
          file: file.replace(process.cwd() + "/", ""),
          line: index + 1,
          import: nodeImport,
          suggested
        });
      }

      // Match: require("node:...")
      const requireMatch = line.match(/require\(["'](node:[^"']+)["']\)/);
      if (requireMatch) {
        const nodeImport = requireMatch[1];
        const suggested = suggestNativeAPI(nodeImport);
        
        matches.push({
          file: file.replace(process.cwd() + "/", ""),
          line: index + 1,
          import: nodeImport,
          suggested
        });
      }
    });
  }

  return matches;
}

/**
 * Suggest native Bun API replacement
 */
function suggestNativeAPI(nodeImport: string): string {
  const suggestions: Record<string, string> = {
    "node:zlib": "Bun.zstdCompressSync() / Bun.zstdDecompressSync()",
    "node:fs": "Bun.file() / Bun.write()",
    "node:fs/promises": "Bun.file() / Bun.write()",
    "node:child_process": "$ (Bun shell)",
    "node:path": "Bun.path (or keep - it's lightweight)",
    "node:stream": "Bun native streams",
    "node:crypto": "Bun.crypto (or keep - native)",
    "node:http": "Bun.serve()",
    "node:net": "Bun.serve() or Bun.connect()",
    "node:worker_threads": "Bun.Worker (or keep - native)",
    "node:vm": "Bun native (or keep - native)",
  };

  return suggestions[nodeImport] || "Check Bun docs for native API";
}

/**
 * Generate audit report
 */
async function generateReport() {
  const matches = await findNodeImports();

  if (matches.length === 0) {
    console.log("✅ No Node.js compatibility imports found!");
    console.log("   All code uses native Bun APIs.\n");
    return;
  }

  console.log(`⚠️  Found ${matches.length} Node.js compatibility import(s):\n`);

  // Group by file
  const byFile = matches.reduce((acc, match) => {
    if (!acc[match.file]) {
      acc[match.file] = [];
    }
    acc[match.file].push(match);
    return acc;
  }, {} as Record<string, ImportMatch[]>);

  for (const [file, fileMatches] of Object.entries(byFile)) {
    console.log(`📄 ${file}`);
    fileMatches.forEach(match => {
      console.log(`   Line ${match.line}: import from "${match.import}"`);
      console.log(`   → Suggested: ${match.suggested}`);
    });
    console.log();
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total: ${matches.length} import(s) to migrate`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// CLI entry point
if (import.meta.main) {
  generateReport().catch(error => {
    console.error("❌ Audit failed:", error);
    process.exit(1);
  });
}

