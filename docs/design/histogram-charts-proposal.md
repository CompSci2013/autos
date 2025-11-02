# Histogram Charts Proposal for AUTOS Application

**Document Type:** Feature Design Proposal
**Created:** 2025-11-01
**Branch:** feature/charts
**Purpose:** Propose histogram chart visualizations for vehicle search results, inspired by the transportation application

---

## Table of Contents

1. [Overview](#overview)
2. [Transportation App Analysis](#transportation-app-analysis)
3. [Proposed Charts for AUTOS](#proposed-charts-for-autos)
4. [Implementation Architecture](#implementation-architecture)
5. [Backend Requirements](#backend-requirements)
6. [Frontend Components](#frontend-components)
7. [Integration Plan](#integration-plan)
8. [Success Metrics](#success-metrics)

---

## Overview

The transportation application includes two histogram charts that provide visual distribution statistics below the search results table:

1. **Aircraft by Manufacturer** - Horizontal bar chart showing aircraft count per manufacturer
2. **Models by Manufacturer** - Horizontal bar chart showing model distribution (filtered by selected manufacturer)

These charts enhance the user experience by:
- Providing at-a-glance insights into data distribution
- Allowing interactive filtering (clicking a manufacturer bar filters the view)
- Showing relative proportions visually (bar width)
- Maintaining context with the search results

**Goal:** Implement similar histogram visualizations for the AUTOS application with vehicle-specific insights.

---

## Transportation App Analysis

### Component Structure

**Histogram Component** (`histogram.component.ts`):
```typescript
interface HistogramData {
  label: string;
  count: number;
}

@Component({
  selector: 'app-histogram',
  inputs: [
    'title',           // Chart title
    'data',            // HistogramData[]
    'clickable',       // Enable/disable bar clicks
    'selectedLabel',   // Currently selected bar
    'maxHeight'        // Scrollable container height
  ],
  outputs: [
    'barClick'         // Event emitted when bar clicked
  ]
})
```

**Features:**
- Auto-sorts by count (descending)
- Calculates bar widths as percentages of max value
- Minimum 2% width for visibility
- Hover effects (for clickable bars)
- Selection highlighting (green gradient)
- Scrollable container (for many items)
- Shows total count and item count

### Data Model

**Backend Response:**
```typescript
interface SearchStatistics {
  byManufacturer: { [manufacturer: string]: number };
  modelsByManufacturer: {
    [manufacturer: string]: {
      [model: string]: number
    }
  };
  totalCount: number;
}
```

**Frontend Transformation:**
```typescript
get manufacturerHistogramData(): HistogramData[] {
  return Object.entries(this.state.statistics.byManufacturer)
    .map(([label, count]) => ({ label, count }));
}

get modelsHistogramData(): HistogramData[] {
  // Filters by selectedManufacturer, flattens models
  // Returns: [{ label: "Boeing 737", count: 50 }, ...]
}
```

### Visual Design

**Layout:**
- Grid layout (2 columns on desktop, 1 on mobile)
- White background, bordered cards
- Header with title and count summary
- Scrollable bar area (max-height: 400px)
- Each bar row: `[Label (150px)] [Bar (flex)] [Count (60px)]`

**Colors:**
- Default bar: Blue gradient (#4a90e2 → #5ba3f5)
- Hover: Darker blue with shadow
- Selected: Green gradient (#28a745 → #34ce57)
- Background: Light gray (#f0f0f0)

### User Interactions

1. **Click manufacturer bar** → Filters results to that manufacturer
2. **Click again** → Deselects (shows all)
3. **Models chart updates** → Shows only models for selected manufacturer
4. **Scroll for many items** → Container scrolls, header stays fixed

---

## Proposed Charts for AUTOS

### Core Charts (Inspired by Transportation)

#### 1. Vehicles by Manufacturer

**Purpose:** Show distribution of vehicles across manufacturers

**Data Source:** Backend aggregation on `manufacturer` field

**Features:**
- ✅ Clickable (filter to manufacturer)
- ✅ Selection highlighting
- ✅ Sorted by count (descending)
- ✅ Scrollable (if >20 manufacturers)

**Example Data:**
```typescript
[
  { label: "Ford", count: 25000 },
  { label: "Chevrolet", count: 18000 },
  { label: "Toyota", count: 15000 },
  // ... more manufacturers
]
```

**Interaction:** Clicking "Ford" filters results table to show only Ford vehicles

---

#### 2. Models by Manufacturer

**Purpose:** Show distribution of models within selected manufacturer (or all if none selected)

**Data Source:** Backend aggregation on `manufacturer` + `model` fields

**Features:**
- ❌ Not clickable (informational only)
- ✅ Filtered by selected manufacturer
- ✅ Sorted by count (descending)
- ✅ Scrollable (if >20 models)

**Example Data (Ford selected):**
```typescript
[
  { label: "Ford F-150", count: 8500 },
  { label: "Ford Mustang", count: 3200 },
  { label: "Ford Explorer", count: 2800 },
  // ... more Ford models
]
```

**Behavior:** Automatically updates when manufacturer selected/deselected

---

### Vehicle-Specific Charts (New Insights)

#### 3. Vehicles by Year Range

**Purpose:** Show temporal distribution of vehicles across decades or year ranges

**Data Source:** Backend aggregation on `year` field, grouped into ranges

**Features:**
- ✅ Clickable (filter to year range)
- ✅ Selection highlighting
- ✅ Chronological order (ascending)
- ❌ Not scrollable (fixed ~10-12 ranges)

**Example Data:**
```typescript
[
  { label: "1960-1969", count: 1200 },
  { label: "1970-1979", count: 2500 },
  { label: "1980-1989", count: 4800 },
  { label: "1990-1999", count: 8500 },
  { label: "2000-2009", count: 15000 },
  { label: "2010-2019", count: 22000 },
  { label: "2020-2025", count: 18000 }
]
```

**Interaction:** Clicking "2010-2019" sets `yearMin=2010` and `yearMax=2019` filters

**Value:** Helps users understand the temporal distribution of the dataset, identify popular eras

---

#### 4. Vehicles by Body Class

**Purpose:** Show distribution of vehicles across body classes (Sedan, SUV, Truck, etc.)

**Data Source:** Backend aggregation on `body_class` field

**Features:**
- ✅ Clickable (filter to body class)
- ✅ Selection highlighting
- ✅ Sorted by count (descending)
- ❌ Not scrollable (typically <15 body classes)

**Example Data:**
```typescript
[
  { label: "Pickup", count: 28000 },
  { label: "SUV", count: 22000 },
  { label: "Sedan", count: 18000 },
  { label: "Coupe", count: 8500 },
  { label: "Van", count: 5200 },
  { label: "Unknown", count: 3000 }
]
```

**Interaction:** Clicking "Pickup" sets `bodyClass=Pickup` filter

**Value:** Helps users explore vehicles by category, identify dataset composition

---

## Recommended Chart Combinations

### Option A: Classic Pairing (Transportation-Inspired)

**Charts:**
1. Vehicles by Manufacturer
2. Models by Manufacturer

**Layout:** 2-column grid (50% / 50%)

**Pros:**
- ✅ Matches transportation app (familiar to developers)
- ✅ Simple to implement (reuse existing pattern)
- ✅ Focuses on hierarchy (manufacturer → model)

**Cons:**
- ❌ Doesn't leverage vehicle-specific dimensions (year, body class)
- ❌ Limited insights beyond manufacturer distribution

**Best For:** MVP, quick implementation, consistency with transportation

---

### Option B: Vehicle Insights (Recommended)

**Charts:**
1. Vehicles by Manufacturer (clickable)
2. Vehicles by Year Range (clickable)
3. Vehicles by Body Class (clickable)
4. Models by Manufacturer (filtered by selected manufacturer, not clickable)

**Layout:** 2×2 grid

**Pros:**
- ✅ Leverages vehicle-specific dimensions
- ✅ Provides richer insights (temporal + categorical)
- ✅ Multiple exploration paths (manufacturer, year, body class)
- ✅ All interactive (except models chart)

**Cons:**
- ❌ More complex implementation (2 extra charts)
- ❌ Requires more backend aggregations
- ❌ More screen space required

**Best For:** Full-featured implementation, data exploration focus

---

### Option C: Hybrid (Balanced)

**Charts:**
1. Vehicles by Manufacturer (clickable)
2. Models by Manufacturer (filtered, not clickable)
3. Vehicles by Year Range (clickable)

**Layout:** 2 charts on top (50%/50%), 1 chart below (100% width)

**Pros:**
- ✅ Balances classic pairing + vehicle-specific insight
- ✅ Year range is most valuable vehicle-specific dimension
- ✅ Moderate complexity

**Cons:**
- ❌ Omits body class (less important than year)
- ❌ Asymmetric layout (1 full-width chart)

**Best For:** Balanced approach, prioritizes temporal distribution

---

## Implementation Architecture

### Component Structure

```
frontend/src/app/shared/components/
├── histogram/
│   ├── histogram.component.ts          # Reusable histogram component
│   ├── histogram.component.html        # Template (bar rendering)
│   ├── histogram.component.scss        # Styling
│   └── histogram.component.spec.ts     # Unit tests
```

### Models

```typescript
// frontend/src/app/models/vehicle-statistics.model.ts

export interface VehicleStatistics {
  byManufacturer: { [manufacturer: string]: number };
  modelsByManufacturer: {
    [manufacturer: string]: {
      [model: string]: number
    }
  };
  byYearRange: { [yearRange: string]: number };
  byBodyClass: { [bodyClass: string]: number };
  totalCount: number;
}

export interface VehicleSearchResponse {
  results: VehicleResult[];
  total: number;
  page: number;
  size: number;
  statistics: VehicleStatistics; // NEW
}

export interface HistogramData {
  label: string;
  count: number;
}
```

### State Management Integration

```typescript
// StateManagementService updates

interface SearchState {
  filters: SearchFilters;
  results: VehicleResult[];
  statistics: VehicleStatistics; // NEW
  selectedManufacturer: string | null; // NEW
  // ... existing properties
}

// Methods
selectManufacturer(manufacturer: string | null): void {
  // Update selectedManufacturer in state
  // Update URL (e.g., ?selectedMfr=Ford)
  // Optionally filter results table
}

selectYearRange(yearMin: number, yearMax: number): void {
  // Update yearMin/yearMax filters
  // Sync to URL
  // Trigger data fetch
}

selectBodyClass(bodyClass: string): void {
  // Update bodyClass filter
  // Sync to URL
  // Trigger data fetch
}
```

---

## Backend Requirements

### API Endpoint Updates

**Existing Endpoint:** `GET /api/v1/search/vehicle-details`

**Current Response:**
```json
{
  "results": [...],
  "total": 100000,
  "page": 1,
  "size": 20,
  "totalPages": 5000
}
```

**Updated Response (ADD `statistics`):**
```json
{
  "results": [...],
  "total": 100000,
  "page": 1,
  "size": 20,
  "totalPages": 5000,
  "statistics": {
    "byManufacturer": {
      "Ford": 25000,
      "Chevrolet": 18000,
      "Toyota": 15000
    },
    "modelsByManufacturer": {
      "Ford": {
        "F-150": 8500,
        "Mustang": 3200
      },
      "Chevrolet": {
        "Silverado": 7200,
        "Corvette": 1800
      }
    },
    "byYearRange": {
      "1960-1969": 1200,
      "1970-1979": 2500,
      "1980-1989": 4800,
      "1990-1999": 8500,
      "2000-2009": 15000,
      "2010-2019": 22000,
      "2020-2025": 18000
    },
    "byBodyClass": {
      "Pickup": 28000,
      "SUV": 22000,
      "Sedan": 18000,
      "Coupe": 8500
    },
    "totalCount": 100000
  }
}
```

### Elasticsearch Aggregations

**Implementation:** Modify `elasticsearchService.getVehicleDetails()` to include aggregations

```javascript
// backend/src/services/elasticsearchService.js

async function getVehicleDetails(queryParams) {
  const response = await esClient.search({
    index: ELASTICSEARCH_INDEX,
    size: queryParams.size,
    from: (queryParams.page - 1) * queryParams.size,
    query: buildQuery(queryParams),
    sort: buildSort(queryParams),
    aggs: {
      // Aggregation 1: By Manufacturer
      by_manufacturer: {
        terms: {
          field: 'manufacturer',
          size: 100,
          order: { _count: 'desc' }
        }
      },

      // Aggregation 2: Models by Manufacturer (nested)
      models_by_manufacturer: {
        terms: {
          field: 'manufacturer',
          size: 100
        },
        aggs: {
          models: {
            terms: {
              field: 'model',
              size: 50
            }
          }
        }
      },

      // Aggregation 3: By Year Range
      by_year_range: {
        range: {
          field: 'year',
          ranges: [
            { key: '1960-1969', from: 1960, to: 1970 },
            { key: '1970-1979', from: 1970, to: 1980 },
            { key: '1980-1989', from: 1980, to: 1990 },
            { key: '1990-1999', from: 1990, to: 2000 },
            { key: '2000-2009', from: 2000, to: 2010 },
            { key: '2010-2019', from: 2010, to: 2020 },
            { key: '2020-2025', from: 2020, to: 2026 }
          ]
        }
      },

      // Aggregation 4: By Body Class
      by_body_class: {
        terms: {
          field: 'body_class',
          size: 20,
          order: { _count: 'desc' }
        }
      }
    }
  });

  // Transform aggregations into statistics object
  const statistics = {
    byManufacturer: transformTermsAgg(response.aggregations.by_manufacturer),
    modelsByManufacturer: transformNestedAgg(response.aggregations.models_by_manufacturer),
    byYearRange: transformRangeAgg(response.aggregations.by_year_range),
    byBodyClass: transformTermsAgg(response.aggregations.by_body_class),
    totalCount: response.hits.total.value
  };

  return {
    results: response.hits.hits.map(transformHit),
    total: response.hits.total.value,
    page: queryParams.page,
    size: queryParams.size,
    totalPages: Math.ceil(response.hits.total.value / queryParams.size),
    statistics // NEW
  };
}

function transformTermsAgg(agg) {
  return agg.buckets.reduce((acc, bucket) => {
    acc[bucket.key] = bucket.doc_count;
    return acc;
  }, {});
}

function transformNestedAgg(agg) {
  return agg.buckets.reduce((acc, mfrBucket) => {
    acc[mfrBucket.key] = mfrBucket.models.buckets.reduce((models, modelBucket) => {
      models[modelBucket.key] = modelBucket.doc_count;
      return models;
    }, {});
    return acc;
  }, {});
}

function transformRangeAgg(agg) {
  return agg.buckets.reduce((acc, bucket) => {
    acc[bucket.key] = bucket.doc_count;
    return acc;
  }, {});
}
```

**Performance Consideration:** Aggregations add minimal overhead (~5-10ms) since Elasticsearch computes them efficiently during the search.

---

## Frontend Components

### 1. Histogram Component (Reusable)

**Path:** `frontend/src/app/shared/components/histogram/`

**Copy from Transportation:** YES (100% reusable, no modifications needed)

**Files:**
- `histogram.component.ts` (67 lines)
- `histogram.component.html` (40 lines)
- `histogram.component.scss` (110 lines)
- `histogram.component.spec.ts` (NEW - unit tests)

**Interface:**
```typescript
@Input() title: string;
@Input() data: HistogramData[];
@Input() clickable: boolean;
@Input() selectedLabel: string | null;
@Input() maxHeight: string;
@Output() barClick = new EventEmitter<string>();
```

---

### 2. Integration in Discover Component

**Path:** `frontend/src/app/features/discover/discover.component.html`

**Add Section Below Results Table:**
```html
<!-- Existing Results Table -->
<app-vehicle-results-table ...></app-vehicle-results-table>

<!-- NEW: Statistics Section -->
<section *ngIf="statistics" class="statistics-section">
  <h2>Distribution Statistics</h2>

  <div class="histograms-grid">
    <!-- Chart 1: Vehicles by Manufacturer -->
    <app-histogram
      [title]="'Vehicles by Manufacturer'"
      [data]="manufacturerHistogramData"
      [clickable]="true"
      [selectedLabel]="selectedManufacturer"
      [maxHeight]="'400px'"
      (barClick)="onManufacturerBarClick($event)"
    ></app-histogram>

    <!-- Chart 2: Models by Manufacturer -->
    <app-histogram
      [title]="'Models by Manufacturer'"
      [data]="modelsHistogramData"
      [clickable]="false"
      [maxHeight]="'400px'"
    ></app-histogram>

    <!-- Chart 3: Vehicles by Year Range (OPTIONAL) -->
    <app-histogram
      [title]="'Vehicles by Year Range'"
      [data]="yearRangeHistogramData"
      [clickable]="true"
      [selectedLabel]="selectedYearRange"
      [maxHeight]="'400px'"
      (barClick)="onYearRangeBarClick($event)"
    ></app-histogram>

    <!-- Chart 4: Vehicles by Body Class (OPTIONAL) -->
    <app-histogram
      [title]="'Vehicles by Body Class'"
      [data]="bodyClassHistogramData"
      [clickable]="true"
      [selectedLabel]="selectedBodyClass"
      [maxHeight]="'400px'"
      (barClick)="onBodyClassBarClick($event)"
    ></app-histogram>
  </div>
</section>
```

**Styling:**
```scss
// discover.component.scss

.statistics-section {
  margin-top: 2rem;

  h2 {
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }
}

.histograms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}
```

---

### 3. Component Logic

**Path:** `frontend/src/app/features/discover/discover.component.ts`

**Add Getters:**
```typescript
get statistics(): VehicleStatistics | null {
  // Retrieve from StateManagementService
  return this.stateService.currentState?.statistics || null;
}

get selectedManufacturer(): string | null {
  return this.stateService.currentState?.selectedManufacturer || null;
}

get manufacturerHistogramData(): HistogramData[] {
  if (!this.statistics?.byManufacturer) return [];

  return Object.entries(this.statistics.byManufacturer)
    .map(([label, count]) => ({ label, count }));
}

get modelsHistogramData(): HistogramData[] {
  if (!this.statistics?.modelsByManufacturer) return [];

  const selectedMfr = this.selectedManufacturer;
  const data: HistogramData[] = [];

  Object.entries(this.statistics.modelsByManufacturer).forEach(
    ([manufacturer, models]) => {
      // Filter by selected manufacturer if set
      if (selectedMfr && manufacturer !== selectedMfr) return;

      Object.entries(models).forEach(([model, count]) => {
        data.push({
          label: `${manufacturer} ${model}`,
          count: count as number
        });
      });
    }
  );

  return data;
}

get yearRangeHistogramData(): HistogramData[] {
  if (!this.statistics?.byYearRange) return [];

  // Return in chronological order
  const ranges = [
    '1960-1969', '1970-1979', '1980-1989', '1990-1999',
    '2000-2009', '2010-2019', '2020-2025'
  ];

  return ranges
    .filter(range => this.statistics!.byYearRange[range] > 0)
    .map(range => ({
      label: range,
      count: this.statistics!.byYearRange[range]
    }));
}

get bodyClassHistogramData(): HistogramData[] {
  if (!this.statistics?.byBodyClass) return [];

  return Object.entries(this.statistics.byBodyClass)
    .map(([label, count]) => ({ label, count }));
}
```

**Add Event Handlers:**
```typescript
onManufacturerBarClick(manufacturer: string): void {
  // Toggle selection
  const currentSelection = this.selectedManufacturer;

  if (currentSelection === manufacturer) {
    // Deselect
    this.stateService.selectManufacturer(null);
  } else {
    // Select
    this.stateService.selectManufacturer(manufacturer);
  }
}

onYearRangeBarClick(yearRange: string): void {
  // Parse "1990-1999" → yearMin: 1990, yearMax: 1999
  const [minStr, maxStr] = yearRange.split('-');
  const yearMin = parseInt(minStr, 10);
  const yearMax = parseInt(maxStr, 10);

  // Update filters
  this.stateService.updateFilters({
    yearMin,
    yearMax
  });
}

onBodyClassBarClick(bodyClass: string): void {
  // Update filter
  this.stateService.updateFilters({
    bodyClass: [bodyClass] // Multiselect format
  });
}
```

---

## Integration Plan

### Phase 1: Foundation (Estimated: 4-6 hours)

**Tasks:**
1. ✅ Create histogram component (copy from transportation)
2. ✅ Create `VehicleStatistics` model
3. ✅ Update `VehicleSearchResponse` interface
4. ✅ Add histogram component to SharedModule
5. ✅ Write unit tests for histogram component

**Deliverable:** Reusable histogram component ready for integration

---

### Phase 2: Backend Aggregations (Estimated: 6-8 hours)

**Tasks:**
1. ✅ Update `getVehicleDetails()` with Elasticsearch aggregations
2. ✅ Write aggregation transformation functions
3. ✅ Add `statistics` to API response
4. ✅ Test aggregations with curl/Postman
5. ✅ Verify performance (response time <500ms)
6. ✅ Increment backend version (v1.4.0)
7. ✅ Build and deploy backend

**Deliverable:** Backend returns statistics in search response

---

### Phase 3: Frontend Integration - MVP (Estimated: 4-6 hours)

**Tasks:**
1. ✅ Add statistics section to `discover.component.html`
2. ✅ Implement 2 core charts (manufacturer + models)
3. ✅ Add getters for histogram data
4. ✅ Implement `onManufacturerBarClick()` handler
5. ✅ Update StateManagementService with `selectedManufacturer`
6. ✅ Add CSS for histograms grid
7. ✅ Test interaction (click manufacturer → filters results)

**Deliverable:** MVP with 2 charts matching transportation app

---

### Phase 4: Additional Charts (Optional, Estimated: 6-8 hours)

**Tasks:**
1. ✅ Add year range chart + click handler
2. ✅ Add body class chart + click handler
3. ✅ Update grid layout (2×2 or custom)
4. ✅ Test all interactions
5. ✅ Polish styling (colors, spacing, responsiveness)

**Deliverable:** Full-featured implementation with 4 charts

---

### Phase 5: Testing & Polish (Estimated: 4-6 hours)

**Tasks:**
1. ✅ E2E testing (click flows, state management)
2. ✅ Responsive design testing (mobile, tablet, desktop)
3. ✅ Performance testing (large datasets)
4. ✅ Accessibility audit (keyboard navigation, screen readers)
5. ✅ Documentation update (CLAUDE.md, user guide)

**Deliverable:** Production-ready histogram charts

---

## Success Metrics

**User Engagement:**
- ✅ 40%+ of users interact with at least one chart
- ✅ Average session duration increases by 20%+
- ✅ Chart clicks lead to result refinement (50%+ conversion)

**Performance:**
- ✅ API response time remains <500ms (including aggregations)
- ✅ Frontend render time <100ms for chart updates
- ✅ No degradation in table scroll performance

**Code Quality:**
- ✅ 80%+ test coverage for histogram component
- ✅ Zero accessibility violations (Axe audit)
- ✅ Passes Lighthouse performance audit (90+ score)

---

## Recommendation

**Start with Option A (Classic Pairing)** for MVP:
- 2 charts: Vehicles by Manufacturer + Models by Manufacturer
- Estimated: 14-20 hours total (Phases 1-3)
- Low risk, high value, matches transportation pattern

**Expand to Option B (Vehicle Insights)** in Phase 4:
- Add 2 charts: Year Range + Body Class
- Estimated: Additional 6-8 hours
- Higher value, vehicle-specific insights

**Total Effort:** 20-28 hours for full implementation

---

**Document End**

**Next Steps:**
1. Review proposal and select chart option (A, B, or C)
2. Approve backend aggregation approach
3. Begin Phase 1 implementation (histogram component)
4. Iterate through phases with testing at each step
