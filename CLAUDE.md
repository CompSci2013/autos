# AUTOS Application - Claude Onboarding Reference

**Path:** `/home/odin/projects/autos/CLAUDE.md`  
**Created:** 2025-10-13  
**Updated:** 2025-10-18  
**Purpose:** Complete reference for Claude to rapidly understand and develop the AUTOS application

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Application Architecture](#application-architecture)
3. [Container Images](#container-images)
4. [Data Pipeline](#data-pipeline)
5. [Backend API](#backend-api)
6. [Frontend Application](#frontend-application)
7. [Development Workflows](#development-workflows)
8. [Deployment Procedures](#deployment-procedures)
9. [Quick Start Commands](#quick-start-commands)
10. [Troubleshooting](#troubleshooting)
11. [Documentation](#documentation)
12. [Claude Session Guidelines](#claude-session-guidelines)

---

## Infrastructure Overview

### Cluster Configuration

```yaml
Infrastructure: Halo Labs Kubernetes Cluster
Distribution: K3s
Nodes:
  - Loki (192.168.0.110): Control plane, Ubuntu 24.04.3
  - Thor (192.168.0.244): Worker node with NVIDIA GPU, Ubuntu 24.04.3
Network: 192.168.0.0/24
DNS: Internal via /etc/hosts (*.minilab domain)
Container Runtime: containerd (K3s) + Podman (builds)
```

### AUTOS Project Location

```bash
Thor: /home/odin/projects/autos/
├── backend/              # Node.js + Express API
├── frontend/             # Angular 14 application
├── data/scripts/         # Elasticsearch data loading
├── k8s/                  # Kubernetes manifests
└── docs/                 # Project documentation
    ├── design/           # Design documents (milestones)
    ├── snapshots/        # Analysis snapshots
    ├── state-management-guide.md
    └── state-management-refactoring-plan-part1.md
```

### Kubernetes Resources

```yaml
Namespace: autos
Access URL: http://autos.minilab
Backend Service: autos-backend.autos.svc.cluster.local:3000
Frontend Service: autos-frontend.autos.svc.cluster.local:80
Data Store: elasticsearch.data.svc.cluster.local:9200
Index: autos-unified
```

---

## Application Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTOS ARCHITECTURE                        │
│                                                              │
│  Browser (http://autos.minilab)                             │
│       │                                                      │
│       ├─> Angular Frontend (port 80)                        │
│       │   ├── URL-driven state (query parameters)           │
│       │   ├── StateManagementService + RouteStateService    │
│       │   ├── RequestCoordinatorService (deduplication)     │
│       │   └── localStorage (UI preferences only)            │
│       │                                                      │
│       └─> Backend API (port 3000)                           │
│           ├── Express.js REST API                           │
│           ├── Vehicle search & details                      │
│           └── Elasticsearch queries                         │
│                                                              │
│  Data Store: Elasticsearch                                  │
│       └── Index: autos-unified (100,000 records)            │
└─────────────────────────────────────────────────────────────┘
```

### State Management Architecture

**URL as Single Source of Truth:**

- All query state (filters, sort, page) lives in URL query parameters
- Components hydrate from URL on initialization
- State changes update URL, triggering re-hydration
- Supports: bookmarking, sharing, browser back/forward

**Two Storage Layers:**

1. **URL (Query State)** - Shareable, bookmarkable

   - Selected model combinations
   - Active filters (year range, body class, etc.)
   - Sort column and direction
   - Current page and page size

2. **localStorage (UI Preferences)** - Per-browser, not shareable
   - Column order (user's preferred arrangement)
   - Column visibility (which columns shown/hidden)
   - Default page size preference
   - Panel collapse states

**Services:**

- `RouteStateService` - Low-level URL parameter management
- `StateManagementService` - High-level business logic, triggers API calls
- `RequestCoordinatorService` - Request deduplication, caching, retry logic
- `TableStatePersistenceService` - localStorage for table UI preferences

---

## Container Images

### Frontend Images

```yaml
Development Image: localhost/autos-frontend:dev
  Base: node:14-alpine
  Port: 4200
  Features: Hot Module Reload (HMR), live reload
  Use: VS Code development only

Production Image: localhost/autos-frontend:prod
  Base: nginx:alpine
  Port: 80
  Features: Optimized build, static serving
  Use: Kubernetes deployment
```

### Backend Images

```yaml
Current Version: localhost/autos-backend:v1.2.5
  Base: node:18-alpine
  Port: 3000
  Features: Express API, Elasticsearch client
  Versioning: Semantic (major.minor.patch)
```

---

## Data Pipeline

### Elasticsearch Index: autos-unified

**Document Structure:**

```json
{
  "manufacturer": "Ford",
  "model": "F-150",
  "year": 2020,
  "body_class": "Pickup",
  "data_source": "NHTSA",
  "vehicle_id": "unique-hash",
  "make_model_year": "Ford|F-150|2020",
  "instance_count": 25000
}
```

**Key Fields:**

- `make_model_year`: Composite key for grouping
- `instance_count`: How many VINs match this combination
- VIN instances: Generated on-demand (not stored)

**VIN Generation (On-Demand):**

- Quantity: Based on instance_count
- State: Geographic weighting (CA 15%, TX 8%, FL 7%, etc.)
- Color: Period-appropriate (pre-1970 vs post-1970 palettes)
- Value: Calculated from condition + mileage + options

**No VINs Stored in Elasticsearch** - All generated on-demand per request

### Environment Variables

**Defined in:** `k8s/backend-deployment.yaml`

```yaml
ELASTICSEARCH_URL: http://elasticsearch.data.svc.cluster.local:9200
ELASTICSEARCH_INDEX: autos-unified
NODE_ENV: production
PORT: 3000
```

---

## Backend API

### Current Version: v1.2.5

**Base URL:** `http://autos.minilab/api` (proxied) or `http://localhost:3000` (dev)

### Endpoints

#### GET /api/search/manufacturer-model-counts

```typescript
Query Params: None
Response: {
  manufacturers: Array<{
    manufacturer: string;
    models: Array<{
      model: string;
      count: number;
    }>;
  }>;
}
```

#### GET /api/search/vehicle-details

```typescript
Query Params:
  models: string               // "Ford:F-150,Chevrolet:Corvette"
  page: number                 // 1-indexed
  size: number                 // 10, 20, 50, 100
  manufacturer?: string        // Filter
  model?: string              // Filter
  yearMin?: number            // Filter
  yearMax?: number            // Filter
  bodyClass?: string          // Filter
  dataSource?: string         // Filter
  sortBy?: string             // Column key
  sortOrder?: 'asc' | 'desc'  // Sort direction

Response: {
  results: VehicleResult[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

#### GET /api/search/vehicle-instances/:vehicleId

```typescript
Path Params:
  vehicleId: string

Query Params:
  count?: number  // Default: 5, Max: 100

Response: {
  vehicle_id: string;
  instances: VehicleInstance[];
}
```

---

## Frontend Application

### Technology Stack

```yaml
Framework: Angular 14
CLI Version: @angular/cli@14
Package Manager: npm
Development Port: 4200 (hot reload)
Production Port: 80 (nginx)
UI Library: NG-ZORRO (Ant Design for Angular)
State Management: URL-driven with RxJS
```

### Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   └── services/
│   │   │       ├── route-state.service.ts
│   │   │       ├── state-management.service.ts
│   │   │       └── request-coordinator.service.ts
│   │   ├── features/
│   │   │   ├── discover/
│   │   │   │   └── discover.component.ts        # Main container
│   │   │   ├── picker/
│   │   │   │   └── manufacturer-model-table-picker/
│   │   │   │       └── *.component.ts           # Picker table
│   │   │   └── results/
│   │   │       └── vehicle-results-table/
│   │   │           └── *.component.ts           # Results + VIN expansion
│   │   ├── models/
│   │   │   ├── search-filters.model.ts
│   │   │   ├── vehicle.model.ts
│   │   │   └── vehicle-result.model.ts
│   │   ├── services/
│   │   │   └── api.service.ts                    # HTTP client
│   │   └── shared/                                # [Milestone 003]
│   │       ├── shared.module.ts                   # [NEW]
│   │       ├── components/
│   │       │   ├── base-data-table/               # [IMPLEMENTED]
│   │       │   │   ├── base-data-table.component.ts
│   │       │   │   ├── base-data-table.component.html
│   │       │   │   └── base-data-table.component.scss
│   │       │   └── column-manager/                # [NOT IMPLEMENTED]
│   │       │       ├── column-manager.component.ts
│   │       │       ├── column-manager.component.html
│   │       │       └── column-manager.component.scss
│   │       ├── models/
│   │       │   ├── table-column.model.ts          # [IMPLEMENTED]
│   │       │   ├── table-data-source.model.ts     # [IMPLEMENTED]
│   │       │   └── index.ts
│   │       └── services/
│   │           └── table-state-persistence.service.ts  # [IMPLEMENTED]
│   └── environments/
│       ├── environment.ts                        # Dev: http://localhost:3000
│       └── environment.prod.ts                   # Prod: /api (proxied)
├── Dockerfile                                    # Default (same as Dockerfile.prod)
├── Dockerfile.dev                                # Dev container (Node.js)
├── Dockerfile.prod                               # Prod container (nginx)
├── nginx.conf                                    # Production nginx config
└── package.json
```

### Component Hierarchy

```
AppComponent
├── NavigationComponent
└── RouterOutlet
    ├── DiscoverComponent (main container)
    │   ├── ManufacturerModelTablePickerComponent
    │   │   ├── DUAL MODE: Tree + Table + Multi-select
    │   │   └── Emits: modelCombos[]
    │   └── VehicleResultsTableComponent
    │       ├── Displays: Vehicle search results
    │       ├── Expandable: VIN instances per vehicle
    │       └── Status: READY FOR MIGRATION to BaseDataTable
    └── WorkshopComponent ( builder interface)
```

### Workshop Page Implementation

**Status:** âœ… FULLY IMPLEMENTED (Experimental Feature)

**Route:** `/workshop`

**Purpose:** Drag-and-drop customizable workspace

**Key Features:**

- **Grid Layout:** @katoid/angular-grid-layout (12-column grid)
- **Panels:**
  - Manufacturer-Model Picker (collapsible)
  - Vehicle Results Table (collapsible)
- **Persistence:** Layout saved to localStorage (`autos-workshop-layout`)
- **State Integration:** Full StateManagementService integration
- **Drag Conflict Resolution:** Prevents grid drag from interfering with table column reordering

**Technical Implementation:**

- Grid configuration: 12 cols, 50px row height, 16px gap
- Default layout: Picker (12×16), Results (12×14)
- Dynamic drag enable/disable using Renderer2
- CDK drag event listeners for column vs grid drag coordination

```

Also update the component hierarchy diagram to show Workshop as implemented:
```

AppComponent
├── NavigationComponent
└── RouterOutlet
├── HomeComponent (landing page with feature cards)
├── DiscoverComponent (traditional layout)
│ ├── ManufacturerModelTablePickerComponent
│ └── VehicleResultsTableComponent
└── WorkshopComponent âœ… (experimental grid layout)
├── ktd-grid (drag/drop layout system)
│ ├── Picker Panel (nz-collapse)
│ │ └── ManufacturerModelTablePickerComponent
│ └── Results Panel (nz-collapse)
│ └── VehicleResultsTableComponent

### State Management Flow

**URL → Component Hydration:**

```
1. User navigates to URL with query params
2. RouteStateService.getQueryParam() reads URL
3. StateManagementService.filters$ emits current state
4. Component subscribes and hydrates from state
5. Component displays UI based on state
```

**User Interaction → URL Update:**

```
1. User interacts with UI (filter, sort, page)
2. Component emits event to parent
3. Parent calls StateManagementService.updateFilters()
4. StateManagementService.syncStateToUrl() updates URL
5. StateManagementService.fetchVehicleData() triggers API
6. RequestCoordinatorService deduplicates/caches request
7. URL change triggers hydration cycle (step 1 above)
```

---

## Development Workflows

### Frontend Development Workflow

**Development Mode (Recommended):**

```bash
# 1. Start dev container with HMR
cd /home/odin/projects/autos/frontend
podman run -d \
  --name autos-frontend-dev \
  -p 4200:4200 \
  -v ./:/app:z \
  localhost/autos-frontend:dev

# 2. Edit files (VS Code Remote-SSH to Thor)
# Changes auto-reload via HMR

# 3. View at http://192.168.0.244:4200
```

**Production Build (When Ready to Deploy):**

```bash
# 1. Build production image
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .

# 2. Save as tar
podman save -o autos-frontend-prod.tar localhost/autos-frontend:prod

# 3. Import to K3s
sudo k3s ctr images import autos-frontend-prod.tar

# 4. Verify import
sudo k3s ctr images list | grep autos-frontend

# 5. Deploy to Kubernetes (rolling update)
kubectl apply -f k8s/frontend-deployment.yaml
kubectl rollout status deployment/autos-frontend -n autos
```

### Backend Development Workflow

**Version Increment → Build → Deploy:**

```bash
# 1. Increment version in package.json
cd /home/odin/projects/autos/backend
# Edit package.json: "version": "1.2.6"

# 2. Build image with new version
VERSION=$(node -p "require('./package.json').version")
podman build -t localhost/autos-backend:v${VERSION} .

# 3. Save as tar
podman save -o autos-backend-v${VERSION}.tar localhost/autos-backend:v${VERSION}

# 4. Import to K3s
sudo k3s ctr images import autos-backend-v${VERSION}.tar

# 5. Update deployment manifest
# Edit k8s/backend-deployment.yaml: image: localhost/autos-backend:v1.2.6

# 6. Apply to cluster
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/autos-backend -n autos
```

---

## Development Best Practices

### Container Management

- **Always use `:z` flag** on volume mounts (SELinux systems)
- **Check container status** before execing: `podman ps | grep autos`
- **Clean up stopped containers** regularly: `podman container prune`
- **Use `--rm` flag** for one-off containers (data loader)

### Image Versioning

- **Increment version** in package.json before building backend
- **Tag images semantically:** v1.2.1 (major.minor.patch)
- **Keep tar archives** in backend directory for rollback
- **Verify imports:** Always check `sudo k3s ctr images list` after import
- **Use descriptive tags for frontend:** `:prod`, `:prod-v2`, etc.

### Development Cycle Summary

- **Edit files** (VS Code Remote-SSH to Thor)
- **See changes** (HMR in dev container OR rebuild backend)
- **Test thoroughly** (Dev frontend + K8s backend)
- **Build production** (Only when ready to deploy)
- **Deploy to K8s** (Rolling update, zero downtime)

---

## Documentation

### Structure

```
docs/
├── design/                                    # Design documents
│   ├── milestone-003-base-table-design.md     # BaseDataTable specification
│   └── [future milestones]
├── snapshots/                                 # Point-in-time analysis
│   └── [analysis snapshots]
├── state-management-guide.md                  # State management patterns
└── state-management-refactoring-plan-part1.md # Professional-grade patterns
```

### Key Documents

#### 1. State Management & Component Hydration Guide

**File:** `docs/state-management-guide.md`

**Purpose:** Complete reference for state management patterns and component hydration

**Topics Covered:**

- URL-as-single-source-of-truth architecture
- `RouteStateService` and `StateManagementService` integration
- Component hydration strategies (input-based, idempotent)
- Storage layer separation (URL vs localStorage)
- Data flow patterns
- Implementation examples
- Testing scenarios
- Best practices (DO/DON'T patterns)

**When to Reference:**

- Implementing new components that interact with state
- Adding new table components (especially with Milestone 003)
- Debugging hydration issues
- Code review for state management patterns
- Onboarding new developers

#### 2. State Management Refactoring Plan (Part 1)

**File:** `docs/state-management-refactoring-plan-part1.md`

**Purpose:** Elevate AUTOS to professional/enterprise-grade state management

**Topics Covered:**

- **Phase 1: Loading State Coordination**
  - RequestCoordinatorService (implemented)
  - Request deduplication and caching
  - Retry logic with exponential backoff
- **Phase 2: Error Boundary Pattern** (not yet implemented)
  - Global error handler
  - Centralized error categorization
  - User-friendly notifications
- **Phase 3: Centralized Action Pattern** (not yet implemented)
  - Observable state changes
  - Audit trail
  - Debugging support

**When to Reference:**

- Understanding RequestCoordinatorService usage
- Implementing error handling patterns
- Planning advanced state management features

#### 3. Milestone 003 - Base Table Design

**File:** `docs/design/milestone-003-base-table-design.md`

**Purpose:** Complete design specification for reusable `BaseDataTableComponent`

**Current Status:** **PARTIALLY IMPLEMENTED**

- ✅ BaseDataTableComponent created (~300 lines)
- ✅ TableColumn, TableDataSource, TableQueryParams models
- ✅ TableStatePersistenceService
- ✅ Composition pattern with ng-template slots
- ❌ ColumnManagerComponent (not yet created)
- ❌ VehicleResultsTable migration (not yet started)

**Topics Covered:**

- Problem statement and objectives
- Design decisions (composition, ng-template slots, column visibility)
- Architecture overview
- Component structure and interfaces
- Feature requirements (column reordering, visibility, filtering, sorting, pagination)
- Data models (TableColumn, TableDataSource, TableQueryParams)
- Implementation plan (18 steps across 4 phases)
- Testing strategy
- Migration path for VehicleResultsTableComponent

**Implementation Status:**

- **Phase 1 (Steps 1-5):** ✅ COMPLETE - Foundation created
- **Phase 2 (Steps 6-9):** ✅ COMPLETE - BaseDataTable core features
- **Phase 2 (Step 10):** ❌ TODO - ColumnManagerComponent
- **Phase 3 (Steps 11-15):** ❌ TODO - VehicleResultsTable migration
- **Phase 4 (Steps 16-18):** ❌ TODO - Polish and optimization

**When to Reference:**

- Implementing Milestone 003 remaining work
- Creating new table components
- Understanding table architecture patterns
- Adding features to BaseDataTableComponent

#### 4. Analysis Snapshots

**Directory:** `docs/snapshots/`

**Purpose:** Capture point-in-time analysis and decisions for major milestones

**Content:**

- Problem analysis
- Design exploration
- Decision rationale
- Trade-offs considered
- Implementation notes

**When to Create:**

- After completing a major milestone
- When making significant architectural decisions
- To document lessons learned
- For future reference and onboarding

### Documentation Best Practices

1. **Version Control:** All documentation lives in Git alongside code
2. **Living Documents:** Update docs when implementation deviates from design
3. **Cross-References:** Link related documents (design → implementation → testing)
4. **Snapshots:** Create snapshots at major milestones for historical reference
5. **Keep Current:** Review and update CLAUDE.md with each significant change

---

## Claude Session Guidelines

### Context Management (REQUIRED)

**Context warnings must be included periodically during all sessions.**

**Frequency:**

- Every instruction during step-by-step implementations
- Every 3-5 messages during design/analysis work
- Always when crossing threshold boundaries

**Format:** `Context warning: Approximately X% remaining.`

**Thresholds:**

- **Green (>50%):** Optional mention unless in instruction mode
- **Yellow (30-50%):** Include warning with percentage
- **Orange (20-30%):** Bold warning: "Approaching token limit"
- **Red (<20%):** Critical warning: "⚠️ CRITICAL: Approximately X% remaining."

**Session Start:**
When beginning any implementation or complex task, acknowledge that context tracking is enabled.

---

## Quick Start Commands

### Check Cluster Status

```bash
kubectl get pods -n autos
kubectl get svc -n autos
kubectl logs -n autos deployment/autos-backend --tail=50
kubectl logs -n autos deployment/autos-frontend --tail=50
```

### Restart Services

```bash
kubectl rollout restart deployment/autos-backend -n autos
kubectl rollout restart deployment/autos-frontend -n autos
```

### Access Services

```bash
# Frontend
curl http://autos.minilab

# Backend health
curl http://autos.minilab/api/health

# Backend manufacturer counts
curl http://autos.minilab/api/search/manufacturer-model-counts
```

### Development Container Management

```bash
# Start dev frontend
podman run -d --name autos-frontend-dev -p 4200:4200 \
  -v /home/odin/projects/autos/frontend:/app:z \
  localhost/autos-frontend:dev

# Stop dev frontend
podman stop autos-frontend-dev
podman rm autos-frontend-dev

# View logs
podman logs -f autos-frontend-dev
```

---

## Troubleshooting

### Frontend Not Loading

```bash
# Check pod status
kubectl get pods -n autos

# Check logs
kubectl logs -n autos deployment/autos-frontend

# Common issues:
# 1. Image not imported: sudo k3s ctr images list | grep autos-frontend
# 2. Wrong image tag in deployment
# 3. ConfigMap not applied
```

### Backend API Errors

```bash
# Check backend logs
kubectl logs -n autos deployment/autos-backend --tail=100

# Check Elasticsearch connectivity
kubectl exec -n autos deployment/autos-backend -- \
  curl http://elasticsearch.data.svc.cluster.local:9200/_cluster/health

# Common issues:
# 1. Elasticsearch not running
# 2. Index missing (check logs for "index_not_found_exception")
# 3. Environment variables incorrect
```

### Image Import Issues

```bash
# Verify image exists locally
podman images | grep autos

# Verify import succeeded
sudo k3s ctr images list | grep autos

# Re-import if needed
sudo k3s ctr images import autos-frontend-prod.tar

# Check image name matches deployment
kubectl get deployment autos-frontend -n autos -o yaml | grep image
```

---

## Changelog

### 2025-10-18 (v1.3.0)

- **Updated Milestone 003 status** to reflect partial implementation
  - BaseDataTableComponent: IMPLEMENTED
  - ColumnManagerComponent: NOT IMPLEMENTED
  - VehicleResultsTable migration: NOT STARTED
- **Added RequestCoordinatorService** to architecture overview
- **Updated documentation section** with state-management-refactoring-plan-part1.md reference
- **Added implementation status** tracking for Milestone 003 phases
- **Clarified storage layers** (URL for query state, localStorage for UI preferences)
- **Updated project structure** to show implemented vs not-implemented components

### 2025-10-16 (v1.2.0)

- **Added Documentation section** with complete structure
- Added reference to `docs/state-management-guide.md`
- Added reference to `docs/design/milestone-003-base-table-design.md`
- Added `shared/` module structure to frontend project tree (Milestone 003)
- Added NG-ZORRO UI library to technology stack
- Clarified state management architecture (URL-driven with RxJS)
- Updated Table of Contents to include Documentation section

### 2025-10-14 (v1.1.0)

- **Production frontend deployed** for the first time
- Updated `frontend-deployment.yaml` to use `localhost/autos-frontend:prod`
- Added production frontend build and deployment procedures
- Clarified development vs production workflows
- Added troubleshooting for frontend image issues
- Updated architecture diagrams to reflect production deployment

### 2025-10-13 (v1.0.0)

- Initial document creation
- Backend v1.2.5 documented as current production version
- Frontend development workflow documented
- Data pipeline and API endpoints documented

---

**Last Updated:** 2025-10-18  
**Maintained By:** Claude (with odin)  
**Version:** 1.3.0

---

**END OF AUTOS APPLICATION REFERENCE DOCUMENT**

This document should be read at the start of every new Claude session to ensure rapid understanding and immediate productivity on the AUTOS project.
