# Epic 4: Workspace Customization (Workshop Page)

**Epic ID:** EPIC-4
**Epic Owner:** UX Lead
**Status:** Complete
**Priority:** Medium
**Business Value:** Power users can create personalized dashboards for efficient workflows

---

## Epic Description

Provide an experimental "Workshop" page where users can customize their workspace using a draggable grid layout. Users can arrange panels (picker, results table) in their preferred layout, resize panels, and collapse sections for focused work.

**Success Metrics:**
- 30% of power users adopt workshop page
- Average 3+ layout customizations per user
- Layout preferences persist across sessions

---

## Feature 4.1: Grid-Based Layout System

### Story 4.1.1: Implement Draggable Grid Layout

**As a** power user,
**I want** to drag and drop panels to arrange my workspace,
**So that** I can optimize my workflow layout.

**Priority:** High
**Story Points:** 13
**Sprint:** Sprint 15

#### Acceptance Criteria
- [ ] Uses angular-gridster2 for grid system
- [ ] 12-column grid with flexible rows
- [ ] Panels draggable by header/drag handle
- [ ] Real-time visual feedback during drag
- [ ] Panels snap to grid positions
- [ ] Collision detection prevents overlap
- [ ] Smooth animations (250ms)

#### Technical Notes
- Component: `WorkshopComponent`
- Grid config: 12 cols, 50px row height, 16px gap
- Drag handle class: `drag-handler`

#### Definition of Done
- [ ] Works on desktop and tablet
- [ ] Performance: 60fps during drag
- [ ] No layout shifts after drag complete

---

### Story 4.1.2: Resize Panels

**As a** power user,
**I want** to resize panels by dragging edges,
**So that** I can allocate more space to important sections.

**Priority:** Medium
**Story Points:** 5
**Sprint:** Sprint 15

#### Acceptance Criteria
- [ ] Resize handles on panel edges
- [ ] Visual feedback during resize
- [ ] Minimum size constraints (prevent too small)
- [ ] Snaps to grid units
- [ ] Other panels adjust automatically

#### Technical Notes
- Gridster config: `resizable: { enabled: true }`
- Min size: 4 cols × 4 rows

#### Definition of Done
- [ ] Resize smooth (no jank)
- [ ] Works with drag simultaneously

---

### Story 4.1.3: Default Layout

**As a** new user,
**I want** a sensible default layout when I first visit the workshop,
**So that** I can start using it immediately without configuration.

**Priority:** High
**Story Points:** 2
**Sprint:** Sprint 15

#### Acceptance Criteria
- [ ] Default: Picker panel (12 cols × 16 rows) on top
- [ ] Default: Results panel (12 cols × 14 rows) below
- [ ] Both panels full-width
- [ ] Stack vertically on mobile

#### Technical Notes
```typescript
dashboard: [
  { cols: 12, rows: 16, y: 0, x: 0 }, // Picker
  { cols: 12, rows: 14, y: 16, x: 0 }  // Results
]
```

#### Definition of Done
- [ ] Documented in user guide
- [ ] Preview screenshot available

---

## Feature 4.2: Panel Management

### Story 4.2.1: Collapsible Panels

**As a** power user,
**I want** to collapse panels I'm not currently using,
**So that** I can focus on specific tasks and reduce clutter.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 16

#### Acceptance Criteria
- [ ] Collapse/expand icon in panel header
- [ ] Collapse hides panel content (keeps header)
- [ ] Expand restores content
- [ ] Collapse state persists to localStorage
- [ ] Multiple panels can be collapsed

#### Technical Notes
- Uses NG-ZORRO `nz-collapse`
- Stores state: `autos-workshop-collapse-states`

#### Definition of Done
- [ ] Smooth animation (300ms)
- [ ] Icon rotates to indicate state

---

### Story 4.2.2: Panel Labels/Titles

**As a** power user,
**I want** clear labels on each panel,
**So that** I understand what each section contains.

**Priority:** Low
**Story Points:** 1
**Sprint:** Sprint 16

#### Acceptance Criteria
- [ ] Panel headers show: "Manufacturer/Model Picker", "Vehicle Results"
- [ ] Labels styled consistently
- [ ] Optional: Icons next to labels

#### Technical Notes
- Simple text in panel header

#### Definition of Done
- [ ] Labels visible even when collapsed

