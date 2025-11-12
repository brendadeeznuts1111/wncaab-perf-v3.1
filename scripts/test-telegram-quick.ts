#!/usr/bin/env bun
/**
 * Quick Telegram Test - Send message without topic
 * Tests bot can send messages to supergroup
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID;

if (!BOT_TOKEN || !SUPERGROUP_ID) {
  console.error("❌ Environment variables not set");
  console.log("   Run: export $(cat .env | grep -v '^#' | xargs)");
  process.exit(1);
}

console.log("🧪 Testing Telegram message send (no topic)...");
console.log("");

try {
  const testMessage = `🧪 **TES Sentinel Test**\n\n✅ Bot is working!\n✅ Supergroup access confirmed\n\n⚠️ Note: Topics not created yet. Create topics #1-5 in your supergroup for organized alerts.`;
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: SUPERGROUP_ID,
      text: testMessage,
      parse_mode: "Markdown",
    }),
  });
  
  const data = await response.json();
  
  if (data.ok) {
    console.log(`✅ Test message sent successfully!`);
    console.log(`📱 Check your supergroup: Smoke-China`);
    console.log(`🆔 Message ID: ${data.result.message_id}`);
    console.log("");
    console.log("📋 Next: Create topics #1-5 in your supergroup, then run:");
    console.log("   bun run verify:telegram");
  } else {
    console.error(`❌ Message send failed: ${data.description}`);
    if (data.error_code === 403) {
      console.log("💡 Bot needs to be an administrator with 'Post Messages' permission");
    }
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

