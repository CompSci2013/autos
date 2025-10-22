# Epic 3: State Management & URL Sharing

**Epic ID:** EPIC-3
**Epic Owner:** Technical Lead
**Status:** Complete
**Priority:** Critical
**Business Value:** Enable users to bookmark, share, and navigate searches seamlessly

---

## Epic Description

Implement URL-first state management architecture where all query state lives in URL parameters. This enables bookmarking, sharing, and browser back/forward navigation while maintaining clean separation between query state (URL) and UI preferences (localStorage).

**Success Metrics:**
- 100% of query state persists in URL
- Users can share URLs that reproduce exact search results
- Browser back/forward works correctly
- No lost state on page refresh

---

## Feature 3.1: URL-Driven State Architecture

### Story 3.1.1: Route State Service

**As a** developer,
**I want** a service that manages URL query parameters,
**So that** I can read/write state to the URL consistently across components.

**Priority:** Critical
**Story Points:** 8
**Sprint:** Sprint 1 (Foundation)

#### Acceptance Criteria
- [ ] Service: `RouteStateService`
- [ ] Methods:
  - `getCurrentParams()`: Get snapshot of all params
  - `getParam(key)`: Get single param value
  - `watchParam(key)`: Observable of param changes
  - `updateParams(params)`: Merge with existing params
  - `setParams(params)`: Replace all params
  - `removeParam(key)`: Remove single param
  - `clearAllParams()`: Remove all params
- [ ] Utilities:
  - `filtersToParams(filters)`: Convert SearchFilters to URL params
  - `paramsToFilters(params)`: Parse URL params to SearchFilters
- [ ] Singleton service (providedIn: 'root')

#### Technical Notes
- Uses Angular `ActivatedRoute` and `Router`
- Uses `queryParamsHandling: 'merge'` for updates
- Type-safe conversions (SearchFilters ↔ URL params)

#### Definition of Done
- [ ] Unit tests: 90%+ coverage
- [ ] Documentation with examples
- [ ] Handles array parameters (models)
- [ ] Handles nested objects (flatten/unflatten)

---

### Story 3.1.2: State Management Service

**As a** developer,
**I want** a central service that orchestrates state updates and API calls,
**So that** all components use consistent state management patterns.

**Priority:** Critical
**Story Points:** 13
**Sprint:** Sprint 1-2 (Foundation)

#### Acceptance Criteria
- [ ] Service: `StateManagementService`
- [ ] Observables:
  - `state$`: Full application state
  - `filters$`: Current filters (from URL)
  - `results$`: Vehicle search results
  - `loading$`: Loading state
  - `error$`: Error messages
  - `totalResults$`: Total result count
- [ ] Methods:
  - `updateFilters(filters)`: Update filters + sync to URL + fetch data
  - `updatePage(page)`: Change page number
  - `updateSort(column, direction)`: Change sort
  - `resetFilters()`: Clear all filters
  - `fetchVehicleData()`: Execute API request
- [ ] Integration with `RouteStateService`
- [ ] Integration with `RequestCoordinatorService`

#### Technical Notes
- BehaviorSubject for state streams
- Immutable state updates
- Automatic URL synchronization
- Triggers API calls after state changes

#### Definition of Done
- [ ] Unit tests with mocked dependencies
- [ ] Integration tests with real API
- [ ] Performance: State update < 50ms
- [ ] Memory efficient (proper cleanup)

---

### Story 3.1.3: URL Parameter Format

**As a** product manager,
**I want** URL parameters human-readable and shareable,
**So that** users can understand and modify URLs manually if needed.

**Priority:** High
**Story Points:** 3
**Sprint:** Sprint 2

#### Acceptance Criteria
- [ ] Format: `?models=Ford:F-150,Chevrolet:Corvette`
- [ ] Model separator: comma (`,`)
- [ ] Manufacturer-model separator: colon (`:`)
- [ ] Filters: `yearMin=2010&yearMax=2020`
- [ ] Sort: `sort=year&sortDirection=desc`
- [ ] Pagination: `page=2&size=50`
- [ ] URL-encoded special characters
- [ ] Maximum URL length: 2000 characters (validation)

#### Technical Notes
- Custom serialization for model arrays
- Validation prevents URL length overflow
- Error message if too many selections

#### Definition of Done
- [ ] URLs copyable and sharable
- [ ] Works in all browsers
- [ ] No encoding issues

---

### Story 3.1.4: Synchronize URL on State Change

**As an** end user,
**I want** the URL to update automatically when I change filters,
**So that** I can bookmark or share my current search.

**Priority:** Critical
**Story Points:** 5
**Sprint:** Sprint 2

