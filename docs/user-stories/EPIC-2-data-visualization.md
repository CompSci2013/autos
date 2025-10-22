# Epic 2: Data Visualization & Table Management

**Epic ID:** EPIC-2
**Epic Owner:** UX Lead
**Status:** In Progress
**Priority:** High
**Business Value:** Enable users to customize and manage complex data tables efficiently

---

## Epic Description

Create a reusable, high-performance table component that supports advanced features like column management, sorting, filtering, row expansion, and persistence of user preferences. This component should be generic and adaptable to multiple data sources.

**Success Metrics:**
- Render 1000+ rows without performance degradation
- User preferences persist across sessions
- 90% of users customize column order/visibility

---

## Feature 2.1: BaseDataTable Component (Reusable)

### Story 2.1.1: Create Generic Table Component

**As a** developer,
**I want** a reusable BaseDataTableComponent that works with any data source,
**So that** I can quickly build consistent tables throughout the application.

**Priority:** Critical
**Story Points:** 13
**Sprint:** Sprint 7

#### Acceptance Criteria
- [ ] Component uses generic TypeScript typing: `BaseDataTableComponent<T>`
- [ ] Accepts `TableColumn[]` configuration
- [ ] Accepts `TableDataSource<T>` adapter
- [ ] Supports OnPush change detection for performance
- [ ] Emits events for user actions (page change, sort, filter)
- [ ] Fully documented with JSDoc comments
- [ ] Example usage in component documentation

#### Technical Notes
- Uses adapter pattern for data source
- NG-ZORRO `nz-table` as base UI component
- Observable-based data flow
- Located in `src/app/shared/components/base-data-table/`

#### Definition of Done
- [ ] Unit tests: 80%+ coverage
- [ ] Integration tests with mock data source
- [ ] Performance test: 1000 rows render < 500ms
- [ ] Component story in Storybook (if available)

---

### Story 2.1.2: Implement TableDataSource Adapter Pattern

**As a** developer,
**I want** a TableDataSource interface that decouples data fetching from table rendering,
**So that** I can use the same table with different APIs/data sources.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 7

#### Acceptance Criteria
- [ ] Interface defined: `TableDataSource<T>`
- [ ] Method: `fetch(params: TableQueryParams): Observable<TableResponse<T>>`
- [ ] Example adapters: VehicleDataSourceAdapter, PickerDataSourceAdapter
- [ ] Supports client-side and server-side pagination
- [ ] Handles errors gracefully (return empty result)

#### Technical Notes
```typescript
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}

interface TableQueryParams {
  page: number;
  size: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: { [key: string]: any };
}

interface TableResponse<T> {
  results: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

#### Definition of Done
- [ ] Interface exported from shared module
- [ ] Documentation with examples
- [ ] Mock adapter for testing

---

### Story 2.1.3: Implement ng-template Slots for Customization

**As a** developer,
**I want** to use ng-template slots to customize cell rendering and expansion content,
**So that** I can tailor the table to specific use cases without modifying base component.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 8

#### Acceptance Criteria
- [ ] `#cellTemplate` slot for custom cell rendering
- [ ] `#expansionTemplate` slot for row expansion content
- [ ] `#headerTemplate` slot for custom column headers
- [ ] Template context provides: column, row, index
- [ ] Fallback to default rendering if no template provided

#### Technical Notes
- Uses `@ContentChild` to access templates
- Template context: `{ $implicit: row, column: column, index: index }`

#### Definition of Done
- [ ] Examples in documentation
- [ ] Works with all column types
- [ ] No performance impact (OnPush detection)

---

## Feature 2.2: Column Management

### Story 2.2.1: Display Configurable Columns

**As an** end user,
**I want** to see table columns based on configuration,
**So that** the table displays relevant data for my use case.

**Priority:** High
**Story Points:** 3
**Sprint:** Sprint 8

#### Acceptance Criteria
- [ ] Columns defined via `TableColumn[]` input
- [ ] Each column config specifies: key, label, sortable, filterable, hideable
- [ ] Columns render in order defined
- [ ] Column widths configurable (fixed or flexible)
- [ ] Supports custom formatters per column

