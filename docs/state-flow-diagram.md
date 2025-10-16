# AUTOS Application - Complete State Flow Diagram

**File:** `/home/odin/projects/autos/docs/state-flow-diagram.md`  
**Created:** 2025-10-16  
**Purpose:** Visual reference for complete application state management flow

---

## Overview

This document provides a comprehensive view of how state flows through the AUTOS application, from user actions through URL changes, service orchestration, API calls, and back to component updates.

---

## Complete State Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                           BROWSER / USER LAYER                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  URL QUERY PARAMETERS (Single Source of Truth)                              │
│                                                                             │
│  Example: /workshop?models=Ford:F-150,Chevrolet:Corvette&page=2&            │
│           sortBy=year&sortOrder=desc&yearMin=1960&yearMax=1980              │
│                                                                             │
│  Properties:                                                                │
│  • models: Manufacturer:Model combinations (comma-separated)                │
│  • page: Current page number                                                │
│  • size: Page size (default: 20)                                            │
│  • sortBy: Column to sort by                                                │
│  • sortOrder: 'asc' | 'desc'                                                │
│  • yearMin, yearMax: Filter ranges                                          │
│  • manufacturer, model, bodyClass, dataSource: Individual filters           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                          │                              ▲
                          │                              │
                          ▼ (Parse)                      │ (Update)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ROUTE STATE SERVICE                                                        │
│  File: core/services/route-state.service.ts                                 │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  PUBLIC API:                                                          │  │
│  │                                                                       │  │
│  │  • queryParams$: Observable<Params>                                   │  │
│  │    - Emits on every URL change (navigation, back/forward, etc.)       │  │
│  │                                                                       │  │
│  │  • getCurrentParams(): Params                                         │  │
│  │    - Synchronous snapshot of current URL params                       │  │
│  │                                                                       │  │
│  │  • paramsToFilters(params: Params): SearchFilters                     │  │
│  │    - Converts URL params to typed SearchFilters object                │  │
│  │    - Example: "Ford:F-150,Chevrolet:Corvette" →                       │  │
│  │      [{manufacturer:'Ford', model:'F-150'}, {...}]                    │  │
│  │                                                                       │  │
│  │  • filtersToParams(filters: SearchFilters): Params                    │  │
│  │    - Converts SearchFilters to URL-safe string params                 │  │
│  │    - Example: [{manufacturer:'Ford', model:'F-150'}] →                │  │
│  │      "Ford:F-150"                                                     │  │
│  │                                                                       │  │
│  │  • updateParams(params: Params, replaceUrl?: boolean): void           │  │
│  │    - Merges new params with existing (queryParamsHandling='merge')    │  │
│  │                                                                       │  │
│  │  • setParams(params: Params, replaceUrl?: boolean): void              │  │
│  │    - Replaces all params (queryParamsHandling='')                     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  INTERNAL LOGIC:                                                            │
│  • Listens to Angular Router NavigationEnd events                           │
│  • Extracts query parameters from ActivatedRoute snapshot                   │
│  • Emits changes via BehaviorSubject                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                          │                              ▲
                          │                              │
                          ▼ (Parse & Store)              │ (Sync)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  STATE MANAGEMENT SERVICE                                                   │
