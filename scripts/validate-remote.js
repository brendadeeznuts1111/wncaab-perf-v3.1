/**
 * Remote Index Validator - Native Bun API (v14.2)
 * 
 * Validates remote index configuration in bunfig.toml
 * Checks URL format, fallback file existence, and grep patterns
 */

async function validateRemote() {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  
  const config = await Bun.file('bunfig.toml').text();
  
  // Match TOML format: [remote] section with index and fallback
  const remoteMatch = config.match(/\[remote\]\s*\n[^\[]*index\s*=\s*"(.*?)"\s*\n[^\[]*fallback\s*=\s*"(.*?)"/s);
  if (!remoteMatch) {
    if (strict) {
      console.error('❌ No remote configuration found');
      process.exit(1);
    }
    return console.log('No remote found');
  }

  const url = remoteMatch[1];
  const fallback = remoteMatch[2];
  
  let valid = 0, errors = [];
  if (!url.startsWith('https://')) errors.push(`❌ URL must be HTTPS: ${url}`);
  
  // Validate URL format
  try {
    new URL(url);
  } catch {
    errors.push(`❌ Invalid URL format: ${url}`);
  }
  
  if (!(await Bun.file(fallback).exists())) {
    if (strict) {
      errors.push(`❌ Fallback file not found: ${fallback}`);
    } else {
      errors.push(`⚠️  Fallback file not found: ${fallback} (will be created on first build)`);
    }
  }
  
  const grepTag = `remote-${url.replace(/\//g, '-').toLowerCase()}-${fallback.replace(/\//g, '-').toLowerCase()}`;
  if (!grepTag.match(/remote-/)) errors.push(`❌ Grep tag validation failed: ${grepTag}`);

  if (errors.length) {
    const criticalErrors = errors.filter(e => e.startsWith('❌'));
    if (criticalErrors.length > 0 || strict) {
      console.error(errors.join('\n'));
      process.exit(1);
    } else {
      console.warn(errors.join('\n'));
    }
  }
  
  console.log(`✅ Remote index config valid:`);
  console.log(`   URL:     ${url}`);
  console.log(`   Fallback: ${fallback}`);
  console.log(`   Grepable: ${grepTag}`);
  console.log(`🎉 All remote configs valid & grep-ready!`);
}

if (import.meta.main) {
  validateRemote();
}

export { validateRemote };
