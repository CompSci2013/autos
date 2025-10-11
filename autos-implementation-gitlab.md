## 📋 GitLab Workflow Integration

### Creating Issues from Implementation Steps

Each implementation phase should have corresponding GitLab issues for tracking progress and enabling collaboration.

---

### Phase 1: Data Foundation - Issue Breakdown

**Milestone:** Phase 1 - Data Foundation

**Epic/Parent Issue:**
```markdown
Title: [Phase 1] Data Foundation - Elasticsearch Index and Sample Data
Labels: phase-1-mvp, etl
Milestone: Phase 1 - Data Foundation

## Description
Create Elasticsearch index with proper mappings and load sample NHTSA vehicle data for testing.

## Child Issues
- #1: Research NHTSA vPIC API data structure
- #2: Create Python ETL container Dockerfile
- #3: Write create_autos_index.py script
- #4: Fetch and load sample NHTSA data (100 vehicles)
- #5: Verify data in Elasticsearch with queries

## Success Criteria
- [ ] autos-unified index exists (GREEN health)
- [ ] 50-100 sample vehicles loaded
- [ ] Aggregation queries return correct results
- [ ] ETL container documented
```

**Individual Issues:**

**Issue #1:** Research NHTSA vPIC API
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

**Issue #2:** Create ETL Container
```markdown
Title: [ETL] Create Python ETL container Dockerfile
Labels: etl, phase-1-mvp
Milestone: Phase 1
Weight: 1

## Description
Build Dockerf for Python ETL container with elasticsearch-py and requests dependencies.

## Acceptance Criteria
- [ ] Dockerfile created in data/scripts/
- [ ] requirements.txt with dependencies
- [ ] Container builds successfully with Podman
- [ ] Can execute Python scripts inside container
- [ ] No host packages required

## Technical Notes
- Base image: python:3.11-slim
- Dependencies: elasticsearch-py, requests
- Follow Halo Labs minimal footprint pattern
- Reference: Transportation Portal ETL container

## Related
- Blocked by: #1
- Blocks: #3, #4
- Infrastructure: docs/autos-infrastructure.md

## Estimated Effort
1 hour
```

**Issue #3:** Create Index Script
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

**Issue #4:** Load Sample Data
```markdown
Title: [ETL] Fetch and load sample NHTSA data
Labels: etl, phase-1-mvp
Milestone: Phase 1
Weight: 5

## Description
Create script to fetch 50-100 vehicles from NHTSA API and load into Elasticsearch.

## Acceptance Criteria
- [ ] Script fetches data from NHTSA vPIC API
- [ ] Transforms data to match index schema
- [ ] Loads 50-100 sample records
- [ ] Records queryable in Elasticsearch
- [ ] Data quality validated
- [ ] Script documented

## Technical Notes
- API endpoints from Issue #1 research
- Transform NHTSA format to our schema
- Handle API rate limits
- Log progress during load
- Verify data after load

## Related
- Blocked by: #3
- Blocks: #5
- Documentation: docs/autos-data-sources-model.md

## Estimated Effort
3 hours
```

**Issue #5:** Verify Data
```markdown
Title: [ETL] Verify data in Elasticsearch with queries
Labels: etl, phase-1-mvp, testing
Milestone: Phase 1
Weight: 2

## Description
Run aggregation queries to verify data loaded correctly and index is functioning.

## Acceptance Criteria
- [ ] Count query returns correct total
- [ ] Aggregation by manufacturer works
- [ ] Aggregation by model works
- [ ] Sample search queries return results
- [ ] No data quality issues found
- [ ] Query examples documented

## Technical Notes
- Use curl or Kibana Dev Tools
- Test queries from docs/autos-data-sources-model.md
- Verify aggregations for picker endpoint
- Document any data issues found

## Related
- Blocked by: #4
- Completes: Phase 1 milestone
- Documentation: docs/autos-implementation-guideline.md

## Estimated Effort
1 hour
```

---

### Phase 2: Backend API - Issue Breakdown

**Milestone:** Phase 2 - Backend API

**Issue Examples:**

**Issue #6:** Implement Combinations Endpoint
```markdown
Title: [Backend] Implement /api/v1/manufacturer-model-combinations endpoint
Labels: backend, phase-2, api
Milestone: Phase 2
Weight: 5

## Description
Create REST API endpoint that returns manufacturer-model combinations from Elasticsearch.

## Acceptance Criteria
- [ ] Endpoint responds at /api/v1/manufacturer-model-combinations
- [ ] Elasticsearch aggregation query implemented
- [ ] Pagination support (page, size params)
- [ ] Search filtering capability
- [ ] Returns JSON with manufacturer, model, count
- [ ] Error handling implemented
- [ ] Endpoint tested with curl

## Technical Notes
- Route: backend/src/routes/vehicle.routes.js
- Controller: backend/src/controllers/vehicle.controller.js
- Service: backend/src/services/elasticsearch.service.js
- Reference: Transportation Portal patterns

## Related
- Blocked by: #5 (needs data in ES)
- Blocks: #11 (frontend picker needs this API)
- Documentation: docs/autos-data-sources-model.md

## Estimated Effort
4 hours
```

