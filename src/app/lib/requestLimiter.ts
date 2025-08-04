// Request limiter to prevent excessive API calls
class RequestLimiter {
  private requestQueue: Map<string, Promise<any>> = new Map();
  private maxConcurrentRequests = 10;
  private requestTimeout = 5000; // 5 seconds

  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    timeoutMs: number = this.requestTimeout
  ): Promise<T> {
    // Check if request is already in progress
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key) as Promise<T>;
    }

    // Check if we have too many concurrent requests
    if (this.requestQueue.size >= this.maxConcurrentRequests) {
      // Wait for a slot to become available
      await this.waitForSlot();
    }

    // Create the request promise
    const requestPromise = this.executeWithTimeout(requestFn, timeoutMs);
    
    // Add to queue
    this.requestQueue.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Remove from queue when done
      this.requestQueue.delete(key);
    }
  }

  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.requestQueue.size < this.maxConcurrentRequests) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  private async executeWithTimeout<T>(
    requestFn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      requestFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  }

  // Get current queue status
  getQueueStatus() {
    return {
      activeRequests: this.requestQueue.size,
      maxConcurrent: this.maxConcurrentRequests
    };
  }

  // Clear all pending requests
  clearQueue() {
    this.requestQueue.clear();
  }
}

export const requestLimiter = new RequestLimiter(); 