#### Technical Notes
```typescript
interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  hideable: boolean;
  width?: string;
  minWidth?: string;
  formatter?: (value: any, row: T) => string | number;
  align?: 'left' | 'center' | 'right';
}
```

#### Definition of Done
- [ ] Responsive column sizing
- [ ] Tooltip on column headers (if needed)

---

### Story 2.2.2: Reorder Columns via Drag-and-Drop

**As an** end user,
**I want** to drag column headers to reorder columns,
**So that** I can arrange data in my preferred layout.

**Priority:** Medium
**Story Points:** 8
**Sprint:** Sprint 9

#### Acceptance Criteria
- [ ] Drag handle visible in column header
- [ ] Dragging shows preview/ghost of column
- [ ] Drop reorders columns immediately
- [ ] Order persists to localStorage
- [ ] Animation smooth (250ms transition)
- [ ] Works on desktop (mouse) and touch devices

#### Technical Notes
- Uses Angular CDK DragDrop module
- Persists to `TableStatePersistenceService`
- Conflict resolution: Disable grid drag during column drag (workshop page)

#### Definition of Done
- [ ] No layout shift when dragging
- [ ] Accessible (keyboard reorder with Ctrl+Arrow keys)
- [ ] Works across all browsers

---

### Story 2.2.3: Toggle Column Visibility

**As an** end user,
**I want** to show/hide columns using a column manager UI,
**So that** I can focus on relevant data and reduce clutter.

**Priority:** Medium
**Story Points:** 5
**Sprint:** Sprint 9

#### Acceptance Criteria
- [ ] "Manage Columns" button opens column manager
- [ ] Column manager shows all columns with checkboxes
- [ ] Check/uncheck to show/hide columns
- [ ] Changes apply immediately
- [ ] Visibility state persists to localStorage
- [ ] At least one column must remain visible (validation)
- [ ] "Reset to Default" button restores original columns

#### Technical Notes
- Uses `ColumnManagerComponent` (modal or dropdown)
- NG-ZORRO Transfer component for UI
- Persists to localStorage: `autos-table-{tableId}-preferences`

#### Definition of Done
- [ ] Search filter in column manager
- [ ] Shows column statistics (sortable, filterable, etc.)

---

### Story 2.2.4: Reset Columns to Default

**As an** end user,
**I want** to reset column order and visibility to defaults,
**So that** I can undo customizations if I make mistakes.

**Priority:** Low
**Story Points:** 2
**Sprint:** Sprint 9

#### Acceptance Criteria
- [ ] "Reset Columns" button in column manager
- [ ] Confirmation dialog: "Reset to default layout?"
- [ ] Resets order and visibility
- [ ] Clears localStorage preferences
- [ ] Immediate visual update

#### Technical Notes
- Calls `TableStatePersistenceService.resetPreferences(tableId)`

#### Definition of Done
- [ ] Animation shows columns returning to default positions

---

## Feature 2.3: Sorting & Pagination

### Story 2.3.1: Tri-State Column Sorting

**As an** end user,
**I want** to click column headers to cycle through sort states (asc → desc → none),
**So that** I can order data flexibly.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 10

#### Acceptance Criteria
- [ ] Click header: unsorted → ascending
- [ ] Click again: ascending → descending
- [ ] Click third time: descending → unsorted (default order)
- [ ] Sort icon indicates state:
  - No icon = unsorted
  - ▲ = ascending
  - ▼ = descending
- [ ] Only sortable columns show icon
- [ ] Single-column sort (no multi-column for MVP)

#### Technical Notes
- Emits `queryParamsChange` event with sortBy and sortOrder
- Parent component handles sorting (server-side or client-side)

#### Definition of Done
- [ ] Keyboard accessible (Enter/Space key)
- [ ] Sort state persists in URL

---

### Story 2.3.2: Client-Side Pagination

**As an** end user,
**I want** client-side pagination for small datasets,
**So that** I can navigate data without server round-trips.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 10

#### Acceptance Criteria
- [ ] Pagination controls at bottom of table
- [ ] Previous/Next buttons
- [ ] Page number display: "Page X of Y"
- [ ] Configurable page size: 10, 20, 50, 100
- [ ] All data loaded in memory (one-time fetch)
- [ ] Instant page changes (no loading state)

