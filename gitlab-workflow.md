# AUTOS Project - GitLab Workflow Guide

**Project:** AUTOS - Automotive Vehicle Database  
**Repository:** http://gitlab.minilab/halo/autos  
**Created:** 2025-10-11  
**Purpose:** Define GitLab integration patterns and workflow conventions

---

## Quick Reference

**Repository:** http://gitlab.minilab/halo/autos  
**Boards:** http://gitlab.minilab/halo/autos/-/boards  
**Issues:** http://gitlab.minilab/halo/autos/-/issues  
**Merge Requests:** http://gitlab.minilab/halo/autos/-/merge_requests

---

## Repository Structure

```
/autos
├── backend/              # Node.js + Express API
├── frontend/             # Angular 14 application
├── data/                 # ETL scripts and sample data
│   └── scripts/          # Python data ingestion
├── k8s/                  # Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── ingress.yaml
└── docs/                 # Project documentation
    ├── reqs/             # Requirements documents (REQ-YYYY-NNN.md)
    ├── crs/              # Change requests (CR-YYYY-NNN.md)
    ├── plans/            # Project plans (PP-*.md)
    ├── architecture/     # Technical architecture docs
    └── gitlab-workflow.md # This file
```

---

## Issue Management

### Creating Issues

**From Web UI:**
1. Navigate to **Issues** → **New Issue**
2. Fill in:
   - **Title:** `[Component] Brief description`
   - **Description:** Use issue template (see below)
   - **Labels:** Select appropriate labels
   - **Milestone:** Assign to phase milestone
   - **Assignee:** Assign to yourself or team member
   - **Weight:** Optional (Fibonacci: 1, 2, 3, 5, 8, 13 points)

**Issue Title Format:**
```
[Component] Brief description of work

Examples:
[ETL] Create autos-unified Elasticsearch index
[Backend] Implement /api/v1/manufacturer-model-combinations endpoint
[Frontend] Build vehicle picker table component
[K8s] Deploy backend to autos namespace
[Docs] Add picker component requirements document
```

### Issue Template

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
- Documentation: `docs/reqs/REQ-YYYY-NNN.md`

## Estimated Effort
X hours / Y days
```

**Example Issue:**

```markdown
## Description
Create Elasticsearch index with proper mappings for automotive vehicle data from NHTSA vPIC API.

## Acceptance Criteria
- [ ] Index `autos-unified` exists in Elasticsearch
- [ ] Schema includes manufacturer, model, year, body_style fields
- [ ] Index health is GREEN
- [ ] Sample query returns results
- [ ] Documentation updated with index structure

## Technical Notes
- Use Python script with elasticsearch-py client
- Reference Transportation Portal index as pattern
- Run script inside containerized environment (no host packages)
- Index URL: http://elasticsearch.data.svc.cluster.local:9200

## Related
- Blocks: #4 (data loading requires index)
- Documentation: `docs/autos-data-sources-model.md`

