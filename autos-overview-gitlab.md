## Project Management via GitLab

### Version Control & Collaboration

**Repository:** http://gitlab.minilab/halo/autos  
**Backup Repository:** https://github.com/CompSci2013/autos

All project work is tracked and managed through GitLab, following the same patterns established in the Transportation Portal project.

---

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

---

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

**Persona Labels** (for future features):
- `motor-head` - Hard-core enthusiast features
- `jr-motor-head` - Learning enthusiast features
- `investor` - Collector/investor features
- `consumer` - General consumer features

---

### Workflow Integration

**Requirements → Issues → Code → Deployment**

1. **Requirements Documents** (in `docs/reqs/`)
   - Define what needs to be built
   - Stored in Git for version control
   - Example: `REQ-2025-002-picker-component.md`

2. **GitLab Issues**
   - Break requirements into implementable tasks
   - Track progress and dependencies
   - Link back to requirement docs

3. **Feature Branches**
   - One branch per issue
   - Named: `feature/<issue-number>-<description>`
   - Example: `feature/11-vehicle-picker`

4. **Commits**
   - Reference issues: `Related: #11`
   - Follow conventional commit format
   - Close issues: `Closes #11`

5. **Merge Requests**
   - Code review process
   - Auto-close linked issues on merge
   - Documentation updates included

6. **Deployment**
   - Build containers from merged code
   - Deploy to K8s cluster
   - Verify functionality

---

### Branch Strategy

**Main Branch:**
- Protected branch (main)
- Only updated via Merge Requests
- Always production-ready
- Deployed code matches main branch

**Feature Branches:**
- Short-lived (hours to days)
- One feature/issue per branch
- Deleted after merge
- Naming: `feature/<issue>-<description>`

**Branch Lifecycle:**
```bash
# Create from main
git checkout main
git pull
git checkout -b feature/11-vehicle-picker

# Develop and commit
git commit -m "feat(picker): Implement table component"

# Push to GitLab
git push gitlab feature/11-vehicle-picker

# Create MR in GitLab UI

# After merge, delete branch
git checkout main
git pull
git branch -d feature/11-vehicle-picker
```

---

### Commit Message Standards

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Testing
- `chore`: Build/tooling

**Examples:**

```
feat(etl): Create Elasticsearch index with vehicle mappings

- Define autos-unified index schema
- Add manufacturer and model keyword fields
- Configure year as integer type
- Set up nested body_style array

Closes #3
```

```
fix(backend): Correct manufacturer aggregation query

Problem: Query returned duplicate manufacturers
Solution: Use terms aggregation with keyword field

Fixes #15
Related: #6
```

```
docs(reqs): Add picker component requirements

- Document checkbox behavior
- Define API contract
- Add user workflows
- Include acceptance criteria

Related: #11
```

---

### Project Boards

**Kanban Board:** http://gitlab.minilab/halo/autos/-/boards

**Columns:**
1. **Open** - New issues (backlog)
2. **To Do** - Prioritized for current phase
3. **In Progress** - Actively being worked
4. **Review** - Code review needed
5. **Done** - Completed and merged

**Usage:**
- Drag issues between columns as status changes
- Filter by milestone to see phase-specific work
- Filter by label to see component-specific work
- Use for daily standup discussions
- Identify blockers and bottlenecks

---

### Milestone Management

**Milestone = Phase**

Each milestone represents one implementation phase:

**Phase 1 - Data Foundation:**
- **Duration:** 2-3 days
- **Goal:** Elasticsearch index with sample data
- **Issues:** #1-#5
- **Completion Criteria:**
  - All issues closed
  - 50-100 vehicles in Elasticsearch
  - Aggregation queries working

**Phase 2 - Backend API:**
- **Duration:** 3-4 days
- **Goal:** REST API serving vehicle data
- **Issues:** #6-#10
- **Completion Criteria:**
  - API endpoints functional
  - Backend deployed to K8s
  - API documentation complete

**Phase 3 - Frontend Picker:**
- **Duration:** 4-5 days
- **Goal:** Vehicle picker component working
- **Issues:** #11-#18
- **Completion Criteria:**
  - Picker displays data
  - Selection logic works
  - Frontend deployed to K8s

**Phase 4 - K8s Deployment:**
- **Duration:** 2 days
- **Goal:** Full production deployment
- **Issues:** #19-#22
- **Completion Criteria:**
  - Application accessible at autos.minilab
  - All health checks passing
  - Monitoring enabled

---

### Documentation as Code

**All documentation lives in Git:**

```
docs/
├── reqs/                          # Requirements
│   ├── REQ-2025-001-project-overview.md
│   ├── REQ-2025-002-picker-component.md
│   └── REQ-2025-003-goggles-system.md
├── crs/                           # Change Requests
│   └── CR-2025-001-data-model-change.md
├── plans/                         # Project Plans
│   └── PP-2025-001-mvp-implementation.md
├── architecture/                  # Technical Design
│   ├── picker-design.md
│   ├── elasticsearch-schema.md
│   └── api-design.md
├── gitlab-workflow.md             # GitLab usage guide
├── autos-infrastructure.md        # Infrastructure setup
└── autos-implementation-guideline.md  # Implementation steps
```