│  File: core/services/state-management.service.ts                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  INTERNAL STATE:                                                    │  │
│  │                                                                     │  │
│  │  private stateSubject = new BehaviorSubject<AppState>({           │  │
│  │    filters: SearchFilters,      // Query state from URL           │  │
│  │    results: VehicleResult[],    // API response data              │  │
│  │    loading: boolean,             // Loading indicator              │  │
│  │    error: string | null,         // Error messages                 │  │
│  │    totalResults: number          // Pagination total               │  │
│  │  });                                                                │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  PUBLIC OBSERVABLES:                                                │  │
│  │                                                                     │  │
│  │  • state$: Observable<AppState>                                    │  │
│  │    - Complete application state                                    │  │
│  │                                                                     │  │
│  │  • filters$: Observable<SearchFilters>                             │  │
│  │    - Current query filters (from URL)                              │  │
│  │    - distinctUntilChanged (JSON comparison)                        │  │
│  │                                                                     │  │
│  │  • results$: Observable<VehicleResult[]>                           │  │
│  │    - Current search results                                        │  │
│  │                                                                     │  │
│  │  • loading$: Observable<boolean>                                   │  │
│  │    - Loading state for UI indicators                               │  │
│  │                                                                     │  │
│  │  • error$: Observable<string | null>                               │  │
│  │    - Error messages for display                                    │  │
│  │                                                                     │  │
│  │  • totalResults$: Observable<number>                               │  │
│  │    - Total result count for pagination                             │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  PUBLIC METHODS:                                                    │  │
│  │                                                                     │  │
│  │  • updateFilters(filters: Partial<SearchFilters>): void           │  │
│  │    1. Merges with current filters                                  │  │
│  │    2. Resets page to 1 (if filters changed)                        │  │
│  │    3. Updates internal state                                       │  │
│  │    4. Syncs to URL via RouteStateService.setParams()              │  │
│  │    5. (Future) Triggers API search                                 │  │
│  │                                                                     │  │
│  │  • updatePage(page: number): void                                  │  │
│  │    - Updates page number in filters                                │  │
│  │    - Syncs to URL                                                   │  │
│  │                                                                     │  │
│  │  • updateSort(sort: string, sortDirection: 'asc'|'desc'): void    │  │
│  │    - Updates sort column and direction                             │  │
│  │    - Resets to page 1                                              │  │
│  │    - Syncs to URL                                                   │  │
│  │                                                                     │  │
│  │  • resetFilters(): void                                            │  │
│  │    - Clears all filters                                            │  │
│  │    - Clears results and error                                      │  │
│  │    - Syncs to URL (clears all params)                              │  │
│  │                                                                     │  │
│  │  • getCurrentFilters(): SearchFilters                              │  │
│  │    - Synchronous snapshot of current filters                       │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  INITIALIZATION FLOW:                                                       │
│  1. Constructor injects RouteStateService                                  │
│  2. initializeFromUrl(): Read current URL params                           │
│  3. paramsToFilters(): Convert to SearchFilters                            │
│  4. updateState(): Store in BehaviorSubject                                │
│  5. watchUrlChanges(): Subscribe to future URL changes                     │
│                                                                             │
│  URL CHANGE LISTENER:                                                       │
│  • Subscribes to RouteStateService.queryParams$                            │
│  • On emit: paramsToFilters() → updateState()                              │
│  • Handles browser back/forward, refresh, deep links                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
             │                         │                         │
             │                         │                         │
             ▼ (Subscribe)             ▼ (Subscribe)            ▼ (Subscribe)
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│                      │  │                      │  │                      │
│  WORKSHOP COMPONENT  │  │  DISCOVER COMPONENT  │  │   OTHER COMPONENTS   │
│  (Parent Container)  │  │  (Parent Container)  │  │    (Future)          │
│                      │  │                      │  │                      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
             │                         │
             │                         │
             ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  PARENT COMPONENT PATTERN                                                 │
