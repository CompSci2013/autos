# AUTOS Project - Comprehensive Technical Overview

**Generated:** 2025-10-21
**Purpose:** Complete architectural analysis of the AUTOS vehicle data platform

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Key Components](#2-key-components)
3. [State Management Architecture](#3-state-management-architecture)
4. [Notable Patterns & Architectural Decisions](#4-notable-patterns--architectural-decisions)
5. [Data Flow](#5-data-flow)
6. [Technology Stack](#6-technology-stack)
7. [Development Workflow](#7-development-workflow)
8. [Production Architecture](#8-production-architecture)

---

## 1. Project Structure

### Directory Tree Overview

```
/home/odin/projects/autos/
├── backend/              (1.3 GB) - Node.js Express API
│   ├── src/
│   │   ├── index.js                      # Express app entry point
│   │   ├── config/elasticsearch.js       # ES client configuration
│   │   ├── controllers/vehicleController.js
│   │   ├── routes/vehicleRoutes.js
│   │   ├── services/elasticsearchService.js
│   │   └── utils/vinGenerator.js         # Synthetic VIN generation
│   ├── package.json                      # v1.0.0, Node 18
│   ├── Dockerfile                        # Production container
│   └── autos-backend-v1.2.{1-8}.tar     # 8 versioned releases
│
├── frontend/             (2.0 MB) - Angular 14 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                    # Singleton services
│   │   │   │   ├── services/
│   │   │   │   │   ├── state-management.service.ts
│   │   │   │   │   ├── route-state.service.ts
│   │   │   │   │   └── request-coordinator.service.ts
│   │   │   │   └── navigation/
│   │   │   │
│   │   │   ├── shared/                  # Reusable components
│   │   │   │   ├── components/
│   │   │   │   │   ├── base-data-table/ # Generic table (DONE)
│   │   │   │   │   └── column-manager/  # Column UI (TODO)
│   │   │   │   ├── models/
│   │   │   │   │   ├── table-column.model.ts
│   │   │   │   │   └── table-data-source.model.ts
│   │   │   │   └── services/
│   │   │   │       └── table-state-persistence.service.ts
│   │   │   │
│   │   │   ├── features/
│   │   │   │   ├── home/               # Landing page
│   │   │   │   ├── discover/           # Main search UI
│   │   │   │   ├── picker/             # M/M selection
│   │   │   │   ├── results/            # Vehicle results
│   │   │   │   └── workshop/           # Grid layout (experimental)
│   │   │   │
│   │   │   ├── models/                 # TypeScript interfaces
│   │   │   └── services/
│   │   │       └── api.service.ts      # HTTP client
│   │   │
│   │   └── environments/
│   │       ├── environment.ts           # Dev: localhost:3000
│   │       └── environment.prod.ts      # Prod: /api (proxied)
│   │
│   ├── Dockerfile.dev                   # Dev container (Node + HMR)
│   ├── Dockerfile.prod                  # Prod container (nginx)
│   ├── nginx.conf                       # SPA routing config
│   ├── angular.json                     # Angular CLI config
│   └── package.json                     # Angular 14 + NG-ZORRO
│
├── k8s/                  (28 KB) - Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-deployment.yaml          # 2 replicas, health checks
│   ├── backend-service.yaml             # ClusterIP
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   └── ingress.yaml                     # autos.minilab routing
│
├── data/scripts/         (60 KB) - Data pipeline
│   ├── create_autos_index.py
│   ├── load_sample_data.py
│   ├── load_full_data.py
│   ├── reset_index.py
│   └── Dockerfile
│
└── docs/                 (1.1 MB) - Documentation
    ├── design/
    │   ├── milestone-003-base-table-design.md
    │   └── state-management-refactoring-plan-part1.md
    ├── prompts/                         # Claude session templates
    ├── snapshots/                       # Point-in-time analysis
    ├── storyboard/                      # UI walkthrough images
    ├── tests/                           # Test documentation
    └── state-management-guide.md        # Core patterns reference
```

### File Count Summary

| Category | Count | Size |
|----------|-------|------|
| Backend Source Files | 6 | ~15 KB |
| Frontend Components | 20+ | ~2 MB |
| Kubernetes Manifests | 6 | 28 KB |
| Documentation Files | 19+ | 1.1 MB |
| Backend Release Archives | 8 | 1.3 GB |

---

## 2. Key Components

### 2.1 Backend Components

#### A. API Routes (`vehicleRoutes.js`)

**Base Path:** `/api/v1`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/manufacturer-model-combinations` | GET | Aggregated M/M picker data |
| `/vehicles/details` | GET | Paginated vehicle search results |
| `/vehicles/:vehicleId/instances` | GET | Synthetic VIN instances |
| `/health` | GET | Kubernetes health check |

**Key Features:**
- Query parameter validation
- Pagination (default: page=1, size=20)
- Filtering (manufacturer, model, year range, body class)
- Sorting (7 sortable fields)
- Fuzzy search on M/M combinations

#### B. Elasticsearch Service (`elasticsearchService.js`)

**Purpose:** Encapsulates all Elasticsearch query logic

**Key Methods:**

1. **`getManufacturerModelCombinations(options)`**
   - Aggregates by manufacturer → models
   - Fuzzy matching with `fuzziness: "AUTO"`
   - Client-side pagination after aggregation
   - Returns doc_count per combination

2. **`getVehicleDetails(options)`**
   - Boolean query with multiple M/M pairs
   - Advanced filtering (wildcards, ranges)
   - Server-side pagination (`from`, `size`)
   - Custom sort with `.keyword` suffixes

**Query Patterns:**
- `match` queries with fuzziness
- `term` queries for exact matches
- `wildcard` queries for partial matching
- `range` queries for numeric filters
- `bool` queries combining must/should/filter

#### C. VIN Generator (`vinGenerator.js`)

**Purpose:** Deterministic synthetic VIN data generation

**Key Features:**
- Seeded random number generator (reproducible)
- Pre-1981 vs post-1981 VIN formats
- Correlated attributes:
  - Mileage (age-adjusted, distribution-based)
  - Condition (1-5 scale with realistic distribution)
  - State (geographically weighted)
  - Color (era-appropriate palettes)
  - Options (condition-dependent)
  - Value (calculated from condition + mileage + options)

**Algorithm:**
- Hash vehicle_id to seed
- Generate consistent instances for same vehicle
- Linear congruential generator for randomness

---

### 2.2 Frontend Components

#### A. Core Services

**StateManagementService** (`state-management.service.ts`)
- **Role:** Central state orchestrator
- **Observables:**
  - `state$` - Full app state
  - `filters$` - Current filters (from URL)
  - `results$` - Vehicle search results
  - `loading$`, `error$`, `totalResults$`
- **Methods:**
  - `updateFilters()` - Update state + sync to URL
  - `fetchVehicleData()` - Coordinate API request
  - `resetFilters()` - Clear all filters
- **Integration:** Works with RouteStateService + RequestCoordinatorService

**RouteStateService** (`route-state.service.ts`)
- **Role:** URL query parameter synchronization
- **Methods:**
  - `getParam()`, `watchParam()` - Read URL
  - `updateParams()`, `setParams()` - Write URL
  - `filtersToParams()` - Convert filters to URL
  - `paramsToFilters()` - Parse URL to filters
- **URL Format:** `?models=Ford:F-150&page=1&sort=year&sortDirection=desc`

**RequestCoordinatorService** (`request-coordinator.service.ts`)
- **Role:** Request optimization layer
- **Features:**
  - **Deduplication:** Share observables for identical requests
  - **Caching:** Cache responses with TTL (default: 30s)
  - **Retry:** Exponential backoff (2 attempts, 1s initial delay)
  - **Loading State:** Per-request and global loading indicators
- **Methods:**
  - `execute(key, requestFn, config)` - Execute coordinated request
  - `getLoadingState$(key)` - Observable for specific request
  - `cancelAll()`, `clearCache()` - Request management

#### B. Feature Components

**HomeComponent** (`home.component.ts`)
- Landing page with feature cards
- Links to Discover and Workshop

**DiscoverComponent** (`discover.component.ts`)
- Main container component
- Vertical layout: Picker → Results
- Subscribes to `StateManagementService.filters$`
- Passes `initialSelections` to picker
- Hydrates from URL on init

**ManufacturerModelTablePickerComponent** (`manufacturer-model-table-picker.component.ts`)
- Hierarchical tree + table view
- Multi-select checkboxes
- Expand/collapse manufacturers
- Pagination (50 per page)
- Emits `selectionChange` event
- Hydrates from `@Input() initialSelections`

**VehicleResultsTableComponent** (`vehicle-results-table.component.ts`)
- Displays vehicle search results
- Expandable rows for VIN instances
- Column filters (text, range)
- Drag-drop column reordering (CDK)
- Server-side pagination
- **Status:** Ready for migration to BaseDataTableComponent

**WorkshopComponent** (`workshop.component.ts`)
- Experimental grid-based layout
- Uses `angular-gridster2` (12-column grid)
- Draggable/resizable panels
- Collapsible panels (NG-ZORRO collapse)
- Layout persistence (localStorage)
- Same components as Discover in different layout

#### C. Shared Components

**BaseDataTableComponent** (`base-data-table.component.ts`)
- **Status:** ✅ IMPLEMENTED (~300 lines)
- **Purpose:** Reusable generic table component
- **Features:**
  - Column management (reorder, visibility, reset)
  - Pagination (client or server-side)
  - Sorting (tri-state: asc/desc/none)
  - Filtering (per-column with debounce)
  - Row expansion (collapsible details)
  - Persistence (localStorage via TableStatePersistenceService)
  - OnPush change detection
- **Generic Typing:** `BaseDataTableComponent<T>`
- **Composition:** Uses ng-template slots for customization
- **Inputs:** `tableId`, `columns`, `dataSource`, `queryParams`, `expandable`, `loading`
- **Outputs:** `queryParamsChange`, `rowExpand`, `rowCollapse`

**ColumnManagerComponent** (`column-manager.component.ts`)
- **Status:** ❌ NOT IMPLEMENTED
- **Purpose:** UI for managing column visibility/order
- **Design:** NG-ZORRO Transfer component (left/right lists)

---

### 2.3 Data Models

#### Backend Models

```typescript
// Elasticsearch document structure
{
  manufacturer: string;
  model: string;
  year: number;
  body_class: string;
  data_source: string;
  vehicle_id: string;
  instance_count: number;
  make_model_year: string;
}

// VIN instance (generated)
{
  vin: string;
  condition_rating: number;
  condition_description: string;
  mileage: number;
  registered_state: string;
  exterior_color: string;
  factory_options: string[];
  estimated_value: number;
  // ... more fields
}
```

#### Frontend Models

```typescript
// search-filters.model.ts
interface SearchFilters {
  modelCombos?: ManufacturerModelSelection[];
  page?: number;
  size?: number;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
  manufacturer?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  bodyClass?: string;
  dataSource?: string;
}

// table-column.model.ts
interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  filterType?: 'text' | 'number' | 'date' | 'select';
  hideable: boolean;
  width?: string;
  visible?: boolean;
  order?: number;
  formatter?: (value: any, row: T) => string | number;
}

// table-data-source.model.ts
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}
```

---

## 3. State Management Architecture

### 3.1 URL-First Philosophy

**Core Principle:** URL query parameters are the single source of truth for all query state

**Rationale:**
- Bookmarkable searches
- Shareable URLs
- Browser back/forward support
- Deep linking
- No server-side session state

### 3.2 Two-Layer Storage Model

#### Layer 1: URL Query Parameters (Shared State)

**Stores:**
- Selected model combinations
- Active filters (manufacturer, year range, body class, etc.)
- Sort column and direction
- Current page and page size

**Format:**
```
http://autos.minilab/discover?models=Ford:F-150,Chevrolet:Corvette&page=2&size=50&sort=year&sortDirection=desc&yearMin=2010&yearMax=2020
```

**Serialization:**
- `RouteStateService.filtersToParams()` - Filters → URL
- `RouteStateService.paramsToFilters()` - URL → Filters

#### Layer 2: localStorage (Per-Browser UI Preferences)

**Stores:**
- Column order (user's preferred arrangement)
- Column visibility (which columns shown/hidden)
- Default page size
- Panel collapse states (workshop)
- Grid layout (workshop)

**Storage Keys:**
- `autos-table-{tableId}-preferences`
- `autos-workshop-layout`

**Service:** `TableStatePersistenceService`

### 3.3 State Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATE FLOW DIAGRAM                            │
│                                                                  │
│  1. User navigates to URL                                       │
│     ↓                                                            │
│  2. RouteStateService reads query params                        │
│     ↓                                                            │
│  3. StateManagementService.filters$ emits                       │
│     ↓                                                            │
│  4. Components subscribe and hydrate                            │
│     ↓                                                            │
│  5. User interacts (filter, sort, page)                         │
│     ↓                                                            │
│  6. Component emits event to parent                             │
│     ↓                                                            │
│  7. Parent calls StateManagementService.updateFilters()         │
│     ↓                                                            │
│  8. StateManagementService.syncStateToUrl()                     │
│     ↓                                                            │
│  9. StateManagementService.fetchVehicleData()                   │
│     ↓                                                            │
│ 10. RequestCoordinatorService executes (dedupe/cache/retry)    │
│     ↓                                                            │
│ 11. ApiService makes HTTP call                                  │
│     ↓                                                            │
│ 12. Backend queries Elasticsearch                               │
│     ↓                                                            │
│ 13. Response flows back through layers                          │
│     ↓                                                            │
│ 14. StateManagementService.results$ emits                       │
│     ↓                                                            │
│ 15. Components update display                                   │
│     ↓                                                            │
│ 16. URL change triggers cycle (back to step 2)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Component Hydration Pattern

**Idempotent Hydration:**

```typescript
// Parent component (DiscoverComponent)
ngOnInit() {
  this.stateService.filters$
    .pipe(takeUntil(this.destroy$))
    .subscribe(filters => {
      // Pass URL state to child via input
      this.pickerInitialSelections = filters.modelCombos || [];
    });
}

// Child component (ManufacturerModelTablePickerComponent)
@Input() initialSelections: ManufacturerModelSelection[] = [];

ngOnChanges(changes: SimpleChanges) {
  if (changes['initialSelections']) {
    // Hydrate from URL whenever input changes
    this.hydrateSelections();
  }
}

private hydrateSelections() {
  // Load checkboxes based on initialSelections
  this.selectedItems = [...this.initialSelections];
  // Idempotent: can be called multiple times safely
}
```

**Key Principles:**
1. Components receive state via `@Input()`
2. Hydration happens in `ngOnChanges()`
3. Hydration is idempotent (safe to repeat)
4. State changes emit events to parent
5. Parent updates central state
6. Central state syncs to URL
7. URL change triggers re-hydration

### 3.5 Request Coordination Layer

**Three-Layer API Call Architecture:**

```typescript
// Layer 1: StateManagementService (business logic)
fetchVehicleData() {
  const filters = this.getCurrentFilters();
  const cacheKey = this.buildCacheKey(filters);

  return this.requestCoordinator.execute(
    cacheKey,
    () => this.apiService.getVehicleDetails(filters),
    {
      cacheTime: 30000,      // 30s cache
      deduplication: true,   // Share in-flight requests
      retryAttempts: 2,      // Retry twice
      retryDelay: 1000       // 1s initial delay
    }
  ).pipe(
    tap(response => this.updateState(response)),
    catchError(error => this.handleError(error))
  );
}

// Layer 2: RequestCoordinatorService (optimization)
execute<T>(key: string, requestFn: () => Observable<T>, config) {
  // Check cache first
  if (this.cache.has(key)) {
    return of(this.cache.get(key));
  }

  // Check in-flight requests (deduplication)
  if (this.inFlight.has(key)) {
    return this.inFlight.get(key);
  }

  // Execute request with retry logic
  const request$ = requestFn().pipe(
    retry({
      count: config.retryAttempts,
      delay: (error, retryCount) => {
        const delay = config.retryDelay * Math.pow(2, retryCount - 1);
        return timer(delay);
      }
    }),
    tap(response => this.cache.set(key, response)),
    finalize(() => this.inFlight.delete(key)),
    shareReplay(1)  // Share with concurrent subscribers
  );

  this.inFlight.set(key, request$);
  return request$;
}

// Layer 3: ApiService (HTTP client)
getVehicleDetails(filters) {
  const params = this.buildQueryParams(filters);
  return this.http.get<VehicleDetailsResponse>(
    `${this.apiUrl}/vehicles/details`,
    { params }
  );
}
```

**Benefits:**
- **Deduplication:** Identical requests share one observable
- **Caching:** Reduce server load for repeated queries
- **Retry:** Automatic retry with exponential backoff
- **Loading State:** Per-request and global indicators
- **Testability:** Each layer can be unit tested independently

---

## 4. Notable Patterns & Architectural Decisions

### 4.1 Adapter Pattern (TableDataSource)

**Purpose:** Decouple generic table component from specific API implementations

**Pattern:**
```typescript
// Generic interface
interface TableDataSource<T> {
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}

// Concrete implementation
class VehicleDataSourceAdapter implements TableDataSource<VehicleResult> {
  constructor(private apiService: ApiService) {}

  fetch(params: TableQueryParams): Observable<TableResponse<VehicleResult>> {
    return this.apiService.getVehicleDetails(...)
      .pipe(
        map(response => ({
          results: response.results,
          total: response.total,
          page: params.page,
          size: params.size,
          totalPages: response.totalPages
        }))
      );
  }
}

// Usage
<app-base-data-table
  [dataSource]="vehicleDataSource"
  [columns]="columns">
</app-base-data-table>
```

**Benefits:**
- Reusable table component across different data sources
- Easy to mock for testing
- Clear separation of concerns

### 4.2 OnPush Change Detection Strategy

**Purpose:** Performance optimization for large data sets

**Implementation:**
```typescript
@Component({
  selector: 'app-base-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseDataTableComponent<T> {
  constructor(private cdr: ChangeDetectorRef) {}

  onDataChange() {
    // Manually trigger change detection after mutations
    this.cdr.markForCheck();
  }
}
```

**Benefits:**
- Reduces change detection cycles
- Improves performance with large tables
- Explicit control over when component updates

### 4.3 Composition Over Inheritance (ng-template Slots)

**Purpose:** Allow parent components to customize table rendering without subclassing

**Pattern:**
```typescript
// Parent component template
<app-base-data-table [columns]="columns" [dataSource]="dataSource">
  <!-- Custom cell rendering -->
  <ng-template #cellTemplate let-column="column" let-row="row">
    <span *ngIf="column.key === 'status'"
          [class]="getStatusClass(row.status)">
      {{ row.status }}
    </span>
    <span *ngIf="column.key !== 'status'">
      {{ row[column.key] }}
    </span>
  </ng-template>

  <!-- Custom expansion content -->
  <ng-template #expansionTemplate let-row="row">
    <app-vin-instances [vehicleId]="row.vehicle_id"></app-vin-instances>
  </ng-template>
</app-base-data-table>

// BaseDataTableComponent
@ContentChild('cellTemplate') cellTemplate: TemplateRef<any>;
@ContentChild('expansionTemplate') expansionTemplate: TemplateRef<any>;
```

**Benefits:**
- Flexible customization without modifying base component
- Reusable across different use cases
- Preserves type safety

### 4.4 Deterministic Synthetic Data Generation

**Purpose:** Generate realistic VIN data that's reproducible across requests

**Algorithm:**
```javascript
// Hash vehicle_id to seed
const seed = VINGenerator.hashString(vehicleId);

// Create seeded random generator
const random = VINGenerator.seededRandom(seed);

// Generate instances (always same for same vehicle_id)
for (let i = 0; i < count; i++) {
  const vin = generateVIN(manufacturer, year, i);
  const mileage = generateMileage(year, random);
  const condition = generateCondition(random);
  const value = calculateValue(condition, mileage, random);
  // ... more attributes
}
```

**Benefits:**
- Consistent data across API calls
- No need to store 100,000+ VINs in database
- Realistic distributions (geographic, color, condition)
- Low memory footprint

### 4.5 Fail-Fast Database Connection

**Purpose:** Prevent server startup without database connectivity

**Implementation:**
```javascript
// src/index.js
async function startServer() {
  try {
    await testConnection();
    console.log('✓ Connected to Elasticsearch');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('✗ Failed to connect to Elasticsearch:', error);
    process.exit(1);  // Exit immediately
  }
}

startServer();
```

**Benefits:**
- Clear failure indication in Kubernetes logs
- Restart pod automatically (liveness probe fails)
- No requests served without database
- Immediate feedback during deployment

### 4.6 Semantic Versioning with Container Images

**Pattern:**
```bash
# Backend versioning
localhost/autos-backend:v1.2.1
localhost/autos-backend:v1.2.5
localhost/autos-backend:v1.2.8  # Current

# Version increments
PATCH (v1.2.X): Bug fixes, small changes
MINOR (v1.X.0): New features, backward compatible
MAJOR (vX.0.0): Breaking changes
```

**Process:**
1. Update `package.json` version
2. Build image with version tag
3. Save as tar archive (rollback capability)
4. Import to K3s
5. Update deployment manifest
6. Apply to cluster (rolling update)

**Benefits:**
- Clear version history
- Easy rollback to previous versions
- Immutable releases (tar archives)
- Follows industry standard (semver)

### 4.7 NG-ZORRO Component Library

**Purpose:** Consistent, professional UI with minimal custom CSS

**Components Used:**
- `nz-table` - Data tables with sorting, filtering, pagination
- `nz-checkbox` - Multi-select in picker
- `nz-collapse` - Collapsible panels (workshop)
- `nz-tag` - Selected items chips
- `nz-spin` - Loading indicators
- `nz-empty` - Empty state placeholder
- `nz-icon` - Icons throughout app
- `nz-tooltip` - Contextual help

**Benefits:**
- Enterprise-grade components out of box
- Accessible (ARIA attributes)
- Responsive design
- Well-documented
- Active community

### 4.8 Kubernetes Health Checks

**Pattern:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

**Endpoint Implementation:**
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'autos-backend',
    timestamp: new Date().toISOString()
  });
});
```

**Benefits:**
- Automatic restart of unhealthy pods
- Traffic routing to healthy pods only
- Zero-downtime deployments
- Observable in Kubernetes dashboard

---

## 5. Data Flow

### 5.1 Complete Request Flow (End-to-End)

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW                             │
│                                                                   │
│  1. User clicks "Apply Filters" button                           │
│     ↓                                                             │
│  2. VehicleResultsTableComponent.onApplyFilters()                │
│     ↓                                                             │
│  3. Emit filterChange.emit(filters)                              │
│     ↓                                                             │
│  4. DiscoverComponent receives event                             │
│     ↓                                                             │
│  5. StateManagementService.updateFilters(filters)                │
│     ↓                                                             │
│  6. RouteStateService.updateParams() → URL changes               │
│     ↓                                                             │
│  7. StateManagementService.fetchVehicleData()                    │
│     ↓                                                             │
│  8. RequestCoordinatorService.execute()                          │
│     ├─ Check cache (hit → return cached)                         │
│     ├─ Check in-flight requests (pending → share observable)    │
│     └─ Cache miss → proceed to API call                          │
│     ↓                                                             │
│  9. ApiService.getVehicleDetails()                               │
│     ↓                                                             │
│ 10. HTTP GET /api/v1/vehicles/details?models=...                 │
│     ↓                                                             │
│ 11. Kubernetes Ingress routes to backend pod                     │
│     ↓                                                             │
│ 12. Express router → vehicleController.getVehicleDetailsHandler  │
│     ├─ Validate query parameters                                 │
│     ├─ Parse model combinations                                  │
│     └─ Call elasticsearchService                                 │
│     ↓                                                             │
│ 13. ElasticsearchService.getVehicleDetails()                     │
│     ├─ Build Elasticsearch query (bool, should, filter)          │
│     ├─ Add sorting, pagination                                   │
│     └─ Execute query                                             │
│     ↓                                                             │
│ 14. Elasticsearch cluster processes query                        │
│     ├─ Index: autos-unified (~100k docs)                         │
│     ├─ Apply filters, sort, pagination                           │
│     └─ Return results                                            │
│     ↓                                                             │
│ 15. Backend formats response                                     │
│     ↓                                                             │
│ 16. HTTP response flows back through layers                      │
│     ↓                                                             │
│ 17. RequestCoordinatorService caches response                    │
│     ↓                                                             │
│ 18. StateManagementService.results$ emits                        │
│     ↓                                                             │
│ 19. VehicleResultsTableComponent receives new data               │
│     ├─ Update table rows                                         │
│     ├─ Update pagination                                         │
│     └─ Trigger change detection                                  │
│     ↓                                                             │
│ 20. User sees updated results                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 VIN Instance Expansion Flow

```
1. User clicks expand icon on vehicle row
   ↓
2. VehicleResultsTableComponent.onRowExpand(row)
   ↓
3. Check if instances already loaded
   ├─ Loaded → toggle visibility
   └─ Not loaded → fetch from API
   ↓
4. ApiService.getVehicleInstances(vehicleId, count=8)
   ↓
5. GET /api/v1/vehicles/:vehicleId/instances?count=8
   ↓
6. Backend controller validates vehicleId
   ↓
7. ElasticsearchService queries for vehicle_id
   ↓
8. If found:
   ├─ VINGenerator.generateInstances(vehicleData, count)
   ├─ Hash vehicle_id to seed
   ├─ Generate 8 deterministic VINs with attributes
   └─ Return instances
   ↓
9. Frontend receives instances
   ↓
10. Store in expandedRowsData map
   ↓
11. Display in expansion panel
    ├─ VIN
    ├─ Condition rating (stars)
    ├─ Mileage
    ├─ State
    ├─ Color
    ├─ Options (tags)
    └─ Estimated value
```

### 5.3 Picker Selection Flow

```
1. User expands manufacturer row in picker
   ↓
2. ManufacturerModelTablePickerComponent toggles expand
   ↓
3. Display models for that manufacturer
   ↓
4. User clicks checkbox on model
   ↓
5. Component updates selectedItems array
   ↓
6. User clicks "Apply" button
   ↓
7. Emit selectionChange.emit(selectedItems)
   ↓
8. DiscoverComponent receives event
   ↓
9. Convert to modelCombos format
   ↓
10. StateManagementService.updateFilters({ modelCombos, page: 1 })
    ↓
11. URL updates with new model selections
    ↓
12. StateManagementService.fetchVehicleData()
    ↓
13. Results table displays matching vehicles
```

---

## 6. Technology Stack

### 6.1 Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18 (Alpine) | Runtime environment |
| **Express** | 4.18.2 | Web framework |
| **Elasticsearch** | 8.11.0 (client) | Search and analytics engine |
| **CORS** | 2.8.5 | Cross-origin middleware |
| **dotenv** | 16.3.1 | Environment variable management |
| **nodemon** | 3.0.1 (dev) | Auto-restart on file changes |

### 6.2 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Angular** | 14.2.0 | Frontend framework |
| **TypeScript** | ~4.7.2 | Type-safe JavaScript |
| **RxJS** | ~7.5.0 | Reactive programming |
| **NG-ZORRO** | 14.3.0 | Ant Design UI library |
| **Angular CDK** | 14.2.7 | Component Dev Kit (drag/drop) |
| **angular-gridster2** | 14.1.5 | Grid layout system |
| **nginx** | alpine | Production static file server |

### 6.3 Infrastructure Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Kubernetes** | K3s | Container orchestration |
| **Podman** | Latest | Container image builds |
| **containerd** | K3s default | Container runtime |
| **Elasticsearch** | 8.x | Data store (separate cluster) |
| **Ubuntu** | 24.04.3 | OS for nodes |

### 6.4 Development Tools

| Tool | Purpose |
|------|---------|
| **VS Code** | Primary IDE (Remote-SSH to Thor) |
| **Angular CLI** | 14.x - Frontend scaffolding and builds |
| **npm** | Package management |
| **kubectl** | Kubernetes CLI |
| **Git** | Version control |

---

## 7. Development Workflow

### 7.1 Frontend Development (Hot Reload)

```bash
# Start dev container with HMR
cd /home/odin/projects/autos/frontend
podman run -d \
  --name autos-frontend-dev \
  -p 4200:4200 \
  -v ./:/app:z \
  localhost/autos-frontend:dev

# Access at http://192.168.0.244:4200
# Edit files in VS Code → Auto-reload
```

### 7.2 Backend Development

```bash
# Edit files in /home/odin/projects/autos/backend
# Test changes locally:
npm run dev  # nodemon auto-restarts

# When ready to deploy:
# 1. Update version in package.json
VERSION=$(node -p "require('./package.json').version")

# 2. Build image
podman build -t localhost/autos-backend:v${VERSION} .

# 3. Save tar (for rollback)
podman save -o autos-backend-v${VERSION}.tar localhost/autos-backend:v${VERSION}

# 4. Import to K3s
sudo k3s ctr images import autos-backend-v${VERSION}.tar

# 5. Update deployment manifest
# Edit k8s/backend-deployment.yaml

# 6. Apply to cluster
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/autos-backend -n autos
```

### 7.3 Production Frontend Build

```bash
cd /home/odin/projects/autos/frontend

# Build production image
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .

# Save tar
podman save -o autos-frontend-prod.tar localhost/autos-frontend:prod

# Import to K3s
sudo k3s ctr images import autos-frontend-prod.tar

# Verify
sudo k3s ctr images list | grep autos-frontend

# Deploy
kubectl apply -f k8s/frontend-deployment.yaml
kubectl rollout status deployment/autos-frontend -n autos
```

### 7.4 Data Pipeline

```bash
# Load sample data (testing)
cd /home/odin/projects/autos/data/scripts
python3 load_sample_data.py

# Load full dataset (production)
python3 load_full_data.py

# Reset index (destructive)
python3 reset_index.py
```

---

## 8. Production Architecture

### 8.1 Kubernetes Cluster

```
┌─────────────────────────────────────────────────────────┐
│               KUBERNETES CLUSTER ARCHITECTURE            │
│                                                          │
│  Ingress (autos.minilab)                                │
│       │                                                  │
│       ├──> Frontend Service (ClusterIP)                 │
│       │    └─> Frontend Pod (nginx)                     │
│       │        Image: localhost/autos-frontend:prod     │
│       │        Port: 80                                  │
│       │        Replicas: 2                               │
│       │                                                  │
│       └──> Backend Service (ClusterIP)                  │
│            └─> Backend Pod (Node.js)                    │
│                Image: localhost/autos-backend:v1.2.8    │
│                Port: 3000                                │
│                Replicas: 2                               │
│                Health: /health endpoint                  │
│                Resources: 128Mi-256Mi, 100m-500m CPU    │
│                                                          │
│  External: Elasticsearch (elasticsearch.data.svc)       │
│            Index: autos-unified (~100k docs)            │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Network Flow

```
Browser
  ↓
http://autos.minilab
  ↓
Kubernetes Ingress Controller
  ↓ (path: /)
Frontend Pod (nginx) - Serves Angular SPA
  ↓ (path: /api/*)
Backend Pod (Express) - Proxied by nginx
  ↓
Elasticsearch (elasticsearch.data.svc.cluster.local:9200)
  ↓
Index: autos-unified
```

### 8.3 Deployment Configuration

**Frontend Deployment:**
- Image: `localhost/autos-frontend:prod`
- Replicas: 2
- Port: 80
- Node: Thor (192.168.0.244)
- Strategy: Rolling update (zero downtime)

**Backend Deployment:**
- Image: `localhost/autos-backend:v1.2.8`
- Replicas: 2
- Port: 3000
- Node: Thor (192.168.0.244)
- Health checks: Liveness + Readiness on `/health`
- Resources:
  - Requests: 128Mi memory, 100m CPU
  - Limits: 256Mi memory, 500m CPU
- Strategy: Rolling update

**Environment Variables (Backend):**
```yaml
ELASTICSEARCH_URL: http://elasticsearch.data.svc.cluster.local:9200
ELASTICSEARCH_INDEX: autos-unified
NODE_ENV: production
PORT: 3000
```

### 8.4 Service Discovery

**Internal DNS:**
- Backend: `autos-backend.autos.svc.cluster.local:3000`
- Frontend: `autos-frontend.autos.svc.cluster.local:80`
- Elasticsearch: `elasticsearch.data.svc.cluster.local:9200`

**External Access:**
- Frontend: `http://autos.minilab` (via Ingress)
- Backend API: `http://autos.minilab/api/v1/*` (proxied by nginx)

---

## Summary

The AUTOS project is a well-architected, production-ready vehicle data platform with:

**Strengths:**
- ✅ URL-first state management (bookmarkable, shareable)
- ✅ Request optimization (deduplication, caching, retry)
- ✅ Reusable components (BaseDataTable pattern)
- ✅ Deterministic synthetic data (VIN generation)
- ✅ Professional UI (NG-ZORRO components)
- ✅ Container-based deployment (Kubernetes)
- ✅ Comprehensive documentation (19+ docs)
- ✅ Semantic versioning (8 backend releases)

**In Progress:**
- 🔄 ColumnManagerComponent (UI for column management)
- 🔄 VehicleResultsTable migration to BaseDataTable
- 🔄 Error boundary pattern (Phase 2 refactoring)
- 🔄 Centralized action pattern (Phase 3 refactoring)

**Architecture Highlights:**
- 3-tier architecture (Angular → Express → Elasticsearch)
- Adapter pattern for data sources
- OnPush change detection for performance
- Composition over inheritance (ng-template slots)
- Fail-fast database connection
- Health checks for zero-downtime deployments

This codebase demonstrates enterprise-grade patterns and is ready for continued development and scaling.

---

**Document Generated:** 2025-10-21
**Total Project Size:** ~1.3 GB (mostly backend release archives)
**Active Development:** Frontend (Angular 14), Backend (Node.js 18), Kubernetes (K3s)
