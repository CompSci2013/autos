# AUTOS Application - Next Session Onboarding

**Created:** 2025-11-02
**Purpose:** Comprehensive orientation for Claude sessions on the AUTOS project
**Read First:** This document, then [CLAUDE.md](CLAUDE.md) for complete reference

---

## Quick Context

You are working on **AUTOS**, a vehicle search and discovery application running on a Kubernetes cluster. The application combines Angular 14 frontend with Node.js/Express backend, using Elasticsearch as the data store for 100,000+ vehicle records.

**Access URL:** http://autos.minilab
**Project Location:** `/home/odin/projects/autos/` (on Thor node)
**Current State:** Stable, recently fixed table column filter bug

---

## Core Design Philosophy

### 1. URL as Single Source of Truth

**Everything query-related lives in the URL.** This is not negotiable.

```
http://autos.minilab/discover?
  modelCombos=Ford:F-150,Chevrolet:Silverado
  &page=2
  &size=20
  &sort=year
  &sortDirection=desc
  &manufacturer=Ford
  &yearMin=2015
  &yearMax=2023
```

**Why:**
- Shareable links that restore exact application state
- Browser back/forward works correctly
- Bookmarks preserve search context
- No hidden state, no surprises

**Components read from URL on initialization**, never from localStorage or internal state for query data.

### 2. Pattern 2: Search vs Filter Separation

There are **TWO types of filters** with different behaviors:

#### Query Control Filters (URL-persisted, exact matching)
- Selected model combinations (Picker)
- Manufacturer/Model dropdowns
- Year range sliders
- Body class selection
- Data source selection

**Behavior:**
- Stored in URL query parameters
- Exact matching in Elasticsearch
- Shareable and bookmarkable
- Managed by `StateManagementService`

#### Table Column Search Filters (Ephemeral, partial matching)
- Text inputs in table column headers
- Type "pick" → shows "Pickup" results
- Type "sed" → shows "Sedan" results

**Behavior:**
- NOT stored in URL (ephemeral)
- Partial matching (contains query)
- Cleared on page refresh
- Sent as `manufacturerSearch`, `modelSearch`, `bodyClassSearch`, `dataSourceSearch` parameters

**Critical:** These are separate filter channels. Don't confuse them. Cache keys must include BOTH.

### 3. Request Deduplication and Caching

**RequestCoordinatorService** handles all API calls through a central coordinator:

```typescript
this.requestCoordinator.execute(
  cacheKey,           // Deterministic key from ALL filter parameters
  () => apiCall(),    // Request factory function
  {
    cacheTime: 0,           // Currently DISABLED (was 30000ms)
    deduplication: true,     // Active - prevents duplicate in-flight requests
    retryAttempts: 2,        // Exponential backoff retry
    retryDelay: 1000,
  }
)
```

**Current State:** Caching is **disabled** (`cacheTime: 0`) for development reliability. Do not re-enable without explicit user approval.

**Why Deduplication Matters:**
- `StateManagementService` pre-fetches data on URL changes
- `BaseDataTableComponent` may request same data
- Without deduplication: duplicate API calls
- With deduplication: single API call, shared response

### 4. State Management Architecture

```
URL Changes
    ↓
RouteStateService.queryParams$
    ↓
StateManagementService.filters$
    ↓
Component Subscription
    ↓
Component Hydration
```

**Services:**
- `RouteStateService`: Low-level URL parameter management
- `StateManagementService`: High-level business logic, orchestrates API calls
- `RequestCoordinatorService`: Request deduplication, caching, retry logic

**Storage Layers:**
1. **URL** (query state) - Shareable, bookmarkable
2. **localStorage** (UI preferences only) - Column order, visibility, page size defaults

**Never store query state in localStorage.** Only UI preferences.

### 5. Change Detection Strategy

**Angular OnPush optimization requires explicit change detection:**

```typescript
// ✅ CORRECT: Create new array reference + force detection
this.results = [...newResults];
this.cdr.detectChanges();

// ❌ WRONG: Mutate existing array
this.results.push(newItem);  // OnPush won't detect this

// ❌ WRONG: Schedule detection (may be too late)
this.cdr.markForCheck();  // Use detectChanges() instead
```

**Why OnPush:**
- Performance optimization for large tables
- Requires immutable data patterns
- Needs explicit change detection triggers

---

## Recent Work: Table Column Filter Fix (2025-11-02)

### The Bug

Table column filters (type "pick" in Body Class) would:
- Call API correctly (return 290 Pickup results)
- Update result count (290)
- **NOT update displayed rows** (still showed 858 mixed results)

### Root Causes

1. **Cache Key Collision**: `VehicleDataSourceAdapter.buildCacheKey()` was missing ephemeral filter fields (`manufacturerSearch`, etc.), so different filter values generated the same cache key
2. **Change Detection**: Angular OnPush didn't detect data input changes in `BaseDataTableComponent`
3. **Filter Clearing**: Empty filter string (falsy) wasn't triggering data refetch

### The Fix