│  Example: WorkshopComponent, DiscoverComponent                            │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  INITIALIZATION:                                                    │  │
│  │                                                                     │  │
│  │  ngOnInit(): void {                                                 │  │
│  │    // Subscribe to state changes (from URL)                         │  │
│  │    this.stateService.filters$                                       │  │
│  │      .pipe(takeUntil(this.destroy$))                                │  │
│  │      .subscribe(filters => {                                        │  │
│  │        // Update component properties                               │  │
│  │        this.currentFilters = filters;                               │  │
│  │                                                                     │  │
│  │        // Pass to picker component                                  │  │
│  │        if (filters.modelCombos) {                                   │  │
│  │          this.pickerInitialSelections = [...filters.modelCombos];   │  │
│  │        }                                                            │  │
│  │                                                                     │  │
│  │        // Pass to table component (as TableQueryParams)             │  │
│  │        this.tableQueryParams = {                                    │  │
│  │          page: filters.page || 1,                                   │  │
│  │          size: filters.size || 20,                                  │  │
│  │          sortBy: filters.sort,                                      │  │
│  │          sortOrder: filters.sortDirection,                          │  │
│  │          filters: { /* map filters */ }                             │  │
│  │        };                                                           │  │
│  │      });                                                            │  │
│  │  }                                                                  │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  CHILD EVENT HANDLERS:                                              │  │
│  │                                                                     │  │
│  │  onPickerSelectionChange(selections: ModelSelection[]): void {      │  │
│  │    // User clicked "Apply" in picker                                │  │
│  │    this.stateService.updateFilters({                                │  │
│  │      modelCombos: selections                                        │  │
│  │    });                                                              │  │
│  │    // This triggers: StateService → URL update → filters$ emit      │  │
│  │  }                                                                  │  │
│  │                                                                     │  │
│  │  onTableQueryChange(params: TableQueryParams): void {               │  │
│  │    // User changed filter/sort/page in table                        │  │
│  │    this.stateService.updateFilters({                                │  │
│  │      page: params.page,                                             │  │
│  │      size: params.size,                                             │  │
│  │      sort: params.sortBy,                                           │  │
│  │      sortDirection: params.sortOrder,                               │  │
│  │      // ... map table filters back to SearchFilters                 │  │
│  │    });                                                              │  │
│  │  }                                                                  │  │
│  │                                                                     │  │
│  │  onClearAll(): void {                                               │  │
│  │    // User clicked "Clear All" button                               │  │
│  │    this.pickerClearTrigger++;  // Command picker to clear           │  │
│  │    this.stateService.resetFilters();  // Clear state & URL          │  │
│  │  }                                                                  │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
             │                                           │
             │                                           │
             ▼ (Pass via @Input)                        ▼ (Pass via @Input)
┌──────────────────────────────────┐      ┌─────────────────────────────────┐
│                                  │      │                                 │
│  PICKER COMPONENT                │      │  TABLE COMPONENT                │
│  (Child - Presentational)        │      │  (Child - Presentational)       │
│                                  │      │                                 │
│  @Input() initialSelections      │      │  @Input() queryParams           │
│  @Input() clearTrigger           │      │  @Output() queryParamsChange    │
│  @Output() selectionChange       │      │                                 │
│                                  │      │  Uses BaseDataTableComponent    │
│  Internal UI State:              │      │  (Milestone 003)                │
│  • selectedRows: Set<string>     │      │                                 │
│  • Checkboxes checked/unchecked  │      │  Features:                      │
│  • Search filter applied         │      │  • Column reorder (drag-drop)   │
│                                  │      │  • Column visibility (drawer)   │
│  User Actions:                   │      │  • Server-side filtering        │
│  • Click checkboxes (staging)    │      │  • Server-side sorting          │
│  • Click "Apply" (commit)        │      │  • Server-side pagination       │
│  • Click "Clear" (reset)         │      │  • Row expansion                │
│                                  │      │  • localStorage preferences     │
│  Hydration:                      │      │                                 │
│  • ngOnChanges detects input     │      │  Hydration:                     │
│  •   changes                     │      │  • ngOnChanges detects input    │
│  • hydrateSelections() called    │      │  •   changes                    │
│  • selectedRows populated        │      │  • hydrateFromQueryParams()     │
│  • Checkboxes marked             │      │  •   called                     │
│                                  │      │  • Filters/sort/page restored   │
│                                  │      │                                 │
└──────────────────────────────────┘      └─────────────────────────────────┘
             │                                           │
             │                                           │
             ▼ (Emit on Apply)                          ▼ (Emit on change)
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  EVENT FLOW BACK TO PARENT                                                   │
│                                                                              │
│  1. User interaction in child component                                      │
│  2. Child emits event via @Output                                            │
│  3. Parent receives event in handler                                         │
│  4. Parent calls StateManagementService.updateFilters()                      │
│  5. StateManagementService updates URL via RouteStateService                 │
│  6. Angular Router detects URL change                                        │
│  7. RouteStateService.queryParams$ emits new params                          │
│  8. StateManagementService.filters$ emits new filters                        │
│  9. Parent receives new filters via subscription                             │
│  10. Parent updates @Input properties for children                           │
│  11. Children detect ngOnChanges                                             │
│  12. Children re-hydrate with new state                                      │
│  13. UI updates to reflect new state                                         │
│                                                                              │
│  CYCLE COMPLETE: User Action → URL → State → Components → UI                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Special Flow: Browser Navigation (Back/Forward)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  USER CLICKS BROWSER BACK BUTTON                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  BROWSER HISTORY API                                                        │
│  • Navigates to previous URL in history stack                               │
│  • Example: /workshop?models=Ford:F-150&page=2                              │
│    →→→ /workshop?models=Chevrolet:Corvette&page=1                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ANGULAR ROUTER                                                             │
│  • Fires NavigationEnd event                                                │
│  • Updates ActivatedRoute with new query parameters                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ROUTE STATE SERVICE                                                        │
│  • Listener catches NavigationEnd event                                     │
│  • Reads new query params from ActivatedRoute.snapshot                      │
│  • Emits via queryParams$ BehaviorSubject                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  STATE MANAGEMENT SERVICE                                                   │
│  • watchUrlChanges() listener receives new params                           │
│  • Converts params to SearchFilters via paramsToFilters()                   │
│  • Compares with current state (JSON.stringify)                             │
│  • If different: updateState({ filters: newFilters })                       │
│  • Emits via filters$ observable                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PARENT COMPONENT (WorkshopComponent)                                       │
│  • Subscription receives new filters                                        │
│  • Updates pickerInitialSelections = [...filters.modelCombos]               │
│  • Updates tableQueryParams = convertToTableParams(filters)                 │
│  • Angular change detection triggers                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                          │                              │
                          ▼                              ▼
