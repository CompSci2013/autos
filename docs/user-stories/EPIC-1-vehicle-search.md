# Epic 1: Vehicle Search & Discovery

**Epic ID:** EPIC-1
**Epic Owner:** Product Manager
**Status:** In Progress
**Priority:** Critical
**Business Value:** Core functionality for finding and exploring vehicle data

---

## Epic Description

Enable users to search, filter, and discover vehicle specifications across a large dataset of manufacturer-model combinations. Users should be able to quickly find vehicles of interest, apply multiple filters, and view detailed results.

**Success Metrics:**
- 90% of searches return results in < 2 seconds
- Users can bookmark and share search results
- 95% filter accuracy

---

## Feature 1.1: Manufacturer/Model Selection

### Story 1.1.1: Browse Manufacturer List

**As an** end user,
**I want** to see a list of all available manufacturers,
**So that** I can explore what brands are in the dataset.

**Priority:** High
**Story Points:** 3
**Sprint:** Sprint 1

#### Acceptance Criteria
- [ ] Manufacturer list loads on page load
- [ ] Manufacturers are sorted alphabetically
- [ ] Each manufacturer shows total model count
- [ ] List is paginated (50 per page)
- [ ] Search/filter box filters manufacturers in real-time

#### Technical Notes
- Endpoint: `GET /api/v1/manufacturer-model-combinations`
- Uses aggregation query on Elasticsearch
- Client-side filtering for search box

#### Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests for component
- [ ] Integration test for API endpoint
- [ ] Loading state displays during fetch
- [ ] Error handling for failed API calls

---

### Story 1.1.2: Expand Manufacturer to View Models

**As an** end user,
**I want** to expand a manufacturer row to see all available models,
**So that** I can drill down into specific vehicles.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 1

#### Acceptance Criteria
- [ ] Click on manufacturer row expands to show models
- [ ] Models are sorted alphabetically
- [ ] Each model shows document count (number of vehicle records)
- [ ] Expand/collapse icon indicates state (▶ collapsed, ▼ expanded)
- [ ] Multiple manufacturers can be expanded simultaneously
- [ ] Collapse hides models again

#### Technical Notes
- Uses hierarchical data structure (ManufacturerGroup)
- Models nested under manufacturer in response
- NG-ZORRO table with expandable rows

#### Definition of Done
- [ ] Expand/collapse animation smooth
- [ ] State persists during pagination
- [ ] Keyboard navigation supported (Enter key toggles)
- [ ] Accessible (ARIA attributes)

---

### Story 1.1.3: Select Multiple Model Combinations

**As an** end user,
**I want** to select multiple manufacturer-model combinations using checkboxes,
**So that** I can search for several vehicles at once.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 2

#### Acceptance Criteria
- [ ] Checkbox appears next to each model
- [ ] Click checkbox selects/deselects model
- [ ] Selected models display in "Selected Items" chip list
- [ ] Can select models from different manufacturers
- [ ] Selection count updates in real-time
- [ ] Maximum 50 selections (show warning message)
- [ ] "Select All" checkbox at manufacturer level selects all models for that manufacturer

#### Technical Notes
- Selection state: `ManufacturerModelSelection[]`
- Chips use NG-ZORRO `nz-tag` component
- Validation: max 50 selections (URL length limit)

#### Definition of Done
- [ ] Selections sync with URL query parameters
- [ ] Deselecting removes chip immediately
- [ ] Chip close button deselects model
- [ ] Selected state persists across page refreshes

---

### Story 1.1.4: Apply Model Selections

**As an** end user,
**I want** to click an "Apply" button to execute my search,
**So that** I can view results for my selected models.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 2

#### Acceptance Criteria
- [ ] "Apply" button visible when selections exist
- [ ] Button disabled when no selections
- [ ] Click triggers vehicle details search
- [ ] Results table scrolls into view automatically
- [ ] Apply button shows loading spinner during request
- [ ] Button label: "Apply Selections (N)" where N = selection count

