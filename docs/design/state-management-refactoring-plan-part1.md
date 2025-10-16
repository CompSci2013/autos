# State Management Refactoring Plan - Professional Grade

**Created:** 2025-10-16  
**Purpose:** Elevate AUTOS state management to enterprise/professional standards  
**Priority Order:** Loading Coordination → Error Boundaries → Action Pattern

---

## Overview

This refactoring addresses three critical gaps between our current implementation and professional-grade applications:

1. **Loading State Coordination** - Prevent race conditions, duplicate requests
2. **Error Boundary Pattern** - Centralized error handling with retry logic
3. **Centralized Action Pattern** - Observable state changes, audit trail, debugging

**Goal:** Achieve professional-grade state management while maintaining our URL-as-truth architecture.

---

## Phase 1: Loading State Coordination

### Problem Statement

**Current Issues:**
- Multiple components can trigger same API call simultaneously
- No request deduplication
- Loading states not coordinated
- Race conditions possible
- Wasted API calls

**Example Scenario:**
```typescript
// User rapidly clicks between tabs
WorkshopComponent calls: stateService.fetchData()
DiscoverComponent calls: stateService.fetchData()  // 50ms later

// Result: Two identical API calls in flight
```

---

### Solution: Request Cache & Coordination Service

#### Architecture Addition

```
┌─────────────────────────────────────────────────────┐
│         REQUEST COORDINATOR SERVICE                 │
│  (Sits between StateManagement and API)             │
│                                                      │
│  Features:                                          │
│  • Request deduplication (same request = 1 call)    │
│  • Response caching (configurable TTL)              │
│  • Loading state aggregation                        │
│  • Request cancellation on new request              │
│  • Retry logic with exponential backoff             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Implementation Files

**New Service:**
```
frontend/src/app/core/services/
└── request-coordinator.service.ts
```

**Updated Services:**
```
frontend/src/app/core/services/
├── state-management.service.ts      [UPDATED - use coordinator]
└── api.service.ts                   [NO CHANGES]
```

#### Request Coordinator Interface

```typescript
// core/services/request-coordinator.service.ts

import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, throwError, of } from 'rxjs';
import { 
  shareReplay, 
  catchError, 
  finalize, 
  switchMap,
  retryWhen,
  delay,
  take
} from 'rxjs/operators';

export interface RequestConfig {
  cacheTime?: number;        // Cache duration in ms (0 = no cache)
  deduplication?: boolean;   // Deduplicate identical requests
  retryAttempts?: number;    // Number of retry attempts
  retryDelay?: number;       // Initial retry delay (exponential backoff)
}

export interface RequestState {
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class RequestCoordinatorService {
  // Active requests cache (for deduplication)
  private activeRequests = new Map<string, Observable<any>>();
  
  // Response cache (for caching)
  private responseCache = new Map<string, { 
    data: any; 
    timestamp: number;
    config: RequestConfig;
  }>();
  
  // Loading states per request key
  private loadingStates = new Map<string, BehaviorSubject<RequestState>>();
  
  // Global loading state (any request loading)
  private globalLoadingSubject = new BehaviorSubject<number>(0);
  public globalLoading$ = this.globalLoadingSubject.asObservable();

  constructor() {}

  /**
   * Execute a request with coordination
   * 
   * @param key - Unique identifier for this request type
   * @param requestFn - Function that returns the Observable
   * @param config - Configuration for caching, deduplication, retry
   */
  execute<T>(
    key: string,
    requestFn: () => Observable<T>,
    config: RequestConfig = {}
  ): Observable<T> {
    const {
      cacheTime = 0,
      deduplication = true,
      retryAttempts = 2,
      retryDelay = 1000
    } = config;

    // Check cache first
    if (cacheTime > 0) {
      const cached = this.getCachedResponse(key, cacheTime);
      if (cached !== null) {
        console.log(`[RequestCoordinator] Returning cached response for: ${key}`);
        return of(cached);
      }
    }

    // Check for in-flight request (deduplication)
    if (deduplication && this.activeRequests.has(key)) {
      console.log(`[RequestCoordinator] Deduplicating request: ${key}`);
      return this.activeRequests.get(key)!;
    }

    // Create loading state if not exists
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(key, new BehaviorSubject<RequestState>({
        loading: false,
        error: null,
        lastUpdated: null
      }));
    }

    // Start loading
    this.setLoadingState(key, true);
    this.incrementGlobalLoading();

    // Create and execute request
    const request$ = requestFn().pipe(
      // Retry logic with exponential backoff
      retryWhen(errors => 
        errors.pipe(
          switchMap((error, index) => {
            if (index >= retryAttempts) {
              return throwError(() => error);
            }
            const delayTime = retryDelay * Math.pow(2, index);
            console.log(`[RequestCoordinator] Retry ${index + 1}/${retryAttempts} for ${key} after ${delayTime}ms`);
            return of(error).pipe(delay(delayTime));
          }),
          take(retryAttempts)
        )
      ),
      // Share for deduplication
      shareReplay(1),
      // Cleanup
      finalize(() => {
        this.activeRequests.delete(key);
        this.setLoadingState(key, false);
        this.decrementGlobalLoading();
      }),
      // Error handling
      catchError(error => {
        this.setLoadingError(key, error);
        return throwError(() => error);
      })
    );

    // Cache the in-flight request
    if (deduplication) {
      this.activeRequests.set(key, request$);
    }

    // Subscribe to cache the response
    request$.subscribe({
      next: (response) => {
        if (cacheTime > 0) {
          this.cacheResponse(key, response, config);
        }
        this.setLoadingSuccess(key);
      }
    });

    return request$;
  }