┌───────────────────────────────────┐      ┌─────────────────────────────────┐
│                                   │      │                                 │
│  PICKER COMPONENT                 │      │  TABLE COMPONENT                │
│  • ngOnChanges fires              │      │  • ngOnChanges fires            │
│  • Detects initialSelections      │      │  • Detects queryParams change   │
│  •   change                       │      │  • hydrateFromQueryParams()     │
│  • hydrateSelections() called     │      │  •   called                     │
│  • selectedRows.clear()           │      │  • Filters/sort/page applied    │
│  • Populates with new selections  │      │  • loadData() fetches new       │
│  • Checkboxes update visually     │      │  •   results from API           │
│                                   │      │  • Table displays new data      │
│                                   │      │                                 │
└───────────────────────────────────┘      └─────────────────────────────────┘

RESULT: UI reflects previous state from history, exactly as it was
```

---

## Special Flow: Page Refresh (F5)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  USER PRESSES F5 (Page Refresh)                                             │
│  • Current URL: /workshop?models=Ford:F-150&page=2&sortBy=year              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  BROWSER RELOAD                                                             │
│  • Full page reload                                                         │
│  • All JavaScript state lost                                                │
│  • URL preserved in browser                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ANGULAR APPLICATION BOOTSTRAP                                              │
│  1. Load Angular framework                                                  │
│  2. Create AppModule                                                        │
│  3. Inject services (singleton instances created)                           │
│  4. RouteStateService constructor executes                                  │
│  5. StateManagementService constructor executes                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ROUTE STATE SERVICE INITIALIZATION                                         │
│  constructor(router, route) {                                               │
│    // Read initial URL params from ActivatedRoute snapshot                  │
│    const initialParams = this.getCurrentParams();                           │
│    this.queryParamsSubject.next(initialParams);                             │
│                                                                             │
│    // Set up listener for future changes                                    │
│    this.initQueryParamsListener();                                          │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  STATE MANAGEMENT SERVICE INITIALIZATION                                    │
│  constructor(routeState, router) {                                          │
│    // Read URL and populate initial state                                   │
│    this.initializeFromUrl();                                                │
│      1. Get current params from RouteStateService                           │
│      2. Convert to SearchFilters via paramsToFilters()                      │
│      3. Store in stateSubject BehaviorSubject                               │
│                                                                             │
│    // Set up listener for future URL changes                                │
│    this.watchUrlChanges();                                                  │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ANGULAR ROUTER RESOLVES ROUTE                                             │
│  • Navigates to /workshop route                                            │
│  • Creates WorkshopComponent instance                                      │
│  • Injects StateManagementService (singleton)                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  WORKSHOP COMPONENT LIFECYCLE                                              │
│  constructor(stateService) { /* Dependency injected */ }                   │
│                                                                            │
│  ngOnInit() {                                                              │
│    // Subscribe to filters (already populated from URL)                    │
│    this.stateService.filters$                                              │
│      .pipe(takeUntil(this.destroy$))                                       │
│      .subscribe(filters => {                                               │
│        // First emission: Contains data from URL                           │
│        this.pickerInitialSelections = [...filters.modelCombos];            │
│        this.tableQueryParams = this.convertToTableParams(filters);         │
│      });                                                                   │
│  }                                                                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                          │                              │
                          ▼                              ▼
┌───────────────────────────────────┐      ┌─────────────────────────────────┐
│                                   │      │                                 │
│  PICKER COMPONENT                 │      │  TABLE COMPONENT                │
│  • Receives initialSelections     │      │  • Receives queryParams         │
│  •   via @Input                   │      │  •   via @Input                 │
│  • ngOnInit + ngOnChanges fire    │      │  • ngOnChanges fires            │
│  • loadData() fetches picker      │      │  • hydrateFromQueryParams()     │
│  •   data from API                │      │  • Applies filters/sort/page    │
│  • After data loads:              │      │  • loadData() fetches results   │
│  •   hydrateSelections()          │      │  • Table displays correct data  │
│  • Checkboxes marked for          │      │                                 │
│  •   Ford:F-150                   │      │                                 │
│                                   │      │                                 │
└───────────────────────────────────┘      └─────────────────────────────────┘

RESULT: Application state fully restored from URL, appears exactly as before refresh
```

