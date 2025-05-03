// src/utils/retryWithBackoff.ts
// src/lib/retry.ts

/**
 * Retry a function with exponential backoff
 */
export function retryWithBackoff<T>(
    fn: (attempt: number) => Promise<T>,
    options: {
      maxRetries: number;
      initialDelay: number;
      maxDelay: number;
      retryableErrors?: number[] | ((error: unknown) => boolean);
    }
  ): (fnToCall: () => Promise<T>) => Promise<T> {
    const { maxRetries, initialDelay, maxDelay, retryableErrors } = options;
  
    return async (fnToCall: () => Promise<T>): Promise<T> => {
      let attempt = 0;
      
      while (true) {
        try {
          return await fn(attempt);
        } catch (error: unknown) {
          attempt++;
          
          // Check if we should retry
          const shouldRetry = 
            attempt <= maxRetries && 
            (
              typeof retryableErrors === 'function' 
                ? retryableErrors(error) 
                : Array.isArray(retryableErrors) 
                  ? isHttpError(error) && retryableErrors.includes(getErrorStatusCode(error)) 
                  : true
            );
            
          // Helper functions for type-safe error handling
          function isHttpError(err: unknown): err is {status?: number; statusCode?: number} {
            return typeof err === 'object' && err !== null && 
                   ('status' in err || 'statusCode' in err);
          }
          
          function getErrorStatusCode(err: {status?: number; statusCode?: number}): number {
            return err.status || err.statusCode || 0;
          }
          
          if (!shouldRetry) {
            throw error;
          }
          
          // Calculate backoff delay with jitter
          const delay = Math.min(
            maxDelay,
            initialDelay * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.2)
          );
          
          console.log(`Retrying after ${delay}ms (attempt ${attempt} of ${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
  }