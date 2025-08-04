interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: any) => boolean;
}

const defaultConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, 5xx server errors, and rate limits
    return (
      error.name === 'NetworkError' ||
      error.message?.includes('network') ||
      error.message?.includes('fetch') ||
      (error.status >= 500 && error.status < 600) ||
      error.status === 429
    );
  }
};

export class ApiRetry {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private delay(attempt: number): Promise<void> {
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelay
    );
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (!this.config.shouldRetry!(error)) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === this.config.maxAttempts) {
          throw error;
        }

        // Log retry attempt (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `API retry attempt ${attempt}/${this.config.maxAttempts} for ${context || 'operation'}:`,
            error.message
          );
        }

        // Wait before retrying
        await this.delay(attempt - 1);
      }
    }

    throw lastError;
  }
}

// Pre-configured retry instances for different use cases
export const criticalRetry = new ApiRetry({
  maxAttempts: 5,
  baseDelay: 2000,
  shouldRetry: (error: any) => {
    // Retry on most errors for critical operations
    return !error.status || error.status >= 400;
  }
});

export const standardRetry = new ApiRetry({
  maxAttempts: 3,
  baseDelay: 1000,
  shouldRetry: (error: any) => {
    // Standard retry for normal operations
    return (
      error.name === 'NetworkError' ||
      error.message?.includes('network') ||
      (error.status >= 500 && error.status < 600) ||
      error.status === 429
    );
  }
});

export const quickRetry = new ApiRetry({
  maxAttempts: 2,
  baseDelay: 500,
  shouldRetry: (error: any) => {
    // Quick retry for fast operations
    return error.status >= 500 && error.status < 600;
  }
});

// Utility function for common fetch operations
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryInstance: ApiRetry = standardRetry
): Promise<Response> {
  return retryInstance.execute(
    async () => {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }
      
      return response;
    },
    `fetch:${url}`
  );
}

// Utility for JSON API calls
export async function apiCallWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryInstance: ApiRetry = standardRetry
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }, retryInstance);

  return response.json();
} 