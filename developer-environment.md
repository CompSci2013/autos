# AUTOS Developer Environment Guide

## Overview

This guide documents how to set up and run the AUTOS frontend development environment using Podman containers. The dev environment provides hot-reload Angular development with all dependencies pre-installed.

---

## Prerequisites

- Podman installed on host system (Thor)
- AUTOS project cloned to `/home/odin/projects/autos`
- Network access to backend API and Elasticsearch

---

## Frontend Dev Container Setup

### Image Architecture

The dev container uses a **Node.js 18 Alpine** base image with Angular CLI 14 pre-installed. It's designed as a long-running container where you exec commands interactively.

**Dockerfile:** `/home/odin/projects/autos/frontend/Dockerfile.dev`

```dockerfile
FROM node:18-alpine
RUN npm install -g @angular/cli@14
WORKDIR /app
RUN apk add --no-cache git
EXPOSE 4200
CMD ["tail", "-f", "/dev/null"]
```

**Key Design Decision:** The CMD is `tail -f /dev/null` which keeps the container alive indefinitely. This allows you to exec into the container multiple times and run different commands without the container exiting.

---

## Building the Dev Image

### Step 1: Navigate to Frontend Directory

```bash
cd /home/odin/projects/autos/frontend
```

### Step 2: Build Dev Image (No Cache)

```bash
podman build --no-cache -f Dockerfile.dev -t localhost/autos-frontend:dev .
```

**Flags Explained:**
- `--no-cache` - Force fresh build, don't use cached layers
- `-f Dockerfile.dev` - Use dev Dockerfile (not production Dockerfile)
- `-t localhost/autos-frontend:dev` - Tag as `dev` for easy reference
- `.` - Build context is current directory

**Build Time:** ~2-3 minutes (downloads Node.js, installs Angular CLI)

**Expected Output:**
```
STEP 1/6: FROM node:18-alpine
STEP 2/6: RUN npm install -g @angular/cli@14
...
Successfully tagged localhost/autos-frontend:dev
```

---

## Starting the Dev Container

### Step 3: Start Container in Detached Mode

```bash
podman run -d \
  --name autos-frontend-dev \
  --network host \
  -v /home/odin/projects/autos/frontend:/app:z \
  -w /app \
  localhost/autos-frontend:dev
```

**Flags Explained:**
- `-d` - Detached mode (runs in background)
- `--name autos-frontend-dev` - Container name for easy reference
- `--network host` - Use host networking (access to backend on localhost)
- `-v /home/odin/projects/autos/frontend:/app:z` - Mount frontend dir with SELinux context
- `-w /app` - Set working directory to `/app`
- `localhost/autos-frontend:dev` - The image we built

**Volume Mount Important:** The `:z` flag is **required** on SELinux systems (like RHEL/Fedora) to allow the container to read/write the mounted directory.

**Expected Output:**
```
96eb09c502172e926cac01c08b562354b08a2d81847b92277ba8bb2e9609af5a
```
(Container ID hash)

---

## Running Angular Dev Server

### Step 4: Exec into Container and Start ng serve

```bash
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200
```

**Flags Explained:**
- `podman exec` - Execute command in running container
- `-it` - Interactive terminal (see output, can Ctrl+C to stop)
- `autos-frontend-dev` - Target container name
- `npm start` - Runs `ng serve` (defined in package.json)
- `-- --host 0.0.0.0` - Make dev server accessible from host
- `--port 4200` - Explicit port (default, but clear)

**Expected Output:**
```
✔ Browser application bundle generation complete.
Initial Chunk Files | Names   |  Raw Size
main.js             | main    | 119.74 kB | 
...
✔ Compiled successfully.
** Angular Live Development Server is listening on 0.0.0.0:4200 **
```

**Access the App:** http://localhost:4200 or http://thor:4200

---

## Development Workflow

### Hot Reload

The dev server watches for file changes. When you edit files on the host at `/home/odin/projects/autos/frontend/src`, the container automatically detects changes and recompiles.

**Example:**
1. Edit `src/app/app.component.ts` in VS Code on Thor
2. Save the file
3. Watch terminal - shows recompilation
4. Browser auto-refreshes (if using Chrome DevTools LiveReload)

### Stopping ng serve

Press `Ctrl+C` in the terminal where `ng serve` is running. This stops the dev server but **keeps the container running**.

### Restarting ng serve

Since the container is still running, just exec the command again:

```bash
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200
```

### Accessing Container Shell

If you need to run other commands (install packages, generate components, etc.):

```bash
podman exec -it autos-frontend-dev /bin/sh
```

**Inside the shell:**
```sh
/app # ng generate component features/my-component
/app # npm install lodash
/app # exit
```

---

## Stopping and Cleaning Up

### Stop ng serve (if running)

Press `Ctrl+C` in the terminal

### Stop the Container

```bash
podman stop autos-frontend-dev
```

### Remove the Container

```bash
podman rm autos-frontend-dev
```

### Remove the Image (if rebuilding)

```bash
podman rmi localhost/autos-frontend:dev
```

---

## Common Issues and Solutions

### Issue: "Error: name is already in use"

**Symptom:**
```
Error: creating container storage: the container name "autos-frontend-dev" is already in use
```

