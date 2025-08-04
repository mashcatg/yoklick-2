class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(operation: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  recordCacheHit() {
    this.cacheHits++;
  }

  recordCacheMiss() {
    this.cacheMisses++;
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [operation, times] of this.metrics) {
      result[operation] = {
        average: this.getAverageTime(operation),
        count: times.length,
        min: Math.min(...times),
        max: Math.max(...times)
      };
    }
    
    result.cache = {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.getCacheHitRate()
    };
    
    return result;
  }

  logMetrics() {
    const metrics = this.getMetrics();
    console.log('Performance Metrics:', metrics);
  }

  reset() {
    this.metrics.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance(); 