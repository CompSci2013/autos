# Milestone 003: Reusable Base Data Table Component

**Date:** 2025-10-16  
**Status:** Design Phase - Ready for Implementation  
**Objective:** Extract all table-specific logic into a reusable component to eliminate code duplication and provide consistent table behavior across the application.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Design Decisions](#design-decisions)
3. [Architecture Overview](#architecture-overview)
4. [Component Structure](#component-structure)
5. [Feature Requirements](#feature-requirements)
6. [Data Models](#data-models)
7. [Implementation Plan](#implementation-plan)
8. [Testing Strategy](#testing-strategy)
9. [Migration Path](#migration-path)

---

## Problem Statement

### Current State

- **Code Duplication:** Table logic (filtering, sorting, pagination, column reordering) is repeated across components
- **Inconsistent Behavior:** Each table reimplements features differently
- **Maintenance Burden:** Bug fixes and enhancements must be applied to multiple tables
- **Future Tables:** New tables will require copying ~400 lines of boilerplate code

### Current Table Implementations

1. **Vehicle Results Table** (`vehicle-results-table.component.ts` - ~400 lines)

   - Column reordering with drag-drop
   - Server-side filtering (debounced inputs)
   - Server-side sorting
   - Server-side pagination
   - Row expansion for VIN instances
   - localStorage persistence for column order

2. **Manufacturer-Model Picker** (`manufacturer-model-table-picker.component.ts` - ~500 lines)
   - NOT a pure table (amalgamation of table + tree + multi-select + chips)
   - Will NOT use base table component
   - Remains a specialized selection widget

### Target State

- **Single Source of Truth:** All table logic in reusable `BaseDataTableComponent`
- **Consistent UX:** All tables behave identically for common operations
- **Easy Extension:** New tables require minimal code (~50-100 lines vs 400+)
- **Feature Parity:** Column reordering, visibility management, filtering, sorting, pagination

---

## Design Decisions

### Decision 1: Composition over Inheritance ✅

**Pattern:** Wrapper component (composition)

**Rationale:**

- Lower cognitive load (explicit inputs/outputs)
- Easier to test (mock inputs vs understanding base class)
- More flexible (can swap implementations)
- Angular-idiomatic (framework favors composition)
- Better TypeScript generic support

**Implementation:**

```typescript
// Parent component uses base table
<app-base-data-table
  [tableId]="'vehicle-results'"
  [columns]="columnDefinitions"
  [dataSource]="vehicleDataSource"
  [expandable]="true"
  (rowExpand)="onRowExpand($event)">

  <!-- Custom cell templates -->
  <ng-template #cellTemplate let-column="column" let-row="row">
    <!-- Custom rendering logic -->
  </ng-template>

  <!-- Expansion content -->
  <ng-template #expansionTemplate let-row="row">
    <!-- VIN instances table, details, etc -->
  </ng-template>
</app-base-data-table>
```

**Rejected Alternative:** Base class inheritance (fragile, hidden dependencies)

---

### Decision 2: ng-template Slots for Customization ✅

**Pattern:** Hybrid approach with template projection

**Rationale:**

- Each table has unique rendering needs (tags, badges, icons, charts)
- Pure configuration (formatters) fails for complex components
- ng-template provides maximum flexibility
- Keeps base component generic

**Templates Required:**

1. **cellTemplate** - Custom cell rendering per column
2. **expansionTemplate** - Expanded row content
3. **filterTemplate** (optional) - Custom filter inputs per column

**Example:**

```html
<ng-template #cellTemplate let-column="column" let-row="row">
  <ng-container [ngSwitch]="column.key">
    <nz-tag *ngSwitchCase="'data_source'" [nzColor]="getSourceColor(row)">
      {{ row.data_source }}
    </nz-tag>
    <nz-rate
      *ngSwitchCase="'condition_rating'"
      [ngModel]="row.condition_rating"
      [nzDisabled]="true"
    >
    </nz-rate>
    <code *ngSwitchCase="'vin'">{{ row.vin }}</code>
    <span *ngSwitchDefault>{{ row[column.key] }}</span>
  </ng-container>
</ng-template>
```

---

### Decision 3: Generic Row Expansion ✅

**Pattern:** Optional expansion with template slot

**Rationale:**

- Not all tables need expansion (optional feature)
- Expansion content varies by table (VIN instances, order details, etc)
- Template slot provides maximum flexibility

**Implementation:**

- Base table manages expansion state (Set<rowId>)
- Parent provides expansion content via ng-template
- Base table emits `(rowExpand)` event for lazy-loading data

---

### Decision 4: SharedModule Structure ✅

**Pattern:** SharedModule for Angular 14, standalone components later

**Structure:**

```
frontend/src/app/shared/
├── shared.module.ts
├── components/
│   └── base-data-table/
│       ├── base-data-table.component.ts
│       ├── base-data-table.component.html
│       ├── base-data-table.component.scss
│       └── column-manager/
│           ├── column-manager.component.ts    (drawer UI)
│           ├── column-manager.component.html
│           └── column-manager.component.scss
├── models/
│   ├── table-column.model.ts
│   ├── table-data-source.model.ts
│   └── table-query-params.model.ts
└── services/
    └── table-state-persistence.service.ts
```

**Future Migration (Angular 15+):**

- Convert to standalone components
- Remove SharedModule
- Direct imports per component
- Tree-shakeable, faster builds
- Migration: Add `standalone: true`, move imports to component

---

### Decision 5: Column Visibility Management ✅

**Pattern:** NG-ZORRO Drawer with Transfer component

**UI Components:**

- **Trigger:** Icon button in table header actions (`<i nz-icon nzType="setting"></i>`)
- **Interface:** `nz-drawer` from right side
- **Control:** `nz-transfer` for moving columns between visible/hidden
- **Persistence:** localStorage (future: preferences service)

**Rationale for Drawer over Modal:**

- User can see table changes in real-time
- Less context switching (no block/unblock)
- Modern UX (similar to Google Sheets, Excel Online)
- Fits existing grid layout pattern

**Features:**

- Drag to reorder visible columns within transfer
- Search/filter columns by name
- Bulk actions (show all, hide all)
- Reset to defaults button

---

### Decision 6: Column Dependencies and Constraints ✅

**Pattern:** Declarative configuration with validation

**Requirements:**

1. **Required Columns:** Some columns cannot be hidden (e.g., primary identifier)
2. **Dependent Columns:** Column X requires Column Y to be visible
3. **Grouped Columns:** Toggle multiple related columns together

**Configuration:**

```typescript
{
  key: 'engine_displacement_l',
  label: 'Displacement (L)',
  hideable: true,
  requiredColumns: ['engine_type'],  // Must show engine_type first
  groupId: 'engine-specs'            // Toggle with other engine columns
}
```

**Validation:**

- Prevent hiding required columns (show warning)
- Auto-show dependencies when showing dependent column
- Show grouped columns together

---

## Architecture Overview

### Component Hierarchy

```
BaseDataTableComponent (generic, reusable)
├── Manages column state (order, visibility, width)
├── Handles server-side operations (filter, sort, paginate)
├── Manages row expansion state
├── Persists preferences to localStorage
├── Provides template slots for customization
└── Integrates ColumnManagerComponent

ColumnManagerComponent (drawer UI)
├── nz-drawer wrapper
├── nz-transfer for column management
├── Search/filter columns
├── Validation for dependencies
└── Emits column changes

VehicleResultsTableComponent (specific implementation)
├── Defines column configuration
├── Provides data source (API service)
├── Implements custom cell templates
├── Implements expansion template
└── Minimal logic (~50-100 lines)

FutureTableComponent (easy to create)
├── Same pattern as VehicleResultsTableComponent
└── Different data, different columns
```

---

## Component Structure

### BaseDataTableComponent

**Inputs:**

```typescript
@Input() tableId: string;                          // Unique ID for localStorage
@Input() columns: TableColumn<T>[];                // Column definitions
@Input() dataSource: TableDataSource<T>;           // Data fetching interface
@Input() expandable: boolean = false;              // Enable row expansion
@Input() defaultPageSize: number = 20;             // Default page size
@Input() pageSizeOptions: number[] = [10,20,50,100];
@Input() showColumnManager: boolean = true;        // Show manage columns button
@Input() showResetButton: boolean = true;          // Show reset columns button
```

**Outputs:**

```typescript
@Output() rowExpand = new EventEmitter<T>();       // Row expanded
@Output() rowCollapse = new EventEmitter<T>();     // Row collapsed
@Output() filterChange = new EventEmitter<TableQueryParams>();
@Output() sortChange = new EventEmitter<TableQueryParams>();
@Output() pageChange = new EventEmitter<TableQueryParams>();
```

**Template Slots:**

```typescript
@ContentChild('cellTemplate') cellTemplate?: TemplateRef<any>;
@ContentChild('expansionTemplate') expansionTemplate?: TemplateRef<any>;
@ContentChild('filterTemplate') filterTemplate?: TemplateRef<any>;
```

**Public Methods:**

```typescript
refresh(): void;                    // Reload data
resetColumns(): void;               // Reset to default order/visibility
exportColumnConfig(): string;       // Export as JSON
importColumnConfig(json: string): void;
```

---

### ColumnManagerComponent

**Inputs:**

```typescript
@Input() columns: TableColumn<T>[];
@Input() visibleColumns: string[];
@Input() columnOrder: string[];
```

**Outputs:**

```typescript
@Output() visibilityChange = new EventEmitter<string[]>();
@Output() orderChange = new EventEmitter<string[]>();
@Output() reset = new EventEmitter<void>();
```

**Features:**

- nz-drawer slides from right
- nz-transfer with drag-to-reorder
- Search box to filter columns
- "Show All" / "Hide All" buttons
- "Reset to Defaults" button
- Validation messages for dependencies

---

## Feature Requirements

### 1. Column Reordering (Drag & Drop)

**Status:** ✅ Already implemented in VehicleResultsTable, needs extraction

**Requirements:**

- Angular CDK Drag & Drop
- Drag column headers to reorder
- Visual feedback during drag (preview, placeholder)
- Persist order to localStorage
- Prevent drag during column manager open

**Implementation:**

```html
<thead
  cdkDropList
  cdkDropListOrientation="horizontal"
  (cdkDropListDropped)="onColumnDrop($event)"
>
  <th *ngFor="let column of visibleColumns" cdkDrag>
    <div class="header-content">
      <span>{{ column.label }}</span>
      <i nz-icon nzType="drag" class="drag-handle"></i>
    </div>
  </th>
</thead>
```

---

### 2. Column Visibility Management

**Status:** 🆕 New feature for this milestone

**Requirements:**

- Button in header actions area (next to Reset Columns)
- Drawer slides from right with nz-transfer
- Search/filter columns by name
- Drag to reorder visible columns
- Validate dependencies before hiding
- Persist visibility to localStorage

**User Flow:**

1. Click "Manage Columns" button (gear icon)
2. Drawer opens from right
3. See two lists: "Hidden" and "Visible"
4. Move columns between lists
5. Reorder visible columns by dragging
6. Changes apply immediately (real-time preview)
7. Close drawer or click "Done"

**Edge Cases:**

- Cannot hide required columns (show tooltip)
- Hiding column with dependents shows warning
- Showing column auto-shows required dependencies
- Empty visible list prevented (must have at least one column)

---

### 3. Server-Side Filtering

**Status:** ✅ Already implemented, needs extraction

**Requirements:**

- Filter inputs in header row (below column labels)
- Debounced input (800ms) to reduce API calls
- Support multiple filter types:
  - Text (substring match)
  - Number range (min/max)
  - Date range (start/end)
  - Select dropdown (discrete values)
- Clear individual filters
- Clear all filters button
- Visual indicator when filters active

**Implementation:**

```typescript
// Filter subjects for debouncing
private filterSubjects = new Map<string, Subject<string>>();

setupFilterDebouncing(column: TableColumn): void {
  const subject = new Subject<string>();
  this.filterSubjects.set(column.key, subject);

  subject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    takeUntil(this.destroy$)
  ).subscribe(value => {
    this.updateFilter(column.key, value);
  });
}
```

---

### 4. Server-Side Sorting

**Status:** ✅ Already implemented, needs extraction

**Requirements:**

- Click column header to sort
- Three states: none → asc → desc → none
- Visual indicator (arrow icon)
- Only one column sorted at a time
- Persist sort to query params (not localStorage)

**Implementation:**

```typescript
onSort(columnKey: string): void {
  if (this.sortColumn === columnKey) {
    // Cycle: asc → desc → none
    if (this.sortDirection === 'asc') {
      this.sortDirection = 'desc';
    } else if (this.sortDirection === 'desc') {
      this.sortColumn = null;
      this.sortDirection = null;
    }
  } else {
    this.sortColumn = columnKey;
    this.sortDirection = 'asc';
  }
  this.fetchData();
}
```

---

### 5. Server-Side Pagination

**Status:** ✅ Already implemented, needs extraction

**Requirements:**

- NG-ZORRO pagination component
- Configurable page sizes
- Page size selection persisted
- Total count from API
- Page change triggers data fetch

---

### 6. Row Expansion

**Status:** ✅ Already implemented, needs extraction

**Requirements:**

- Expandable rows (optional feature)
- Toggle icon in first column
- Expansion state managed by base component
- Parent provides expansion content via ng-template
- Lazy load expansion data on first expand
- Visual indicator (icon changes: + to -)

**Implementation:**

```typescript
expandSet = new Set<string>();

onExpandChange(rowId: string, expanded: boolean): void {
  if (expanded) {
    this.expandSet.add(rowId);
    this.rowExpand.emit(this.getRow(rowId));
  } else {
    this.expandSet.delete(rowId);
    this.rowCollapse.emit(this.getRow(rowId));
  }
}
```

---

### 7. localStorage Persistence

**Status:** ⚠️ Partial (only column order), needs enhancement

**Requirements:**

- Persist per table using `tableId`
- Column order
- Column visibility
- Page size preference
- NOT persisted: filters, sort, page number (use URL for these)

**Storage Structure:**

```typescript
interface TablePreferences {
  columnOrder: string[];
  columnVisibility: { [key: string]: boolean };
  pageSize: number;
}

// localStorage key: `autos-table-${tableId}-preferences`
```

**Service:**

```typescript
@Injectable({ providedIn: 'root' })
export class TableStatePersistenceService {
  savePreferences(tableId: string, prefs: TablePreferences): void;
  loadPreferences(tableId: string): TablePreferences | null;
  resetPreferences(tableId: string): void;
  exportPreferences(tableId: string): string; // JSON
  importPreferences(tableId: string, json: string): void;
}
```

---

## Data Models

### TableColumn Interface

```typescript
export interface TableColumn<T = any> {
  // Basic configuration
  key: keyof T; // Property key from data model
  label: string; // Display name
  width?: string; // CSS width (e.g., '180px', 'auto')

  // Sorting
  sortable?: boolean; // Can this column be sorted?
  sortKey?: string; // Backend sort field (if different from key)

  // Filtering
  filterable?: boolean; // Can this column be filtered?
  filterType?: 'text' | 'number' | 'date-range' | 'select';
  filterOptions?: any[]; // For select type
  filterKey?: string; // Backend filter field (if different from key)

  // Visibility
  visible?: boolean; // Default visibility state
  hideable?: boolean; // Can user hide this column? (default: true)

  // Dependencies
  requiredColumns?: (keyof T)[]; // Must show these columns first
  groupId?: string; // Group ID for toggling multiple columns

  // Formatting (for simple cases, complex use ng-template)
  formatter?: (value: any, row: T) => string | number;

  // Alignment
  align?: 'left' | 'center' | 'right';
}
```

---

### TableDataSource Interface

```typescript
export interface TableDataSource<T> {
  /**
   * Fetch data from server
   * Returns observable of paginated response
   */
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}

export interface TableQueryParams {
  page: number;
  size: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: { [key: string]: any };
}

export interface TableResponse<T> {
  results: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

---

### Example Usage in Parent Component

```typescript
@Component({
  selector: 'app-vehicle-results-table',
  template: `
    <app-base-data-table
      [tableId]="'vehicle-results'"
      [columns]="columns"
      [dataSource]="dataSource"
      [expandable]="true"
      (rowExpand)="loadVehicleInstances($event)"
    >
      <!-- Custom cell rendering -->
      <ng-template #cellTemplate let-column="column" let-row="row">
        <ng-container [ngSwitch]="column.key">
          <nz-tag *ngSwitchCase="'data_source'" [nzColor]="'blue'">
            {{ row.data_source }}
          </nz-tag>
          <small *ngSwitchCase="'vehicle_id'" class="vehicle-id">
            {{ row.vehicle_id }}
          </small>
          <span *ngSwitchDefault>{{ row[column.key] }}</span>
        </ng-container>
      </ng-template>

      <!-- Expansion content -->
      <ng-template #expansionTemplate let-row="row">
        <div class="vehicle-instances">
          <h4>VIN Instances</h4>
          <nz-table [nzData]="getInstances(row.vehicle_id)" nzSize="small">
            <!-- VIN instance table -->
          </nz-table>
        </div>
      </ng-template>
    </app-base-data-table>
  `,
})
export class VehicleResultsTableComponent implements OnInit {
  columns: TableColumn<VehicleResult>[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      sortable: true,
      filterable: true,
      hideable: false,
    },
    { key: 'model', label: 'Model', sortable: true, filterable: true },
    {
      key: 'year',
      label: 'Year',
      sortable: true,
      filterable: true,
      filterType: 'number',
    },
    {
      key: 'body_class',
      label: 'Body Class',
      sortable: true,
      filterable: true,
    },
    {
      key: 'data_source',
      label: 'Data Source',
      sortable: true,
      filterable: true,
    },
    {
      key: 'vehicle_id',
      label: 'Vehicle ID',
      sortable: false,
      filterable: false,
    },
  ];

  dataSource: TableDataSource<VehicleResult> = {
    fetch: (params) =>
      this.apiService.getVehicleDetails(
        this.selectedModels,
        params.page,
        params.size,
        params.filters,
        params.sortBy,
        params.sortOrder
      ),
  };

  loadVehicleInstances(vehicle: VehicleResult): void {
    this.apiService
      .getVehicleInstances(vehicle.vehicle_id)
      .subscribe((instances) =>
        this.expandedRowInstances.set(vehicle.vehicle_id, instances)
      );
  }
}
```

---

## Implementation Plan

### Phase 1: Foundation (Steps 1-5)

1. **Create SharedModule structure**

   - Create `frontend/src/app/shared/` directory
   - Create `shared.module.ts`
   - Set up exports for NG-ZORRO components

2. **Create data models**

   - `table-column.model.ts`
   - `table-data-source.model.ts`
   - `table-query-params.model.ts`

3. **Create TableStatePersistenceService**

   - localStorage read/write methods
   - Export/import JSON methods
   - Reset methods

4. **Generate BaseDataTableComponent**

   - Use Angular CLI
   - Set up basic structure

5. **Generate ColumnManagerComponent**
   - Use Angular CLI
   - Set up drawer wrapper

---

### Phase 2: Core Features (Steps 6-10)

6. **Implement BaseDataTableComponent structure**

   - Inputs/Outputs
   - Template slot setup (@ContentChild)
   - Basic nz-table integration

7. **Implement column management**

   - Column ordering logic
   - Column visibility logic
   - Integration with persistence service

8. **Implement server-side operations**

   - Filtering with debouncing
   - Sorting state management
   - Pagination integration

9. **Implement row expansion**

   - Expansion state management
   - Template projection
   - Event emission

10. **Implement ColumnManagerComponent**
    - nz-drawer wrapper
    - nz-transfer integration
    - Dependency validation
    - Search/filter columns

---

### Phase 3: Integration (Steps 11-15)

11. **Create VehicleDataSource adapter**

    - Implement TableDataSource interface
    - Wrap existing API service calls

12. **Refactor VehicleResultsTableComponent**

    - Replace internal logic with BaseDataTable
    - Define column configuration
    - Implement cell templates
    - Implement expansion template

13. **Update styles**

    - Extract common table styles
    - Ensure consistent appearance
    - Fix any spacing/alignment issues

14. **Test all features**

    - Column reordering
    - Column visibility
    - Filtering
    - Sorting
    - Pagination
    - Row expansion
    - localStorage persistence

15. **Update documentation**
    - Add usage examples
    - Document TableColumn interface
    - Document TableDataSource pattern

---

### Phase 4: Polish (Steps 16-18)

16. **Handle edge cases**

    - Empty data states
    - Loading states
    - Error states
    - Validation messages

17. **Performance optimization**

    - trackBy functions
    - OnPush change detection
    - Debounce/throttle where needed

18. **Code review and cleanup**
    - Remove dead code from VehicleResultsTable
    - Ensure no duplication
    - Add comments

---

## Testing Strategy

### Unit Tests

```typescript
describe('BaseDataTableComponent', () => {
  it('should initialize with default column order');
  it('should load column preferences from localStorage');
  it('should reorder columns on drag-drop');
  it('should toggle column visibility');
  it('should validate column dependencies');
  it('should debounce filter inputs');
  it('should emit sort changes');
  it('should manage expansion state');
  it('should reset columns to defaults');
});

describe('ColumnManagerComponent', () => {
  it('should open/close drawer');
  it('should move columns between visible/hidden');
  it('should reorder visible columns');
  it('should prevent hiding required columns');
  it('should auto-show dependencies');
  it('should search/filter columns');
});

describe('TableStatePersistenceService', () => {
  it('should save preferences to localStorage');
  it('should load preferences from localStorage');
  it('should reset preferences');
  it('should export preferences as JSON');
  it('should import preferences from JSON');
});
```

### Integration Tests

- Full user flow: open drawer → hide column → verify table → reopen drawer → show column
- Column reordering persists across page refresh
- Filters work with column visibility changes
- Expansion state preserved during column changes

### Manual Testing Checklist

- [ ] Column drag-and-drop reordering works
- [ ] Column visibility toggle works
- [ ] Required columns cannot be hidden
- [ ] Dependent columns show/hide together
- [ ] Text filters work (debounced)
- [ ] Number range filters work
- [ ] Sorting cycles through states (none/asc/desc)
- [ ] Pagination works
- [ ] Page size selection persists
- [ ] Row expansion works
- [ ] Expansion content lazy loads
- [ ] localStorage persists preferences
- [ ] Reset button restores defaults
- [ ] Drawer closes properly
- [ ] Real-time preview works
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Error states display correctly

---

## Migration Path

### Current VehicleResultsTableComponent

- **Before:** ~400 lines of TypeScript
- **After:** ~100 lines of TypeScript (75% reduction)

### Removed from VehicleResultsTableComponent

- Column reordering logic (CDK drag-drop)
- Column visibility management
- Filter debouncing subjects
- Sort state management
- Pagination state management
- Expansion state management
- localStorage persistence logic

### Kept in VehicleResultsTableComponent

- Column definitions (specific to vehicles)
- API service integration (data source adapter)
- Custom cell templates (tags, badges)
- Expansion content (VIN instances table)
- Business logic (loading instances on expand)

---

## Future Enhancements (Post-Milestone)

### Column Width Resizing

- Drag column borders to resize
- Persist widths to localStorage
- Min/max width constraints

### Saved Layouts

- Multiple named layouts per table
- Share layouts between users (JSON export/import)
- Default layout for new users

### Advanced Filtering

- Multi-select dropdowns
- Date range pickers with presets
- AND/OR filter combinations
- Saved filter presets

### Export/Print

- Export visible columns as CSV/Excel
- Print-friendly view
- PDF generation

### Column Grouping

- Group related columns under headers
- Collapse/expand column groups
- Multi-level headers

### Virtual Scrolling

- For tables with 10,000+ rows
- Improve performance
- Seamless UX

### Keyboard Navigation

- Arrow keys to navigate cells
- Enter to expand/collapse rows
- Shift+Click for multi-select
- Keyboard shortcuts for actions

---

## Success Criteria

### Functionality

- ✅ All existing table features work identically
- ✅ Column visibility management works
- ✅ Column dependencies validated
- ✅ localStorage persistence works
- ✅ No regressions in existing features

### Code Quality

- ✅ VehicleResultsTable reduced from ~400 to ~100 lines
- ✅ No code duplication between tables
- ✅ BaseDataTable is reusable for future tables
- ✅ Clear separation of concerns
- ✅ Well-documented interfaces

### User Experience

- ✅ Column changes apply in real-time
- ✅ Drawer UI is intuitive
- ✅ No performance degradation
- ✅ Consistent behavior across all tables
- ✅ Proper loading/error states

### Future-Ready

- ✅ Easy to create new tables (~50-100 lines)
- ✅ Easy to add new features to base table
- ✅ Migration path to Angular 15+ standalone components
- ✅ Prepared for preferences service integration

---

## Git Workflow

### Branch Strategy

```bash
# Create feature branch from main
git checkout -b feature/milestone-003-base-table

# Commit in logical chunks
git commit -m "feat: create SharedModule structure"
git commit -m "feat: add table data models"
git commit -m "feat: implement BaseDataTableComponent"
git commit -m "feat: implement ColumnManagerComponent"
git commit -m "refactor: migrate VehicleResultsTable to base table"
git commit -m "test: add unit tests for base table"
git commit -m "docs: update milestone 003 documentation"

# Merge to main when complete
git checkout main
git merge feature/milestone-003-base-table

# Tag milestone
git tag -a milestone-003 -m "Milestone 003: Reusable Base Data Table Component"
git push gitlab main --tags
git push github main --tags
```

---

## Risks and Mitigations

### Risk 1: Performance Degradation

**Concern:** Additional abstraction layer slows down table rendering

**Mitigation:**

- Use OnPush change detection
- Implement trackBy functions
- Profile before/after with Chrome DevTools
- Lazy load expansion content

---

### Risk 2: Breaking Existing Functionality

**Concern:** Migration breaks VehicleResultsTable

**Mitigation:**

- Keep feature branch until fully tested
- Side-by-side comparison before removing old code
- Comprehensive manual testing checklist
- Rollback plan (revert commits)

---

### Risk 3: Over-Engineering

**Concern:** Base table becomes too complex, hard to maintain

**Mitigation:**

- Start simple, add features incrementally
- Clear documentation for each feature
- Code review before finalizing
- Keep parent component logic minimal

---

### Risk 4: Template Projection Complexity

**Concern:** ng-template slots are hard to understand/use

**Mitigation:**

- Provide clear examples in documentation
- Create sample implementations
- Consistent naming conventions
- Helper methods for common patterns

---

## Open Questions for Implementation

1. **Filter type inference:** Should column filter type be inferred from data type, or always explicit?
2. **Default column widths:** Calculate from content or use fixed defaults?
3. **Mobile responsiveness:** Horizontal scroll or column stacking on mobile?
4. **Loading indicators:** Per-cell loading or whole table overlay?
5. **Error handling:** Toast notifications or inline error messages?

**These will be addressed during implementation based on testing and UX considerations.**

---

## References

### Similar Implementations

- **AG Grid:** Enterprise data grid (complex, paid)
- **PrimeNG Table:** Feature-rich Angular table (heavy dependency)
- **Material Table:** Angular Material table (limited features)
- **TanStack Table:** Headless table library (React/Vue/Solid)

**Our approach:** Lighter than AG Grid, more flexible than PrimeNG, leveraging NG-ZORRO we already use.

### Documentation

- [NG-ZORRO Table](https://ng.ant.design/components/table/en)
- [NG-ZORRO Transfer](https://ng.ant.design/components/transfer/en)
- [NG-ZORRO Drawer](https://ng.ant.design/components/drawer/en)
- [Angular CDK Drag Drop](https://material.angular.io/cdk/drag-drop/overview)
- [Angular Content Projection](https://angular.io/guide/content-projection)

---

**End of Design Document**

This document will be saved as `docs/design/milestone-003-base-table-design.md` and committed to the repository before implementation begins.
