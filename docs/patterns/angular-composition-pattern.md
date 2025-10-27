# Angular Composition Pattern: Composition Over Inheritance

**Created:** 2025-10-26
**Purpose:** Explain how Angular implements "composition over inheritance" and why the AUTOS BaseDataTable pattern is correctly implemented
**Audience:** Developers reviewing the codebase, future maintainers

---

## Table of Contents

1. [Overview](#overview)
2. [Composition vs Inheritance](#composition-vs-inheritance)
3. [Angular's Composition Pattern](#angulars-composition-pattern)
4. [AUTOS Example: BaseDataTable](#autos-example-basedatatable)
5. [Why No TypeScript Import?](#why-no-typescript-import)
6. [Common Misconceptions](#common-misconceptions)
7. [Benefits](#benefits)
8. [Verification](#verification)

---

## Overview

This document explains the **"composition over inheritance"** design principle and how it's correctly implemented in the AUTOS project using Angular's template-based composition pattern.

**Key Insight:** Angular uses **template composition** rather than class inheritance to build reusable components. This is the idiomatic way to achieve "composition over inheritance" in Angular.

---

## Composition vs Inheritance

### Inheritance (❌ Avoid in Angular)

```typescript
// ❌ Tight coupling - NOT recommended in Angular
export class ResultsTableComponent extends BaseDataTableComponent {
  // Inherits all properties and methods
  // Hard to customize without breaking parent
  // Violates "composition over inheritance"
}
```

**Problems with inheritance:**
- ❌ Tight coupling between parent and child
- ❌ Hard to override behavior without breaking parent
- ❌ Changes to parent affect all children
- ❌ Can't compose multiple behaviors
- ❌ Inflexible - locked into hierarchy

### Composition (✅ Recommended)

```typescript
// ✅ Loose coupling - Angular's recommended pattern
@Component({
  template: `<app-base-data-table>...</app-base-data-table>`
})
export class ResultsTableComponent {
  // Contains/wraps BaseDataTableComponent
  // Configures it via inputs
  // Customizes it via content projection
  // Loose coupling, easy to change
}
```

**Benefits of composition:**
- ✅ Loose coupling via interfaces (@Input/@Output)
- ✅ Easy to customize without affecting core
- ✅ Can compose multiple components
- ✅ Flexible - configure at runtime
- ✅ Testable - mock dependencies easily

---

## Angular's Composition Pattern

Angular implements composition through three mechanisms:

### 1. Template Composition (Component Wrapping)

```html
<!-- Parent component wraps child component -->
<app-base-data-table
  [columns]="columns"
  [dataSource]="dataSource"
  (queryParamsChange)="handleChange($event)">
</app-base-data-table>
```

**How it works:**
- Parent uses child's selector in template
- Parent configures child via @Input bindings
- Parent receives events via @Output bindings
- No class inheritance involved

### 2. Content Projection (@ContentChild + ng-template)

```typescript
// Child component (BaseDataTable)
export class BaseDataTableComponent {
  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<any>;
}
```

```html
<!-- Parent provides custom templates -->
<app-base-data-table>
  <ng-template #cellTemplate let-column="column" let-row="row">
    <!-- Custom cell rendering -->
  </ng-template>
</app-base-data-table>
```

**How it works:**
- Parent projects content into child
- Child renders parent's templates in specific slots
- Allows customization without modifying child
- Similar to React's "render props" or Vue's "scoped slots"

### 3. Module System (Dependency Injection)

```typescript
// SharedModule exports BaseDataTable
@NgModule({
  declarations: [BaseDataTableComponent],
  exports: [BaseDataTableComponent]
})
export class SharedModule {}

// AppModule imports SharedModule
@NgModule({
  imports: [SharedModule],
  declarations: [ResultsTableComponent]
})
export class AppModule {}
```

**How it works:**
- Components share via module imports, not file imports
- Angular resolves component selectors at runtime
- No TypeScript import needed in component files
- Decouples components from each other

---

## AUTOS Example: BaseDataTable

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│   ResultsTableComponent (Smart Container)                   │
│   ✓ Adapts app state to table state                        │
│   ✓ Provides VIN instance loading logic                    │
│   ✓ Customizes rendering via templates                     │
│   ✓ Handles user interactions                              │
│                                                             │
│   ┌───────────────────────────────────────────────────┐   │
│   │   BaseDataTableComponent (Reusable Core)          │   │
│   │   ✓ Filtering, sorting, pagination                │   │
│   │   ✓ Column management and reordering              │   │
│   │   ✓ Row expansion                                  │   │
│   │   ✓ Generic data source interface                 │   │
│   │   ✓ State persistence to localStorage             │   │
│   └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
frontend/src/app/
├── shared/
│   ├── shared.module.ts                    # Exports BaseDataTableComponent
│   ├── components/
│   │   └── base-data-table/
│   │       ├── base-data-table.component.ts      # Reusable core
│   │       ├── base-data-table.component.html    # Generic table
│   │       └── base-data-table.component.scss
│   ├── models/
│   │   ├── table-column.model.ts
│   │   └── table-data-source.model.ts
│   └── services/
│       └── table-state-persistence.service.ts
└── features/
    └── results/
        └── results-table/
            ├── results-table.component.ts        # Smart container
            ├── results-table.component.html      # Wraps BaseDataTable
            ├── results-table.component.scss
            └── vehicle-data-source.adapter.ts    # Data adapter
```

### Code Examples

**BaseDataTableComponent (Reusable Core)**

```typescript
// frontend/src/app/shared/components/base-data-table/base-data-table.component.ts
@Component({
  selector: 'app-base-data-table',
  templateUrl: './base-data-table.component.html',
})
export class BaseDataTableComponent<T> implements OnInit {
  // Configuration inputs
  @Input() columns: TableColumn<T>[] = [];
  @Input() dataSource!: TableDataSource<T>;
  @Input() queryParams: TableQueryParams = { page: 1, size: 20 };
  @Input() expandable = false;

  // Event outputs
  @Output() queryParamsChange = new EventEmitter<TableQueryParams>();
  @Output() rowExpand = new EventEmitter<T>();
  @Output() rowCollapse = new EventEmitter<T>();

  // Content projection (custom templates from parent)
  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<any>;
  @ContentChild('expansionTemplate') expansionTemplate?: TemplateRef<any>;

  // Internal state
  tableData: T[] = [];
  isLoading = false;
  totalCount = 0;

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.dataSource.fetch(this.queryParams).subscribe({
      next: (response) => {
        this.tableData = response.results;
        this.totalCount = response.total;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching data:', err);
      }
    });
  }

  onSortChange(column: TableColumn<T>) {
    // Update query params and fetch
    this.queryParams.sortBy = column.key as string;
    this.queryParams.sortOrder = this.toggleSortOrder();
    this.fetchData();
    this.queryParamsChange.emit(this.queryParams);
  }

  // ... more generic table logic
}
```

**BaseDataTableComponent Template (Projection Slots)**

```html
<!-- frontend/src/app/shared/components/base-data-table/base-data-table.component.html -->
<nz-table
  [nzData]="tableData"
  [nzLoading]="isLoading"
  [nzTotal]="totalCount"
  [nzPageIndex]="queryParams.page"
  [nzPageSize]="queryParams.size"
  (nzPageIndexChange)="onPageChange($event)">

  <thead>
    <tr>
      <th *ngFor="let column of getVisibleColumns()"
          [nzSortFn]="column.sortable"
          (nzSortOrderChange)="onSortChange(column)">
        {{ column.label }}
      </th>
    </tr>
  </thead>

  <tbody>
    <tr *ngFor="let row of tableData">
      <td *ngFor="let column of getVisibleColumns()">
        <!-- Use custom template if provided by parent -->
        <ng-container *ngIf="cellTemplate">
          <ng-container
            *ngTemplateOutlet="cellTemplate; context: { column: column, row: row }">
          </ng-container>
        </ng-container>

        <!-- Default cell rendering -->
        <ng-container *ngIf="!cellTemplate">
          {{ row[column.key] }}
        </ng-container>
      </td>
    </tr>

    <!-- Expansion row (if provided by parent) -->
    <tr *ngIf="expandable && isRowExpanded(row)" class="expansion-row">
      <td [attr.colspan]="getVisibleColumns().length">
        <ng-container *ngIf="expansionTemplate">
          <ng-container
            *ngTemplateOutlet="expansionTemplate; context: { row: row }">
          </ng-container>
        </ng-container>
      </td>
    </tr>
  </tbody>
</nz-table>

<!-- Column Manager (NG-ZORRO drawer for column visibility) -->
<app-column-manager
  [(visible)]="columnManagerVisible"
  [columns]="columns"
  (columnsChange)="onColumnsChange()">
</app-column-manager>
```

**ResultsTableComponent (Smart Container)**

```typescript
// frontend/src/app/features/results/results-table/results-table.component.ts
@Component({
  selector: 'app-results-table',
  templateUrl: './results-table.component.html',
})
export class ResultsTableComponent implements OnInit {
  // Column configuration
  columns: TableColumn<VehicleResult>[] = [
    { key: 'manufacturer', label: 'Manufacturer', sortable: true },
    { key: 'model', label: 'Model', sortable: true },
    { key: 'year', label: 'Year', sortable: true },
    // ... more columns
  ];

  // Data source adapter
  dataSource: VehicleDataSourceAdapter;

  // Query params (from URL state)
  tableQueryParams: TableQueryParams = { page: 1, size: 20 };

  // VIN instance state (for expansion)
  expandedRowInstances = new Map<string, VehicleInstance[]>();
  loadingInstances = new Set<string>();

  constructor(
    private stateService: StateManagementService,
    private apiService: ApiService
  ) {
    this.dataSource = new VehicleDataSourceAdapter(this.apiService);
  }

  ngOnInit() {
    // Subscribe to app-level state (from URL)
    this.stateService.filters$.subscribe(filters => {
      // Convert app state → table state
      this.tableQueryParams = this.convertToTableParams(filters);

      // Update data source with selected models
      if (filters.modelCombos) {
        const modelsParam = filters.modelCombos
          .map(c => `${c.manufacturer}:${c.model}`)
          .join(',');
        this.dataSource.updateModels(modelsParam);
      }
    });
  }

  // Handle table events → update app state
  onTableQueryChange(params: TableQueryParams) {
    const filters = this.convertToAppFilters(params);
    this.stateService.updateFilters(filters);
  }

  // Handle row expansion → load VIN instances
  onRowExpand(vehicle: VehicleResult) {
    if (!this.expandedRowInstances.has(vehicle.vehicle_id)) {
      this.loadVehicleInstances(vehicle.vehicle_id);
    }
  }

  private loadVehicleInstances(vehicleId: string) {
    this.loadingInstances.add(vehicleId);
    this.apiService.getVehicleInstances(vehicleId, 8).subscribe({
      next: (response) => {
        this.expandedRowInstances.set(vehicleId, response.instances);
        this.loadingInstances.delete(vehicleId);
      },
      error: (err) => {
        console.error('Error loading VIN instances:', err);
        this.loadingInstances.delete(vehicleId);
      }
    });
  }

  // Helper methods for templates
  getInstances(vehicleId: string): VehicleInstance[] {
    return this.expandedRowInstances.get(vehicleId) || [];
  }

  isLoadingInstances(vehicleId: string): boolean {
    return this.loadingInstances.has(vehicleId);
  }

  getTitleStatusColor(status: string): string {
    const colors = {
      'Clean': 'green',
      'Salvage': 'red',
      'Rebuilt': 'orange',
    };
    return colors[status] || 'default';
  }
}
```

**ResultsTableComponent Template (Composition)**

```html
<!-- frontend/src/app/features/results/results-table/results-table.component.html -->
<app-base-data-table
  [tableId]="'results-table'"
  [columns]="columns"
  [dataSource]="dataSource"
  [queryParams]="tableQueryParams"
  [expandable]="true"
  [maxTableHeight]="'500px'"
  (queryParamsChange)="onTableQueryChange($event)"
  (rowExpand)="onRowExpand($event)">

  <!-- Custom cell rendering via content projection -->
  <ng-template #cellTemplate let-column="column" let-row="row">
    <ng-container [ngSwitch]="column.key">
      <!-- Data Source badge -->
      <nz-tag *ngSwitchCase="'data_source'" [nzColor]="'blue'">
        {{ row.data_source }}
      </nz-tag>

      <!-- Vehicle ID (small monospace) -->
      <small *ngSwitchCase="'vehicle_id'" class="vehicle-id">
        {{ row.vehicle_id }}
      </small>

      <!-- Default rendering -->
      <span *ngSwitchDefault>
        {{ row[column.key] }}
      </span>
    </ng-container>
  </ng-template>

  <!-- Expansion content (VIN instances) via content projection -->
  <ng-template #expansionTemplate let-row="row">
    <div class="expansion-content">
      <nz-spin [nzSpinning]="isLoadingInstances(row.vehicle_id)">
        <div *ngIf="getInstances(row.vehicle_id).length > 0">
          <h4>Synthetic VIN Instances (Sample of 8)</h4>
          <nz-table [nzData]="getInstances(row.vehicle_id)" nzSize="small">
            <thead>
              <tr>
                <th>VIN</th>
                <th>Condition</th>
                <th>Mileage</th>
                <th>State</th>
                <th>Title Status</th>
                <th>Color</th>
                <th>Est. Value</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let instance of instancesTable.data">
                <td><code>{{ instance.vin }}</code></td>
                <td>{{ instance.condition_rating }}/10</td>
                <td>{{ instance.mileage | number }}</td>
                <td>{{ instance.registered_state }}</td>
                <td>
                  <nz-tag [nzColor]="getTitleStatusColor(instance.title_status)">
                    {{ instance.title_status }}
                  </nz-tag>
                </td>
                <td>{{ instance.exterior_color }}</td>
                <td>{{ instance.estimated_value | currency }}</td>
              </tr>
            </tbody>
          </nz-table>
        </div>
      </nz-spin>
    </div>
  </ng-template>
</app-base-data-table>
```

**VehicleDataSourceAdapter (Data Adapter Pattern)**

```typescript
// frontend/src/app/features/results/results-table/vehicle-data-source.adapter.ts
export class VehicleDataSourceAdapter implements TableDataSource<VehicleResult> {
  private modelsParam = '';

  constructor(private apiService: ApiService) {}

  fetch(params: TableQueryParams): Observable<TableResponse<VehicleResult>> {
    if (!this.modelsParam) {
      return of({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
    }

    return this.apiService.getVehicleDetails(
      this.modelsParam,
      params.page,
      params.size,
      params.filters || {},
      params.sortBy,
      params.sortOrder
    ).pipe(
      map(response => ({
        results: response.results,
        total: response.total,
        page: response.page,
        size: response.size,
        totalPages: Math.ceil(response.total / response.size)
      }))
    );
  }

  updateModels(modelsParam: string): void {
    this.modelsParam = modelsParam;
  }
}
```

### Key Relationships

**1. Configuration Flow (Parent → Child)**
```
ResultsTableComponent
  ├─[columns]────────→ BaseDataTableComponent
  ├─[dataSource]─────→ BaseDataTableComponent
  ├─[queryParams]────→ BaseDataTableComponent
  └─[expandable]─────→ BaseDataTableComponent
```

**2. Event Flow (Child → Parent)**
```
BaseDataTableComponent
  ├─(queryParamsChange)→ ResultsTableComponent.onTableQueryChange()
  ├─(rowExpand)─────────→ ResultsTableComponent.onRowExpand()
  └─(rowCollapse)───────→ ResultsTableComponent.onRowCollapse()
```

**3. Content Projection (Parent → Child)**
```
ResultsTableComponent
  ├─<ng-template #cellTemplate>────→ BaseDataTable renders in cell slots
  └─<ng-template #expansionTemplate>→ BaseDataTable renders in expansion rows
```

---

## Why No TypeScript Import?

### Common Confusion

**Question:** "Why doesn't `ResultsTableComponent.ts` import `BaseDataTableComponent`?"

**Answer:** Because Angular uses **module-level imports**, not file-level imports.

### How Angular Module System Works

**Step 1: SharedModule exports BaseDataTable**
```typescript
// shared/shared.module.ts
@NgModule({
  declarations: [BaseDataTableComponent],
  exports: [BaseDataTableComponent]  // ← Makes it available to other modules
})
export class SharedModule {}
```

**Step 2: AppModule imports SharedModule**
```typescript
// app.module.ts
@NgModule({
  imports: [SharedModule],  // ← Imports all exported components
  declarations: [ResultsTableComponent]
})
export class AppModule {}
```

**Step 3: Template uses component selector**
```html
<!-- results-table.component.html -->
<app-base-data-table>  <!-- ← Selector resolved by Angular at runtime -->
</app-base-data-table>
```

### When You NEED TypeScript Imports

You only need TypeScript imports when:

1. **Direct class reference in code**
   ```typescript
   import { BaseDataTableComponent } from '...';

   constructor(private table: BaseDataTableComponent) {} // ← Direct reference
   ```

2. **Type annotations**
   ```typescript
   import { TableColumn } from '...';

   columns: TableColumn<VehicleResult>[] = [];  // ← Type annotation
   ```

3. **Class inheritance** (not recommended)
   ```typescript
   import { BaseDataTableComponent } from '...';

   export class MyComponent extends BaseDataTableComponent {}  // ← Inheritance
   ```

### What You DON'T Need TypeScript Imports For

- ✅ Using component in template (use module imports)
- ✅ @Input/@Output bindings (Angular handles it)
- ✅ Content projection (template-based)
- ✅ Event handlers (method references)

---

## Common Misconceptions

### Misconception 1: "No import means no composition"

**Wrong:** Composition happens at the **template level**, not the TypeScript level.

```html
<!-- This IS composition (via template) -->
<app-base-data-table [columns]="columns">
  <ng-template #cellTemplate>...</ng-template>
</app-base-data-table>
```

### Misconception 2: "Composition requires class imports"

**Wrong:** Angular's composition is **declarative** (template-based), not imperative (code-based).

**React/Vue approach (imperative):**
```typescript
// React uses imports for composition
import BaseTable from './BaseTable';

function ResultsTable() {
  return <BaseTable columns={columns} />
}
```

**Angular approach (declarative):**
```html
<!-- Angular uses templates for composition -->
<app-base-data-table [columns]="columns"></app-base-data-table>
```

### Misconception 3: "Must extend parent class for reuse"

**Wrong:** Angular uses **wrapping** (has-a), not **inheritance** (is-a).

❌ **Inheritance:**
```typescript
class ResultsTable extends BaseDataTable {
  // Tightly coupled, hard to customize
}
```

✅ **Composition:**
```html
<app-base-data-table>
  <!-- Loosely coupled, easy to customize -->
</app-base-data-table>
```

---

## Benefits

### 1. Loose Coupling

**Inheritance:** Changes to parent affect all children
**Composition:** Changes to child don't affect container

```typescript
// ✅ Composition: Easy to swap out BaseDataTable
<app-base-data-table>...</app-base-data-table>
// Could replace with <app-ag-grid-table> without touching TypeScript

// ❌ Inheritance: Locked into parent class
class MyTable extends BaseDataTable {
  // Can't easily switch to different base class
}
```

### 2. Multiple Behaviors

**Inheritance:** Single parent class only
**Composition:** Combine multiple components

```html
<!-- ✅ Composition: Mix multiple components -->
<app-base-data-table>
  <app-column-manager></app-column-manager>
  <app-export-button></app-export-button>
  <app-bulk-actions></app-bulk-actions>
</app-base-data-table>

<!-- ❌ Inheritance: Can only extend one class -->
class MyTable extends BaseDataTable, ColumnManager, Exportable {
  // Multiple inheritance not supported in TypeScript
}
```

### 3. Runtime Configuration

**Inheritance:** Behavior fixed at compile time
**Composition:** Behavior configured at runtime

```html
<!-- ✅ Composition: Configure at runtime -->
<app-base-data-table
  [columns]="dynamicColumns"
  [expandable]="userHasPermission"
  [maxTableHeight]="screenSize > 1024 ? '800px' : '400px'">
</app-base-data-table>

<!-- ❌ Inheritance: Behavior hardcoded -->
class MyTable extends BaseDataTable {
  // Can't change behavior without recompiling
}
```

### 4. Testability

**Inheritance:** Must test with real parent class
**Composition:** Can mock child components

```typescript
// ✅ Composition: Easy to mock
TestBed.configureTestingModule({
  declarations: [ResultsTableComponent],
  providers: [
    { provide: BaseDataTableComponent, useClass: MockBaseDataTable }
  ]
});

// ❌ Inheritance: Must test actual parent
TestBed.configureTestingModule({
  declarations: [MyTableComponent]  // Must include parent logic
});
```

### 5. Separation of Concerns

**Inheritance:** Parent and child logic mixed
**Composition:** Clear separation of responsibilities

```
✅ Composition:
  ResultsTableComponent:
    - State management (app-level ↔ table-level)
    - VIN instance loading
    - Custom rendering

  BaseDataTableComponent:
    - Generic table operations
    - Column management
    - Pagination, sorting, filtering

❌ Inheritance:
  MyTableComponent extends BaseDataTable:
    - Everything mixed together
    - Hard to tell what's generic vs specific
```

---

## Verification

### How to Verify Composition is Working

**1. Check template uses child selector:**
```bash
grep "<app-base-data-table" results-table.component.html
# Should show: <app-base-data-table [columns]="...">
```

**2. Check @Input/@Output bindings:**
```bash
grep "\[columns\]\|\(queryParamsChange\)" results-table.component.html
# Should show input/output bindings
```

**3. Check content projection:**
```bash
grep "ng-template #cellTemplate\|ng-template #expansionTemplate" results-table.component.html
# Should show custom templates being projected
```

**4. Verify module imports:**
```bash
grep "SharedModule" app.module.ts
# Should show: imports: [SharedModule]
```

**5. Check component works at runtime:**
```bash
# Visit http://autos.minilab/workshop
# ResultsTable should render correctly using BaseDataTable
```

### Data Flow Test

**Input → Child:**
```typescript
// Parent
tableQueryParams = { page: 1, size: 20, sortBy: 'year' };

// Template passes to child
<app-base-data-table [queryParams]="tableQueryParams">

// Child receives
@Input() queryParams: TableQueryParams;  // Gets { page: 1, size: 20, sortBy: 'year' }
```

**Output → Parent:**
```typescript
// Child emits event
this.queryParamsChange.emit({ page: 2, size: 50 });

// Template binds to parent method
<app-base-data-table (queryParamsChange)="onTableQueryChange($event)">

// Parent receives
onTableQueryChange(params: TableQueryParams) {
  // params = { page: 2, size: 50 }
}
```

---

## Summary

**The AUTOS BaseDataTable pattern IS "composition over inheritance"** - it just uses Angular's idiomatic approach:

✅ **Template Composition** - Components wrap other components
✅ **Content Projection** - Custom templates slot into child
✅ **Input/Output Bindings** - Configuration and events flow through interfaces
✅ **Module System** - Components share via module imports, not file imports

**This is the correct Angular way to build reusable components!**

---

## See Also

- [Milestone 003 Design Document](../design/milestone-003-base-table-design.md) - BaseDataTable architecture
- [State Management Guide](../state-management-guide.md) - How state flows through components
- [Angular Documentation: Content Projection](https://angular.io/guide/content-projection) - Official docs on ng-content
- [Angular Documentation: Component Interaction](https://angular.io/guide/component-interaction) - Input/Output patterns

---

**Last Updated:** 2025-10-26
**Author:** Claude (with odin)
**Related Documents:** Milestone 003, State Management Guide
