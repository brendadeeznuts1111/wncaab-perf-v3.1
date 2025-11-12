#!/usr/bin/env bun
/**
 * Test Telegram Topics - Try common topic IDs
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERGROUP_ID = process.env.TELEGRAM_SUPERGROUP_ID;

if (!BOT_TOKEN || !SUPERGROUP_ID) {
  console.error("❌ Environment variables not set");
  process.exit(1);
}

console.log("🧪 Testing Telegram Topic IDs...");
console.log("");

// Common topic IDs to try (Telegram assigns IDs sequentially)
const topicIdsToTest = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let foundTopics: number[] = [];

for (const topicId of topicIdsToTest) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: SUPERGROUP_ID,
        message_thread_id: topicId,
        text: `✅ Test - Topic ID ${topicId} works!`,
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log(`✅ Topic ID ${topicId} works!`);
      foundTopics.push(topicId);
    } else {
      // Silently skip failed topics
    }
  } catch (error) {
    // Skip errors
  }
}

console.log("");

if (foundTopics.length > 0) {
  console.log(`🎯 Found ${foundTopics.length} working topic(s):`);
  foundTopics.forEach(id => {
    console.log(`   Topic ID: ${id}`);
  });
  console.log("");
  console.log("📝 Update your .env file:");
  console.log(`   TELEGRAM_TOPIC_STEAM="${foundTopics[0]}"`);
  if (foundTopics.length > 1) {
    console.log(`   TELEGRAM_TOPIC_PERFORMANCE="${foundTopics[1] || foundTopics[0]}"`);
    console.log(`   TELEGRAM_TOPIC_SECURITY="${foundTopics[2] || foundTopics[0]}"`);
    console.log(`   TELEGRAM_TOPIC_ERRORS="${foundTopics[3] || foundTopics[0]}"`);
    console.log(`   TELEGRAM_TOPIC_HEARTBEAT="${foundTopics[4] || foundTopics[0]}"`);
  }
} else {
  console.log("❌ No topics found. Possible issues:");
  console.log("");
  console.log("1. Topics not enabled in supergroup:");
  console.log("   - Go to supergroup settings");
  console.log("   - Enable 'Topics' feature");
  console.log("");
  console.log("2. Bot permissions:");
  console.log("   - Bot must be administrator");
  console.log("   - Bot needs 'Post Messages' permission");
  console.log("   - Bot needs permission to post in topics");
  console.log("");
  console.log("3. Topic creation:");
  console.log("   - Create topics in supergroup (not regular threads)");
  console.log("   - Topics appear as separate tabs in Telegram");
  console.log("");
  console.log("💡 For now, alerts will work without topics (sent to general chat)");
  console.log("   The system will fall back gracefully.");
}

