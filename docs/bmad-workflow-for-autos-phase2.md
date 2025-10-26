# Using BMAD for AUTOS Phase 2

**Document Type:** BMAD Integration Guide
**Created:** 2025-10-22
**Purpose:** Practical guide for using BMAD to plan and execute AUTOS Phase 2

---

## What is BMAD?

**BMAD** = **Build More, Architect Dreams**

BMAD is a methodology and toolset that emphasizes:
- **Architecture-first thinking** (Dream before Build)
- **Documentation-driven development** (Write the docs, then the code)
- **Modular design patterns** (Reusable components)
- **Professional project management** (Milestones, sprints, user stories)

---

## How BMAD Would Have Helped AUTOS Phase 1

### What Actually Happened (Ad-Hoc)
```
Code → Realize Problems → Refactor → Document → Test
```

### What BMAD Recommends
```
Dream (Architecture) → Design (Documentation) → Build (Code + Tests)
```

### Specific Examples

#### Example 1: State Management Crisis

**Ad-Hoc Approach (Actual):**
```
Week 1-4: Build components with basic state
Week 5: Realize components don't hydrate from URL ❌
Week 6: Emergency refactoring of all components
Week 7: Update StateManagementService
Week 8: Documentation of new patterns
Result: 3 weeks lost to refactoring
```

**BMAD Approach (Recommended):**
```
Week 0: Architecture Decision
  └─ ADR-001: Use URL as single source of truth
      - Define RouteStateService interface
      - Define StateManagementService patterns
      - Define component hydration strategy
      - Document in CLAUDE.md

Week 1-2: Implement core services with tests

Week 3+: Build components using established patterns
Result: No refactoring needed, consistent from day 1
```

#### Example 2: BaseDataTable Discovery

**Ad-Hoc Approach (Actual):**
```
Week 3-4: Build picker table (500 lines)
Week 5-6: Build results table (500 lines)
Week 7-8: Realize code duplication ❌
Week 9: Design BaseDataTable
Week 10: Implement BaseDataTable
Week 11: Migrate picker and results
Result: Built same thing twice, then migrated
```

**BMAD Approach (Recommended):**
```
Week 0: Component Design Phase
  └─ Identify: "We'll need multiple tables"
  └─ Design: BaseDataTableComponent (generic)
  └─ Document: Component API, usage patterns

Week 3: Implement BaseDataTable (300 lines)

Week 4: Build picker using BaseDataTable
Week 5: Build results using BaseDataTable
Result: 60% less code, consistent UX
```

---

## Using BMAD for Phase 2: Practical Steps

### Step 1: Install and Configure BMAD (Already Done ✅)

```bash
# Already installed at /home/odin/projects/autos/bmad
bmad --version
```

### Step 2: Create Phase 2 Architecture Document

**Use BMAD to generate:**

```bash
cd /home/odin/projects/autos

# Generate architecture document for Phase 2
bmad architect phase-2 \
  --input docs/user-stories/INDEX.md \
  --output docs/design/phase-2-architecture.md
```

**Or use Claude Code with BMAD context:**

```bash
# Tell Claude to use BMAD methodology
claude-code --context bmad plan "Phase 2 of AUTOS:
- Implement remaining Milestone 003 tasks
- Add PWA support
- Implement error boundary pattern
- Mobile optimization"
```

### Step 3: Dream Phase (Architecture Decisions)

**Create ADRs (Architecture Decision Records)**

```bash
# Create docs/design/adr/ directory
mkdir -p docs/design/adr

# Example ADR template
```

**ADR Template:**
```markdown
# ADR-005: [Decision Title]

**Date:** 2025-10-22
**Status:** Proposed | Accepted | Deprecated
**Context:** [What problem are we solving?]
**Decision:** [What did we decide?]
**Consequences:**
  - ✅ Benefits
  - ❌ Drawbacks
  - ⚠️ Risks
**Alternatives Considered:** [What else was considered?]
```

**Example ADRs for Phase 2:**

