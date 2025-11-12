#!/usr/bin/env bun
/**
 * Complete Telegram Configuration Verification - TES-NGWS-001.12
 * 
 * Verifies all topic IDs, naming, and alert routing
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID;
const TOPIC_STEAM = process.env.TELEGRAM_TOPIC_STEAM;
const TOPIC_PERFORMANCE = process.env.TELEGRAM_TOPIC_PERFORMANCE;
const TOPIC_SECURITY = process.env.TELEGRAM_TOPIC_SECURITY;
const TOPIC_ERRORS = process.env.TELEGRAM_TOPIC_ERRORS;
const TOPIC_HEARTBEAT = process.env.TELEGRAM_TOPIC_HEARTBEAT;

console.log("🔍 Complete Telegram Configuration Verification");
console.log("==============================================");
console.log("");

// 1. Verify environment variables
console.log("1️⃣ Environment Variables:");
console.log(`   BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Missing'} ${BOT_TOKEN ? `(${BOT_TOKEN.substring(0, 10)}...)` : ''}`);
console.log(`   SUPERGROUP_ID: ${SUPERGROUP_ID ? '✅ Set' : '❌ Missing'} ${SUPERGROUP_ID || ''}`);
console.log(`   TOPIC_STEAM: ${TOPIC_STEAM || '❌ Not set'}`);
console.log(`   TOPIC_PERFORMANCE: ${TOPIC_PERFORMANCE || '❌ Not set'}`);
console.log(`   TOPIC_SECURITY: ${TOPIC_SECURITY || '❌ Not set'}`);
console.log(`   TOPIC_ERRORS: ${TOPIC_ERRORS || '❌ Not set'}`);
console.log(`   TOPIC_HEARTBEAT: ${TOPIC_HEARTBEAT || '❌ Not set'}`);
console.log("");

if (!BOT_TOKEN || !SUPERGROUP_ID) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

// 2. Verify bot
console.log("2️⃣ Bot Verification:");
try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const data = await response.json();
  
  if (data.ok) {
    console.log(`   ✅ Bot: @${data.result.username}`);
    console.log(`   📛 Name: ${data.result.first_name}`);
    console.log(`   🆔 ID: ${data.result.id}`);
  } else {
    console.error(`   ❌ Bot verification failed: ${data.description}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
console.log("");

// 3. Verify supergroup
console.log("3️⃣ Supergroup Verification:");
try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: SUPERGROUP_ID }),
  });
  
  const data = await response.json();
  
  if (data.ok) {
    console.log(`   ✅ Supergroup: ${data.result.title || data.result.username || SUPERGROUP_ID}`);
    console.log(`   📛 Type: ${data.result.type}`);
    console.log(`   🆔 ID: ${SUPERGROUP_ID}`);
  } else {
    console.error(`   ❌ Supergroup access failed: ${data.description}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
console.log("");

// 4. Test all topic IDs
console.log("4️⃣ Topic ID Verification:");
console.log("");

const topics = [
  { name: "🚨 Critical Steam Moves", env: "TELEGRAM_TOPIC_STEAM", id: TOPIC_STEAM },
  { name: "📈 Performance Metrics", env: "TELEGRAM_TOPIC_PERFORMANCE", id: TOPIC_PERFORMANCE },
  { name: "🔐 Security Events", env: "TELEGRAM_TOPIC_SECURITY", id: TOPIC_SECURITY },
  { name: "🐛 System Errors", env: "TELEGRAM_TOPIC_ERRORS", id: TOPIC_ERRORS },
  { name: "💓 Heartbeat", env: "TELEGRAM_TOPIC_HEARTBEAT", id: TOPIC_HEARTBEAT },
];

const topicResults: Array<{ name: string; id: string; status: 'success' | 'failed' | 'missing'; messageId?: number }> = [];

for (const topic of topics) {
  if (!topic.id) {
    console.log(`   ⚠️  ${topic.name}: Not configured (${topic.env})`);
    topicResults.push({ name: topic.name, id: topic.id || 'N/A', status: 'missing' });
    continue;
  }
  
  try {
    const testMessage = `✅ **${topic.name}**\n\nTopic ID verification test.`;
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: SUPERGROUP_ID,
        message_thread_id: parseInt(topic.id),
        text: testMessage,
        parse_mode: "Markdown",
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log(`   ✅ ${topic.name}: Topic ID ${topic.id} works (Message ID: ${data.result.message_id})`);
      topicResults.push({ 
        name: topic.name, 
        id: topic.id, 
        status: 'success',
        messageId: data.result.message_id 
      });
    } else {
      console.log(`   ❌ ${topic.name}: Topic ID ${topic.id} failed - ${data.description}`);
      topicResults.push({ name: topic.name, id: topic.id, status: 'failed' });
    }
  } catch (error) {
    console.log(`   ❌ ${topic.name}: Error - ${error instanceof Error ? error.message : String(error)}`);
    topicResults.push({ name: topic.name, id: topic.id, status: 'failed' });
  }
}

console.log("");

// 5. Summary
console.log("5️⃣ Configuration Summary:");
console.log("");

const successful = topicResults.filter(t => t.status === 'success').length;
const failed = topicResults.filter(t => t.status === 'failed').length;
const missing = topicResults.filter(t => t.status === 'missing').length;

console.log(`   ✅ Working: ${successful}/${topics.length}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   ⚠️  Missing: ${missing}`);
console.log("");

if (successful === topics.length) {
  console.log("🎉 All topics configured correctly!");
} else {
  console.log("⚠️  Some topics need attention:");
  topicResults.forEach(topic => {
    if (topic.status !== 'success') {
      console.log(`   - ${topic.name}: ${topic.status === 'missing' ? 'Not configured' : 'Failed'}`);
    }
  });
}

console.log("");
console.log("📋 Current Configuration:");
console.log("```env");
console.log(`TELEGRAM_BOT_TOKEN="${BOT_TOKEN}"`);
console.log(`TELEGRAM_SUPERGROUP_ID="${SUPERGROUP_ID}"`);
console.log(`TELEGRAM_TOPIC_STEAM="${TOPIC_STEAM || 'NOT SET'}"`);
console.log(`TELEGRAM_TOPIC_PERFORMANCE="${TOPIC_PERFORMANCE || 'NOT SET'}"`);
console.log(`TELEGRAM_TOPIC_SECURITY="${TOPIC_SECURITY || 'NOT SET'}"`);
console.log(`TELEGRAM_TOPIC_ERRORS="${TOPIC_ERRORS || 'NOT SET'}"`);
console.log(`TELEGRAM_TOPIC_HEARTBEAT="${TOPIC_HEARTBEAT || 'NOT SET'}"`);
console.log("```");
console.log("");

// 6. Alert routing test
if (TOPIC_STEAM) {
  console.log("6️⃣ Testing Steam Alert Routing:");
  console.log("");
  
  try {
    const steamMessage = `🚨 **STEAM ALERT TEST**\n\n` +
      `📊 **Game:** Test Home vs Test Away\n` +
      `🎲 **Odds:** 1.95 → **1.75**\n` +
      `⚡ **Velocity:** 0.2000\n` +
      `🏦 **Bookmaker:** TEST-BOOK\n` +
      `📈 **Type:** moneyline\n` +
      `⏱️ **Time:** ${new Date().toLocaleTimeString()}\n\n` +
      `This is a test steam alert routing to Topic ID ${TOPIC_STEAM}.`;
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: SUPERGROUP_ID,
        message_thread_id: parseInt(TOPIC_STEAM),
        text: steamMessage,
        parse_mode: "Markdown",
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log(`   ✅ Steam alert routed successfully to Topic ID ${TOPIC_STEAM}`);
      console.log(`   📱 Message ID: ${data.result.message_id}`);
      console.log(`   ⏱️  Response time: ${Date.now() - (data.result.date * 1000)}ms`);
    } else {
      console.log(`   ❌ Steam alert routing failed: ${data.description}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  console.log("");
}

console.log("==============================================");
console.log("✅ Verification complete!");
console.log("");
console.log("📚 Next steps:");
console.log("   1. Review topic IDs above");
console.log("   2. Update .env if needed");
console.log("   3. Run: bun run test:telegram");
console.log("   4. Start sentinel: bun run start:sentinel");

