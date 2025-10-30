# Flattened Picker Table - Workshop Conversion Plan

**Date:** 2025-10-30
**Branch:** `feature/auto-picker`
**Status:** In Progress

---

## Table of Contents

1. [Overview](#overview)
2. [What We Are Doing](#what-we-are-doing)
3. [What We Have Done](#what-we-have-done)
4. [What Remains To Do](#what-remains-to-do)
5. [Technical Details](#technical-details)
6. [Testing Strategy](#testing-strategy)
7. [Rollout Plan](#rollout-plan)

---

## Overview

### Objective

Convert the AUTOS application picker tables from a **hierarchical expandable structure** to a **flat two-column table** where all manufacturer-model combinations are displayed simultaneously without requiring row expansion.

### Rationale

- **Improved visibility**: All data visible at once without requiring user interaction
- **Simplified UX**: No need to expand/collapse manufacturers to see models
- **Better for search**: All rows are searchable and filterable immediately
- **Consistent checkbox pattern**: Clear manufacturer and model column checkboxes
- **Reduced cognitive load**: Simpler mental model (flat list vs tree structure)

### Before vs After

**BEFORE (Hierarchical):**
```
┌────────────────────────────────────────────────────┐
│ ☐ Ford (3 models, 2 selected) [+]                 │ <- Collapsed row
└────────────────────────────────────────────────────┘
        ↓ Click to expand
┌────────────────────────────────────────────────────┐
│ Manufacturer         │ Model                       │
├──────────────────────┼─────────────────────────────┤
│ ☐ Ford [−]          │                             │ <- Manufacturer row (repeats)
│ ☐ Ford [−]          │ ☐ F-150                     │ <- Model row
│ ☐ Ford [−]          │ ☐ Mustang                   │ <- Model row
│ ☐ Ford [−]          │ ☐ Explorer                  │ <- Model row
└────────────────────────────────────────────────────┘
```

**AFTER (Flat):**
```
┌────────────────────────────────────────────────────┐
│ Manufacturer         │ Model                       │
├──────────────────────┼─────────────────────────────┤
│ ☐ Chevrolet         │ ☐ Corvette                  │ <- All visible
│ ☐ Chevrolet         │ ☐ Silverado                 │ <- immediately
│ ☐ Ford              │ ☐ Explorer                  │
│ ☐ Ford              │ ☐ F-150                     │
│ ☐ Ford              │ ☐ Mustang                   │
└────────────────────────────────────────────────────┘
```

**Checkbox Relationships (Same in Both):**
- Checking a manufacturer checkbox → selects all models for that manufacturer
- Unchecking a manufacturer checkbox → deselects all models for that manufacturer
- Manufacturer checkbox shows indeterminate state when some (but not all) models selected
- Model checkboxes operate independently

---

## What We Are Doing

### Component Architecture

There are **TWO** picker components in AUTOS:

#### 1. ManufacturerModelTablePickerComponent (OLD)
- **Selector:** `app-manufacturer-model-table-picker`
- **Location:** `frontend/src/app/features/picker/manufacturer-model-table-picker/`
- **Used by:** Discover page (`/discover`)
- **Status:** ✅ **FLATTENED** (completed in commit `98d2dec`)
- **Pattern:** Direct NG-ZORRO table usage (no BaseDataTable)

#### 2. TablePickerComponent (NEW)
- **Selector:** `app-table-picker`
- **Location:** `frontend/src/app/features/picker/table-picker/`
- **Used by:** Workshop page (`/workshop`)
- **Status:** ⚠️ **HIERARCHICAL** (needs flattening)
- **Pattern:** Uses BaseDataTableComponent (Milestone 003)
- **Data Source:** `TablePickerDataSource` (client-side filtering)

### Goal

Flatten **TablePickerComponent** to match the new design, maintaining compatibility with:
- Workshop page grid layout
- StateManagementService integration
- BaseDataTableComponent architecture
- URL-driven state hydration

---

## What We Have Done

### Phase 1: Flatten ManufacturerModelTablePickerComponent ✅

**Commit:** `98d2dec` - "Flatten manufacturer-model picker table: Remove expandable rows"

#### TypeScript Changes

**File:** [manufacturer-model-table-picker.component.ts](../../frontend/src/app/features/picker/manufacturer-model-table-picker/manufacturer-model-table-picker.component.ts)

1. **Data Structure Simplification:**
   ```typescript
   // REMOVED
   manufacturerGroups: ManufacturerGroup[] = [];
   filteredGroups: ManufacturerGroup[] = [];

   // KEPT (simplified)
   allRows: PickerRow[] = [];
   filteredRows: PickerRow[] = [];
   ```

2. **Removed Hierarchical Methods:**
   - `groupByManufacturer()`
   - `getModelsForManufacturer()`
   - `toggleManufacturer()`
   - `expandAll()` / `collapseAll()`
   - `tableData` getter

3. **New Flat Checkbox Methods:**
   ```typescript
   // Calculate state from flat rows
   getManufacturerCheckboxState(manufacturer: string): 'checked' | 'indeterminate' | 'unchecked'

   // Select/deselect all models for manufacturer
   onManufacturerCheckboxChange(manufacturer: string, checked: boolean): void

   // Select/deselect individual model
   onModelCheckboxChange(manufacturer: string, model: string, checked: boolean): void

   // Check if row is selected
   isRowSelected(row: PickerRow): boolean
   ```

4. **Updated Data Flow:**
   ```typescript
   // Pagination now operates on flat rows
   get visibleRows(): PickerRow[] {
     const start = (this.currentPage - 1) * this.pageSize;
     const end = start + this.pageSize;
     return this.filteredRows.slice(start, end);
   }
   ```

#### HTML Template Changes

**File:** [manufacturer-model-table-picker.component.html](../../frontend/src/app/features/picker/manufacturer-model-table-picker/manufacturer-model-table-picker.component.html)

1. **Removed Controls:**
   - Expand/Collapse All buttons
   - Expand/collapse icons ([+] / [−])

2. **Simplified Table:**
   ```html
   <!-- BEFORE: Complex nested ng-container with collapsed/expanded states -->
   <ng-container *ngFor="let group of vehicleTable.data">
     <ng-container *ngIf="!group.expanded">...</ng-container>
     <ng-container *ngIf="group.expanded">...</ng-container>
   </ng-container>

   <!-- AFTER: Simple flat row iteration -->
   <tr *ngFor="let row of vehicleTable.data">
     <td class="manufacturer-cell">...</td>
     <td class="model-cell">...</td>
   </tr>
   ```

3. **Updated Bindings:**
   ```html
   [nzData]="visibleRows"  <!-- Changed from visibleGroups -->
   ```

4. **Updated Info Display:**
   ```html
   <span class="total-info">
     of {{ filteredRows.length }} combinations  <!-- Changed from manufacturers -->
   </span>
   ```

#### Build Verification ✅

```bash
npm run build
# ✓ Success: No TypeScript errors
# ✓ Bundle size: 1.54 MB (within acceptable range)
```

#### Commit Details

- **Changed Files:** 2
- **Insertions:** 86 lines
- **Deletions:** 252 lines
- **Net Change:** -166 lines (code reduction)

---

## What Remains To Do

### Phase 2: Flatten TablePickerComponent ⚠️

**Target Component:** `app-table-picker` (used in Workshop page)

#### Step 1: Analyze Current Implementation

**Files to Review:**
- `frontend/src/app/features/picker/table-picker/table-picker.component.ts`
- `frontend/src/app/features/picker/table-picker/table-picker.component.html`
- `frontend/src/app/features/picker/table-picker/table-picker-data-source.ts`

**Current Architecture:**
```
TablePickerComponent
├── Uses: BaseDataTableComponent<ManufacturerSummaryRow>
├── Data Source: TablePickerDataSource
├── Hierarchical: Yes (expandable manufacturer rows)
├── Models: ManufacturerSummaryRow with nested models[]
└── Checkbox Pattern: Parent/child (same as old picker)
```

**Key Questions:**
1. Does `ManufacturerSummaryRow` need to be replaced with flat rows?
2. How does `TablePickerDataSource` provide data to BaseDataTable?
3. Are there template slots for expansion in the HTML?
4. Do we need to update BaseDataTableComponent itself?

#### Step 2: Update Data Model

**File:** `table-picker-data-source.ts`

**Current Model:**
```typescript
export interface ManufacturerSummaryRow {
  manufacturer: string;
  modelCount: number;
  models: { model: string; count: number }[];  // Nested
}
```

**Proposed Flat Model:**
```typescript
export interface PickerFlatRow {
  manufacturer: string;
  model: string;
  count: number;
  key: string;  // "Manufacturer|Model"
}
```

**Data Source Updates:**
- Transform API response to flat rows
- Remove hierarchical grouping logic
- Update client-side filtering to work on flat rows
- Update sorting to handle duplicate manufacturers

#### Step 3: Update TablePickerComponent

**File:** `table-picker.component.ts`

**Changes Required:**

1. **Update Column Configuration:**
   ```typescript
   columns: TableColumn<PickerFlatRow>[] = [
     {
       key: 'manufacturer',
       label: 'Manufacturer',
       width: '50%',
       sortable: true,
       filterable: true,
       filterType: 'text',
       hideable: false,
     },
     {
       key: 'model',
       label: 'Model',
       width: '50%',
       sortable: true,
       filterable: true,
       filterType: 'text',
       hideable: false,
     }
   ];
   ```

2. **Remove Expansion Logic:**
   - Remove `onRowExpand()` method
   - Remove `onExpandAll()` / `onCollapseAll()` methods
   - Remove ViewChild reference to `baseTable.expandAllRows()`

3. **Update Checkbox Methods:**
   ```typescript
   // Adapt from ManufacturerModelTablePickerComponent
   getManufacturerCheckboxState(manufacturer: string): 'checked' | 'indeterminate' | 'unchecked' {
     // Calculate state from flat rows in data source
   }

   onManufacturerCheckboxChange(manufacturer: string, checked: boolean): void {
     // Select/deselect all flat rows for this manufacturer
   }

   onModelCheckboxChange(manufacturer: string, model: string, checked: boolean): void {
     // Select/deselect individual flat row
   }
   ```

4. **Update Selection Methods:**
   - Keep `Set<string>` pattern (already correct)
   - Update key format if needed (currently uses `:` separator)
   - Ensure selection methods work with flat rows

#### Step 4: Update Template

**File:** `table-picker.component.html`

**Changes Required:**

1. **Remove Expansion UI:**
   - Remove expand/collapse all buttons
   - Remove expansion ng-template slots
   - Remove nested model row templates

2. **Simplify Table Layout:**
   ```html
   <!-- Use BaseDataTable with flat row template -->
   <app-base-data-table
     [columns]="columns"
     [dataSource]="dataSource"
     [queryParams]="tableQueryParams"
     (queryChange)="onTableQueryChange($event)"
   >
     <!-- Row template -->
     <ng-template #rowTemplate let-row>
       <td class="manufacturer-cell">
         <label nz-checkbox
           [nzIndeterminate]="getManufacturerCheckboxState(row.manufacturer) === 'indeterminate'"
           [nzChecked]="getManufacturerCheckboxState(row.manufacturer) === 'checked'"
           (nzCheckedChange)="onManufacturerCheckboxChange(row.manufacturer, $event)">
           {{ row.manufacturer }}
         </label>
       </td>
       <td class="model-cell">
         <label nz-checkbox
           [nzChecked]="isModelSelected(row.manufacturer, row.model)"
           (nzCheckedChange)="onModelCheckboxChange(row.manufacturer, row.model, $event)">
           {{ row.model }}
         </label>
       </td>
     </ng-template>
   </app-base-data-table>
   ```

3. **Update Control Panel:**
   - Keep search box
   - Keep page size selector
   - Remove expand/collapse all buttons
   - Update pagination info text

#### Step 5: Update BaseDataTableComponent (If Needed)

**File:** `shared/components/base-data-table/`

**Potential Changes:**
- Verify row expansion features are optional (not breaking when unused)
- Ensure flat row display works correctly
- Check if expandable row logic can be disabled

**Assessment Needed:**
- Review BaseDataTable expansion implementation
- Determine if changes are needed or if expansion is already optional
- Test that disabling expansion doesn't break the table

#### Step 6: Test Workshop Integration

**Test Cases:**

1. **Visual Layout:**
   - ✅ Picker panel displays flat table
   - ✅ Two columns: Manufacturer and Model
   - ✅ Both columns have checkboxes
   - ✅ No expand/collapse controls visible

2. **Checkbox Behavior:**
   - ✅ Manufacturer checkbox selects all models
   - ✅ Manufacturer checkbox shows indeterminate state
   - ✅ Model checkbox selects individual model
   - ✅ Selections persist across pages

3. **State Management:**
   - ✅ URL hydration works (initial selections load)
   - ✅ Apply button updates URL
   - ✅ Clear button clears selections
   - ✅ Browser back/forward maintains state

4. **Workshop Features:**
   - ✅ Grid drag-and-drop still works
   - ✅ Panel collapse/expand works
   - ✅ Multiple picker panels can coexist
   - ✅ Cross-grid drag works

5. **Performance:**
   - ✅ Table renders quickly with flat rows
   - ✅ Pagination works smoothly
   - ✅ Search/filter updates are fast
   - ✅ Checkbox clicks are responsive

#### Step 7: Update CSS/Styling

**Files:**
- `table-picker.component.scss`
- `workshop.component.scss`

**Potential Changes:**
- Remove styles for collapsed/expanded states
- Remove expand/collapse icon styles
- Adjust cell padding for flat layout
- Ensure manufacturer column allows for repetition
- Verify checkbox alignment

#### Step 8: Update Documentation

**Files to Update:**
1. `CLAUDE.md` - Update component hierarchy and picker description
2. `docs/state-management-guide.md` - Update picker examples if needed
3. This document - Mark phase 2 as complete

**New Content:**
- Document flat picker pattern as standard
- Update screenshots/diagrams
- Add migration notes for future components

#### Step 9: Build and Test

**Commands:**
```bash
# 1. Build frontend
cd /home/odin/projects/autos/frontend
npm run build

# 2. Verify no TypeScript errors
# 3. Check bundle size

# 4. Manual testing
# Start dev container or deploy to K8s
# Navigate to /workshop
# Test all scenarios above
```

#### Step 10: Commit Changes

**Commit Message Template:**
```
Flatten table-picker component for workshop page

- Transform ManufacturerSummaryRow to PickerFlatRow
- Remove hierarchical expansion logic from TablePickerComponent
- Update TablePickerDataSource to provide flat rows
- Simplify template: direct row display without expansion
- Remove expand/collapse all controls
- Update checkbox methods for flat structure
- Maintain compatibility with BaseDataTableComponent
- Preserve StateManagementService integration

All manufacturer-model combinations now display simultaneously.
Workshop grid layout and drag-drop functionality preserved.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Technical Details

### Data Flow Comparison

#### BEFORE (Hierarchical)

```
API Response
  ↓
ManufacturerGroup[] (grouped by manufacturer)
  └── models: ModelDetail[]
  ↓
filteredGroups (search/filter)
  ↓
visibleGroups (pagination)
  ↓
tableData getter (conditional collapsed/expanded rows)
  ↓
Template (ng-container with collapsed/expanded states)
```

#### AFTER (Flat)

```
API Response
  ↓
PickerRow[] (one row per manufacturer-model combo)
  ↓
filteredRows (search/filter)
  ↓
visibleRows (pagination)
  ↓
Template (simple *ngFor over flat rows)
```

### Checkbox Logic Comparison

#### BEFORE (Hierarchical)

```typescript
// Parent checkbox state calculated from nested models
getParentCheckboxState(manufacturer: string): 'checked' | 'indeterminate' | 'unchecked' {
  const group = this.filteredGroups.find(g => g.manufacturer === manufacturer);
  const models = group?.models || [];
  // Check how many models are selected from nested array
}

// Parent checkbox change affects nested models
onParentCheckboxChange(manufacturer: string, checked: boolean): void {
  const models = this.getModelsForManufacturer(manufacturer);
  models.forEach(model => {
    // Toggle selection in Set
  });
}
```

#### AFTER (Flat)

```typescript
// Manufacturer checkbox state calculated from flat rows
getManufacturerCheckboxState(manufacturer: string): 'checked' | 'indeterminate' | 'unchecked' {
  const manufacturerRows = this.filteredRows.filter(
    row => row.manufacturer === manufacturer
  );
  // Check how many flat rows are selected
}

// Manufacturer checkbox change affects flat rows
onManufacturerCheckboxChange(manufacturer: string, checked: boolean): void {
  const manufacturerRows = this.filteredRows.filter(
    row => row.manufacturer === manufacturer
  );
  manufacturerRows.forEach(row => {
    // Toggle selection in Set
  });
}
```

### State Persistence

Both implementations maintain:
- **Selection State:** `Set<string>` with keys like `"Manufacturer|Model"`
- **URL Hydration:** `initialSelections` input from parent
- **Clear Trigger:** `clearTrigger` input for external clear
- **Selection Emission:** `selectionChange` output to parent

### Pagination Changes

**Count Display:**
- BEFORE: "of X manufacturers"
- AFTER: "of X combinations"

**Page Size:**
- BEFORE: Page of manufacturer groups (variable model count per page)
- AFTER: Page of flat rows (consistent row count per page)

---

## Testing Strategy

### Unit Tests (To Be Updated)

**Files:**
- `manufacturer-model-table-picker.component.spec.ts` ✅ (needs update)
- `table-picker.component.spec.ts` ⚠️ (needs update after flattening)

**Test Cases:**

1. **Data Loading:**
   - ✅ Loads flat rows from API
   - ✅ Sorts rows by manufacturer, then model
   - ✅ Applies search filter correctly

2. **Checkbox Behavior:**
   - ✅ Manufacturer checkbox selects all models
   - ✅ Manufacturer checkbox shows correct state (checked/indeterminate/unchecked)
   - ✅ Model checkbox selects individual model
   - ✅ Selections tracked in Set correctly

3. **Pagination:**
   - ✅ Shows correct number of rows per page
   - ✅ Navigates between pages
   - ✅ Selections persist across page changes

4. **State Hydration:**
   - ✅ Hydrates from initialSelections input
   - ✅ Clears selections on clearTrigger change
   - ✅ Emits selections on Apply

### Integration Tests

**Scenarios:**

1. **Discover Page (`/discover`):**
   - Uses flattened `ManufacturerModelTablePickerComponent`
   - Test selection flow: pick → apply → results update
   - Test URL state: selections in query params
   - Test browser navigation: back/forward preserves selections

2. **Workshop Page (`/workshop`):**
   - Uses flattened `TablePickerComponent` (after Phase 2)
   - Test grid layout: picker panel renders correctly
   - Test drag-and-drop: panel moves between grids
   - Test multi-panel: multiple pickers can coexist
   - Test collapse: panel collapses/expands correctly

### Manual Testing Checklist

**For Each Page:**

- [ ] Table displays all combinations immediately (no expansion needed)
- [ ] Manufacturer column shows checkbox
- [ ] Model column shows checkbox
- [ ] Manufacturer checkbox selects all models for that manufacturer
- [ ] Manufacturer checkbox shows indeterminate when some models selected
- [ ] Model checkbox selects individual model
- [ ] Search filters both manufacturer and model columns
- [ ] Pagination shows correct count (combinations, not manufacturers)
- [ ] Page size changes work correctly
- [ ] Apply button updates URL and triggers results
- [ ] Clear button removes all selections
- [ ] Selected items chips display correctly
- [ ] Chip removal works (individual and manufacturer group)

**Workshop Specific:**

- [ ] Grid drag-and-drop works
- [ ] Cross-grid drag works
- [ ] Panel collapse/expand works
- [ ] Multiple picker panels work independently
- [ ] Layout persists to localStorage
- [ ] Pop-out panel feature works

---

## Rollout Plan

### Phase 1: Flattened ManufacturerModelTablePickerComponent ✅

- **Status:** COMPLETE
- **Commit:** `98d2dec`
- **Affects:** Discover page (`/discover`)
- **Risk:** Low (single page, well-tested)
- **Rollback:** Easy (revert commit)

### Phase 2: Flatten TablePickerComponent ⚠️

- **Status:** TODO
- **Affects:** Workshop page (`/workshop`)
- **Risk:** Medium (more complex, grid layout, BaseDataTable integration)
- **Steps:** Follow steps 1-10 above
- **Timeline:** TBD

### Phase 3: Deploy and Monitor 🔮

- **Build production frontend:**
  ```bash
  cd /home/odin/projects/autos/frontend
  podman build -f Dockerfile.prod -t localhost/autos-frontend:prod .
  ```

- **Deploy to K8s:**
  ```bash
  podman save -o autos-frontend-prod.tar localhost/autos-frontend:prod
  sudo k3s ctr images import autos-frontend-prod.tar
  kubectl rollout restart deployment/autos-frontend -n autos
  ```

- **Monitor:**
  - Check application logs for errors
  - Test both pages manually
  - Verify URL state management works
  - Check browser console for JavaScript errors

### Phase 4: Update Documentation 🔮

- Update `CLAUDE.md` with new picker pattern
- Update component hierarchy diagrams
- Add migration guide for future table components
- Document lessons learned

---

## Decision Log

### Why Flatten the Table?

**Problem:** Hierarchical expandable tables require user interaction to see all data, which:
- Adds cognitive load (remember to expand)
- Hides data from search/filter
- Complicates checkbox logic
- Requires more UI controls (expand/collapse buttons)

**Solution:** Flat tables show all data immediately, which:
- Reduces cognitive load (see everything)
- All data searchable/filterable
- Simpler checkbox logic
- Fewer UI controls needed

**Trade-off:** More rows displayed, but:
- Pagination handles row count
- Search/filter reduces visible rows quickly
- Modern browsers handle large DOMs well
- NG-ZORRO table is optimized for performance

### Why Keep Checkbox Relationships?

The manufacturer → models checkbox relationship provides value:
- Quick selection of all models for a manufacturer
- Clear visual feedback (indeterminate state)
- Matches user mental model ("select all Ford models")

This relationship is preserved in the flat design.

### Why Use Set<string> for Selection State?

**Advantages:**
- O(1) lookup for "is selected?"
- Efficient add/remove operations
- No need for complex state management
- Easy to serialize for URL state

**Pattern:**
```typescript
selectedRows = new Set<string>();
// Key format: "Manufacturer|Model"
```

---

## Future Considerations

### Potential Enhancements

1. **Column Sorting:**
   - Sort by manufacturer (groups models together)
   - Sort by model (alphabetical across manufacturers)

2. **Virtual Scrolling:**
   - For very large datasets (1000+ combinations)
   - Use CDK Virtual Scroll or NG-ZORRO nzVirtualScroll

3. **Bulk Operations:**
   - "Select All Visible" button
   - "Deselect All Visible" button
   - Filter-aware selection

4. **Keyboard Navigation:**
   - Arrow keys to navigate rows
   - Space to toggle checkbox
   - Enter to apply selections

### Migration Path for Other Tables

If we need to flatten other tables:

1. Start with data model (create flat row interface)
2. Update data loading/transformation
3. Update template (remove expansion logic)
4. Update checkbox/selection logic
5. Test thoroughly
6. Update documentation

**Pattern established in this work can be reused.**

---

## References

### Related Documents

- [CLAUDE.md](../../CLAUDE.md) - AUTOS onboarding reference
- [State Management Guide](../state-management-guide.md) - URL-driven state patterns
- [Milestone 003](./milestone-003-base-table-design.md) - BaseDataTable specification

### Related Components

- [ManufacturerModelTablePickerComponent](../../frontend/src/app/features/picker/manufacturer-model-table-picker/)
- [TablePickerComponent](../../frontend/src/app/features/picker/table-picker/)
- [BaseDataTableComponent](../../frontend/src/app/shared/components/base-data-table/)
- [WorkshopComponent](../../frontend/src/app/features/workshop/)

### Commits

- `98d2dec` - Flatten manufacturer-model-table-picker component
- `010147f` - Fix: Results table refresh bug (base for this work)

---

**Last Updated:** 2025-10-30
**Maintained By:** Claude (with odin)
**Branch:** `feature/auto-picker`
**Status:** Phase 1 Complete, Phase 2 TODO

---

**END OF FLATTENED PICKER CONVERSION PLAN**
