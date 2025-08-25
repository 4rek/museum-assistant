interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  identifier: string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  error?: string
}

export class RateLimiter {
  private redisUrl: string
  private redisToken: string

  constructor() {
    this.redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL') || ''
    this.redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || ''

    if (!this.redisUrl || !this.redisToken) {
      throw new Error('Upstash Redis configuration missing')
    }
  }

  async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    try {
      const now = Date.now()
      const windowStart = now - config.windowMs
      const key = `rate_limit:${config.identifier}`

      // Use Redis sorted set for sliding window rate limiting
      // Add current timestamp as score and value
      const pipeline = [
        // Remove old entries outside the window
        ['ZREMRANGEBYSCORE', key, '-inf', windowStart],
        // Add current request
        ['ZADD', key, now, `${now}_${Math.random()}`],
        // Count current requests in window
        ['ZCARD', key],
        // Set expiration for cleanup
        ['EXPIRE', key, Math.ceil(config.windowMs / 1000)]
      ]

      const response = await fetch(`${this.redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      })

      if (!response.ok) {
        throw new Error(`Redis request failed: ${response.status}`)
      }

      const results = await response.json()
      
      // Get the count from ZCARD result
      const currentCount = results[2]?.result || 0
      const remaining = Math.max(0, config.maxRequests - currentCount)
      const reset = now + config.windowMs

      if (currentCount > config.maxRequests) {
        return {
          success: false,
          remaining: 0,
          reset,
          error: 'Rate limit exceeded'
        }
      }

      return {
        success: true,
        remaining,
        reset
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Fail open - allow request if rate limiting is broken
      return {
        success: true,
        remaining: config.maxRequests,
        reset: Date.now() + config.windowMs
      }
    }
  }

  async getRemainingRequests(identifier: string, config: RateLimitConfig): Promise<number> {
    try {
      const now = Date.now()
      const windowStart = now - config.windowMs
      const key = `rate_limit:${identifier}`

      const response = await fetch(`${this.redisUrl}/zcount/${key}/${windowStart}/+inf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.redisToken}`,
        },
      })

      if (!response.ok) {
        return config.maxRequests
      }

      const result = await response.json()
      const currentCount = result.result || 0
      
      return Math.max(0, config.maxRequests - currentCount)
    } catch (error) {
      console.error('Failed to get remaining requests:', error)
      return config.maxRequests
    }
  }
}

// Default rate limit configurations
export const DEFAULT_RATE_LIMITS = {
  CHAT: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  ANALYSIS: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  }
}

// Helper function to create rate limit response headers
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
    'Retry-After': result.success ? '0' : Math.ceil((result.reset - Date.now()) / 1000).toString(),
  }
}