#### Acceptance Criteria
- [ ] URL updates immediately when filters change
- [ ] URL updates when sort changes
- [ ] URL updates when page changes
- [ ] URL updates when selections change
- [ ] No page reload during URL changes
- [ ] Browser history entries created (back button works)

#### Technical Notes
- Uses `Router.navigate()` with `queryParamsHandling: 'merge'`
- Debounce rapid changes (300ms) to avoid history spam

#### Definition of Done
- [ ] URL always reflects current state
- [ ] No flickering or race conditions

---

## Feature 3.2: Component Hydration from URL

### Story 3.2.1: Hydrate State on Initial Load

**As an** end user,
**I want** the application to restore my search state from the URL when I visit a bookmarked link,
**So that** I see the exact same results I saved.

**Priority:** Critical
**Story Points:** 8
**Sprint:** Sprint 3

#### Acceptance Criteria
- [ ] On page load, parse URL parameters
- [ ] Restore filters, sort, pagination
- [ ] Restore selected models
- [ ] Execute search automatically if models selected
- [ ] Display results matching URL state
- [ ] Works on deep links (direct URL navigation)

#### Technical Notes
- Happens in `AppComponent` or route guards
- `StateManagementService` subscribes to URL changes
- Triggers `fetchVehicleData()` if sufficient params

#### Definition of Done
- [ ] Works with complex URLs (many params)
- [ ] Works with empty URLs (default state)
- [ ] Error handling for malformed URLs

---

### Story 3.2.2: Idempotent Component Hydration

**As a** developer,
**I want** components to hydrate from URL state idempotently,
**So that** re-hydration doesn't cause side effects or duplicate requests.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 3

#### Acceptance Criteria
- [ ] Components use `@Input()` for state
- [ ] Hydration happens in `ngOnChanges()`
- [ ] Calling hydration multiple times is safe
- [ ] No duplicate API calls
- [ ] No infinite loops

#### Technical Notes
- Pattern documented in `state-management-guide.md`
- Parent passes state to children via inputs
- Children emit events for state changes (not direct mutations)

#### Definition of Done
- [ ] All components follow pattern
- [ ] Code review checklist includes pattern

---

### Story 3.2.3: Watch URL for External Changes

**As an** end user,
**I want** the app to update when I manually edit the URL,
**So that** I can construct custom searches by typing parameters.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 3

#### Acceptance Criteria
- [ ] `StateManagementService` subscribes to URL changes
- [ ] Detects changes from:
  - Browser back/forward buttons
  - Manual URL editing
  - External links
- [ ] Re-parses parameters
- [ ] Updates component state
- [ ] Executes search if needed

#### Technical Notes
- Uses `ActivatedRoute.queryParams` observable
- Compares previous and new state to avoid unnecessary updates

#### Definition of Done
- [ ] No race conditions
- [ ] Handles rapid URL changes (debounce)

---

## Feature 3.3: Browser Navigation

### Story 3.3.1: Browser Back Button Support

**As an** end user,
**I want** the browser back button to undo my last filter change,
**So that** I can navigate my search history naturally.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Back button restores previous filters
- [ ] Back button restores previous results
- [ ] Each filter change creates history entry
- [ ] No duplicate entries for identical state
- [ ] Forward button works (redo filter changes)

#### Technical Notes
- Relies on `Router.navigate()` creating history entries
- `skipLocationChange: false` to enable history
- Avoid spamming history (debounce rapid changes)

#### Definition of Done
- [ ] History stack reasonable size (< 20 entries per session)
- [ ] No memory leaks from history entries

---

### Story 3.3.2: Browser Forward Button Support

**As an** end user,
**I want** the browser forward button to redo filter changes,
**So that** I can navigate forward after going back.

**Priority:** Medium
**Story Points:** 2
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Forward button restores next state in history
- [ ] Works after using back button
- [ ] Disabled when at end of history

#### Technical Notes
- Automatic with proper history management

#### Definition of Done
- [ ] Consistent with back button behavior

---

## Feature 3.4: Storage Layer Separation

### Story 3.4.1: URL for Query State

**As a** developer,
**I want** all query-related state (filters, sort, page) in URL,
**So that** searches are shareable and bookmarkable.

**Priority:** Critical
**Story Points:** 5
**Sprint:** Sprint 2

#### Acceptance Criteria
- [ ] URL contains:
  - Selected model combinations
  - All active filters (year, manufacturer, body class, etc.)
  - Sort column and direction
  - Current page and page size
- [ ] No query state in localStorage
- [ ] No query state in session storage
- [ ] No query state in service memory (except derived from URL)

#### Technical Notes
- URL is single source of truth
- Services read from URL, not internal state