#### Technical Notes
- Emits `selectionChange` event to parent
- Parent updates StateManagementService
- Triggers `fetchVehicleData()` API call

#### Definition of Done
- [ ] URL updates with `models` query parameter
- [ ] Results appear within 2 seconds for typical queries
- [ ] Error message shown if API fails

---

### Story 1.1.5: Clear All Selections

**As an** end user,
**I want** to clear all my selections with one click,
**So that** I can start a fresh search without manually deselecting each model.

**Priority:** Medium
**Story Points:** 2
**Sprint:** Sprint 2

#### Acceptance Criteria
- [ ] "Clear All" button visible when selections exist
- [ ] Click clears all checkboxes
- [ ] All chips removed from selected items list
- [ ] Results table clears
- [ ] URL updates (removes `models` parameter)
- [ ] Confirmation dialog if more than 10 selections

#### Technical Notes
- Increments `pickerClearTrigger` to signal child component
- Calls `StateManagementService.resetFilters()`

#### Definition of Done
- [ ] Animations smooth (chips fade out)
- [ ] Immediate feedback (no delay)

---

## Feature 1.2: Advanced Filtering

### Story 1.2.1: Filter by Year Range

**As an** end user,
**I want** to filter search results by year range (min/max),
**So that** I can narrow results to specific time periods.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 3

#### Acceptance Criteria
- [ ] Two input fields: "Year Min" and "Year Max"
- [ ] Inputs accept 4-digit years only
- [ ] Validation: min ≤ max
- [ ] Filter applied on input blur or Enter key
- [ ] Results update automatically
- [ ] URL updates with `yearMin` and `yearMax` parameters
- [ ] Clear button removes filter

#### Technical Notes
- Backend uses Elasticsearch range query
- Frontend debounces input (300ms)
- Validation shows error message below inputs

#### Definition of Done
- [ ] Works with other filters (manufacturer, body class)
- [ ] Empty inputs = no filter applied
- [ ] Handles invalid input gracefully

---

### Story 1.2.2: Filter by Manufacturer (Results Table)

**As an** end user,
**I want** to filter the results table by manufacturer name,
**So that** I can focus on specific brands within my selected models.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 3

#### Acceptance Criteria
- [ ] Text input in "Manufacturer" column header
- [ ] Case-insensitive partial match filtering
- [ ] Debounced (300ms) to avoid excessive requests
- [ ] Results update automatically
- [ ] URL updates with `manufacturer` parameter
- [ ] Clear button (X icon) in input

#### Technical Notes
- Backend uses Elasticsearch wildcard query
- Frontend uses `distinctUntilChanged()` to prevent duplicate requests

#### Definition of Done
- [ ] Filter icon in column header shows active state
- [ ] Placeholder text: "Filter manufacturer..."

---

### Story 1.2.3: Filter by Model (Results Table)

**As an** end user,
**I want** to filter the results table by model name,
**So that** I can narrow down to specific models within selected manufacturers.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 3

#### Acceptance Criteria
- [ ] Text input in "Model" column header
- [ ] Case-insensitive partial match filtering
- [ ] Debounced (300ms)
- [ ] Results update automatically
- [ ] URL updates with `model` parameter
- [ ] Clear button (X icon) in input

#### Technical Notes
- Same pattern as manufacturer filter
- Backend wildcard query

#### Definition of Done
- [ ] Works in combination with manufacturer filter
- [ ] Preserves other active filters

---

### Story 1.2.4: Filter by Body Class

**As an** end user,
**I want** to filter results by body class (Sedan, SUV, Pickup, etc.),
**So that** I can find vehicles of a specific type.

**Priority:** Medium
**Story Points:** 3
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Dropdown select in "Body Class" column header
- [ ] Options: All, Sedan, SUV, Pickup, Coupe, Convertible, Wagon, Van, etc.
- [ ] Selection updates results immediately
- [ ] URL updates with `bodyClass` parameter
- [ ] "All" option clears filter

#### Technical Notes
- Options dynamically loaded from aggregation query
- Backend uses Elasticsearch term query

