# Bugfix: Dual-Fetch Architecture (Option A Implementation)

**Issue ID:** bugfix/circular-fetch-loop (extended)
**Created:** 2025-10-30
**Severity:** Critical - Architectural
**Component:** StateManagementService, BaseDataTableComponent, ResultsTableComponent

---

## Problem Summary

After fixing the circular fetch loop (3 calls → 2 calls), we still have **2 API calls** instead of 1 because we have **TWO SEPARATE data fetching systems**:

1. **StateManagementService.fetchVehicleData()** - Makes API call, stores results
2. **BaseDataTable.fetchData() → dataSource.fetch()** - Makes DUPLICATE API call

This violates the core architectural principle: **URL as single source of truth, StateManagementService as single data fetcher**.

---

## Architecture Analysis

### What The Guides Say

From `docs/state-management-guide.md`:

> **URL is Single Source of Truth**
> - All query state stored in URL parameters
> - StateManagementService reads URL, makes API calls, stores results
> - Components subscribe to state observables and display
> - Components are DUMB - they just render what state tells them

From `docs/state-flow-diagram.md` (lines 86-126):

> **STATE MANAGEMENT SERVICE**
> - Reads URL parameters
> - Fetches data via API
> - Stores in BehaviorSubject
> - Emits via observables: `results$`, `loading$`, `filters$`

### Current (Broken) Implementation

```typescript
// StateManagementService
updateFilters(filters) {
  this.fetchVehicleData().subscribe({  // ← API CALL #1
    next: (data) => {
      this.updateState({ results: data.results });  // Store in state
    }
  });
}

// ResultsTable
ngOnInit() {
  this.stateService.filters$.subscribe((filters) => {
    this.tableQueryParams = this.convertToTableParams(filters);
    // Pass queryParams to BaseDataTable
  });
}

// BaseDataTable
ngOnChanges() {
  if (queryParams changed) {
    this.fetchData();  // ← API CALL #2 (DUPLICATE!)
    this.dataSource.fetch(params).subscribe(...);
  }
}
```

**Problem:** Two independent fetching systems both making API calls.

---

## Solution: Option A Architecture

### Principle

**StateManagementService is the ONLY component that makes API calls.**

Components are purely presentational - they:
1. Subscribe to state observables
2. Display data they receive
3. Emit user interactions UP (never fetch themselves)

### Correct Flow

```
User clicks Apply
  ↓
DiscoverComponent.onPickerSelectionChange()
  ↓
StateManagementService.updateFilters({modelCombos: [...]})
  ↓
StateManagementService.fetchVehicleData()
  ├─ Makes API call via RequestCoordinator (ONLY CALL)
  ├─ Receives: { results: [...], total: 793, page: 1, size: 20 }
  └─ updateState({ results: [...], totalResults: 793, loading: false })
  ↓
StateManagementService.results$ emits new data
  ↓
ResultsTable subscribes to results$
  ├─ Receives: VehicleResult[]
  ├─ Also subscribes to: loading$, totalResults$, filters$ (for pagination/sort state)
  └─ Passes data to BaseDataTable via @Input
  ↓
BaseDataTable
  ├─ @Input() data: VehicleResult[]
  ├─ @Input() loading: boolean
  ├─ @Input() totalCount: number
  ├─ @Input() currentPage: number
  ├─ @Input() pageSize: number
  └─ Displays data (NO FETCHING)
```

### Key Changes Required

#### 1. BaseDataTableComponent

**Remove:**
- `fetchData()` method (NO fetching)
- `dataSource` property (NO data source)
- All API-related logic

**Change:**
- Accept data via `@Input() data: T[]`
- Accept loading via `@Input() loading: boolean`
- Accept pagination state via `@Input()`
- Become purely presentational

**Keep:**
- User interaction handlers (onPageChange, onSort, etc.)
- Emit events UP to parent

#### 2. ResultsTableComponent

**Remove:**
- `VehicleDataSourceAdapter` creation
- `tableQueryParams` conversion logic

**Change:**
- Subscribe to `results$`, `loading$`, `totalResults$` from StateManagementService
- Pass actual data to BaseDataTable via @Input
- Subscribe to `filters$` for pagination/sort state only

**Keep:**
- Event handlers that call StateManagementService.updateFilters()

#### 3. StateManagementService

**Keep as-is:**
- Already implements Option A correctly
- Fetches data, stores in state, emits observables

**Verify:**
- `results$` observable is working
- `loading$` observable updates correctly
- Data flows through state properly

---

## Implementation Plan

### Phase 1: BaseDataTable - Make it data-driven

