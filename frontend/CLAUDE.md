# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 14 application for browsing and filtering automotive vehicle data. Uses NG-ZORRO Ant Design UI library and a custom reusable table architecture. The app features a manufacturer/model picker, vehicle results display, and a workshop page with draggable grid layouts.

## Common Commands

### Development
```bash
npm start              # Start dev server at http://localhost:4200
ng serve              # Alternative to npm start
```

### Building
```bash
npm run build         # Production build (outputs to dist/autos)
npm run watch         # Development build with watch mode
ng build              # Direct Angular CLI build
```

### Testing
```bash
npm test              # Run unit tests via Karma
ng test               # Alternative to npm test
ng test --include='**/specific.component.spec.ts'  # Run single test file
```

### Code Generation
```bash
ng generate component component-name
ng generate service service-name
ng generate module module-name
```

### Docker
```bash
docker build -t autos .              # Build production container
docker build -f Dockerfile.dev .     # Build dev container
```

## Architecture

### Core Structure

The app follows Angular's feature-based module structure:

- **`src/app/core/`** - Core singleton services and navigation
  - `StateManagementService` - Central state management with URL as single source of truth
  - `RequestCoordinatorService` - Request deduplication, caching, and retry logic
  - `RouteStateService` - URL parameter synchronization

- **`src/app/shared/`** - Reusable components and models
  - `BaseDataTableComponent` - Generic table component with sorting, filtering, pagination, column management
  - `ColumnManagerComponent` - Drag-and-drop column reordering and visibility toggling
  - `TableStatePersistenceService` - Persists table preferences to localStorage
  - `TableDataSource` interface - Adapter pattern for data providers

- **`src/app/features/`** - Feature modules organized by route
  - `home/` - Landing page
  - `discover/` - Manufacturer/model picker + results table
  - `workshop/` - Gridster2-based draggable dashboard
  - `picker/` - Table picker components for model selection
  - `results/` - Vehicle results tables

- **`src/app/services/`** - Global services
  - `ApiService` - HTTP client for backend API

- **`src/app/models/`** - TypeScript interfaces and type definitions

### Key Architectural Patterns

**1. BaseDataTableComponent Pattern**

The `BaseDataTableComponent` is a highly reusable generic table component:

```typescript
// Usage in parent component:
<app-base-data-table
  [tableId]="'unique-table-id'"
  [columns]="columnDefinitions"
  [dataSource]="dataSourceAdapter"
  [expandable]="true"
  (queryParamsChange)="onQueryChange($event)"
>
  <ng-template #cellTemplate let-column="column" let-row="row">
    <!-- Custom cell rendering -->
  </ng-template>
  <ng-template #expansionTemplate let-row="row">
    <!-- Custom expansion content -->
  </ng-template>
</app-base-data-table>
```

Features:
- OnPush change detection strategy
- Automatic persistence of column order/visibility to localStorage
- Built-in filtering, sorting, pagination
- Row expansion support
- Generic typing (`BaseDataTableComponent<T>`)

**2. Data Source Adapter Pattern**

Components implement `TableDataSource<T>` interface to provide data:

```typescript
class MyDataSourceAdapter implements TableDataSource<MyType> {
  fetch(params: TableQueryParams): Observable<TableResponse<MyType>> {
    // Transform params and call API
    return this.apiService.getData(...).pipe(
      map(response => ({
        results: response.data,
        total: response.total,
        page: params.page,
        size: params.size,
        totalPages: Math.ceil(response.total / params.size)
      }))
    );
  }
}
```

See `src/app/features/results/results-table/vehicle-data-source.adapter.ts` for reference implementation.

**3. State Management Flow**

State flow: URL ↔ StateManagementService ↔ Components

- URL is the single source of truth
- StateManagementService syncs filters to/from URL query parameters
- Components subscribe to state observables: `filters$`, `results$`, `loading$`, `error$`
- Request deduplication and caching handled by RequestCoordinatorService

Example:
```typescript
// Update filters (auto-syncs to URL and triggers API call)
this.stateManagement.updateFilters({
  modelCombos: selectedModels,
  yearMin: 2020
});

// Subscribe to results
this.stateManagement.results$.subscribe(results => {
  this.vehicleData = results;
});
```

## API Integration

**Base URL**: Configured in `src/environments/environment.ts`
- Development: `http://autos.minilab/api/v1`
- Production: `src/environments/environment.prod.ts`

**Key Endpoints**:
- `GET /manufacturer-model-combinations` - Paginated list of manufacturer/model combos
- `GET /vehicles/details?models=Ford:F-150,Toyota:Camry` - Vehicle details with filters
- `GET /vehicles/{id}/instances` - Vehicle instance samples

**Response Format**: All endpoints return paginated responses with `results`, `total`, `page`, `size`, `totalPages`.

## Testing Notes

- Test files use `.spec.ts` extension
- Karma config: `karma.conf.js`
- Mock data available in `src/app/shared/components/base-data-table/mocks/`
- Test helpers in `src/app/shared/components/base-data-table/tests/test-helpers.ts`

## Important Implementation Details

**BaseDataTableComponent OnPush Strategy**:
- Must call `cdr.markForCheck()` after state mutations
- Uses RxJS subjects with `takeUntil(destroy$)` for cleanup
- Implements `ngOnChanges` with deep equality checks to prevent unnecessary re-fetches

**Column Management**:
- Columns support drag-and-drop reordering via Angular CDK
- Preferences saved to localStorage with key `table_prefs_${tableId}`
- Reset columns with `resetColumns()` to restore original definitions

**Request Coordination**:
- RequestCoordinatorService provides caching, deduplication, retry logic
- Cache keys built from filter state (see `StateManagementService.buildCacheKey()`)
- Configurable cache time, retry attempts, and backoff

**NG-ZORRO Components**:
- All icons must be registered in `app.module.ts` icons array
- Import specific modules (e.g., `NzTableModule`, `NzButtonModule`) not full library
- Uses `NZ_I18N` provider for internationalization (currently `en_US`)

## Deployment

Production build creates optimized bundle in `dist/autos/`. The Dockerfile uses multi-stage build:
1. Build with Node.js 18
2. Serve with nginx:alpine

Nginx config at `nginx.conf` handles SPA routing.
