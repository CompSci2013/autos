## GitLab Integration & Version Control

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

**On Windows (via VS Code Remote SSH or local clone):**
```powershell
cd C:\homelab\claude\repos\autos

# Same remote configuration as Thor
git remote -v

# Same branch tracking
git branch -vv
```

### Development Workflow

**Daily Work Pattern:**
1. **Pull latest changes:**
   ```bash
   git pull
   # Automatically pulls from gitlab/main
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/3-elasticsearch-index
   ```

3. **Make changes and commit:**
   ```bash
   git add data/scripts/create_autos_index.py
   git commit -m "feat(etl): Create Elasticsearch index
   
   - Define autos-unified index schema
   - Add vehicle mappings
   
   Closes #3"
   ```

4. **Push to GitLab:**
   ```bash
   git push gitlab feature/3-elasticsearch-index
   ```

5. **Create Merge Request in GitLab UI**

6. **After merge, sync both remotes:**
   ```bash
   git checkout main
   git pull gitlab main
   git push github main
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
- `docs`: Documentation changes
- `style`: Code formatting
- `refactor`: Code restructuring
- `test`: Test additions/changes
- `chore`: Build/tooling updates

**Example:**
```
feat(backend): Implement vehicle combinations endpoint

- Add GET /api/v1/manufacturer-model-combinations
- Elasticsearch aggregation for unique pairs
- Pagination support (page, size params)

Closes #6
Related: #11
```

### Issue Tracking Integration

**Issue References in Commits:**
- `Closes #N` - Closes issue when MR merged
- `Fixes #N` - Same as Closes (for bugs)
- `Related: #N` - Links to issue without closing

**Branch Naming:**
```
<type>/<issue-number>-<short-description>

Examples:
feature/3-elasticsearch-index
bugfix/15-manufacturer-filter
docs/20-api-documentation
```

### Project Structure in GitLab

```
halo/autos
├── Issues                    # Task tracking
├── Merge Requests            # Code review
├── Milestones                # Phase tracking
│   ├── Phase 1 - Data Foundation
│   ├── Phase 2 - Backend API
│   ├── Phase 3 - Frontend Picker
│   └── Phase 4 - K8s Deployment
├── Boards                    # Kanban view
└── Repository
    ├── main branch          # Production-ready code
    └── feature/* branches   # Work in progress
```

### GitLab Labels

**Component Labels:**
- `backend` - Node.js API work
- `frontend` - Angular 14 UI
- `etl` - Python data ingestion
- `k8s` - Kubernetes deployment
- `docs` - Documentation

**Phase Labels:**
- `phase-1-mvp`
- `phase-2`
- `phase-3`
- `phase-4`

**Status Labels:**
- `blocked`
- `in-progress`
- `needs-review`
- `ready-to-merge`

### Synchronizing Remotes

**Push to both remotes after major milestones:**
```bash
# Ensure main is current
git checkout main
git pull gitlab main

# Push to GitHub backup
git push github main

# Verify sync
git fetch --all
git branch -vv
```

### Common Operations

**Pull latest changes:**
```bash
git pull
# Pulls from gitlab/main automatically
```

**Push to GitLab:**
```bash
git push
# Pushes to gitlab/main automatically

# Or explicitly:
git push gitlab main
```

**Push to GitHub:**
```bash
git push github main
```

**Create and push feature branch:**
```bash
git checkout -b feature/11-picker-component
# ... make changes ...
git push gitlab feature/11-picker-component
```

**Clean up merged branches:**
```bash
# List merged branches
git branch --merged

# Delete local branch
git branch -d feature/11-picker-component

# Delete remote branch (if not auto-deleted by GitLab)
git push gitlab --delete feature/11-picker-component
```

### Workflow Documentation

For complete GitLab workflow details, see:
- **GitLab Workflow Guide:** `docs/gitlab-workflow.md`
- **Issue templates and best practices**
- **Merge request process**
- **Branch strategy and conventions**

### Troubleshooting

**Problem: `git pull` says "Already up to date" but missing changes**

**Solution:** Check upstream tracking
```bash
git branch -vv
# If tracking wrong remote, fix with:
git branch --set-upstream-to=gitlab/main main
```

**Problem: Can't push to GitLab**

**Solution:** Verify authentication
```bash
# Test connection
curl http://gitlab.minilab/halo/autos.git

# Check credentials (may prompt for login)
git push gitlab main
```

**Problem: Merge conflicts**

**Solution:** Pull and resolve
```bash
git pull gitlab main
# Resolve conflicts in files
git add <resolved-files>
git commit -m "fix: Resolve merge conflicts"
git push gitlab main
```

---

**Integration with Container Workflow:**

The GitLab workflow integrates seamlessly with the container-first development pattern:

1. **Develop in containers** (Podman on Thor)
2. **Commit changes** with proper issue references
3. **Push to GitLab** for version control and collaboration
4. **Build containers** from committed code
5. **Deploy to K8s** from imported container images

This ensures:
- All code changes are tracked and reviewed
- Container builds are reproducible from Git commits
- Deployment artifacts match versioned code
- Rollback is simple (revert commit, rebuild, redeploy)
