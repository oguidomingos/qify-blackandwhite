import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
})

export interface SessionFacts {
  name?: string
  personType?: 'PF' | 'PJ'
  business?: string
  contact?: string
}

export interface SessionState {
  stage: 'S' | 'P' | 'I' | 'N'
  asked: Set<string>
  answered: Set<string>
  facts: SessionFacts
  lastUserTs: number
}

export class SessionStateManager {
  constructor(private sessionId: string) {}

  // Lock operations
  async acquireLock(ttlMs: number = 10000): Promise<boolean> {
    const result = await redis.set(`sess:${this.sessionId}:lock`, '1', {
      px: ttlMs,
      nx: true
    })
    return result === 'OK'
  }

  async releaseLock(): Promise<void> {
    await redis.del(`sess:${this.sessionId}:lock`)
  }

  // Batch operations
  async setBatchUntil(timestampMs: number): Promise<void> {
    await redis.set(`sess:${this.sessionId}:batch_until`, timestampMs.toString())
  }

  async getBatchUntil(): Promise<number | null> {
    const result = await redis.get(`sess:${this.sessionId}:batch_until`)
    return result ? parseInt(result) : null
  }

  async clearBatchUntil(): Promise<void> {
    await redis.del(`sess:${this.sessionId}:batch_until`)
  }

  async addPendingMessage(messagePayload: any): Promise<void> {
    // Upstash client handles serialization automatically - store object directly
    await redis.lpush(`sess:${this.sessionId}:pending_msgs`, messagePayload)
  }

  async drainPendingMessages(): Promise<any[]> {
    const messages = await redis.lrange(`sess:${this.sessionId}:pending_msgs`, 0, -1)
    if (messages.length > 0) {
      await redis.del(`sess:${this.sessionId}:pending_msgs`)
    }
    // Upstash client returns objects directly - no JSON parsing needed
    return messages.reverse() // chronological order (LPUSH stores newest first, reverse to get chronological)
  }

  async getPendingMessageCount(): Promise<number> {
    return await redis.llen(`sess:${this.sessionId}:pending_msgs`)
  }

  // SPIN state operations  
  async getStage(): Promise<'S' | 'P' | 'I' | 'N'> {
    const stage = await redis.get(`sess:${this.sessionId}:stage`)
    return (stage as 'S' | 'P' | 'I' | 'N') || 'S'
  }

  async setStage(stage: 'S' | 'P' | 'I' | 'N'): Promise<void> {
    await redis.set(`sess:${this.sessionId}:stage`, stage)
  }

  async addAsked(slot: string): Promise<void> {
    await redis.sadd(`sess:${this.sessionId}:asked`, slot)
  }

  async addAnswered(slot: string): Promise<void> {
    await redis.sadd(`sess:${this.sessionId}:answered`, slot)
  }

  async getAsked(): Promise<Set<string>> {
    const asked = await redis.smembers(`sess:${this.sessionId}:asked`)
    return new Set(asked)
  }

  async getAnswered(): Promise<Set<string>> {
    const answered = await redis.smembers(`sess:${this.sessionId}:answered`)
    return new Set(answered)
  }

  // Facts operations (canonicalized data)
  async setFact(key: keyof SessionFacts, value: string): Promise<void> {
    await redis.hset(`sess:${this.sessionId}:facts`, { [key]: value })
  }

  async getFacts(): Promise<SessionFacts> {
    const facts = await redis.hgetall(`sess:${this.sessionId}:facts`)
    return {
      name: facts.name || undefined,
      personType: (facts.personType as 'PF' | 'PJ') || undefined,
      business: facts.business || undefined,
      contact: facts.contact || undefined
    }
  }

  async setLastUserTimestamp(ts: number): Promise<void> {
    await redis.set(`sess:${this.sessionId}:last_user_ts`, ts.toString())
  }

  async getLastUserTimestamp(): Promise<number | null> {
    const result = await redis.get(`sess:${this.sessionId}:last_user_ts`)
    return result ? parseInt(result) : null
  }

  // Complete state getter
  async getState(): Promise<SessionState> {
    const [stage, asked, answered, facts, lastUserTs] = await Promise.all([
      this.getStage(),
      this.getAsked(),
      this.getAnswered(),
      this.getFacts(),
      this.getLastUserTimestamp()
    ])

    return {
      stage,
      asked,
      answered,
      facts,
      lastUserTs: lastUserTs || 0
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    const keys = [
      `sess:${this.sessionId}:lock`,
      `sess:${this.sessionId}:batch_until`, 
      `sess:${this.sessionId}:pending_msgs`,
      `sess:${this.sessionId}:stage`,
      `sess:${this.sessionId}:asked`,
      `sess:${this.sessionId}:answered`,
      `sess:${this.sessionId}:facts`,
      `sess:${this.sessionId}:last_user_ts`
    ]
    await redis.del(...keys)
  }
}

// Dedupe helper
export async function isDuplicateMessage(providerMessageId: string): Promise<boolean> {
  const exists = await redis.get(`dedupe:${providerMessageId}`)
  if (!exists) {
    await redis.set(`dedupe:${providerMessageId}`, '1', { ex: 600 }) // 10 min TTL
    return false
  }
  return true
}

// Helper to check Redis connection
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error('Redis connection failed:', error)
    return false
  }
}