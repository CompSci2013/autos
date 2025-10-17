# Phase 2: Error Boundary Pattern - Implementation Prompt

**Date:** 2025-10-17  
**Current State:** Phase 1 (RequestCoordinator) complete  
**Objective:** Implement professional-grade centralized error handling with user-friendly messaging, categorization, and recovery actions

---

## Context

The AUTOS application currently has:
- ✅ RequestCoordinatorService with caching and deduplication (Phase 1 complete)
- ❌ Scattered error handling across components
- ❌ No consistent error display strategy
- ❌ Technical error messages shown to users (see example below)
- ❌ No error recovery patterns

### Current Error Example:
```
Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, 
but the message channel closed before a response was received
```

**User Impact:** Users see cryptic technical errors instead of helpful guidance.

---

## Goals

1. **Centralize Error Handling** - Single source of truth for all application errors
2. **Error Categorization** - Network, auth, validation, server, client errors
3. **User-Friendly Messages** - Convert technical errors to actionable guidance
4. **Error Notifications** - Toast notifications with severity-based styling
5. **Recovery Actions** - Automatic retries, manual recovery options, graceful degradation
6. **Error Logging** - Console (dev) and server (production) logging

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│         GLOBAL ERROR HANDLER                             │
│  (Angular ErrorHandler implementation)                   │
│                                                           │
│  Catches:                                                │
│  • Unhandled exceptions                                  │
│  • Promise rejections                                    │
│  • Template errors                                       │
│  • RxJS errors (when not caught)                         │
│                                                           │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│         ERROR BOUNDARY SERVICE                           │
│  (Centralized error management)                          │
│                                                           │
│  Features:                                               │
│  • Categorize errors (network, auth, validation)         │
│  • User-friendly messages                                │
│  • Retry strategies                                      │
│  • Error notifications (toast/modal)                     │
│  • Error logging/reporting                               │
│  • Recovery actions                                      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Files

### New Files to Create:

```
frontend/src/app/
├── core/services/
│   ├── error-boundary.service.ts        [NEW]
│   └── global-error-handler.ts          [NEW]
└── models/
    └── error.model.ts                    [NEW]
```

### Files to Update:

```
frontend/src/app/
├── app.module.ts                         [UPDATED - register error handler]
├── core/services/
│   ├── request-coordinator.service.ts   [UPDATED - use error boundary]
│   └── state-management.service.ts      [UPDATED - use error boundary]
```

---

## Error Model Structure

```typescript
// models/error.model.ts

export enum ErrorCategory {
  NETWORK = 'NETWORK',           // Connection issues, timeouts
  AUTHENTICATION = 'AUTHENTICATION',  // Login required
  AUTHORIZATION = 'AUTHORIZATION',    // Permission denied
  VALIDATION = 'VALIDATION',     // Invalid input data
  NOT_FOUND = 'NOT_FOUND',       // Resource not found
  SERVER = 'SERVER',             // 500-level errors
  CLIENT = 'CLIENT',             // 400-level errors
  UNKNOWN = 'UNKNOWN'            // Uncategorized
}

export enum ErrorSeverity {
  INFO = 'INFO',         // Informational (blue)
  WARNING = 'WARNING',   // Warning (orange)
  ERROR = 'ERROR',       // Error (red)
  CRITICAL = 'CRITICAL'  // Critical (red + persist)
}

export interface AppError {
  id: string;                    // Unique error ID (for tracking)
  category: ErrorCategory;       // Error type
  severity: ErrorSeverity;       // How serious
  message: string;               // User-friendly message
  technicalMessage?: string;     // Technical details (dev mode only)
  timestamp: number;             // When it occurred
  context?: any;                 // Additional context (request, component, etc.)
  retryable: boolean;            // Can this be retried?
  recoveryAction?: () => void;   // Optional recovery function
}
```

---

## Error Message Mapping Examples

### Network Errors:
- **Technical:** `HttpErrorResponse: 0 Unknown Error`
- **User-Friendly:** "Unable to connect to the server. Please check your internet connection."
- **Recovery:** Retry button

