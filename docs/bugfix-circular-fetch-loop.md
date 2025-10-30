# Bugfix: Circular Fetch Loop in BaseDataTable Component

**Issue ID:** bugfix/circular-fetch-loop
**Created:** 2025-10-30
**Severity:** High
**Component:** BaseDataTableComponent, ResultsTableComponent
**Branch:** `bugfix/circular-fetch-loop`
**Base Commit:** `06b035d` ("Make column management buttons configurable")

---

## Table of Contents

1. [Problem Summary](#problem-summary)
2. [Impact](#impact)
3. [Reproduction Steps](#reproduction-steps)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Architecture Violation](#architecture-violation)
6. [Console Logs](#console-logs)
7. [Code Analysis](#code-analysis)
8. [Proposed Solution](#proposed-solution)
9. [Testing Plan](#testing-plan)
10. [Related Documentation](#related-documentation)

---

## Problem Summary

**Symptom:** Clicking "Apply" in the Model Picker triggers **3 identical API calls** to `/api/v1/vehicles/details` instead of 1.

**Example:**
```
GET /api/v1/vehicles/details?models=Brammo:Street%20Bikes,Brammo:Dual%20Sport,Brammo:Scooter,Brammo:Touring,Brammo:Urban&page=1&size=20
GET /api/v1/vehicles/details?models=Brammo:Street%20Bikes,Brammo:Dual%20Sport,Brammo:Scooter,Brammo:Touring,Brammo:Urban&page=1&size=20
GET /api/v1/vehicles/details?models=Brammo:Street%20Bikes,Brammo:Dual%20Sport,Brammo:Scooter,Brammo:Touring,Brammo:Urban&page=1&size=20
```

**Root Cause:** Circular feedback loop between `BaseDataTableComponent` and `ResultsTableComponent` caused by emitting `queryParamsChange` during initial hydration, violating unidirectional data flow.

---

## Impact

### Performance Impact
- **3x API Load:** Every user interaction triggers 3 identical backend requests
- **3x Database Queries:** Elasticsearch executes the same query 3 times
- **Network Waste:** Unnecessary bandwidth consumption
- **Response Time:** Slower perceived performance due to multiple sequential requests

### Architecture Impact
- **Violates Unidirectional Data Flow:** State flows down, events flow up (violated)
- **Circular Dependency:** Component creates feedback loop with itself
- **RequestCoordinator Bypass:** Deduplication fails due to timing/sequential execution
- **State Management Integrity:** Multiple state updates for single user action

### User Experience Impact
- Noticeable delay when interacting with picker
- Potential race conditions if requests return out of order
- Unnecessary loading states

---

## Reproduction Steps

1. Navigate to http://autos.minilab/discover
2. Open Browser DevTools → Network tab
3. In Model Picker (left panel), check any manufacturer (e.g., "Brammo")
4. Select multiple models (e.g., Street Bikes, Dual Sport, Scooter, Touring, Urban)
5. Click "Apply" button
6. **Observe:** Network tab shows **3 identical requests** to `/api/v1/vehicles/details`

**Expected:** 1 API call
**Actual:** 3 API calls with identical parameters

---

## Root Cause Analysis

### The Circular Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      CIRCULAR FETCH LOOP                         │
└──────────────────────────────────────────────────────────────────┘

1. User clicks "Apply"
   ↓
2. Picker emits selectionChange
   ↓
3. DiscoverComponent.onPickerSelectionChange()
   ↓
4. StateManagementService.updateFilters({modelCombos: [...]})
   ↓
5. StateManagementService.syncStateToUrl()
   ↓
6. StateManagementService.fetchVehicleData()  ← ✅ FIRST CALL (LEGITIMATE)
   ↓
7. StateManagementService.filters$ emits new filters
   ↓
8. ResultsTableComponent subscribes, receives new filters
   ↓
9. ResultsTableComponent updates this.tableQueryParams
   ↓
10. BaseDataTableComponent receives new queryParams via @Input
    ↓
11. BaseDataTableComponent.ngOnChanges() detects change
    ↓
12. BaseDataTableComponent.fetchData() executes
    ↓
13. BaseDataTableComponent.queryParamsChange.emit(params)  ← ❌ BUG HERE
    ↓
14. ResultsTableComponent.onTableQueryChange(params)
    ↓
15. ResultsTableComponent calls StateManagementService.updateFilters()  ← ❌ BUG HERE
    ↓
16. StateManagementService.fetchVehicleData()  ← ❌ SECOND CALL (CIRCULAR)
    ↓
17. StateManagementService.filters$ emits (again)
    ↓
18. LOOP CONTINUES → Third call
```

### Why Multiple Fetches?

**Fetch #1 (Legitimate):**
- User action triggers state update
- StateManagementService fetches data
- ✅ Expected behavior

**Fetch #2 (Bug):**
- BaseDataTableComponent completes `fetchData()`
- **Emits `queryParamsChange` to parent** (lines 278-279 in base-data-table.component.ts)
- ResultsTableComponent receives event
- Calls `StateManagementService.updateFilters()` **unnecessarily**
- Triggers another fetch
- ❌ Circular feedback loop

**Fetch #3 (Bug):**
- Previous fetch triggers `filters$` emission
- Cycle repeats
- ❌ Continues until state stabilizes

---

## Architecture Violation

### Violated Principle: Unidirectional Data Flow

From `docs/state-management-guide.md` (lines 687-690):

> **Unidirectional Flow** - State flows one direction through services
>
> **Event Bubbling** - Events flow up (emit), state flows down (input)

**Current (Broken) Flow:**

```
StateManagementService
        ↓ (state flows down)
  ResultsTableComponent
        ↓ (@Input binding)
  BaseDataTableComponent
        ↓ (fetchData completes)
        ↑ (emits queryParamsChange) ← ❌ PROBLEM: Writing back to state
  ResultsTableComponent
        ↑ (calls updateFilters)
StateManagementService ← CIRCULAR LOOP
```

**Correct Flow Should Be:**

```
StateManagementService
        ↓ (state flows down - READ ONLY)
  ResultsTableComponent
        ↓ (@Input binding - READ ONLY)
  BaseDataTableComponent
        ↓ (hydrate from input)
        ↓ (display data)

User Interaction (page change, sort)
        ↑ (emit event)
  ResultsTableComponent
        ↑ (emit event)
StateManagementService ← WRITE via updateFilters
```

### Problem: BaseDataTable Emits During Hydration

`BaseDataTableComponent.fetchData()` (lines 255-286):

```typescript
fetchData(): void {
  // ... fetch data from data source

  this.dataSource
    .fetch(params)
    .subscribe({
      next: (response: TableResponse<T>) => {
        this.tableData = response.results;
        this.totalCount = response.total;
        this.isLoading = false;

        // ❌ PROBLEM: Emits during hydration, not just user interaction
        this.queryParamsChange.emit(params);
      },
      // ...
    });
}
```

**Issue:** This emit happens:
1. ✅ When user changes page/sort (correct)
2. ❌ During initial hydration from `ngOnInit()` (incorrect)
3. ❌ During re-hydration from `ngOnChanges()` (incorrect)

---

## Console Logs

### Full Log Trace

```
table-picker.component.ts:331 TablePickerComponent: Apply clicked
table-picker.component.ts:332 TablePickerComponent: Emitting selections: (5) [{…}, {…}, {…}, {…}, {…}]
discover.component.ts:278 Discover: Picker selections changed: (5) [{…}, {…}, {…}, {…}, {…}]

state-management.service.ts:206 🔵 StateManagement.updateFilters() called with: {modelCombos: Array(5)}
state-management.service.ts:216 🔵 Triggering fetchVehicleData()
state-management.service.ts:218 🟢 Data fetched successfully
                                  ↑
                                  ↑ FETCH #1 - LEGITIMATE
                                  ↑

results-table.component.ts:111 ResultsTable: Filters updated from URL: {modelCombos: Array(5), page: 1}
base-data-table.component.ts:181 ⭐ First queryParams change, skipping (handled in ngOnInit)

results-table.component.ts:160 ResultsTable: Table query changed: {page: 1, size: 20, ...}
                               ↑
                               ↑ BUG: BaseDataTable emitted queryParamsChange
                               ↑

state-management.service.ts:206 🔵 StateManagement.updateFilters() called with: {page: 1, size: 20, ...}
state-management.service.ts:216 🔵 Triggering fetchVehicleData()
state-management.service.ts:218 🟢 Data fetched successfully
                                  ↑
                                  ↑ FETCH #2 - CIRCULAR BUG
                                  ↑

results-table.component.ts:111 ResultsTable: Filters updated from URL: {modelCombos: Array(5), page: 1, size: 20}
base-data-table.component.ts:189 ⏭️ QueryParams unchanged, skipping fetch

[Cycle repeats for FETCH #3]
```

---

## Code Analysis

### File: frontend/src/app/shared/components/base-data-table/base-data-table.component.ts

**Problem Area: fetchData() method (lines 255-286)**

```typescript
fetchData(): void {
  if (this.isReorderingColumns) {
    return; // Don't fetch during column reordering
  }
  this.isLoading = true;

  const params: TableQueryParams = {
    page: this.currentPage,
    size: this.pageSize,
    sortBy: this.sortBy,
    sortOrder: this.sortOrder,
    filters: this.filters,
  };

  this.dataSource
    .fetch(params)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: TableResponse<T>) => {
        this.tableData = response.results;
        this.totalCount = response.total;
        this.isLoading = false;

        // ❌ PROBLEM: Always emits, even during hydration
        // Should only emit on USER-initiated changes
        this.queryParamsChange.emit(params);
      },
      error: (error) => {
        console.error('Failed to fetch table data:', error);
        this.isLoading = false;
      },
    });
}
```

**Called From:**
1. `ngOnInit()` - Initial hydration (should NOT emit)
2. `ngOnChanges()` when `queryParams` input changes (should NOT emit)
3. `onPageChange()` - User clicked pagination (SHOULD emit)
4. `onPageSizeChange()` - User changed page size (SHOULD emit)
5. `onSort()` - User clicked column header (SHOULD emit)
6. Filter debounce subscription (SHOULD emit)

**Issue:** No distinction between "hydration fetch" and "user interaction fetch"

---

### File: frontend/src/app/features/results/results-table/results-table.component.ts

**Problem Area: onTableQueryChange() method (lines 174-198)**

```typescript
/**
 * Handle table query changes (user interactions)
 *
 * IMPORTANT: Results table only manages pagination and sort state.
 * Filter state is owned exclusively by Query Control component.
 */
onTableQueryChange(params: TableQueryParams): void {
  console.log('ResultsTable: Table query changed (pagination/sort only):', params);

  // ❌ PROBLEM: This is called BOTH for:
  // 1. User interactions (page change, sort) ✅ CORRECT
  // 2. Initial hydration from BaseDataTable ❌ INCORRECT - creates loop

  // Only update pagination and sort - never filters
  // Filters are owned by Query Control and read-only for this component
  this.stateService.updateFilters({
    page: params.page,
    size: params.size,
    sort: params.sortBy || undefined,
    sortDirection: params.sortOrder || undefined,
    // Explicitly do NOT update filter properties here
    // Query Control is the sole owner of filter state
  });
}
```

**Issue:** No way to distinguish if this was called due to:
- User interaction (should update state) ✅
- Initial hydration (should NOT update state) ❌

---

## Proposed Solution

### Option 1: Don't Emit During Hydration (Preferred)

**Strategy:** Track whether fetch was user-initiated or hydration

**Implementation:**

```typescript
// In BaseDataTableComponent
private isUserInitiated = false;

fetchData(userInitiated: boolean = false): void {
  this.isUserInitiated = userInitiated;
  // ... existing fetch logic

  this.dataSource.fetch(params).subscribe({
    next: (response) => {
      this.tableData = response.results;
      this.totalCount = response.total;
      this.isLoading = false;

      // ✅ Only emit if fetch was user-initiated
      if (this.isUserInitiated) {
        this.queryParamsChange.emit(params);
      }
    }
  });
}

// Update all user interaction methods
onPageChange(page: number): void {
  this.currentPage = page;
  this.fetchData(true);  // ✅ User-initiated
}

onSort(columnKey: string): void {
  // ... update sort
  this.fetchData(true);  // ✅ User-initiated
}

// Hydration does NOT emit
ngOnInit(): void {
  this.loadPreferences();
  this.fetchData(false);  // ✅ Hydration - don't emit
}

ngOnChanges(changes: SimpleChanges): void {
  if (changes['queryParams']) {
    // ... equality check
    this.fetchData(false);  // ✅ Hydration - don't emit
  }
}
```

**Pros:**
- Minimal changes
- Clear semantic distinction
- Preserves all existing functionality
- Follows state management guide principles

**Cons:**
- Requires adding parameter to fetchData() and updating all call sites

---

### Option 2: Remove Emit Entirely

**Strategy:** Parent component already knows state, doesn't need notification

**Implementation:**

```typescript
fetchData(): void {
  // ... existing logic

  this.dataSource.fetch(params).subscribe({
    next: (response) => {
      this.tableData = response.results;
      this.totalCount = response.total;
      this.isLoading = false;

      // ✅ Don't emit - parent already has this state
      // (Removed: this.queryParamsChange.emit(params);)
    }
  });
}
```

**Pros:**
- Simplest solution
- Eliminates entire class of bugs
- True unidirectional data flow

**Cons:**
- Parent loses notification of fetch completion
- May break if parent relies on emit for other logic

---

### Option 3: Flag-Based Approach

**Strategy:** Use a flag to prevent recursive updates

**Implementation:**

```typescript
// In ResultsTableComponent
private isUpdatingState = false;

onTableQueryChange(params: TableQueryParams): void {
  // ✅ Prevent circular updates
  if (this.isUpdatingState) {
    console.log('Ignoring recursive state update');
    return;
  }

  this.isUpdatingState = true;
  this.stateService.updateFilters({
    page: params.page,
    size: params.size,
    sort: params.sortBy,
    sortDirection: params.sortOrder,
  });

  // Reset flag after state settles
  setTimeout(() => {
    this.isUpdatingState = false;
  }, 0);
}
```

**Pros:**
- Simple guard against recursion
- Minimal code changes

**Cons:**
- Treats symptom, not root cause
- setTimeout is fragile
- Still performs unnecessary work

---

### Recommended Solution: **Option 1**

Option 1 addresses the root cause while maintaining architectural integrity:

1. ✅ Follows state management guide (unidirectional flow)
2. ✅ Semantic clarity (user-initiated vs hydration)
3. ✅ No side effects or timing issues
4. ✅ Testable behavior
5. ✅ Prevents future similar bugs

---

## Testing Plan

### Unit Tests

```typescript
describe('BaseDataTableComponent', () => {
  it('should NOT emit queryParamsChange during ngOnInit hydration', () => {
    const emitSpy = spyOn(component.queryParamsChange, 'emit');

    component.ngOnInit();
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should NOT emit queryParamsChange during ngOnChanges hydration', () => {
    const emitSpy = spyOn(component.queryParamsChange, 'emit');

    component.queryParams = { page: 2, size: 50, filters: {} };
    component.ngOnChanges({
      queryParams: new SimpleChange(null, component.queryParams, false)
    });

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit queryParamsChange when user changes page', () => {
    const emitSpy = spyOn(component.queryParamsChange, 'emit');

    component.onPageChange(3);

    expect(emitSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 3 })
    );
  });

  it('should emit queryParamsChange when user sorts column', () => {
    const emitSpy = spyOn(component.queryParamsChange, 'emit');

    component.onSort('year');

    expect(emitSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ sortBy: 'year', sortOrder: 'asc' })
    );
  });
});
```

### Integration Tests

```typescript
describe('Picker to Results Table Flow', () => {
  it('should trigger exactly ONE API call when Apply clicked', fakeAsync(() => {
    const apiSpy = spyOn(apiService, 'getVehicleDetails').and.returnValue(
      of({ results: [], total: 0, page: 1, size: 20, totalPages: 0 })
    );

    // User selects models in picker
    pickerComponent.selectManufacturer('Brammo');
    pickerComponent.selectModel('Street Bikes');
    pickerComponent.onApply();

    tick(500); // Allow debouncing and async operations

    // ✅ Should be called exactly once
    expect(apiSpy).toHaveBeenCalledTimes(1);
  }));
});
```

### Manual Testing

**Test Case 1: Picker Apply**
1. Open http://autos.minilab/discover
2. Open DevTools Network tab, filter by "details"
3. Select manufacturer + models in picker
4. Click "Apply"
5. **Verify:** Exactly 1 request to `/api/v1/vehicles/details`

**Test Case 2: Pagination**
1. After test case 1, clear network log
2. Click "Next Page" or select different page
3. **Verify:** Exactly 1 request to `/api/v1/vehicles/details`

**Test Case 3: Sorting**
1. Clear network log
2. Click any column header to sort
3. **Verify:** Exactly 1 request to `/api/v1/vehicles/details`

**Test Case 4: Page Size Change**
1. Clear network log
2. Change page size dropdown (e.g., 20 → 50)
3. **Verify:** Exactly 1 request to `/api/v1/vehicles/details`

---

## Related Documentation

- [State Management Guide](./state-management-guide.md) - Architecture principles
- [State Flow Diagram](./state-flow-diagram.md) - Visual data flow
- [Milestone 003: Base Table Design](./design/milestone-003-base-table-design.md) - Component architecture

---

## Changelog

### 2025-10-30 - Document Created
- Initial analysis and documentation
- Problem identified at commit `06b035d`
- Reproduced triple-fetch issue
- Root cause traced to circular feedback loop
- Proposed 3 solution options
- Recommended Option 1 (flag-based fetch tracking)

---

**Status:** 🔴 **OPEN** - Awaiting implementation
**Priority:** High
**Estimated Effort:** 2-3 hours (implementation + testing)

---

**END OF BUGFIX WRITE-UP**
