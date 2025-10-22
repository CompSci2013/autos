# Epic 5: User Experience & Performance

**Epic ID:** EPIC-5
**Epic Owner:** UX Lead & Performance Engineer
**Status:** In Progress
**Priority:** High
**Business Value:** Deliver fast, responsive, error-resilient experience that delights users

---

## Epic Description

Optimize application performance, implement loading states, error handling, request optimization, and responsive design to ensure a professional, production-ready user experience across all devices and network conditions.

**Success Metrics:**
- Page load < 2 seconds (desktop)
- API responses < 1 second (p95)
- Zero duplicate requests
- 99% uptime with graceful error recovery
- Mobile usability score > 90

---

## Feature 5.1: Loading States

### Story 5.1.1: Global Loading Indicator

**As an** end user,
**I want** a loading indicator when data is being fetched,
**So that** I know the application is working and not frozen.

**Priority:** High
**Story Points:** 3
**Sprint:** Sprint 19

#### Acceptance Criteria
- [ ] Loading spinner appears during API calls
- [ ] Positioned at top of viewport or in affected component
- [ ] Smooth fade-in/out animation
- [ ] Minimum display time: 300ms (prevent flicker)
- [ ] Doesn't block user interactions elsewhere on page

#### Technical Notes
- Uses NG-ZORRO `nz-spin`
- Triggered by `StateManagementService.loading$` observable

#### Definition of Done
- [ ] Consistent across all API calls
- [ ] Accessible (ARIA live region)

---

### Story 5.1.2: Component-Level Loading States

**As an** end user,
**I want** specific components to show loading states,
**So that** I know which section is updating.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 19

#### Acceptance Criteria
- [ ] Picker component: Skeleton loaders for rows
- [ ] Results table: Spinner overlay on table
- [ ] VIN expansion: Inline spinner
- [ ] Each component manages its own loading state
- [ ] Loading doesn't affect other components

#### Technical Notes
- Component-specific loading observables
- Uses `RequestCoordinatorService.getLoadingState$(key)`

#### Definition of Done
- [ ] No overlapping spinners
- [ ] Smooth transitions

---

### Story 5.1.3: Progress Bar for Long Operations

**As an** end user,
**I want** a progress bar for operations taking > 3 seconds,
**So that** I have feedback on long-running tasks.

**Priority:** Low
**Story Points:** 3
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Progress bar appears after 3-second threshold
- [ ] Shows percentage complete (if determinable)
- [ ] Indeterminate animation if percentage unknown
- [ ] Message: "Loading X of Y results..."

#### Technical Notes
- NG-ZORRO `nz-progress`
- Requires backend pagination info

#### Definition of Done
- [ ] Cancellable long operations

---

## Feature 5.2: Error Handling

### Story 5.2.1: Global Error Handler

**As a** developer,
**I want** a centralized error handler that catches all unhandled errors,
**So that** errors are logged and users see friendly messages.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 20

#### Acceptance Criteria
- [ ] Angular `ErrorHandler` implementation
- [ ] Catches HTTP errors, JavaScript errors, promise rejections
- [ ] Logs to console (dev) and monitoring service (prod)
- [ ] Categorizes errors: Network, API, Client
- [ ] Shows user-friendly notification

#### Technical Notes
- Service: `GlobalErrorHandlerService`
- Integrates with error monitoring (Sentry, etc.)

#### Definition of Done
- [ ] All error types caught
- [ ] No uncaught exceptions in console

---

### Story 5.2.2: API Error Messages

**As an** end user,
**I want** meaningful error messages when API calls fail,
**So that** I understand what went wrong and how to fix it.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 20

#### Acceptance Criteria
- [ ] HTTP 400: "Invalid request. Please check your filters."
- [ ] HTTP 404: "No results found. Try different search criteria."
- [ ] HTTP 500: "Server error. Please try again later."
- [ ] Network timeout: "Request timed out. Check your connection."
- [ ] Each message includes retry button
- [ ] Error codes logged for support

#### Technical Notes
- Maps HTTP status to user messages
- Uses `StateManagementService.error$` observable
- NG-ZORRO `nz-alert` component

#### Definition of Done
- [ ] All error scenarios covered
- [ ] Messages reviewed by UX team

---

### Story 5.2.3: Retry Failed Requests

**As an** end user,
**I want** to retry failed requests with one click,
**So that** I don't have to refresh the entire page.