#### Technical Notes
- Adapter returns all data in single fetch
- Table component slices data for display

#### Definition of Done
- [ ] Performance: Handles 10,000 rows smoothly
- [ ] Memory-efficient (virtual scrolling if needed)

---

### Story 2.3.3: Server-Side Pagination

**As an** end user,
**I want** server-side pagination for large datasets,
**So that** pages load quickly even with millions of records.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 10

#### Acceptance Criteria
- [ ] Adapter makes new request per page
- [ ] Loading state displays during fetch
- [ ] Previous/Next buttons
- [ ] Jump to page input
- [ ] Page size dropdown: 10, 20, 50, 100
- [ ] Total result count displayed
- [ ] URL updates with page and size parameters

#### Technical Notes
- Adapter passes `page` and `size` to backend
- Backend uses Elasticsearch `from` and `size`

#### Definition of Done
- [ ] Error handling for failed page loads
- [ ] Scroll to top on page change

---

## Feature 2.4: Expandable Row Details

### Story 2.4.1: Expand Single Row

**As an** end user,
**I want** to click a row to expand and view additional details,
**So that** I can see more information without navigating away.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 11

#### Acceptance Criteria
- [ ] Expand icon (▶) in first column
- [ ] Click icon or row expands content
- [ ] Expansion area distinct (indented, different background)
- [ ] Collapse icon (▼) when expanded
- [ ] Only one row expanded at a time (configurable)
- [ ] Smooth animation (300ms)

#### Technical Notes
- Uses ng-template slot: `#expansionTemplate`
- Tracks expanded rows in component state

#### Definition of Done
- [ ] Keyboard accessible (Enter expands)
- [ ] Accessible (ARIA expanded attribute)

---

### Story 2.4.2: Load Expansion Content on Demand

**As an** end user,
**I want** expansion content to load when I expand a row,
**So that** initial page load is fast.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 11

