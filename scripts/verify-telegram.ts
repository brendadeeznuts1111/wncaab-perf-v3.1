#!/usr/bin/env bun
/**
 * Verify Telegram Bot Setup - TES-NGWS-001.12
 * 
 * Verifies bot token and supergroup configuration.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set");
  console.log("   Run: bash scripts/setup-telegram.sh");
  process.exit(1);
}

if (!SUPERGROUP_ID) {
  console.error("❌ TELEGRAM_SUPERGROUP_ID not set");
  console.log("   Run: bash scripts/setup-telegram.sh");
  process.exit(1);
}

console.log("🔍 Verifying Telegram Bot Setup...");
console.log("");

// Test 1: Verify bot token
console.log("1️⃣ Testing bot token...");
try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const data = await response.json();
  
  if (data.ok) {
    console.log(`   ✅ Bot verified: @${data.result.username}`);
    console.log(`   📛 Name: ${data.result.first_name}`);
    console.log(`   🆔 ID: ${data.result.id}`);
  } else {
    console.error(`   ❌ Bot verification failed: ${data.description}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`   ❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

console.log("");

// Test 2: Verify supergroup access
console.log("2️⃣ Testing supergroup access...");
try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: SUPERGROUP_ID }),
  });
  
  const data = await response.json();
  
  if (data.ok) {
    console.log(`   ✅ Supergroup verified: ${data.result.title || data.result.username || SUPERGROUP_ID}`);
    console.log(`   📛 Type: ${data.result.type}`);
    
    if (data.result.type === "supergroup") {
      console.log(`   ✅ Confirmed: Supergroup`);
    } else {
      console.log(`   ⚠️  Warning: Not a supergroup (type: ${data.result.type})`);
    }
  } else {
    console.error(`   ❌ Supergroup access failed: ${data.description}`);
    console.log(`   💡 Make sure:`);
    console.log(`      - Bot is added to the supergroup`);
    console.log(`      - Bot is an administrator`);
    console.log(`      - Supergroup ID is correct: ${SUPERGROUP_ID}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`   ❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

console.log("");

// Test 3: Test message send (to Topic #1)
console.log("3️⃣ Testing message send to Topic #1...");
try {
  const testMessage = `🧪 **Test Alert**\n\nThis is a test message from TES Sentinel.\n\nIf you see this, your bot is configured correctly! ✅`;
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: SUPERGROUP_ID,
      message_thread_id: 1, // Topic #1
      text: testMessage,
      parse_mode: "Markdown",
    }),
  });
  
  const data = await response.json();
  
  if (data.ok) {
    console.log(`   ✅ Test message sent successfully!`);
    console.log(`   📱 Check Topic #1 in your supergroup`);
    console.log(`   🆔 Message ID: ${data.result.message_id}`);
  } else {
    console.error(`   ❌ Message send failed: ${data.description}`);
    console.log(`   💡 Make sure:`);
    console.log(`      - Topic #1 exists in your supergroup`);
    console.log(`      - Bot has permission to post in topics`);
    console.log(`      - Bot is an administrator`);
    process.exit(1);
  }
} catch (error) {
  console.error(`   ❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

console.log("");
console.log("✅ All tests passed! Your Telegram bot is configured correctly.");
console.log("");
console.log("🚀 Next steps:");
console.log("   1. Create topics #2-5 in your supergroup");
console.log("   2. Run: bun run test:telegram");
console.log("   3. Start sentinel: bun run start:sentinel");