---

## Feature 4.3: Layout Persistence

### Story 4.3.1: Save Layout to localStorage

**As a** power user,
**I want** my workspace layout saved automatically,
**So that** it persists across browser sessions.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 17

#### Acceptance Criteria
- [ ] Layout saved on every change (drag, resize)
- [ ] Saved to localStorage: `autos-workshop-layout`
- [ ] Layout restored on page load
- [ ] Handles missing/corrupted data (fallback to default)

#### Technical Notes
```typescript
interface GridLayout {
  panels: Array<{
    id: string;
    cols: number;
    rows: number;
    x: number;
    y: number;
  }>;
  version: number;
  lastUpdated: number;
}
```

#### Definition of Done
- [ ] Survives browser refresh
- [ ] Works in incognito mode (fallback to default)

---

### Story 4.3.2: Reset Layout to Default

**As a** power user,
**I want** to reset my layout to the default configuration,
**So that** I can start fresh if I make mistakes.

**Priority:** Medium
**Story Points:** 2
**Sprint:** Sprint 17

#### Acceptance Criteria
- [ ] "Reset Layout" button in header
- [ ] Confirmation dialog: "Reset to default layout?"
- [ ] Clears localStorage
- [ ] Reloads default layout immediately

#### Technical Notes
- Button in workshop toolbar
- Clears `autos-workshop-layout` key

#### Definition of Done
- [ ] Animation shows panels moving to default positions

---

### Story 4.3.3: Export/Import Layout

**As a** power user,
**I want** to export and import my workspace layout,
**So that** I can back it up or share with teammates.

**Priority:** Low
**Story Points:** 3
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] "Export Layout" downloads JSON file
- [ ] "Import Layout" accepts JSON file
- [ ] Validates JSON structure
- [ ] Confirmation before importing

#### Technical Notes
- Similar to table preference export/import

#### Definition of Done
- [ ] File naming: `autos-workshop-layout-YYYY-MM-DD.json`

---

## Feature 4.4: Drag Conflict Resolution

### Story 4.4.1: Separate Grid Drag from Column Drag

**As a** power user,
**I want** column drag-and-drop to work within tables without triggering grid drag,
**So that** I can reorder columns without accidentally moving panels.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 18

#### Acceptance Criteria
- [ ] Dragging columns does NOT drag grid panels
- [ ] Dragging panel headers DOES drag panels
- [ ] No conflict between two drag systems
- [ ] Clear visual distinction (cursors, highlights)

#### Technical Notes
- Gridster config: `ignoreContent: true`, `dragHandleClass: 'drag-handler'`
- Column drag uses Angular CDK
- Use `Renderer2` to toggle draggable attribute
- CDK drag events: `cdkDragStarted`, `cdkDragEnded`

#### Definition of Done
- [ ] No accidental grid drags during column reorder
- [ ] Both features work independently
- [ ] Documented in technical guide

---

## Feature 4.5: Responsive Workshop

### Story 4.5.1: Mobile/Tablet Workshop Layout

**As a** mobile user,
**I want** the workshop to adapt to smaller screens,
**So that** I can use it on tablets and phones.

**Priority:** Low
**Story Points:** 5
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Panels stack vertically on mobile
- [ ] Drag-and-drop disabled on mobile (too difficult)
- [ ] Resize disabled on mobile
- [ ] Collapse/expand still works
- [ ] Full-width panels on small screens

#### Technical Notes
- Media queries: `@media (max-width: 768px)`
- Gridster config: `draggable: { enabled: false }` on mobile

#### Definition of Done
- [ ] Tested on iOS and Android
- [ ] No horizontal scroll

---

## Backlog Stories (Future)

### Story 4.X.X: Multiple Workspace Layouts
- Save multiple named layouts
- Quick switch between layouts
- "Default", "Analysis", "Comparison" presets

### Story 4.X.X: Add/Remove Panels
- Users can add new panel types
- Remove panels they don't use
- Panel library/catalog

### Story 4.X.X: Workspace Sharing
- Share layouts with team
- Public layout gallery
- Import layouts from URL

### Story 4.X.X: Panel Minimization
- Minimize panels to icons in sidebar
- Click icon to restore
- Maximize workspace area

---

**Epic Status:** 100% Complete (Workshop fully implemented)
**Last Updated:** 2025-10-22
