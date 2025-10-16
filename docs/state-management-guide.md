# AUTOS Application - State Management & Component Hydration Guide

**Date:** 2025-10-16  
**Purpose:** Comprehensive reference for state management patterns and component hydration strategies in the AUTOS application  
**Status:** Living Document - Updated with Milestone 003 considerations

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [State Management Pattern](#state-management-pattern)
3. [Component Hydration Strategies](#component-hydration-strategies)
4. [BaseDataTableComponent Integration](#basedatatablecomponent-integration)
5. [Storage Layers](#storage-layers)
6. [Data Flow Patterns](#data-flow-patterns)
7. [Implementation Examples](#implementation-examples)
8. [Testing Scenarios](#testing-scenarios)
9. [Best Practices](#best-practices)

---

## Architecture Overview

### URL as Single Source of Truth

AUTOS follows a **URL-first architecture** where query parameters are the authoritative source for application state:

```
URL Query Params ←→ StateManagementService ←→ Components
     (storage)           (orchestrator)         (UI)
```

**Key Principle:** All query-related state (filters, sort, pagination) MUST be in the URL for:
- ✅ Shareability (users can copy/paste URLs)
- ✅ Browser navigation (back/forward buttons work)
- ✅ Page refresh (state persists)
- ✅ Deep linking (direct access to specific views)
- ✅ Bookmarking (save searches)

---

## State Management Pattern

### Current Implementation

**Location:** `frontend/src/app/core/services/`

```typescript
// State flow (simplified)
URL → RouteStateService → StateManagementService → Components
      ↑                                            ↓
      └────────────────────────────────────────────┘
```

### Core Services

#### 1. RouteStateService
**File:** `core/services/route-state.service.ts`

**Responsibilities:**
- Parse URL query parameters
- Convert between URL params and SearchFilters
- Update URL without full page reload
- Emit query parameter changes

**Key Methods:**
```typescript
getCurrentParams(): Params
paramsToFilters(params: Params): SearchFilters
filtersToParams(filters: SearchFilters): Params
updateParams(params: Params, replaceUrl?: boolean): void
```

**AUTOS-Specific Conversion:**
```typescript
// URL format: ?models=Ford:F-150,Chevrolet:Corvette
filtersToParams(filters: SearchFilters): Params {
  if (filters.modelCombos && filters.modelCombos.length > 0) {
    params['models'] = filters.modelCombos
      .map(c => `${c.manufacturer}:${c.model}`)
      .join(',');
  }
  // ... other filters
}

paramsToFilters(params: Params): SearchFilters {
  if (params['models']) {
    const modelsArray = params['models'].split(',').map(combo => {
      const [manufacturer, model] = combo.split(':');
      return { manufacturer, model };
    });
    filters.modelCombos = modelsArray;
  }
  // ... other filters
}
```

#### 2. StateManagementService
**File:** `core/services/state-management.service.ts`

**Responsibilities:**
- Maintain application state (BehaviorSubject)
- Synchronize state with URL
- Provide observables for components to subscribe
- Handle state updates from component events

**Public Observables:**
```typescript
state$: Observable<AppState>
filters$: Observable<SearchFilters>
results$: Observable<VehicleResult[]>
loading$: Observable<boolean>
error$: Observable<string | null>
totalResults$: Observable<number>
```

**Key Methods:**
```typescript
updateFilters(filters: Partial<SearchFilters>): void
updatePage(page: number): void
updateSort(sort: string, sortDirection: 'asc' | 'desc'): void
resetFilters(): void
getCurrentFilters(): SearchFilters
```

**State Update Flow:**
```typescript
updateFilters(filters: Partial<SearchFilters>): void {
  // 1. Merge with current filters
  const newFilters = { ...this.currentFilters, ...filters };
  
  // 2. Update internal state
  this.updateState({ filters: newFilters });
  
  // 3. Sync to URL (source of truth)
  this.syncStateToUrl();
  
  // 4. (Future) Trigger API search
  // this.performSearch();
}

private syncStateToUrl(): void {
  const params = this.routeState.filtersToParams(this.state.filters);
  this.routeState.setParams(params, false);
}
```

---

## Component Hydration Strategies

### What is Hydration?

**Hydration** is the process of restoring component state from external sources (URL, localStorage, etc.) after:
- Initial page load
- Browser navigation (back/forward)
- Page refresh (F5)
- Deep link access

### Hydration Pattern: Input-Based

AUTOS uses **input-based hydration** rather than direct service injection for reusability:

```typescript
// ❌ AVOID: Direct service injection (tight coupling)
constructor(private stateService: StateManagementService) {
  this.stateService.filters$.subscribe(filters => {
    this.hydrateFromFilters(filters);
  });
}

// ✅ PREFER: Input-based hydration (loose coupling)
@Input() initialSelections: ManufacturerModelSelection[] = [];

ngOnChanges(changes: SimpleChanges): void {
  if (changes['initialSelections']) {
    this.hydrateSelections();
  }
}
```

**Benefits:**
- Component is reusable (not tied to specific service)
- Parent controls state source (URL, service, or hardcoded)
- Easier to test (pass mock inputs, no service dependencies)
- Angular change detection optimized for inputs

### Hydration Timing: CRITICAL

**Problem:** Components often depend on data being loaded before hydration can occur.

**Example from Manufacturer-Model Picker:**

```typescript
loadData(): void {
  this.apiService.getManufacturerModelCombinations().subscribe({
    next: (response) => {
      this.allRows = response.items.map(...);
      this.loading = false;
      
      // ✅ CRITICAL: Hydrate AFTER data available
      this.hydrateSelections();
    }
  });
}
```

**Why:** Checkboxes/UI elements are rendered based on loaded data. If hydration runs before data loads, elements don't exist yet and can't be selected.

### Idempotent Hydration

**Always design hydration to be safe to call multiple times:**

```typescript
private hydrateSelections(): void {
  // Always start clean (idempotent)
  this.selectedRows.clear();
  
  // Only hydrate if data exists
  if (!this.initialSelections || this.initialSelections.length === 0) {
    return;
  }
  
  // Apply selections
  this.initialSelections.forEach(selection => {
    const key = `${selection.manufacturer}|${selection.model}`;
    this.selectedRows.add(key);
  });
}
```

**Called from:**
1. After data loads (initial)
2. `ngOnChanges` when input changes (browser navigation)
3. Parent command (clear trigger)

---

## BaseDataTableComponent Integration

### Milestone 003 Considerations

The `BaseDataTableComponent` must integrate seamlessly with AUTOS state management:

#### Input/Output Design

```typescript
export class BaseDataTableComponent<T> implements OnInit, OnChanges {
  // ===== Data & Configuration =====
  @Input() tableId!: string;              // Unique ID for localStorage
  @Input() columns!: TableColumn<T>[];
  @Input() dataSource!: TableDataSource<T>;
  @Input() expandable: boolean = false;
  
  // ===== State Hydration (URL → Component) =====
  @Input() queryParams?: TableQueryParams;  // From StateManagementService
  
  // ===== UI Preferences (localStorage) =====
  @Input() defaultPageSize: number = 20;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  
  // ===== Events (Component → State) =====
  @Output() rowExpand = new EventEmitter<T>();
  @Output() rowCollapse = new EventEmitter<T>();
  @Output() queryParamsChange = new EventEmitter<TableQueryParams>();
}
```

#### Hydration Implementation

```typescript
ngOnInit(): void {
  // 1. Load UI preferences from localStorage
  this.loadColumnPreferences();
  
  // 2. If queryParams provided, hydrate immediately
  if (this.queryParams) {
    this.hydrateFromQueryParams();
  }
}

ngOnChanges(changes: SimpleChanges): void {
  // 3. Re-hydrate when queryParams input changes (browser navigation)
  if (changes['queryParams'] && !changes['queryParams'].firstChange) {
    this.hydrateFromQueryParams();
  }
}

private hydrateFromQueryParams(): void {
  if (!this.queryParams) return;
  
  // Restore filters (clear existing first - idempotent)
  this.clearAllFilters();
  if (this.queryParams.filters) {
    Object.keys(this.queryParams.filters).forEach(key => {
      this.applyFilter(key, this.queryParams!.filters![key]);
    });
  }
  
  // Restore sort
  if (this.queryParams.sortBy && this.queryParams.sortOrder) {
    this.sortColumn = this.queryParams.sortBy;
    this.sortDirection = this.queryParams.sortOrder;
  }
  
  // Restore pagination
  this.currentPage = this.queryParams.page || 1;
  this.pageSize = this.queryParams.size || this.defaultPageSize;
  
  // Trigger data fetch with restored state
  this.loadData();
}

private emitQueryParamsChange(): void {
  // Emit unified event for parent to update state
  this.queryParamsChange.emit({
    page: this.currentPage,
    size: this.pageSize,
    sortBy: this.sortColumn || undefined,
    sortOrder: this.sortDirection || undefined,
    filters: this.getActiveFilters()
  });
}
```

#### Parent Component Integration

**VehicleResultsTableComponent (Parent):**

```typescript
export class VehicleResultsTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Hydration from StateManagementService
  tableQueryParams?: TableQueryParams;
  
  constructor(private stateService: StateManagementService) {}
  
  ngOnInit(): void {
    // Subscribe to state changes (from URL)
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        // Convert SearchFilters to TableQueryParams
        this.tableQueryParams = this.convertToTableParams(filters);
      });
  }
  
  // Handle table query changes (user interactions)
  onTableQueryChange(params: TableQueryParams): void {
    // Convert back to SearchFilters and update state (which updates URL)
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
        dataSource: filters.dataSource
      }
    };
  }
  
  private convertToSearchFilters(params: TableQueryParams): Partial<SearchFilters> {
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
      dataSource: params.filters?.dataSource
    };
  }
}
```

**Template:**

```html
<app-base-data-table
  [tableId]="'vehicle-results'"
  [columns]="columns"
  [dataSource]="dataSource"
  [queryParams]="tableQueryParams"
  (queryParamsChange)="onTableQueryChange($event)"
  [expandable]="true"
  (rowExpand)="loadVehicleInstances($event)">
  
  <ng-template #cellTemplate let-column="column" let-row="row">
    <!-- Custom cell rendering -->
  </ng-template>
  
  <ng-template #expansionTemplate let-row="row">
    <!-- Expansion content -->
  </ng-template>
</app-base-data-table>
```

---

## Storage Layers

### Two Separate Concerns

AUTOS uses **two independent storage layers** for different purposes:

#### Layer 1: URL (Query State)

**Purpose:** Store query-related state that defines what data is displayed

**Managed By:** `StateManagementService` + `RouteStateService`

**Storage Location:** Browser URL query parameters

**Contents:**
- Selected manufacturer/model combinations
- Active filters (manufacturer, model, year range, body class, data source)
- Current sort column and direction
- Current page number
- Page size

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

#### Layer 2: localStorage (UI Preferences)

**Purpose:** Store user preferences that control how data is presented

**Managed By:** `TableStatePersistenceService` (Milestone 003)

**Storage Location:** Browser localStorage

**Contents:**
- Column order (user's preferred arrangement)
- Column visibility (which columns are shown/hidden)
- Default page size preference
- Panel collapse states (workshop layout)
- Grid layout configuration

**Example:**
```json
{
  "autos-table-vehicle-results-preferences": {
    "columnOrder": ["manufacturer", "model", "year", "body_class", "data_source", "vehicle_id"],
    "visibleColumns": ["manufacturer", "model", "year", "body_class"],
    "pageSize": 50
  },
  "autos-workshop-layout": [...],
  "autos-picker-pagesize": 10
}
```

**Characteristics:**
- ✅ Private (not in URL)
- ✅ Persists across sessions
- ✅ Per-browser/device
- ❌ Not shareable
- ❌ Lost if localStorage cleared

### Key Distinction

```typescript
// ❌ WRONG: Column order in URL
?columns=manufacturer,model,year  // Don't do this!

// ✅ CORRECT: Column order in localStorage
localStorage.setItem('autos-table-vehicle-results-preferences', JSON.stringify({
  columnOrder: ['manufacturer', 'model', 'year']
}));

// ❌ WRONG: Active filters in localStorage
localStorage.setItem('currentFilters', JSON.stringify({ yearMin: 1960 }));

// ✅ CORRECT: Active filters in URL
?yearMin=1960
```

**Rule of Thumb:**
- **URL:** What data am I looking at? (query state)
- **localStorage:** How do I want to view it? (UI preferences)

---

## Data Flow Patterns

### Pattern 1: User Interaction → URL Update

**Scenario:** User changes filter, sort, or pagination

```
User Action (e.g., changes year filter)
    ↓
Component.onFilterChange()
    ↓
BaseDataTableComponent.emitQueryParamsChange()
    ↓
@Output() queryParamsChange emits event
    ↓
VehicleResultsTableComponent.onTableQueryChange()
    ↓
StateManagementService.updateFilters()
    ↓
RouteStateService.setParams()
    ↓
URL Updated (?yearMin=1960&yearMax=1980)
    ↓
Angular Router detects change
    ↓
RouteStateService.queryParams$ emits
    ↓
StateManagementService.filters$ emits
    ↓
Components re-render with new data
```

### Pattern 2: URL Change → Component Hydration

**Scenario:** User clicks browser back button, refreshes page, or pastes URL

```
URL Changes (e.g., browser back button)
    ↓
Angular Router NavigationEnd event
    ↓
RouteStateService.queryParams$ emits new params
    ↓
StateManagementService updates internal state
    ↓
StateManagementService.filters$ emits new filters
    ↓
Component subscription receives new filters
    ↓
Component.tableQueryParams updated via subscription
    ↓
@Input() queryParams change detected
    ↓
BaseDataTableComponent.ngOnChanges() fires
    ↓
BaseDataTableComponent.hydrateFromQueryParams()
    ↓
Table state restored (filters, sort, page)
    ↓
BaseDataTableComponent.loadData()
    ↓
API called with restored params
    ↓
Table displays correct data
```

### Pattern 3: Component Command Pattern

**Scenario:** Parent needs to command child component (e.g., "clear all")

```typescript
// Parent Component
export class WorkshopComponent {
  pickerClearTrigger = 0;  // Counter pattern
  
  onClearAll(): void {
    // Increment to trigger child action
    this.pickerClearTrigger++;
    
    // Update state (which updates URL)
    this.stateService.resetFilters();
  }
}

// Parent Template
<app-manufacturer-model-picker
  [clearTrigger]="pickerClearTrigger"
  [initialSelections]="pickerInitialSelections">
</app-manufacturer-model-picker>

// Child Component
export class ManufacturerModelPickerComponent implements OnChanges {
  @Input() clearTrigger: number = 0;
  private lastClearTrigger: number = 0;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clearTrigger'] && !changes['clearTrigger'].firstChange) {
      const newValue = changes['clearTrigger'].currentValue;
      if (newValue !== this.lastClearTrigger) {
        this.lastClearTrigger = newValue;
        this.selectedRows.clear();
      }
    }
  }
}
```

**Why Counter Pattern:**
- Simple primitive value (number) easy to change detect
- No risk of reference equality issues (unlike objects/arrays)
- Parent controls timing without tight coupling
- Child can detect actual changes (not same value set twice)

---

## Implementation Examples

### Example 1: Simple Table Component

```typescript
@Component({
  selector: 'app-simple-results-table',
  template: `
    <app-base-data-table
      [tableId]="'simple-results'"
      [columns]="columns"
      [dataSource]="dataSource"
      [queryParams]="tableQueryParams"
      (queryParamsChange)="onTableQueryChange($event)">
    </app-base-data-table>
  `
})
export class SimpleResultsTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  columns: TableColumn<MyData>[] = [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'date', label: 'Date', sortable: true, filterable: false }
  ];
  
  tableQueryParams?: TableQueryParams;
  
  dataSource: TableDataSource<MyData> = {
    fetch: (params) => this.api.getData(params)
  };
  
  constructor(
    private api: ApiService,
    private state: StateManagementService
  ) {}
  
  ngOnInit(): void {
    // Hydrate from state (URL)
    this.state.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.tableQueryParams = {
          page: filters.page || 1,
          size: filters.size || 20,
          sortBy: filters.sort,
          sortOrder: filters.sortDirection,
          filters: {}
        };
      });
  }
  
  onTableQueryChange(params: TableQueryParams): void {
    this.state.updateFilters({
      page: params.page,
      size: params.size,
      sort: params.sortBy,
      sortDirection: params.sortOrder
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Example 2: Picker Component with Staging

```typescript
@Component({
  selector: 'app-manufacturer-model-picker',
  template: `
    <div>
      <!-- Checkboxes for selection -->
      <nz-table [nzData]="rows">
        <tbody>
          <tr *ngFor="let row of rows">
            <td>
              <label nz-checkbox
                [nzChecked]="isRowSelected(row)"
                (nzCheckedChange)="onCheckboxClick(row)">
                {{ row.manufacturer }} - {{ row.model }}
              </label>
            </td>
          </tr>
        </tbody>
      </nz-table>
      
      <!-- Apply button (staging pattern) -->
      <button (click)="onApply()">Apply ({{ selectedRows.size }})</button>
      <button (click)="onClear()">Clear</button>
    </div>
  `
})
export class ManufacturerModelPickerComponent implements OnInit, OnChanges {
  @Output() selectionChange = new EventEmitter<ManufacturerModelSelection[]>();
  @Input() clearTrigger: number = 0;
  @Input() initialSelections: ManufacturerModelSelection[] = [];
  
  rows: PickerRow[] = [];
  selectedRows = new Set<string>();  // Internal staging area
  
  private lastClearTrigger = 0;
  
  ngOnInit(): void {
    this.loadData();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Handle clear command
    if (changes['clearTrigger'] && !changes['clearTrigger'].firstChange) {
      const newValue = changes['clearTrigger'].currentValue;
      if (newValue !== this.lastClearTrigger) {
        this.lastClearTrigger = newValue;
        this.selectedRows.clear();
      }
    }
    
    // Handle hydration
    if (changes['initialSelections']) {
      this.hydrateSelections();
    }
  }
  
  private loadData(): void {
    this.api.getManufacturerModelCombinations().subscribe({
      next: (response) => {
        this.rows = response.items;
        
        // ✅ CRITICAL: Hydrate AFTER data loaded
        this.hydrateSelections();
      }
    });
  }
  
  private hydrateSelections(): void {
    // Idempotent - safe to call multiple times
    this.selectedRows.clear();
    
    if (!this.initialSelections || this.initialSelections.length === 0) {
      return;
    }
    
    this.initialSelections.forEach(selection => {
      const key = `${selection.manufacturer}|${selection.model}`;
      this.selectedRows.add(key);
    });
  }
  
  onCheckboxClick(row: PickerRow): void {
    // Update staging area (not committed yet)
    if (this.selectedRows.has(row.key)) {
      this.selectedRows.delete(row.key);
    } else {
      this.selectedRows.add(row.key);
    }
  }
  
  onApply(): void {
    // Commit staged selections
    const selections = Array.from(this.selectedRows).map(key => {
      const [manufacturer, model] = key.split('|');
      return { manufacturer, model };
    });
    
    this.selectionChange.emit(selections);
  }
  
  onClear(): void {
    this.selectedRows.clear();
  }
  
  isRowSelected(row: PickerRow): boolean {
    return this.selectedRows.has(row.key);
  }
}
```

---

## Testing Scenarios

### Must-Pass Test Cases

#### 1. Fresh Page Load
```
Given: User navigates to /workshop
When: Page loads
Then: 
  - No URL parameters present
  - Table shows default state (page 1, default page size)
  - No filters active
  - No API call triggered
```

#### 2. Deep Link with Parameters
```
Given: User pastes URL: /workshop?models=Ford:F-150&page=2&sortBy=year&sortOrder=desc
When: Page loads
Then:
  - Picker shows Ford F-150 selected
  - Table on page 2
  - Table sorted by year descending
  - API called with these exact parameters
  - Results match URL state
```

#### 3. Browser Back Button
```
Given: User has navigated through multiple filter states
  State 1: models=Ford:F-150
  State 2: models=Chevrolet:Corvette (current)
When: User clicks browser back button
Then:
  - URL becomes models=Ford:F-150
  - Picker updates to show Ford F-150 selected
  - Table refreshes with Ford F-150 data
  - No "jump" or flash of wrong data
```

#### 4. Page Refresh (F5)
```
Given: User has active filters: models=Ford:F-150&yearMin=1960&page=3
When: User presses F5
Then:
  - Page reloads
  - URL parameters preserved
  - All components hydrate from URL
  - Same data displayed as before refresh
  - User's view appears unchanged
```

#### 5. Column Reorder Persistence
```
Given: User drags columns to new order: [year, model, manufacturer]
When: User refreshes page
Then:
  - Column order restored from localStorage
  - URL NOT affected (columns not in URL)
  - Filters from URL still applied
```

#### 6. Multi-Tab Independence
```
Given: User has Tab 1 open with models=Ford:F-150
When: User opens Tab 2 with models=Chevrolet:Corvette
Then:
  - Tab 1 still shows Ford F-150
  - Tab 2 shows Chevrolet Corvette
  - Changes in Tab 1 don't affect Tab 2
  - Each tab has independent state
```

#### 7. Picker Staging Pattern
```
Given: User clicks multiple checkboxes (Ford F-150, Ford Mustang, Chevrolet Corvette)
When: User clicks "Apply" button
Then:
  - Single URL update with all selections
  - Single API call triggered
  - Not 3 separate URL updates/API calls
```

#### 8. Clear All Command
```
Given: User has multiple filters active
When: User clicks "Clear All" button
Then:
  - URL becomes /workshop (no parameters)
  - Picker cleared visually
  - Table shows default state
  - All filter inputs cleared
```

---

## Best Practices

### DO: Input-Based Hydration
```typescript
// ✅ Good: Reusable, testable
@Input() initialData: MyData[] = [];

ngOnChanges(changes: SimpleChanges): void {
  if (changes['initialData']) {
    this.hydrate();
  }
}
```

### DON'T: Direct Service Subscription
```typescript
// ❌ Avoid: Tight coupling
constructor(private state: StateManagementService) {
  this.state.filters$.subscribe(f => this.hydrate(f));
}
```

---

### DO: Counter Pattern for Commands
```typescript
// ✅ Good: Reliable change detection
@Input() clearTrigger: number = 0;
private lastClearTrigger = 0;

ngOnChanges(changes: SimpleChanges): void {
  if (changes['clearTrigger']) {
    const newValue = changes['clearTrigger'].currentValue;
    if (newValue !== this.lastClearTrigger) {
      this.lastClearTrigger = newValue;
      this.clearSelections();
    }
  }
}
```

### DON'T: Boolean Flags
```typescript
// ❌ Avoid: Can't detect when same value set twice
@Input() shouldClear: boolean = false;
```

---

### DO: Idempotent Hydration
```typescript
// ✅ Good: Safe to call multiple times
private hydrateSelections(): void {
  this.selectedRows.clear();  // Always start clean
  
  if (!this.initialSelections) return;
  
  this.initialSelections.forEach(s => this.selectedRows.add(s.key));
}
```

### DON'T: Additive Hydration
```typescript
// ❌ Avoid: Calling twice doubles selections
private hydrateSelections(): void {
  // Missing clear() - accumulates!
  this.initialSelections.forEach(s => this.selectedRows.add(s.key));
}
```

---

### DO: Hydrate After Data Loads
```typescript
// ✅ Good: Data exists before hydrating
loadData(): void {
  this.api.getData().subscribe({
    next: (response) => {
      this.allRows = response.items;
      this.hydrateSelections();  // After data ready
    }
  });
}
```

### DON'T: Hydrate Before Data
```typescript
// ❌ Avoid: Data not ready yet
ngOnInit(): void {
  this.hydrateSelections();  // allRows is still empty!
  this.loadData();
}
```

---

### DO: Form Patch Without Emit
```typescript
// ✅ Good: Doesn't trigger valueChanges loop
this.state.filters$.subscribe(filters => {
  this.form.patchValue(filters, { emitEvent: false });
  this.performSearch(filters);
});
```

### DON'T: Form Patch With Emit
```typescript
// ❌ Avoid: Triggers infinite loop
this.state.filters$.subscribe(filters => {
  this.form.patchValue(filters);  // Triggers valueChanges → updateFilters → this subscription!
});
```

---

### DO: Separate Storage Layers
```typescript
// ✅ Good: Clear separation
// URL: Query state
?models=Ford:F-150&page=2

// localStorage: UI preferences
{ "columnOrder": ["year", "model", "manufacturer"] }
```

### DON'T: Mix Storage Layers
```typescript
// ❌ Avoid: Column order doesn't belong in URL
?models=Ford:F-150&columns=year,model,manufacturer
```

---

### DO: Unified Event Emission
```typescript
// ✅ Good: Single event with all table state
private emitQueryParamsChange(): void {
  this.queryParamsChange.emit({
    page: this.currentPage,
    size: this.pageSize,
    sortBy: this.sortColumn,
    sortOrder: this.sortDirection,
    filters: this.getActiveFilters()
  });
}
```

### DON'T: Multiple Events
```typescript
// ❌ Avoid: Multiple state updates, multiple URL changes
onPageChange(page: number): void {
  this.pageChange.emit(page);  // URL update #1
}

onSortChange(sort: string): void {
  this.sortChange.emit(sort);  // URL update #2
}
```

---

### DO: takeUntil for Cleanup
```typescript
// ✅ Good: Prevents memory leaks
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.state.filters$
    .pipe(takeUntil(this.destroy$))
    .subscribe(filters => this.handleFilters(filters));
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### DON'T: Unmanaged Subscriptions
```typescript
// ❌ Avoid: Memory leak
ngOnInit(): void {
  this.state.filters$.subscribe(filters => this.handleFilters(filters));
  // Never unsubscribed!
}
```

---

## Summary: Key Principles

1. **URL is Source of Truth** - All query-related state MUST be in URL
2. **localStorage for Preferences** - UI preferences NEVER in URL
3. **Input-Based Hydration** - Components receive state via inputs, not services
4. **Idempotent Operations** - Hydration safe to call multiple times
5. **Hydrate After Data Loads** - Ensure data exists before applying state
6. **Counter Pattern for Commands** - Use incrementing numbers, not booleans
7. **Staging Pattern for Bulk Changes** - Apply button commits accumulated changes
8. **Unified Events** - Emit single event with complete state, not multiple partial events
9. **Clean Subscriptions** - Always use takeUntil for observable cleanup
10. **Form Patch Without Emit** - Use `{ emitEvent: false }` to avoid loops

---

**End of AUTOS State Management & Component Hydration Guide**

This guide should be referenced when:
- Implementing new components that interact with state
- Adding new table components using BaseDataTableComponent
- Debugging hydration issues
- Reviewing code for state management patterns
- Onboarding new developers to AUTOS architecture
