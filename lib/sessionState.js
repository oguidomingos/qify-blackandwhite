const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN
})

class SessionStateManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  // Lock operations
  async acquireLock(ttlMs = 10000) {
    const result = await redis.set(`sess:${this.sessionId}:lock`, '1', {
      px: ttlMs,
      nx: true
    });
    return result === 'OK';
  }

  async releaseLock() {
    await redis.del(`sess:${this.sessionId}:lock`);
  }

  // Batch operations
  async setBatchUntil(timestampMs) {
    await redis.set(`sess:${this.sessionId}:batch_until`, timestampMs.toString());
  }

  async getBatchUntil() {
    const result = await redis.get(`sess:${this.sessionId}:batch_until`);
    return result ? parseInt(result) : null;
  }

  async clearBatchUntil() {
    await redis.del(`sess:${this.sessionId}:batch_until`);
  }

  async addPendingMessage(messagePayload) {
    // Upstash client handles serialization automatically - store object directly
    await redis.lpush(`sess:${this.sessionId}:pending_msgs`, messagePayload);
  }

  async drainPendingMessages() {
    const messages = await redis.lrange(`sess:${this.sessionId}:pending_msgs`, 0, -1);
    if (messages.length > 0) {
      await redis.del(`sess:${this.sessionId}:pending_msgs`);
    }
    // Upstash client returns objects directly - no JSON parsing needed
    return messages.reverse(); // chronological order (LPUSH stores newest first, reverse to get chronological)
  }

  async getPendingMessageCount() {
    return await redis.llen(`sess:${this.sessionId}:pending_msgs`);
  }

  // SPIN state operations  
  async getStage() {
    const stage = await redis.get(`sess:${this.sessionId}:stage`);
    return stage || 'S';
  }

  async setStage(stage) {
    await redis.set(`sess:${this.sessionId}:stage`, stage);
  }

  async addAsked(slot) {
    await redis.sadd(`sess:${this.sessionId}:asked`, slot);
  }

  async addAnswered(slot) {
    await redis.sadd(`sess:${this.sessionId}:answered`, slot);
  }

  async getAsked() {
    const asked = await redis.smembers(`sess:${this.sessionId}:asked`);
    return new Set(asked);
  }

  async getAnswered() {
    const answered = await redis.smembers(`sess:${this.sessionId}:answered`);
    return new Set(answered);
  }

  // Facts operations (canonicalized data)
  async setFact(key, value) {
    await redis.hset(`sess:${this.sessionId}:facts`, { [key]: value });
  }

  async getFacts() {
    const facts = await redis.hgetall(`sess:${this.sessionId}:facts`);
    // Handle case where Redis returns null
    if (!facts) {
      return {
        name: undefined,
        personType: undefined,
        business: undefined,
        contact: undefined
      };
    }
    return {
      name: facts.name || undefined,
      personType: facts.personType || undefined,
      business: facts.business || undefined,
      contact: facts.contact || undefined
    };
  }

  async setLastUserTimestamp(ts) {
    await redis.set(`sess:${this.sessionId}:last_user_ts`, ts.toString());
  }

  async getLastUserTimestamp() {
    const result = await redis.get(`sess:${this.sessionId}:last_user_ts`);
    return result ? parseInt(result) : null;
  }

  // Complete state getter
  async getState() {
    const [stage, asked, answered, facts, lastUserTs] = await Promise.all([
      this.getStage(),
      this.getAsked(),
      this.getAnswered(),
      this.getFacts(),
      this.getLastUserTimestamp()
    ]);

    return {
      stage,
      asked,
      answered,
      facts,
      lastUserTs: lastUserTs || 0
    };
  }

  // Cleanup
  async cleanup() {
    const keys = [
      `sess:${this.sessionId}:lock`,
      `sess:${this.sessionId}:batch_until`, 
      `sess:${this.sessionId}:pending_msgs`,
      `sess:${this.sessionId}:stage`,
      `sess:${this.sessionId}:asked`,
      `sess:${this.sessionId}:answered`,
      `sess:${this.sessionId}:facts`,
      `sess:${this.sessionId}:last_user_ts`
    ];
    await redis.del(...keys);
  }
}

// Dedupe helper
async function isDuplicateMessage(providerMessageId) {
  const exists = await redis.get(`dedupe:${providerMessageId}`);
  if (!exists) {
    await redis.set(`dedupe:${providerMessageId}`, '1', { ex: 600 }); // 10 min TTL
    return false;
  }
  return true;
}

// Helper to check Redis connection
async function checkRedisConnection() {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}

module.exports = {
  SessionStateManager,
  isDuplicateMessage,
  checkRedisConnection
};