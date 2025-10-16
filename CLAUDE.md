# AUTOS Application - Claude Onboarding Reference

**Path:** `/home/odin/projects/autos/CLAUDE.md`  
**Created:** 2025-10-13  
**Updated:** 2025-10-16  
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
    └── state-management-guide.md  # State management reference
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

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                            │
│                 http://autos.minilab                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   TRAEFIK INGRESS                            │
│              (Routes /api and / traffic)                     │
└──────┬───────────────────────────────────────┬───────────────┘
       │                                       │
       │ /api/*                                │ /*
       ▼                                       ▼
┌──────────────────┐         ┌──────────────────┐
│  AUTOS BACKEND   │         │ AUTOS FRONTEND   │
│  Node.js/Express │         │  Angular 14      │
│  Port: 3000      │         │  nginx:alpine    │
│  Replicas: 2     │         │  Port: 80        │
└────────┬─────────┘         │  Replicas: 2     │
         │                   └──────────────────┘
         │ Query/Aggregations
         ▼
┌──────────────────────────────────────────────────────────────┐
│              ELASTICSEARCH PLATFORM SERVICE                   │
│         elasticsearch.data.svc.cluster.local:9200            │
│         Index: autos-unified                                 │
│         NodePort: thor:30398 (external access)               │
└──────────────────────────────────────────────────────────────┘
```

### Application Flow

**1. Picker Stage (Manufacturer-Model Selection)**
```
User opens http://autos.minilab
  ↓
Frontend loads manufacturer-model-table-picker component
  ↓
GET /api/v1/manufacturer-model-combinations?page=1&size=50
  ↓
Backend queries Elasticsearch (aggregation)
  ↓
Returns: { manufacturers: [ { manufacturer, count, models: [...] } ] }
  ↓
Table displays: Manufacturer | Model | Count
  ↓
User selects: Ford:F-150, Dodge:Charger
```

**2. Results Stage (Vehicle Specifications)**
```
User clicks "Search" with selected models
  ↓
GET /api/v1/vehicles/details?models=Ford:F-150,Dodge:Charger&page=1
  ↓
Backend queries Elasticsearch (filtered search)
  ↓
Returns: { results: [ { vehicle_id, manufacturer, model, year, ... } ] }
  ↓
vehicle-results-table displays paginated results
```

**3. VIN Expansion Stage (Synthetic Instance Data)**
```
User clicks row: nhtsa-ford-f150-1967
  ↓
GET /api/v1/vehicles/nhtsa-ford-f150-1967/instances?count=8
  ↓
Backend:
  1. Fetches vehicle spec from Elasticsearch
  2. Calls VINGenerator.generateInstances(vehicleData, 8)
  3. Deterministically generates 8 synthetic VINs
  ↓
Returns: { instances: [ { vin, condition, mileage, value, ... } ] }
  ↓
Expanded row shows 8 VIN-level records with details
```

---

## Container Images

### Image Naming Convention
```
localhost/autos-backend:v1.2.5     # Backend API (current production)
localhost/autos-frontend:dev       # Frontend development (Node.js + ng serve)
localhost/autos-frontend:prod      # Frontend production (nginx) - DEPLOYED
localhost/autos-data-loader:latest # Data loading scripts
```

### Current Production Images

**Backend:**
- **Image:** `localhost/autos-backend:v1.2.5`
- **Base:** `node:18-alpine`
- **Purpose:** Express.js API server
- **Status:** ✅ Deployed and operational

**Frontend:**
- **Image:** `localhost/autos-frontend:prod`
- **Base:** Multi-stage (node:18-alpine → nginx:alpine)
- **Purpose:** Compiled Angular app served by nginx
- **Status:** ✅ Deployed and operational (as of 2025-10-14)

### Image Storage
- **Podman:** User-level image store (rootless)
- **K3s:** `/var/lib/rancher/k3s/agent/containerd/` (requires sudo)
- **Archives:** `/home/odin/projects/autos/backend/*.tar` (version history)

---

## Data Pipeline

### Elasticsearch Index: autos-unified

**Schema Overview:**
```json
{
  "vehicle_id": "keyword",           // Unique ID: nhtsa-ford-mustang-1967
  "manufacturer": "text + keyword",  // Ford, Chevrolet, etc.
  "model": "text + keyword",         // Mustang, Corvette, etc.
  "year": "integer",                 // 1950-2025
  "body_style": "keyword",           // Coupe, Sedan, Pickup
  "body_class": "keyword",           // Sports Car, Truck, etc.
  "vin": "keyword",                  // (NOT STORED - generated on-demand)
  "engine_type": "keyword",
  "engine_cylinders": "integer",
  "engine_displacement_l": "float",
  "transmission_type": "keyword",
  "drive_type": "keyword",
  "data_source": "keyword",          // nhtsa_vpic_sample, etc.
  "ingested_at": "date"
}
```

### Data Loading Scripts

**Location:** `/home/odin/projects/autos/data/scripts/`

**Script Execution Order:**
```bash
# 1. Create index (ALWAYS FIRST)
python3 create_autos_index.py

# 2. Load data (CHOOSE ONE):
python3 load_sample_data.py           # ~60 vehicles (6 mfr × 10 models)
python3 load_large_sample_data.py     # ~2,000 vehicles (20 mfr × 100 models)
python3 load_full_data_v2.py          # ~5,000 vehicles (23 mfr, all models, 15-30 min)
python3 load_full_data.py             # ~20,000 vehicles (23 mfr × years 1981-2025, 45-90 min)

# If resetting:
python3 reset_index.py                # Deletes index (prompts confirmation)
# Then re-run create_autos_index.py + loader
```

**Data Sources:**
- NHTSA vPIC API: https://vpic.nhtsa.dot.gov/api/
- Focus: American manufacturers (Big Three + historic brands)
- Years: 1950-2025 (pre-1981 = synthetic years, 1981+ = actual years)

### Data Loading Container

**Build and run data loader:**
```bash
# Navigate to scripts directory
cd /home/odin/projects/autos/data/scripts

# Build container
podman build -t localhost/autos-data-loader:latest .

# Run interactive container
podman run -it --rm \
  --name autos-data-loader \
  --network host \
  -v /home/odin/projects/autos/data/scripts:/app:z \
  localhost/autos-data-loader:latest

# Inside container, run scripts:
python3 create_autos_index.py
python3 load_sample_data.py
exit
```

**Requirements:**
- Python 3.11-slim
- elasticsearch==8.11.0
- requests==2.31.0
- python-dateutil==2.8.2

---

## Backend API

### Technology Stack
```yaml
Runtime: Node.js 18 (Alpine)
Framework: Express.js 4.18.2
Elasticsearch Client: @elastic/elasticsearch 8.11.0
CORS: Enabled for frontend
Port: 3000
Health Check: /health
```

### API Endpoints

#### 1. Manufacturer-Model Combinations (Picker Data)
```http
GET /api/v1/manufacturer-model-combinations
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `size` (default: 50, max: 100) - Results per page
- `search` (optional) - Search manufacturer/model/body_class
- `manufacturer` (optional) - Filter by specific manufacturer

**Response:**
```json
{
  "total": 23,
  "page": 1,
  "size": 50,
  "totalPages": 1,
  "data": [
    {
      "manufacturer": "Ford",
      "count": 450,
      "models": [
        { "model": "F-150", "count": 45 },
        { "model": "Mustang", "count": 38 }
      ]
    }
  ]
}
```

#### 2. Vehicle Details (Results Table Data)
```http
GET /api/v1/vehicles/details
```

**Query Parameters:**
- `models` (required) - Comma-separated `Manufacturer:Model` pairs
  - Example: `Ford:F-150,Chevrolet:Corvette,Dodge:Charger`
- `page` (default: 1) - Page number
- `size` (default: 20, max: 100) - Results per page

**Response:**
```json
{
  "total": 127,
  "page": 1,
  "size": 20,
  "totalPages": 7,
  "query": {
    "modelCombos": [
      { "manufacturer": "Ford", "model": "F-150" }
    ]
  },
  "results": [
    {
      "vehicle_id": "nhtsa-ford-f150-1967",
      "manufacturer": "Ford",
      "model": "F-150",
      "year": 1967,
      "body_class": "Pickup Truck",
      "data_source": "nhtsa_vpic_sample"
    }
  ]
}
```

#### 3. Vehicle Instances (VIN-Level Data)
```http
GET /api/v1/vehicles/:vehicleId/instances
```

**Path Parameters:**
- `vehicleId` (required) - Vehicle specification ID (e.g., `nhtsa-ford-mustang-1967`)

**Query Parameters:**
- `count` (default: 8, max: 20) - Number of VIN instances to generate

**Response:**
```json
{
  "vehicle_id": "nhtsa-ford-mustang-1967",
  "manufacturer": "Ford",
  "model": "Mustang",
  "year": 1967,
  "body_class": "Coupe",
  "instance_count": 8,
  "instances": [
    {
      "vin": "7R01C123456",
      "condition_rating": 4,
      "condition_description": "Excellent",
      "mileage": 45230,
      "mileage_verified": true,
      "registered_state": "CA",
      "registration_status": "Historic",
      "title_status": "Clean",
      "exterior_color": "Wimbledon White",
      "factory_options": ["Power Steering", "GT Equipment Group"],
      "estimated_value": 72500,
      "matching_numbers": true,
      "last_service_date": "2024-08-15"
    }
  ]
}
```

#### 4. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "autos-backend",
  "timestamp": "2025-10-13T14:30:00.000Z"
}
```

### VIN Generation Logic

**File:** `/home/odin/projects/autos/backend/src/utils/vinGenerator.js`

**Key Features:**
- **Deterministic:** Same `vehicle_id` always generates same VIN set
- **Seeded Random:** Uses hash of `vehicle_id` as seed for consistency
- **Pre-1981 VINs:** 7-character manufacturer-specific format (e.g., `7R01C123456`)
- **Post-1981 VINs:** 17-character ISO standard format (e.g., `1FABP40E9YF123456`)
- **Correlated Attributes:**
  - Mileage: Age-based calculation (5k-12k miles/year with variance)
  - Condition: Realistic distribution (5% Concours, 20% Excellent, 55% Good, etc.)
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
│   │   │       └── state-management.service.ts
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
│   │       │   └── base-data-table/               # [NEW]
│   │       ├── models/
│   │       │   ├── table-column.model.ts          # [NEW]
│   │       │   ├── table-data-source.model.ts     # [NEW]
│   │       │   └── table-query-params.model.ts    # [NEW]
│   │       └── services/
│   │           └── table-state-persistence.service.ts  # [NEW]
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
    │   │   ├── Displays aggregated manufacturer-model combinations
    │   │   ├── Multi-select table (checkbox or click)
    │   │   └── Emits selected models array
    │   └── VehicleResultsTableComponent
    │       ├── Receives selected models from picker
    │       ├── Displays paginated vehicle specifications
    │       └── Expandable rows show VIN instances (on-click)
    └── WorkshopComponent (experimental layout)
        ├── KTD Grid Layout (draggable panels)
        ├── ManufacturerModelTablePickerComponent (in panel)
        └── VehicleResultsTableComponent (in panel)
```

### State Management Architecture

**Pattern:** URL as Single Source of Truth

```
URL Query Params ←→ StateManagementService ←→ Components
     (storage)           (orchestrator)         (UI)
```

**Key Services:**
- `RouteStateService`: Parse/update URL query parameters
- `StateManagementService`: Manage application state, sync with URL

**See:** `docs/state-management-guide.md` for complete reference

### Development Container (Dockerfile.dev)

**Purpose:** Hot Module Reloading (HMR) for rapid frontend development

**Base Image:** `node:18-alpine`

**Container Design:**
- Long-running container with `tail -f /dev/null` (does not auto-start ng serve)
- Exec into container to manually run `npm start`
- Volume mount: `/home/odin/projects/autos/frontend` → `/app` (with `:z` for SELinux)
- Network: `--network host` (access backend at localhost:3000)
- Port: 4200 (Angular dev server)

**Why This Design?**
- Flexibility to run different commands (ng test, ng build, npm install)
- See compilation output in terminal (not hidden in logs)
- Multiple exec sessions possible
- Easy restart without recreating container

### Production Container (Dockerfile.prod)

**Purpose:** Optimized static file serving for production deployment

**Base Image:** `nginx:alpine`

**Multi-Stage Build:**
```dockerfile
# Stage 1: Build Angular app
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/autos /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx Configuration (nginx.conf):**
```nginx
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;  # SPA routing
  }
  location /api {
    proxy_pass http://autos-backend.autos.svc.cluster.local:3000;
  }
}
```

---

## Development Workflows

### Frontend Development Workflow

**1. Start the Dev Container**

```bash
# On Thor
cd /home/odin/projects/autos/frontend

# Start long-running container (detached)
podman run -d \
  --name autos-frontend-dev \
  --network host \
  -v /home/odin/projects/autos/frontend:/app:z \
  -w /app \
  localhost/autos-frontend:dev
```

**2. Start Angular Dev Server**

```bash
# Exec into running container
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200
```

**Expected Output:**
```
✔ Browser application bundle generation complete.
** Angular Live Development Server is listening on 0.0.0.0:4200 **
✔ Compiled successfully.
```

**Access:** http://localhost:4200 or http://thor:4200

**3. Edit Files in VS Code**

```bash
# On Windows workstation
# Connect to Thor via Remote-SSH
# Edit files in: /home/odin/projects/autos/frontend/src/

# Watch terminal for automatic recompilation on save
```

**4. Stop Dev Server**

```
# In terminal where ng serve is running
Ctrl+C

# Container remains running, can restart ng serve anytime
```

**5. Cleanup (End of Session)**

```bash
# Stop and remove container
podman stop autos-frontend-dev
podman rm autos-frontend-dev
```

### Backend Development Workflow

**1. Edit Backend Code**

```bash
# On Thor (or via VS Code Remote-SSH)
cd /home/odin/projects/autos/backend/src

# Make changes to:
# - controllers/vehicleController.js
# - services/elasticsearchService.js
# - routes/vehicleRoutes.js
# - utils/vinGenerator.js
```

**2. Build New Backend Image**

```bash
cd /home/odin/projects/autos/backend

# Increment version in package.json (e.g., 1.2.5 → 1.2.6)
# Or keep same version for testing

# Build with Podman
podman build -t localhost/autos-backend:v1.2.6 .
```

**3. Export Image**

```bash
# Export to tar file
podman save localhost/autos-backend:v1.2.6 -o autos-backend-v1.2.6.tar
```

**4. Import to K3s**

```bash
# Import into K3s containerd
sudo k3s ctr images import autos-backend-v1.2.6.tar

# Verify import
sudo k3s ctr images list | grep autos-backend
```

**5. Update Deployment**

```bash
cd /home/odin/projects/autos/k8s

# Edit backend-deployment.yaml
# Change: image: localhost/autos-backend:v1.2.6

# Apply changes
kubectl apply -f backend-deployment.yaml

# Watch rollout
kubectl rollout status deployment/autos-backend -n autos

# Check new pods
kubectl get pods -n autos | grep backend
```

**6. Test Changes**

```bash
# Check logs
kubectl logs -n autos deployment/autos-backend --tail=50

# Test API endpoint
curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=5

# Test from frontend (if running)
# Open http://localhost:4200 in browser
```

### Data Management Workflow

**Load Sample Data for Testing:**

```bash
cd /home/odin/projects/autos/data/scripts

# Start data loader container
podman run -it --rm \
  --name autos-data-loader \
  --network host \
  -v /home/odin/projects/autos/data/scripts:/app:z \
  localhost/autos-data-loader:latest

# Inside container:
python3 create_autos_index.py
python3 load_sample_data.py
exit
```

**Reset and Reload Data:**

```bash
# Same container as above
python3 reset_index.py         # Prompts confirmation
python3 create_autos_index.py
python3 load_large_sample_data.py
exit
```

**Verify Data in Elasticsearch:**

```bash
# Check document count
curl -s http://thor:30398/autos-unified/_count | jq

# Sample documents
curl -s http://thor:30398/autos-unified/_search?size=3 | jq '.hits.hits[]._source'

# Manufacturer aggregation
curl -s -X POST http://thor:30398/autos-unified/_search \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "aggs": {
      "manufacturers": {
        "terms": {"field": "manufacturer.keyword", "size": 10}
      }
    }
  }' | jq '.aggregations'
```

---

## Deployment Procedures

### Initial Deployment (From Scratch)

**Prerequisites:**
- Elasticsearch platform service running in `data` namespace
- `autos` namespace created
- Ingress controller (Traefik) operational

**Step 1: Prepare Data**

```bash
# Load vehicle data into Elasticsearch
cd /home/odin/projects/autos/data/scripts

podman run -it --rm \
  --name autos-data-loader \
  --network host \
  -v /home/odin/projects/autos/data/scripts:/app:z \
  localhost/autos-data-loader:latest

# Inside container:
python3 create_autos_index.py
python3 load_large_sample_data.py  # Or load_full_data_v2.py
exit

# Verify data
curl -s http://thor:30398/autos-unified/_count | jq
```

**Step 2: Build Backend Image**

```bash
cd /home/odin/projects/autos/backend

# Build image
podman build -t localhost/autos-backend:v1.2.5 .

# Export
podman save localhost/autos-backend:v1.2.5 -o autos-backend-v1.2.5.tar

# Import to K3s
sudo k3s ctr images import autos-backend-v1.2.5.tar

# Verify
sudo k3s ctr images list | grep autos-backend
```

**Step 3: Build Frontend Image**

```bash
cd /home/odin/projects/autos/frontend

# Build production image
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .

# Export
podman save localhost/autos-frontend:prod -o autos-frontend-prod.tar

# Import to K3s
sudo k3s ctr images import autos-frontend-prod.tar

# Verify
sudo k3s ctr images list | grep autos-frontend
```

**Step 4: Deploy to Kubernetes**

```bash
cd /home/odin/projects/autos/k8s

# Deploy in order
kubectl apply -f namespace.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f ingress.yaml

# Verify deployments
kubectl get all -n autos

# Expected output:
# NAME                                 READY   STATUS    RESTARTS   AGE
# pod/autos-backend-xxxxx-xxxxx        1/1     Running   0          30s
# pod/autos-backend-xxxxx-yyyyy        1/1     Running   0          30s
# pod/autos-frontend-xxxxx-xxxxx       1/1     Running   0          25s
# pod/autos-frontend-xxxxx-yyyyy       1/1     Running   0          25s
```

**Step 5: Verify Application**

```bash
# Check backend health
curl http://autos.minilab/api/health

# Test picker endpoint
curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=3 | jq

# Access frontend
firefox http://autos.minilab
```

**Step 6: Add DNS Entry (if needed)**

```bash
# On Thor (and other nodes if needed)
sudo nano /etc/hosts

# Add line:
192.168.0.244 autos.minilab

# Save and test
ping autos.minilab
```

### Update Deployment (Backend Changes)

```bash
# 1. Build new backend version
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.2.6 .
podman save localhost/autos-backend:v1.2.6 -o autos-backend-v1.2.6.tar
sudo k3s ctr images import autos-backend-v1.2.6.tar

# 2. Update deployment
cd /home/odin/projects/autos/k8s
# Edit backend-deployment.yaml: image: localhost/autos-backend:v1.2.6
kubectl apply -f backend-deployment.yaml

# 3. Watch rollout
kubectl rollout status deployment/autos-backend -n autos

# 4. Verify
kubectl get pods -n autos
curl http://autos.minilab/api/health
```

### Update Deployment (Frontend Changes)

**After completing dev work in dev container:**

```bash
# 1. Build new production image
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod-v2 .
podman save localhost/autos-frontend:prod-v2 -o autos-frontend-prod-v2.tar
sudo k3s ctr images import autos-frontend-prod-v2.tar

# 2. Update deployment
cd /home/odin/projects/autos/k8s
# Edit frontend-deployment.yaml: image: localhost/autos-frontend:prod-v2
kubectl apply -f frontend-deployment.yaml

# 3. Watch rollout
kubectl rollout status deployment/autos-frontend -n autos

# 4. Verify
kubectl get pods -n autos
firefox http://autos.minilab
```

---

## Quick Start Commands

### Daily Development Session

```bash
# 1. Verify backend is running
kubectl get pods -n autos | grep backend

# 2. Start frontend dev container
cd /home/odin/projects/autos/frontend
podman run -d --name autos-frontend-dev --network host \
  -v /home/odin/projects/autos/frontend:/app:z -w /app \
  localhost/autos-frontend:dev

# 3. Start Angular dev server
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200

# 4. Open VS Code Remote-SSH to Thor
# Edit files in /home/odin/projects/autos/frontend/src/

# 5. Access application
# http://localhost:4200 (frontend dev)
# http://autos.minilab (production)
```

### Backend Code Change

```bash
# Edit → Build → Export → Import → Deploy → Verify
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.2.X .
podman save localhost/autos-backend:v1.2.X -o autos-backend-v1.2.X.tar
sudo k3s ctr images import autos-backend-v1.2.X.tar
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/autos-backend -n autos
curl http://autos.minilab/api/health
```

### Frontend Code Change (Production Deployment)

```bash
# Edit → Build → Export → Import → Deploy → Verify
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod-vX .
podman save localhost/autos-frontend:prod-vX -o autos-frontend-prod-vX.tar
sudo k3s ctr images import autos-frontend-prod-vX.tar
# Edit k8s/frontend-deployment.yaml to update image tag
kubectl apply -f k8s/frontend-deployment.yaml
kubectl rollout status deployment/autos-frontend -n autos
```

### Reload Data

```bash
cd /home/odin/projects/autos/data/scripts
podman run -it --rm --name autos-data-loader --network host \
  -v /home/odin/projects/autos/data/scripts:/app:z \
  localhost/autos-data-loader:latest

# Inside container:
python3 reset_index.py
python3 create_autos_index.py
python3 load_sample_data.py
exit
```

### Check Application Status

```bash
# Pods
kubectl get pods -n autos

# Services
kubectl get svc -n autos

# Ingress
kubectl get ingress -n autos

# Logs (last 50 lines)
kubectl logs -n autos deployment/autos-backend --tail=50
kubectl logs -n autos deployment/autos-frontend --tail=50

# Elasticsearch data count
curl -s http://thor:30398/autos-unified/_count | jq

# API test
curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=1 | jq
```

---

## Troubleshooting

### Issue: Frontend Pods Not Starting After Reboot

**Symptom:**
```bash
kubectl get pods -n autos
# autos-frontend-xxxxx   0/1   ErrImageNeverPull   0   5m
```

**Cause:** Frontend production image not present in K3s after reboot

**Solution:**
```bash
# Check if image exists
sudo k3s ctr images list | grep autos-frontend

# If missing, rebuild and import
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .
podman save localhost/autos-frontend:prod -o autos-frontend-prod.tar
sudo k3s ctr images import autos-frontend-prod.tar

# Restart deployment
kubectl rollout restart deployment/autos-frontend -n autos
```

### Issue: Frontend Dev Container Exits Immediately

**Symptom:**
```bash
podman ps | grep autos-frontend-dev
# No output - container not running
```

**Diagnosis:**
```bash
podman ps -a | grep autos-frontend-dev
# STATUS: Exited (0) 5 seconds ago

podman logs autos-frontend-dev
# Shows container started but no errors
```

**Cause:** The dev container uses `CMD ["tail", "-f", "/dev/null"]` to stay alive. If this command isn't running, container exits.

**Solution:**
```bash
# Remove dead container
podman rm autos-frontend-dev

# Restart with correct image
podman run -d --name autos-frontend-dev --network host \
  -v /home/odin/projects/autos/frontend:/app:z -w /app \
  localhost/autos-frontend:dev

# Verify it's running
podman ps | grep autos-frontend-dev
```

### Issue: Permission Denied on Volume Mount

**Symptom:**
```bash
podman exec -it autos-frontend-dev npm start
# Error: EACCES: permission denied, open '/app/package.json'
```

**Cause:** SELinux context issue with volume mount (missing `:z` flag)

**Solution:**
```bash
# Stop container
podman stop autos-frontend-dev
podman rm autos-frontend-dev

# Restart with :z flag
podman run -d --name autos-frontend-dev --network host \
  -v /home/odin/projects/autos/frontend:/app:z \  # Note the :z
  -w /app \
  localhost/autos-frontend:dev
```

### Issue: Backend Cannot Connect to Elasticsearch

**Symptom:**
```bash
kubectl logs -n autos deployment/autos-backend --tail=20
# ✗ Elasticsearch connection failed: connect ECONNREFUSED
```

**Diagnosis:**
```bash
# Check if Elasticsearch is running
kubectl get pods -n data | grep elasticsearch

# Check if service exists
kubectl get svc -n data elasticsearch

# Test connectivity from backend pod
kubectl exec -n autos deployment/autos-backend -- \
  curl -s http://elasticsearch.data.svc.cluster.local:9200/_cluster/health
```

**Solution:**
```bash
# If Elasticsearch is down, restart it
kubectl rollout restart deployment/elasticsearch -n data

# If service doesn't exist, check deployment
kubectl get all -n data

# Verify DNS resolution
kubectl exec -n autos deployment/autos-backend -- \
  nslookup elasticsearch.data.svc.cluster.local
```

### Issue: No Data in Elasticsearch Index

**Symptom:**
```bash
curl http://thor:30398/autos-unified/_count
# {"count":0}
```

**Diagnosis:**
```bash
# Check if index exists
curl http://thor:30398/autos-unified

# If error 404, index doesn't exist
# If exists but empty, data wasn't loaded
```

**Solution:**
```bash
# Reload data
cd /home/odin/projects/autos/data/scripts

podman run -it --rm --name autos-data-loader --network host \
  -v /home/odin/projects/autos/data/scripts:/app:z \
  localhost/autos-data-loader:latest

# Inside container:
python3 create_autos_index.py  # Creates index if missing
python3 load_sample_data.py    # Loads data
exit

# Verify
curl http://thor:30398/autos-unified/_count
```

### Issue: Pod ImagePullBackOff

**Symptom:**
```bash
kubectl get pods -n autos
# autos-backend-xxxxx-xxxxx   0/1   ImagePullBackOff   0   2m
```

**Cause:** Image not imported to K3s containerd

**Solution:**
```bash
# Check if image exists in K3s
sudo k3s ctr images list | grep autos-backend

# If missing, import it
cd /home/odin/projects/autos/backend
sudo k3s ctr images import autos-backend-v1.2.5.tar

# Verify import
sudo k3s ctr images list | grep autos-backend

# Restart deployment
kubectl rollout restart deployment/autos-backend -n autos
```

### Issue: Frontend Shows "Cannot GET /api/v1/..."

**Symptom:**
Browser console shows:
```
GET http://localhost:4200/api/v1/manufacturer-model-combinations 404 Not Found
```

**Cause 1:** Dev frontend trying to call backend at wrong URL

**Solution:**
```bash
# Check environment.ts
cat /home/odin/projects/autos/frontend/src/environments/environment.ts

# Should contain:
# apiUrl: 'http://localhost:3000/api/v1'

# If incorrect, edit and save (HMR will reload)
```

**Cause 2:** Backend not running

**Solution:**
```bash
# Check backend pods
kubectl get pods -n autos | grep backend

# If not running, check deployment
kubectl describe deployment autos-backend -n autos

# Check backend logs
kubectl logs -n autos deployment/autos-backend --tail=50
```

### Issue: VIN Data Not Appearing in Expanded Row

**Symptom:**
- Click vehicle row in results table
- Row expands but shows no VIN data or error

**Diagnosis:**
```bash
# Check browser console for API errors
# Check backend logs
kubectl logs -n autos deployment/autos-backend --tail=50 | grep instances

# Test endpoint directly
curl "http://autos.minilab/api/v1/vehicles/nhtsa-ford-mustang-1967/instances?count=3"
```

**Possible Causes:**
1. Vehicle ID not found in Elasticsearch
2. VIN generator error
3. Frontend not parsing response

**Solution:**
```bash
# Verify vehicle exists
curl -X GET "http://thor:30398/autos-unified/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"term": {"vehicle_id": "nhtsa-ford-mustang-1967"}}}'

# If not found, reload data
# If found, check backend logs for VIN generator errors
```

---

## Documentation

### Project Documentation Structure

```
docs/
├── design/                              # Design documents
│   ├── milestone-001-design.md         # (Example - not yet created)
│   ├── milestone-002-design.md         # (Example - not yet created)
│   └── milestone-003-base-table-design.md  # Reusable table component design
├── snapshots/                           # Analysis snapshots
│   ├── analysis-001.md                 # (Example - not yet created)
│   └── analysis-002.md                 # Previous milestone context
└── state-management-guide.md            # State management & hydration reference
```

### Key Documentation Files

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

#### 2. Milestone 003 - Base Table Design
**File:** `docs/design/milestone-003-base-table-design.md`

**Purpose:** Complete design specification for reusable `BaseDataTableComponent`

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

**When to Reference:**
- Implementing Milestone 003
- Creating new table components
- Understanding table architecture patterns
- Adding features to BaseDataTableComponent

#### 3. Analysis Snapshots
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

### Kubernetes Deployments
- **Watch rollouts:** Use `kubectl rollout status` to ensure success
- **Check logs immediately** after deployment
- **Test health endpoint** before considering deployment complete
- **Use nodeSelector** if images are node-specific
- **Verify image exists in K3s** before updating deployment

### Data Management
- **Start with sample data** during development (60 records loads in seconds)
- **Use large sample** for realistic testing (2,000 records)
- **Load full data** only when needed (20,000 records takes 45-90 minutes)
- **Always verify count** after loading: `curl http://thor:30398/autos-unified/_count`

### Frontend Development
- **Keep dev container running** across multiple edit sessions
- **Stop ng serve with Ctrl+C** (not `podman stop`)
- **Watch terminal** for compilation errors on save
- **Test in both dev and prod** modes before declaring feature complete
- **Build production image** only after dev work is complete

### Backend Development
- **Test changes locally** before deploying to K8s
- **Use descriptive commit messages** in tar archive names
- **Keep old versions** for quick rollback if needed
- **Update deployment.yaml version** before applying

---

## Critical Reminders

### Architecture Patterns
1. **Backend is ALWAYS rebuilt** and deployed to K8s for testing
2. **Frontend dev uses long-running container** + exec for HMR
3. **Frontend prod is multi-stage build** (compile with Node.js, serve with nginx)
4. **VINs are NEVER stored** - always generated on-demand
5. **Data loads run in containers** - no host Python installations

### Production vs Development
- **Development:** Use `:dev` image with volume mounts and ng serve
- **Production:** Use `:prod` image with compiled Angular + nginx
- **Never deploy `:dev` to Kubernetes** - it's not designed for serving

### Podman vs K3s Images
- **Separate stores:** Podman and K3s don't share images
- **Must export/import:** Always use tar files to transfer
- **Verify imports:** Check both stores separately
- **Tag correctly:** `:dev` for development, `:prod` or version for production

### Elasticsearch Integration
- **Shared platform service:** Uses existing data namespace service
- **Dedicated index:** `autos-unified` is application-specific
- **NodePort access:** `thor:30398` for external/dev access
- **K8s DNS:** `elasticsearch.data.svc.cluster.local:9200` from pods

### Development Flow
1. **Edit files** (VS Code Remote-SSH to Thor)
2. **See changes** (HMR in dev container OR rebuild backend)
3. **Test thoroughly** (Dev frontend + K8s backend)
4. **Build production** (Only when ready to deploy)
5. **Deploy to K8s** (Rolling update, zero downtime)

---

## Changelog

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

**Last Updated:** 2025-10-16  
**Maintained By:** Claude (with odin)  
**Version:** 1.2.0

---

**END OF AUTOS APPLICATION REFERENCE DOCUMENT**

This document should be read at the start of every new Claude session to ensure rapid understanding and immediate productivity on the AUTOS project.
