# AUTOS Production Deployment Quick Reference

**Version:** 1.0  
**Date:** 2025-10-14  
**Purpose:** Quick reference for deploying AUTOS application to production

---

## Current Production Status

**Deployed Version:**
- Backend: `localhost/autos-backend:v1.2.5`
- Frontend: `localhost/autos-frontend:prod`
- Namespace: `autos`
- Replicas: 2 backend, 2 frontend
- Access: http://autos.minilab

**Last Deployment:** 2025-10-14

---

## Quick Deploy Commands

### Deploy Backend Update

```bash
# 1. Build new version
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.2.6 .

# 2. Export and import
podman save localhost/autos-backend:v1.2.6 -o autos-backend-v1.2.6.tar
sudo k3s ctr images import autos-backend-v1.2.6.tar

# 3. Update deployment
cd /home/odin/projects/autos/k8s
nano backend-deployment.yaml  # Change image tag
kubectl apply -f backend-deployment.yaml

# 4. Verify
kubectl rollout status deployment/autos-backend -n autos
curl http://autos.minilab/api/health
```

### Deploy Frontend Update

```bash
# 1. Build new version
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod-v2 .

# 2. Export and import
podman save localhost/autos-frontend:prod-v2 -o autos-frontend-prod-v2.tar
sudo k3s ctr images import autos-frontend-prod-v2.tar

# 3. Update deployment
cd /home/odin/projects/autos/k8s
nano frontend-deployment.yaml  # Change image tag
kubectl apply -f frontend-deployment.yaml

# 4. Verify
kubectl rollout status deployment/autos-frontend -n autos
curl http://autos.minilab/
```

---

## Full Stack Deployment (From Scratch)

### Prerequisites Check

```bash
# Verify cluster is running
kubectl get nodes

# Verify Elasticsearch is available
kubectl get pods -n data | grep elasticsearch
curl -s http://thor:30398/_cluster/health | jq

# Verify namespace exists
kubectl get namespace autos
```

### Step 1: Load Data into Elasticsearch

```bash
cd /home/odin/projects/autos/data/scripts

podman run -it --rm --name autos-data-loader --network host \
  -v /home/odin/projects/autos/data/scripts:/app:z \
  localhost/autos-data-loader:latest

# Inside container:
python3 create_autos_index.py
python3 load_large_sample_data.py  # or load_full_data_v2.py
exit

# Verify data
curl -s http://thor:30398/autos-unified/_count | jq
```

### Step 2: Build and Deploy Backend

```bash
# Build
cd /home/odin/projects/autos/backend
podman build -t localhost/autos-backend:v1.2.5 .

# Export and import
podman save localhost/autos-backend:v1.2.5 -o autos-backend-v1.2.5.tar
sudo k3s ctr images import autos-backend-v1.2.5.tar

# Deploy
cd /home/odin/projects/autos/k8s
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

# Verify
kubectl get pods -n autos | grep backend
curl http://autos.minilab/api/health
```

### Step 3: Build and Deploy Frontend

```bash
# Build
cd /home/odin/projects/autos/frontend
podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .

# Export and import
podman save localhost/autos-frontend:prod -o autos-frontend-prod.tar
sudo k3s ctr images import autos-frontend-prod.tar

# Ensure deployment uses :prod image
cd /home/odin/projects/autos/k8s
grep "image:" frontend-deployment.yaml
# Should show: image: localhost/autos-frontend:prod

# Deploy
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# Verify
kubectl get pods -n autos | grep frontend
```

### Step 4: Configure Ingress

```bash
cd /home/odin/projects/autos/k8s
kubectl apply -f ingress.yaml

# Verify
kubectl get ingress -n autos
curl -I http://autos.minilab
```

### Step 5: Final Verification

```bash
# Check all pods
kubectl get pods -n autos

# Test backend API
curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=2 | jq

# Access frontend in browser
firefox http://autos.minilab
```

---

## Rollback Procedures

### Rollback Backend

```bash
# List previous versions
cd /home/odin/projects/autos/backend
ls -lh autos-backend-*.tar

# Import previous version
sudo k3s ctr images import autos-backend-v1.2.4.tar

# Update deployment
cd /home/odin/projects/autos/k8s
nano backend-deployment.yaml  # Change to v1.2.4
kubectl apply -f backend-deployment.yaml

# Verify
kubectl rollout status deployment/autos-backend -n autos
```

### Rollback Frontend