#### Definition of Done
- [ ] Dropdown styled consistently (NG-ZORRO)
- [ ] Shows count of results per body class

---

### Story 1.2.5: Filter by Data Source

**As an** data analyst,
**I want** to filter results by data source (NHTSA, CarMD, etc.),
**So that** I can compare data from different providers.

**Priority:** Low
**Story Points:** 2
**Sprint:** Sprint 4

#### Acceptance Criteria
- [ ] Dropdown select in "Data Source" column header
- [ ] Options: All, NHTSA, CarMD, etc.
- [ ] Selection updates results immediately
- [ ] URL updates with `dataSource` parameter

#### Technical Notes
- Same pattern as body class filter

#### Definition of Done
- [ ] Tooltip explains data sources

---

## Feature 1.3: Search Results Display

### Story 1.3.1: Display Vehicle Results in Table

**As an** end user,
**I want** to see search results in a sortable table,
**So that** I can easily browse matching vehicles.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 5

#### Acceptance Criteria
- [ ] Table displays: Vehicle ID, Manufacturer, Model, Year, Body Class, Data Source
- [ ] Rows are clickable/expandable (expand icon)
- [ ] Loading state shows spinner
- [ ] Empty state shows "No results" message
- [ ] Error state shows error message with retry button
- [ ] Table is responsive (mobile-friendly)

#### Technical Notes
- Component: `VehicleResultsTableComponent`
- Uses NG-ZORRO `nz-table`
- Data from `StateManagementService.results$`

#### Definition of Done
- [ ] Table renders 1000+ rows without performance issues
- [ ] Accessible (keyboard navigation, screen readers)

---

### Story 1.3.2: Sort Results by Column

**As an** end user,
**I want** to click column headers to sort results,
**So that** I can order vehicles by different attributes.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 5

#### Acceptance Criteria
- [ ] Click column header to sort ascending
- [ ] Click again to sort descending
- [ ] Click third time to remove sort (default order)
- [ ] Sort icon indicates state (▲ asc, ▼ desc, ↕ none)
- [ ] Only one column sorted at a time
- [ ] URL updates with `sort` and `sortDirection` parameters
- [ ] Sortable columns: Manufacturer, Model, Year, Body Class, Data Source

#### Technical Notes
- Server-side sorting (Elasticsearch)
- Backend uses `.keyword` suffix for text fields

#### Definition of Done
- [ ] Sort state persists across page refreshes
- [ ] Animation smooth during sort

---

### Story 1.3.3: Paginate Results

**As an** end user,
**I want** results paginated with configurable page size,
**So that** I can navigate large result sets easily.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 5

#### Acceptance Criteria
- [ ] Pagination controls at bottom of table
- [ ] Shows current page, total pages, total results
- [ ] Page size options: 10, 20, 50, 100
- [ ] Previous/Next buttons
- [ ] Jump to page input
- [ ] URL updates with `page` and `size` parameters
- [ ] Defaults: page=1, size=20

#### Technical Notes
- Server-side pagination (Elasticsearch `from`/`size`)
- NG-ZORRO `nz-pagination` component

#### Definition of Done
- [ ] Page size preference saved to localStorage
- [ ] Scroll to top when page changes

---

### Story 1.3.4: Display Result Count

**As an** end user,
**I want** to see total result count and current range,
**So that** I understand how many vehicles match my search.

**Priority:** Medium
**Story Points:** 2
**Sprint:** Sprint 5

#### Acceptance Criteria
- [ ] Display format: "Showing 1-20 of 1,234 results"
- [ ] Updates when filters/pagination change
- [ ] Visible above table

#### Technical Notes
- Calculated from `page`, `size`, and `totalResults`

#### Definition of Done
- [ ] Handles edge cases (0 results, last page < page size)

---

## Feature 1.4: VIN Instance Details

### Story 1.4.1: Expand Vehicle Row to Show VIN Instances

**As an** end user,
**I want** to click a vehicle row to expand and see individual VIN instances,
**So that** I can view specific vehicle details.

**Priority:** High
**Story Points:** 8
**Sprint:** Sprint 6

