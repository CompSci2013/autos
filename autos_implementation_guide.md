# AUTOS Implementation Guide

**Project:** AUTOS - Automotive Vehicle Database and Picker  
**Created:** 2025-10-11  
**Purpose:** Comprehensive implementation guide with GitLab integration  
**Prerequisites:** Elasticsearch platform service running at `http://thor:30398`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Pattern](#architecture-pattern)
3. [Implementation Phases](#implementation-phases)
4. [GitLab Integration](#gitlab-integration)
5. [Development Workflow](#development-workflow)
6. [Verification Commands](#verification-commands)
7. [Common Pitfalls](#common-pitfalls)

---

## Project Overview

### AUTOS MVP Scope

**Core Features:**
- Manufacturer-Model picker component (adapting Transportation Portal's manufacturer-state pattern)
- Backend API serving vehicle combinations from Elasticsearch
- Angular 14 frontend with NG-ZORRO picker table
- Sample NHTSA vehicle data for testing

**NOT in MVP:**
- Full search results display
- "About X" vehicle history pages
- Goggles view-switching system
- Complete NHTSA dataset processing

### Current State Verification

**Before Starting, Verify:**

```bash
# 1. Elasticsearch is Running
curl -s http://thor:30398 | jq

# Expected: "tagline": "You Know, for Search"

# 2. No AUTOS Index Exists Yet
curl -s http://thor:30398/_cat/indices | grep autos

# Expected: (empty - no results)

# 3. Project Directory Structure
ls -la /home/odin/projects/autos/

# Expected: backend/, frontend/, k8s/, docs/, data/
```

---

## Architecture Pattern

### Following Transportation Portal Model

```
Development Flow:
1. Python ETL Container (Podman) → Create index + Load data
2. Node.js Backend Container (Podman) → API development
3. Angular Frontend Container (Podman) → UI development
4. Export containers → Import to K3s → Deploy to Kubernetes

Production Deployment:
- Namespace: autos
- Backend: Node.js + Express + Elasticsearch client
- Frontend: Angular 14 + nginx
- Data Store: Elasticsearch platform service (data namespace)
```

### Critical: Halo Labs Minimal Footprint Policy

**NEVER DO THIS:**
```bash
# ❌ WRONG - Installing packages on host
sudo apt install python3-elasticsearch
pip3 install elasticsearch
npm install -g @angular/cli
```

**ALWAYS DO THIS:**
```bash
# ✅ CORRECT - Everything in containers
podman build -t localhost/autos-etl:dev .
podman run -it --rm --network host \
  -v /home/odin/projects/autos:/app:z \
  localhost/autos-etl:dev

# Inside container, packages are available
python3 create_index.py
```

**Why:** Thor and Loki are kept minimal - no dev tools on host systems. All work happens in containers.

---

## Implementation Phases

### Phase 1: Data Foundation ⬅️ START HERE

**Goal:** Create Elasticsearch index and load sample NHTSA data

**Duration:** 2-3 days

**Steps:**
1. Create Python ETL container (Dockerfile)
2. Build container with Podman
3. Run index creation script inside container
4. Fetch sample NHTSA data (10-100 vehicles)
5. Load data into Elasticsearch
6. Verify data with queries

**Container Pattern:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["/bin/bash"]
```

**Build and Run:**
```bash
cd /home/odin/projects/autos/data/scripts
podman build -t localhost/autos-etl:dev .
podman run -it --rm --name autos-etl-dev --network host \
  -v /home/odin/projects/autos/data:/app:z \
  localhost/autos-etl:dev

# Inside container:
python3 create_autos_index.py
python3 load_sample_data.py
```

**Success Criteria:**
- ✅ `autos-unified` index exists in Elasticsearch (GREEN status)
- ✅ 50-100 sample vehicle records loaded
- ✅ Aggregation query returns manufacturer-model combinations
- ✅ Sample queries return valid vehicle data

---

### Phase 2: Backend API

**Goal:** Node.js REST API serving manufacturer-model combinations

**Duration:** 3-4 days

**Reference Implementation:** Transportation Portal backend pattern

**Key Files:**
```
backend/
├── src/
│   ├── index.js                    # Express server entry
│   ├── routes/
│   │   └── vehicleRoutes.js        # GET /api/v1/manufacturer-model-combinations
│   ├── controllers/
│   │   └── vehicleController.js    # Request handlers
│   └── services/
│       └── elasticsearchService.js # ES aggregation queries
├── Dockerfile
├── Dockerfile.prod
└── package.json
```

**Container Build:**
```bash
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.0.0 .
podman save localhost/autos-backend:v1.0.0 -o autos-backend-v1.0.0.tar
sudo k3s ctr images import autos-backend-v1.0.0.tar
```

**Success Criteria:**
- ✅ Backend API deployed to Kubernetes (2/2 replicas running)
- ✅ `/api/v1/manufacturer-model-combinations` endpoint returns data
- ✅ Elasticsearch connection working from backend pods
- ✅ Health check endpoint responding

---

### Phase 3: Frontend Application

**Goal:** Angular 14 + NG-ZORRO picker table

**Duration:** 4-5 days

**Reference Implementation:** Transportation Portal manufacturer-state-table-picker component

**Key Components:**
```
frontend/src/app/
├── features/
│   └── picker/
│       ├── manufacturer-model-table-picker.component.ts
│       ├── manufacturer-model-table-picker.component.html
│       └── manufacturer-model-table-picker.component.scss
├── core/
│   └── services/
│       ├── api.service.ts
│       ├── state-management.service.ts
│       └── route-state.service.ts
└── models/
    └── vehicle.model.ts
```

**Container Build:**
```bash
cd /home/odin/projects/autos/frontend
podman build -t localhost/autos-frontend:v1.0.0 .
podman save localhost/autos-frontend:v1.0.0 -o autos-frontend-v1.0.0.tar
sudo k3s ctr images import autos-frontend-v1.0.0.tar
```

**Success Criteria:**
- ✅ Frontend deployed to Kubernetes (2/2 replicas running)
- ✅ Picker table displays manufacturer-model combinations
- ✅ Checkbox selection works (parent + child hierarchy)
- ✅ Apply button sends selected combinations to backend

---

### Phase 4: Kubernetes Deployment

**Goal:** Full production deployment

**Duration:** 2 days

**Namespace:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: autos
  labels:
    name: autos
    tier: application
```

**Backend Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: autos-backend
  namespace: autos
spec:
  replicas: 2
  selector:
    matchLabels:
      app: autos-backend
  template:
    metadata:
      labels:
        app: autos-backend
    spec:
      containers:
      - name: backend
        image: localhost/autos-backend:v1.0.0
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
        env:
        - name: ELASTICSEARCH_URL
          value: "http://elasticsearch.data.svc.cluster.local:9200"
        - name: ELASTICSEARCH_INDEX
          value: "autos-unified"
```

**Ingress Configuration:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: autos
  namespace: autos
spec:
  ingressClassName: traefik
  rules:
  - host: autos.minilab
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: autos-frontend
            port:
              number: 80
```

**Success Criteria:**
- ✅ User can access http://autos.minilab
- ✅ Picker table loads with real NHTSA data
- ✅ User can select manufacturers and models
- ✅ Selection state persists in UI
- ✅ All components running in Kubernetes

---

## GitLab Integration

### Repository Configuration

**GitLab Repository:**
- **URL:** http://gitlab.minilab/halo/autos
- **Group:** halo
- **Project:** autos
- **Default Branch:** main

**Dual Remote Setup:**
- **Primary (GitLab):** http://gitlab.minilab/halo/autos.git
- **Backup (GitHub):** git@github.com:CompSci2013/autos.git

### Git Configuration

**On Thor:**
```bash
cd /home/odin/projects/autos

# Verify remotes
git remote -v
# Should show:
# github  git@github.com:CompSci2013/autos.git (fetch)
# github  git@github.com:CompSci2013/autos.git (push)
# gitlab  http://gitlab.minilab/halo/autos.git (fetch)
# gitlab  http://gitlab.minilab/halo/autos.git (push)

# Verify branch tracking
git branch -vv
# Should show:
# * main e2de7da [gitlab/main] <commit message>
```

### Issue Tracking Hierarchy

**Project Structure:**

```
AUTOS MVP Implementation (Epic/Project)
│
├── Milestone: Phase 1 - Data Foundation (2-3 days)
│   ├── Issue #1: Research NHTSA vPIC API
│   ├── Issue #2: Create Python ETL container
│   ├── Issue #3: Build Elasticsearch index script
│   ├── Issue #4: Load sample NHTSA data
│   └── Issue #5: Verify data with queries
│
├── Milestone: Phase 2 - Backend API (3-4 days)
│   ├── Issue #6: Implement manufacturer-model endpoint
│   ├── Issue #7: Add health check endpoints
│   ├── Issue #8: Implement error handling
│   ├── Issue #9: Add API documentation
│   └── Issue #10: Deploy backend to K8s
│
├── Milestone: Phase 3 - Frontend Picker (4-5 days)
│   ├── Issue #11: Build vehicle picker component
│   ├── Issue #12: Implement checkbox selection logic
│   ├── Issue #13: Add state management integration
│   ├── Issue #14: Implement chip display
│   ├── Issue #15: Add Apply/Clear buttons
│   ├── Issue #16: Style picker component
│   ├── Issue #17: Add responsive design
│   └── Issue #18: Deploy frontend to K8s
│
└── Milestone: Phase 4 - K8s Deployment (2 days)
    ├── Issue #19: Create namespace and manifests
    ├── Issue #20: Configure ingress
    ├── Issue #21: Add DNS entries
    └── Issue #22: Enable monitoring
```

### Creating Issues from Implementation Steps

**Issue Template:**
```markdown
## Description
Brief description of what needs to be done and why.

## Acceptance Criteria
- [ ] Criterion 1 - Specific, testable condition
- [ ] Criterion 2 - Another measurable outcome
- [ ] Criterion 3 - Clear definition of done

## Technical Notes
- Implementation details
- Gotchas or known issues
- Dependencies on other work
- Links to relevant documentation

## Related
- Blocks: #X (this issue blocks issue X)
- Blocked by: #Y (cannot start until Y is done)
- Related to: #Z (related but not blocking)
- Documentation: `docs/autos-data-sources-model.md`

## Estimated Effort
X hours / Y days
```

**Example Issue #1: Research NHTSA vPIC API**
```markdown
Title: [ETL] Research NHTSA vPIC API data structure
Labels: etl, phase-1-mvp, research
Milestone: Phase 1
Weight: 2

## Description
Investigate NHTSA vPIC API to understand data structure, available fields, and response format.

## Acceptance Criteria
- [ ] Document available API endpoints
- [ ] Identify key fields needed for vehicle data
- [ ] Test sample API calls
- [ ] Document response format
- [ ] Update docs/autos-data-sources-model.md with findings

## Technical Notes
- API URL: https://vpic.nhtsa.dot.gov/api/
- Focus on manufacturer, model, year data
- No authentication required

## Related
- Documentation: docs/autos-data-sources-model.md
- Blocks: #2, #3

## Estimated Effort
2 hours
```

**Example Issue #3: Create Index Script**
```markdown
Title: [ETL] Write create_autos_index.py script
Labels: etl, phase-1-mvp
Milestone: Phase 1
Weight: 3

## Description
Implement Python script to create autos-unified Elasticsearch index with proper mappings.

## Acceptance Criteria
- [ ] Script creates index if not exists
- [ ] Mappings defined for all core fields
- [ ] Manufacturer and model as keyword fields
- [ ] Year as integer field
- [ ] Body styles as array
- [ ] Script runs successfully in container
- [ ] Index health GREEN after creation

## Technical Notes
- Script location: data/scripts/create_autos_index.py
- ES URL: http://elasticsearch.data.svc.cluster.local:9200
- Reference: docs/autos-data-sources-model.md for schema
- Use Python elasticsearch client

## Related
- Blocked by: #2
- Blocks: #4
- Documentation: docs/autos-data-sources-model.md

## Estimated Effort
2 hours
```

### Labels & Classification

**Component Labels:**
- `backend` - Node.js + Express API
- `frontend` - Angular 14 application  
- `etl` - Python data ingestion
- `k8s` - Kubernetes deployment
- `docs` - Documentation updates
- `infrastructure` - Platform/cluster work

**Phase Labels:**
- `phase-1-mvp` - Data Foundation
- `phase-2` - Backend API
- `phase-3` - Frontend Picker
- `phase-4` - K8s Deployment

**Status Labels:**
- `blocked` - Cannot proceed
- `in-progress` - Actively working
- `needs-review` - Awaiting code review
- `ready-to-merge` - Approved and ready

### Branch Strategy

**Branch Naming Convention:**
```
<type>/<issue-number>-<short-description>

Types: feature, bugfix, hotfix, docs, refactor

Examples:
feature/3-elasticsearch-index
feature/11-vehicle-picker-table
bugfix/15-manufacturer-filter
docs/20-api-documentation
refactor/8-state-service
```

**Workflow Steps:**

1. **Start New Work:**
```bash
# Ensure main is up to date
git checkout main
git pull

# Create feature branch
git checkout -b feature/3-elasticsearch-index
```

2. **Develop and Commit:**
```bash
# Make changes
# ...

# Stage changes
git add data/scripts/create_autos_index.py

# Commit with issue reference
git commit -m "feat(etl): Create Elasticsearch index with vehicle mappings

- Define autos-unified index schema
- Add manufacturer and model keyword fields
- Configure year as integer type
- Set up nested body_style array

Related: #3"
```

3. **Push to GitLab:**
```bash
git push gitlab feature/3-elasticsearch-index
```

4. **Create Merge Request (in GitLab UI)**

5. **After Merge:**
```bash
# Switch back to main
git checkout main
git pull

# Delete local feature branch
git branch -d feature/3-elasticsearch-index
```

### Commit Message Convention

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Add or update tests
- `chore`: Build/tooling changes

**Example Commit:**
```
feat(backend): Implement manufacturer-model combinations endpoint

- Add GET /api/v1/manufacturer-model-combinations route
- Implement Elasticsearch aggregation query
- Add pagination support (page, size parameters)
- Include search filtering capability
- Return manufacturer + model pairs with counts

Endpoint supports picker component data requirements.
Response format matches frontend expectations.

Closes #6
Related: #11
```

---

## Development Workflow

### Daily Development Loop

1. **Make changes** on Windows workstation via VS Code Remote SSH
2. **Build container** with Podman on Thor
3. **Test in container** with volume mounts to project directory
4. **Export/Import** to K3s when ready for deployment
5. **Deploy to K8s** and verify with kubectl
6. **Test via Ingress** at http://autos.minilab
7. **Iterate** and repeat

### Container-First Development

```bash
# Development container with live code mounting
podman run -it --rm --name autos-dev --network host \
  -v /home/odin/projects/autos:/app:z \
  localhost/autos-backend:dev \
  npm run dev

# Production container (no mounts)
podman run -d --name autos-backend \
  localhost/autos-backend:v1.0.0
```

### Daily Workflow with GitLab

**Morning Routine:**
```bash
# 1. Pull latest changes
cd /home/odin/projects/autos
git pull

# 2. Check GitLab board for assigned issues
# Visit: http://gitlab.minilab/halo/autos/-/boards

# 3. Pick next issue from "To Do" column

# 4. Move issue to "In Progress"

# 5. Create feature branch
git checkout -b feature/3-create-index-script
```

**During Development:**
```bash
# Make changes
# ...

# Commit frequently with issue reference
git commit -m "feat(etl): Add index mapping definitions

Related: #3"

# Push to share progress
git push gitlab feature/3-create-index-script
```

**End of Work Session:**
```bash
# Push all commits
git push gitlab feature/3-create-index-script

# Add progress comment to issue in GitLab:
# "Index mappings defined. Next: implement creation logic."

# If complete, create MR with "Closes #3"
```

### Documentation Updates

**When implementation differs from spec:**

1. Update relevant documentation files
2. Include doc updates in same MR as code
3. Reference in MR description:
   ```markdown
   ## Documentation Updates
   - Updated docs/autos-data-sources-model.md with actual schema
   - Added notes about NHTSA API rate limits
   ```

**Commit pattern:**
```bash
git add docs/autos-data-sources-model.md
git commit -m "docs(etl): Update schema based on implementation

- Reflect actual field names used
- Add notes on NHTSA API quirks
- Update example queries

Related: #3"
```

---

## Verification Commands

### Check Elasticsearch Index

```bash
# Index exists
curl -s http://thor:30398/_cat/indices | grep autos

# Index health
curl -s http://thor:30398/autos-unified/_search?size=0 | jq

# Sample documents
curl -s http://thor:30398/autos-unified/_search?size=3 | jq '.hits.hits[]._source'

# Aggregation test (for picker)
curl -s http://thor:30398/autos-unified/_search -H "Content-Type: application/json" -d '
{
  "size": 0,
  "aggs": {
    "manufacturers": {
      "terms": {"field": "manufacturer.keyword", "size": 100},
      "aggs": {
        "models": {
          "terms": {"field": "model.keyword", "size": 100}
        }
      }
    }
  }
}' | jq '.aggregations'
```

### Check Kubernetes Resources

```bash
# Namespace
kubectl get namespace autos

# Pods
kubectl get pods -n autos

# Services
kubectl get svc -n autos

# Ingress
kubectl get ingress -n autos

# Logs
kubectl logs -n autos deployment/autos-backend --tail=50
```

### Test Backend API

```bash
# Health check
curl http://autos.minilab/api/health

# Manufacturer-model combinations
curl http://autos.minilab/api/v1/manufacturer-model-combinations?page=1&size=20
```

### Check Infrastructure Status

```bash
# Cluster health
kubectl get nodes
kubectl get pods -A | grep -v Running

# Elasticsearch platform service
curl -s http://thor:30398/_cluster/health | jq

# Resource usage
kubectl top nodes
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Running Scripts on Host
**Problem:** `ModuleNotFoundError` when running Python scripts  
**Solution:** Always use containerized environment

### Pitfall 2: Image Not Available on Node
**Problem:** Pod stuck in `ImagePullBackOff`  
**Solution:** Use `imagePullPolicy: Never` and import to K3s on all nodes

### Pitfall 3: Elasticsearch Connection Issues
**Problem:** Backend can't connect to Elasticsearch  
**Solution:** Use internal K8s DNS: `elasticsearch.data.svc.cluster.local:9200`

### Pitfall 4: CORS Errors
**Problem:** Frontend can't call backend API  
**Solution:** Configure CORS in Express middleware or use Ingress path routing

### Pitfall 5: Volume Mount Permissions
**Problem:** Container can't write to mounted volume  
**Solution:** Use `:z` flag in Podman: `-v /path:/app:z`

---

## Data Model Reference

### Elasticsearch Index: `autos-unified`

**Core Fields:**
```json
{
  "vehicle_id": "keyword",
  "manufacturer": {
    "type": "text",
    "fields": {
      "keyword": {"type": "keyword"}
    }
  },
  "model": {
    "type": "text",
    "fields": {
      "keyword": {"type": "keyword"}
    }
  },
  "year": "integer",
  "body_style": "keyword",
  "body_class": "keyword",
  "engine_cylinders": "integer",
  "drive_type": "keyword",
  "data_source": "keyword"
}
```

### Sample NHTSA Data Structure

```python
{
    "vehicle_id": "auto-VIN123",
    "manufacturer": "Ford",
    "model": "F-150",
    "year": 2023,
    "body_class": "Pickup Truck",
    "engine_cylinders": 8,
    "drive_type": "4WD",
    "data_source": "nhtsa_sample"
}
```

---

## Next Steps Checklist

**Right Now (Phase 1 - Data Foundation):**
- [ ] Create Python ETL Dockerfile
- [ ] Build autos-etl:dev container
- [ ] Create index creation script
- [ ] Run script in container to create `autos-unified` index
- [ ] Fetch sample NHTSA data (API or CSV)
- [ ] Load sample data into Elasticsearch
- [ ] Verify with aggregation queries

**After Data is Ready (Phase 2 - Backend API):**
- [ ] Initialize Node.js project (package.json)
- [ ] Install dependencies (express, elasticsearch client)
- [ ] Create API endpoints
- [ ] Build backend container
- [ ] Deploy to Kubernetes
- [ ] Test API endpoints

**After API Works (Phase 3 - Frontend):**
- [ ] Create Angular 14 project
- [ ] Build picker component
- [ ] Add NG-ZORRO table
- [ ] Build frontend container
- [ ] Deploy to Kubernetes
- [ ] Configure Ingress

---

## Reference Projects

### Transportation Portal
- **Location:** `/home/odin/projects/transportation/`
- **Pattern:** ETL (Python) → Backend (Node.js) → Frontend (Angular 13)
- **Learn From:**
  - ETL container setup
  - Express API structure
  - Elasticsearch aggregation queries
  - State management services

### TLE Tracker
- **Location:** `/home/odin/projects/tle-tracker/`
- **Pattern:** Ingestion (CronJob) → API (FastAPI) → Frontend (Angular 20)
- **Learn From:**
  - Kubernetes CronJob configuration
  - Prometheus instrumentation
  - Multi-stage Docker builds

---

## Quick Reference URLs

**GitLab:**
- Project: http://gitlab.minilab/halo/autos
- Issues: http://gitlab.minilab/halo/autos/-/issues
- Board: http://gitlab.minilab/halo/autos/-/boards
- Milestones: http://gitlab.minilab/halo/autos/-/milestones

**Infrastructure:**
- Elasticsearch: http://thor:30398
- Grafana: http://192.168.0.244:30300
- Prometheus: http://192.168.0.244:30090

**Documentation:**
- Full GitLab Workflow: `docs/autos-gitlab-workflow.md`
- Infrastructure Details: `docs/autos-infrastructure.md`
- Data Model: `docs/autos-data-sources-model.md`
- Personas & Features: `docs/autos-personas-features.md`

---

**Last Updated:** 2025-10-11  
**Status:** Ready for Phase 1 implementation  
**Next Action:** Create Python ETL container and Elasticsearch index