```bash
# List previous versions
cd /home/odin/projects/autos/frontend
ls -lh autos-frontend-*.tar

# Import previous version
sudo k3s ctr images import autos-frontend-prod-v1.tar

# Update deployment
cd /home/odin/projects/autos/k8s
nano frontend-deployment.yaml  # Change to prod-v1
kubectl apply -f frontend-deployment.yaml

# Verify
kubectl rollout status deployment/autos-frontend -n autos
```

### Emergency Rollback Using kubectl

```bash
# View rollout history
kubectl rollout history deployment/autos-backend -n autos
kubectl rollout history deployment/autos-frontend -n autos

# Rollback to previous version
kubectl rollout undo deployment/autos-backend -n autos
kubectl rollout undo deployment/autos-frontend -n autos

# Rollback to specific revision
kubectl rollout undo deployment/autos-backend -n autos --to-revision=2
```

---

## Health Checks

### Quick Status Check

```bash
# All pods
kubectl get pods -n autos

# Backend health
curl http://autos.minilab/api/health

# Frontend accessibility
curl -I http://autos.minilab

# API test
curl http://autos.minilab/api/v1/manufacturer-model-combinations?size=1 | jq
```

### Detailed Status Check

```bash
# Pod details
kubectl describe pods -n autos

# Service endpoints
kubectl get endpoints -n autos

# Ingress details
kubectl describe ingress autos -n autos

# Recent logs
kubectl logs -n autos deployment/autos-backend --tail=50
kubectl logs -n autos deployment/autos-frontend --tail=50

# Elasticsearch connectivity
kubectl exec -n autos deployment/autos-backend -- \
  curl -s http://elasticsearch.data.svc.cluster.local:9200/_cluster/health | jq
```

---

## Scaling Operations

### Scale Up

```bash
# Backend
kubectl scale deployment/autos-backend --replicas=4 -n autos

# Frontend
kubectl scale deployment/autos-frontend --replicas=4 -n autos

# Verify
kubectl get pods -n autos
```

### Scale Down

```bash
# Backend
kubectl scale deployment/autos-backend --replicas=1 -n autos

# Frontend
kubectl scale deployment/autos-frontend --replicas=1 -n autos

# Verify
kubectl get pods -n autos
```

### Maintenance Mode (Scale to Zero)

```bash
# Stop all pods
kubectl scale deployment/autos-backend --replicas=0 -n autos
kubectl scale deployment/autos-frontend --replicas=0 -n autos

# Restart
kubectl scale deployment/autos-backend --replicas=2 -n autos
kubectl scale deployment/autos-frontend --replicas=2 -n autos
```

---

## Common Issues and Solutions

### Issue: Pods Not Starting

```bash
# Check pod status
kubectl get pods -n autos

# If ImagePullBackOff or ErrImageNeverPull:
# Verify image exists in K3s
sudo k3s ctr images list | grep autos

# If missing, import the image
cd /home/odin/projects/autos/[backend|frontend]
sudo k3s ctr images import autos-[component]-[version].tar
kubectl rollout restart deployment/autos-[component] -n autos
```

### Issue: Backend Cannot Connect to Elasticsearch

```bash
# Check Elasticsearch health
kubectl get pods -n data | grep elasticsearch

# Test connectivity from backend pod
kubectl exec -n autos deployment/autos-backend -- \
  curl -s http://elasticsearch.data.svc.cluster.local:9200/_cluster/health

# If fails, check Elasticsearch logs
kubectl logs -n data deployment/elasticsearch
```

### Issue: Ingress Not Routing Traffic

```bash
# Check ingress configuration
kubectl get ingress -n autos
kubectl describe ingress autos -n autos

# Verify Traefik is running
kubectl get pods -n kube-system | grep traefik

# Check service endpoints
kubectl get endpoints -n autos
```

### Issue: Frontend Shows Blank Page

```bash
# Check frontend logs
kubectl logs -n autos deployment/autos-frontend

# Verify nginx is serving files
kubectl exec -n autos deployment/autos-frontend -- ls -la /usr/share/nginx/html

# Check if API calls are working
# Browser console should show successful API responses
```

---

## Maintenance Tasks

### Update Elasticsearch Data

```bash
cd /home/odin/projects/autos/data/scripts

podman run -it --rm --name autos-data-loader --network host \
  -v /home/odin/projects/autos/data/scripts:/app:z \
  localhost/autos-data-loader:latest

# Inside container:
python3 reset_index.py  # Optional: clear existing data
python3 create_autos_index.py
python3 load_large_sample_data.py
exit
```

