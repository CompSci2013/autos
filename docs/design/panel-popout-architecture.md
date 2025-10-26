# Panel Pop-Out Architecture

**Created:** 2025-10-26
**Status:** Implemented
**Feature Branch:** `feature/cross-grid`

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Architecture Design](#architecture-design)
4. [MOVE Semantics vs COPY Semantics](#move-semantics-vs-copy-semantics)
5. [Bidirectional State Synchronization](#bidirectional-state-synchronization)
6. [Implementation Details](#implementation-details)
7. [Data Flow](#data-flow)
8. [Testing Scenarios](#testing-scenarios)
9. [Files Modified](#files-modified)

---

## Overview

The panel pop-out feature allows users to "pop out" individual panels from the Workshop grid layout into dedicated browser windows. This enables:

- **Full-screen viewing** of panels (especially useful for PlotlyJS charts)
- **Multi-monitor workflows** (picker on one screen, results on another)
- **Persistent panel positioning** across pop-out/restore cycles

**Key Design Principle:** The main window's URL remains the single source of truth for all application state, even when panels are popped out.

---

## Problem Statement

### Initial Requirement

> "How to 'pop-out' that panel into its own web page?" - for PlotlyJS graphs

### Critical Refinement (After Initial Implementation)

User testing revealed that the initial implementation used **COPY semantics** instead of **MOVE semantics**:

> "It appears to be a duplicate, copy, not the actual panel that the user intends to pop out. When the 'Vehicle Results' panel was popped out, it should have retained the data, and the Right Workspace should be empty. When the Popped out page is closed, the panel should then display again in the Right workspace."

### State Synchronization Issue

After implementing MOVE semantics, a second critical issue emerged:

> "Inter-panel communication is lost. The popped out panel has its own URL. Changes made in the control update the URL for the popped panel and not the actual Auto-Components website page."

**Root Cause:** Each browser window runs its own Angular app instance with its own `StateManagementService` and `RouteStateService`. The pop-out was updating its own URL instead of the main window's URL, breaking URL-as-single-source-of-truth.

---

## Architecture Design

### Core Principles

1. **Main Window Owns All State**
   - Main window's URL is the single source of truth
   - Pop-out window's URL is irrelevant (not used for state)
   - All state updates flow through main window's `StateManagementService`

2. **MOVE Semantics**
   - Panel is removed from grid when popped out
   - Grid shows empty space where panel was located
   - Panel is restored to original location when pop-out closes

3. **Bidirectional Communication**
   - BroadcastChannel API for cross-window messaging
   - Pop-out sends user actions to main window
   - Main window broadcasts state updates to all pop-outs

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ MAIN WINDOW (/workshop)                                     │
│                                                              │
│  WorkshopComponent                                          │
│    ├── GridTransferService (panel positions)                │
│    ├── PanelPopoutService (window management)               │
│    └── StateManagementService (application state)           │
│                                                              │
│  [Grid 0]              [Grid 1]                             │
│   ┌─────────┐           ┌─────────┐                         │
│   │ Picker  │           │ (empty) │ ← Panel popped out      │
│   │ Panel   │           └─────────┘                         │
│   └─────────┘                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↕
                   BroadcastChannel
                            ↕
┌─────────────────────────────────────────────────────────────┐
│ POP-OUT WINDOW (/panel/grid-1/results-1/results)           │
│                                                              │
│  PanelPopoutComponent                                       │
│    ├── BroadcastChannel (state sync)                        │
│    ├── No direct StateManagement calls                      │
│    └── Receives state from main window                      │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │ Vehicle Results Table                    │               │
│  │ (full-screen view)                       │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## MOVE Semantics vs COPY Semantics

### COPY Semantics (Initial Implementation - INCORRECT)

```
Before Pop-Out:
Grid:  [Picker] [Results]
Pop-out: (none)

After Pop-Out:
Grid:  [Picker] [Results]  ← Panel still visible in grid
Pop-out: [Results]          ← Duplicate created

Problem: User has two copies of the panel
```

### MOVE Semantics (Current Implementation - CORRECT)

```
Before Pop-Out:
Grid:  [Picker] [Results]
Pop-out: (none)

After Pop-Out:
Grid:  [Picker] (empty)     ← Panel removed from grid
Pop-out: [Results]          ← Panel moved to pop-out

After Closing Pop-Out:
Grid:  [Picker] [Results]   ← Panel restored to original location
Pop-out: (closed)
```

### Implementation of MOVE Semantics

**PanelPopoutService.popOutPanel()** (lines 42-107):

```typescript
popOutPanel(gridId: string, panel: WorkspacePanel): void {
  const panelId = panel.id!;

  // MOVE SEMANTICS: Remove panel from grid BEFORE opening window
  this.gridTransfer.removeItem(gridId, panelId);
  console.log(`Panel ${panelId} removed from grid ${gridId}`);

  // Open pop-out window
  const newWindow = window.open(url, `panel-${panelId}`, windowFeatures);

  if (!newWindow) {
    // Restore panel to grid since pop-out failed
    this.gridTransfer.addItem(gridId, panel);
    return;
  }

  // Store reference with full panel data for restoration
  this.popouts.set(panelId, {
    panelId,
    gridId,
    panel,  // Store full panel data
    window: newWindow,
    channel,
    checkInterval
  });

  // Save to localStorage for persistence across page refreshes
  this.savePopoutMetadata();
}
```

**PanelPopoutService.closePopout()** (lines 164-194):

```typescript
closePopout(panelId: string): void {
  const popout = this.popouts.get(panelId);
  if (popout) {
    // Close channel and window
    popout.channel.close();
    if (popout.window && !popout.window.closed) {
      popout.window.close();
    }

    // MOVE SEMANTICS: Restore panel to its original grid location
    if (!this.restoreInProgress) {
      this.gridTransfer.addItem(popout.gridId, popout.panel);
      console.log(`Panel ${panelId} restored to grid ${popout.gridId}`);
    }

    // Cleanup
    this.popouts.delete(panelId);
    this.savePopoutMetadata();
  }
}
```

**Persistence Across Page Refresh:**

On page load, `restorePopoutsFromStorage()` (lines 254-278) checks localStorage for active pop-outs and restores panels to their grids (since pop-out windows don't survive page refresh).

---

## Bidirectional State Synchronization

### The Problem with Multiple Angular Instances

Each browser window runs its own Angular application instance:

- **Main Window:** Has `StateManagementService` instance A, updates `/workshop?models=...`
- **Pop-Out Window:** Has `StateManagementService` instance B, updates `/panel/...?models=...`

When pop-out updated instance B, main window's instance A never received the change. Result: broken state synchronization.

### The Solution: Main Window as Single Source of Truth

**Rule:** Pop-out panels NEVER call `StateManagementService.updateFilters()` or `resetFilters()` directly.

Instead:

1. **Pop-out sends messages** to main window via BroadcastChannel
2. **Main window updates state** (and its URL)
3. **Main window broadcasts state** back to all pop-outs
4. **Pop-outs receive and render** the updated state

### BroadcastChannel Communication

BroadcastChannel API enables cross-window communication within the same origin.

**Channel Naming:** `panel-{panelId}` (e.g., `panel-picker-1`)

**Message Types:**

| Type | Direction | Purpose | Payload |
|------|-----------|---------|---------|
| `PANEL_READY` | Pop-out → Main | Pop-out initialized, request current state | `{ panelId }` |
| `SELECTION_CHANGE` | Pop-out → Main | User selected models in picker | `{ data: ManufacturerModelSelection[] }` |
| `CLEAR_ALL` | Pop-out → Main | User clicked clear all | (none) |
| `STATE_UPDATE` | Main → Pop-out | State changed, update UI | `{ filters: SearchFilters }` |
| `CLEAR_SELECTION` | Main → Pop-out | Clear selections | (none) |

---

## Implementation Details

### PanelPopoutComponent (Pop-Out Window)

**File:** `frontend/src/app/features/panel-popout/panel-popout.component.ts`

**Key Methods:**

```typescript
// User interaction handlers - DO NOT update state directly
onPickerSelectionChange(selections: ManufacturerModelSelection[]): void {
  // DO NOT call this.stateService.updateFilters()
  // Only broadcast to main window
  this.channel.postMessage({
    type: 'SELECTION_CHANGE',
    data: selections
  });
}

onClearAll(): void {
  // DO NOT call this.stateService.resetFilters()
  // Only broadcast to main window
  this.channel.postMessage({
    type: 'CLEAR_ALL'
  });
}

// Message handler - receives state from main window
private handleMessage(message: any): void {
  switch (message.type) {
    case 'STATE_UPDATE':
      // Update local state from main window
      this.currentFilters = message.filters;
      if (message.filters.modelCombos) {
        this.pickerInitialSelections = [...message.filters.modelCombos];
      } else {
        this.pickerInitialSelections = [];
      }
      break;
    case 'CLEAR_SELECTION':
      this.pickerClearTrigger++;
      this.currentFilters = {};
      this.pickerInitialSelections = [];
      break;
  }
}
```

### PanelPopoutService (Main Window)

**File:** `frontend/src/app/core/services/panel-popout.service.ts`

**Key Methods:**

```typescript
constructor(
  private gridTransfer: GridTransferService,
  private stateService: StateManagementService
) {
  // Subscribe to state changes and broadcast to all pop-outs
  this.stateService.filters$.subscribe(filters => {
    this.broadcastToAll({
      type: 'STATE_UPDATE',
      filters
    });
  });
}

// Handle messages from popped-out windows
private handlePopoutMessage(gridId: string, panelId: string, message: any): void {
  switch (message.type) {
    case 'SELECTION_CHANGE':
      // Pop-out sent selection change - update MAIN window state
      this.stateService.updateFilters({
        modelCombos: message.data.length > 0 ? message.data : undefined,
      });
      // State change will automatically broadcast back to pop-out
      break;

    case 'CLEAR_ALL':
      // Pop-out requested clear - update MAIN window state
      this.stateService.resetFilters();
      break;

    case 'PANEL_READY':
      // Pop-out is ready - send current state
      const currentFilters = this.stateService.getCurrentFilters();
      this.broadcastToPanel(panelId, {
        type: 'STATE_UPDATE',
        filters: currentFilters
      });
      break;
  }
}
```

---

## Data Flow

### Scenario 1: User Selects Models in Popped-Out Picker

```
1. User clicks model checkbox in pop-out picker
   ↓
2. Picker component emits selectionChange event
   ↓
3. PanelPopoutComponent.onPickerSelectionChange() called
   ↓
4. Component broadcasts SELECTION_CHANGE message via BroadcastChannel
   (does NOT call stateService.updateFilters)
   ↓
5. Main window's PanelPopoutService receives message
   ↓
6. PanelPopoutService.handlePopoutMessage() processes SELECTION_CHANGE
   ↓
7. Calls stateService.updateFilters({ modelCombos: [...] })
   ↓
8. Main window's URL updates: /workshop?models=Ford:F-150,...
   ↓
9. StateManagementService.filters$ emits new state
   ↓
10. Three parallel updates:
    ├─> Results table in main window re-fetches data
    ├─> Picker panel in main window syncs selections
    └─> PanelPopoutService subscription broadcasts STATE_UPDATE
        ↓
11. Pop-out receives STATE_UPDATE message
    ↓
12. PanelPopoutComponent.handleMessage() updates local state
    ↓
13. Pop-out re-renders with confirmed selections
```

**Key Point:** The pop-out's URL never changes. The main window's URL is the only source of truth.

### Scenario 2: User Clears Selections in Main Window

```
1. User clicks "Clear All" in main window picker
   ↓
2. WorkshopComponent.onClearAll() called
   ↓
3. Calls stateService.resetFilters()
   ↓
4. Main window's URL updates: /workshop (no query params)
   ↓
5. StateManagementService.filters$ emits empty state
   ↓
6. PanelPopoutService subscription broadcasts STATE_UPDATE with empty filters
   ↓
7. Pop-out receives STATE_UPDATE message
   ↓
8. PanelPopoutComponent.handleMessage() clears local state
   ↓
9. Pop-out picker clears all selections
```

### Scenario 3: Page Refresh with Active Pop-Out

```
1. User refreshes main window (F5)
   ↓
2. PanelPopoutService constructor runs
   ↓
3. Calls restorePopoutsFromStorage()
   ↓
4. Reads pop-out metadata from localStorage
   ↓
5. Restores panels to their original grids
   (Pop-out windows don't survive refresh, so panels return to grids)
   ↓
6. Clears localStorage
   ↓
7. Main window loads with panels in grids
```

**Design Decision:** Pop-out windows don't survive page refresh because:
- Browser security prevents re-opening windows without user interaction
- Simpler UX: panels return to grids, user can re-pop-out if desired
- Avoids orphaned panels that exist in neither grid nor pop-out

---

## Testing Scenarios

### Test 1: Basic Pop-Out and Restore

**Steps:**
1. Navigate to `/workshop`
2. Click export icon on "Vehicle Results" panel
3. Verify panel disappears from grid (empty space shown)
4. Verify pop-out window opens with results table
5. Close pop-out window
6. Verify panel returns to original grid location

**Expected:** ✅ MOVE semantics work correctly

### Test 2: Selection Change in Popped-Out Picker

**Steps:**
1. Pop out "Model Picker" panel
2. In pop-out window, select "Ford:F-150"
3. Observe main window URL
4. Observe results table in main window

**Expected:**
- ✅ Main window URL updates: `/workshop?models=Ford:F-150&page=1&size=20`
- ✅ Results table in main window shows Ford F-150 vehicles
- ✅ Pop-out picker shows confirmed selection (checkbox checked)

### Test 3: Clear All from Main Window

**Steps:**
1. Pop out picker panel
2. Select models in pop-out picker
3. Verify main window shows results
4. In main window, add another picker panel to grid
5. Click "Clear All" in main window picker

**Expected:**
- ✅ Main window URL updates: `/workshop` (no models)
- ✅ Results table clears
- ✅ Popped-out picker clears selections

### Test 4: Multiple Pop-Outs

**Steps:**
1. Add two picker panels to different grids
2. Pop out both pickers
3. Select models in first pop-out
4. Select different models in second pop-out

**Expected:**
- ✅ Main window URL reflects combined selections
- ✅ Both pop-outs receive state updates
- ✅ Both pop-outs stay synchronized

### Test 5: Pop-Out Failure (Pop-Up Blocker)

**Steps:**
1. Enable browser pop-up blocker
2. Click export icon on any panel
3. Observe grid state

**Expected:**
- ✅ Panel remains in grid (not removed)
- ✅ Console error: "Failed to open pop-out window"
- ✅ No empty space in grid

### Test 6: Page Refresh with Active Pop-Out

**Steps:**
1. Pop out "Vehicle Results" panel
2. Refresh main window (F5)
3. Observe grid state

**Expected:**
- ✅ Pop-out window closes (browser behavior)
- ✅ Panel restored to grid automatically
- ✅ No orphaned panels

---

## Files Modified

### Core Services

**`frontend/src/app/core/services/panel-popout.service.ts`**
- Manages pop-out window lifecycle
- Handles MOVE semantics (remove/restore panels)
- Implements bidirectional BroadcastChannel communication
- Subscribes to `StateManagementService.filters$` and broadcasts to pop-outs
- Processes messages from pop-outs and updates main window state

**`frontend/src/app/core/services/grid-transfer.service.ts`**
- Refactored to Map-based architecture for N grids
- `addItem()` and `removeItem()` support pop-out MOVE semantics

**`frontend/src/app/core/services/state-management.service.ts`**
- No changes (existing `getCurrentFilters()` method used by pop-out service)

### Components

**`frontend/src/app/features/panel-popout/panel-popout.component.ts`** (New)
- Standalone component for pop-out view
- Renders panel content (picker, results, charts)
- Broadcasts user actions to main window (does NOT update state directly)
- Receives state updates from main window via BroadcastChannel

**`frontend/src/app/features/panel-popout/panel-popout.component.html`** (New)
- Template for pop-out window
- Header with title and close button
- Content slots for different panel types

**`frontend/src/app/features/panel-popout/panel-popout.component.scss`** (New)
- Styles for pop-out window layout

**`frontend/src/app/features/workshop/workshop.component.ts`**
- Added `popOutPanel()` method to trigger pop-out
- Integrated with `PanelPopoutService`

**`frontend/src/app/features/workshop/workshop.component.html`**
- Added export icon to panel headers
- Click handler for pop-out action

**`frontend/src/app/features/workshop/workshop.component.scss`**
- Styles for pop-out icon (hover states, positioning)

### Models

**`frontend/src/app/models/grid-config.model.ts`** (New)
- Defines grid structure for N-grid architecture
- Used by WorkshopComponent and GridTransferService

**`frontend/src/app/models/workspace-panel.model.ts`**
- Extends GridsterItem with custom properties
- Includes `id`, `panelType`, `data` fields

### Routing and Module

**`frontend/src/app/app-routing.module.ts`**
- Added route: `/panel/:gridId/:panelId/:type`
- Maps to `PanelPopoutComponent`

**`frontend/src/app/app.module.ts`**
- Registered `PanelPopoutComponent`
- Added icons: `ExportOutline`, `CloseOutline`, `LineChartOutline`

---

## Future Enhancements

### Persistent Pop-Outs Across Page Refresh

**Challenge:** Browser security prevents re-opening windows without user interaction.

**Potential Solutions:**
1. Service Worker to detect pop-out windows
2. "Restore Pop-Outs" button shown on page load if localStorage has active pop-outs
3. Browser Extension to persist window references (not web-standard)

### Cross-Grid Drag-and-Drop to Pop-Out

Allow dragging panels directly from grid to a "Pop-Out Zone" instead of clicking export icon.

### Pop-Out Layout Persistence

Save pop-out window size/position to localStorage and restore on next pop-out.

### Multiple Main Windows

Support multiple main windows (tabs) with synchronized state via BroadcastChannel. All tabs + pop-outs would stay synchronized.

---

## Lessons Learned

### URL-as-Single-Source-of-Truth is Critical

The entire architecture relies on the main window's URL being the source of truth. Any component that directly updates state in a separate window breaks this principle.

### BroadcastChannel is Ideal for Same-Origin Cross-Window Communication

- Simple API
- Automatic message delivery to all same-origin windows/tabs
- No need for SharedWorker or localStorage polling
- Browser support: Chrome 54+, Firefox 38+, Safari 15.4+

### MOVE Semantics Require Full Panel Data Storage

To restore panels correctly, we must store:
- Panel configuration (id, type, cols, rows, x, y)
- Grid location (gridId)
- Panel data (if any)

Storing only the panel ID is insufficient for restoration.

### Message-Based Architecture Scales Well

The message-based approach (SELECTION_CHANGE, CLEAR_ALL, STATE_UPDATE) is extensible. Adding new message types for filters, sorting, pagination is straightforward.

---

## Conclusion

The panel pop-out feature successfully enables multi-window workflows while maintaining URL-driven state management. By implementing:

1. **MOVE semantics** for panel positioning
2. **Bidirectional BroadcastChannel communication** for state sync
3. **Main window as single source of truth** for all state

We achieved a clean, scalable architecture that preserves the core AUTOS design principle: **the URL is the single source of truth for all application state**.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Author:** Claude (with odin)