#### Acceptance Criteria
- [ ] Expansion shows loading spinner initially
- [ ] Content fetched via callback/API call
- [ ] Cached after first load (don't refetch)
- [ ] Error message if load fails
- [ ] Retry button on error

#### Technical Notes
- Emits `rowExpand` event with row data
- Parent component handles loading
- Stores loaded content in `expandedRowsData` map

#### Definition of Done
- [ ] No memory leaks (cleanup on destroy)

---

### Story 2.4.3: Expand All / Collapse All

**As an** end user,
**I want** buttons to expand or collapse all rows at once,
**So that** I can quickly view all details or clean up the view.

**Priority:** Low
**Story Points:** 3
**Sprint:** Sprint 12

#### Acceptance Criteria
- [ ] "Expand All" button above table
- [ ] "Collapse All" button above table
- [ ] Expand All loads content for all rows (with loading state)
- [ ] Maximum 100 rows expanded (show warning if more)
- [ ] Smooth staggered animation (not all at once)

#### Technical Notes
- Uses `expandAllRows()` and `collapseAllRows()` methods
- Limits to visible page only (not entire dataset)

#### Definition of Done
- [ ] Performance: Handles 100 expansions < 3 seconds

---

## Feature 2.5: Column Filtering

### Story 2.5.1: Text Column Filter

**As an** end user,
**I want** to filter columns with text input,
**So that** I can narrow down results quickly.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 12

#### Acceptance Criteria
- [ ] Filter input in column header (small icon to toggle)
- [ ] Debounced input (300ms)
- [ ] Case-insensitive partial match
- [ ] Clear button (X icon) in input
- [ ] Filter icon shows active state when filter applied
- [ ] Supports multiple column filters simultaneously

#### Technical Notes
- Emits `queryParamsChange` with filters object
- Uses RxJS `debounceTime()` and `distinctUntilChanged()`

#### Definition of Done
- [ ] Placeholder text: "Filter {column name}..."
- [ ] Accessible (ARIA labels)

---

### Story 2.5.2: Numeric Range Filter

**As an** end user,
**I want** to filter numeric columns with min/max range,
**So that** I can find values within specific bounds.

**Priority:** Medium
**Story Points:** 5
**Sprint:** Sprint 13

#### Acceptance Criteria
- [ ] Two inputs: "Min" and "Max"
- [ ] Validation: min ≤ max
- [ ] Accepts numeric values only
- [ ] Debounced (500ms)
- [ ] Clear button removes filter

#### Technical Notes
- Uses same filter mechanism as text
- Backend uses Elasticsearch range query

#### Definition of Done
- [ ] Handles decimal values (e.g., 2.5)
- [ ] Empty inputs = no filter

---

### Story 2.5.3: Dropdown Select Filter

**As an** end user,
**I want** to filter columns using dropdown select,
**So that** I can choose from predefined options.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 13

#### Acceptance Criteria
- [ ] Dropdown in column header
- [ ] Options defined in column config
- [ ] "All" option clears filter
- [ ] Selection updates results immediately
- [ ] Shows count per option (if available)

#### Technical Notes
```typescript
interface TableColumn {
  filterType: 'select';
  filterOptions: Array<{ label: string; value: any }>;
}
```

#### Definition of Done
- [ ] Dropdown searchable (NG-ZORRO `nz-select` with search)

---

## Feature 2.6: Table State Persistence

### Story 2.6.1: Persist Column Preferences to localStorage

**As an** end user,
**I want** my column order and visibility saved automatically,
**So that** I don't have to reconfigure the table each session.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 14

#### Acceptance Criteria
- [ ] Column order saved on change
- [ ] Column visibility saved on change
- [ ] Page size preference saved
- [ ] Preferences loaded on component init
- [ ] Unique storage key per table: `autos-table-{tableId}-preferences`
- [ ] Preferences don't sync across devices (localStorage only)

#### Technical Notes
- Uses `TableStatePersistenceService`
- Saved format:
```typescript
interface TablePreferences {
  columnOrder: string[];
  visibleColumns: string[];
  pageSize?: number;
  lastUpdated: number;
}
```

#### Definition of Done
- [ ] Preferences survive browser refresh
- [ ] No preferences saved for incognito/private mode (graceful fallback)

---

### Story 2.6.2: Export Table Preferences

**As an** end user,
**I want** to export my table preferences as JSON,
**So that** I can back them up or share with others.

**Priority:** Low
**Story Points:** 2
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] "Export Preferences" button in column manager
- [ ] Downloads JSON file: `autos-table-{tableId}-prefs.json`
- [ ] JSON includes: columnOrder, visibleColumns, pageSize, timestamp

#### Technical Notes
- Uses browser download API

#### Definition of Done
- [ ] File naming convention clear

---

### Story 2.6.3: Import Table Preferences

**As an** end user,
**I want** to import table preferences from JSON,
**So that** I can restore saved settings or use shared configurations.

**Priority:** Low
**Story Points:** 3
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] "Import Preferences" button in column manager
- [ ] File picker accepts `.json` files
- [ ] Validates JSON structure
- [ ] Confirms import: "Apply imported preferences?"
- [ ] Applies preferences immediately
- [ ] Error message for invalid files

#### Technical Notes
- Validates against `TablePreferences` interface
- Calls `TableStatePersistenceService.importPreferences()`

#### Definition of Done
- [ ] Handles malformed JSON gracefully

---

## Backlog Stories (Future)

### Story 2.X.X: ColumnManagerComponent UI
- Create dedicated component for managing columns
- NG-ZORRO Transfer component (left/right lists)
- Search/filter columns
- Drag to reorder within manager

### Story 2.X.X: Virtual Scrolling for Large Datasets
- Implement CDK virtual scroll
- Render only visible rows
- Handle 100,000+ rows smoothly

### Story 2.X.X: Multi-Column Sorting
- Sort by up to 3 columns
- Priority order (primary, secondary, tertiary)

### Story 2.X.X: Frozen Columns
- Pin columns to left or right
- Useful for ID columns or actions

### Story 2.X.X: Resize Columns
- Drag column borders to resize
- Persist widths to localStorage

---

**Epic Status:** 40% Complete (Milestone 003 partially implemented)
**Last Updated:** 2025-10-22
