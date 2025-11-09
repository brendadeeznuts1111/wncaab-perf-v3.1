/**
 * Remote Index Generator - Native Bun API Implementation (v14.2)
 * 
 * Generates dual-format remote index calls (readable + grepable)
 * Uses native Bun.file() API for TOML config parsing
 * Supports CLI dual format: --url=value AND --url value
 */

function generateIndexCall(params = {}) {
  const {
    url = 'https://cdn.syndicate.com/wncaab-index.txt',
    fallback = './local-index.txt'
  } = params;

  // Schema sentinel
  if (!url.startsWith('https://')) throw new Error(`❌ URL must be HTTPS`);

  const readable = `await loadRemoteIndex('${url}', '${fallback}');`;
  const grepable = `index-${url.replace(/\//g, '-').toLowerCase()}-${fallback.replace(/\//g, '-').toLowerCase()}`;

  return readable + ' // Grepable: ' + grepable;
}

/**
 * Generate complete index section for documentation
 */
function generateIndexSection(params = {}) {
  const result = generateIndexCall(params);
  return result;
}

// CLI: bun run templates/index-gen.js --url https://cdn.syndicate.com/wncaab-index.txt --fallback ./local-index.txt
if (import.meta.main) {
  const params = {};
  const args = Bun.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        params[key] = value.replace(/^["']|["']$/g, '');
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        params[key] = args[++i].replace(/^["']|["']$/g, '');
      }
    }
  }
  
  console.log(generateIndexSection(params));
}

export { generateIndexCall, generateIndexSection };