**Files Changed:**
1. `vehicle-data-source.adapter.ts`: Added ephemeral filters to cache key
2. `results-table.component.ts`: Added `detectChanges()` + new array references
3. `base-data-table.component.ts`: Added fallback change detection in `ngOnChanges()`
4. `state-management.service.ts`: Added debug logging, disabled caching

**Commit:** `0f590a5` - "Fix table column filters not updating UI with filtered data"

### Current State

✅ Filters work correctly
✅ Filter clearing restores unfiltered data
✅ Debug logging in place
⚠️ Caching disabled for development reliability

**Do not re-enable caching** without user approval.

---

## Key Architecture Components

### Frontend (Angular 14)

```
src/app/
├── core/services/
│   ├── route-state.service.ts          # URL parameter management
│   ├── state-management.service.ts      # Business logic orchestration
│   └── request-coordinator.service.ts   # Deduplication + caching
├── features/
│   ├── discover/                        # Traditional fixed layout
│   ├── workshop/                        # Experimental grid layout
│   ├── picker/                          # Manufacturer-Model table
│   └── results/
│       ├── results-table/               # New pattern (BaseDataTable)
│       └── vehicle-results-table/       # Legacy (still on Discover page)
├── shared/
│   ├── components/
│   │   ├── base-data-table/             # Reusable table component
│   │   └── column-manager/              # Column visibility/order manager
│   └── services/
│       └── table-state-persistence.service.ts  # localStorage for UI prefs
└── services/
    └── api.service.ts                   # HTTP client
```

### Backend (Node.js + Express)

```
backend/
├── src/
│   ├── controllers/vehicleController.js
│   ├── services/elasticsearchService.js
│   ├── routes/vehicleRoutes.js
│   └── utils/vinGenerator.js
├── package.json                         # Version: 1.4.1
└── Dockerfile
```

**API Endpoints:**
- `GET /api/search/manufacturer-model-counts` - For picker table
- `GET /api/search/vehicle-details` - Main results endpoint
- `GET /api/search/vehicle-instances/:vehicleId` - VIN generation

### Data Store

**Elasticsearch Index:** `autos-unified`
**Documents:** 100,000+ vehicle records
**Key Fields:**
- `manufacturer`, `model`, `year`, `body_class`, `data_source`
- `vehicle_id` (unique hash)
- `instance_count` (how many VINs exist for this combination)

**VINs are generated on-demand** (not stored in Elasticsearch).

---

## Component Patterns

### Pattern 1: Pre-Fetched Data Mode (Current)

```typescript
// ResultsTableComponent receives data from StateManagementService
this.stateService.results$
  .pipe(takeUntil(this.destroy$))
  .subscribe((results) => {
    this.results = [...results];  // New reference
    this.cdr.detectChanges();      // Force detection
  });

// Pass to BaseDataTableComponent via Input
<app-base-data-table
  [data]="results"
  [totalCount]="totalResults"
  [loading]="isLoading"
  (queryParamsChange)="onTableQueryChange($event)"
>
```

### Pattern 2: DataSource Mode (Alternative)

```typescript
// BaseDataTableComponent fetches its own data
<app-base-data-table
  [dataSource]="vehicleDataSource"
  [queryParams]="tableQueryParams"
>
```

**Current implementation uses Pattern 1** because `StateManagementService` pre-fetches data on URL changes.

---

## Development Workflow

### Frontend Development (Recommended)

```bash
# Start dev container with HMR
cd /home/odin/projects/autos/frontend
podman run -d \
  --name autos-frontend-dev \
  -p 4200:4200 \
  -v ./:/app:z \
  localhost/autos-frontend:dev

# View at http://192.168.0.244:4200
# Changes auto-reload
```

### Frontend Production Deployment

```bash
# Build production image
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .

# Re-tag to match deployment YAML
podman tag localhost/autos-frontend:prod localhost/autos-frontend:prod-v1.1.3

# Export and import to K3s
podman save localhost/autos-frontend:prod-v1.1.3 -o autos-frontend-prod-v1.1.3.tar
sudo k3s ctr images import autos-frontend-prod-v1.1.3.tar

# Restart deployment
kubectl rollout restart deployment/autos-frontend -n autos
```

**⚠️ CRITICAL:** Frontend image tag must match `k8s/frontend-deployment.yaml` line 26.

### Backend Development

```bash
# Increment version in package.json first
cd /home/odin/projects/autos/backend
# Edit package.json: "version": "1.4.2"

# Build with new version
VERSION=$(node -p "require('./package.json').version")
podman build -t localhost/autos-backend:v${VERSION} .

# Export and import
podman save -o autos-backend-v${VERSION}.tar localhost/autos-backend:v${VERSION}
sudo k3s ctr images import autos-backend-v${VERSION}.tar

# Update k8s/backend-deployment.yaml image tag
# Apply and restart
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/autos-backend -n autos
```

---

## Documentation Structure

### Essential Documents

1. **CLAUDE.md** (this directory) - Complete reference, read first
2. **developer-environment.md** (docs/) - Operational procedures (rebuild, deploy)
3. **state-management-guide.md** (docs/) - State patterns and component hydration
4. **state-management-refactoring-plan-part1.md** (docs/) - Professional-grade patterns
5. **milestone-003-base-table-design.md** (docs/design/) - BaseDataTable specification

