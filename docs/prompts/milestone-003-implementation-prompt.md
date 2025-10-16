# AUTOS Milestone 003 - Implementation Session Prompt

**Copy this entire prompt at the start of your implementation session.**

---

## Session Context

**Milestone:** 003 - Reusable Base Data Table Component  
**Status:** Design Complete, Ready for Implementation  
**Branch:** `feature/milestone-003-base-table` (to be created)  
**Estimated Duration:** 2-3 sessions

---

## Objective

Extract all table-specific logic from `VehicleResultsTableComponent` into a reusable `BaseDataTableComponent` that provides:

✅ Column reordering (drag-and-drop)  
✅ **Column visibility management (NEW - with drawer UI)**  
✅ Server-side filtering (debounced)  
✅ Server-side sorting  
✅ Server-side pagination  
✅ Row expansion  
✅ localStorage persistence  
✅ Template-based customization  

---

## Required Reading

**CRITICAL:** Read ALL of these documents before starting:

1. **CLAUDE.md** - Complete project reference
2. **docs/design/milestone-003-base-table-design.md** - THIS MILESTONE'S DESIGN (attached)
3. **docs/snapshots/analysis-002.md** - Previous milestone context
4. **frontend/src/app/features/results/vehicle-results-table/** - Current implementation to refactor

---

## Design Decisions Summary

### Key Architectural Choices (All Confirmed)

1. **Composition over Inheritance** ✅
   - Wrapper component pattern
   - Parent uses: `<app-base-data-table [columns]="..." [dataSource]="...">`

2. **ng-template Slots for Customization** ✅
   - `#cellTemplate` for custom cell rendering
   - `#expansionTemplate` for expanded row content
   - `#filterTemplate` (optional) for custom filters

3. **Generic Row Expansion** ✅
   - Optional feature (`[expandable]="true"`)
   - Parent provides content via template
   - Base manages expansion state

4. **SharedModule Structure** ✅
   - Angular 14 requires SharedModule
   - Future migration to standalone components easy

5. **Column Visibility: Drawer with Transfer** ✅
   - nz-drawer slides from right (not modal)
   - nz-transfer for moving columns
   - Real-time preview of changes
   - Persist to localStorage

6. **Column Dependencies** ✅
   - Required columns (cannot hide)
   - Dependent columns (must show X to show Y)
   - Grouped columns (toggle together)

---

## File Structure to Create

```
frontend/src/app/shared/
├── shared.module.ts                                    [NEW]
├── components/
│   └── base-data-table/
│       ├── base-data-table.component.ts                [NEW]
│       ├── base-data-table.component.html              [NEW]
│       ├── base-data-table.component.scss              [NEW]
│       └── column-manager/
│           ├── column-manager.component.ts             [NEW]
│           ├── column-manager.component.html           [NEW]
│           └── column-manager.component.scss           [NEW]
├── models/
│   ├── table-column.model.ts                           [NEW]
│   ├── table-data-source.model.ts                      [NEW]
│   └── table-query-params.model.ts                     [NEW]
└── services/
    └── table-state-persistence.service.ts              [NEW]
```

**Files to Modify:**
```
frontend/src/app/app.module.ts                          [IMPORT SharedModule]
frontend/src/app/features/results/vehicle-results-table/
├── vehicle-results-table.component.ts                  [MAJOR REFACTOR]
├── vehicle-results-table.component.html                [MAJOR REFACTOR]
└── vehicle-results-table.component.scss                [MINOR CHANGES]
```

---

## Implementation Plan (18 Steps)

### Phase 1: Foundation (Steps 1-5)
1. Create feature branch
2. Create SharedModule structure
3. Create data model files
4. Create TableStatePersistenceService
5. Generate component scaffolds

### Phase 2: Core Features (Steps 6-10)
6. Implement BaseDataTableComponent structure
7. Implement column management logic
8. Implement server-side operations (filter/sort/page)
9. Implement row expansion
10. Implement ColumnManagerComponent (drawer UI)

### Phase 3: Integration (Steps 11-15)
11. Create VehicleDataSource adapter
12. Refactor VehicleResultsTableComponent
13. Update styles
14. Test all features
15. Update documentation

### Phase 4: Polish (Steps 16-18)
16. Handle edge cases
17. Performance optimization
18. Code review and cleanup

---

## Critical Implementation Notes

### BaseDataTableComponent Inputs/Outputs

**Inputs:**
```typescript
@Input() tableId!: string;                             // Required, for localStorage
@Input() columns!: TableColumn<T>[];                   // Required, column defs
@Input() dataSource!: TableDataSource<T>;              // Required, data fetching
@Input() expandable: boolean = false;
@Input() defaultPageSize: number = 20;
@Input() pageSizeOptions: number[] = [10, 20, 50, 100];
@Input() showColumnManager: boolean = true;
@Input() showResetButton: boolean = true;
```

**Outputs:**
```typescript
@Output() rowExpand = new EventEmitter<T>();
@Output() rowCollapse = new EventEmitter<T>();
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

---

### TableColumn Interface

```typescript
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  width?: string;
  
  sortable?: boolean;
  sortKey?: string;
  
  filterable?: boolean;
  filterType?: 'text' | 'number' | 'date-range' | 'select';
  filterOptions?: any[];
  filterKey?: string;
  
  visible?: boolean;
  hideable?: boolean;
  
  requiredColumns?: (keyof T)[];
  groupId?: string;
  
  formatter?: (value: any, row: T) => string | number;
  align?: 'left' | 'center' | 'right';
}
```

---

### TableDataSource Interface

```typescript
export interface TableDataSource<T> {
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

### Usage Example (Target for VehicleResultsTable)

```typescript
// Component class
export class VehicleResultsTableComponent implements OnInit {
  columns: TableColumn<VehicleResult>[] = [
    { 
      key: 'manufacturer', 
      label: 'Manufacturer', 
      sortable: true, 
      filterable: true, 
      hideable: false  // Required column
    },
    { 
      key: 'model', 
      label: 'Model', 
      sortable: true, 
      filterable: true 
    },
    { 
      key: 'year', 
      label: 'Year', 
      sortable: true, 
      filterable: true, 
      filterType: 'number' 
    },
    { 
      key: 'body_class', 
      label: 'Body Class', 
      sortable: true, 
      filterable: true 
    },
    { 
      key: 'data_source', 
      label: 'Data Source', 
      sortable: true, 
      filterable: true 
    },
    { 
      key: 'vehicle_id', 
      label: 'Vehicle ID', 
      sortable: false, 
      filterable: false 
    }
  ];

  dataSource: TableDataSource<VehicleResult> = {
    fetch: (params) => this.apiService.getVehicleDetails(
      this.selectedModels,
      params.page,
      params.size,
      params.filters,
      params.sortBy,
      params.sortOrder
    )
  };
}
```

```html
<!-- Template -->
<app-base-data-table
  [tableId]="'vehicle-results'"
  [columns]="columns"
  [dataSource]="dataSource"
  [expandable]="true"
  (rowExpand)="loadVehicleInstances($event)">
  
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
  
  <ng-template #expansionTemplate let-row="row">
    <div class="vehicle-instances">
      <h4>VIN Instances</h4>
      <!-- Nested instance table -->
    </div>
  </ng-template>
</app-base-data-table>
```

---

## Testing Checklist

After implementation, manually verify:

- [ ] Column drag-and-drop reordering works
- [ ] "Manage Columns" button opens drawer from right
- [ ] Can move columns between Hidden/Visible
- [ ] Can reorder visible columns in drawer
- [ ] Required columns cannot be hidden (show tooltip)
- [ ] Changes apply in real-time (see table update)
- [ ] Close drawer preserves changes
- [ ] Preferences persist after page refresh
- [ ] "Reset Columns" restores defaults
- [ ] Text filters work (debounced 800ms)
- [ ] Sorting cycles: none → asc → desc → none
- [ ] Pagination changes page
- [ ] Page size selection persists
- [ ] Row expansion works (click + icon)
- [ ] VIN instances load on first expand
- [ ] "Clear Filters" button works
- [ ] Empty states display correctly
- [ ] Loading states display correctly

---

## Code to Extract from VehicleResultsTableComponent

**Remove these sections (move to BaseDataTableComponent):**

1. **Column Management (~50 lines)**
   - `columns` array definition structure
   - `onColumnDrop()` method
   - `saveColumnOrder()` / `loadColumnOrder()` methods
   - `resetColumnOrder()` method

2. **Filter Debouncing (~40 lines)**
   - Filter subject declarations
   - `setupFilterDebouncing()` method
   - `onManufacturerFilterChange()` etc methods
   - Filter state variables

3. **Sorting (~30 lines)**
   - `sortColumn` and `sortDirection` variables
   - `onSort()` method

4. **Pagination (~20 lines)**
   - `currentPage`, `pageSize`, `total` variables
   - `onPageChange()` / `onPageSizeChange()` methods

5. **Expansion State (~30 lines)**
   - `expandSet` management
   - `onExpandChange()` method
   - `getInstances()` method
   - `isLoadingInstances()` method

6. **localStorage Logic (~30 lines)**
   - All localStorage read/write code

**Total removal: ~200 lines**

**Keep in VehicleResultsTableComponent (~100 lines):**
- Column definitions (specific to vehicles)
- Data source adapter
- Custom cell templates
- Expansion template
- `loadVehicleInstances()` business logic
- `getTitleStatusColor()` helper

---

## Git Workflow

```bash
# Step 1: Create feature branch
git checkout main
git pull gitlab main
git checkout -b feature/milestone-003-base-table

# Steps 2-18: Implement (commit frequently)
git add [files]
git commit -m "feat: [specific change]"

# After all implementation complete and tested
git checkout main
git merge feature/milestone-003-base-table

# Create milestone tag
git tag -a milestone-003 -m "Milestone 003: Reusable Base Data Table Component"

# Push to remotes
git push gitlab main --tags
git push github main --tags
```

---

## Success Criteria

### Functionality ✅
- All existing table features work identically
- New column visibility drawer works
- No regressions

### Code Quality ✅
- VehicleResultsTable reduced from ~400 to ~100 lines (75% reduction)
- No code duplication
- Clear separation of concerns

### User Experience ✅
- Real-time column changes
- Intuitive drawer UI
- No performance issues

### Future-Ready ✅
- Easy to create new tables (~50-100 lines)
- Easy to add features to base table
- Prepared for preferences service

---

## Known Issues to Avoid

### Issue 1: Grid Drag Interference
**Problem:** Grid layout captures drag events meant for column headers

**Solution:** Use `event.stopPropagation()` in mousedown handlers

```typescript
onHeaderMouseDown(event: MouseEvent): void {
  event.stopPropagation();
}
```

---

### Issue 2: NG-ZORRO Style Overrides
**Problem:** Default styles not applying

**Solution:** Use high specificity with `::ng-deep`

```scss
::ng-deep {
  .ant-table {
    thead > tr > th {
      padding: 8px 12px !important;
    }
  }
}
```

---

### Issue 3: localStorage Key Collisions
**Problem:** Multiple tables overwriting each other's preferences

**Solution:** Always use unique `tableId` in localStorage key

```typescript
const key = `autos-table-${this.tableId}-preferences`;
```

---

## Instruction Format Reminder

**Every instruction must follow this format:**

```
## **Instruction N: [Brief description]**

**Server:** [Thor | Loki | Workstation]

**File/Directory:** [Full path]

**Command:**
```bash
cd /path/to/directory
[actual command]
```

**Explanation:**
[What it does, what flags mean]

**Preview of next instruction:**
[Brief preview]

**Context warning:** Approximately X% remaining.

---

**Awaiting your confirmation to proceed.**
```

---

## Context Management

Include context warnings:
- **Green (>50%):** No warning
- **Yellow (30-50%):** "Context warning: Approximately X% remaining."
- **Orange (20-30%):** "Context warning: Approximately X% remaining. Approaching token limit."
- **Red (<20%):** "⚠️ CRITICAL: Context warning: Approximately X% remaining."

---

## Session Start Instructions

**When you start the implementation session:**

1. Attach required documents:
   - CLAUDE.md
   - docs/design/milestone-003-base-table-design.md (the artifact from this session)
   - docs/snapshots/analysis-002.md
   - Current vehicle-results-table component files

2. Read and analyze ALL documents

3. Confirm understanding of:
   - Design decisions
   - Architecture
   - File structure
   - Testing requirements

4. Ask: "Ready to begin implementation of Milestone 003?"

5. Upon confirmation, start with **Instruction 1: Create feature branch**

---

## Quick Reference

**Key Files Being Created:**
- `shared/shared.module.ts`
- `shared/components/base-data-table/base-data-table.component.ts`
- `shared/components/base-data-table/column-manager/column-manager.component.ts`
- `shared/models/table-column.model.ts`
- `shared/services/table-state-persistence.service.ts`

**Key Files Being Modified:**
- `app.module.ts` (import SharedModule)
- `features/results/vehicle-results-table/vehicle-results-table.component.ts` (major refactor)
- `features/results/vehicle-results-table/vehicle-results-table.component.html` (major refactor)

**Development Commands:**
```bash
# Start frontend dev server
cd /home/odin/projects/autos/frontend
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200

# Access application
http://thor:4200/workshop

# Generate components
ng generate component shared/components/base-data-table
ng generate component shared/components/base-data-table/column-manager
ng generate service shared/services/table-state-persistence
```

---

**END OF IMPLEMENTATION PROMPT**

**This prompt ensures you have all context needed to implement Milestone 003 in the next session.**
