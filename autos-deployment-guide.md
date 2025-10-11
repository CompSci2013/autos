# AUTOS Deployment Guide

**Project:** AUTOS - Automotive Vehicle Database and Picker  
**Created:** 2025-10-11  
**Purpose:** Comprehensive deployment and infrastructure guide with implementation phases  
**Prerequisites:** Elasticsearch platform service running at `http://thor:30398`

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Development Workflow](#development-workflow)
3. [Implementation Phases](#implementation-phases)
4. [Container Build Processes](#container-build-processes)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Data Platform Integration](#data-platform-integration)
7. [Monitoring & Observability](#monitoring--observability)
8. [Verification Commands](#verification-commands)
9. [Troubleshooting](#troubleshooting)
10. [Reference Projects](#reference-projects)

---

## Infrastructure Overview

### Cluster Architecture

#### Nodes

**Loki (Control Plane)**
- IP: 192.168.0.110
- OS: Ubuntu 24.04.3 LTS
- K3s: v1.33.3+k3s1
- RAM: 96GB
- Storage: 1.7TB /srv partition

**Thor (Worker Node)**
- IP: 192.168.0.244
- OS: Ubuntu 24.04.3 LTS
- K3s: v1.33.4+k3s1
- RAM: 64GB
- GPU: RTX 4070 Ti SUPER (16GB)
- Storage: 1.4TB /mnt/data partition

#### Network Configuration

- Domain: *.minilab (internal DNS via /etc/hosts)
- Ingress: Traefik v3 with wildcard TLS certificates
- Gateway: 192.168.0.1

### Halo Labs Development Philosophy

#### Critical: Minimal Host Footprint Policy

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

## Development Workflow

### Architecture Pattern

Following Transportation Portal model:

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

### Project Directory Structure

```
/home/odin/projects/autos/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Angular 14 application
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   └── environments/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── angular.json
├── data/                    # ETL scripts and sample data
│   └── scripts/             # Python data ingestion
├── k8s/                     # Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   └── ingress.yaml
└── docs/                    # Project documentation
    ├── reqs/                # Requirements documents
    ├── crs/                 # Change requests
    ├── plans/               # Project plans
    └── architecture/        # Technical architecture docs
```

---

## Implementation Phases

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

## Container Build Processes

### Backend (Node.js + Express)

**Dockerfile Example:**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["node", "src/index.js"]
```

**Build Commands:**

```bash
# From Thor
cd /home/odin/projects/autos/backend

# Build
podman build -t localhost/autos-backend:v1.0.0 .

# Export
podman save localhost/autos-backend:v1.0.0 -o autos-backend-v1.0.0.tar

# Import to K3s
sudo k3s ctr images import autos-backend-v1.0.0.tar
```

### Frontend (Angular 14 + nginx)

**Dockerfile Example:**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=builder /app/dist/autos /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**

```nginx
server {
    listen 80;
    server_name autos.minilab;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://autos-backend.autos.svc.cluster.local:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Build Commands:**

```bash
# From Thor
cd /home/odin/projects/autos/frontend

# Build
podman build -t localhost/autos-frontend:v1.0.0 .

# Export
podman save localhost/autos-frontend:v1.0.0 -o autos-frontend-v1.0.0.tar

# Import to K3s
sudo k3s ctr images import autos-frontend-v1.0.0.tar
```

### ETL Container (Python)

**Dockerfile Example:**

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy scripts
COPY . .

# Default to interactive shell
CMD ["/bin/bash"]
```

**requirements.txt:**

```
elasticsearch==8.11.0
requests==2.31.0
python-dateutil==2.8.2
```

**Build Commands:**

```bash
cd /home/odin/projects/autos/data/scripts

# Build
podman build -t localhost/autos-etl:dev .

# Run interactively
podman run -it --rm --name autos-etl-dev --network host \
  -v /home/odin/projects/autos/data:/app:z \
  localhost/autos-etl:dev
```

---

## Kubernetes Deployment

### AUTOS Namespace Setup

**Create Namespace:**

```bash
cd /home/odin/projects/autos

# Create namespace
kubectl create namespace autos

# Verify
kubectl get namespaces | grep autos
```

### Backend Deployment

**backend-deployment.yaml:**

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
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**backend-service.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: autos-backend
  namespace: autos
spec:
  selector:
    app: autos-backend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

### Frontend Deployment

**frontend-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: autos-frontend
  namespace: autos
spec:
  replicas: 2
  selector:
    matchLabels:
      app: autos-frontend
  template:
    metadata:
      labels:
        app: autos-frontend
    spec:
      containers:
      - name: frontend
        image: localhost/autos-frontend:v1.0.0
        imagePullPolicy: Never
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
```

**frontend-service.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: autos-frontend
  namespace: autos
spec:
  selector:
    app: autos-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### Ingress Configuration

**ingress.yaml:**

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: autos
  namespace: autos
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`autos.minilab`)
    kind: Rule
    services:
    - name: autos-frontend
      port: 80
```

### DNS Configuration

**Add to /etc/hosts on both nodes:**

```bash
# From Thor and Loki
sudo nano /etc/hosts

# Add line:
192.168.0.110 autos.minilab
```

### Deployment Commands

```bash
# From Thor
cd /home/odin/projects/autos/k8s

# Deploy all resources
kubectl apply -f namespace.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f ingress.yaml

# Verify deployment
kubectl get pods -n autos
kubectl get svc -n autos
kubectl get ingressroute -n autos
```

---

## Data Platform Integration

### Elasticsearch Platform Service

**Access:**

- Internal: `elasticsearch.data.svc.cluster.local:9200`
- NodePort: `http://thor:30398`
- Namespace: `data`

**Current Usage:**

- TLE Tracker: 858 satellite records (`tle-2025-09` index)
- Transportation Portal: 4,607 aircraft records (`transport-unified` index)

**For AUTOS Project:**

- Create index: `autos-unified`
- Follow existing patterns from Transportation Portal
- Multi-tenant platform service (no dedicated instance needed)

**Index Template Example:**

```json
{
  "index_patterns": ["autos-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "refresh_interval": "5s"
    },
    "mappings": {
      "properties": {
        "make": { "type": "keyword" },
        "model": { "type": "text" },
        "year": { "type": "integer" },
        "body_style": { "type": "keyword" }
      }
    }
  }
}
```

**Health Check:**

```bash
# From Thor
curl -s http://thor:30398/_cluster/health | jq
curl -s http://thor:30398/autos-unified/_count | jq
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

## Monitoring & Observability

### Prometheus Metrics (Optional but Recommended)

**Add to backend package.json:**

```json
{
  "dependencies": {
    "prom-client": "^14.2.0"
  }
}
```

**Add to backend src/metrics.js:**

```javascript
const client = require('prom-client');

const register = new client.Registry();

const httpRequestDuration = new client.Histogram({
  name: 'autos_api_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestTotal = new client.Counter({
  name: 'autos_api_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

module.exports = { register, httpRequestDuration, httpRequestTotal };
```

**Add metrics endpoint in src/index.js:**

```javascript
const { register } = require('./metrics');

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

**Add pod annotations to backend deployment:**

```yaml
template:
  metadata:
    annotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "3000"
      prometheus.io/path: "/metrics"
    labels:
      app: autos-backend
```

### Service URLs

**Production Access:**

- **AUTOS Web UI:** http://autos.minilab
- **AUTOS API:** http://autos.minilab/api (proxied through frontend nginx)
- **Backend Direct:** http://autos-backend.autos.svc.cluster.local:3000 (internal)

**Development Access:**

- **Backend Dev:** http://192.168.0.244:3000 (if running locally)
- **Frontend Dev:** http://192.168.0.244:4200 (Angular dev server)

**Data & Monitoring:**

- **Elasticsearch:** http://thor:30398
- **Prometheus:** http://192.168.0.244:30090
- **Grafana:** http://192.168.0.244:30300

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
kubectl logs -n autos deployment/autos-frontend --tail=50
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

## Troubleshooting

### Common Pitfalls & Solutions

#### Pitfall 1: Running Scripts on Host

**Problem:** `ModuleNotFoundError` when running Python scripts

**Solution:** Always use containerized environment

```bash
# Wrong
python3 create_index.py

# Right
podman run -it --rm --network host \
  -v /home/odin/projects/autos/data:/app:z \
  localhost/autos-etl:dev \
  python3 create_index.py
```

#### Pitfall 2: Image Not Available on Node

**Problem:** Pod stuck in `ImagePullBackOff`

**Solution:** Use `imagePullPolicy: Never` and import to K3s on all nodes

```bash
# Export on Thor
podman save localhost/autos-backend:v1.0.0 -o autos-backend-v1.0.0.tar

# Import on Thor
sudo k3s ctr images import autos-backend-v1.0.0.tar

# If multi-node, copy to Loki and import there too
scp autos-backend-v1.0.0.tar odin@loki:/tmp/
ssh odin@loki "sudo k3s ctr images import /tmp/autos-backend-v1.0.0.tar"
```

#### Pitfall 3: Elasticsearch Connection Issues

**Problem:** Backend can't connect to Elasticsearch

**Solution:** Use internal K8s DNS: `elasticsearch.data.svc.cluster.local:9200`

```javascript
// Wrong
const esClient = new Client({ node: 'http://thor:30398' });

// Right
const esClient = new Client({ 
  node: 'http://elasticsearch.data.svc.cluster.local:9200' 
});
```

#### Pitfall 4: CORS Errors

**Problem:** Frontend can't call backend API

**Solution:** Configure CORS in Express middleware or use Ingress path routing

```javascript
// In backend src/index.js
const cors = require('cors');

app.use(cors({
  origin: ['http://autos.minilab', 'http://localhost:4200'],
  credentials: true
}));
```

#### Pitfall 5: Volume Mount Permissions

**Problem:** Container can't write to mounted volume

**Solution:** Use `:z` flag in Podman: `-v /path:/app:z`

```bash
# Wrong
-v /home/odin/projects/autos:/app

# Right
-v /home/odin/projects/autos:/app:z
```

### Quick Reference Commands

#### Health Checks

```bash
# From Thor

# Check pods
kubectl get pods -n autos

# Check services
kubectl get svc -n autos

# Check logs
kubectl logs -n autos deployment/autos-backend --tail=50
kubectl logs -n autos deployment/autos-frontend --tail=50

# Test backend API
curl http://autos-backend.autos.svc.cluster.local:3000/health

# Test frontend
curl -I http://autos.minilab

# Check Elasticsearch
curl http://thor:30398/autos-unified/_count
```

#### Restart and Recovery

```bash
# Restart deployment
kubectl rollout restart deployment/autos-backend -n autos
kubectl rollout restart deployment/autos-frontend -n autos

# Delete and recreate pod
kubectl delete pod <pod-name> -n autos

# View pod details
kubectl describe pod <pod-name> -n autos

# Execute command in pod
kubectl exec -it deployment/autos-backend -n autos -- /bin/sh

# Check Elasticsearch health
curl http://thor:30398/_cluster/health?pretty
```

#### Image Updates

```bash
# Build new version
podman build -t localhost/autos-backend:v1.0.1 .

# Export and import
podman save localhost/autos-backend:v1.0.1 -o autos-backend-v1.0.1.tar
sudo k3s ctr images import autos-backend-v1.0.1.tar

# Update deployment
kubectl set image deployment/autos-backend -n autos \
  backend=localhost/autos-backend:v1.0.1

# Or apply updated YAML
kubectl apply -f k8s/backend-deployment.yaml
```

---

## Reference Projects

### Transportation Portal

**Location:** `/home/odin/projects/transportation/`

**Pattern:** ETL (Python) → Backend (Node.js) → Frontend (Angular 13)

**Data Store:** Elasticsearch (transport-unified index)

**Status:** ETL complete, backend in progress

**Learn From:**
- ETL container setup
- Express API structure
- Elasticsearch aggregation queries
- State management services

### TLE Tracker

**Location:** `/home/odin/projects/tle-tracker/`

**Pattern:** Ingestion (Python CronJob) → API (FastAPI) → Frontend (Angular 20)

**Data Store:** Elasticsearch (tle-2025-09 index)

**Status:** Production with Prometheus metrics

**Learn From:**
- Kubernetes CronJob configuration
- Prometheus instrumentation
- Multi-stage Docker builds

### Key Similarities

- Both use Podman build → K3s import workflow
- Both use Elasticsearch platform service
- Both deployed to dedicated namespaces
- Both use Traefik IngressRoute
- TLE Tracker has Prometheus instrumentation (good reference)

---

## Next Steps Checklist

### Right Now (Phase 1 - Data Foundation)

- [ ] Create Python ETL Dockerfile
- [ ] Build autos-etl:dev container
- [ ] Create index creation script
- [ ] Run script in container to create `autos-unified` index
- [ ] Fetch sample NHTSA data (API or CSV)
- [ ] Load sample data into Elasticsearch
- [ ] Verify with aggregation queries

### After Data is Ready (Phase 2 - Backend API)

- [ ] Initialize Node.js project (package.json)
- [ ] Install dependencies (express, elasticsearch client)
- [ ] Create API endpoints
- [ ] Build backend container
- [ ] Deploy to Kubernetes
- [ ] Test API endpoints

### After API Works (Phase 3 - Frontend)

- [ ] Create Angular 14 project
- [ ] Build picker component
- [ ] Add NG-ZORRO table
- [ ] Build frontend container
- [ ] Deploy to Kubernetes
- [ ] Configure Ingress

---

## Quick Reference URLs

**Infrastructure:**

- Elasticsearch: http://thor:30398
- Grafana: http://192.168.0.244:30300
- Prometheus: http://192.168.0.244:30090

**Documentation:**

- Full GitLab Workflow: `docs/autos-gitlab-workflow.md`
- Data Model: `docs/autos-data-sources-model.md`
- Personas & Features: `docs/autos-personas-features.md`
- Project Overview: `docs/autos-project-overview.md`

---

## Support Resources

### Documentation Locations

- **Infrastructure Master:** `/home/odin/projects/infrastructure/docs/infrastructure-master-document.md`
- **Capability Status:** `/home/odin/projects/infrastructure/docs/infrastructure-capabilities.md`
- **Lab Configuration:** `/home/odin/projects/infrastructure/docs/LAB-CONFIGURATION.md`

### Example Repositories

- Transportation Portal: `/home/odin/projects/transportation/`
- TLE Tracker: `/home/odin/projects/tle-tracker/`
- RAG System: `/home/odin/projects/rag-system/`

### Monitoring Dashboards

- Grafana: http://192.168.0.244:30300 (admin/halolabs2025)
- Prometheus: http://192.168.0.244:30090

---

**Last Updated:** 2025-10-11  
**Status:** Ready for Phase 1 implementation  
**Next Action:** Create Python ETL container and Elasticsearch index

---

**End of AUTOS Deployment Guide**

*This document consolidates infrastructure details and implementation guidance for deploying the AUTOS project on the Halo Labs K3s cluster following established patterns and best practices.*