**Solution:**
```bash
podman rm -f autos-frontend-dev
```

Then retry the `podman run` command.

---

### Issue: "can only create exec sessions on running containers"

**Symptom:**
```
Error: can only create exec sessions on running containers: container state improper
```

**Cause:** Container exited unexpectedly.

**Solution:**
Check if container is running:
```bash
podman ps | grep autos-frontend-dev
```

If not listed, check all containers:
```bash
podman ps -a | grep autos-frontend-dev
```

If status shows "Exited", check logs:
```bash
podman logs autos-frontend-dev
```

Then remove and restart:
```bash
podman rm autos-frontend-dev
podman run -d ... (start command from Step 3)
```

---

### Issue: Image appears to be nginx instead of Node.js

**Symptom:**
```
/docker-entrypoint.sh: exec: line 47: npm: not found
```
or
```
nginx: [emerg] host not found in upstream...
```

**Cause:** The `:dev` tag was applied to the wrong image (production nginx image instead of dev Node.js image).

**Solution:**
1. Remove any containers using the image:
   ```bash
   podman rm -f autos-frontend-dev
   ```

2. Remove the wrong image:
   ```bash
   podman rmi localhost/autos-frontend:dev
   ```

3. Rebuild correctly:
   ```bash
   podman build --no-cache -f Dockerfile.dev -t localhost/autos-frontend:dev .
   ```

---

### Issue: Permission denied on mounted volume

**Symptom:**
```
Error: EACCES: permission denied, open '/app/package.json'
```

**Cause:** SELinux context issue with volume mount.

**Solution:** Ensure you're using the `:z` flag in the volume mount:
```bash
-v /home/odin/projects/autos/frontend:/app:z
```

The `:z` tells Podman to relabel the files for container access on SELinux systems.

---

## Quick Reference Commands

### Full Startup Sequence

```bash
# 1. Navigate to frontend directory
cd /home/odin/projects/autos/frontend

# 2. Start container (detached)
podman run -d \
  --name autos-frontend-dev \
  --network host \
  -v /home/odin/projects/autos/frontend:/app:z \
  -w /app \
  localhost/autos-frontend:dev

# 3. Start Angular dev server (interactive)
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200
```

### Check Container Status

```bash
podman ps | grep autos-frontend-dev
```

### View Live Logs

```bash
podman logs -f autos-frontend-dev
```

### Run Angular CLI Commands

```bash
# Generate component
podman exec -it autos-frontend-dev ng generate component features/my-component

# Install npm package
podman exec -it autos-frontend-dev npm install package-name

# Run tests
podman exec -it autos-frontend-dev npm test
```

### Complete Cleanup

```bash
# Stop ng serve (Ctrl+C if running)
# Stop and remove container
podman stop autos-frontend-dev
podman rm autos-frontend-dev

# Optional: Remove image (if rebuilding)
podman rmi localhost/autos-frontend:dev
```

---

## Architecture Notes

### Why Not Auto-Start ng serve?

The Dockerfile.dev uses `CMD ["tail", "-f", "/dev/null"]` instead of `CMD ["npm", "start"]` for these reasons:

1. **Flexibility:** Allows running different commands (ng test, ng build, npm install, etc.)
2. **Interactive Development:** See compilation output in your terminal, not hidden in container logs
3. **Multiple Sessions:** Can exec multiple shells into the same running container
4. **Easy Restart:** Stop and restart ng serve without recreating container

### Network Configuration

Uses `--network host` which means:
- Container shares host's network stack
- Can access `localhost:3000` (backend API)
- Can access `thor:30398` (Elasticsearch NodePort)
- Dev server accessible at `localhost:4200` from host

Alternative would be custom bridge network, but host networking is simpler for dev.

---

## Integration with VS Code

### Editing Files

Files are mounted from the host, so you can:
- Edit in VS Code on Thor via Remote SSH
- Edit in vim/nano on Thor filesystem
- Changes are immediately visible to the container

### Terminal Integration

In VS Code, you can open a terminal and run the exec commands directly:
```bash
podman exec -it autos-frontend-dev npm start -- --host 0.0.0.0 --port 4200
```

The output appears in your VS Code terminal window.

---

## Production vs Development Images

### Development Image (Dockerfile.dev)
- **Base:** node:18-alpine
- **Contains:** Angular CLI, git, npm
- **Purpose:** Interactive development with hot-reload
- **Size:** ~200 MB
- **Command:** `tail -f /dev/null` (stays alive for exec)

### Production Image (Dockerfile or Dockerfile.prod)
- **Base:** nginx:alpine
- **Contains:** Only built static files
- **Purpose:** Serve compiled app in production
- **Size:** ~55 MB
- **Command:** nginx (web server)

**Never confuse the two!** Development needs Node.js, production needs nginx.

---

## Next Steps

After setting up the dev environment:

1. Verify build succeeds without errors
2. Access http://localhost:4200 in browser
3. Make a small change to verify hot-reload works
4. Proceed with component development

For backend development, see `backend/README.md` (to be created).

---

**Last Updated:** October 13, 2025  
**Tested On:** Thor (RHEL 9.4, Podman 4.9.4, K3s 1.30)