**Priority:** High
**Story Points:** 3
**Sprint:** Sprint 20

#### Acceptance Criteria
- [ ] "Retry" button appears on error
- [ ] Click re-executes same request
- [ ] Shows loading state during retry
- [ ] Automatic retry: 2 attempts with exponential backoff
- [ ] Manual retry available after auto-retry exhausted

#### Technical Notes
- `RequestCoordinatorService` handles auto-retry
- Manual retry calls same API method

#### Definition of Done
- [ ] Retry limit: 3 manual attempts
- [ ] Clear messaging after final failure

---

### Story 5.2.4: Empty State Messages

**As an** end user,
**I want** helpful messages when no results are found,
**So that** I know the search worked but returned nothing.

**Priority:** Medium
**Story Points:** 2
**Sprint:** Sprint 20

#### Acceptance Criteria
- [ ] Empty state illustration (NG-ZORRO `nz-empty`)
- [ ] Message: "No vehicles match your search."
- [ ] Suggestions: "Try removing some filters" or "Select different models"
- [ ] "Clear Filters" button
- [ ] Distinct from error state

#### Technical Notes
- Check `totalResults === 0` (not an error)

#### Definition of Done
- [ ] Empty state visually appealing
- [ ] Actionable suggestions

---

## Feature 5.3: Request Optimization

### Story 5.3.1: Request Deduplication

**As a** system administrator,
**I want** identical simultaneous requests to share the same API call,
**So that** server load is reduced and responses are faster.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 21 (Implemented)

#### Acceptance Criteria
- [ ] Identical requests (same params) within 5 seconds share observable
- [ ] First request triggers API call
- [ ] Subsequent requests subscribe to existing observable
- [ ] All subscribers receive same response
- [ ] Tracks in-flight requests by cache key

#### Technical Notes
- Service: `RequestCoordinatorService`
- Uses RxJS `shareReplay(1)` operator
- Cache key: Hash of request parameters

#### Definition of Done
- [ ] Unit tests verify deduplication
- [ ] Network tab shows single request
- [ ] Performance: 50% reduction in duplicate requests

---

### Story 5.3.2: Response Caching

**As a** end user,
**I want** responses cached for repeated queries,
**So that** navigation back/forward is instant.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 21 (Implemented)

#### Acceptance Criteria
- [ ] Cache responses for 30 seconds (configurable)
- [ ] Cache keyed by request parameters
- [ ] Cache hit returns immediately (no API call)
- [ ] Cache miss triggers new request
- [ ] Cache invalidation on explicit actions (clear filters)

#### Technical Notes
- `RequestCoordinatorService.execute()` config: `{ cacheTime: 30000 }`
- In-memory cache (Map)

#### Definition of Done
- [ ] Cache size limited (prevent memory leak)
- [ ] Cache cleared on logout/session end

---

### Story 5.3.3: Exponential Backoff Retry

**As a** system,
**I want** to retry failed requests with exponential backoff,
**So that** transient errors are handled gracefully without overwhelming the server.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 21 (Implemented)

#### Acceptance Criteria
- [ ] Retry on HTTP 5xx and network errors only (not 4xx)
- [ ] Attempt 1: Immediate
- [ ] Attempt 2: 1 second delay
- [ ] Attempt 3: 2 second delay (exponential)
- [ ] Max 2 retries (3 total attempts)
- [ ] User sees loading during retries

#### Technical Notes
- `RequestCoordinatorService` config: `{ retryAttempts: 2, retryDelay: 1000 }`
- Uses RxJS `retry` operator with custom logic

#### Definition of Done
- [ ] Logs retry attempts
- [ ] Doesn't retry auth errors (401)

---

### Story 5.3.4: Request Cancellation

**As an** end user,
**I want** in-flight requests cancelled when I navigate away,
**So that** old requests don't interfere with new ones.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 21

#### Acceptance Criteria
- [ ] Requests cancelled on component destroy
- [ ] Requests cancelled when new search triggered
- [ ] "Cancel" button for long-running requests (optional)
- [ ] Cancelled requests don't update UI

#### Technical Notes
- Uses RxJS `takeUntil(destroy$)` pattern
- `RequestCoordinatorService.cancelAll()` method

#### Definition of Done
- [ ] No memory leaks from uncancelled subscriptions
- [ ] Network tab shows cancelled requests

---

## Feature 5.4: Responsive Design