**ADR-005: Progressive Web App (PWA) Support**
```markdown
Context: Users want offline access and mobile app experience
Decision: Add Angular PWA support with service worker caching
Consequences:
  ✅ Offline functionality
  ✅ Installable on mobile
  ✅ Faster load times (cached assets)
  ❌ Increased complexity (cache invalidation)
  ⚠️ Service worker debugging can be tricky
```

**ADR-006: Error Boundary Pattern**
```markdown
Context: Need centralized error handling for production
Decision: Implement global ErrorHandler with categorization
Consequences:
  ✅ Consistent error UX
  ✅ Better logging and monitoring
  ✅ Prevents silent failures
  ❌ Requires error categorization logic
```

### Step 4: Design Phase (Documentation First)

**Before writing code, write:**

1. **Component API Documentation**
   ```typescript
   /**
    * ErrorBoundaryComponent - Global error handler
    *
    * Catches all unhandled errors and displays user-friendly messages
    *
    * @example
    * <app-error-boundary>
    *   <router-outlet></router-outlet>
    * </app-error-boundary>
    *
    * Features:
    * - Categorizes errors (Network, API, Client)
    * - Logs to monitoring service
    * - Shows retry button for recoverable errors
    * - Graceful degradation
    */
   ```

2. **User Stories (Already Done ✅)**
   - You have comprehensive user stories
   - Use these as specifications

3. **Test Specifications**
   ```typescript
   describe('ErrorBoundaryComponent', () => {
     it('should catch HTTP 500 errors and show retry button');
     it('should catch HTTP 404 errors and show helpful message');
     it('should catch network timeout and suggest checking connection');
     it('should log errors to monitoring service');
   });
   ```

4. **Migration Guides**
   - If changing existing components
   - Document before/after
   - Provide code examples

### Step 5: Build Phase (Code + Tests Together)

**BMAD-Style Implementation:**

```typescript
// 1. Write test first (TDD)
describe('GlobalErrorHandlerService', () => {
  it('should categorize HTTP 500 as server error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const category = service.categorizeError(error);
    expect(category).toBe(ErrorCategory.Server);
  });
});

// 2. Write minimal code to pass test
categorizeError(error: Error): ErrorCategory {
  if (error instanceof HttpErrorResponse) {
    if (error.status >= 500) return ErrorCategory.Server;
  }
  return ErrorCategory.Unknown;
}

// 3. Refactor and improve
// 4. Document patterns in CLAUDE.md
```

---

## BMAD Workflow for Each Feature

### Template: Adding a New Feature

```
┌─────────────────────────────────────────────────────┐
│ BMAD Feature Development Workflow                   │
└─────────────────────────────────────────────────────┘

Phase 1: DREAM (Architecture) - 10% of time
├─ 1. Review user story from backlog
├─ 2. Identify architectural decisions needed
├─ 3. Write ADR if significant decision
├─ 4. Design component interfaces
└─ 5. Document in design doc

Phase 2: DESIGN (Documentation) - 20% of time
├─ 1. Write component API documentation
├─ 2. Write test specifications
├─ 3. Define acceptance criteria
├─ 4. Create mockups (if UI component)
└─ 5. Review with team/Claude

Phase 3: BUILD (Implementation) - 70% of time
├─ 1. Write failing test (TDD)
├─ 2. Write minimal code to pass
├─ 3. Refactor for quality
├─ 4. Update CLAUDE.md
├─ 5. Integration tests
├─ 6. Manual testing
└─ 7. PR review and merge
```

---

## Example: Phase 2 Feature - ColumnManagerComponent

Let's walk through how to use BMAD for implementing ColumnManagerComponent (currently missing from Milestone 003).

### Phase 1: DREAM (Day 1 Morning)

**1. Review User Story**
- Epic 2, Story 2.2.3: Toggle Column Visibility
- Status: ❌ Not implemented
- Priority: Medium
- Story Points: 5

**2. Architecture Decision**
- Need drag-and-drop UI for column management
- Options: Custom drag-drop, NG-ZORRO Transfer, CDK Lists
- **Decision:** Use NG-ZORRO Transfer component (consistent with existing UI)

