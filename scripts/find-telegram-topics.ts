#!/usr/bin/env bun
/**
 * Find Telegram Topic IDs - TES-NGWS-001.12
 * Helps identify correct topic IDs in supergroup
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID;

if (!BOT_TOKEN || !SUPERGROUP_ID) {
  console.error("❌ Environment variables not set");
  process.exit(1);
}

console.log("🔍 Finding Telegram Topic IDs...");
console.log("");

// Try to get forum topics (if supergroup has forum enabled)
try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getForumTopics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: SUPERGROUP_ID,
    }),
  });
  
  const data = await response.json();
  
  if (data.ok && data.result && data.result.topics) {
    console.log("✅ Found topics:");
    console.log("");
    data.result.topics.forEach((topic: any) => {
      console.log(`   Topic ID: ${topic.message_thread_id}`);
      console.log(`   Name: ${topic.name}`);
      console.log(`   Icon: ${topic.icon_color ? '🎨' : '📌'}`);
      console.log("");
    });
    
    // Find the steam topic
    const steamTopic = data.result.topics.find((t: any) => 
      t.name.toLowerCase().includes('steam') || 
      t.name.includes('🚨')
    );
    
    if (steamTopic) {
      console.log(`🎯 Steam topic found: ID ${steamTopic.message_thread_id}`);
      console.log(`   Update .env: TELEGRAM_TOPIC_STEAM="${steamTopic.message_thread_id}"`);
    }
  } else {
    console.log("⚠️  Could not fetch topics via API");
    console.log("   This might mean:");
    console.log("   - Forum topics API not available for this supergroup");
    console.log("   - Topics need to be created manually");
    console.log("");
    console.log("💡 Try testing with different topic IDs:");
    console.log("   Topic IDs are usually: 2, 3, 4, 5... (1 is general chat)");
  }
} catch (error) {
  console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
}

// Test sending to topic ID 2 (sometimes first topic is ID 2, not 1)
console.log("");
console.log("🧪 Testing Topic ID 2 (common first topic ID)...");

try {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: SUPERGROUP_ID,
      message_thread_id: 2,
      text: "🧪 Test message to Topic ID 2",
    }),
  });
  
  const data = await response.json();
  
  if (data.ok) {
    console.log("✅ Topic ID 2 works! Update .env:");
    console.log('   TELEGRAM_TOPIC_STEAM="2"');
  } else {
    console.log(`❌ Topic ID 2 failed: ${data.description}`);
  }
} catch (error) {
  console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
}