### Story 5.4.1: Mobile-Responsive Tables

**As a** mobile user,
**I want** tables to be usable on my phone,
**So that** I can search vehicles on the go.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 22

#### Acceptance Criteria
- [ ] Tables scroll horizontally on mobile
- [ ] Fixed left column (vehicle ID or name)
- [ ] Column headers sticky (scroll with content)
- [ ] Touch-friendly tap targets (min 44px)
- [ ] Pagination controls large and easy to tap
- [ ] Filters collapse into accordion on mobile

#### Technical Notes
- CSS media queries: `@media (max-width: 768px)`
- NG-ZORRO responsive utilities

#### Definition of Done
- [ ] Tested on iPhone and Android devices
- [ ] Lighthouse mobile score > 90

---

### Story 5.4.2: Touch Gestures

**As a** mobile user,
**I want** swipe gestures for common actions,
**So that** navigation feels natural on touchscreens.

**Priority:** Low
**Story Points:** 5
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Swipe left on row: Show quick actions
- [ ] Swipe right: Expand row
- [ ] Pinch to zoom (on charts/graphs)
- [ ] Pull to refresh (reload data)

#### Technical Notes
- HammerJS for gesture recognition

#### Definition of Done
- [ ] Gestures don't conflict with native scroll

---

### Story 5.4.3: Progressive Web App (PWA)

**As a** mobile user,
**I want** to install AUTOS as a PWA,
**So that** I can access it offline and it feels like a native app.

**Priority:** Low
**Story Points:** 8
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Service worker for offline caching
- [ ] Web manifest for installation
- [ ] App icon and splash screen
- [ ] Offline fallback page
- [ ] "Add to Home Screen" prompt

#### Technical Notes
- Angular PWA schematic: `ng add @angular/pwa`

#### Definition of Done
- [ ] Works offline (cached assets)
- [ ] Installable on iOS and Android

---

## Feature 5.5: Performance Optimization

### Story 5.5.1: Lazy Loading Routes

**As a** system,
**I want** routes lazy-loaded to reduce initial bundle size,
**So that** the app loads faster.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 23

#### Acceptance Criteria
- [ ] Home, Discover, Workshop loaded on-demand
- [ ] Initial bundle < 500KB
- [ ] Route transitions show loading indicator
- [ ] Preload common routes (discover) after initial load

#### Technical Notes
```typescript
const routes: Routes = [
  { path: '', loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule) }
];
```

#### Definition of Done
- [ ] Lighthouse performance score > 90
- [ ] Bundle analysis shows separate chunks

---

### Story 5.5.2: Virtual Scrolling for Large Tables

**As an** end user,
**I want** large tables to scroll smoothly,
**So that** I can browse thousands of rows without lag.

**Priority:** Medium
**Story Points:** 8
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Only visible rows rendered (virtual scroll)
- [ ] Smooth scroll with 60fps
- [ ] Handles 10,000+ rows
- [ ] Uses Angular CDK virtual scroll

#### Technical Notes
```html
<cdk-virtual-scroll-viewport itemSize="50" class="viewport">
  <tr *cdkVirtualFor="let row of data">...</tr>
</cdk-virtual-scroll-viewport>
```

#### Definition of Done
- [ ] Performance: Render 10,000 rows < 500ms

---

### Story 5.5.3: Image Optimization

**As a** system,
**I want** images lazy-loaded and optimized,
**So that** pages load faster.

**Priority:** Low
**Story Points:** 3
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Images use `loading="lazy"` attribute
- [ ] Serve WebP with fallback to JPEG
- [ ] Responsive images (`srcset`)
- [ ] Placeholder while loading

#### Definition of Done
- [ ] Lighthouse opportunities show no image issues

---

## Backlog Stories (Future)

### Story 5.X.X: Offline Mode
- Cache data for offline access
- Queue actions for sync when online

### Story 5.X.X: Dark Mode
- Toggle dark/light theme
- Respect system preference

### Story 5.X.X: Keyboard Shortcuts
- Ctrl+K: Search
- Ctrl+/: Show shortcuts menu
- Arrow keys: Navigate results

### Story 5.X.X: Accessibility Audit
- WCAG 2.1 AA compliance
- Screen reader testing
- Keyboard navigation
- Color contrast

---

**Epic Status:** 70% Complete (Core optimization implemented)
**Last Updated:** 2025-10-22

**Context note:** Approximately 63% token usage remaining.