---

## Special Flow: Deep Link (Paste URL)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  USER PASTES URL IN NEW BROWSER TAB                                        │
│  • URL: http://autos.minilab/workshop?models=Ford:Mustang&yearMin=1960     │
│  • Fresh browser context (no previous state)                               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        [IDENTICAL TO PAGE REFRESH FLOW]
                  (Bootstrap → Services Init → Component Hydration)
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  RESULT: Application Renders With Exact State From URL                     │
│  • Ford:Mustang selected in picker                                         │
│  • Year filter showing 1960+                                               │
│  • Results table showing matching vehicles                                 │
│  • No previous session data needed                                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Storage Layer Interaction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  TWO INDEPENDENT STORAGE LAYERS                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                          │                              │
                          ▼                              ▼
┌───────────────────────────────────┐      ┌─────────────────────────────────┐
│                                   │      │                                 │
│  LAYER 1: URL (QUERY STATE)       │      │  LAYER 2: localStorage          │
│  Managed by: StateManagementSvc   │      │  (UI PREFERENCES)               │
│                                   │      │  Managed by: Components or      │
│  Purpose: Query/Filter State      │      │  TableStatePersistenceService   │
│  • What data am I looking at?     │      │  (Milestone 003)                │
│                                   │      │                                 │
│  Contents:                        │      │  Purpose: UI Preferences        │
│  • models (selected combinations) │      │  • How do I want to view it?    │
│  • page (current page)            │      │                                 │
│  • size (page size)               │      │  Contents:                      │
│  • sortBy (sort column)           │      │  • Column order                 │
│  • sortOrder (asc/desc)           │      │  • Column visibility            │
│  • yearMin, yearMax (filters)     │      │  • Default page size            │
│  • manufacturer, model, etc.      │      │  • Panel collapse states        │
│                                   │      │  • Grid layout config           │
│  Characteristics:                 │      │                                 │
│  ✅ Shareable (copy/paste URL)    │      │  Characteristics:               │
│  ✅ Bookmarkable                  │      │  ❌ Not shareable               │
│  ✅ Survives refresh              │      │  ✅ Survives browser close      │
│  ✅ Browser back/forward          │      │  ✅ Per-user/per-device         │
│  ✅ Deep linking                  │      │  ❌ Lost if localStorage clear  │
│  ❌ Public (visible in URL)       │      │  ✅ Private                     │
│                                   │      │                                 │
│  Example:                         │      │  Example:                       │
│  /workshop?                       │      │  {                              │
│    models=Ford:F-150&             │      │    "autos-table-vehicle-        │
│    page=2&                        │      │     results-preferences": {     │
│    sortBy=year&                   │      │      "columnOrder": [           │
│    sortOrder=desc                 │      │        "manufacturer",          │
│                                   │      │        "model",                 │
│                                   │      │        "year"                   │
│                                   │      │      ],                         │
│                                   │      │      "visibleColumns": [...],   │
│                                   │      │      "pageSize": 50             │
│                                   │      │    }                            │
│                                   │      │  }                              │
│                                   │      │                                 │
└───────────────────────────────────┘      └─────────────────────────────────┘
                          │                              │
                          │                              │
                          ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  NEVER MIX THESE LAYERS                                                     │