## Estimated Effort
2 hours
```

---

## Issue Labels

### Component Labels

**Purpose:** Identify which part of the codebase is affected

| Label | Description | Color |
|-------|-------------|-------|
| `backend` | Node.js + Express API work | Blue (#1E88E5) |
| `frontend` | Angular 14 UI work | Green (#43A047) |
| `etl` | Data ingestion / Python scripts | Purple (#8E24AA) |
| `k8s` | Kubernetes deployment | Orange (#FB8C00) |
| `docs` | Documentation updates | Gray (#757575) |
| `infrastructure` | Cluster/platform work | Red (#E53935) |

### Phase Labels

**Purpose:** Track work by implementation phase

| Label | Description | Color |
|-------|-------------|-------|
| `phase-1-mvp` | Data Foundation | Cyan (#00ACC1) |
| `phase-2` | Backend API | Teal (#00897B) |
| `phase-3` | Frontend Picker | Lime (#C0CA33) |
| `phase-4` | K8s Deployment | Amber (#FFB300) |

### Status Labels

**Purpose:** Indicate current state of work

| Label | Description | Color |
|-------|-------------|-------|
| `blocked` | Cannot proceed (dependency issue) | Red (#D32F2F) |
| `in-progress` | Actively being worked on | Yellow (#FBC02D) |
| `needs-review` | Code complete, awaiting review | Orange (#F57C00) |
| `ready-to-merge` | Approved, ready to merge | Green (#388E3C) |

### Persona Labels

**Purpose:** Track features by target user persona

| Label | Description | Color |
|-------|-------------|-------|
| `motor-head` | Hard-core enthusiast features | Dark Blue (#1565C0) |
| `jr-motor-head` | Learning enthusiast features | Light Blue (#42A5F5) |
| `investor` | Collector/investor features | Gold (#FFD54F) |
| `consumer` | General consumer features | Indigo (#3F51B5) |

### Priority Labels

**Purpose:** Indicate urgency/importance

| Label | Description |
|-------|-------------|
| `priority-critical` | Must be done immediately |
| `priority-high` | Should be done soon |
| `priority-medium` | Normal priority |
| `priority-low` | Can wait |

---

## Milestones

### Phase Structure

**Milestone: Phase 1 - Data Foundation**
- **Duration:** 2-3 days
- **Goal:** Elasticsearch index created and populated with sample NHTSA data
- **Issues:** #1-#5
- **Deliverables:**
  - `autos-unified` index in Elasticsearch
  - 50-100 sample vehicle records
  - Working aggregation queries
  - ETL container built and documented

**Milestone: Phase 2 - Backend API**
- **Duration:** 3-4 days
- **Goal:** REST API endpoints serving vehicle data
- **Issues:** #6-#10
- **Deliverables:**
  - `/api/v1/manufacturer-model-combinations` endpoint
  - API health checks
  - Error handling
  - Backend deployed to K8s

**Milestone: Phase 3 - Frontend Picker**
- **Duration:** 4-5 days
- **Goal:** Vehicle picker table component functional
- **Issues:** #11-#18
- **Deliverables:**
  - Picker table component
  - Checkbox selection logic
  - State management integration
  - Responsive UI

**Milestone: Phase 4 - K8s Deployment**
- **Duration:** 2 days
- **Goal:** Full application deployed to production
- **Issues:** #19-#22
- **Deliverables:**
  - Frontend + backend in `autos` namespace
  - Ingress configured
  - DNS entries added
  - Health monitoring enabled

---

## Branch Strategy

### Branch Naming Convention

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

### Workflow Steps

**1. Start New Work:**
```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/3-elasticsearch-index
```

**2. Develop and Commit:**
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

**3. Push to GitLab:**
```bash
git push origin feature/3-elasticsearch-index
```

**4. Create Merge Request (in GitLab UI)**

**5. After Merge:**
```bash
# Switch back to main
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/3-elasticsearch-index
```

---

## Commit Message Convention

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(picker): Add manufacturer selection` |
| `fix` | Bug fix | `fix(api): Correct aggregation query` |
| `docs` | Documentation only | `docs(reqs): Add picker requirements` |
| `style` | Code style changes (formatting) | `style(frontend): Fix indentation` |
| `refactor` | Code refactoring | `refactor(backend): Extract ES service` |
| `test` | Add or update tests | `test(picker): Add selection logic tests` |
| `chore` | Build/tooling changes | `chore(deps): Update Angular to 14.3` |

### Scope

Component or module affected: `etl`, `backend`, `frontend`, `k8s`, `docs`, `api`, `picker`, `service`

### Subject

- First line: 50 characters or less
- Imperative mood ("Add feature" not "Added feature")
- No period at end
- Capitalize first letter

### Body

- Wrap at 72 characters
- Explain **what** and **why**, not **how**
- Separate from subject with blank line
- Use bullet points for multiple items

### Footer

- Reference issues: `Closes #3`, `Fixes #7`, `Related: #5, #8`
- Breaking changes: `BREAKING CHANGE: API endpoint renamed`

### Example Commit

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

## Merge Request Process

### Creating a Merge Request

**Via GitLab UI:**

1. Navigate to **Merge Requests** → **New merge request**
2. **Source branch:** `feature/3-elasticsearch-index`
3. **Target branch:** `main`
4. **Title:** Same as issue title (e.g., `[ETL] Create autos-unified Elasticsearch index`)
5. **Description:** Use template below
6. **Assignee:** Assign to yourself
7. **Reviewer:** Assign reviewer if team member available
8. **Milestone:** Same as related issue
9. **Labels:** Same as related issue
10. Click **Create merge request**

### MR Description Template

```markdown
## Summary
Brief description of changes in this MR.

## Changes
- Bullet point 1: Specific change made
- Bullet point 2: Another change
- Bullet point 3: Additional modifications

## Testing
- [ ] Unit tests pass (if applicable)
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Documentation updated
- [ ] Container builds successfully (if backend/frontend)

## Screenshots
(If UI changes, include before/after screenshots)

## Deployment Notes
Any special deployment considerations:
- Environment variables needed
- Database migrations required
- Configuration changes

## Closes
Closes #3
Related: #4, #5
```

### Review Checklist