#### Acceptance Criteria
- [ ] Click row or expand icon to expand
- [ ] Expansion shows loading spinner while fetching instances
- [ ] Default: 8 VIN instances loaded
- [ ] Each instance displays: VIN, Condition, Mileage, State, Color, Value
- [ ] Click again to collapse
- [ ] Expansion content indented/styled distinctly

#### Technical Notes
- Endpoint: `GET /api/v1/vehicles/:vehicleId/instances?count=8`
- VINs generated deterministically (not stored in DB)
- Uses `VINGenerator` utility

#### Definition of Done
- [ ] Expansion smooth (animation)
- [ ] Only one row expanded at a time (optional: multiple)
- [ ] Error handling if instances fail to load

---

### Story 1.4.2: Display VIN Instance Details

**As an** end user,
**I want** to see detailed attributes for each VIN instance,
**So that** I can understand individual vehicle characteristics.

**Priority:** High
**Story Points:** 5
**Sprint:** Sprint 6

#### Acceptance Criteria
- [ ] Display fields:
  - VIN (formatted, copyable)
  - Condition Rating (1-5 stars)
  - Condition Description (Project, Fair, Good, Excellent, Concours)
  - Mileage (formatted with commas)
  - Mileage Verified (✓ or ✗)
  - Registered State (2-letter code)
  - Registration Status (Active, Historic)
  - Title Status (Clean, Rebuilt)
  - Exterior Color
  - Factory Options (tags/chips)
  - Estimated Value (currency formatted)
  - Matching Numbers (Yes/No)
  - Last Service Date
- [ ] Responsive layout (cards on mobile)

#### Technical Notes
- VINs generated with realistic distributions
- Geographic weighting for states (CA 15%, TX 8%, etc.)
- Era-appropriate colors (pre-1970 vs post-1970)

#### Definition of Done
- [ ] All fields display correctly
- [ ] Currency formatting: $XX,XXX
- [ ] Date formatting: YYYY-MM-DD

---

### Story 1.4.3: Load More VIN Instances

**As an** end user,
**I want** to load additional VIN instances beyond the initial 8,
**So that** I can explore more examples if needed.

**Priority:** Low
**Story Points:** 3
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] "Load More" button at bottom of expansion
- [ ] Loads 8 more instances per click
- [ ] Maximum 20 total instances per vehicle
- [ ] Button disables when max reached
- [ ] Button shows loading state during fetch

#### Technical Notes
- Same endpoint with higher `count` parameter
- VINs deterministic (same vehicle_id always generates same VINs)

#### Definition of Done
- [ ] No duplicate VINs shown
- [ ] Smooth append animation

---

### Story 1.4.4: Copy VIN to Clipboard

**As an** end user,
**I want** to click a copy icon next to VIN to copy it to clipboard,
**So that** I can use it elsewhere (CARFAX, insurance quotes, etc.).

**Priority:** Low
**Story Points:** 2
**Sprint:** Backlog

#### Acceptance Criteria
- [ ] Copy icon next to each VIN
- [ ] Click copies VIN to clipboard
- [ ] Toast notification: "VIN copied!"
- [ ] Icon changes briefly to checkmark (✓) after copy

#### Technical Notes
- Uses browser Clipboard API
- Fallback for older browsers (select + copy)

#### Definition of Done
- [ ] Works on all modern browsers
- [ ] Accessible (keyboard shortcut)

---

## Backlog Stories (Future)

### Story 1.X.X: Save Favorite Searches
- Allow users to bookmark searches with custom names
- Requires user authentication

### Story 1.X.X: Export Search Results
- Export results to CSV/Excel
- Include current filters and sort order

### Story 1.X.X: Compare Vehicles Side-by-Side
- Select up to 5 vehicles
- Display in comparison table

### Story 1.X.X: Advanced Search (Full-Text)
- Search across all fields (not just M/M)
- Fuzzy matching, typo tolerance

---

**Epic Status:** 60% Complete (15/25 stories)
**Last Updated:** 2025-10-22
