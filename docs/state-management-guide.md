# AUTOS State Management & Component Hydration Guide

**Created:** 2025-10-15  
**Updated:** 2025-10-18  
**Version:** 1.1.0  
**Purpose:** Complete reference for state management patterns and component hydration in AUTOS

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Architecture Overview](#architecture-overview)
3. [Services](#services)
4. [Component Hydration Patterns](#component-hydration-patterns)
5. [Storage Layers](#storage-layers)
6. [Data Flow Examples](#data-flow-examples)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)
9. [Testing Guidelines](#testing-guidelines)
10. [Troubleshooting](#troubleshooting)

---

## Core Principles

### 1. URL as Single Source of Truth

**All query-related state lives in the URL.**

**Why?**

- ✅ Shareable (copy/paste URL)
- ✅ Bookmarkable
- ✅ Browser navigation (back/forward)
- ✅ Deep linking
- ✅ Survives page refresh

**What goes in URL:**

- Selected manufacturer/model combinations
- Active filters (manufacturer, model, year range, body class, data source)
- Current sort column and direction
- Current page number
- Page size

**Example URL:**

```
http://autos.minilab/workshop?models=Ford:F-150,Chevrolet:Corvette&page=2&sortBy=year&sortOrder=desc&yearMin=1960&yearMax=1980
```

---

### 2. Separation of Concerns

**Two Independent Storage Layers:**

#### Layer 1: URL (Query State)

- **Purpose:** Store query-related state that defines WHAT data is displayed
- **Managed By:** `StateManagementService` + `RouteStateService`
- **Storage:** Browser URL query parameters
- **Characteristics:** Shareable, bookmarkable, survives refresh

#### Layer 2: localStorage (UI Preferences)

- **Purpose:** Store user preferences that control HOW data is presented
- **Managed By:** `TableStatePersistenceService` (for tables)
- **Storage:** Browser localStorage
- **Characteristics:** Private, per-browser, persists across sessions

**Critical Rule:** NEVER mix these concerns. Query state in URL only, UI preferences in localStorage only.

---

### 3. Input-Based Component Hydration

**Components receive state via @Input, not direct service injection.**

**Why?**

- ✅ Predictable data flow (explicit inputs)
- ✅ Easier testing (mock inputs vs mock services)
- ✅ Reusable components (not coupled to specific services)
- ✅ Clear parent-child contracts

**Pattern:**

```typescript
// ✅ CORRECT: Input-based hydration
@Component({...})
export class MyTableComponent {
  @Input() queryParams: TableQueryParams;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['queryParams']) {
      this.hydrate();
    }
  }
}

// ❌ WRONG: Direct service subscription
@Component({...})
export class MyTableComponent {
  constructor(private stateService: StateManagementService) {
    this.stateService.filters$.subscribe(filters => {
      this.hydrate(filters); // Tight coupling
    });
  }
}
```

---

### 4. Idempotent Hydration

**Hydration must be safe to call multiple times without side effects.**

**Why?**

- Browser back/forward navigation triggers re-hydration
- URL changes from external sources
- Component re-initialization

**Pattern:**

```typescript
private hydrate(): void {
  // Always clear first (idempotent)
  this.clearState();

  // Then apply new state
  this.applyState(this.queryParams);

  // Safe to call multiple times
}
```

---

### 5. Unified Event Emission

**Emit single event with complete state, not multiple partial events.**

**Why?**

- ✅ Single URL update (not multiple)
- ✅ Single re-render (not multiple)
- ✅ Predictable change detection
- ✅ Easier debugging

**Pattern:**

```typescript
// ✅ CORRECT: Single unified event
@Output() queryParamsChange = new EventEmitter<TableQueryParams>();

private updateState(): void {
  this.queryParamsChange.emit({
    page: this.page,
    size: this.size,
    sortBy: this.sortBy,
    sortOrder: this.sortOrder,
    filters: this.filters
  });
}

// ❌ WRONG: Multiple partial events
@Output() pageChange = new EventEmitter<number>();
@Output() sortChange = new EventEmitter<{sortBy: string, sortOrder: string}>();
@Output() filterChange = new EventEmitter<any>();
```

---

## Architecture Overview

### Service Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER URL                              │
│  ?models=Ford:F-150&page=2&sortBy=year&sortOrder=desc      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              RouteStateService                              │
│  Low-level URL parameter management                         │
│  • getQueryParam(key: string): string | null               │
│  • setQueryParam(key: string, value: string): void         │
│  • watchQueryParam(key: string): Observable<string | null> │
│  • removeQueryParam(key: string): void                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           StateManagementService                            │
│  High-level business logic                                  │
│  • filters$: Observable<SearchFilters>                      │
│  • updateFilters(filters: Partial<SearchFilters>): void    │
│  • fetchVehicleData(): Observable<VehicleDetailsResponse>  │
│  • Uses RequestCoordinatorService internally               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         RequestCoordinatorService                           │
│  Request deduplication, caching, retry logic                │
│  • execute<T>(key, requestFn, config): Observable<T>       │
│  • getLoadingState$(key): Observable<RequestState>         │
│  • globalLoading$: Observable<boolean>                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ApiService                                 │
│  HTTP client wrapper                                        │
│  • getVehicleDetails(...): Observable<VehicleResponse>      │
│  • getVehicleInstances(...): Observable<InstanceResponse>   │
└─────────────────────────────────────────────────────────────┘
```

### Component Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Parent Component                          │
│  (e.g., WorkshopComponent, DiscoverComponent)               │
│                                                              │
│  constructor(private stateService: StateManagementService)  │
│                                                              │
│  ngOnInit() {                                               │
│    this.stateService.filters$.subscribe(filters => {       │
│      this.tableQueryParams = this.convert(filters);        │
│    });                                                      │
│  }                                                          │
│                                                              │
│  onTableQueryChange(params: TableQueryParams) {             │
│    const filters = this.convertBack(params);               │
│    this.stateService.updateFilters(filters);               │
│  }                                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ [tableQueryParams]="..."
                     │ (queryParamsChange)="..."
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Child Component (Table)                       │
│  (e.g., BaseDataTableComponent, VehicleResultsTable)        │
│                                                              │
│  @Input() queryParams: TableQueryParams;                    │
│  @Output() queryParamsChange = new EventEmitter<...>();     │
│                                                              │
│  ngOnChanges(changes: SimpleChanges) {                      │
│    if (changes['queryParams']) {                            │
│      this.hydrate();                                        │
│    }                                                        │
│  }                                                          │
│                                                              │
│  onUserInteraction() {                                      │
│    this.queryParamsChange.emit(newParams);                  │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Services

### RouteStateService

**Purpose:** Low-level URL parameter management

**Responsibilities:**

- Read/write URL query parameters
- Watch for URL changes
- Navigate with updated params
- NO business logic

**Key Methods:**

```typescript
export class RouteStateService {
  /**
   * Get a single query parameter value
   */
  getQueryParam(key: string): string | null;

  /**
   * Set a single query parameter
   * Triggers navigation with updated URL
   */
  setQueryParam(key: string, value: string): void;

  /**
   * Watch for changes to a query parameter
   * Returns Observable that emits on every URL change
   */
  watchQueryParam(key: string): Observable<string | null>;

  /**
   * Remove a query parameter
   */
  removeQueryParam(key: string): void;

  /**
   * Get all query parameters as object
   */
  getAllQueryParams(): { [key: string]: string };

  /**
   * Update multiple query parameters at once
   */
  updateQueryParams(params: { [key: string]: string | null }): void;
}
```

**Usage Example:**

```typescript
// Read URL parameter
const page = this.routeState.getQueryParam('page');

// Write URL parameter
this.routeState.setQueryParam('page', '2');

// Watch for changes
this.routeState.watchQueryParam('models').subscribe((models) => {
  console.log('Models changed:', models);
});
```

---

### StateManagementService

**Purpose:** High-level business logic and state orchestration

**Responsibilities:**

- Maintain application state (filters, results, loading, errors)
- Sync state to/from URL
- Trigger API calls via RequestCoordinatorService
- Expose observables for components to subscribe
- Parse/format URL parameters (e.g., "Ford:F-150" ↔ modelCombos)

**Key Properties:**

```typescript
export class StateManagementService {
  /**
   * Complete application state
   * Private, use specific observables below
   */
  private state$ = new BehaviorSubject<AppState>({
    filters: {},
    results: [],
    totalResults: 0,
    loading: false,
    error: null,
  });

  /**
   * Observable of current filters
   * Distinct until changed (deep comparison)
   */
  public filters$ = this.state$.pipe(
    map((state) => state.filters),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  );

  /**
   * Observable of current results
   */
  public results$ = this.state$.pipe(map((state) => state.results));

  /**
   * Observable of loading state
   */
  public loading$ = this.state$.pipe(map((state) => state.loading));

  /**
   * Observable of error state
   */
  public error$ = this.state$.pipe(map((state) => state.error));
}
```

**Key Methods:**

```typescript
/**
 * Update filters and sync to URL
 * Triggers API call if modelCombos present
 */
updateFilters(filters: Partial<SearchFilters>): void {
  // 1. Merge with current filters
  const currentFilters = this.getCurrentFilters();
  const newFilters = { ...currentFilters, ...filters };

  // 2. Update internal state
  this.updateState({ filters: newFilters });

  // 3. Sync to URL
  this.syncStateToUrl();

  // 4. Trigger API call
  if (newFilters.modelCombos && newFilters.modelCombos.length > 0) {
    this.fetchVehicleData().subscribe();
  } else {
    this.updateState({ results: [], totalResults: 0 });
  }
}

/**
 * Update specific filter property (convenience method)
 */
updatePage(page: number): void {
  this.updateFilters({ page });
}

/**
 * Fetch vehicle data from API
 * Uses RequestCoordinatorService for deduplication/caching
 */
fetchVehicleData(): Observable<VehicleDetailsResponse> {
  const filters = this.getCurrentFilters();
  const cacheKey = this.buildCacheKey('vehicle-details', filters);

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
  );
}

/**
 * Get current filters synchronously
 */
getCurrentFilters(): SearchFilters {
  return this.state$.value.filters;
}
```

**Usage Example:**

```typescript
@Component({...})
export class WorkshopComponent implements OnInit {
  constructor(private stateService: StateManagementService) {}

  ngOnInit(): void {
    // Subscribe to filters
    this.stateService.filters$.subscribe(filters => {
      console.log('Filters changed:', filters);
    });

    // Subscribe to results
    this.stateService.results$.subscribe(results => {
      console.log('Results:', results);
    });
  }

  onFilterChange(): void {
    this.stateService.updateFilters({
      yearMin: 1960,
      yearMax: 1980
    });
  }
}
```

---

### RequestCoordinatorService (NEW in v1.1.0)

**Purpose:** Request deduplication, caching, and retry logic

**Responsibilities:**

- Deduplicate identical concurrent requests
- Cache responses with configurable TTL
- Retry failed requests with exponential backoff
- Provide per-request and global loading states
- Cancel requests on navigation

**Key Methods:**

```typescript
export class RequestCoordinatorService {
  /**
   * Execute a request with coordination
   */
  execute<T>(
    key: string,
    requestFn: () => Observable<T>,
    config: RequestConfig = {}
  ): Observable<T>;

  /**
   * Get loading state for specific request
   */
  getLoadingState$(key: string): Observable<RequestState>;

  /**
   * Global loading state (any request loading)
   */
  globalLoading$: Observable<number>;

  /**
   * Check if any requests are loading
   */
  isAnyLoading(): boolean;

  /**
   * Cancel all active requests
   */
  cancelAll(): void;

  /**
   * Clear cache for specific key or all
   */
  clearCache(key?: string): void;
}
```

**Configuration:**

```typescript
interface RequestConfig {
  cacheTime?: number; // Cache duration in ms (0 = no cache)
  deduplication?: boolean; // Deduplicate identical requests
  retryAttempts?: number; // Number of retry attempts
  retryDelay?: number; // Initial retry delay (exponential backoff)
}

interface RequestState {
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}
```

**Usage Example:**

```typescript
// In StateManagementService
fetchVehicleData(): Observable<VehicleDetailsResponse> {
  const cacheKey = 'vehicle-details-' + JSON.stringify(this.filters);

  return this.requestCoordinator.execute(
    cacheKey,
    () => this.apiService.getVehicleDetails(...),
    {
      cacheTime: 30000,      // 30 second cache
      deduplication: true,   // Prevent duplicate requests
      retryAttempts: 2,      // Retry twice
      retryDelay: 1000       // 1s initial delay
    }
  );
}

// In component - watch loading state
loadingState$ = this.stateService.getVehicleDataLoadingState$();
globalLoading$ = this.requestCoordinator.globalLoading$;
```

**Benefits:**

- ✅ Multiple components can call same API without duplicate requests
- ✅ Responses cached temporarily to reduce server load
- ✅ Automatic retries for transient failures
- ✅ Coordinated loading states across application
- ✅ Request cancellation on navigation

---

### TableStatePersistenceService

**Purpose:** Persist table UI preferences to localStorage

**Responsibilities:**

- Save/load column order
- Save/load column visibility
- Save/load page size preference
- Per-table storage (using tableId)
- NO query state (that belongs in URL)

**Key Methods:**

```typescript
export class TableStatePersistenceService {
  /**
   * Save table preferences to localStorage
   */
  savePreferences(tableId: string, prefs: TablePreferences): void;

  /**
   * Load table preferences from localStorage
   */
  loadPreferences(tableId: string): TablePreferences | null;

  /**
   * Reset table preferences (delete from localStorage)
   */
  resetPreferences(tableId: string): void;
}

interface TablePreferences {
  columnOrder: string[]; // Array of column keys
  visibleColumns: string[]; // Array of visible column keys
  pageSize?: number; // Preferred page size
  lastUpdated?: number; // Timestamp
}
```

**Storage Key Pattern:**

```
localStorage key: `autos-table-${tableId}-preferences`
```

**Usage Example:**

```typescript
// In BaseDataTableComponent
ngOnInit(): void {
  // Load preferences
  const prefs = this.persistenceService.loadPreferences(this.tableId);
  if (prefs) {
    this.applyColumnOrder(prefs.columnOrder);
    this.applyColumnVisibility(prefs.visibleColumns);
    this.pageSize = prefs.pageSize || 20;
  }
}

private saveColumnState(): void {
  const prefs: TablePreferences = {
    columnOrder: this.columns.map(col => col.key),
    visibleColumns: this.columns.filter(col => col.visible).map(col => col.key),
    pageSize: this.pageSize,
    lastUpdated: Date.now()
  };

  this.persistenceService.savePreferences(this.tableId, prefs);
}
```

---

## Component Hydration Patterns

### Pattern 1: Input-Based Hydration (Recommended)

**Use Case:** Dumb/presentational components, reusable tables

**Example: BaseDataTableComponent**

```typescript
@Component({
  selector: 'app-base-data-table',
  template: '...',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseDataTableComponent<T> implements OnInit, OnChanges {
  @Input() queryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  @Output() queryParamsChange = new EventEmitter<TableQueryParams>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['queryParams'] && !changes['queryParams'].firstChange) {
      this.hydrateFromQueryParams();
    }
  }

  ngOnInit(): void {
    // Initial hydration
    this.hydrateFromQueryParams();
  }

  private hydrateFromQueryParams(): void {
    if (!this.queryParams) return;

    // Always clear first (idempotent)
    this.clearAllFilters();

    // Apply new state
    if (this.queryParams.filters) {
      Object.keys(this.queryParams.filters).forEach((key) => {
        this.filters[key] = this.queryParams.filters![key];
      });
    }

    this.sortBy = this.queryParams.sortBy;
    this.sortOrder = this.queryParams.sortOrder;
    this.currentPage = this.queryParams.page || 1;
    this.pageSize = this.queryParams.size || 20;

    // Fetch data
    this.fetchData();
  }

  private fetchData(): void {
    // Use dataSource to fetch
    this.dataSource.fetch(this.queryParams).subscribe((response) => {
      this.tableData = response.results;
      this.totalCount = response.total;

      // Emit complete state to parent
      this.queryParamsChange.emit({
        page: this.currentPage,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        filters: this.filters,
      });
    });
  }
}
```

**Parent Component:**

```typescript
@Component({
  selector: 'app-workshop',
  template: `
    <app-base-data-table
      [queryParams]="tableQueryParams$ | async"
      (queryParamsChange)="onTableQueryChange($event)"
    >
    </app-base-data-table>
  `,
})
export class WorkshopComponent implements OnInit {
  tableQueryParams$: Observable<TableQueryParams>;

  constructor(private stateService: StateManagementService) {}

  ngOnInit(): void {
    this.tableQueryParams$ = this.stateService.filters$.pipe(
      map((filters) => this.convertToTableParams(filters))
    );
  }

  onTableQueryChange(params: TableQueryParams): void {
    const filters = this.convertToSearchFilters(params);
    this.stateService.updateFilters(filters);
  }

  private convertToTableParams(filters: SearchFilters): TableQueryParams {
    return {
      page: filters.page || 1,
      size: filters.size || 20,
      sortBy: filters.sort,
      sortOrder: filters.sortDirection,
      filters: {
        manufacturer: filters.manufacturer,
        model: filters.model,
        yearMin: filters.yearMin,
        yearMax: filters.yearMax,
        bodyClass: filters.bodyClass,
        dataSource: filters.dataSource,
      },
    };
  }

  private convertToSearchFilters(
    params: TableQueryParams
  ): Partial<SearchFilters> {
    return {
      page: params.page,
      size: params.size,
      sort: params.sortBy,
      sortDirection: params.sortOrder,
      manufacturer: params.filters?.manufacturer,
      model: params.filters?.model,
      yearMin: params.filters?.yearMin,
      yearMax: params.filters?.yearMax,
      bodyClass: params.filters?.bodyClass,
      dataSource: params.filters?.dataSource,
    };
  }
}
```

---

### Pattern 2: Service-Based Hydration (Smart Components)

**Use Case:** Container/smart components that orchestrate state

**Example: DiscoverComponent**

```typescript
@Component({
  selector: 'app-discover',
  template: '...',
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Expose state as observables for child components
  filters$ = this.stateService.filters$;
  results$ = this.stateService.results$;
  loading$ = this.stateService.loading$;
  error$ = this.stateService.error$;

  constructor(private stateService: StateManagementService) {}

  ngOnInit(): void {
    // Component hydrates automatically from StateManagementService
    // which hydrates from URL on initialization

    // Watch for filter changes to update UI
    this.filters$.pipe(takeUntil(this.destroy$)).subscribe((filters) => {
      console.log('Filters updated:', filters);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Event handlers update state
  onModelSelectionChange(modelCombos: ManufacturerModelSelection[]): void {
    this.stateService.updateFilters({ modelCombos, page: 1 });
  }
}
```

---

## Storage Layers

### Layer 1: URL (Query State)

**Purpose:** Store query-related state

**Contents:**

- Selected manufacturer/model combinations
- Active filters
- Sort column and direction
- Current page and page size

**Example:**

```
http://autos.minilab/workshop?models=Ford:F-150,Chevrolet:Corvette&page=2&sortBy=year&sortOrder=desc&yearMin=1960&yearMax=1980
```

**Characteristics:**

- ✅ Shareable (copy/paste URL)
- ✅ Bookmarkable
- ✅ Survives page refresh
- ✅ Browser navigation (back/forward)
- ✅ Deep linking
- ❌ Not private (visible in URL)

**When to Use:**

- Any state that affects WHAT data is displayed
- Any state that should be shareable
- Any state that should survive refresh

**When NOT to Use:**

- UI preferences (column order, theme, etc.)
- Transient UI state (drawer open/closed)
- Private/sensitive data

---

### Layer 2: localStorage (UI Preferences)

**Purpose:** Store user preferences

**Contents:**

- Column order (user's preferred arrangement)
- Column visibility (which columns shown/hidden)
- Default page size preference
- Panel collapse states
- Theme preferences

**Example:**

```json
{
  "autos-table-vehicle-results-preferences": {
    "columnOrder": ["manufacturer", "model", "year", "body_class"],
    "visibleColumns": ["manufacturer", "model", "year"],
    "pageSize": 50,
    "lastUpdated": 1697654321000
  }
}
```

**Characteristics:**

- ✅ Private (not in URL)
- ✅ Persists across sessions
- ✅ Per-browser/device
- ❌ Not shareable
- ❌ Lost if localStorage cleared

**When to Use:**

- UI preferences that control HOW data is presented
- Per-user customizations
- Non-critical state that enhances UX

**When NOT to Use:**

- Query state (use URL)
- Cross-device state (use backend/preferences API)
- Critical application state

---

### Critical Rule: Never Mix Storage Layers

```typescript
// ❌ WRONG: Column order in URL
?columns=manufacturer,model,year  // Don't do this!

// ✅ CORRECT: Column order in localStorage
localStorage: "autos-table-vehicle-results-preferences"

// ✅ CORRECT: Filters in URL
?manufacturer=Ford&yearMin=1960

// ❌ WRONG: Filters in localStorage
localStorage: "saved-filters"  // Don't do this for active filters!
```

---

## Data Flow Examples

### Example 1: User Changes Filter

```
1. User types in filter input
   ↓
2. Component debounces input (300ms)
   ↓
3. Component calls: this.queryParamsChange.emit({ filters: { manufacturer: 'Ford' } })
   ↓
4. Parent receives event: onTableQueryChange(params)
   ↓
5. Parent converts: const filters = convertToSearchFilters(params)
   ↓
6. Parent calls: this.stateService.updateFilters(filters)
   ↓
7. StateManagementService:
   - Merges with current filters
   - Updates internal state
   - Syncs to URL via RouteStateService
   - Triggers API call via RequestCoordinatorService
   ↓
8. RequestCoordinatorService:
   - Checks for duplicate in-flight requests
   - Checks cache
   - Executes API call (or returns cached)
   - Updates loading state
   ↓
9. API response received
   ↓
10. StateManagementService updates state with results
    ↓
11. State observables emit new values
    ↓
12. Components receive new state via subscriptions
    ↓
13. Component re-hydrates from new state
    ↓
14. UI updates with new data
```

### Example 2: User Navigates with Browser Back Button

```
1. User clicks browser back button
   ↓
2. Angular Router detects URL change
   ↓
3. RouteStateService query parameter observables emit new values
   ↓
4. StateManagementService watchUrlChanges() detects change
   ↓
5. StateManagementService calls: this.initializeFromUrl()
   ↓
6. URL parameters parsed and converted to SearchFilters
   ↓
7. StateManagementService updates internal state
   ↓
8. State observables emit new values
   ↓
9. Parent component receives new state
   ↓
10. Parent converts to TableQueryParams
    ↓
11. Child component @Input() receives new queryParams
    ↓
12. Child ngOnChanges() triggers
    ↓
13. Child calls: this.hydrateFromQueryParams()
    ↓
14. Child clears old state (idempotent)
    ↓
15. Child applies new state
    ↓
16. Child fetches data with new params
    ↓
17. UI updates with historical state
```

### Example 3: User Reorders Table Columns

```
1. User drags column header to new position
   ↓
2. BaseDataTableComponent handles drag event
   ↓
3. Component updates internal column order array
   ↓
4. Component calls: this.saveColumnState()
   ↓
5. TableStatePersistenceService.savePreferences(tableId, prefs)
   ↓
6. Preferences saved to localStorage
   ↓
7. Component re-renders with new column order
   ↓
8. NO URL change (UI preference, not query state)
   ↓
9. NO API call (data unchanged, just presentation)
   ↓
10. Next page refresh loads column order from localStorage
```

---

## Best Practices

### DO ✅

1. **Use URL for query state**

   ```typescript
   // Filters, sort, pagination → URL
   this.stateService.updateFilters({ yearMin: 1960 });
   ```

2. **Use localStorage for UI preferences**

   ```typescript
   // Column order, visibility → localStorage
   this.persistenceService.savePreferences(tableId, prefs);
   ```

3. **Use input-based hydration for reusable components**

   ```typescript
   @Input() queryParams: TableQueryParams;
   ngOnChanges() { this.hydrate(); }
   ```

4. **Make hydration idempotent**

   ```typescript
   private hydrate(): void {
     this.clear(); // Always clear first
     this.apply(this.queryParams);
   }
   ```

5. **Emit unified events**

   ```typescript
   @Output() queryParamsChange = new EventEmitter<TableQueryParams>();
   // Single event with complete state
   ```

6. **Use OnPush change detection**

   ```typescript
   @Component({
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   ```

7. **Use trackBy functions**

   ```typescript
   trackByColumnKey(index: number, column: TableColumn): string {
     return column.key as string;
   }
   ```

8. **Debounce user input**
   ```typescript
   subject.pipe(debounceTime(300), distinctUntilChanged());
   ```

---

### DON'T ❌

1. **Don't put UI preferences in URL**

   ```typescript
   // ❌ WRONG
   ?columnOrder=manufacturer,model,year

   // ✅ CORRECT
   localStorage: "autos-table-vehicle-results-preferences"
   ```

2. **Don't put query state in localStorage**

   ```typescript
   // ❌ WRONG
   localStorage.setItem('currentFilters', JSON.stringify(filters));

   // ✅ CORRECT
   this.stateService.updateFilters(filters); // → URL
   ```

3. **Don't inject StateManagementService in reusable components**

   ```typescript
   // ❌ WRONG
   export class BaseDataTableComponent {
     constructor(private stateService: StateManagementService) {}
   }

   // ✅ CORRECT
   export class BaseDataTableComponent {
     @Input() queryParams: TableQueryParams;
   }
   ```

4. **Don't have side effects in hydration**

   ```typescript
   // ❌ WRONG
   private hydrate(): void {
     this.filters = { ...this.filters, ...newFilters }; // Accumulates!
   }

   // ✅ CORRECT
   private hydrate(): void {
     this.clear(); // Always clear first
     this.apply(newState);
   }
   ```

5. **Don't emit multiple partial events**

   ```typescript
   // ❌ WRONG
   this.pageChange.emit(2);
   this.sortChange.emit({ sortBy: 'year', sortOrder: 'asc' });

   // ✅ CORRECT
   this.queryParamsChange.emit({
     page: 2,
     sortBy: 'year',
     sortOrder: 'asc',
     filters: this.filters,
   });
   ```

6. **Don't skip idempotency**

   ```typescript
   // ❌ WRONG
   ngOnChanges(changes) {
     if (changes['queryParams']) {
       this.applyFilters(changes['queryParams'].currentValue);
       // What if called multiple times?
     }
   }

   // ✅ CORRECT
   ngOnChanges(changes) {
     if (changes['queryParams']) {
       this.clearFilters(); // Clear first
       this.applyFilters(changes['queryParams'].currentValue);
     }
   }
   ```

---

## Common Patterns

### Pattern: Parent-Child State Conversion

**Problem:** Parent uses `SearchFilters`, child uses `TableQueryParams`

**Solution:** Convert at the boundary

```typescript
// In parent component
export class WorkshopComponent {
  tableQueryParams$ = this.stateService.filters$.pipe(
    map((filters) => ({
      page: filters.page || 1,
      size: filters.size || 20,
      sortBy: filters.sort,
      sortOrder: filters.sortDirection,
      filters: {
        manufacturer: filters.manufacturer,
        model: filters.model,
        yearMin: filters.yearMin,
        yearMax: filters.yearMax,
      },
    }))
  );

  onTableQueryChange(params: TableQueryParams): void {
    this.stateService.updateFilters({
      page: params.page,
      size: params.size,
      sort: params.sortBy,
      sortDirection: params.sortOrder,
      manufacturer: params.filters?.manufacturer,
      model: params.filters?.model,
      yearMin: params.filters?.yearMin,
      yearMax: params.filters?.yearMax,
    });
  }
}
```

---

### Pattern: Lazy Loading Expansion Data

**Problem:** Expansion content needs data from API

**Solution:** Emit event on expand, parent handles loading

```typescript
// Child component
@Output() rowExpand = new EventEmitter<T>();

onExpandChange(row: T, expanded: boolean): void {
  if (expanded && !this.hasLoadedData(row)) {
    this.rowExpand.emit(row);
  }
}

// Parent component
onRowExpand(vehicle: VehicleResult): void {
  this.apiService
    .getVehicleInstances(vehicle.vehicle_id)
    .subscribe(instances => {
      this.expandedData.set(vehicle.vehicle_id, instances);
    });
}
```

---

### Pattern: Debounced Filter Input

**Problem:** User types quickly, don't want API call per keystroke

**Solution:** Debounce with RxJS Subject

```typescript
private filterSubjects = new Map<string, Subject<string>>();

setupFilterDebouncing(column: TableColumn): void {
  const subject = new Subject<string>();
  this.filterSubjects.set(column.key as string, subject);

  subject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    takeUntil(this.destroy$)
  ).subscribe(value => {
    this.updateFilter(column.key as string, value);
  });
}

onFilterInput(column: TableColumn, value: string): void {
  const subject = this.filterSubjects.get(column.key as string);
  if (subject) {
    subject.next(value);
  }
}
```

---

## Testing Guidelines

### Testing Input-Based Hydration

```typescript
describe('BaseDataTableComponent', () => {
  it('should hydrate from queryParams input', () => {
    const component = new BaseDataTableComponent(/* deps */);

    component.queryParams = {
      page: 2,
      size: 50,
      sortBy: 'year',
      sortOrder: 'desc',
      filters: { manufacturer: 'Ford' },
    };

    component.ngOnChanges({
      queryParams: new SimpleChange(null, component.queryParams, false),
    });

    expect(component.currentPage).toBe(2);
    expect(component.pageSize).toBe(50);
    expect(component.sortBy).toBe('year');
    expect(component.sortOrder).toBe('desc');
    expect(component.filters['manufacturer']).toBe('Ford');
  });

  it('should be idempotent', () => {
    const component = new BaseDataTableComponent(/* deps */);

    component.queryParams = { page: 1, size: 20, filters: {} };
    component.ngOnChanges({
      queryParams: new SimpleChange(null, component.queryParams, false),
    });

    const firstState = { ...component };

    // Call again with same params
    component.ngOnChanges({
      queryParams: new SimpleChange(
        component.queryParams,
        component.queryParams,
        false
      ),
    });

    expect(component).toEqual(firstState);
  });
});
```

---

### Testing State Service

```typescript
describe('StateManagementService', () => {
  it('should update filters and sync to URL', () => {
    const routeState = jasmine.createSpyObj('RouteStateService', ['setQueryParam']);
    const service = new StateManagementService(routeState, /* other deps */);

    service.updateFilters({ yearMin: 1960, yearMax: 1980 });

    expect(routeState.setQueryParam).toHaveBeenCalledWith('yearMin', '1960');
    expect(routeState.setQueryParam).toHaveBeenCalledWith('yearMax', '1980');
  });

  it('should trigger API call when modelCombos present', () => {
    const apiService = jasmine.createSpyObj('ApiService', ['getVehicleDetails']);
    apiService.getVehicleDetails.and.returnValue(of({ results: [], total: 0 }));

    const service = new StateManagementService(/* deps */, apiService);

    service.updateFilters({
      modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }]
    });

    expect(apiService.getVehicleDetails).toHaveBeenCalled();
  });
});
```

---

## Troubleshooting

### Problem: State not updating on URL change

**Symptoms:**

- Browser back/forward doesn't update UI
- Direct URL navigation doesn't work

**Solution:**

```typescript
// Ensure StateManagementService watches URL
private watchUrlChanges(): void {
  this.routeState.watchQueryParam('models').subscribe(() => {
    this.initializeFromUrl();
  });
}
```

---

### Problem: Component hydrates from stale data

**Symptoms:**

- UI shows old data after navigation
- Filter inputs show wrong values

**Solution:**

```typescript
// Always clear before applying new state
private hydrate(): void {
  this.clear(); // ← Don't skip this!
  this.apply(this.queryParams);
}
```

---

### Problem: Multiple API calls for same data

**Symptoms:**

- Network tab shows duplicate requests
- Performance degradation

**Solution:**

```typescript
// Use RequestCoordinatorService
fetchVehicleData(): Observable<VehicleDetailsResponse> {
  return this.requestCoordinator.execute(
    cacheKey,
    () => this.apiService.getVehicleDetails(...),
    {
      cacheTime: 30000,
      deduplication: true
    }
  );
}
```

---

### Problem: localStorage not persisting

**Symptoms:**

- Column order resets on refresh
- UI preferences lost

**Solution:**

```typescript
// Ensure saving after changes
onColumnOrderChange(): void {
  this.updateColumnOrder();
  this.saveColumnState(); // ← Don't forget this!
}

private saveColumnState(): void {
  this.persistenceService.savePreferences(this.tableId, {
    columnOrder: this.getColumnOrder(),
    visibleColumns: this.getVisibleColumns(),
    pageSize: this.pageSize
  });
}
```

---

## Changelog

### 2025-10-18 (v1.1.0)

- **Added RequestCoordinatorService** documentation
  - Request deduplication and caching
  - Retry logic with exponential backoff
  - Per-request and global loading states
- **Updated StateManagementService** to reflect API triggering
  - Clarified that `updateFilters()` now triggers API calls
  - Documented integration with RequestCoordinatorService
- **Enhanced Data Flow Examples** to include RequestCoordinatorService
- **Added troubleshooting section** for multiple API calls
- **Updated architecture diagrams** to show RequestCoordinatorService layer

### 2025-10-15 (v1.0.0)

- Initial document creation
- Core principles established
- Service responsibilities documented
- Component hydration patterns defined
- Storage layer separation explained
- Data flow examples provided
- Best practices and common patterns documented

---

**Last Updated:** 2025-10-18  
**Author:** Claude (with odin)  
**Version:** 1.1.0

---

**END OF STATE MANAGEMENT GUIDE**

This document should be referenced when:

- Implementing new components with state
- Debugging state-related issues
- Onboarding new developers
- Reviewing architecture decisions
- Planning new features