### Authentication Errors:
- **Technical:** `HttpErrorResponse: 401 Unauthorized`
- **User-Friendly:** "Your session has expired. Please log in again."
- **Recovery:** Redirect to login

### Validation Errors:
- **Technical:** `HttpErrorResponse: 400 Bad Request - Invalid year range`
- **User-Friendly:** "Please enter a valid year range (Min must be less than Max)."
- **Recovery:** Clear filter, focus input

### Server Errors:
- **Technical:** `HttpErrorResponse: 500 Internal Server Error`
- **User-Friendly:** "Something went wrong on our end. Please try again in a moment."
- **Recovery:** Retry with exponential backoff

### Not Found Errors:
- **Technical:** `HttpErrorResponse: 404 Not Found`
- **User-Friendly:** "No vehicles found matching your criteria."
- **Recovery:** Adjust filters

---

## Implementation Requirements

### 1. ErrorBoundaryService

**Responsibilities:**
- Categorize incoming errors
- Generate user-friendly messages
- Determine severity level
- Show notifications (NG-ZORRO toast)
- Log errors (console in dev, server in production)
- Track error history
- Provide recovery actions

**Key Methods:**
```typescript
handleError(error: any, config?: ErrorHandlerConfig): Observable<AppError>
categorizeError(error: any): ErrorCategory
formatUserMessage(error: any, category: ErrorCategory): string
showNotification(appError: AppError): void
logError(appError: AppError, logToServer: boolean): void
```

### 2. GlobalErrorHandler

**Responsibilities:**
- Implement Angular's `ErrorHandler` interface
- Catch all unhandled errors
- Delegate to `ErrorBoundaryService`

### 3. Integration with RequestCoordinator

Update `request-coordinator.service.ts` to use ErrorBoundary in the `catchError` operator:

```typescript
catchError(error => {
  return this.errorBoundary.handleError(error, {
    showNotification: true,
    logToConsole: true,
    logToServer: true
  });
})
```

### 4. Notification Display

Use NG-ZORRO notification service:
- **INFO:** Blue notification, auto-dismiss (3 seconds)
- **WARNING:** Orange notification, auto-dismiss (5 seconds)
- **ERROR:** Red notification, auto-dismiss (7 seconds)
- **CRITICAL:** Red notification, manual dismiss only

---

## Testing Scenarios

After implementation, test these scenarios:

1. **Network Error:** Disconnect internet, trigger API call
   - Expected: "Unable to connect" message, retry button

2. **Server Error:** Backend returns 500
   - Expected: "Server error" message, automatic retry

3. **Validation Error:** Invalid filter input
   - Expected: Specific validation message, field highlight

4. **Not Found:** Filter returns 0 results
   - Expected: "No vehicles found" (already working, ensure consistency)

5. **Uncaught Exception:** Trigger a JavaScript error
   - Expected: Global handler catches, shows user-friendly message

---

## Success Criteria

✅ All errors display user-friendly messages (no technical jargon)  
✅ Errors are categorized correctly (network, auth, validation, etc.)  
✅ Appropriate notifications shown (toast with correct severity)  
✅ Errors logged to console in dev mode  
✅ Errors logged to server in production  
✅ Recovery actions work (retry, redirect, etc.)  
✅ No uncaught promise rejections in console  
✅ Error history tracked for debugging  

---

## Reference Documents

- **Phase 1 Plan:** `/home/odin/projects/autos/docs/state-management-refactoring-plan-part1.md`
- **State Management Guide:** `/home/odin/projects/autos/docs/state-management-guide.md`
- **CLAUDE.md:** `/home/odin/projects/autos/CLAUDE.md`

---

## Implementation Approach

**Instruction-by-Instruction:**
1. Create error.model.ts with interfaces and enums
2. Create error-boundary.service.ts with core logic
3. Create global-error-handler.ts
4. Register GlobalErrorHandler in app.module.ts
5. Update request-coordinator.service.ts to use ErrorBoundary
6. Update state-management.service.ts error handling
7. Test each error scenario
8. Document and commit

---