  /**
   * Get loading state for a specific request
   */
  getLoadingState$(key: string): Observable<RequestState> {
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(key, new BehaviorSubject<RequestState>({
        loading: false,
        error: null,
        lastUpdated: null
      }));
    }
    return this.loadingStates.get(key)!.asObservable();
  }

  /**
   * Check if any requests are loading
   */
  isAnyLoading(): boolean {
    return this.globalLoadingSubject.value > 0;
  }

  /**
   * Cancel all active requests (e.g., on navigation)
   */
  cancelAll(): void {
    this.activeRequests.clear();
    this.loadingStates.forEach(state => {
      state.next({
        loading: false,
        error: null,
        lastUpdated: state.value.lastUpdated
      });
    });
    this.globalLoadingSubject.next(0);
  }

  /**
   * Clear cache for a specific key or all
   */
  clearCache(key?: string): void {
    if (key) {
      this.responseCache.delete(key);
    } else {
      this.responseCache.clear();
    }
  }

  // ========== PRIVATE METHODS ==========

  private getCachedResponse(key: string, cacheTime: number): any | null {
    const cached = this.responseCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > cacheTime) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private cacheResponse(key: string, data: any, config: RequestConfig): void {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now(),
      config
    });
  }

  private setLoadingState(key: string, loading: boolean): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.next({
        ...state.value,
        loading,
        error: loading ? null : state.value.error
      });
    }
  }

  private setLoadingError(key: string, error: Error): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.next({
        loading: false,
        error,
        lastUpdated: Date.now()
      });
    }
  }

  private setLoadingSuccess(key: string): void {
    const state = this.loadingStates.get(key);
    if (state) {
      state.next({
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
    }
  }

  private incrementGlobalLoading(): void {
    this.globalLoadingSubject.next(this.globalLoadingSubject.value + 1);
  }

  private decrementGlobalLoading(): void {
    const current = this.globalLoadingSubject.value;
    this.globalLoadingSubject.next(Math.max(0, current - 1));
  }
}
```

---

#### Update StateManagementService

```typescript
// core/services/state-management.service.ts

import { RequestCoordinatorService } from './request-coordinator.service';

@Injectable({
  providedIn: 'root',
})
export class StateManagementService implements OnDestroy {
  // ... existing code ...

  constructor(
    private routeState: RouteStateService,
    private router: Router,
    private apiService: ApiService,
    private requestCoordinator: RequestCoordinatorService  // NEW
  ) {
    this.initializeFromUrl();
    this.watchUrlChanges();
  }

  /**
   * Fetch vehicle data with request coordination
   */
  fetchVehicleData(): Observable<VehicleDetailsResponse> {
    const filters = this.getCurrentFilters();
    
    // Build unique cache key from filters
    const cacheKey = this.buildCacheKey('vehicle-details', filters);
    
    // Execute through coordinator
    return this.requestCoordinator.execute(
      cacheKey,
      () => this.apiService.getVehicleDetails(
        this.buildModelsParam(filters.modelCombos),
        filters.page || 1,
        filters.size || 20,
        this.buildFilterParams(filters),
        filters.sort,
        filters.sortDirection
      ),
      {
        cacheTime: 30000,      // Cache for 30 seconds
        deduplication: true,   // Deduplicate identical requests
        retryAttempts: 2,      // Retry twice on failure
        retryDelay: 1000       // Start with 1s delay
      }
    ).pipe(
      tap(response => {
        // Update state on success
        this.updateState({
          results: response.results,
          totalResults: response.total,
          loading: false,
          error: null
        });
      }),
      catchError(error => {
        // Update state on error
        this.updateState({
          results: [],
          totalResults: 0,
          loading: false,
          error: this.formatError(error)
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Get loading state for vehicle data
   */
  getVehicleDataLoadingState$(): Observable<RequestState> {
    const filters = this.getCurrentFilters();
    const cacheKey = this.buildCacheKey('vehicle-details', filters);
    return this.requestCoordinator.getLoadingState$(cacheKey);
  }

  /**
   * Get global loading state (any request loading)
   */
  getGlobalLoadingState$(): Observable<boolean> {
    return this.requestCoordinator.globalLoading$.pipe(
      map(count => count > 0)
    );
  }

  private buildCacheKey(prefix: string, filters: SearchFilters): string {
    // Create deterministic key from filters
    const filterString = JSON.stringify({
      modelCombos: filters.modelCombos?.sort(),
      page: filters.page,
      size: filters.size,
      sort: filters.sort,
      sortDirection: filters.sortDirection,
      // ... other filters
    });
    return `${prefix}:${btoa(filterString)}`;
  }

  private buildModelsParam(modelCombos?: ManufacturerModelSelection[]): string {
    if (!modelCombos || modelCombos.length === 0) return '';
    return modelCombos
      .map(c => `${c.manufacturer}:${c.model}`)
      .join(',');
  }

  private buildFilterParams(filters: SearchFilters): any {
    return {
      manufacturer: filters.manufacturer,
      model: filters.model,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      bodyClass: filters.bodyClass,
      dataSource: filters.dataSource
    };
  }

  private formatError(error: any): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return error.message || 'An unexpected error occurred.';
  }
}
```

---

#### Update Components to Use Loading States

```typescript
// features/workshop/workshop.component.ts

export class WorkshopComponent implements OnInit, OnDestroy {
  // Global loading state (shows if ANY request is loading)
  globalLoading$ = this.stateService.getGlobalLoadingState$();
  
  // Specific loading state for vehicle data
  vehicleDataLoading$ = this.stateService.getVehicleDataLoadingState$();

  ngOnInit(): void {
    // Subscribe to filters and trigger fetch
    this.stateService.filters$
      .pipe(
        takeUntil(this.destroy$),
        // Only fetch if we have model selections
        filter(filters => !!filters.modelCombos && filters.modelCombos.length > 0)
      )
      .subscribe(filters => {
        // Trigger fetch (coordinator handles deduplication)
        this.stateService.fetchVehicleData().subscribe();
      });
  }
}
```

```html
<!-- workshop.component.html -->

<!-- Global loading overlay -->
<div class="loading-overlay" *ngIf="globalLoading$ | async">
  <nz-spin nzSimple [nzSize]="'large'"></nz-spin>
  <p>Loading...</p>
</div>

<!-- Table with specific loading state -->
<app-vehicle-results-table
  [loading]="vehicleDataLoading$ | async"
  [results]="results$ | async">
</app-vehicle-results-table>
```

---

### Benefits of This Implementation

✅ **Request Deduplication**
- Multiple components calling same API → Only 1 network request
- Shared response via `shareReplay(1)`

✅ **Response Caching**
- Configurable cache TTL per request type
- Reduces unnecessary API calls
- Improves perceived performance

✅ **Automatic Retries**
- Exponential backoff
- Configurable retry attempts
- Transparent to calling code

✅ **Coordinated Loading States**
- Per-request loading state
- Global loading state (any request active)
- Prevents race conditions

✅ **Cancellation Support**
- Cancel all requests on navigation
- Prevents memory leaks
- Clean state management

---

## Phase 2: Error Boundary Pattern

### Problem Statement

**Current Issues:**
- Error handling is scattered across components
- No consistent error display strategy
- No retry logic
- No error recovery patterns
- Users see technical error messages

**Example Scenario:**
```typescript
// Current: Each component handles errors differently
this.api.getData().subscribe({
  error: (err) => console.error(err)  // ❌ Inconsistent
});
```

---

### Solution: Global Error Handler + Error Boundary Service

#### Architecture Addition

```
┌─────────────────────────────────────────────────────┐
│            GLOBAL ERROR HANDLER                     │
│  (Angular ErrorHandler implementation)              │
│                                                      │
│  Catches:                                           │
│  • Unhandled exceptions                             │
│  • Promise rejections                               │
│  • Template errors                                  │
│  • RxJS errors (when not caught)                    │
│                                                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         ERROR BOUNDARY SERVICE                      │
│  (Centralized error management)                     │
│                                                      │
│  Features:                                          │
│  • Categorize errors (network, auth, validation)    │
│  • User-friendly messages                           │
│  • Retry strategies                                 │
│  • Error notifications (toast/modal)                │
│  • Error logging/reporting                          │
│  • Recovery actions                                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Implementation Files

**New Services:**
```
frontend/src/app/core/services/
├── error-boundary.service.ts
└── global-error-handler.ts
```

**New Models:**
```
frontend/src/app/models/
└── error.model.ts
```

#### Error Models

```typescript
// models/error.model.ts

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  id: string;                    // Unique error ID
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;               // User-friendly message
  technicalMessage?: string;     // Technical details (for devs)
  timestamp: number;
  context?: any;                 // Additional context
  retryable: boolean;
  recoveryAction?: () => void;   // Optional recovery function
}

export interface ErrorHandlerConfig {
  showNotification: boolean;
  logToConsole: boolean;
  logToServer: boolean;
  retryAttempts?: number;
}
```

#### Error Boundary Service

```typescript
// core/services/error-boundary.service.ts

import { Injectable } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { AppError, ErrorCategory, ErrorSeverity, ErrorHandlerConfig } from '@app/models/error.model';

@Injectable({
  providedIn: 'root'
})
export class ErrorBoundaryService {
  private errorSubject = new Subject<AppError>();
  public errors$ = this.errorSubject.asObservable();

  private errorHistory: AppError[] = [];
  private readonly MAX_HISTORY = 50;

  constructor(private notification: NzNotificationService) {}

  /**
   * Handle an error with full context
   */
  handleError(
    error: any,
    config: ErrorHandlerConfig = {
      showNotification: true,
      logToConsole: true,
      logToServer: false
    }
  ): Observable<never> {
    const appError = this.categorizeError(error);

    // Add to history
    this.addToHistory(appError);

    // Emit to subscribers
    this.errorSubject.next(appError);

    // Log to console (in development)
    if (config.logToConsole) {
      this.logToConsole(appError);
    }

    // Show notification
    if (config.showNotification) {
      this.showNotification(appError);
    }

    // Log to server (in production)
    if (config.logToServer) {
      this.logToServer(appError);
    }

    return throwError(() => appError);
  }

  /**
   * Categorize error and create AppError
   */
  private categorizeError(error: any): AppError {
    const id = this.generateErrorId();
    const timestamp = Date.now();

    // Network errors
    if (error.status === 0 || error.name === 'HttpErrorResponse' && error.status === 0) {
      return {
        id,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.ERROR,
        message: 'Network error. Please check your internet connection and try again.',
        technicalMessage: error.message,
        timestamp,
        retryable: true,
        context: { originalError: error }
      };
    }

    // Authentication errors
    if (error.status === 401) {
      return {
        id,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.WARNING,
        message: 'Your session has expired. Please log in again.',
        technicalMessage: error.message,
        timestamp,
        retryable: false,
        context: { originalError: error },
        recoveryAction: () => {
          // Navigate to login
          console.log('Navigate to login');
        }
      };
    }

    // Authorization errors
    if (error.status === 403) {
      return {
        id,
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.WARNING,
        message: 'You do not have permission to access this resource.',
        technicalMessage: error.message,
        timestamp,
        retryable: false,
        context: { originalError: error }
      };
    }

    // Not found
    if (error.status === 404) {
      return {
        id,
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.WARNING,
        message: 'The requested resource was not found.',
        technicalMessage: error.message,
        timestamp,
        retryable: false,
        context: { originalError: error }
      };
    }

    // Validation errors
    if (error.status === 400 || error.status === 422) {
      return {
        id,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.INFO,
        message: error.error?.message || 'Please check your input and try again.',
        technicalMessage: error.message,
        timestamp,
        retryable: false,
        context: { originalError: error, validationErrors: error.error?.errors }
      };
    }

    // Server errors
    if (error.status >= 500) {
      return {
        id,
        category: ErrorCategory.SERVER,
        severity: ErrorSeverity.CRITICAL,
        message: 'A server error occurred. Our team has been notified. Please try again later.',
        technicalMessage: error.message,
        timestamp,
        retryable: true,
        context: { originalError: error }
      };
    }

    // Client/unknown errors
    return {
      id,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      message: 'An unexpected error occurred. Please try again.',
      technicalMessage: error.message || error.toString(),
      timestamp,
      retryable: true,
      context: { originalError: error }
    };
  }

  /**
   * Show user notification based on error severity
   */
  private showNotification(error: AppError): void {
    const options = {
      nzDuration: error.severity === ErrorSeverity.CRITICAL ? 0 : 5000,
      nzPlacement: 'topRight' as const
    };

    switch (error.severity) {
      case ErrorSeverity.INFO:
        this.notification.info('Information', error.message, options);
        break;
      case ErrorSeverity.WARNING:
        this.notification.warning('Warning', error.message, options);
        break;
      case ErrorSeverity.ERROR:
        this.notification.error('Error', error.message, {
          ...options,
          nzDuration: 7000
        });
        break;
      case ErrorSeverity.CRITICAL:
        this.notification.error('Critical Error', error.message, {
          ...options,
          nzDuration: 0,  // Must be dismissed manually
          nzDescription: error.retryable 
            ? 'Please try again or contact support if the problem persists.'
            : 'Please contact support for assistance.'
        });
        break;
    }
  }

  /**
   * Log error to console (development)
   */
  private logToConsole(error: AppError): void {
    console.group(`🚨 [${error.category}] ${error.severity}`);
    console.error('Message:', error.message);
    if (error.technicalMessage) {
      console.error('Technical:', error.technicalMessage);
    }
    console.error('Context:', error.context);
    console.error('Retryable:', error.retryable);
    console.error('Timestamp:', new Date(error.timestamp).toISOString());
    console.groupEnd();
  }

  /**
   * Log error to server (production)
   */
  private logToServer(error: AppError): void {
    // TODO: Implement server logging endpoint
    // POST /api/logs/errors
    console.log('[ErrorBoundary] Would log to server:', error);
  }

  /**
   * Get error history
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.pop();
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

#### Global Error Handler

```typescript
// core/services/global-error-handler.ts

import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ErrorBoundaryService } from './error-boundary.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    // Get ErrorBoundaryService lazily to avoid circular dependency
    const errorBoundary = this.injector.get(ErrorBoundaryService);

    // Handle the error
    errorBoundary.handleError(error, {
      showNotification: true,
      logToConsole: true,
      logToServer: !this.isDevMode()
    }).subscribe();
  }

  private isDevMode(): boolean {
    return !environment.production;
  }
}
```

#### Register Global Error Handler

```typescript
// app.module.ts

import { ErrorHandler, NgModule } from '@angular/core';
import { GlobalErrorHandler } from './core/services/global-error-handler';

@NgModule({
  // ... other config
  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },
    // ... other providers
  ]
})
export class AppModule { }
```

#### Update Request Coordinator to Use Error Boundary

```typescript
// core/services/request-coordinator.service.ts

import { ErrorBoundaryService } from './error-boundary.service';

@Injectable({
  providedIn: 'root'
})
export class RequestCoordinatorService {
  constructor(private errorBoundary: ErrorBoundaryService) {}

  execute<T>(
    key: string,
    requestFn: () => Observable<T>,
    config: RequestConfig = {}
  ): Observable<T> {
    // ... existing code ...

    const request$ = requestFn().pipe(
      // ... retry logic ...
      catchError(error => {
        // Use error boundary for consistent handling
        return this.errorBoundary.handleError(error, {
          showNotification: true,
          logToConsole: true,
          logToServer: true
        });
      })
    );

    return request$;
  }
}
```

---

### Benefits of Error Boundary Pattern

✅ **Consistent Error Handling**
- All errors handled the same way
- User-friendly messages
- Technical details preserved for debugging

✅ **Automatic Categorization**
- Network, auth, validation, server errors
- Appropriate severity levels
- Context-aware recovery actions

✅ **User Notifications**
- NG-ZORRO notifications
- Severity-based styling
- Dismissible/permanent based on severity

✅ **Error Logging**
- Console logging in development
- Server logging in production
- Error history tracking

✅ **Recovery Actions**
- Automatic retries for retryable errors
- Recovery callbacks (e.g., redirect to login)
- Graceful degradation

---

## Phase 3: Centralized Action Pattern

*(Continued in next section due to length...)*

Would you like me to continue with Phase 3, or shall we discuss the first two phases in more detail?

**Context warning: Approximately 32% remaining.**
