# AUTOS Implementation Guideline

**Project:** AUTOS - Automotive Vehicle Database and Picker  
**Created:** 2025-10-11  
**Purpose:** Step-by-step implementation guide following Halo Labs container-first architecture  
**Prerequisites:** Elasticsearch platform service running at `http://thor:30398`

---

## 🎯 Project Overview

**AUTOS MVP Scope:**
- Manufacturer-Model picker component (adapting Transportation Portal's manufacturer-state pattern)
- Backend API serving vehicle combinations from Elasticsearch
- Angular 14 frontend with NG-ZORRO picker table
- Sample NHTSA vehicle data for testing

**NOT in MVP:**
- Full search results display
- "About X" vehicle history pages
- Goggles view-switching system
- Complete NHTSA dataset processing

---

## 🏗️ Architecture Pattern

Following the **Transportation Portal** implementation model:

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

---

## ⚠️ Critical: Halo Labs Minimal Footprint Policy

### **NEVER DO THIS:**
```bash
# ❌ WRONG - Installing packages on host
sudo apt install python3-elasticsearch
pip3 install elasticsearch
npm install -g @angular/cli
```

### **ALWAYS DO THIS:**
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

## 📋 Current State Verification

### Before Starting, Verify:

**1. Elasticsearch is Running:**
```bash
curl -s http://thor:30398 | jq
```
Expected output: `"tagline": "You Know, for Search"`

**2. No AUTOS Index Exists Yet:**
```bash
curl -s http://thor:30398/_cat/indices | grep autos
```
Expected output: (empty - no results)

**3. Project Directory Structure:**
```bash
ls -la /home/odin/projects/autos/
```
Expected: `backend/`, `frontend/`, `k8s/`, `docs/`, `data/`

---

## 🚀 Implementation Phases

### **Phase 1: Data Foundation** ⬅️ START HERE

**Goal:** Create Elasticsearch index and load sample NHTSA data

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

---

### **Phase 2: Backend API**

**Goal:** Node.js REST API serving manufacturer-model combinations

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

---

### **Phase 3: Frontend Application**

**Goal:** Angular 14 + NG-ZORRO picker table

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

---

### **Phase 4: Kubernetes Deployment**

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

---

## 📊 Data Model Reference

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

### Sample NHTSA Data Structure:
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

## 🔍 Verification Commands

### Check Elasticsearch Index:
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

### Check Kubernetes Resources:
```bash
# Namespace
kubectl get namespace autos

# Pods
kubectl get pods -n autos

# Services
kubectl get svc -n autos

# Ingress
kubectl get ingress -n autos
```

### Test Backend API:
```bash
# Health check
curl http://autos.minilab/api/health

# Manufacturer-model combinations
curl http://autos.minilab/api/v1/manufacturer-model-combinations?page=1&size=20
```

---

## 🎯 Success Criteria for MVP

### Phase 1 Complete When:
- ✅ `autos-unified` index exists in Elasticsearch (GREEN status)
- ✅ 50-100 sample vehicle records loaded
- ✅ Aggregation query returns manufacturer-model combinations
- ✅ Sample queries return valid vehicle data

### Phase 2 Complete When:
- ✅ Backend API deployed to Kubernetes (2/2 replicas running)
- ✅ `/api/v1/manufacturer-model-combinations` endpoint returns data
- ✅ Elasticsearch connection working from backend pods
- ✅ Health check endpoint responding

### Phase 3 Complete When:
- ✅ Frontend deployed to Kubernetes (2/2 replicas running)
- ✅ Picker table displays manufacturer-model combinations
- ✅ Checkbox selection works (parent + child hierarchy)
- ✅ Apply button sends selected combinations to backend

### MVP Complete When:
- ✅ User can access http://autos.minilab
- ✅ Picker table loads with real NHTSA data
- ✅ User can select manufacturers and models
- ✅ Selection state persists in UI
- ✅ All components running in Kubernetes

---

## 🚨 Common Pitfalls & Solutions

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

## 📚 Reference Projects

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

## 🔄 Development Workflow

### Daily Development Loop:

1. **Make changes** on Windows workstation via VS Code Remote SSH
2. **Build container** with Podman on Thor
3. **Test in container** with volume mounts to project directory
4. **Export/Import** to K3s when ready for deployment
5. **Deploy to K8s** and verify with kubectl
6. **Test via Ingress** at http://autos.minilab
7. **Iterate** and repeat

### Container-First Development:
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

---

## 📞 Getting Help

### Check Infrastructure Status:
```bash
# Cluster health
kubectl get nodes
kubectl get pods -A | grep -v Running

# Elasticsearch platform service
curl -s http://thor:30398/_cluster/health | jq

# Resource usage
kubectl top nodes
```

### Review Reference Documentation:
- Infrastructure Master: `/home/odin/projects/infrastructure/docs/infrastructure-master-document.md`
- Capabilities Status: `/home/odin/projects/infrastructure/docs/infrastructure-capabilities.md`
- Lab Configuration: `/home/odin/projects/infrastructure/docs/LAB-CONFIGURATION.md`
- Transportation Portal: `/home/odin/projects/transportation/docs/dev-guide.txt`

---

## ✅ Next Steps Checklist

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

**Last Updated:** 2025-10-11  
**Status:** Ready for Phase 1 implementation  
**Next Action:** Create Python ETL container and Elasticsearch index