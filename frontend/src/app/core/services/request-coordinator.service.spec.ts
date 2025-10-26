import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { RequestCoordinatorService, RequestConfig, RequestState } from './request-coordinator.service';
import { of, throwError, delay, Observable } from 'rxjs';

describe('RequestCoordinatorService - Request Optimization', () => {
  let service: RequestCoordinatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RequestCoordinatorService],
    });
    service = TestBed.inject(RequestCoordinatorService);
  });

  describe('Initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with zero global loading count', (done) => {
      service.globalLoading$.subscribe((count) => {
        expect(count).toBe(0);
        done();
      });
    });

    it('should return false for isAnyLoading initially', () => {
      expect(service.isAnyLoading()).toBe(false);
    });
  });

  describe('Basic Request Execution', () => {
    it('should execute a simple request', (done) => {
      const mockData = { test: 'data' };
      const requestFn = () => of(mockData);

      service.execute('test-key', requestFn).subscribe((data) => {
        expect(data).toEqual(mockData);
        done();
      });
    });

    it('should update loading state during request', fakeAsync(() => {
      const loadingStates: RequestState[] = [];
      const requestFn = () => of({ data: 'test' }).pipe(delay(100));

      service.getLoadingState$('test-key').subscribe((state) => {
        loadingStates.push({ ...state });
      });

      service.execute('test-key', requestFn).subscribe();

      tick(50); // Mid-request
      expect(loadingStates.some((s) => s.loading === true)).toBe(true);

      tick(100); // After completion
      expect(loadingStates[loadingStates.length - 1].loading).toBe(false);
    }));

    it('should increment global loading counter', fakeAsync(() => {
      const globalCounts: number[] = [];
      service.globalLoading$.subscribe((count) => globalCounts.push(count));

      const requestFn = () => of({ data: 'test' }).pipe(delay(50));

      service.execute('test-1', requestFn).subscribe();
      service.execute('test-2', requestFn).subscribe();

      tick(10);
      expect(globalCounts).toContain(2); // Two requests loading

      tick(100);
      expect(globalCounts[globalCounts.length - 1]).toBe(0); // All complete
    }));
  });

  describe('Request Deduplication', () => {
    it('should deduplicate identical concurrent requests', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: 'test' }).pipe(delay(50));
      };

      const config: RequestConfig = { deduplication: true };

      // Make 3 identical requests concurrently
      service.execute('same-key', requestFn, config).subscribe();
      service.execute('same-key', requestFn, config).subscribe();
      service.execute('same-key', requestFn, config).subscribe();

      tick(100);

      // Should only execute once due to deduplication
      expect(executionCount).toBe(1);
    }));

    it('should NOT deduplicate when deduplication disabled', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: 'test' }).pipe(delay(50));
      };

      const config: RequestConfig = { deduplication: false };

      service.execute('same-key', requestFn, config).subscribe();
      service.execute('same-key', requestFn, config).subscribe();
      service.execute('same-key', requestFn, config).subscribe();

      tick(100);

      // Should execute 3 times
      expect(executionCount).toBe(3);
    }));

    it('should allow new request after first completes', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: 'test' }).pipe(delay(50));
      };

      const config: RequestConfig = { deduplication: true };

      service.execute('same-key', requestFn, config).subscribe();
      tick(100); // Wait for completion

      service.execute('same-key', requestFn, config).subscribe();
      tick(100);

      // Should execute twice (sequential, not concurrent)
      expect(executionCount).toBe(2);
    }));

    it('should deduplicate per key (different keys execute separately)', fakeAsync(() => {
      let count1 = 0;
      let count2 = 0;

      const requestFn1 = () => {
        count1++;
        return of({ data: 'test1' }).pipe(delay(50));
      };

      const requestFn2 = () => {
        count2++;
        return of({ data: 'test2' }).pipe(delay(50));
      };

      const config: RequestConfig = { deduplication: true };

      service.execute('key-1', requestFn1, config).subscribe();
      service.execute('key-1', requestFn1, config).subscribe();
      service.execute('key-2', requestFn2, config).subscribe();
      service.execute('key-2', requestFn2, config).subscribe();

      tick(100);

      // Each key should execute once
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    }));
  });

  describe('Response Caching', () => {
    it('should cache responses when cacheTime > 0', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: 'cached' }).pipe(delay(10));
      };

      const config: RequestConfig = { cacheTime: 5000 };

      // First request - should execute
      service.execute('cache-key', requestFn, config).subscribe();
      tick(20);
      expect(executionCount).toBe(1);

      // Second request within cache time - should return cached
      service.execute('cache-key', requestFn, config).subscribe();
      tick(20);
      expect(executionCount).toBe(1); // Still 1, used cache
    }));

    it('should NOT cache when cacheTime = 0', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: 'no-cache' }).pipe(delay(10));
      };

      const config: RequestConfig = { cacheTime: 0 };

      service.execute('no-cache-key', requestFn, config).subscribe();
      tick(20);

      service.execute('no-cache-key', requestFn, config).subscribe();
      tick(20);

      expect(executionCount).toBe(2); // No caching
    }));

    it('should expire cache after cacheTime', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: 'expire-test' }).pipe(delay(10));
      };

      const config: RequestConfig = { cacheTime: 100 };

      service.execute('expire-key', requestFn, config).subscribe();
      tick(20);
      expect(executionCount).toBe(1);

      // Wait for cache to expire
      tick(150);

      service.execute('expire-key', requestFn, config).subscribe();
      tick(20);
      expect(executionCount).toBe(2); // Cache expired, executed again
    }));

    it('should return cached data immediately', fakeAsync(() => {
      const requestFn = () => of({ data: 'immediate' }).pipe(delay(100));
      const config: RequestConfig = { cacheTime: 5000 };

      // First request
      let firstResult: any;
      service.execute('immediate-key', requestFn, config).subscribe((data) => {
        firstResult = data;
      });
      tick(150);

      // Second request - should return immediately from cache
      let secondResult: any;
      let receivedImmediately = false;

      service.execute('immediate-key', requestFn, config).subscribe((data) => {
        secondResult = data;
        receivedImmediately = true;
      });

      // No tick needed - should be synchronous from cache
      expect(receivedImmediately).toBe(true);
      expect(secondResult).toEqual(firstResult);
    }));

    it('should cache per unique key', fakeAsync(() => {
      let count1 = 0;
      let count2 = 0;

      const requestFn1 = () => {
        count1++;
        return of({ data: 'cache1' }).pipe(delay(10));
      };

      const requestFn2 = () => {
        count2++;
        return of({ data: 'cache2' }).pipe(delay(10));
      };

      const config: RequestConfig = { cacheTime: 5000 };

      service.execute('cache-key-1', requestFn1, config).subscribe();
      tick(20);
      service.execute('cache-key-1', requestFn1, config).subscribe();
      tick(20);

      service.execute('cache-key-2', requestFn2, config).subscribe();
      tick(20);
      service.execute('cache-key-2', requestFn2, config).subscribe();
      tick(20);

      expect(count1).toBe(1); // Cached
      expect(count2).toBe(1); // Cached separately
    }));

    it('should allow manual cache clearing', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: 'clear-test' }).pipe(delay(10));
      };

      const config: RequestConfig = { cacheTime: 5000 };

      service.execute('clear-key', requestFn, config).subscribe();
      tick(20);
      expect(executionCount).toBe(1);

      // Clear cache
      service.clearCache('clear-key');

      service.execute('clear-key', requestFn, config).subscribe();
      tick(20);
      expect(executionCount).toBe(2); // Cache cleared, executed again
    }));

    it('should clear all caches when no key specified', fakeAsync(() => {
      let count1 = 0;
      let count2 = 0;

      const requestFn1 = () => {
        count1++;
        return of({ data: '1' }).pipe(delay(10));
      };

      const requestFn2 = () => {
        count2++;
        return of({ data: '2' }).pipe(delay(10));
      };

      const config: RequestConfig = { cacheTime: 5000 };

      service.execute('key1', requestFn1, config).subscribe();
      service.execute('key2', requestFn2, config).subscribe();
      tick(20);

      service.clearCache(); // Clear all

      service.execute('key1', requestFn1, config).subscribe();
      service.execute('key2', requestFn2, config).subscribe();
      tick(20);

      expect(count1).toBe(2);
      expect(count2).toBe(2);
    }));
  });

  describe('Retry Logic', () => {
    it('should retry failed requests with exponential backoff', fakeAsync(() => {
      let attemptCount = 0;
      const requestFn = () => {
        attemptCount++;
        if (attemptCount < 3) {
          return throwError(() => new Error('Transient error'));
        }
        return of({ data: 'success-after-retries' });
      };

      const config: RequestConfig = {
        retryAttempts: 2,
        retryDelay: 1000,
      };

      let result: any;
      service.execute('retry-key', requestFn, config).subscribe((data) => {
        result = data;
      });

      // Initial attempt fails
      tick(10);
      expect(attemptCount).toBe(1);

      // First retry after 1s
      tick(1000);
      expect(attemptCount).toBe(2);

      // Second retry after 2s (exponential backoff)
      tick(2000);
      expect(attemptCount).toBe(3);

      // Should succeed on third attempt
      tick(10);
      expect(result).toEqual({ data: 'success-after-retries' });
    }));

    it('should respect retryAttempts configuration', fakeAsync(() => {
      let attemptCount = 0;
      const requestFn = () => {
        attemptCount++;
        return throwError(() => new Error('Always fails'));
      };

      const config: RequestConfig = {
        retryAttempts: 3,
        retryDelay: 100,
      };

      service.execute('retry-limit-key', requestFn, config).subscribe({
        error: () => {},
      });

      tick(10000); // Wait for all retries

      // Initial + 3 retries = 4 total attempts
      expect(attemptCount).toBe(4);
    }));

    it('should use exponential backoff for retries', fakeAsync(() => {
      let attemptTimes: number[] = [];
      const startTime = Date.now();

      const requestFn = () => {
        attemptTimes.push(Date.now() - startTime);
        return throwError(() => new Error('Fail'));
      };

      const config: RequestConfig = {
        retryAttempts: 2,
        retryDelay: 1000,
      };

      service.execute('backoff-key', requestFn, config).subscribe({
        error: () => {},
      });

      tick(10); // Initial attempt
      tick(1000); // First retry (1s delay)
      tick(2000); // Second retry (2s delay - exponential)
      tick(10);

      expect(attemptTimes.length).toBe(3);
      // Verify exponential backoff timing
      const delay1 = attemptTimes[1] - attemptTimes[0];
      const delay2 = attemptTimes[2] - attemptTimes[1];
      expect(delay2).toBeGreaterThan(delay1); // Exponential increase
    }));

    it('should update error state after all retries exhausted', fakeAsync(() => {
      const errorMessage = 'Final error';
      const requestFn = () => throwError(() => new Error(errorMessage));

      const config: RequestConfig = {
        retryAttempts: 1,
        retryDelay: 100,
      };

      let capturedState: RequestState | undefined;
      service.getLoadingState$('error-state-key').subscribe((state) => {
        capturedState = state;
      });

      service.execute('error-state-key', requestFn, config).subscribe({
        error: () => {},
      });

      tick(10000);

      expect(capturedState?.error).toBeTruthy();
      expect(capturedState?.loading).toBe(false);
      expect(capturedState?.lastUpdated).toBeTruthy();
    }));
  });

  describe('Loading State Management', () => {
    it('should provide per-request loading state', fakeAsync(() => {
      const states: RequestState[] = [];
      service.getLoadingState$('state-key').subscribe((state) => {
        states.push({ ...state });
      });

      const requestFn = () => of({ data: 'test' }).pipe(delay(50));

      service.execute('state-key', requestFn).subscribe();

      tick(10); // During request
      tick(60); // After completion

      const loadingState = states.find((s) => s.loading === true);
      const completedState = states[states.length - 1];

      expect(loadingState).toBeTruthy();
      expect(completedState.loading).toBe(false);
      expect(completedState.lastUpdated).toBeTruthy();
    }));

    it('should track global loading state', fakeAsync(() => {
      const isLoadingValues: boolean[] = [];

      service.getGlobalLoading$().subscribe((isLoading) => {
        isLoadingValues.push(isLoading);
      });

      const requestFn = () => of({ data: 'test' }).pipe(delay(50));

      service.execute('global-1', requestFn).subscribe();
      tick(10);

      service.execute('global-2', requestFn).subscribe();
      tick(100);

      expect(isLoadingValues).toContain(true); // Was loading
      expect(isLoadingValues[isLoadingValues.length - 1]).toBe(false); // All complete
    }));

    it('should report isAnyLoading correctly', fakeAsync(() => {
      expect(service.isAnyLoading()).toBe(false);

      const requestFn = () => of({ data: 'test' }).pipe(delay(50));

      service.execute('loading-check', requestFn).subscribe();
      tick(10);

      expect(service.isAnyLoading()).toBe(true);

      tick(100);
      expect(service.isAnyLoading()).toBe(false);
    }));
  });

  describe('Request Cancellation', () => {
    it('should cancel all active requests', fakeAsync(() => {
      const requestFn1 = () => of({ data: '1' }).pipe(delay(1000));
      const requestFn2 = () => of({ data: '2' }).pipe(delay(1000));

      service.execute('cancel-1', requestFn1).subscribe();
      service.execute('cancel-2', requestFn2).subscribe();

      tick(100);
      expect(service.isAnyLoading()).toBe(true);

      service.cancelAll();

      expect(service.isAnyLoading()).toBe(false);
    }));

    it('should reset loading states after cancellation', fakeAsync(() => {
      const requestFn = () => of({ data: 'test' }).pipe(delay(1000));

      let loadingState: RequestState | undefined;
      service.getLoadingState$('cancel-state').subscribe((state) => {
        loadingState = state;
      });

      service.execute('cancel-state', requestFn).subscribe();
      tick(100);

      service.cancelAll();

      expect(loadingState?.loading).toBe(false);
      expect(loadingState?.error).toBeNull();
    }));
  });

  describe('Error Handling', () => {
    it('should propagate errors to subscriber', (done) => {
      const errorMessage = 'Test error';
      const requestFn = () => throwError(() => new Error(errorMessage));

      const config: RequestConfig = { retryAttempts: 0 };

      service.execute('error-key', requestFn, config).subscribe({
        error: (err) => {
          expect(err.message).toBe(errorMessage);
          done();
        },
      });
    });

    it('should update error state on failure', fakeAsync(() => {
      const error = new Error('Request failed');
      const requestFn = () => throwError(() => error);

      const config: RequestConfig = { retryAttempts: 0 };

      let errorState: RequestState | undefined;
      service.getLoadingState$('error-tracking').subscribe((state) => {
        errorState = state;
      });

      service.execute('error-tracking', requestFn, config).subscribe({
        error: () => {},
      });

      tick(100);

      expect(errorState?.error).toBe(error);
      expect(errorState?.loading).toBe(false);
    }));

    it('should clear error on subsequent successful request', fakeAsync(() => {
      let callCount = 0;
      const requestFn = () => {
        callCount++;
        if (callCount === 1) {
          return throwError(() => new Error('First fails'));
        }
        return of({ data: 'Second succeeds' });
      };

      const config: RequestConfig = { retryAttempts: 0 };

      let finalState: RequestState | undefined;
      service.getLoadingState$('error-clear').subscribe((state) => {
        finalState = state;
      });

      // First request fails
      service.execute('error-clear', requestFn, config).subscribe({
        error: () => {},
      });
      tick(100);

      expect(finalState?.error).toBeTruthy();

      // Second request succeeds
      service.execute('error-clear', requestFn, config).subscribe();
      tick(100);

      expect(finalState?.error).toBeNull();
    }));
  });

  describe('Edge Cases', () => {
    it('should handle rapid sequential requests', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        return of({ data: executionCount }).pipe(delay(10));
      };

      const results: any[] = [];

      for (let i = 0; i < 10; i++) {
        service.execute(`rapid-${i}`, requestFn).subscribe((data) => {
          results.push(data);
        });
      }

      tick(100);

      expect(results.length).toBe(10);
      expect(executionCount).toBe(10);
    }));

    it('should handle large cache keys', fakeAsync(() => {
      const longKey = 'a'.repeat(10000);
      const requestFn = () => of({ data: 'test' }).pipe(delay(10));

      const config: RequestConfig = { cacheTime: 5000 };

      service.execute(longKey, requestFn, config).subscribe();
      tick(20);

      service.execute(longKey, requestFn, config).subscribe();
      tick(20);

      // Should handle large keys without errors
      expect(true).toBe(true);
    }));

    it('should handle empty responses', fakeAsync(() => {
      const requestFn = () => of(null).pipe(delay(10));

      let result: any = 'not-set';
      service.execute('empty-key', requestFn).subscribe((data) => {
        result = data;
      });

      tick(20);

      expect(result).toBeNull();
    }));
  });

  describe('Integration Scenarios', () => {
    it('should combine caching, deduplication, and retry', fakeAsync(() => {
      let executionCount = 0;
      const requestFn = () => {
        executionCount++;
        if (executionCount < 2) {
          return throwError(() => new Error('Fail first time'));
        }
        return of({ data: 'success' }).pipe(delay(10));
      };

      const config: RequestConfig = {
        cacheTime: 5000,
        deduplication: true,
        retryAttempts: 2,
        retryDelay: 100,
      };

      // First request - will retry and succeed
      service.execute('combo-key', requestFn, config).subscribe();
      tick(1000);
      expect(executionCount).toBe(2); // Initial + 1 retry

      // Second request - should use cache
      service.execute('combo-key', requestFn, config).subscribe();
      tick(100);
      expect(executionCount).toBe(2); // No additional execution, used cache
    }));
  });
});