**Before requesting review:**
- [ ] Code follows project style guidelines
- [ ] Self-review completed (read your own diff)
- [ ] No debugging code (console.logs, commented code)
- [ ] Tests added/updated (if applicable)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No merge conflicts with main

**Reviewer checks:**
- [ ] Code is readable and maintainable
- [ ] Logic is sound
- [ ] No obvious bugs
- [ ] Tests are adequate
- [ ] Documentation is clear

### Merging

**When ready:**
1. Ensure all discussions resolved
2. Ensure CI passes (if configured)
3. Click **Merge** button
4. **Delete source branch** checkbox: ✓
5. Merge strategy: **Merge commit** (default)

**After merge:**
- Issue auto-closes if "Closes #N" in MR description
- Feature branch deleted automatically
- Update local main: `git checkout main && git pull`

---

## GitLab Boards

### Kanban Board Setup

**Board Columns:**

1. **Open** - Backlog (all new issues)
2. **To Do** - Prioritized for current phase
3. **In Progress** - Actively being worked (label: `in-progress`)
4. **Review** - Code review needed (label: `needs-review`)
5. **Done** - Completed and merged

**Usage:**
- Drag issues between columns
- Filter by milestone (e.g., "Phase 1")
- Filter by label (e.g., `backend`)
- Track progress visually

**Board URL:** http://gitlab.minilab/halo/autos/-/boards

---

## Integration with Documentation

### Requirements → Issues → Code → Merge

**Complete Flow:**

1. **Document Requirement**
   - Create `docs/reqs/REQ-2025-001-picker-component.md`
   - Commit to main
   ```bash
   git add docs/reqs/REQ-2025-001-picker-component.md
   git commit -m "docs(reqs): Add picker component requirements"
   git push origin main
   ```

2. **Create GitLab Issues**
   - Break requirement into implementable tasks
   - Create issues: #11, #12, #13, etc.
   - Reference requirement doc in issue descriptions
   - Link: `Documentation: docs/reqs/REQ-2025-001-picker-component.md`

3. **Implement Features**
   - Create feature branch for each issue
   - Develop solution
   - Commit with issue reference: `Related: #11`
   - Push and create MR

4. **Update Documentation**
   - If implementation differs from spec, update requirement doc
   - Include doc updates in same MR as code changes
   - Mention in MR description: "Updates REQ-2025-001 based on implementation"

5. **Close Loop**
   - MR merged → Issue auto-closes
   - Documentation reflects reality
   - Next issue can proceed

### Documentation Structure

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
├── gitlab-workflow.md             # This file
├── autos-infrastructure.md        # Infrastructure guide
└── autos-implementation-guideline.md  # Implementation steps
```

### Linking Docs in Issues

**In Issue Description:**
```markdown
## Related Documentation
- Requirements: [REQ-2025-002](../blob/main/docs/reqs/REQ-2025-002-picker-component.md)
- Architecture: [Picker Design](../blob/main/docs/architecture/picker-design.md)
- API Spec: [API Design](../blob/main/docs/architecture/api-design.md)
```

### Linking Docs in Code

**In source code comments:**
```typescript
/**
 * Vehicle picker table component
 * 
 * Displays manufacturer-model combinations with linked checkbox behavior.
 * 
 * @see docs/reqs/REQ-2025-002-picker-component.md for requirements
 * @see GitLab Issue #11
 */
export class VehiclePickerComponent { }
```

---

## Best Practices

### DO ✅

- **Create issue before starting work** - Every piece of work should have an issue
- **Reference issue numbers in commits** - Use `Closes #N` or `Related: #N`
- **Use meaningful branch names** - `feature/11-picker-table` not `feature/stuff`
- **Write clear MR descriptions** - Explain what and why
- **Update documentation in same MR** - Keep docs in sync with code
- **Close issues when work complete** - Don't leave orphaned issues
- **Add labels and milestones** - Makes filtering and tracking easier
- **Self-review before requesting review** - Read your own diff carefully
- **Keep commits atomic** - One logical change per commit
- **Write descriptive commit messages** - Future you will thank you

### DON'T ❌

- **Commit directly to main** - Always use feature branches
- **Create MRs without linked issues** - Work should be tracked
- **Leave issues open after merge** - Close them explicitly or with "Closes #N"
- **Use vague commit messages** - "fix stuff" tells nobody anything
- **Mix unrelated changes in one MR** - Keep MRs focused
- **Skip documentation updates** - Outdated docs are worse than no docs
- **Ignore merge conflicts** - Resolve properly, don't just accept theirs/yours
- **Force push to shared branches** - Only force push to your own feature branches
- **Delete branches with unmerged work** - Ensure work is merged first