```typescript
@Component({
  selector: 'app-base-data-table',
  // ...
})
export class BaseDataTableComponent<T> {
  // ========== INPUTS (Data from parent) ==========
  @Input() data: T[] = [];  // ← NEW: Receive data, don't fetch
  @Input() loading = false;  // ← NEW: Receive loading state
  @Input() totalCount = 0;   // ← NEW: Receive total for pagination
  @Input() currentPage = 1;  // ← NEW: Receive current page
  @Input() pageSize = 20;    // ← NEW: Receive page size
  @Input() sortBy?: string;  // ← NEW: Receive sort state
  @Input() sortOrder?: 'asc' | 'desc';  // ← NEW: Receive sort order

  // REMOVE: dataSource property
  // REMOVE: fetchData() method
  // REMOVE: All API/data-fetching logic

  // ========== OUTPUTS (Events to parent) ==========
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() sortChange = new EventEmitter<{column: string, order: 'asc'|'desc'}>();

  // ========== DISPLAY LOGIC ONLY ==========
  ngOnChanges(changes: SimpleChanges): void {
    // Just update view when @Input changes
    // NO fetching
    if (changes['data']) {
      this.cdr.markForCheck();
    }
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);  // Emit to parent, don't fetch
  }

  onSort(column: string): void {
    const newOrder = this.sortBy === column && this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ column, order: newOrder });  // Emit to parent, don't fetch
  }
}
```

### Phase 2: ResultsTable - Subscribe to state, pass data down

```typescript
export class ResultsTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data for BaseDataTable (from state)
  vehicleData: VehicleResult[] = [];
  isLoading = false;
  totalCount = 0;
  currentPage = 1;
  pageSize = 20;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  constructor(private stateService: StateManagementService) {}

  ngOnInit(): void {
    // Subscribe to results from StateManagementService
    this.stateService.results$
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        this.vehicleData = results;
      });

    // Subscribe to loading state
    this.stateService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.isLoading = loading;
      });

    // Subscribe to total count
    this.stateService.totalResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe((total) => {
        this.totalCount = total;
      });

    // Subscribe to filters for pagination/sort state
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        this.currentPage = filters.page || 1;
        this.pageSize = filters.size || 20;
        this.sortBy = filters.sort;
        this.sortOrder = filters.sortDirection;
      });
  }

  onPageChange(page: number): void {
    // Just update state, StateManagementService will fetch
    this.stateService.updateFilters({ page });
  }

  onPageSizeChange(size: number): void {
    this.stateService.updateFilters({ size, page: 1 });
  }

  onSortChange(sort: {column: string, order: 'asc'|'desc'}): void {
    this.stateService.updateFilters({
      sort: sort.column,
      sortDirection: sort.order,
      page: 1
    });
  }
}
```

### Phase 3: StateManagementService - Verify it updates state correctly

```typescript
fetchVehicleData(): Observable<VehicleDetailsResponse> {
  const filters = this.getCurrentFilters();

  // Set loading state
  this.updateState({ loading: true });

  return this.requestCoordinator.execute(/*...*/).pipe(
    tap((response) => {
      // Update state with results
      this.updateState({
        results: response.results,
        totalResults: response.total,
        loading: false,
        error: null
      });
    }),
    catchError((error) => {
      this.updateState({
        loading: false,
        error: error.message
      });
      return throwError(() => error);
    })
  );
}
```

---

## Testing Plan

### Manual Testing

**Test Case 1: Single API Call**
1. Open DevTools Network tab
2. Navigate to /discover
3. Select models in picker
4. Click "Apply"
5. **Verify:** Exactly **1 request** to `/api/v1/vehicles/details`
6. **Verify:** Results table updates with data

**Test Case 2: Pagination**
1. After test 1, clear network log
2. Click "Next Page"
3. **Verify:** Exactly **1 request** to `/api/v1/vehicles/details` with `page=2`
4. **Verify:** Results table updates

**Test Case 3: Sorting**
1. Clear network log
2. Click column header to sort
3. **Verify:** Exactly **1 request** with `sortBy=...`
4. **Verify:** Results update with sorted data

**Test Case 4: Loading State**
1. Select models, click Apply
2. **Verify:** Loading spinner shows immediately
3. **Verify:** Loading spinner disappears when data arrives
4. **Verify:** No stuck loading state

---

## Benefits of Option A

1. ✅ **Single API Call** - Only StateManagementService fetches
2. ✅ **Clear Separation** - State management vs presentation
3. ✅ **Testable** - Components are pure, easy to test
4. ✅ **Maintainable** - One place to debug data fetching
5. ✅ **Follows Angular Best Practices** - Smart/dumb component pattern
6. ✅ **Matches Documentation** - Implements architecture from guides

---

## Status

**Phase 1:** Pending - Refactor BaseDataTable to be data-driven
**Phase 2:** Pending - Update ResultsTable to subscribe to state
**Phase 3:** Complete - StateManagementService already implements Option A

---

**END OF ARCHITECTURE BUGFIX DOCUMENT**
