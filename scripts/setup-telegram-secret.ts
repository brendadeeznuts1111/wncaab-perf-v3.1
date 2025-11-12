#!/usr/bin/env bun
/**
 * Setup Telegram Bot Token in Bun.secrets
 * 
 * SECURITY: Stores Telegram bot token securely in OS credential store
 * Uses Bun.secrets API for encrypted storage
 * 
 * Usage:
 *   bun run scripts/setup-telegram-secret.ts
 *   bun run scripts/setup-telegram-secret.ts --token "your_token_here"
 */

import { secrets } from "bun";
import { setTelegramBotToken } from "../src/lib/secrets-manager";

const SERVICE_NAME = "wncaab-perf-v3.1";

async function setupTelegramSecret() {
  const args = Bun.argv.slice(2);
  let token: string | null = null;
  
  // Parse --token argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' && i + 1 < args.length) {
      token = args[i + 1];
      break;
    } else if (args[i].startsWith('--token=')) {
      token = args[i].split('=')[1];
      break;
    }
  }
  
  // If no token provided, show instructions
  if (!token) {
    console.log("📝 Telegram Bot Token Setup");
    console.log("===========================\n");
    console.log("To set your Telegram bot token securely in Bun.secrets:\n");
    console.log("Option 1: Pass token as argument (recommended):");
    console.log('  bun run scripts/setup-telegram-secret.ts --token "your_token_here"\n');
    console.log("Option 2: Use environment variable:");
    console.log('  export TELEGRAM_BOT_TOKEN="your_token_here"');
    console.log('  bun run scripts/setup-telegram-secret.ts\n');
    console.log("Option 3: Interactive prompt:");
    console.log('  echo "your_token_here" | bun run scripts/setup-telegram-secret.ts\n');
    console.log("Get your token from @BotFather on Telegram\n");
    
    // Try to read from stdin if available
    try {
      const stdin = Bun.stdin;
      if (stdin) {
        const input = await new Response(stdin).text();
        token = input.trim();
      }
    } catch (e) {
      // stdin not available, continue
    }
    
    // Also check environment variable
    if (!token) {
      token = process.env.TELEGRAM_BOT_TOKEN || Bun.env.TELEGRAM_BOT_TOKEN || null;
      if (token) {
        console.log("✅ Found token in environment variable\n");
      }
    }
  }
  
  if (!token || token.trim().length === 0) {
    console.error('❌ Error: Telegram bot token is required');
    console.error('\nUsage:');
    console.error('  bun run scripts/setup-telegram-secret.ts');
    console.error('  bun run scripts/setup-telegram-secret.ts --token "your_token_here"');
    process.exit(1);
  }
  
  try {
    // Store secret in OS credential store
    await setTelegramBotToken(token.trim());
    
    console.log('✅ Telegram bot token stored securely in Bun.secrets');
    console.log(`   Service: ${SERVICE_NAME}`);
    console.log('   Name: telegram-bot-token');
    console.log('\n💡 The token will be used automatically by the Telegram alert system');
    console.log('   Priority: Bun.secrets > TELEGRAM_BOT_TOKEN env var');
  } catch (error) {
    console.error(`❌ Failed to store secret: ${error}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  setupTelegramSecret();
}

export { setupTelegramSecret };

