# AUTOS Development Environment Setup Procedure

**Document Version:** 2.0  
**Date:** 2025-10-14  
**Purpose:** Clean procedure to tear down and rebuild AUTOS development environment from scratch

---

## Overview

This document provides verified steps to:
1. Remove all existing AUTOS containers and images
2. Rebuild and deploy the backend to Kubernetes
3. Verify backend deployment
4. Build both frontend images (dev and production)
5. Deploy production frontend to Kubernetes
6. Set up frontend dev container for ongoing development
7. Verify complete application stack

**Prerequisites:**
- K3s cluster running with Traefik ingress
- Elasticsearch service available at `elasticsearch.data.svc.cluster.local:9200`
- AUTOS namespace exists in Kubernetes
- Podman installed for container builds
- kubectl configured for cluster access

---

## Phase 1: Complete Cleanup

### Step 1: Stop and Remove All AUTOS Containers

**Server:** Thor

```bash
cd /home/odin/projects/autos
podman stop autos-backend-dev autos-frontend-dev
podman rm autos-backend-dev autos-frontend-dev
```

**Expected Output:** Container names confirming removal (SIGKILL warnings are normal)

---

### Step 2: Remove All AUTOS Images from Podman

**Server:** Thor

```bash
cd /home/odin/projects/autos
podman images | grep autos
```

**Note:** Record all image names and tags shown

```bash
# Remove all listed images (example command, adjust to your images)
podman rmi localhost/autos-backend:v1.2.5 localhost/autos-frontend:dev localhost/autos-frontend:prod
```

**Expected Output:** "Untagged" and "Deleted" messages for each image

---

### Step 3: Remove All AUTOS Images from K3s

**Server:** Thor

```bash
cd /home/odin/projects/autos
sudo k3s ctr images list | grep autos
```

**Note:** Record all image names shown

```bash
# Remove all listed images (example command, adjust to your images)
sudo k3s ctr images rm localhost/autos-backend:v1.2.5 localhost/autos-frontend:prod
```

**Expected Output:** Image names confirming removal

---

### Step 4: Verify Complete Cleanup

**Server:** Thor

```bash
# Verify no autos images in K3s
sudo k3s ctr images list | grep autos
# Expected: No output

# Verify no autos images in Podman
podman images | grep autos
# Expected: No output
```

---

### Step 5: Scale Down Kubernetes Deployments

**Server:** Thor

```bash
cd /home/odin/projects/autos
kubectl scale deployment autos-backend autos-frontend --replicas=0 -n autos
kubectl get pods -n autos
```

**Expected Output:** "No resources found in autos namespace"

---

### Step 6: Remove Old Tar Archives

**Server:** Thor

```bash
# Backend directory
cd /home/odin/projects/autos/backend
ls -lh *.tar 2>/dev/null
rm *.tar 2>/dev/null

# Frontend directory
cd /home/odin/projects/autos/frontend
ls -lh *.tar 2>/dev/null
rm *.tar 2>/dev/null
```

**Expected Output:** "No tar files found" when re-listing

---

## Phase 2: Rebuild and Deploy Backend

### Step 7: Build Backend Image

**Server:** Thor

```bash
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.2.5 .
```

**Expected Output:** 
- "STEP 1/7" through "STEP 7/7"
- "Successfully tagged localhost/autos-backend:v1.2.5"
- Final image hash

**Build Time:** ~1-2 minutes with clean cache

---

### Step 8: Export Backend Image

**Server:** Thor

```bash
cd /home/odin/projects/autos/backend
podman save localhost/autos-backend:v1.2.5 -o autos-backend-v1.2.5.tar
```

**Expected Output:** 
- "Copying blob" messages
- "Copying config" message
- "Writing manifest to image destination"

---

### Step 9: Import Backend Image to K3s

**Server:** Thor

```bash
cd /home/odin/projects/autos/backend
sudo k3s ctr images import autos-backend-v1.2.5.tar
```

**Expected Output:** 
- "localhost/autos-backend:v1.2.5 saved"
- Import completion with timing

---

### Step 10: Verify Backend Image in K3s

**Server:** Thor

```bash
sudo k3s ctr images list | grep autos-backend
```

**Expected Output:** One line showing `localhost/autos-backend:v1.2.5` with size ~157 MiB

---

### Step 11: Scale Up Backend Deployment

**Server:** Thor

```bash
cd /home/odin/projects/autos
kubectl scale deployment autos-backend --replicas=2 -n autos
```

**Expected Output:** "deployment.apps/autos-backend scaled"

---

### Step 12: Watch Backend Pods Start

**Server:** Thor

```bash
kubectl get pods -n autos -w
```

