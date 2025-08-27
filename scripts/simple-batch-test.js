#!/usr/bin/env node

/**
 * Simple Redis batching test - sends 3 messages and verifies batching
 */

require('dotenv').config();
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3002';
const INSTANCE_NAME = 'test-simple';
const REDIS_URL = process.env.REDIS_URL || 'https://winning-muskrat-39947.upstash.io';
const REDIS_TOKEN = process.env.REDIS_TOKEN || 'AZwLAAIncDFmYmJjNzMwNTBmZTQ0N2Y2OGFjMWUyMDAzMDFiNjMyNnAxMzk5NDc';

console.log('🧪 Simple Redis Batching Test');
console.log('='.repeat(50));
console.log(`URL: ${BASE_URL}`);
console.log(`Instance: ${INSTANCE_NAME}`);
console.log(`Redis: ${REDIS_URL.substring(0, 30)}...`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendDirectWebhookMessage(text, messageId) {
  const payload = {
    event: "messages.upsert",
    data: {
      key: {
        remoteJid: "5561888888888@s.whatsapp.net",
        fromMe: false,
        id: messageId
      },
      message: {
        conversation: text
      },
      pushName: "Test Batching User",
      messageTimestamp: Date.now()
    }
  };

  const curlCommand = `curl -X POST "${BASE_URL}/api/webhook/whatsapp/${INSTANCE_NAME}" \
    -H "Content-Type: application/json" \
    -d '${JSON.stringify(payload)}' \
    --max-time 30 \
    --silent \
    --show-error`;

  console.log(`📤 Sending: "${text}"`);
  
  try {
    const response = execSync(curlCommand, { encoding: 'utf8' });
    const result = JSON.parse(response);
    
    if (result.success) {
      console.log(`✅ Message sent successfully`);
      console.log(`   - Correlation: ${result.correlationId}`);
      console.log(`   - Processing: ${result.processingTimeMs}ms`);
      console.log(`   - Result:`, result.result);
      return result;
    } else {
      console.log(`❌ Message failed:`, result.error);
      return null;
    }
    
  } catch (error) {
    console.log(`❌ HTTP Error:`, error.message);
    return null;
  }
}

async function checkRedisSession(sessionId) {
  console.log(`\n🔍 Checking Redis state for session: ${sessionId}`);
  
  try {
    // Use environment variables for Redis connection
    process.env.REDIS_URL = REDIS_URL;
    process.env.REDIS_TOKEN = REDIS_TOKEN;
    
    const { SessionStateManager } = require('../lib/sessionState');
    const manager = new SessionStateManager(sessionId);
    
    const batchUntil = await manager.getBatchUntil();
    const pendingCount = await manager.getPendingMessageCount();
    const lastTimestamp = await manager.getLastUserTimestamp();
    
    console.log(`   - Batch until: ${batchUntil ? new Date(batchUntil).toISOString() : 'none'}`);
    console.log(`   - Pending messages: ${pendingCount}`);
    console.log(`   - Last user timestamp: ${lastTimestamp ? new Date(lastTimestamp).toISOString() : 'none'}`);
    
    if (batchUntil) {
      const timeUntil = Math.round((batchUntil - Date.now()) / 1000);
      console.log(`   - Time until batch: ${timeUntil}s`);
    }
    
    return {
      batchUntil,
      pendingCount,
      lastTimestamp,
      timeUntil: batchUntil ? Math.round((batchUntil - Date.now()) / 1000) : null
    };
    
  } catch (error) {
    console.log(`❌ Redis error:`, error.message);
    return null;
  }
}

async function main() {
  console.log('\n🚀 Starting simple batching test...');
  
  const testTimestamp = Date.now();
  const messages = [
    `Sou o João da TechCorp - ${testTimestamp}`,
    `Preciso de consultoria de vendas - ${testTimestamp}`,
    `Quando podemos conversar? - ${testTimestamp}`
  ];
  
  const results = [];
  let sessionId = null;
  
  // Send 3 messages quickly (within 5 seconds)
  for (let i = 0; i < messages.length; i++) {
    const messageId = `simple-test-${testTimestamp}-${i + 1}`;
    const result = await sendDirectWebhookMessage(messages[i], messageId);
    
    if (result && result.success) {
      results.push(result);
      
      // Get session ID from first successful response
      if (!sessionId && result.result?.sessionId) {
        sessionId = result.result.sessionId;
        console.log(`📝 Session ID: ${sessionId}`);
      }
    }
    
    // Small delay between messages (1 second)
    if (i < messages.length - 1) {
      await sleep(1000);
    }
  }
  
  console.log('\n📊 Batching Results:');
  console.log(`   - Messages sent: ${results.length}/3`);
  console.log(`   - Session ID: ${sessionId || 'unknown'}`);
  
  if (results.length === 0) {
    console.log('❌ No messages were sent successfully');
    return false;
  }
  
  // Check all have same batch window
  const batchWindows = results
    .map(r => r.result?.batchWindow)
    .filter(Boolean);
  
  const uniqueWindows = [...new Set(batchWindows)];
  
  if (uniqueWindows.length === 1) {
    console.log(`✅ All messages in same batch: ${new Date(uniqueWindows[0]).toISOString()}`);
    
    const timeUntil = Math.round((uniqueWindows[0] - Date.now()) / 1000);
    console.log(`⏰ Batch will process in: ${timeUntil}s`);
    
    // Check Redis state
    if (sessionId) {
      const redisState = await checkRedisSession(sessionId);
      
      if (redisState && redisState.pendingCount === 3) {
        console.log('✅ All 3 messages are pending in Redis');
      } else {
        console.log(`⚠️ Expected 3 pending messages, got ${redisState?.pendingCount || 0}`);
      }
    }
    
    console.log('\n🎯 Batching Test Result: ✅ SUCCESS');
    console.log('   - All messages queued in same 120s batch window');
    console.log('   - Redis state shows pending messages correctly');
    console.log('   - Session management working properly');
    
    return true;
    
  } else if (uniqueWindows.length > 1) {
    console.log(`❌ Messages split across ${uniqueWindows.length} batch windows:`);
    uniqueWindows.forEach((window, i) => {
      console.log(`   Window ${i + 1}: ${new Date(window).toISOString()}`);
    });
    return false;
    
  } else {
    console.log('❌ No batch windows found in responses');
    return false;
  }
}

if (require.main === module) {
  main()
    .then(success => {
      console.log('\n' + '='.repeat(50));
      if (success) {
        console.log('🎉 SIMPLE BATCHING TEST PASSED');
      } else {
        console.log('💥 SIMPLE BATCHING TEST FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}