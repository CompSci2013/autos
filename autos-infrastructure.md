# AUTOS Infrastructure Guide - Halo Labs

**Created:** 2025-10-11  
**Purpose:** Infrastructure reference for AUTOS project deployment on Halo Labs K3s cluster

---

## Cluster Overview

### Nodes
- **Loki** (Control Plane)
  - IP: 192.168.0.110
  - OS: Ubuntu 24.04.3 LTS
  - K3s: v1.33.3+k3s1
  - RAM: 96GB
  - Storage: 1.7TB /srv partition

- **Thor** (Worker Node)
  - IP: 192.168.0.244
  - OS: Ubuntu 24.04.3 LTS
  - K3s: v1.33.4+k3s1
  - RAM: 64GB
  - GPU: RTX 4070 Ti SUPER (16GB)
  - Storage: 1.4TB /mnt/data partition

### Network Configuration
- Domain: *.minilab (internal DNS via /etc/hosts)
- Ingress: Traefik v3 with wildcard TLS certificates
- Gateway: 192.168.0.1

---

## Development Workflow

### Container Build Pattern (Used by all Halo Labs projects)

**On Thor:**
```bash
# 1. Build with Podman
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.0.0 .

# 2. Export to tar
podman save localhost/autos-backend:v1.0.0 -o autos-backend-v1.0.0.tar

# 3. Import to K3s containerd
sudo k3s ctr images import autos-backend-v1.0.0.tar

# 4. Verify import
sudo k3s ctr images list | grep autos-backend

# 5. Deploy to Kubernetes
kubectl apply -f k8s/backend-deployment.yaml
```

### Key Principles
1. **Minimal Host Footprint:** No npm/node installations on host, everything in containers
2. **Podman for Builds:** Rootless container builds on Thor
3. **K3s Containerd for Runtime:** Import images, deploy with `imagePullPolicy: Never`
4. **Local Images Only:** No external registry required for MVP

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

---

## AUTOS Namespace Setup

### Create Namespace

**From Thor:**
```bash
cd /home/odin/projects/autos

# Create namespace
kubectl create namespace autos

# Verify
kubectl get namespaces | grep autos
```

### Directory Structure (Recommended)

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
├── k8s/                     # Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   └── ingress.yaml
└── docs/                    # Project documentation
```

---

## Container Build Process

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

---

## Kubernetes Deployment

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
        - name: NODE_ENV
          value: "production"
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

---

## Ingress Configuration

### Traefik IngressRoute

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

## Monitoring Integration

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

---

## Service URLs

### Production Access
- **AUTOS Web UI:** http://autos.minilab
- **AUTOS API:** http://autos.minilab/api (proxied through frontend nginx)
- **Backend Direct:** http://autos-backend.autos.svc.cluster.local:3000 (internal)

### Development Access
- **Backend Dev:** http://192.168.0.244:3000 (if running locally)
- **Frontend Dev:** http://192.168.0.244:4200 (Angular dev server)

### Data & Monitoring
- **Elasticsearch:** http://thor:30398
- **Prometheus:** http://192.168.0.244:30090
- **Grafana:** http://192.168.0.244:30300

---

## Quick Reference Commands

### Health Checks
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

### Troubleshooting
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

### Image Updates
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

### Similar Patterns in Halo Labs

**Transportation Portal:**
- Location: `/home/odin/projects/transportation/`
- Pattern: ETL (Python) → Backend (Node.js) → Frontend (Angular 13)
- Data Store: Elasticsearch (transport-unified index)
- Status: ETL complete, backend in progress

**TLE Tracker:**
- Location: `/home/odin/projects/tle-tracker/`
- Pattern: Ingestion (Python CronJob) → API (FastAPI) → Frontend (Angular 20)
- Data Store: Elasticsearch (tle-2025-09 index)
- Status: Production with Prometheus metrics

**Key Similarities:**
- Both use Podman build → K3s import workflow
- Both use Elasticsearch platform service
- Both deployed to dedicated namespaces
- Both use Traefik IngressRoute
- TLE Tracker has Prometheus instrumentation (good reference)

---

## Next Steps for AUTOS

### Phase 1: Backend API (Minimal Picker Support)
1. Create `/home/odin/projects/autos/` directory structure
2. Initialize Node.js backend with Express
3. Install dependencies: `express`, `@elastic/elasticsearch`, `cors`
4. Create basic API endpoints:
   - `GET /api/health` - Health check
   - `GET /api/vehicles/manufacturers` - Get manufacturers
   - `GET /api/vehicles/models` - Get models for manufacturers
   - `POST /api/vehicles/search` - Search with filters
5. Build and deploy backend container
6. Test API with curl

### Phase 2: Frontend Picker (Minimal UI)
1. Create Angular 14 project
2. Implement vehicle picker table component
3. Add NG-ZORRO Ant Design components
4. Build and deploy frontend container
5. Configure nginx proxy to backend
6. Add DNS entry for autos.minilab
7. Test end-to-end flow

### Phase 3: Data Loading (Initial Dataset)
1. Choose primary data source (NHTSA vPIC recommended)
2. Create Python ETL script (similar to Transportation Portal)
3. Build ETL container
4. Load subset of data to `autos-unified` index
5. Verify data in Elasticsearch
6. Test picker with real data

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

**End of AUTOS Infrastructure Guide**

*This document provides everything needed to deploy the AUTOS project on the Halo Labs K3s cluster following established patterns and best practices.*