**Expected Output:** 
- Two pods transitioning to "1/1 Running" status
- Press `Ctrl+C` once both are running

**Startup Time:** ~10-30 seconds

---

### Step 13: Verify Backend Health

**Server:** Thor

```bash
# Test internal health endpoint
kubectl run -n autos curl-test --image=curlimages/curl:latest --rm -it --restart=Never -- curl http://autos-backend:3000/health
```

**Expected Output:** 
```json
{"status":"ok","service":"autos-backend","timestamp":"2025-10-14T..."}
```

---

### Step 14: Verify Backend API Through Ingress

**Server:** Thor

```bash
curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=2 | jq
```

**Expected Output:** 
- JSON response with manufacturer-model data
- HTTP 200 status
- Data array with results

**This confirms:**
- ✓ Backend pods are running
- ✓ Backend connects to Elasticsearch
- ✓ Ingress routing is working
- ✓ API endpoints are functional

---

## Phase 3: Build and Deploy Production Frontend

### Step 15: Build Frontend Production Image

**Server:** Thor

```bash
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .
```

**Expected Output:** 
- Multi-stage build process (Node.js → nginx)
- "Successfully tagged localhost/autos-frontend:prod"

**Build Time:** ~2-5 minutes depending on cache

---

### Step 16: Export Frontend Production Image

**Server:** Thor

```bash
cd /home/odin/projects/autos/frontend
podman save localhost/autos-frontend:prod -o autos-frontend-prod.tar
```

**Expected Output:** 
- "Copying blob" messages
- "Copying config" message
- "Writing manifest to image destination"

---

### Step 17: Import Frontend Image to K3s

**Server:** Thor

```bash
cd /home/odin/projects/autos/frontend
sudo k3s ctr images import autos-frontend-prod.tar
```

**Expected Output:** 
- "unpacking" messages
- "localhost/autos-frontend:prod saved"

---

### Step 18: Verify Frontend Image in K3s

**Server:** Thor

```bash
sudo k3s ctr images list | grep autos-frontend
```

**Expected Output:** Line showing `localhost/autos-frontend:prod` with size ~52-53 MiB

---

### Step 19: Update Frontend Deployment Manifest

**Server:** Thor

```bash
cd /home/odin/projects/autos/k8s
nano frontend-deployment.yaml
```

**Change Required:**
Find line ~22:
```yaml
        image: localhost/autos-frontend:dev
```

Change to:
```yaml
        image: localhost/autos-frontend:prod
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Step 20: Deploy Frontend to Kubernetes

**Server:** Thor

```bash
cd /home/odin/projects/autos/k8s
kubectl apply -f frontend-deployment.yaml
```

**Expected Output:** "deployment.apps/autos-frontend configured"

---

### Step 21: Scale Up Frontend Deployment

**Server:** Thor

```bash
cd /home/odin/projects/autos
kubectl scale deployment autos-frontend --replicas=2 -n autos
```

**Expected Output:** "deployment.apps/autos-frontend scaled"

---

### Step 22: Watch Frontend Pods Start

**Server:** Thor

```bash
kubectl get pods -n autos -w
```

**Expected Output:** 
- Two frontend pods transitioning to "1/1 Running" status
- Press `Ctrl+C` once both are running

**Startup Time:** ~10-30 seconds

---

### Step 23: Verify Production Application

**Server:** Thor

```bash
# Check all pods are running
kubectl get pods -n autos

# Test API through production ingress
curl -s http://autos.minilab/api/v1/manufacturer-model-combinations?size=2 | jq '.data[0]'