### Clean Up Old Images

```bash
# List images in K3s
sudo k3s ctr images list | grep autos

# Remove old versions
sudo k3s ctr images rm localhost/autos-backend:v1.2.3
sudo k3s ctr images rm localhost/autos-frontend:prod-v1

# List images in Podman
podman images | grep autos

# Remove old versions
podman rmi localhost/autos-backend:v1.2.3
podman rmi localhost/autos-frontend:prod-v1
```

### Restart All Pods

```bash
# Rolling restart (no downtime)
kubectl rollout restart deployment/autos-backend -n autos
kubectl rollout restart deployment/autos-frontend -n autos

# Watch status
kubectl rollout status deployment/autos-backend -n autos
kubectl rollout status deployment/autos-frontend -n autos
```

---

## Resource Limits

### Current Settings

**Backend:**
- Requests: 128Mi memory, 100m CPU
- Limits: 256Mi memory, 500m CPU

**Frontend:**
- Requests: 64Mi memory, 50m CPU
- Limits: 128Mi memory, 200m CPU

### Adjusting Resources

Edit deployment manifests and apply:

```bash
cd /home/odin/projects/autos/k8s
nano backend-deployment.yaml  # Adjust resources section
kubectl apply -f backend-deployment.yaml

nano frontend-deployment.yaml  # Adjust resources section
kubectl apply -f frontend-deployment.yaml
```

---

## Monitoring Commands

### Watch Pod Status

```bash
# Continuous monitoring
watch kubectl get pods -n autos

# Or with kubectl watch
kubectl get pods -n autos -w
```

### Follow Logs

```bash
# Backend logs (follow)
kubectl logs -n autos deployment/autos-backend -f

# Frontend logs (follow)
kubectl logs -n autos deployment/autos-frontend -f

# All pods
kubectl logs -n autos -l app=autos-backend -f
kubectl logs -n autos -l app=autos-frontend -f
```

### Resource Usage

```bash
# Pod resource usage
kubectl top pods -n autos

# Node resource usage
kubectl top nodes
```

---

## Backup Procedures

### Backup Current Images

```bash
# Backend
cd /home/odin/projects/autos/backend
BACKUP_DATE=$(date +%Y%m%d)
sudo k3s ctr images export autos-backend-backup-${BACKUP_DATE}.tar \
  localhost/autos-backend:v1.2.5

# Frontend
cd /home/odin/projects/autos/frontend
sudo k3s ctr images export autos-frontend-backup-${BACKUP_DATE}.tar \
  localhost/autos-frontend:prod
```

### Backup Elasticsearch Data

```bash
# Create snapshot (if snapshot repository configured)
curl -X PUT "http://thor:30398/_snapshot/backup/snapshot_$(date +%Y%m%d)" \
  -H 'Content-Type: application/json' \
  -d '{"indices": "autos-unified", "ignore_unavailable": true}'

# Or export data using data loader scripts
cd /home/odin/projects/autos/data/scripts
# Create custom export script as needed
```

---

## CI/CD Integration Notes

### Automated Deployment Script Template

```bash
#!/bin/bash
# deploy.sh - Automated AUTOS deployment

set -e

VERSION=$1
COMPONENT=$2  # backend or frontend

if [ -z "$VERSION" ] || [ -z "$COMPONENT" ]; then
  echo "Usage: ./deploy.sh <version> <backend|frontend>"
  exit 1
fi

cd /home/odin/projects/autos/$COMPONENT

# Build
if [ "$COMPONENT" = "frontend" ]; then
  podman build -f Dockerfile.prod -t localhost/autos-$COMPONENT:$VERSION .
else
  podman build -t localhost/autos-$COMPONENT:$VERSION .
fi

# Export and import
podman save localhost/autos-$COMPONENT:$VERSION -o autos-$COMPONENT-$VERSION.tar
sudo k3s ctr images import autos-$COMPONENT-$VERSION.tar

# Update deployment
cd /home/odin/projects/autos/k8s
sed -i "s|image: localhost/autos-$COMPONENT:.*|image: localhost/autos-$COMPONENT:$VERSION|" \
  $COMPONENT-deployment.yaml
kubectl apply -f $COMPONENT-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/autos-$COMPONENT -n autos

echo "Deployment of autos-$COMPONENT:$VERSION complete"
```

---

**Document maintained by:** odin + Claude  
**Last updated:** 2025-10-14  
**Version:** 1.0