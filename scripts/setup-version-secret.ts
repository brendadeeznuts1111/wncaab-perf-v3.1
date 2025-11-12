#!/usr/bin/env bun
/**
 * TES-OPS-004.B.4: Setup Version Signing Secret
 * 
 * One-time setup per developer/CI machine
 * Stores version signing key in OS credential store via Bun.secrets
 * 
 * Usage:
 *   bun run scripts/setup-version-secret.ts
 *   bun run scripts/setup-version-secret.ts --key "your-signing-key"
 */

import { secrets } from 'bun';
import { getRandomValues } from 'crypto';

async function setupVersionSecret() {
  const args = Bun.argv.slice(2);
  let signingKey: string | null = null;
  
  // Parse --key argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && i + 1 < args.length) {
      signingKey = args[i + 1];
      break;
    } else if (args[i].startsWith('--key=')) {
      signingKey = args[i].split('=')[1];
      break;
    }
  }
  
  // If no key provided, prompt for it
  if (!signingKey) {
    console.log('🔑 Version Signing Key Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Enter your version signing key (64-character hex string).');
    console.log('Leave empty to generate a new secure key automatically.');
    console.log('');
    console.log('Example key: 3ef9f8e81449ffbec4eac669ade77e8d4a8af06a1e8aa027a974657ce3a33e69');
    console.log('');
    console.log('💡 Tip: Use --key flag for non-interactive mode');
    console.log('   bun run scripts/setup-version-secret.ts --key "your-key-here"');
    console.log('');
    
    // Generate key automatically (non-interactive)
    // For interactive input, user can use --key flag
    console.log('⚠️  No key provided. Generating new key automatically...');
    signingKey = '';
  }
  
  // Generate key if not provided
  if (!signingKey || signingKey.length === 0) {
    const keyBytes = getRandomValues(new Uint8Array(32));
    signingKey = Array.from(keyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('');
    console.log('✨ Generated new signing key:');
    console.log(`   ${signingKey}`);
    console.log('');
  }
  
  // Validate key format (should be 64 hex characters)
  if (signingKey.length !== 64 || !/^[0-9a-f]+$/i.test(signingKey)) {
    console.error('❌ Invalid signing key format.');
    console.error('   Expected: 64-character hexadecimal string (256 bits)');
    console.error(`   Received: ${signingKey.length} characters`);
    process.exit(1);
  }
  
  try {
    // Store secret in OS credential store
    await secrets.set({
      service: 'tes-version-management',
      name: 'signing-key',
      value: signingKey,
    });
    
    console.log('✅ Version signing key stored securely');
    console.log('   Service: tes-version-management');
    console.log('   Name: signing-key');
    console.log('');
    console.log('💡 The key will be used automatically by bump.ts');
    console.log('   Priority: Environment variable > Bun.secrets > Fallback');
    console.log('');
    console.log('📝 To use in CI/CD, set environment variable:');
    console.log(`   export VERSION_SIGNING_KEY="${signingKey}"`);
    console.log('');
  } catch (error) {
    console.error(`❌ Failed to store secret: ${error}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  setupVersionSecret();
}

export { setupVersionSecret };