# Access frontend in browser
firefox http://autos.minilab
```

**Expected Output:** 
- 4 pods running (2 backend, 2 frontend)
- JSON response from API
- Frontend displays vehicle picker table

---

### Step 24: Clean Up Frontend Tar Archive

**Server:** Thor

```bash
cd /home/odin/projects/autos/frontend
rm autos-frontend-prod.tar
```

---

## Phase 4: Set Up Frontend Development Container

### Step 25: Build Frontend Dev Image

**Server:** Thor

```bash
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.dev -t localhost/autos-frontend:dev .
```

**Expected Output:** 
- Build process installing Angular CLI
- "Successfully tagged localhost/autos-frontend:dev"

**Build Time:** ~1-3 minutes depending on cache

**Note:** This image stays in Podman only, not deployed to K3s

---

### Step 26: Start Frontend Dev Container

**Server:** Thor

```bash
cd /home/odin/projects/autos/frontend
podman run -d --name autos-frontend-dev --network host -v /home/odin/projects/autos/frontend:/app:z -w /app localhost/autos-frontend:dev
```

**Expected Output:** Container ID hash (64 characters)

---

### Step 27: Verify Dev Container is Running

**Server:** Thor

```bash
podman ps | grep autos-frontend-dev
```

**Expected Output:** Line showing container status "Up" with `autos-frontend-dev` name

---

### Step 28: Start Angular Dev Server

**Server:** Thor

```bash
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200
```

**Expected Output:** 
- npm package installation messages (if first run)
- Angular CLI compilation output
- "✔ Browser application bundle generation complete"
- "** Angular Live Development Server is listening on 0.0.0.0:4200 **"
- Either successful compilation or list of compilation errors

**Note:** Compilation errors indicate code issues to be fixed, not environment setup problems.

**Access Points:**
- **Dev Server:** http://localhost:4200 or http://thor:4200
- **Production App:** http://autos.minilab

---

## Verification Checklist

After completing all steps, verify:

- [ ] No old autos containers: `podman ps -a | grep autos` (only dev container)
- [ ] Dev image in Podman: `podman images | grep autos-frontend:dev`
- [ ] Backend image in K3s: `sudo k3s ctr images list | grep autos-backend`
- [ ] Frontend prod image in K3s: `sudo k3s ctr images list | grep autos-frontend:prod`
- [ ] Two backend pods running: `kubectl get pods -n autos | grep backend`
- [ ] Two frontend pods running: `kubectl get pods -n autos | grep frontend`
- [ ] Backend health check passes: `curl http://autos.minilab/api/health`
- [ ] Backend API responds: `curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=1`
- [ ] Production frontend accessible: http://autos.minilab
- [ ] Dev container running: `podman ps | grep autos-frontend-dev`
- [ ] Angular dev server compiles: Shows compilation output
- [ ] Dev frontend accessible: http://localhost:4200

---

## Access Points Summary

After successful setup:

**Production (Kubernetes Deployment):**
- **Frontend:** http://autos.minilab
- **Backend API:** http://autos.minilab/api/v1/...
- **Backend Health:** http://autos.minilab/api/health

**Development (Local Podman):**
- **Dev Frontend:** http://localhost:4200 or http://thor:4200
- **Backend (via proxy):** http://localhost:3000 (when using dev frontend)

**Direct Services (Internal):**
- **Backend Service:** http://autos-backend.autos.svc.cluster.local:3000
- **Frontend Service:** http://autos-frontend.autos.svc.cluster.local:80
- **Elasticsearch:** http://elasticsearch.data.svc.cluster.local:9200

---

## Key Configuration Details

### Backend Environment Variables
Located in: `k8s/backend-deployment.yaml`
```yaml
ELASTICSEARCH_URL: http://elasticsearch.data.svc.cluster.local:9200
ELASTICSEARCH_INDEX: autos-unified
NODE_ENV: production
PORT: 3000
```

### Frontend Development Container
- **Image:** `localhost/autos-frontend:dev`
- **Base:** node:18-alpine
- **Volume Mount:** `/home/odin/projects/autos/frontend:/app:z` (SELinux compatible)
- **Network:** host (access backend at localhost:3000)
- **Working Directory:** /app
- **Stay-Alive Command:** `tail -f /dev/null`
- **Purpose:** Hot module reloading for rapid development

### Frontend Production Container
- **Image:** `localhost/autos-frontend:prod`
- **Base:** Multi-stage (node:18-alpine → nginx:alpine)
- **Purpose:** Compiled Angular app served by nginx
- **Deployment:** Kubernetes pods with ClusterIP service
- **Routing:** Ingress routes `/` to frontend, `/api` to backend

### Ingress Routing
```yaml
Host: autos.minilab
Routes:
  /api → autos-backend:3000
  /    → autos-frontend:80
```

---

## Development Workflows After Setup

### Daily Frontend Development

**Start Development Session:**
```bash
# 1. Verify production backend is running
kubectl get pods -n autos | grep backend

# 2. Start dev container (if not already running)
cd /home/odin/projects/autos/frontend
podman run -d --name autos-frontend-dev --network host \
  -v /home/odin/projects/autos/frontend:/app:z -w /app \
  localhost/autos-frontend:dev

# 3. Start Angular dev server
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200

# 4. Edit files in VS Code (Remote-SSH)
# Watch terminal for automatic recompilation

# 5. Test at http://localhost:4200
```

**End Development Session:**
```bash
# Stop dev server: Ctrl+C in terminal

# Optional: Remove dev container
podman stop autos-frontend-dev
podman rm autos-frontend-dev
```

### Deploy Frontend Changes to Production

