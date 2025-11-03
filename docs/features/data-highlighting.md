# Feature: Data Highlighting with Cross-Chart Coordination

**Status**: Planned
**Priority**: Medium
**Created**: 2025-11-03
**Owner**: TBD

---

## Overview

Interactive data highlighting feature that allows users to select a subset of data on any chart (starting with Year chart) and see corresponding highlights across all related charts and controls. Highlights are non-destructive (don't affect base filters) and shareable via URL.

---

## User Story

**As a user**, I want to:
1. Select a range on the Year chart using Box Select + `h` key
2. See the selected bars turn blue while non-selected bars are dimmed
3. See corresponding data highlighted in other charts (Body Class, Manufacturer, etc.)
4. See a "Highlighted" chip in Query Control
5. Share the URL with highlights preserved
6. Clear highlights without affecting my base search filters

---

## Visual Behavior

### Year Chart (Plotly Histogram)

**Initial State** (no highlights):
```
Year Chart
┌────────────────────────────────────────┐
│ 1960 ████████ 150                     │
│ 1965 ████████████ 200                 │
│ 1970 ██████████████ 250               │
│ 1975 ████████ 150                     │
│ 1980 ██████ 100                       │
└────────────────────────────────────────┘
All bars: Default blue color
```

**User Action**:
1. Click "Box Select" tool in Plotly toolbar
2. Hold down `h` key
3. Drag rectangle over 1965-1970 range

**Highlighted State**:
```
Year Chart
┌────────────────────────────────────────┐
│ 1960 ░░░░░░░░ 150     (dimmed gray)  │
│ 1965 ████████████ 200  (bright blue) │ ← Highlighted
│ 1970 ██████████████ 250 (bright blue) │ ← Highlighted
│ 1975 ░░░░░░░░ 150     (dimmed gray)  │
│ 1980 ░░░░░░ 100       (dimmed gray)  │
└────────────────────────────────────────┘

Highlighted Chip: [Highlighted: 1965-1970] ✕
```

### Cross-Chart Coordination

When Year chart has highlighted range (1965-1970):

**Body Class Chart**:
```
SUV      ░░░░░░░░░░ 80    (dimmed - outside highlight)
Sedan    ████████████ 150  (bright - overlaps highlight)
Pickup   ██████ 70         (bright - overlaps highlight)
Coupe    ░░░░░░ 50        (dimmed - outside highlight)
```

**Manufacturer Chart**:
```
Ford      ████████████ 120  (bright - has vehicles in 1965-1970)
Chevrolet ██████████ 100    (bright - has vehicles in 1965-1970)
Toyota    ░░░░░░ 50         (dimmed - no vehicles in 1965-1970)
```

**Query Control**:
```
┌─────────────────────────────────────────┐
│ Active Filters:                         │
│ • Models: Ford F-150, Chevrolet Corvette│
│ • Year Range: 1960-1980                 │
│                                         │
│ Highlighted:                            │
│ [🔦 Years: 1965-1970] ✕                 │
│                                         │
│ [Clear Highlights]                      │
└─────────────────────────────────────────┘
```

---

## URL Parameter Strategy

### Parameter Namespacing with `h_` Prefix

**Concept**: Highlight parameters use `h_` prefix to distinguish from base filters.

**Example URL**:
```
http://autos.minilab/discover?models=Ford:F-150,Chevrolet:Corvette&yearMin=1960&yearMax=1980&h_yearMin=1965&h_yearMax=1970
```

**Breakdown**:
- `yearMin=1960&yearMax=1980` - Base filter (affects API query)
- `h_yearMin=1965&h_yearMax=1970` - Highlight range (affects UI only)

### State Independence

```
┌─────────────────────────────────────────┐
│          Base Filters (API)              │
│   yearMin=1960, yearMax=1980            │
│                                         │
│   Fetches: All vehicles 1960-1980      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│       Highlight Filters (UI Only)       │
│   h_yearMin=1965, h_yearMax=1970        │
│                                         │
│   Emphasizes: Vehicles 1965-1970        │
│   Dims: Vehicles 1960-1964, 1971-1980   │
└─────────────────────────────────────────┘
```

**Key Principle**: Highlights never trigger API calls, only visual changes.

---

## Relationship to UrlParamService

### Perfect Integration Opportunity

UrlParamService already handles all URL parameter management. Highlights naturally extend this pattern.

### New Helper Methods Needed

```typescript
// UrlParamService extensions for highlight support

/**
 * Get highlight parameter value
 * Example: getHighlightParam('yearMin') returns value of 'h_yearMin'
 */
getHighlightParam(key: string): string | null {
  return this.getParam(`h_${key}`);
}

/**
 * Set highlight parameter
 * Example: setHighlightParam('yearMin', '1965') sets 'h_yearMin=1965'
 */
setHighlightParam(key: string, value: string | number): Promise<boolean> {
  return this.updateParam(`h_${key}`, value);
}

/**
 * Get all highlight parameters (all params starting with 'h_')
 */
getAllHighlightParams(): Record<string, string> {
  const allParams = this.getAllParams();
  const highlights: Record<string, string> = {};

  Object.keys(allParams).forEach(key => {
    if (key.startsWith('h_')) {
      const baseKey = key.substring(2); // Remove 'h_' prefix
      highlights[baseKey] = allParams[key];
    }
  });

  return highlights;
}

/**
 * Check if any highlights are active
 */
hasHighlights(): boolean {
  return Object.keys(this.getAllParams())
    .some(key => key.startsWith('h_'));
}

/**
 * Clear all highlight parameters
 */
clearAllHighlights(): Promise<boolean> {
  const highlightKeys = Object.keys(this.getAllParams())
    .filter(key => key.startsWith('h_'));

  return this.removeParams(highlightKeys);
}

/**
 * Set multiple highlight parameters at once
 * Example: setHighlightRange({ yearMin: '1965', yearMax: '1970' })
 */
setHighlightRange(params: Record<string, string | number>): Promise<boolean> {
  const highlightParams: Record<string, string | number> = {};

  Object.keys(params).forEach(key => {
    highlightParams[`h_${key}`] = params[key];
  });

  return this.updateParams(highlightParams);
}
```

### Integration Pattern

```typescript
// Component: PlotlyHistogramComponent (Year Chart)

onBoxSelect(event: Plotly.PlotSelectionEvent) {
  // Check if 'h' key is pressed
  if (!this.isHighlightMode) {
    return; // Normal selection behavior
  }

  // Extract selected range from Plotly event
  const selectedYears = this.extractYearRange(event);

  // Update URL with highlight parameters
  this.urlParamService.setHighlightRange({
    yearMin: selectedYears.min,
    yearMax: selectedYears.max
  });

  // Visual update happens automatically when URL changes
  // (components watch for h_* parameter changes)
}

// Component hydration from URL
ngOnInit() {
  // Watch for highlight parameter changes
  this.urlParamService.watchParam('h_yearMin').subscribe(highlightMin => {
    this.applyHighlighting(highlightMin);
  });
}
```

---

## StateManagementService Impact

### Critical Distinction: Base Filters vs Highlights

**StateManagementService must NOT trigger API calls for highlight changes.**

#### Current Behavior (Base Filters)
```typescript
// StateManagementService.watchUrlChanges()
router.events.subscribe(() => {
  const filters = routeState.paramsToFilters();

  if (filters changed) {
    this.fetchVehicleData(); // ✅ API call triggered
  }
});
```

#### New Behavior (Ignore Highlights)
```typescript
// StateManagementService.watchUrlChanges()
router.events.subscribe(() => {
  const params = routeState.getCurrentParams();

  // Separate base filters from highlights
  const baseFilters = this.extractBaseFilters(params);
  const highlights = this.extractHighlights(params);

  if (baseFilters changed) {
    this.fetchVehicleData(); // ✅ API call for base filters
  }

  if (highlights changed) {
    this.emitHighlightChange(highlights); // ✅ UI update only
  }
});

// Helper method
private extractBaseFilters(params: Record<string, string>): SearchFilters {
  const filters: SearchFilters = {};

  Object.keys(params).forEach(key => {
    // Skip highlight parameters
    if (!key.startsWith('h_')) {
      filters[key] = params[key];
    }
  });

  return filters;
}

private extractHighlights(params: Record<string, string>): HighlightFilters {
  const highlights: HighlightFilters = {};

  Object.keys(params).forEach(key => {
    if (key.startsWith('h_')) {
      const baseKey = key.substring(2);
      highlights[baseKey] = params[key];
    }
  });

  return highlights;
}
```

### New Observable: highlights$

```typescript
// StateManagementService

public highlights$ = this.state$.pipe(
  map(state => state.highlights || {}),
  distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
);

// Components can subscribe
this.stateService.highlights$.subscribe(highlights => {
  this.applyHighlighting(highlights);
});
```

---

## Requirements

### Functional Requirements

1. **Box Select + 'h' Key Activation**
   - User must hold 'h' key during box select
   - Without 'h' key: normal selection/filter behavior
   - With 'h' key: highlight mode

2. **Visual Feedback**
   - Highlighted bars: Bright blue (`#1890ff`)
   - Non-highlighted bars: Dimmed gray (`#d9d9d9`, 40% opacity)
   - Smooth transition animation (200ms)

3. **Cross-Chart Coordination**
   - All charts with overlapping dimensions highlight automatically
   - Year → Body Class (show body classes in highlighted years)
   - Year → Manufacturer (show manufacturers in highlighted years)
   - Body Class → Year (show years with highlighted body class)

4. **Query Control Integration**
   - Show "Highlighted" section below active filters
   - Display highlight chips (e.g., "Years: 1965-1970")
   - Click 'X' on chip to clear specific highlight
   - "Clear All Highlights" button

5. **URL State Persistence**
   - Highlights saved in URL with `h_` prefix
   - Shareable URLs preserve highlights
   - Browser back/forward respects highlights
   - Bookmarkable with highlights

6. **Non-Destructive**
   - Highlights never modify base filters
   - Can clear highlights without affecting search
   - Can apply new base filters without clearing highlights

### Non-Functional Requirements

1. **Performance**
   - Chart re-render in <100ms
   - No impact on data fetching (highlights are UI-only)
   - Efficient highlight calculation

2. **Usability**
   - Clear visual distinction (highlighted vs dimmed)
   - Intuitive keyboard shortcut ('h' for highlight)
   - Easy to clear highlights

3. **Accessibility**
   - Keyboard-only operation (Tab + 'h' + Arrow keys)
   - Screen reader announces highlight state
   - High contrast mode support

---

## Implementation Checklist

### Phase 1: UrlParamService Extensions

- [ ] **Task 1.1**: Add highlight parameter helper methods
  - [ ] `getHighlightParam(key): string | null`
  - [ ] `setHighlightParam(key, value): Promise<boolean>`
  - [ ] `getAllHighlightParams(): Record<string, string>`
  - [ ] `hasHighlights(): boolean`
  - [ ] `clearAllHighlights(): Promise<boolean>`
  - [ ] `setHighlightRange(params): Promise<boolean>`

- [ ] **Task 1.2**: Add highlight parameter watching
  - [ ] `watchHighlightParam(key): Observable<string | null>`
  - [ ] `watchAllHighlightParams(): Observable<Record<string, string>>`

- [ ] **Task 1.3**: Write tests for highlight methods
  - [ ] Unit tests for all new methods
  - [ ] Integration tests with Angular Router

### Phase 2: StateManagementService Updates

- [ ] **Task 2.1**: Add highlight state to AppState model
  ```typescript
  interface AppState {
    filters: SearchFilters;
    highlights?: HighlightFilters;  // NEW
    results: VehicleResult[];
    loading: boolean;
    error: string | null;
    totalResults: number;
  }
  ```

- [ ] **Task 2.2**: Update watchUrlChanges to separate base filters from highlights
  - [ ] Extract base filters (ignore `h_*` params)
  - [ ] Extract highlights (only `h_*` params)
  - [ ] Only trigger API calls for base filter changes

- [ ] **Task 2.3**: Add highlights$ observable
  - [ ] Emit highlight state changes
  - [ ] Distinct until changed

- [ ] **Task 2.4**: Write tests for highlight state management
  - [ ] Test base filters trigger API calls
  - [ ] Test highlights do NOT trigger API calls
  - [ ] Test highlights$ emits correctly

### Phase 3: PlotlyHistogramComponent Updates

- [ ] **Task 3.1**: Add keyboard event listener for 'h' key
  - [ ] Detect keydown/keyup for 'h'
  - [ ] Toggle highlight mode flag

- [ ] **Task 3.2**: Modify onBoxSelect handler
  - [ ] Check if highlight mode active
  - [ ] Extract selected range from Plotly event
  - [ ] Call urlParamService.setHighlightRange()

- [ ] **Task 3.3**: Add highlight visualization
  - [ ] Subscribe to highlights$ or watchHighlightParam()
  - [ ] Update chart colors: bright blue for highlighted, gray for dimmed
  - [ ] Add transition animation (200ms)

- [ ] **Task 3.4**: Add visual indicator for highlight mode
  - [ ] Show "Hold 'h' to highlight" tooltip on Box Select
  - [ ] Cursor change when 'h' key pressed

- [ ] **Task 3.5**: Test highlight interactions
  - [ ] Test box select + 'h' key
  - [ ] Test highlight clearing
  - [ ] Test chart updates on URL change

### Phase 4: Cross-Chart Coordination

- [ ] **Task 4.1**: Create HighlightCoordinatorService
  - [ ] Calculate overlapping data across dimensions
  - [ ] Example: Year 1965-1970 → which manufacturers/body classes
  - [ ] Provide helper methods: `getHighlightedManufacturers(yearRange)`

- [ ] **Task 4.2**: Update Body Class chart
  - [ ] Subscribe to highlights$
  - [ ] Calculate which body classes overlap with highlighted years
  - [ ] Apply dimming/highlighting

- [ ] **Task 4.3**: Update Manufacturer chart
  - [ ] Subscribe to highlights$
  - [ ] Calculate which manufacturers overlap
  - [ ] Apply dimming/highlighting

- [ ] **Task 4.4**: Add bi-directional highlighting
  - [ ] Highlight Year chart when Body Class is highlighted
  - [ ] Highlight Year chart when Manufacturer is highlighted

- [ ] **Task 4.5**: Test cross-chart coordination
  - [ ] Test Year → Body Class
  - [ ] Test Year → Manufacturer
  - [ ] Test Body Class → Year
  - [ ] Test multiple simultaneous highlights

### Phase 5: Query Control Integration

- [ ] **Task 5.1**: Create HighlightChipComponent
  - [ ] Display highlight name and range
  - [ ] Click 'X' to clear specific highlight
  - [ ] Visual distinction from filter chips

- [ ] **Task 5.2**: Update QueryControlComponent
  - [ ] Add "Highlighted" section below filters
  - [ ] Render HighlightChipComponents
  - [ ] Add "Clear All Highlights" button

- [ ] **Task 5.3**: Subscribe to highlights$ in QueryControl
  - [ ] Display active highlights
  - [ ] Handle clear actions

- [ ] **Task 5.4**: Add highlight statistics
  - [ ] Show count of highlighted records
  - [ ] Show percentage of total data

### Phase 6: UI/UX Enhancements

- [ ] **Task 6.1**: Add highlight mode indicator
  - [ ] Visual cue when 'h' key is pressed
  - [ ] Tooltip: "Highlight mode active"

- [ ] **Task 6.2**: Add highlight legend
  - [ ] Show color key: Blue = Highlighted, Gray = Dimmed
  - [ ] Toggle highlight visibility (show/hide)

- [ ] **Task 6.3**: Add keyboard shortcuts
  - [ ] Ctrl+H: Toggle all highlights on/off
  - [ ] Escape: Clear all highlights

- [ ] **Task 6.4**: Add animations
  - [ ] Smooth color transitions (200ms ease-in-out)
  - [ ] Fade in/out for highlight chips

### Phase 7: Testing & Deployment

- [ ] **Task 7.1**: Unit tests
  - [ ] UrlParamService highlight methods
  - [ ] StateManagementService highlight state
  - [ ] HighlightCoordinatorService calculations

- [ ] **Task 7.2**: Integration tests
  - [ ] URL parameter changes propagate to charts
  - [ ] Cross-chart coordination works
  - [ ] Query Control displays correctly

- [ ] **Task 7.3**: E2E tests
  - [ ] User can highlight data with Box Select + 'h'
  - [ ] Highlights appear across all charts
  - [ ] URL preserves highlights
  - [ ] Clearing highlights works

- [ ] **Task 7.4**: Performance testing
  - [ ] Chart re-render performance (<100ms)
  - [ ] No API calls triggered by highlights
  - [ ] Memory usage acceptable

- [ ] **Task 7.5**: Production deployment
  - [ ] Deploy frontend updates
  - [ ] Monitor for issues
  - [ ] User feedback collection

- [ ] **Task 7.6**: Documentation
  - [ ] Update CLAUDE.md with highlight feature
  - [ ] Add user guide with screenshots
  - [ ] Document UrlParamService extensions

---

## Data Model

### HighlightFilters Interface

```typescript
/**
 * Highlight filters (UI-only state)
 * Maps to URL parameters with h_ prefix
 */
export interface HighlightFilters {
  yearMin?: number;       // h_yearMin
  yearMax?: number;       // h_yearMax
  manufacturer?: string;  // h_manufacturer (comma-separated)
  model?: string;        // h_model (comma-separated)
  bodyClass?: string;    // h_bodyClass (comma-separated)

  // Future: Support for other dimensions
  stateCode?: string;    // h_stateCode
  conditionMin?: number; // h_conditionMin
  conditionMax?: number; // h_conditionMax
}

/**
 * Extended AppState with highlights
 */
export interface AppState {
  filters: SearchFilters;      // Base filters (affect API)
  highlights?: HighlightFilters; // Highlight filters (UI only)
  results: VehicleResult[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  statistics?: VehicleStatistics;
}
```

---

## API (No Backend Changes Required)

**Key Principle**: Highlights are **client-side only** - no backend API changes needed.

**Why**:
- Base filters fetch all data within range (e.g., 1960-1980)
- Highlights apply visual emphasis on already-fetched data
- No additional data fetching required

**Example**:
```
User searches: Ford Mustang, 1960-1980
API call: GET /api/v1/vehicles/details?models=Ford:Mustang&yearMin=1960&yearMax=1980
Returns: 500 vehicles

User highlights: 1965-1970
No API call - frontend filters the 500 vehicles to show which are in 1965-1970
Visual: 300 vehicles highlighted (blue), 200 dimmed (gray)
```

---

## Visual Design

### Color Palette

| State | Color | Opacity | Usage |
|-------|-------|---------|-------|
| **Highlighted** | `#1890ff` | 100% | Selected data bars |
| **Dimmed** | `#d9d9d9` | 40% | Non-selected data bars |
| **Highlight Chip** | `#91d5ff` | 100% | Chip background |
| **Highlight Chip Text** | `#003a8c` | 100% | Chip text color |

### Chart Layout

```
┌──────────────────────────────────────────────────────┐
│  Year Distribution                      [Box Select] │
│                                                      │
│  1960 ░░░░░░░░ 150        ← Dimmed (40% opacity)   │
│  1965 ████████████ 200     ← Highlighted (bright)   │
│  1970 ██████████████ 250   ← Highlighted (bright)   │
│  1975 ░░░░░░░░ 150        ← Dimmed (40% opacity)   │
│  1980 ░░░░░░ 100          ← Dimmed (40% opacity)   │
│                                                      │
│  💡 Tip: Hold 'h' while dragging to highlight       │
└──────────────────────────────────────────────────────┘
```

---

## User Workflows

### Workflow 1: Highlight Subset of Data

1. User searches for "Ford Mustang, 1960-1980"
2. Year chart shows distribution across 20 years
3. User wants to focus on "First Generation" (1965-1973)
4. User clicks Box Select tool
5. User holds 'h' key
6. User drags rectangle over 1965-1973 range
7. **Result**:
   - 1965-1973 bars turn bright blue
   - 1960-1964, 1974-1980 bars dim to gray
   - Body Class chart highlights corresponding body classes
   - Query Control shows "🔦 Years: 1965-1973" chip
   - URL updates: `?models=Ford:Mustang&yearMin=1960&yearMax=1980&h_yearMin=1965&h_yearMax=1973`

### Workflow 2: Share Highlighted Data

1. User has highlighted data (from Workflow 1)
2. User copies URL from address bar
3. User shares URL with colleague via email/Slack
4. Colleague opens URL
5. **Result**:
   - Same search loads (Ford Mustang, 1960-1980)
   - Highlights restore automatically (1965-1973)
   - Colleague sees same visual emphasis

### Workflow 3: Clear Highlights

**Option A**: Click chip 'X'
1. User clicks 'X' on "🔦 Years: 1965-1973" chip
2. Highlights clear, all bars return to default blue

**Option B**: Clear All button
1. User clicks "Clear All Highlights" in Query Control
2. All highlights clear

**Option C**: Keyboard shortcut
1. User presses Escape key
2. All highlights clear

---

## Benefits of UrlParamService Integration

### 1. Consistent State Management ✅

Highlights use the same pattern as all other state:
- URL as single source of truth
- Shareable via URL
- Bookmarkable
- Browser back/forward support

### 2. No New Architecture ✅

Builds on existing UrlParamService infrastructure:
- Same parameter watching patterns
- Same update methods (with prefix)
- Same observable streams

### 3. Type-Safe ✅

Helper methods provide type safety:
```typescript
// Type-safe highlight access
this.urlParamService.getHighlightParam('yearMin'); // string | null
this.urlParamService.setHighlightRange({ yearMin: 1965, yearMax: 1970 });
```

### 4. Clear Separation ✅

Namespace prefix makes purpose obvious:
- `yearMin` = base filter (API)
- `h_yearMin` = highlight (UI only)

### 5. Performance ✅

StateManagementService can efficiently ignore highlight changes:
```typescript
// Only base filters trigger API calls
if (params has non-h_ changes) {
  fetchData(); // API call
}

// Highlights only update UI
if (params has h_ changes) {
  emitHighlights(); // Observable emission, no API
}
```

---

## UrlParamService Changes Summary

### New Methods (7 total)

```typescript
// Individual highlight parameter methods
getHighlightParam(key: string): string | null
setHighlightParam(key: string, value: string | number): Promise<boolean>
watchHighlightParam(key: string): Observable<string | null>

// Bulk highlight methods
getAllHighlightParams(): Record<string, string>
setHighlightRange(params: Record<string, string | number>): Promise<boolean>
watchAllHighlightParams(): Observable<Record<string, string>>

// Utility methods
hasHighlights(): boolean
clearAllHighlights(): Promise<boolean>
```

### Pattern Extension (NOT Breaking Change)

Existing UrlParamService methods work unchanged:
- `getParam()` - works for both base and `h_*` params
- `updateParam()` - works for both base and `h_*` params
- `watchParam()` - works for both base and `h_*` params

New methods are **convenience wrappers** that add `h_` prefix automatically.

### Code Example

```typescript
// OLD: Manual prefix handling (works, but verbose)
this.urlParamService.updateParam('h_yearMin', 1965);
this.urlParamService.watchParam('h_yearMin').subscribe(...);

// NEW: Convenience methods (cleaner, intent clearer)
this.urlParamService.setHighlightParam('yearMin', 1965);
this.urlParamService.watchHighlightParam('yearMin').subscribe(...);
```

---

## StateManagementService Changes Summary

### 1. AppState Model Extension

```typescript
// Add highlights field
interface AppState {
  filters: SearchFilters;
  highlights?: HighlightFilters; // NEW
  // ... rest unchanged
}
```

### 2. URL Watcher Logic Update

```typescript
// Before: All params trigger API calls
watchUrlChanges() {
  router.events.subscribe(() => {
    const filters = routeState.paramsToFilters();
    if (filters changed) {
      this.fetchVehicleData(); // All changes = API call
    }
  });
}

// After: Separate base filters from highlights
watchUrlChanges() {
  router.events.subscribe(() => {
    const allParams = routeState.getCurrentParams();
    const baseFilters = this.extractBaseFilters(allParams);
    const highlights = this.extractHighlights(allParams);

    if (baseFilters changed) {
      this.fetchVehicleData(); // Only base filters = API call
    }

    if (highlights changed) {
      this.updateState({ highlights }); // Highlights = UI update only
    }
  });
}
```

### 3. New Observable

```typescript
// Add highlights$ stream
public highlights$ = this.state$.pipe(
  map(state => state.highlights || {}),
  distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
);
```

### 4. Helper Methods

```typescript
// Extract base filters (ignore h_* params)
private extractBaseFilters(params: Record<string, string>): SearchFilters {
  const filters = {};
  Object.keys(params).forEach(key => {
    if (!key.startsWith('h_')) {
      filters[key] = params[key];
    }
  });
  return filters;
}

// Extract highlights (only h_* params)
private extractHighlights(params: Record<string, string>): HighlightFilters {
  const highlights = {};
  Object.keys(params).forEach(key => {
    if (key.startsWith('h_')) {
      highlights[key.substring(2)] = params[key];
    }
  });
  return highlights;
}
```

---

## Success Criteria

- [ ] User can highlight data with Box Select + 'h' key
- [ ] Highlighted bars turn bright blue, others dimmed gray
- [ ] Highlights appear in URL with `h_` prefix
- [ ] Highlights are shareable via URL
- [ ] Cross-chart coordination works (Year → Body Class, etc.)
- [ ] Query Control shows highlight chips
- [ ] Clearing highlights works (chip 'X', Clear All button)
- [ ] No API calls triggered by highlight changes
- [ ] Chart re-render performance <100ms
- [ ] 90% test coverage for highlight features

---

## Related Documentation

- **UrlParamService**: `frontend/src/app/core/services/url-param.service.ts`
- **StateManagementService**: `frontend/src/app/core/services/state-management.service.ts`
- **URL-First Paradigm**: `docs/design/url-first-paradigm-validation.md`
- **PlotlyHistogramComponent**: `frontend/src/app/shared/components/plotly-histogram/`

---

## Future Enhancements (v2.0)

- [ ] Highlight presets (save/load named highlights)
- [ ] Multiple simultaneous highlights (different colors)
- [ ] Highlight annotations (add notes to highlighted regions)
- [ ] Highlight export (screenshot with highlighted data)
- [ ] Smart highlights (ML suggests interesting ranges)
- [ ] Highlight templates (common patterns: "First Gen", "Classic Era")

---

**END OF DOCUMENT**