**3. Write ADR**
```markdown
# ADR-007: ColumnManagerComponent UI Pattern

Context: Need UI for users to show/hide and reorder columns
Decision: Use NG-ZORRO nz-transfer component with drag-drop
Consequences:
  ✅ Consistent with existing NG-ZORRO usage
  ✅ Built-in search/filter
  ✅ Accessible out of box
  ❌ Less customizable than custom implementation
  ⚠️ Must integrate with TableStatePersistenceService
```

**4. Design Component Interface**
```typescript
@Component({
  selector: 'app-column-manager',
  templateUrl: './column-manager.component.html'
})
export class ColumnManagerComponent {
  @Input() columns: TableColumn[] = [];
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() columnsChange = new EventEmitter<TableColumn[]>();

  // Methods
  onApply(): void;
  onReset(): void;
  onClose(): void;
}
```

### Phase 2: DESIGN (Day 1 Afternoon)

**1. Write Component Documentation**
```typescript
/**
 * ColumnManagerComponent - Manages table column visibility and order
 *
 * Provides a modal UI for users to:
 * - Toggle column visibility (show/hide)
 * - Reorder columns via drag-and-drop
 * - Search/filter column list
 * - Reset to default configuration
 *
 * @example
 * <app-column-manager
 *   [(visible)]="showColumnManager"
 *   [columns]="tableColumns"
 *   (columnsChange)="onColumnsUpdate($event)">
 * </app-column-manager>
 *
 * Integration:
 * - Works with BaseDataTableComponent
 * - Persists changes via TableStatePersistenceService
 * - Emits updated column configuration on apply
 *
 * Dependencies:
 * - NG-ZORRO nz-transfer component
 * - Angular CDK drag-drop (for reordering)
 */
```

**2. Write Test Specifications**
```typescript
describe('ColumnManagerComponent', () => {
  // Rendering tests
  it('should render transfer component with all columns');
  it('should show visible columns on right, hidden on left');
  it('should display column metadata (sortable, filterable icons)');

  // Interaction tests
  it('should move column from left to right on select');
  it('should search columns by name');
  it('should reset to original column order on reset button');
  it('should emit columnsChange on apply');

  // Validation tests
  it('should prevent hiding all columns (min 1 visible)');
  it('should validate column dependencies');

  // Integration tests
  it('should persist changes to localStorage via TableStatePersistenceService');
});
```

**3. Define Acceptance Criteria (from User Story)**
- [ ] "Manage Columns" button opens column manager
- [ ] Transfer component shows all columns with checkboxes
- [ ] Check/uncheck to show/hide columns
- [ ] Changes apply immediately
- [ ] Visibility state persists to localStorage
- [ ] At least one column must remain visible (validation)
- [ ] "Reset to Default" button restores original columns

**4. Create Mockup**
```
┌───────────────────────────────────────────────────┐
│ Manage Columns                            [X]     │
├───────────────────────────────────────────────────┤
│ Search: [_________________]                       │
├───────────────────────────────────────────────────┤
│ Hidden Columns     │  Visible Columns             │
│                    │                              │
│ ☐ Body Class       │  ☑ Manufacturer    [sortable]│
│ ☐ Data Source      │  ☑ Model          [sortable]│
│                    │  ☑ Year           [sortable]│
│                    │  ☑ Vehicle ID                │
│                    │                              │
├───────────────────────────────────────────────────┤
│        [Reset to Default]  [Cancel]  [Apply]      │
└───────────────────────────────────────────────────┘
```

### Phase 3: BUILD (Day 2-3)

**Day 2: TDD Implementation**

```typescript
// Step 1: Write failing test
it('should move column from hidden to visible on select', () => {
  const hiddenColumn = component.columns.find(c => !c.visible);
  component.onColumnSelect(hiddenColumn);
  expect(hiddenColumn.visible).toBe(true);
});

// Step 2: Write minimal code
onColumnSelect(column: TableColumn): void {
  column.visible = !column.visible;
}

// Step 3: Refactor
onColumnSelect(column: TableColumn): void {
  if (!column.hideable) return; // Can't hide required columns

  const visibleCount = this.columns.filter(c => c.visible).length;
  if (column.visible && visibleCount <= 1) {
    // Can't hide last visible column
    this.showError('At least one column must be visible');
    return;
  }

  column.visible = !column.visible;
  this.cdr.markForCheck();
}
```