---

### Phase 3: Frontend Picker - Issue Breakdown

**Issue #11:** Build Picker Component
```markdown
Title: [Frontend] Build vehicle picker table component
Labels: frontend, phase-3
Milestone: Phase 3
Weight: 8

## Description
Create Angular component for manufacturer-model picker with linked checkbox behavior.

## Acceptance Criteria
- [ ] Component created in shared/components/
- [ ] NG-ZORRO table displays data
- [ ] Manufacturer checkboxes select all models
- [ ] Model checkboxes toggle individually
- [ ] Selection state managed correctly
- [ ] Apply button emits selections
- [ ] Component styled and responsive

## Technical Notes
- Component: frontend/src/app/shared/components/vehicle-picker/
- Use NG-ZORRO table module
- Follow Transportation Portal picker patterns
- State stored in Set<string>

## Related
- Blocked by: #6 (needs API endpoint)
- Documentation: docs/autos-personas-features.md
- Design: docs/reqs/REQ-2025-002-picker-component.md

## Estimated Effort
6 hours
```

---

### Creating Issues in GitLab

**Via Web UI:**

1. Navigate to http://gitlab.minilab/halo/autos/-/issues
2. Click **New issue**
3. Copy/paste issue template from above
4. Select appropriate labels
5. Assign to milestone
6. Set weight (optional)
7. Assign to yourself
8. Click **Create issue**

**Best Practices:**

- Create all Phase 1 issues before starting work
- Reference issue numbers in commits: `Related: #3`
- Close issues with: `Closes #3` in commit message or MR description
- Update issue descriptions if requirements change
- Add comments to issues as work progresses

---

### Branch Creation from Issues

**Pattern:**
```bash
# For Issue #3
git checkout -b feature/3-create-index-script

# For Issue #11
git checkout -b feature/11-vehicle-picker

# For bugfix on Issue #15
git checkout -b bugfix/15-manufacturer-filter
```

**Commit Pattern:**
```bash
git commit -m "feat(etl): Create Elasticsearch index script

- Implement create_autos_index.py
- Define vehicle mappings
- Add error handling

Related: #3"
```

**Push and Create MR:**
```bash
git push gitlab feature/3-create-index-script
# Then create MR in GitLab UI with "Closes #3"
```

---

### Tracking Progress

**GitLab Board View:**
- Navigate to http://gitlab.minilab/halo/autos/-/boards
- Drag issues between columns:
  - **Open** → **To Do** → **In Progress** → **Review** → **Done**
- Filter by milestone to see phase progress
- Filter by label to see component-specific work

**Milestone View:**
- Navigate to http://gitlab.minilab/halo/autos/-/milestones
- See percentage complete
- View open vs closed issues
- Track blockers

---

### Issue Dependencies

**Visualizing Dependencies:**

```
Phase 1 Dependency Chain:
#1 (Research) → #2 (Container) → #3 (Index Script) → #4 (Load Data) → #5 (Verify)

Phase 2 depends on Phase 1:
#5 (Verify) → #6 (Backend API)

Phase 3 depends on Phase 2:
#6 (Backend API) → #11 (Frontend Picker)
```

**Managing Blocked Issues:**
- Add `blocked` label
- Reference blocking issue: "Blocked by: #3"
- Don't start work until blocker resolved
- Update status when unblocked

---

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

---

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

### Issue Templates (To Create in GitLab)

**Feature Template:**
```markdown
## Description
Brief description of what needs to be done and why.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes
Implementation details, dependencies, references

## Related
- Blocks: #X
- Blocked by: #Y
- Documentation: path/to/doc.md

## Estimated Effort
X hours
```

**Bug Template:**
```markdown
## Bug Description
What's wrong and how to reproduce

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Environment
- Component: Backend/Frontend/ETL
- Browser: (if applicable)
- Error messages: (if any)

## Related
- Caused by: #X
- Fixes: #Y
```

---

### Summary: GitLab Integration Benefits

**For AUTOS Project:**

✅ **Traceability:** Every code change linked to an issue  
✅ **Collaboration:** Team members can see progress in real-time  
✅ **Documentation:** Issues serve as implementation log  
✅ **Planning:** Milestones show phase progress  
✅ **Quality:** Code review via Merge Requests  
✅ **Accountability:** Clear assignment and ownership  
✅ **History:** Full audit trail of decisions and changes  

**Integration Points:**

1. **Issues** ↔ **Implementation Steps** (this guide)
2. **Branches** ↔ **Issues** (naming convention)
3. **Commits** ↔ **Issues** (references in messages)
4. **Merge Requests** ↔ **Issues** (auto-close on merge)
5. **Milestones** ↔ **Phases** (progress tracking)
6. **Documentation** ↔ **Repository** (version controlled)

---

**For complete GitLab workflow details, see:** `docs/gitlab-workflow.md`