#### Definition of Done
- [ ] Incognito mode works (no localStorage dependency for query state)
- [ ] Sharing URL reproduces exact results

---

### Story 3.4.2: localStorage for UI Preferences

**As an** end user,
**I want** my UI preferences (column order, visibility) saved locally,
**So that** they persist across sessions but don't clutter shareable URLs.

**Priority:** High
**Story Points:** 3
**Sprint:** Sprint 14

#### Acceptance Criteria
- [ ] localStorage contains:
  - Column order
  - Column visibility
  - Page size preference
  - Panel collapse states (workshop)
  - Grid layout (workshop)
- [ ] UI preferences NOT in URL
- [ ] Preferences per-table (unique keys)

#### Technical Notes
- Uses `TableStatePersistenceService`
- Storage keys: `autos-table-{tableId}-preferences`
- Graceful fallback if localStorage unavailable (incognito)

#### Definition of Done
- [ ] Preferences don't affect shareability
- [ ] Clear documentation of what goes where

---

## Feature 3.5: Bookmarking & Sharing

### Story 3.5.1: Bookmark Current Search

**As an** end user,
**I want** to bookmark the current URL to save my search,
**So that** I can return to this exact search later.

**Priority:** High
**Story Points:** 1
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Standard browser bookmark works
- [ ] Bookmark saves current filters, sort, page
- [ ] Bookmark URL is < 2000 characters
- [ ] Opening bookmark restores exact state

#### Technical Notes
- Automatic with URL-driven state
- No special handling needed

#### Definition of Done
- [ ] Works in all major browsers
- [ ] Documented in user guide

---

### Story 3.5.2: Share Search via URL

**As an** end user,
**I want** to copy the URL and share it with colleagues,
**So that** they can see the same search results I'm viewing.

**Priority:** High
**Story Points:** 2
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Copy URL from address bar
- [ ] Share via email, Slack, etc.
- [ ] Recipient sees identical results
- [ ] Works across sessions and browsers
- [ ] No authentication required (public data)

#### Technical Notes
- Automatic with URL-driven state
- Ensure no user-specific data in URL

#### Definition of Done
- [ ] Tested across multiple browsers
- [ ] Works on mobile devices

---

### Story 3.5.3: Copy Share Link Button

**As an** end user,
**I want** a "Copy Link" button that copies the current URL to clipboard,
**So that** I don't have to manually select and copy from address bar.

**Priority:** Low
**Story Points:** 2
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] "Copy Link" button in header or toolbar
- [ ] Click copies URL to clipboard
- [ ] Toast notification: "Link copied!"
- [ ] Button disabled if no selections

#### Technical Notes
- Uses browser Clipboard API
- Copies `window.location.href`

#### Definition of Done
- [ ] Works on all modern browsers
- [ ] Accessible (keyboard shortcut)

---

## Feature 3.6: Deep Linking

### Story 3.6.1: Deep Link to Specific Search

**As an** external system,
**I want** to link directly to AUTOS with specific search parameters,
**So that** users can jump straight to relevant results from our system.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 5

#### Acceptance Criteria
- [ ] URL format documented for external systems
- [ ] Example: `http://autos.minilab/discover?models=Ford:F-150&yearMin=2015`
- [ ] Handles all query parameters
- [ ] Validates parameters (show error if invalid)

#### Technical Notes
- Same as bookmark/share functionality
- Add validation layer for external inputs

#### Definition of Done
- [ ] API documentation for URL format
- [ ] Error messages for invalid parameters

---

### Story 3.6.2: Deep Link to Expanded Row

**As an** end user,
**I want** to share a link that opens a specific vehicle with VIN instances expanded,
**So that** I can point colleagues to specific data.

**Priority:** Low
**Story Points:** 5
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] URL parameter: `expand=vehicleId123`
- [ ] On load, scrolls to vehicle row
- [ ] Expands row automatically
- [ ] Loads VIN instances

#### Technical Notes
- Requires storing expanded state in URL
- Scroll into view after data loads

#### Definition of Done
- [ ] Smooth scroll animation
- [ ] Works with pagination (loads correct page)

---

## Backlog Stories (Future)

### Story 3.X.X: URL Shortening Service
- Generate short URLs for complex searches
- Store mappings in database
- Example: `autos.minilab/s/abc123` → full URL

### Story 3.X.X: Search History
- Track user's search history (localStorage)
- Quick access to recent searches
- Clear history button

### Story 3.X.X: Named Saved Searches
- Save searches with custom names
- Requires user authentication
- Synced across devices (backend storage)

---

**Epic Status:** 95% Complete (Core URL state management implemented)
**Last Updated:** 2025-10-22