**After completing development work:**
```bash
# 1. Build new production image
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod-v2 .

# 2. Export and import to K3s
podman save localhost/autos-frontend:prod-v2 -o autos-frontend-prod-v2.tar
sudo k3s ctr images import autos-frontend-prod-v2.tar

# 3. Update deployment manifest
cd /home/odin/projects/autos/k8s
nano frontend-deployment.yaml
# Change image tag to :prod-v2

# 4. Apply changes
kubectl apply -f frontend-deployment.yaml

# 5. Watch rollout
kubectl rollout status deployment/autos-frontend -n autos

# 6. Verify
kubectl get pods -n autos
curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=1
firefox http://autos.minilab
```

### Backend Development

**Make changes and deploy:**
```bash
# 1. Edit code
cd /home/odin/projects/autos/backend/src

# 2. Build new image
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.2.6 .

# 3. Export and import
podman save localhost/autos-backend:v1.2.6 -o autos-backend-v1.2.6.tar
sudo k3s ctr images import autos-backend-v1.2.6.tar

# 4. Update deployment
cd /home/odin/projects/autos/k8s
nano backend-deployment.yaml
# Change image tag to :v1.2.6
kubectl apply -f backend-deployment.yaml

# 5. Verify
kubectl rollout status deployment/autos-backend -n autos
curl http://autos.minilab/api/health
```

---

## Troubleshooting

### Frontend Production Pods Not Starting

**Symptom:**
```bash
kubectl get pods -n autos
# autos-frontend-xxxxx   0/1   ErrImageNeverPull   0   2m
```

**Cause:** Image not in K3s containerd

**Solution:**
```bash
# Verify image exists
sudo k3s ctr images list | grep autos-frontend

# If missing, rebuild and import
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .
podman save localhost/autos-frontend:prod -o autos-frontend-prod.tar
sudo k3s ctr images import autos-frontend-prod.tar

# Restart deployment
kubectl rollout restart deployment/autos-frontend -n autos
```

### Dev Container Exits Immediately

**Symptom:**
```bash
podman ps | grep autos-frontend-dev
# No output
```

**Solution:**
```bash
# Check logs
podman logs autos-frontend-dev

# Remove and restart
podman rm autos-frontend-dev
podman run -d --name autos-frontend-dev --network host \
  -v /home/odin/projects/autos/frontend:/app:z -w /app \
  localhost/autos-frontend:dev

# Verify
podman ps | grep autos-frontend-dev
```

### Permission Denied in Dev Container

**Symptom:**
```bash
podman exec -it autos-frontend-dev npm start
# Error: EACCES: permission denied
```

**Cause:** Missing `:z` flag on volume mount

**Solution:**
```bash
# Restart container with proper SELinux context
podman stop autos-frontend-dev
podman rm autos-frontend-dev
podman run -d --name autos-frontend-dev --network host \
  -v /home/odin/projects/autos/frontend:/app:z \
  -w /app localhost/autos-frontend:dev
```

### Backend Cannot Connect to Elasticsearch

**Symptom:**
```bash
kubectl logs -n autos deployment/autos-backend
# Connection refused errors
```

**Solution:**
```bash
# Check Elasticsearch status
kubectl get pods -n data | grep elasticsearch

# Test connectivity
kubectl exec -n autos deployment/autos-backend -- \
  curl -s http://elasticsearch.data.svc.cluster.local:9200/_cluster/health
```

### Wrong Image Used in Deployment

**Symptom:**
Frontend deployment using `:dev` instead of `:prod`

**Solution:**
```bash
# Edit deployment manifest
cd /home/odin/projects/autos/k8s
nano frontend-deployment.yaml
# Change: image: localhost/autos-frontend:prod

# Apply changes
kubectl apply -f frontend-deployment.yaml
```

---

## Notes

### Image Architecture
- **Backend:** Always runs in Kubernetes (never in Podman for dev)
- **Frontend Dev:** Runs in Podman with volume mounts (HMR workflow)
- **Frontend Prod:** Runs in Kubernetes (compiled static files + nginx)

### Image Stores
- **Podman:** User-level rootless image store
- **K3s:** System-level containerd store (requires sudo)
- **No sharing:** Must export/import tar files between stores

### Volume Mounts
- **Always use `:z` flag:** Required for SELinux systems
- **Working directory:** Set with `-w /app` for convenience
- **Host networking:** Use `--network host` for dev container

### Development vs Production
- **Development:** Edit → Save → HMR reload (seconds)
- **Production:** Edit → Build → Export → Import → Deploy (minutes)
- **Test both:** Ensure changes work in production build

### Clean Between Sessions
- **Remove tar files:** Clean up after imports
- **Prune unused images:** `podman image prune` periodically
- **Stop dev containers:** When not actively developing

---

**Document maintained by:** odin + Claude  
**Last verified:** 2025-10-14  
**Next review:** After significant infrastructure changes