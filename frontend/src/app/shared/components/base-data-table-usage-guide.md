# Base Data Table Component - Usage Guide

**Version:** 1.0.0  
**Framework:** Angular 14+  
**UI Library:** NG-ZORRO (Ant Design)  
**Purpose:** Enterprise-ready reusable data table with server-side operations

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Core Concepts](#core-concepts)
6. [API Reference](#api-reference)
7. [Advanced Usage](#advanced-usage)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Examples](#examples)

---

## Overview

The **BaseDataTableComponent** is a feature-rich, reusable Angular component designed for displaying tabular data with server-side pagination, sorting, and filtering. It eliminates code duplication across applications and provides a consistent user experience.

### Key Benefits

- **Reduces boilerplate**: ~400 lines of table code → ~100 lines
- **Consistent UX**: Standardized table behavior across applications
- **Server-side operations**: Built-in support for pagination, sorting, filtering
- **Customizable**: Template projection for custom cell rendering
- **Persistent preferences**: Automatic localStorage management for column visibility/order
- **Type-safe**: Full TypeScript support with generics

---

## Features

### Core Features

- ✅ Server-side pagination
- ✅ Server-side sorting
- ✅ Server-side filtering (text, number, select)
- ✅ Column visibility management
- ✅ Column reordering (drag-and-drop in table header)
- ✅ Row expansion with custom content
- ✅ Persistent user preferences (localStorage)
- ✅ Empty states and loading indicators
- ✅ Responsive design
- ✅ Accessibility support

### UI Features

- Column manager drawer (NG-ZORRO nz-drawer + nz-transfer)
- Filter row with debounced inputs
- Result count display
- Clear filters button
- Reset to defaults option
- Custom cell templates
- Custom expansion templates

---

## Installation

### 1. Install Dependencies

```bash
npm install ng-zorro-antd@^14.0.0
npm install @angular/cdk@^14.0.0
```

### 2. Copy Shared Module

Copy the `shared/` directory into your Angular project:

```
your-project/
└── src/
    └── app/
        └── shared/
            ├── shared.module.ts
            ├── components/
            │   ├── base-data-table/
            │   │   ├── base-data-table.component.ts
            │   │   ├── base-data-table.component.html
            │   │   └── base-data-table.component.scss
            │   └── column-manager/
            │       ├── column-manager.component.ts
            │       ├── column-manager.component.html
            │       └── column-manager.component.scss
            ├── models/
            │   ├── table-column.model.ts
            │   ├── table-data-source.model.ts
            │   └── index.ts
            └── services/
                └── table-state-persistence.service.ts
```

### 3. Import SharedModule

Import `SharedModule` in your feature module:

```typescript
import { NgModule } from "@angular/core";
import { SharedModule } from "../shared/shared.module";

@NgModule({
  imports: [SharedModule],
  // ...
})
export class YourFeatureModule {}
```

---

## Quick Start

### Step 1: Define Your Data Model

```typescript
// models/product.model.ts
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "active" | "inactive";
}
```

### Step 2: Create a Data Source Adapter

```typescript
// services/product-data-source.ts
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { TableDataSource, TableQueryParams, TableResponse } from "@app/shared/models";
import { Product } from "../models/product.model";
import { ApiService } from "./api.service";

@Injectable()
export class ProductDataSource implements TableDataSource<Product> {
  constructor(private apiService: ApiService) {}

  fetch(params: TableQueryParams): Observable<TableResponse<Product>> {
    return this.apiService.getProducts(params).pipe(
      map((response) => ({
        results: response.data,
        total: response.total,
        page: response.page,
        size: response.pageSize,
        totalPages: Math.ceil(response.total / response.pageSize),
      }))
    );
  }
}
```

### Step 3: Define Columns

```typescript
// components/product-table.component.ts
import { Component, OnInit } from "@angular/core";
import { TableColumn } from "@app/shared/models";
import { Product } from "../models/product.model";
import { ProductDataSource } from "../services/product-data-source";

@Component({
  selector: "app-product-table",
  template: ` <app-base-data-table [tableId]="'products'" [columns]="columns" [dataSource]="dataSource" [queryParams]="initialQueryParams"> </app-base-data-table> `,
})
export class ProductTableComponent implements OnInit {
  columns: TableColumn<Product>[] = [
    {
      key: "name",
      label: "Product Name",
      sortable: true,
      filterable: true,
      hideable: false, // Required column
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Electronics", value: "electronics" },
        { label: "Clothing", value: "clothing" },
        { label: "Food", value: "food" },
      ],
      hideable: true,
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      filterable: true,
      filterType: "number",
      hideable: true,
      formatter: (value) => `$${value.toFixed(2)}`,
    },
    {
      key: "stock",
      label: "Stock",
      sortable: true,
      filterable: false,
      hideable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      hideable: true,
    },
  ];

  dataSource: ProductDataSource;
  initialQueryParams = { page: 1, size: 20, filters: {} };

  constructor(dataSource: ProductDataSource) {
    this.dataSource = dataSource;
  }

  ngOnInit(): void {}
}
```

That's it! You now have a fully functional data table with sorting, filtering, and pagination.

---

## Core Concepts

### 1. TableColumn Interface

Defines the structure and behavior of each column:

```typescript
interface TableColumn<T = any> {
  key: string; // Property key from data model
  label: string; // Display label in header
  sortable: boolean; // Enable server-side sorting
  filterable: boolean; // Show filter input
  filterType?: "text" | "number" | "date" | "select";
  filterOptions?: Array<{ label: string; value: any }>;
  hideable: boolean; // Can user hide this column?
  width?: string; // CSS width (e.g., '150px', '20%')
  minWidth?: string; // Minimum width
  visible?: boolean; // Current visibility state
  order?: number; // Display order (managed internally)
  dependencies?: string[]; // Required columns (auto-show)
  groupId?: string; // Group related columns
  formatter?: (value: any, row: T) => string | number;
  align?: "left" | "center" | "right";
}
```

### 2. TableDataSource Interface

Adapter pattern for fetching data from your API:

```typescript
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}

interface TableQueryParams {
  page: number;
  size: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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

### 3. State Persistence

Column preferences are automatically saved to localStorage:

```typescript
interface TablePreferences {
  columnOrder: string[]; // Array of column keys
  visibleColumns: string[]; // Array of visible column keys
  pageSize?: number; // Preferred page size
  lastUpdated?: number; // Timestamp
}
```

**Storage Key Pattern:** `autos-table-{tableId}-preferences`

**Important:** Change the prefix `autos-table-` to match your application name in `TableStatePersistenceService`.

---

## API Reference

### Component Inputs

| Input         | Type                 | Required | Default             | Description                        |
| ------------- | -------------------- | -------- | ------------------- | ---------------------------------- |
| `tableId`     | `string`             | ✅ Yes   | -                   | Unique identifier for localStorage |
| `columns`     | `TableColumn<T>[]`   | ✅ Yes   | `[]`                | Column definitions                 |
| `dataSource`  | `TableDataSource<T>` | ✅ Yes   | -                   | Data fetching adapter              |
| `queryParams` | `TableQueryParams`   | ❌ No    | `{page:1, size:20}` | Initial query state                |
| `expandable`  | `boolean`            | ❌ No    | `false`             | Enable row expansion               |
| `loading`     | `boolean`            | ❌ No    | `false`             | External loading state             |

### Component Outputs

| Output              | Type                             | Description                    |
| ------------------- | -------------------------------- | ------------------------------ |
| `queryParamsChange` | `EventEmitter<TableQueryParams>` | Emits when query state changes |
| `rowExpand`         | `EventEmitter<T>`                | Emits when row is expanded     |
| `rowCollapse`       | `EventEmitter<T>`                | Emits when row is collapsed    |

### Template Projection

#### Custom Cell Template

```html
<app-base-data-table [columns]="columns" [dataSource]="dataSource">
  <ng-template #cellTemplate let-column="column" let-row="row">
    <ng-container [ngSwitch]="column.key">
      <nz-tag *ngSwitchCase="'status'" [nzColor]="getStatusColor(row.status)"> {{ row.status }} </nz-tag>
      <span *ngSwitchDefault>{{ $any(row)[column.key] }}</span>
    </ng-container>
  </ng-template>
</app-base-data-table>
```

#### Custom Expansion Template

```html
<app-base-data-table [expandable]="true" (rowExpand)="loadDetails($event)">
  <ng-template #expansionTemplate let-row="row">
    <div class="expansion-content">
      <h4>Product Details</h4>
      <p><strong>Description:</strong> {{ row.description }}</p>
      <p><strong>SKU:</strong> {{ row.sku }}</p>
    </div>
  </ng-template>
</app-base-data-table>
```

---

## Advanced Usage

### Example 1: Custom Cell Rendering

```typescript
@Component({
  template: `
    <app-base-data-table
      [tableId]="'products'"
      [columns]="columns"
      [dataSource]="dataSource">

      <ng-template #cellTemplate let-column="column" let-row="row">
        <ng-container [ngSwitch]="column.key">

          <!-- Price with currency -->
          <span *ngSwitchCase="'price'" class="price">
            ${{ $any(row).price | number:'1.2-2' }}
          </span>

          <!-- Status badge -->
          <nz-tag *ngSwitchCase="'status'"
                  [nzColor]="$any(row).status === 'active' ? 'green' : 'red'">
            {{ $any(row).status | uppercase }}
          </nz-tag>

          <!-- Stock with color indicator -->
          <span *ngSwitchCase="'stock'"
                [style.color]="$any(row).stock < 10 ? 'red' : 'inherit'">
            {{ $any(row).stock }}
            <i *ngIf="$any(row).stock < 10" nz-icon nzType="warning" nzTheme="outline"></i>
          </span>

          <!-- Default rendering -->
          <span *ngSwitchDefault>{{ $any(row)[column.key] }}</span>
        </ng-container>
      </ng-template>
    </app-base-data-table>
  `
})
export class ProductTableComponent {
  // ...
}
```

### Example 2: Row Expansion with Lazy Loading

```typescript
@Component({
  template: `
    <app-base-data-table
      [tableId]="'orders'"
      [columns]="columns"
      [dataSource]="dataSource"
      [expandable]="true"
      (rowExpand)="loadOrderDetails($event)">

      <ng-template #expansionTemplate let-row="row">
        <div class="order-details">
          <nz-spin [nzSpinning]="isLoadingDetails($any(row).id)">
            <div *ngIf="getDetails($any(row).id) as details">
              <h4>Order Items</h4>
              <nz-table [nzData]="details.items" nzSize="small">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of details.items">
                    <td>{{ item.name }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>${{ item.price }}</td>
                  </tr>
                </tbody>
              </nz-table>
            </div>
          </nz-spin>
        </div>
      </ng-template>
    </app-base-data-table>
  `
})
export class OrderTableComponent {
  private detailsCache = new Map<string, any>();
  private loadingSet = new Set<string>();

  loadOrderDetails(order: Order): void {
    if (this.detailsCache.has(order.id)) return;

    this.loadingSet.add(order.id);
    this.orderService.getOrderDetails(order.id).subscribe({
      next: (details) => {
        this.detailsCache.set(order.id, details);
        this.loadingSet.delete(order.id);
      },
      error: (err) => {
        console.error('Failed to load details:', err);
        this.loadingSet.delete(order.id);
      }
    });
  }

  getDetails(orderId: string): any {
    return this.detailsCache.get(orderId);
  }

  isLoadingDetails(orderId: string): boolean {
    return this.loadingSet.has(orderId);
  }
}
```

### Example 3: Column Dependencies

```typescript
columns: TableColumn<Product>[] = [
  {
    key: 'price',
    label: 'Price',
    sortable: true,
    filterable: true,
    hideable: true
  },
  {
    key: 'discount',
    label: 'Discount',
    sortable: true,
    filterable: true,
    hideable: true,
    dependencies: ['price'] // Auto-show 'price' column if 'discount' is visible
  },
  {
    key: 'finalPrice',
    label: 'Final Price',
    sortable: true,
    filterable: false,
    hideable: true,
    dependencies: ['price', 'discount'] // Requires both columns
  }
];
```

### Example 4: Reacting to Query Changes

```typescript
@Component({
  template: ` <app-base-data-table [columns]="columns" [dataSource]="dataSource" (queryParamsChange)="onQueryChange($event)"> </app-base-data-table> `,
})
export class ProductTableComponent {
  onQueryChange(params: TableQueryParams): void {
    // Update URL with new query state
    this.router.navigate([], {
      queryParams: {
        page: params.page,
        size: params.size,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        ...params.filters,
      },
      queryParamsHandling: "merge",
    });
  }
}
```

---

## Best Practices

### 1. Always Set tableId

```typescript
// ✅ GOOD: Unique ID per table
<app-base-data-table [tableId]="'product-inventory'" ...>

// ❌ BAD: Generic or missing ID
<app-base-data-table [tableId]="'table1'" ...>
```

**Why:** The `tableId` is used as the localStorage key. Non-unique IDs cause preference collisions.

### 2. Mark Required Columns

```typescript
// ✅ GOOD: Required columns cannot be hidden
{
  key: 'id',
  label: 'ID',
  sortable: false,
  filterable: false,
  hideable: false // User cannot hide this
}

// ❌ BAD: All columns hideable
{
  key: 'id',
  label: 'ID',
  sortable: false,
  filterable: false,
  hideable: true // User can hide ID column (bad UX)
}
```

### 3. Use Type-Safe Row Access

```typescript
// ✅ GOOD: Use $any() for dynamic key access
<ng-template #cellTemplate let-column="column" let-row="row">
  {{ $any(row)[column.key] }}
</ng-template>

// ❌ BAD: Direct access causes TypeScript errors
<ng-template #cellTemplate let-column="column" let-row="row">
  {{ row[column.key] }} <!-- Error: Element implicitly has 'any' type -->
</ng-template>
```

### 4. Implement Data Source Properly

```typescript
// ✅ GOOD: Transform to match TableResponse
fetch(params: TableQueryParams): Observable<TableResponse<Product>> {
  return this.api.getProducts(params).pipe(
    map(response => ({
      results: response.data,
      total: response.total,
      page: response.currentPage,
      size: response.pageSize,
      totalPages: Math.ceil(response.total / response.pageSize)
    }))
  );
}

// ❌ BAD: Return API response directly
fetch(params: TableQueryParams): Observable<any> {
  return this.api.getProducts(params); // Wrong interface
}
```

### 5. Handle Loading States

```typescript
// ✅ GOOD: Show loading from parent if needed
@Component({
  template: `
    <app-base-data-table
      [loading]="isExternalLoading"
      [dataSource]="dataSource">
    </app-base-data-table>
  `
})
```

The table has internal loading state, but you can override it if you manage loading externally.

### 6. Debounce External Filters

If you have filters outside the table, debounce them:

```typescript
private filterSubject = new Subject<string>();

ngOnInit(): void {
  this.filterSubject.pipe(
    debounceTime(400),
    distinctUntilChanged()
  ).subscribe(searchTerm => {
    this.dataSource.updateFilters({ search: searchTerm });
  });
}

onExternalSearch(term: string): void {
  this.filterSubject.next(term);
}
```

---

## Troubleshooting

### Issue 1: Columns Not Saving

**Symptom:** Column visibility/order resets on refresh

**Solution:** Check `tableId` is set and unique:

```typescript
<app-base-data-table [tableId]="'my-unique-table-id'" ...>
```

### Issue 2: Filters Not Working

**Symptom:** Filter inputs appear but don't filter data

**Checklist:**

1. Column has `filterable: true`
2. Data source receives `params.filters`
3. Backend API handles filter parameters
4. Filter type matches data type (`filterType: 'number'` for numbers)

### Issue 3: TypeScript Errors in Template

**Symptom:** `Property 'x' does not exist on type 'unknown'`

**Solution:** Use `$any()` for dynamic property access:

```html
{{ $any(row)[column.key] }}
```

### Issue 4: Column Manager Not Opening

**Symptom:** "Manage Columns" button does nothing

**Checklist:**

1. `SharedModule` imported in feature module
2. `ColumnManagerComponent` declared in `SharedModule`
3. Check browser console for errors

### Issue 5: Performance Issues

**Symptom:** Table is slow with large datasets

**Solutions:**

1. Ensure server-side pagination (`nzFrontPagination="false"`)
2. Use `trackBy` functions (already implemented)
3. Enable OnPush change detection (already implemented)
4. Limit page size (default 20, max 100)

---

## Examples

### Complete Example: Employee Table

```typescript
// models/employee.model.ts
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  hireDate: string;
  status: "active" | "inactive";
}

// services/employee-data-source.ts
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { TableDataSource, TableQueryParams, TableResponse } from "@app/shared/models";
import { Employee } from "../models/employee.model";
import { EmployeeApiService } from "./employee-api.service";

@Injectable()
export class EmployeeDataSource implements TableDataSource<Employee> {
  constructor(private api: EmployeeApiService) {}

  fetch(params: TableQueryParams): Observable<TableResponse<Employee>> {
    return this.api.getEmployees(params).pipe(
      map((response) => ({
        results: response.employees,
        total: response.totalCount,
        page: response.pageNumber,
        size: response.pageSize,
        totalPages: Math.ceil(response.totalCount / response.pageSize),
      }))
    );
  }
}

// components/employee-table.component.ts
import { Component } from "@angular/core";
import { TableColumn } from "@app/shared/models";
import { Employee } from "../models/employee.model";
import { EmployeeDataSource } from "../services/employee-data-source";

@Component({
  selector: "app-employee-table",
  templateUrl: "./employee-table.component.html",
  styleUrls: ["./employee-table.component.scss"],
})
export class EmployeeTableComponent {
  columns: TableColumn<Employee>[] = [
    {
      key: "id",
      label: "Employee ID",
      sortable: false,
      filterable: true,
      hideable: false,
      width: "120px",
    },
    {
      key: "firstName",
      label: "First Name",
      sortable: true,
      filterable: true,
      hideable: false,
    },
    {
      key: "lastName",
      label: "Last Name",
      sortable: true,
      filterable: true,
      hideable: false,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
      hideable: true,
    },
    {
      key: "department",
      label: "Department",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Engineering", value: "engineering" },
        { label: "Sales", value: "sales" },
        { label: "Marketing", value: "marketing" },
        { label: "HR", value: "hr" },
      ],
      hideable: true,
    },
    {
      key: "position",
      label: "Position",
      sortable: true,
      filterable: true,
      hideable: true,
    },
    {
      key: "salary",
      label: "Salary",
      sortable: true,
      filterable: true,
      filterType: "number",
      hideable: true,
      formatter: (value) => `$${value.toLocaleString()}`,
    },
    {
      key: "hireDate",
      label: "Hire Date",
      sortable: true,
      filterable: false,
      hideable: true,
      formatter: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      hideable: true,
    },
  ];

  dataSource: EmployeeDataSource;

  constructor(dataSource: EmployeeDataSource) {
    this.dataSource = dataSource;
  }

  getStatusColor(status: string): string {
    return status === "active" ? "green" : "red";
  }
}
```

```html
<!-- employee-table.component.html -->
<app-base-data-table [tableId]="'employee-directory'" [columns]="columns" [dataSource]="dataSource" [queryParams]="{ page: 1, size: 20, filters: {} }">
  <!-- Custom cell rendering -->
  <ng-template #cellTemplate let-column="column" let-row="row">
    <ng-container [ngSwitch]="column.key">
      <!-- Email as mailto link -->
      <a *ngSwitchCase="'email'" [href]="'mailto:' + $any(row).email"> {{ $any(row).email }} </a>

      <!-- Status badge -->
      <nz-tag *ngSwitchCase="'status'" [nzColor]="getStatusColor($any(row).status)"> {{ $any(row).status | uppercase }} </nz-tag>

      <!-- Default rendering -->
      <span *ngSwitchDefault> {{ column.formatter ? column.formatter($any(row)[column.key], row) : $any(row)[column.key] }} </span>
    </ng-container>
  </ng-template>
</app-base-data-table>
```

---

## Migration Checklist

Migrating from an existing custom table to BaseDataTableComponent:

- [ ] Define `TableColumn<T>[]` array with all columns
- [ ] Create data source class implementing `TableDataSource<T>`
- [ ] Update API service if needed to match `TableResponse` format
- [ ] Replace custom table HTML with `<app-base-data-table>`
- [ ] Move custom cell rendering to `#cellTemplate`
- [ ] Move expansion content to `#expansionTemplate`
- [ ] Remove custom pagination/sorting/filtering logic
- [ ] Test all features (sorting, filtering, pagination, expansion)
- [ ] Verify localStorage persistence works
- [ ] Update any dependent components/services

---

## Support

For issues, questions, or feature requests:

- Check this guide first
- Review the [Troubleshooting](#troubleshooting) section
- Examine the source code in `shared/components/base-data-table/`
- Consult your team's Angular/NG-ZORRO experts

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-10-17  
**Maintained By:** Enterprise Angular Team