### Design Documents

```
docs/
├── design/
│   ├── milestone-003-base-table-design.md     # ✅ COMPLETE - BaseDataTable pattern
│   └── panel-popout-architecture.md           # ✅ COMPLETE - Multi-window panels
├── snapshots/                                  # Historical analysis
├── state-management-guide.md                   # State patterns reference
└── state-management-refactoring-plan-part1.md  # RequestCoordinator pattern
```

---

## Common Tasks

### Check Application Status

```bash
kubectl get pods -n autos
kubectl logs -n autos deployment/autos-backend --tail=50
kubectl logs -n autos deployment/autos-frontend --tail=50

# Access services
curl http://autos.minilab
curl http://autos.minilab/api/health
```

### Debugging State Issues

1. Check browser console for state management logs (`🔵`, `📥`, `🔷` prefixes)
2. Verify URL parameters match component state
3. Check RequestCoordinator cache keys for uniqueness
4. Verify change detection calls (`detectChanges()` vs `markForCheck()`)
5. Inspect new array references in subscriptions

### Adding New Features

**Before coding:**
1. Determine if state should live in URL (query) or localStorage (UI prefs)
2. Identify filter type: Query Control (exact, URL) or Table Column (partial, ephemeral)
3. Plan cache key generation (include ALL relevant parameters)
4. Consider change detection strategy (OnPush requires explicit triggers)

**During coding:**
- Follow existing patterns (see state-management-guide.md)
- Use RequestCoordinator for all API calls
- Create new array references for OnPush components
- Add debug logging with consistent prefixes

**After coding:**
- Test URL sharing (copy/paste URL in new tab)
- Test browser back/forward
- Test filter clearing (empty strings)
- Verify cache keys are unique for different filter combinations

---

## Critical Conventions

### DO:
- ✅ Store query state in URL
- ✅ Use RequestCoordinator for API calls
- ✅ Create new array references for OnPush
- ✅ Call `detectChanges()` after state updates
- ✅ Include ALL filters in cache keys
- ✅ Add debug logging with prefixes
- ✅ Test URL sharing and bookmarking

### DON'T:
- ❌ Store query state in localStorage
- ❌ Bypass RequestCoordinator (direct API calls)
- ❌ Mutate arrays in OnPush components
- ❌ Use `markForCheck()` instead of `detectChanges()`
- ❌ Forget ephemeral filters in cache keys
- ❌ Re-enable caching without user approval
- ❌ Mix Query Control and Table Column filter logic

---

## Current Development Focus

**Stable Features:**
- ✅ URL-driven state management
- ✅ Request deduplication and retry logic
- ✅ BaseDataTable reusable component
- ✅ Column manager (visibility, order, persistence)
- ✅ Table column filters (ephemeral, partial matching)
- ✅ Panel pop-out architecture (multi-window support)

**Recent Fixes:**
- ✅ Table column filters now update displayed results correctly
- ✅ Filter clearing restores unfiltered data
- ✅ Cache key collision resolved

**Current State:**
- ⚠️ Caching disabled (`cacheTime: 0`) - do not re-enable without approval
- ℹ️ Debug logging active - helpful for development

**Optional Future Work:**
- Migrate VehicleResultsTableComponent (Discover page) to BaseDataTable pattern
- Re-enable caching after thorough testing
- Add global error boundary pattern
- Implement centralized action pattern with audit trail

---

## Quick Reference Commands

```bash
# Check cluster
kubectl get pods -n autos

# View logs
kubectl logs -n autos deployment/autos-backend --tail=50
kubectl logs -n autos deployment/autos-frontend --tail=50

# Restart services
kubectl rollout restart deployment/autos-backend -n autos
kubectl rollout restart deployment/autos-frontend -n autos

# Start dev container
cd /home/odin/projects/autos/frontend
podman run -d --name autos-frontend-dev -p 4200:4200 \
  -v ./:/app:z localhost/autos-frontend:dev

# View dev logs
podman logs -f autos-frontend-dev

# Stop dev container
podman stop autos-frontend-dev && podman rm autos-frontend-dev
```

---

## Session Start Checklist

When starting a new session:

1. ✅ Read this document (NEXT-SESSION.md)
2. ✅ Skim CLAUDE.md for complete reference
3. ✅ Check git status: `git status`
4. ✅ Check recent commits: `git log --oneline -10`
5. ✅ Verify application is running: `curl http://autos.minilab`
6. ✅ Understand current state (caching disabled, debug logging active)
7. ✅ Ask user what they want to work on

---

## Contact and Support

**Project Lead:** odin
**Infrastructure:** Halo Labs Kubernetes Cluster (K3s on Loki + Thor)
**Issue Reporting:** GitLab at gitlab.minilab/halo/autos
**Documentation:** `/home/odin/projects/autos/docs/`

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
**Purpose:** Ensure every new Claude session starts with complete context

---

**END OF NEXT SESSION ONBOARDING**

Read [CLAUDE.md](CLAUDE.md) for complete architectural reference and detailed documentation.