---

## Example Workflows

### Workflow 1: Implementing a New Feature

```bash
# 1. Create GitLab issue (via web UI)
#    Issue #11: [Frontend] Build vehicle picker table component

# 2. Create feature branch
git checkout main
git pull origin main
git checkout -b feature/11-vehicle-picker-table

# 3. Develop feature
# ... create component files, write code ...

# 4. Commit incrementally
git add frontend/src/app/shared/components/vehicle-picker/
git commit -m "feat(picker): Create vehicle picker table component

- Add component structure with NG-ZORRO table
- Implement manufacturer-model display
- Add basic styling

Related: #11"

# 5. Continue development
# ... implement checkbox logic ...

git add frontend/src/app/shared/components/vehicle-picker/
git commit -m "feat(picker): Add linked checkbox selection logic

- Clicking manufacturer selects all models
- Clicking model toggles individual selection
- State stored in Set<string>

Related: #11"

# 6. Push to GitLab
git push origin feature/11-vehicle-picker-table

# 7. Create MR in GitLab UI
#    Title: [Frontend] Build vehicle picker table component
#    Description: "Closes #11"

# 8. After review and approval, merge MR

# 9. Clean up
git checkout main
git pull origin main
git branch -d feature/11-vehicle-picker-table
```

### Workflow 2: Fixing a Bug

```bash
# 1. Create bug issue (if not already exists)
#    Issue #15: [Backend] Manufacturer filter returns incorrect results

# 2. Create bugfix branch
git checkout -b bugfix/15-manufacturer-filter

# 3. Fix bug
# ... modify backend/src/services/vehicle.service.js ...

git commit -m "fix(backend): Correct manufacturer filter aggregation

Problem: Query used term instead of match for manufacturer field
Solution: Changed to match query with keyword subfield

Fixes #15"

# 4. Push and create MR
git push origin bugfix/15-manufacturer-filter
# Create MR with "Fixes #15"

# 5. Merge and clean up
```

### Workflow 3: Updating Documentation

```bash
# 1. Create docs issue
#    Issue #20: [Docs] Document picker component API

# 2. Create docs branch
git checkout -b docs/20-picker-api

# 3. Update documentation
# ... edit docs/architecture/picker-design.md ...

git commit -m "docs(architecture): Document picker component API

- Add component interface details
- Document input/output properties
- Add usage examples
- Include state management integration

Closes #20"

# 4. Push and merge
git push origin docs/20-picker-api
# Create MR, merge
```

---

## GitLab Configuration

### Creating Labels (First Time Setup)

Navigate to **Settings** → **Labels** and create the labels listed in the "Issue Labels" section above.

### Creating Milestones

Navigate to **Issues** → **Milestones** → **New milestone**

Create milestones for each phase (listed in "Milestones" section).

### Board Configuration

Navigate to **Issues** → **Boards** → **Create new board**

Add columns based on status labels:
- Open (default)
- To Do
- In Progress (`in-progress` label)
- Review (`needs-review` label)
- Done (closed issues)

---

## CI/CD Integration (Future)

**Status:** Not implemented in MVP

**Planned for Phase 2:**
- `.gitlab-ci.yml` for automated testing
- GitLab Runner integration with K3s cluster
- Automated container builds on merge to main
- Automated deployment to staging namespace
- Manual approval for production deploy

**Current Approach:**
- Manual Podman builds on Thor
- Manual K3s import and deployment
- Documented in `autos-infrastructure.md`

---

## Troubleshooting

### Issue not auto-closing on MR merge

**Problem:** Merged MR but issue still open

**Solution:**
- Ensure MR description or commit message contains `Closes #N`
- Check that issue number is correct
- Manually close issue if auto-close failed

### Can't push to branch

**Problem:** `git push` rejected

**Possible causes:**
- Branch protection rules on `main` (working as intended - use feature branches)
- Authentication issue (check Git credentials)
- Merge conflicts (pull and resolve)

### Lost work on feature branch

**Problem:** Accidentally deleted branch before merge

**Solution:**
- Check GitLab MR list - if MR exists, branch is preserved
- Use `git reflog` to find commit SHA
- Create new branch from that commit: `git checkout -b recovery-branch <sha>`

---

## Questions & Support

**GitLab Documentation:** https://docs.gitlab.com  
**Project Repository:** http://gitlab.minilab/halo/autos  
**Infrastructure Docs:** `docs/autos-infrastructure.md`  
**Implementation Guide:** `docs/autos-implementation-guideline.md`

---

**Last Updated:** 2025-10-11  
**Maintained By:** AUTOS Development Team  
**Version:** 1.0
