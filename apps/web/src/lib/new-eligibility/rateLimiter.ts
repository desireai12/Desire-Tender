/**
 * Local Process Rate Limiter for Gemini API Calls
 *
 * NOTE: This is a process-local rate limiter intended for concurrency control within
 * a single worker process/instance. Distributed rate limiting across multiple serverless
 * or container instances should be configured at the Inngest concurrency / throttle level.
 */

export class LocalGeminiLimiter {
  private activeRequests = 0;
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  async executeWithRateLimit<T>(fn: () => Promise<T>, estimatedTokens = 1000): Promise<T> {
    while (this.activeRequests >= this.maxConcurrency) {
      await new Promise(r => setTimeout(r, 100));
    }
    this.activeRequests++;
    try {
      return await fn();
    } finally {
      this.activeRequests--;
    }
  }
}

export const localGeminiLimiter = new LocalGeminiLimiter(5);