│                                                                             │
│  ❌ WRONG: Column order in URL                                              │
│     ?columns=manufacturer,model,year                                        │
│                                                                             │
│  ❌ WRONG: Active filters in localStorage                                   │
│     localStorage.setItem('filters', JSON.stringify({yearMin: 1960}))        │
│                                                                             │
│  ✅ CORRECT: Query state in URL, UI preferences in localStorage             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Command Pattern (Counter Pattern)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PARENT COMPONENT (WorkshopComponent)                                       │
│  • Needs to command child: "Clear your selections NOW"                      │
│  • Cannot directly access child methods (Angular encapsulation)             │
│  • Solution: Counter pattern                                                │
│                                                                             │
│  pickerClearTrigger = 0;  // Initial value                                  │
│                                                                             │
│  onClearAll(): void {                                                       │
│    this.pickerClearTrigger++;  // Increment: 0 → 1                          │
│    this.stateService.resetFilters();                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ [clearTrigger]="pickerClearTrigger"
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PICKER COMPONENT                                                           │
│  @Input() clearTrigger: number = 0;                                         │
│  private lastClearTrigger = 0;                                              │
│                                                                             │
│  ngOnChanges(changes: SimpleChanges): void {                                │
│    if (changes['clearTrigger'] && !changes['clearTrigger'].firstChange) {   │
│      const newValue = changes['clearTrigger'].currentValue;                 │
│      if (newValue !== this.lastClearTrigger) {                              │
│        this.lastClearTrigger = newValue;                                    │
│        this.selectedRows.clear();  // ✅ Clear action executed              │
│      }                                                                      │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

WHY COUNTER PATTERN:
• Simple primitive (number) - easy change detection
• No reference equality issues (unlike objects/arrays)
• Can detect multiple rapid commands (0→1→2→3)
• Parent controls timing without tight coupling
• Works reliably with Angular change detection

WHY NOT BOOLEAN:
• Setting true→true doesn't trigger ngOnChanges
• Parent would need to toggle true→false→true (complex)
• Race conditions if multiple rapid commands
```

---

## Summary: Key Flows

### 1. User Action Flow
```
User clicks/types → Child emits → Parent updates StateService 
→ StateService updates URL → URL changes → StateService.filters$ emits 
→ Parent receives new filters → Updates child @Inputs 
→ Children hydrate → UI updates
```

### 2. Browser Navigation Flow
```
Back button → Browser History API → Angular Router NavigationEnd 
→ RouteStateService.queryParams$ emits → StateService updates 
→ Components receive new filters → Hydrate → UI updates
```

### 3. Page Refresh Flow
```
F5 → Full reload → Services bootstrap → Read URL params 
→ StateService initializes from URL → Components mount 
→ Receive filters from state → Hydrate → UI renders
```

### 4. Deep Link Flow
```
Paste URL → Browser navigate → [Same as Page Refresh] 
→ Application renders with exact state from URL
```

---

## State Flow Principles

1. **URL is Truth** - All query state stored in URL parameters
2. **Unidirectional Flow** - State flows one direction through services
3. **Observable Pattern** - Components subscribe, never call directly
4. **Input-Based Hydration** - Children receive state via @Input, not services
5. **Event Bubbling** - Events flow up (emit), state flows down (input)
6. **Idempotent Operations** - Hydration safe to call multiple times
7. **No Direct Coupling** - Components never talk to each other directly
8. **Storage Separation** - URL (query) vs localStorage (UI preferences)

---

**End of Complete State Flow Diagram**

This document provides the comprehensive, non-simplified view of how state flows through the entire AUTOS application architecture.
