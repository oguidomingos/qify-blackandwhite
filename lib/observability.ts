import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
})

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log entry interface
export interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  correlationId: string
  sessionId?: string
  orgId?: string
  instanceName?: string
  component: string
  metadata?: any
  duration?: number
  error?: any
}

// Performance metrics interface
export interface PerformanceMetric {
  timestamp: number
  correlationId: string
  operation: string
  duration: number
  success: boolean
  metadata?: any
}

// System metrics interface
export interface SystemMetric {
  timestamp: number
  metric: string
  value: number
  unit: string
  tags?: Record<string, string>
}

export class ObservabilityManager {
  private static instance: ObservabilityManager
  private logBuffer: LogEntry[] = []
  private metricsBuffer: PerformanceMetric[] = []
  private readonly bufferSize = 100
  private flushInterval: NodeJS.Timeout | null = null

  static getInstance(): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager()
    }
    return ObservabilityManager.instance
  }

  constructor() {
    // Start periodic flush of buffers
    this.flushInterval = setInterval(() => {
      this.flushBuffers()
    }, 30000) // Flush every 30 seconds
  }

  // Structured logging with correlation ID
  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: Date.now()
    }

    // Add to buffer
    this.logBuffer.push(logEntry)

    // Also log to console for immediate debugging
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
    const levelName = levelNames[entry.level] || 'UNKNOWN'
    
    console.log(`[${entry.correlationId}] ${levelName} ${entry.component}: ${entry.message}`, {
      ...entry.metadata,
      duration: entry.duration,
      sessionId: entry.sessionId,
      orgId: entry.orgId,
      instanceName: entry.instanceName
    })

    // Flush immediately for errors and above
    if (entry.level >= LogLevel.ERROR) {
      await this.flushBuffers()
    }

    // Auto-flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      await this.flushBuffers()
    }
  }

  // Performance tracking
  async trackPerformance(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const perfMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    }

    this.metricsBuffer.push(perfMetric)

    // Store performance metrics in Redis with TTL
    await redis.zadd(
      `metrics:performance:${perfMetric.operation}`,
      {
        score: perfMetric.timestamp,
        member: JSON.stringify(perfMetric)
      }
    )
    await redis.expire(`metrics:performance:${perfMetric.operation}`, 604800) // 7 days TTL

    // Auto-flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      await this.flushBuffers()
    }
  }

  // System metrics tracking
  async trackSystemMetric(metric: SystemMetric): Promise<void> {
    const key = `metrics:system:${metric.metric}`
    
    await redis.zadd(key, {
      score: metric.timestamp,
      member: JSON.stringify({
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags
      })
    })
    await redis.expire(key, 2592000) // 30 days TTL
  }

  // Session-specific metrics
  async trackSessionMetric(sessionId: string, metric: string, value: number): Promise<void> {
    const key = `session:${sessionId}:metrics`
    await redis.hset(key, { [metric]: value })
    await redis.expire(key, 3600) // 1 hour TTL
  }

  // Flush buffers to Redis
  private async flushBuffers(): Promise<void> {
    try {
      // Flush logs
      if (this.logBuffer.length > 0) {
        const logs = [...this.logBuffer]
        this.logBuffer = []

        // Store in Redis by day for easy querying
        const today = new Date().toISOString().split('T')[0]
        const logKey = `logs:${today}`

        const pipeline = redis.pipeline()
        
        logs.forEach(log => {
          pipeline.zadd(logKey, {
            score: log.timestamp,
            member: JSON.stringify(log)
          })
        })
        
        pipeline.expire(logKey, 2592000) // 30 days TTL
        await pipeline.exec()
      }

      // Flush performance metrics
      if (this.metricsBuffer.length > 0) {
        const metrics = [...this.metricsBuffer]
        this.metricsBuffer = []

        // Already stored individually, just clear buffer
      }

    } catch (error) {
      console.error('Error flushing observability buffers:', error)
    }
  }

  // Query functions
  async getLogsByCorrelationId(correlationId: string, hours: number = 24): Promise<LogEntry[]> {
    const endTime = Date.now()
    const startTime = endTime - (hours * 60 * 60 * 1000)
    
    // Search across multiple days if needed
    const days = Math.ceil(hours / 24)
    const allLogs: LogEntry[] = []
    
    for (let i = 0; i < days; i++) {
      const date = new Date(endTime - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      const logKey = `logs:${date}`
      
      const logs = await redis.zrangebyscore(logKey, startTime, endTime)
      
      for (const logStr of logs) {
        try {
          const log = JSON.parse(logStr) as LogEntry
          if (log.correlationId === correlationId) {
            allLogs.push(log)
          }
        } catch {
          continue
        }
      }
    }
    
    return allLogs.sort((a, b) => a.timestamp - b.timestamp)
  }

  async getSessionLogs(sessionId: string, hours: number = 24): Promise<LogEntry[]> {
    const endTime = Date.now()
    const startTime = endTime - (hours * 60 * 60 * 1000)
    
    const days = Math.ceil(hours / 24)
    const allLogs: LogEntry[] = []
    
    for (let i = 0; i < days; i++) {
      const date = new Date(endTime - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      const logKey = `logs:${date}`
      
      const logs = await redis.zrangebyscore(logKey, startTime, endTime)
      
      for (const logStr of logs) {
        try {
          const log = JSON.parse(logStr) as LogEntry
          if (log.sessionId === sessionId) {
            allLogs.push(log)
          }
        } catch {
          continue
        }
      }
    }
    
    return allLogs.sort((a, b) => a.timestamp - b.timestamp)
  }

  async getPerformanceMetrics(operation: string, hours: number = 24): Promise<PerformanceMetric[]> {
    const endTime = Date.now()
    const startTime = endTime - (hours * 60 * 60 * 1000)
    
    const metrics = await redis.zrangebyscore(
      `metrics:performance:${operation}`,
      startTime,
      endTime
    )
    
    return metrics.map(metricStr => {
      try {
        return JSON.parse(metricStr) as PerformanceMetric
      } catch {
        return null
      }
    }).filter(Boolean) as PerformanceMetric[]
  }

  async getSystemMetrics(metric: string, hours: number = 24): Promise<SystemMetric[]> {
    const endTime = Date.now()
    const startTime = endTime - (hours * 60 * 60 * 1000)
    
    const data = await redis.zrangebyscore(
      `metrics:system:${metric}`,
      startTime,
      endTime
    )
    
    return data.map(dataStr => {
      try {
        const parsed = JSON.parse(dataStr)
        return {
          timestamp: parsed.timestamp || Date.now(),
          metric,
          value: parsed.value,
          unit: parsed.unit,
          tags: parsed.tags
        } as SystemMetric
      } catch {
        return null
      }
    }).filter(Boolean) as SystemMetric[]
  }

  // Health check
  async healthCheck(): Promise<{ success: boolean; latency: number; error?: string }> {
    const start = Date.now()
    
    try {
      await redis.ping()
      const latency = Date.now() - start
      
      return { success: true, latency }
    } catch (error) {
      const latency = Date.now() - start
      return { 
        success: false, 
        latency, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    
    // Final flush
    this.flushBuffers().catch(console.error)
  }
}

// Convenience functions
export const logger = ObservabilityManager.getInstance()

export function createCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export async function logInfo(
  message: string, 
  correlationId: string, 
  component: string,
  metadata?: any
): Promise<void> {
  await logger.log({
    level: LogLevel.INFO,
    message,
    correlationId,
    component,
    metadata
  })
}

export async function logError(
  message: string, 
  correlationId: string, 
  component: string,
  error?: any,
  metadata?: any
): Promise<void> {
  await logger.log({
    level: LogLevel.ERROR,
    message,
    correlationId,
    component,
    error,
    metadata
  })
}

export async function logDebug(
  message: string, 
  correlationId: string, 
  component: string,
  metadata?: any
): Promise<void> {
  await logger.log({
    level: LogLevel.DEBUG,
    message,
    correlationId,
    component,
    metadata
  })
}

// Performance tracking decorator
export function withPerformanceTracking<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const correlationId = createCorrelationId()
    const start = Date.now()
    let success = false
    let error: any = null

    try {
      await logger.log({
        level: LogLevel.DEBUG,
        message: `Starting ${operation}`,
        correlationId,
        component: 'performance-tracker'
      })

      const result = await fn(...args)
      success = true
      return result

    } catch (err) {
      success = false
      error = err
      throw err

    } finally {
      const duration = Date.now() - start

      await logger.trackPerformance({
        correlationId,
        operation,
        duration,
        success,
        metadata: error ? { error: error.message } : undefined
      })

      await logger.log({
        level: success ? LogLevel.DEBUG : LogLevel.ERROR,
        message: `Completed ${operation} in ${duration}ms`,
        correlationId,
        component: 'performance-tracker',
        duration,
        error: error
      })
    }
  }
}