**Documentation Update Process:**

1. Create issue for doc update: `[Docs] Document picker API`
2. Create branch: `docs/20-picker-api`
3. Update markdown files
4. Commit: `docs(architecture): Document picker component API`
5. Push and create MR
6. Merge to main
7. Documentation always current with code

---

### Code Review Process

**All code changes reviewed via Merge Requests:**

**MR Checklist:**
- [ ] Code follows project style
- [ ] Tests added/updated (if applicable)
- [ ] Documentation updated
- [ ] No console errors
- [ ] Commit messages follow convention
- [ ] Issue linked with "Closes #N"

**Review Criteria:**
- Code readability and maintainability
- Logic correctness
- Error handling adequate
- Security considerations
- Performance implications

**Approval and Merge:**
1. Self-review (read your own diff)
2. Request review (if team member available)
3. Address feedback
4. Merge when approved
5. Delete feature branch
6. Verify issue auto-closed

---

### Progress Tracking

**Daily Progress:**
- Check GitLab board: http://gitlab.minilab/halo/autos/-/boards
- Move issues to reflect current status
- Update issue comments with progress notes
- Commit and push work frequently

**Weekly Progress:**
- Review milestone completion percentage
- Identify blockers and resolve
- Update timeline if needed
- Document decisions in issues

**Phase Completion:**
- Close milestone when all issues done
- Tag release (optional): `v0.1.0-phase1`
- Update project README with status
- Begin next phase

---

### Communication & Collaboration

**Issue Comments:**
- Use for progress updates
- Ask questions and discuss approach
- Reference commits: "Implemented in e2de7da"
- Tag team members if needed: `@username`

**Merge Request Discussions:**
- Review comments on specific lines
- Suggest changes
- Request clarifications
- Approve when satisfied

**Commit Messages:**
- Provide context for future reference
- Explain "why" not just "what"
- Link to relevant issues and docs

---

### GitLab URLs Quick Reference

**Project Home:**  
http://gitlab.minilab/halo/autos

**Issues:**  
http://gitlab.minilab/halo/autos/-/issues

**Board:**  
http://gitlab.minilab/halo/autos/-/boards

**Milestones:**  
http://gitlab.minilab/halo/autos/-/milestones

**Merge Requests:**  
http://gitlab.minilab/halo/autos/-/merge_requests

**Repository:**  
http://gitlab.minilab/halo/autos/-/tree/main

---

### Integration with Development Workflow

**GitLab complements the container-first approach:**

1. **Track work** in GitLab issues
2. **Develop in containers** (Podman on Thor)
3. **Commit changes** with issue references
4. **Create MR** for review
5. **Merge to main** after approval
6. **Build containers** from committed code
7. **Deploy to K8s** from imported images
8. **Verify** and close issues

**Benefits:**
- Every deployed feature traced to requirements
- Code review ensures quality
- Documentation kept in sync
- Easy rollback (revert commit, rebuild, redeploy)
- Full audit trail of changes

---

### Getting Started with GitLab

**Initial Setup (One-time):**

1. **Access GitLab:**
   - URL: http://gitlab.minilab
   - Login: root / halolabs2025

2. **Navigate to Project:**
   - Group: halo
   - Project: autos

3. **Create Labels:**
   - Settings → Labels
   - Add component, phase, status labels

4. **Create Milestones:**
   - Issues → Milestones
   - Add Phase 1, 2, 3, 4 milestones

5. **Configure Board:**
   - Issues → Boards
   - Add columns for workflow states

**Daily Usage:**

1. Check board for assigned issues
2. Pick next issue from "To Do"
3. Create feature branch
4. Develop and commit with issue reference
5. Push and create MR
6. Review and merge
7. Update board

---

### Additional Resources

**Complete Workflow Guide:**  
`docs/gitlab-workflow.md` - Comprehensive GitLab usage patterns

**Infrastructure Setup:**  
`docs/autos-infrastructure.md` - Git configuration and remotes

**Implementation Guide:**  
`docs/autos-implementation-guideline.md` - Phase-by-phase implementation with issue examples

**Transportation Portal Reference:**  
Study existing project at http://gitlab.minilab/halo/transportation-portal for established patterns

---

## Summary

GitLab integration provides:
- ✅ **Structured planning** via issues and milestones
- ✅ **Progress visibility** through boards and dashboards
- ✅ **Code quality** via merge request reviews
- ✅ **Traceability** linking requirements to deployed code
- ✅ **Collaboration** through comments and discussions
- ✅ **Documentation** version-controlled with code
- ✅ **Accountability** with clear ownership and history

All work on the AUTOS project flows through GitLab, ensuring transparency, quality, and maintainability throughout the development lifecycle.