**Day 3: Integration and Polish**
- Connect to TableStatePersistenceService
- Add animations
- Manual testing
- Update CLAUDE.md with usage patterns

---

## BMAD Command Reference

### Architecture Commands

```bash
# Generate architecture document
bmad architect <feature-name>

# Example: Plan error boundary pattern
bmad architect error-boundary \
  --context docs/user-stories/EPIC-5-user-experience.md \
  --output docs/design/error-boundary-architecture.md
```

### Documentation Commands

```bash
# Generate component documentation
bmad docs component <component-name>

# Generate API documentation
bmad docs api

# Generate user guide
bmad docs guide
```

### Scaffolding Commands

```bash
# Generate component with tests
bmad generate component <name> \
  --with-tests \
  --pattern adapter

# Generate service with interface
bmad generate service <name> \
  --interface
```

---

## Integration with Claude Code

### Using Claude with BMAD Context

```typescript
// In VS Code, ask Claude:
"Using BMAD methodology, help me plan the implementation of
ColumnManagerComponent from EPIC-2-data-visualization.md story 2.2.3"

// Claude will:
// 1. Read the user story
// 2. Propose architecture (ADR)
// 3. Draft component interface
// 4. Write test specifications
// 5. Generate implementation plan
```

### BMAD + Claude Workflow

```
1. You: "I want to implement PWA support"
   ↓
2. Claude: "Let me use BMAD to plan this..."
   ├─ Reads user story (EPIC-5)
   ├─ Proposes ADR-008
   ├─ Designs service worker strategy
   └─ Creates implementation checklist
   ↓
3. You: "Approved, let's build it"
   ↓
4. Claude: "Starting with tests..."
   ├─ Writes test specifications
   ├─ Implements service worker
   ├─ Updates CLAUDE.md
   └─ Verifies against acceptance criteria
```

---

## Checklist: Starting Phase 2 with BMAD

### Week 0: Planning (BMAD Dream Phase)

- [ ] Review Phase 1 retrospective (retrospective-project-timeline.md)
- [ ] Review backlog user stories (docs/user-stories/INDEX.md)
- [ ] Prioritize features for Phase 2 (MoSCoW method)
- [ ] Create Milestone 6-10 definitions
- [ ] Write ADRs for major architecture decisions
- [ ] Set up Phase 2 documentation structure

### Week 1: Architecture (BMAD Design Phase)

- [ ] Design new components before implementation
- [ ] Write component API documentation
- [ ] Define test specifications
- [ ] Create mockups/wireframes for UI changes
- [ ] Update architecture diagrams
- [ ] Review with team/stakeholders

### Week 2+: Implementation (BMAD Build Phase)

- [ ] Work in feature branches
- [ ] TDD: Write tests first
- [ ] Implement to pass tests
- [ ] Code reviews via PRs
- [ ] Update CLAUDE.md as patterns emerge
- [ ] Run automated tests on CI/CD
- [ ] Merge to main when done

---

## Summary: BMAD for AUTOS

**Key Principles:**
1. **Dream before Build** - Architecture decisions upfront
2. **Document before Code** - API docs, tests, acceptance criteria
3. **Test alongside Code** - TDD approach
4. **Iterate with Structure** - Sprints, milestones, retrospectives

**Benefits for Phase 2:**
- ✅ No major refactoring (design upfront)
- ✅ Consistent architecture (documented patterns)
- ✅ High code quality (tests from day 1)
- ✅ Clear progress (milestones and user stories)
- ✅ Easy onboarding (comprehensive documentation)

**Next Steps:**
1. Read retrospective-project-timeline.md (this explains what happened vs what could have happened)
2. Use this document (bmad-workflow-for-autos-phase2.md) as guide for Phase 2
3. Start Phase 2 planning with BMAD Dream phase

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Related Docs:**
- retrospective-project-timeline.md (historical analysis)
- docs/user-stories/ (feature specifications)
- docs/design/ (architecture documents)
