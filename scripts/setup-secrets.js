/**
 * Setup Secrets for Remote Index CDN Authentication (P2 Enterprise Feature)
 * 
 * One-time setup per developer/CI machine
 * Stores CDN API key in OS credential store via Bun.secrets
 */

import { secrets } from "bun";

async function setupSecrets() {
  const args = Bun.argv.slice(2);
  let apiKey = null;
  
  // Parse --api-key argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && i + 1 < args.length) {
      apiKey = args[i + 1];
      break;
    } else if (args[i].startsWith('--api-key=')) {
      apiKey = args[i].split('=')[1];
      break;
    }
  }
  
  if (!apiKey) {
    console.error('❌ Error: --api-key required');
    console.error('\nUsage:');
    console.error('  bun run scripts/setup-secrets.js --api-key "your-cdn-secret"');
    process.exit(1);
  }
  
  try {
    // Store secret in OS credential store
    await secrets.set({
      service: 'wncaab-syndicate',
      name: 'cdn-api-key',
      value: apiKey
    });
    
    console.log('✅ CDN API key stored securely');
    console.log('   Service: wncaab-syndicate');
    console.log('   Name: cdn-api-key');
    console.log('\n💡 The key will be used automatically for remote index fetches');
  } catch (error) {
    console.error(`❌ Failed to store secret: ${error}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  setupSecrets();
}

export { setupSecrets };

