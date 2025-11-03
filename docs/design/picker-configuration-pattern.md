# Picker Configuration Pattern Design

**Branch:** `picker-config`
**Created:** 2025-11-02
**Status:** 🚧 IN DESIGN
**Purpose:** Generalize picker components to support multiple data sources via configuration

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Proposed Solution](#proposed-solution)
4. [Configuration Schema](#configuration-schema)
5. [Implementation Plan](#implementation-plan)
6. [Migration Strategy](#migration-strategy)
7. [Examples](#examples)

---

## Problem Statement

### Current Situation

The AUTOS application currently has **one picker type**:
- **Manufacturer-Model Picker** (`TablePickerComponent` + `TablePickerDataSource`)
  - Selects manufacturer-model combinations
  - Flat table view (no hierarchical expansion)
  - Hardcoded columns: manufacturer, model
  - Hardcoded API endpoint: `getManufacturerModelCombinations()`

### Future Requirements

User wants to add additional pickers for different data sources:

1. **VIN Picker** (immediate need)
   - Display VIN instances from expandable rows
   - Columns: VIN, State, Color, Mileage, Condition, Title Status, Value
   - API endpoint: `getVehicleInstances(vehicleId)`
   - Use case: Select specific VINs for detailed analysis

2. **Future Pickers** (anticipated)
   - Body Class picker
   - Year range picker
   - Custom attribute pickers

### The Challenge

Creating a new component for each picker type leads to:
- ❌ Code duplication (selection logic, UI patterns, state management)
- ❌ Maintenance burden (fix same bug in multiple places)
- ❌ Inconsistent UX (different behavior across pickers)
- ❌ Slow development (each new picker = ~500 lines of code)

---

## Current Architecture Analysis

### Components

```
TablePickerComponent
├── Manages selection state (Set<string>)
├── Handles user interactions (checkboxes, apply, clear)
├── Hydrates from URL state (filters.modelCombos)
├── Pop-out aware (sends messages to main window)
└── Uses BaseDataTableComponent for display

TablePickerDataSource
├── Implements TableDataSource<PickerFlatRow>
├── Fetches data from ApiService.getManufacturerModelCombinations()
├── Client-side filtering (manufacturer, model)
├── Client-side pagination
└── One-time load with in-memory filtering
```

### Key Patterns (Worth Preserving)

✅ **Set-based selection** (`Set<string>`) - O(1) lookups
✅ **BaseDataTableComponent** - Reusable table display
✅ **TableDataSource pattern** - Standardized data fetching interface
✅ **Pop-out aware** - Multi-window support
✅ **URL-driven hydration** - State from URL parameters
✅ **Client-side filtering** - Fast UX for small datasets

### Hardcoded Elements (Need to Generalize)

❌ **Column definitions** - Hardcoded in component (lines 47-66)
❌ **API endpoint** - Hardcoded in data source (line 51)
❌ **Row key format** - Hardcoded `"Manufacturer|Model"` (line 19)
❌ **Selection storage** - Hardcoded `filters.modelCombos` (line 104)
❌ **Filter fields** - Hardcoded manufacturer/model (lines 93-106)

---

## Proposed Solution

### Hybrid Configuration-Based Architecture

**Pattern:** Follow Milestone 003 approach (BaseDataTable + specific adapters)

```
BasePickerComponent<T>
├── Generic selection logic (any data type T)
├── Uses BaseDataTableComponent for display
├── Configuration-driven columns and behavior
└── Delegates data fetching to PickerDataSource<T>

PickerConfig
├── Column definitions (TableColumn<T>[])
├── API endpoint configuration
├── Row key generator function
├── Selection storage key (URL parameter name)
└── Filter definitions

PickerConfigService
├── Loads picker configurations (JSON or TypeScript)
├── Provides type-safe access to configs
└── Validates configurations at runtime

Specific Picker Components (thin wrappers)
├── ManufacturerModelPickerComponent (uses config: "manufacturer-model")
├── VinPickerComponent (uses config: "vin-picker")
└── Future pickers...
```

### Why This Approach?

✅ **DRY Principle** - Single source of truth for picker logic
✅ **Type Safety** - TypeScript interfaces + generics
✅ **Flexibility** - Add new pickers via configuration
✅ **Maintainability** - Fix bugs once in BasePickerComponent
✅ **Consistency** - All pickers behave identically
✅ **Gradual Migration** - Can coexist with existing TablePickerComponent
✅ **Follows AUTOS Pattern** - Mirrors BaseDataTable architecture from Milestone 003

---

## Configuration Schema

### Nested Data Support

**Problem:** Source JSON data is often nested 2-3 levels deep. Example:

```json
{
  "instances": [
    {
      "vin": "ABC123DEF456GHI78",
      "registration": {
        "state": "CA",
        "status": "Current",
        "date": "2020-06-15"
      },
      "vehicle": {
        "color": "Blue",
        "condition": {
          "rating": 8,
          "description": "Excellent"
        }
      },
      "valuation": {
        "estimated_value": 28500,
        "last_updated": "2025-11-01"
      }
    }
  ]
}
```

**Solution:** Use **valuePath** property in column definitions to access nested data.

**Supported Formats:**
1. **Dot notation** - `"registration.state"` (simple, readable)
2. **Array notation** - `["registration", "state"]` (type-safe, programmatic)
3. **Function** - Custom accessor for complex transformations

**Examples:**
```typescript
// Flat data (direct property access)
{
  key: 'vin',
  valuePath: 'vin', // or just omit, defaults to key
}

// Nested data (dot notation)
{
  key: 'state',
  valuePath: 'registration.state', // Accesses obj.registration.state
}

// Deeply nested data (dot notation)
{
  key: 'condition',
  valuePath: 'vehicle.condition.description', // Accesses obj.vehicle.condition.description
}

// Array notation (type-safe)
{
  key: 'estimatedValue',
  valuePath: ['valuation', 'estimated_value'], // Same as 'valuation.estimated_value'
}

// Function accessor (for complex cases)
{
  key: 'fullRegistration',
  valuePath: (row) => `${row.registration.state} - ${row.registration.status}`,
}
```

### TypeScript Interfaces

```typescript
/**
 * Extended TableColumn with valuePath support
 */
export interface PickerColumnConfig<T = any> extends Omit<TableColumn<T>, 'key'> {
  /** Column key (for internal reference) */
  key: string;

  /** Path to value in source data (supports nested access) */
  valuePath?: string | string[] | ((row: any) => any);
}

/**
 * Generic picker configuration
 * Type parameter T represents the row data type
 */
export interface PickerConfig<T = any> {
  /** Unique identifier for this picker configuration */
  id: string;

  /** Human-readable display name */
  displayName: string;

  /** Column definitions for the table (with valuePath support) */
  columns: PickerColumnConfig<T>[];

  /** API endpoint configuration */
  api: {
    /** Method name on ApiService (e.g., "getManufacturerModelCombinations") */
    method: string;

    /** Parameter mapping function (from picker params to API params) */
    paramMapper?: (params: TableQueryParams) => any;

    /** Response transformer (API response to TableResponse<T>) */
    responseTransformer: (response: any) => TableResponse<T>;
  };

  /** Row key configuration */
  row: {
    /** Function to generate unique key for a row (for selection tracking) */
    keyGenerator: (row: T) => string;

    /** Function to parse key back to row data (for hydration) */
    keyParser: (key: string) => Partial<T>;
  };

  /** Selection state configuration */
  selection: {
    /** URL parameter name where selections are stored */
    urlParam: string;

    /** Function to serialize selections to URL format */
    serializer: (selections: T[]) => string;

    /** Function to deserialize selections from URL format */
    deserializer: (urlValue: string) => T[];
  };

  /** Optional: Client-side filtering configuration */
  filtering?: {
    /** Map of column key to filter function */
    filters: Record<string, (row: T, value: any) => boolean>;
  };

  /** Optional: Client-side sorting configuration */
  sorting?: {
    /** Map of column key to sort function */
    comparators: Record<string, (a: T, b: T) => number>;
  };

  /** Optional: Data caching strategy */
  caching?: {
    /** Whether to cache data in memory after first load */
    enabled: boolean;

    /** TTL in milliseconds (0 = cache forever until reset) */
    ttl: number;
  };

  /** Pagination mode */
  pagination: {
    /**
     * Mode: 'client' or 'server'
     * - 'client': Load all data once, paginate in memory (fast, good for <1000 rows)
     * - 'server': Request each page from API (scalable, required for large datasets)
     */
    mode: 'client' | 'server';

    /** Default page size */
    defaultPageSize: number;

    /** Available page size options */
    pageSizeOptions: number[];
  };
}

/**
 * Helper utility to get nested value from object
 * Supports dot notation, array notation, and function accessors
 */
export function getNestedValue(
  obj: any,
  path: string | string[] | ((obj: any) => any),
  defaultValue: any = undefined
): any {
  // Function accessor
  if (typeof path === 'function') {
    try {
      return path(obj);
    } catch (e) {
      console.warn('Error executing value accessor function:', e);
      return defaultValue;
    }
  }

  // Array notation
  if (Array.isArray(path)) {
    return path.reduce((current, key) => current?.[key], obj) ?? defaultValue;
  }

  // Dot notation (string)
  if (typeof path === 'string') {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  }

  return defaultValue;
}

/**
 * Picker selection event
 */
export interface PickerSelectionEvent<T> {
  /** Picker configuration ID */
  pickerId: string;

  /** Selected items */
  selections: T[];

  /** Selection keys (for efficient comparison) */
  keys: string[];
}
```

### Example Configuration (Manufacturer-Model Picker)

```typescript
// frontend/src/app/config/picker-configs.ts

export const MANUFACTURER_MODEL_PICKER_CONFIG: PickerConfig<PickerFlatRow> = {
  id: 'manufacturer-model',
  displayName: 'Manufacturer & Model Picker',

  columns: [
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
    },
  ],

  api: {
    method: 'getManufacturerModelCombinations',
    paramMapper: (params) => ({
      page: 1,
      size: 100, // Load all at once for client-side filtering
    }),
    responseTransformer: (response) => {
      // Transform hierarchical response to flat rows
      const flatRows: PickerFlatRow[] = [];
      response.data.forEach((mfr: any) => {
        mfr.models.forEach((model: any) => {
          flatRows.push({
            manufacturer: mfr.manufacturer,
            model: model.model,
            count: model.count,
            key: `${mfr.manufacturer}|${model.model}`,
          });
        });
      });

      // Sort by manufacturer, then model
      flatRows.sort((a, b) => {
        const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
        return mfrCompare !== 0 ? mfrCompare : a.model.localeCompare(b.model);
      });

      return {
        results: flatRows,
        total: flatRows.length,
        page: 1,
        size: flatRows.length,
        totalPages: 1,
      };
    },
  },

  row: {
    keyGenerator: (row) => `${row.manufacturer}|${row.model}`,
    keyParser: (key) => {
      const [manufacturer, model] = key.split('|');
      return { manufacturer, model };
    },
  },

  selection: {
    urlParam: 'modelCombos',
    serializer: (selections) => {
      return selections
        .map((s) => `${s.manufacturer}:${s.model}`)
        .join(',');
    },
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map((combo) => {
        const [manufacturer, model] = combo.split(':');
        return { manufacturer, model } as PickerFlatRow;
      });
    },
  },

  filtering: {
    filters: {
      manufacturer: (row, value) =>
        row.manufacturer.toLowerCase().includes(String(value).toLowerCase()),
      model: (row, value) =>
        row.model.toLowerCase().includes(String(value).toLowerCase()),
    },
  },

  sorting: {
    comparators: {
      manufacturer: (a, b) => a.manufacturer.localeCompare(b.manufacturer),
      model: (a, b) => a.model.localeCompare(b.model),
      count: (a, b) => a.count - b.count,
    },
  },

  caching: {
    enabled: true,
    ttl: 0, // Cache forever (manufacturer-model data rarely changes)
  },

  pagination: {
    mode: 'client', // ✅ Client-side: Load all ~200 manufacturer-model combos once
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

### Example Configuration (VIN Picker with Nested Data)

```typescript
// frontend/src/app/config/picker-configs.ts

/**
 * VIN Picker Row Interface (flattened for display)
 * Source data may be nested, but we flatten it for the table
 */
export interface VinPickerRow {
  vin: string;
  state: string;
  registrationStatus: string;
  color: string;
  mileage: number;
  conditionRating: number;
  conditionDescription: string;
  titleStatus: string;
  estimatedValue: number;
  lastServiceDate: string;
  key: string; // VIN is the key
}

/**
 * VIN Picker Configuration
 * Demonstrates nested data access with valuePath
 */
export const VIN_PICKER_CONFIG: PickerConfig<VinPickerRow> = {
  id: 'vin-picker',
  displayName: 'VIN Instance Picker',

  columns: [
    {
      key: 'vin',
      label: 'VIN',
      width: '18%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      valuePath: 'vin', // Flat (can omit valuePath, defaults to key)
    },
    {
      key: 'state',
      label: 'State',
      width: '8%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'registered_state', // Flat (API returns registered_state)
    },
    {
      key: 'registrationStatus',
      label: 'Reg. Status',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'registration_status', // Flat
    },
    {
      key: 'color',
      label: 'Color',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'exterior_color', // Flat
    },
    {
      key: 'mileage',
      label: 'Mileage',
      width: '10%',
      sortable: true,
      filterable: false,
      valuePath: 'mileage', // Flat
      format: 'number',
    },
    {
      key: 'conditionRating',
      label: 'Rating',
      width: '8%',
      sortable: true,
      filterable: false,
      valuePath: 'condition_rating', // Flat (but could be nested)
    },
    {
      key: 'conditionDescription',
      label: 'Condition',
      width: '12%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'condition_description', // Flat
    },
    {
      key: 'titleStatus',
      label: 'Title',
      width: '10%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      valuePath: 'title_status', // Flat
    },
    {
      key: 'estimatedValue',
      label: 'Est. Value',
      width: '12%',
      sortable: true,
      filterable: false,
      valuePath: 'estimated_value', // Flat
      format: 'currency',
    },
  ],

  api: {
    method: 'getVehicleInstances',
    paramMapper: (params) => {
      // VIN picker needs vehicleId parameter
      // This would be passed as context when opening the picker
      return {
        vehicleId: params.filters?.['vehicleId'],
        count: 100, // Load all instances
      };
    },
    responseTransformer: (response) => {
      // Note: API returns flat data for VehicleInstance
      // But if it were nested, we'd flatten it here OR use valuePath in columns
      const rows: VinPickerRow[] = response.instances.map((instance: any) => ({
        vin: instance.vin,
        state: instance.registered_state,
        registrationStatus: instance.registration_status,
        color: instance.exterior_color,
        mileage: instance.mileage,
        conditionRating: instance.condition_rating,
        conditionDescription: instance.condition_description,
        titleStatus: instance.title_status,
        estimatedValue: instance.estimated_value,
        lastServiceDate: instance.last_service_date,
        key: instance.vin,
      }));

      return {
        results: rows,
        total: rows.length,
        page: 1,
        size: rows.length,
        totalPages: 1,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({ vin: key } as Partial<VinPickerRow>),
  },

  selection: {
    urlParam: 'selectedVins',
    serializer: (selections) => selections.map((s) => s.vin).join(','),
    deserializer: (urlValue) => {
      if (!urlValue) return [];
      return urlValue.split(',').map((vin) => ({ vin, key: vin }) as VinPickerRow);
    },
  },

  filtering: {
    filters: {
      vin: (row, value) =>
        row.vin.toLowerCase().includes(String(value).toLowerCase()),
      state: (row, value) =>
        row.state.toLowerCase().includes(String(value).toLowerCase()),
      registrationStatus: (row, value) =>
        row.registrationStatus.toLowerCase().includes(String(value).toLowerCase()),
      color: (row, value) =>
        row.color.toLowerCase().includes(String(value).toLowerCase()),
      conditionDescription: (row, value) =>
        row.conditionDescription.toLowerCase().includes(String(value).toLowerCase()),
      titleStatus: (row, value) =>
        row.titleStatus.toLowerCase().includes(String(value).toLowerCase()),
    },
  },

  caching: {
    enabled: false, // VIN instances are context-specific, don't cache
    ttl: 0,
  },

  pagination: {
    mode: 'server', // ✅ Server-side: Could be thousands of VINs, don't load all at once
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
};
```

### Server-Side vs Client-Side Pagination

**When to use Client-Side Pagination:**
- Small datasets (<1,000 rows)
- Data rarely changes (can cache effectively)
- Fast initial load acceptable
- Example: Manufacturer-Model picker (~200 combinations)

**When to use Server-Side Pagination:**
- Large datasets (>1,000 rows)
- Data context-specific (can't cache effectively)
- Need immediate initial response
- Example: VIN picker (potentially 10,000+ VINs per vehicle)

**Implementation Difference:**

```typescript
// Client-side pagination
api: {
  method: 'getManufacturerModelCombinations',
  paramMapper: () => ({ page: 1, size: 100 }), // Load all at once
  responseTransformer: (response) => {
    // Return all data, BasePickerDataSource will paginate in memory
    return { results: allRows, total: allRows.length, ... };
  },
},
pagination: { mode: 'client' }

// Server-side pagination
api: {
  method: 'getVehicleInstances',
  paramMapper: (params) => ({
    vehicleId: params.filters?.['vehicleId'],
    page: params.page,        // ✅ Pass page to API
    size: params.size,        // ✅ Pass size to API
  }),
  responseTransformer: (response) => {
    // Return only requested page
    return { results: response.instances, total: response.instance_count, ... };
  },
},
pagination: { mode: 'server' }
```

### Example Configuration (Deeply Nested Data)

For cases where the API returns deeply nested JSON:

```typescript
/**
 * Example: If API returned nested structure like this:
 * {
 *   "instances": [{
 *     "vin": "ABC123",
 *     "registration": {
 *       "state": "CA",
 *       "status": "Current"
 *     },
 *     "vehicle": {
 *       "condition": {
 *         "rating": 8,
 *         "description": "Excellent"
 *       },
 *       "appearance": {
 *         "exterior_color": "Blue"
 *       }
 *     },
 *     "valuation": {
 *       "estimated_value": 28500
 *     }
 *   }]
 * }
 */

export const NESTED_VIN_PICKER_CONFIG: PickerConfig<any> = {
  id: 'nested-vin-picker',
  displayName: 'VIN Picker (Nested Data)',

  columns: [
    {
      key: 'vin',
      label: 'VIN',
      valuePath: 'vin', // Flat
    },
    {
      key: 'state',
      label: 'State',
      valuePath: 'registration.state', // ✅ Nested: one level deep
    },
    {
      key: 'registrationStatus',
      label: 'Reg. Status',
      valuePath: 'registration.status', // ✅ Nested: one level deep
    },
    {
      key: 'conditionRating',
      label: 'Rating',
      valuePath: 'vehicle.condition.rating', // ✅ Nested: two levels deep
    },
    {
      key: 'conditionDescription',
      label: 'Condition',
      valuePath: 'vehicle.condition.description', // ✅ Nested: two levels deep
    },
    {
      key: 'color',
      label: 'Color',
      valuePath: 'vehicle.appearance.exterior_color', // ✅ Nested: two levels deep
    },
    {
      key: 'estimatedValue',
      label: 'Est. Value',
      valuePath: 'valuation.estimated_value', // ✅ Nested: one level deep
      format: 'currency',
    },
    {
      key: 'fullRegistration',
      label: 'Full Registration',
      // ✅ Function accessor for complex transformations
      valuePath: (row) => `${row.registration.state} - ${row.registration.status}`,
    },
  ],

  api: {
    method: 'getVehicleInstances',
    responseTransformer: (response) => {
      // DON'T flatten the data - keep it nested
      // BasePickerComponent will use valuePath to access nested properties
      return {
        results: response.instances, // Keep original nested structure
        total: response.instances.length,
        page: 1,
        size: response.instances.length,
        totalPages: 1,
      };
    },
  },

  row: {
    keyGenerator: (row) => row.vin,
    keyParser: (key) => ({ vin: key }),
  },

  // ... rest of config
};
```

---

## Implementation Plan

### Phase 1: Foundation (Steps 1-4)

**Goal:** Create generic picker infrastructure without breaking existing functionality

**Step 1: Create PickerConfig interfaces** (~30 min)
- Create `frontend/src/app/shared/models/picker-config.model.ts`
- Define `PickerConfig<T>`, `PickerSelectionEvent<T>` interfaces
- Export from `shared/models/index.ts`

**Step 2: Create PickerConfigService** (~45 min)
- Create `frontend/src/app/core/services/picker-config.service.ts`
- Implement configuration registry (Map<string, PickerConfig>)
- Add `registerConfig()`, `getConfig()`, `getAllConfigs()` methods
- Add configuration validation (check required fields)

**Step 3: Create BasePickerDataSource<T>** (~60 min)
- Create `frontend/src/app/shared/services/base-picker-data-source.ts`
- Implement generic `TableDataSource<T>` with configuration
- Support client-side filtering/sorting based on config
- Support data caching based on config
- Handle API method invocation via ApiService (dynamic method calls)

**Step 4: Create BasePickerComponent<T>** (~90 min)
- Create `frontend/src/app/shared/components/base-picker/base-picker.component.ts`
- Generic selection logic (Set<string> pattern)
- Configuration-driven column display
- Pop-out aware (use PopOutContextService)
- URL-driven hydration (use RouteStateService)
- Emit `PickerSelectionEvent` on apply/clear

### Phase 2: Configuration Definitions (Steps 5-6)

**Goal:** Define configurations for existing and new pickers

**Step 5: Create manufacturer-model configuration** (~30 min)
- Create `frontend/src/app/config/picker-configs.ts`
- Define `MANUFACTURER_MODEL_PICKER_CONFIG`
- Register with PickerConfigService in app initialization

**Step 6: Create VIN picker configuration** (~45 min)
- Define `VIN_PICKER_CONFIG` in same file
- Define `VinPickerRow` interface
- Register with PickerConfigService

### Phase 3: Migration & Testing (Steps 7-9)

**Goal:** Migrate existing picker to new pattern, add VIN picker

**Step 7: Create ManufacturerModelPickerComponent wrapper** (~30 min)
- Create thin wrapper component that uses BasePickerComponent
- Pass `manufacturer-model` config ID
- Maintain same selector `<app-table-picker>` for backward compatibility
- Test existing functionality (Discover page, Workshop page, pop-outs)

**Step 8: Create VinPickerComponent** (~45 min)
- Create `frontend/src/app/features/picker/vin-picker/vin-picker.component.ts`
- Thin wrapper using BasePickerComponent with `vin-picker` config
- Add to Discover page (or wherever user wants it)

**Step 9: Integration Testing** (~60 min)
- Test manufacturer-model picker (all existing functionality)
- Test VIN picker (selection, apply, clear)
- Test pop-out behavior for both pickers
- Test URL hydration for both pickers
- Verify no regressions on Discover/Workshop pages

### Phase 4: Documentation & Cleanup (Step 10)

**Step 10: Document the pattern** (~30 min)
- Update this design document with implementation notes
- Create example configurations for future pickers
- Add to CLAUDE.md as established pattern
- Update state-management-guide.md with picker examples

---

## Migration Strategy

### Backward Compatibility

**Keep existing TablePickerComponent initially:**
- Allows gradual migration without breaking production
- Provides fallback if new pattern has issues
- Can compare behavior side-by-side

**Migration path:**
1. Create BasePickerComponent alongside TablePickerComponent
2. Create ManufacturerModelPickerComponent wrapper (new pattern)
3. Test extensively in parallel
4. Switch Discover/Workshop pages to new component
5. Remove old TablePickerComponent after 1-2 weeks of stable operation

### State Management Compatibility

**URL parameters remain unchanged:**
- `modelCombos` parameter format stays identical
- Existing URLs continue to work
- No breaking changes to StateManagementService

### Testing Strategy

**Unit Tests:**
- BasePickerComponent (selection logic, hydration)
- BasePickerDataSource (filtering, sorting, caching)
- PickerConfigService (registration, retrieval, validation)

**Integration Tests:**
- Manufacturer-model picker (existing functionality)
- VIN picker (new functionality)
- Pop-out behavior
- URL hydration

**E2E Tests:**
- User flows: select → apply → verify URL → share link
- Cross-component: picker selection → results table update
- Multi-window: picker pop-out → selections sync

---

## Examples

### Usage Example 1: Manufacturer-Model Picker

```typescript
// manufacturer-model-picker.component.ts
@Component({
  selector: 'app-manufacturer-model-picker',
  template: `
    <app-base-picker
      [configId]="'manufacturer-model'"
      (selectionChange)="onSelectionChange($event)"
    >
    </app-base-picker>
  `,
})
export class ManufacturerModelPickerComponent {
  onSelectionChange(event: PickerSelectionEvent<PickerFlatRow>): void {
    console.log('Selected:', event.selections);
    // Handle selection change (already handled by BasePickerComponent via StateManagementService)
  }
}
```

### Usage Example 2: VIN Picker (with Context)

```typescript
// vin-picker.component.ts
@Component({
  selector: 'app-vin-picker',
  template: `
    <app-base-picker
      [configId]="'vin-picker'"
      [context]="{ vehicleId: vehicleId }"
      (selectionChange)="onSelectionChange($event)"
    >
    </app-base-picker>
  `,
})
export class VinPickerComponent {
  @Input() vehicleId!: string; // Passed from parent (expanded row)

  onSelectionChange(event: PickerSelectionEvent<VinPickerRow>): void {
    console.log('Selected VINs:', event.selections);
    // Could emit to parent for custom handling
  }
}
```

### Usage Example 3: Registering Custom Configuration

```typescript
// app.module.ts or feature module
const CUSTOM_PICKER_CONFIG: PickerConfig<MyCustomRow> = {
  id: 'my-custom-picker',
  displayName: 'My Custom Picker',
  columns: [ /* ... */ ],
  api: { /* ... */ },
  row: { /* ... */ },
  selection: { /* ... */ },
};

export class AppModule {
  constructor(pickerConfigService: PickerConfigService) {
    pickerConfigService.registerConfig(CUSTOM_PICKER_CONFIG);
  }
}
```

---

## Benefits

### For Developers

✅ **Add new pickers in ~30 minutes** (just configuration, no component code)
✅ **Consistent behavior** (all pickers use same logic)
✅ **Easy maintenance** (fix bugs once in BasePickerComponent)
✅ **Type safety** (TypeScript generics + interfaces)
✅ **Testability** (configurations are data, easy to test)

### For Users

✅ **Consistent UX** (all pickers look and behave the same)
✅ **Reliable** (less code = fewer bugs)
✅ **Fast** (client-side filtering, efficient selection tracking)

### For Architecture

✅ **DRY principle** (Don't Repeat Yourself)
✅ **Single Responsibility** (picker logic separated from data fetching)
✅ **Open/Closed** (open for extension via config, closed for modification)
✅ **Follows AUTOS patterns** (BaseDataTable, RequestCoordinator, URL-driven state)

---

## Risks & Mitigations

### Risk 1: Over-Engineering

**Risk:** Configuration pattern might be overkill for 2-3 pickers

**Mitigation:**
- Keep configuration simple (no complex DSL)
- Allow escape hatches (custom picker components can still exist)
- Follow proven pattern (BaseDataTable from Milestone 003)

### Risk 2: Type Safety with Dynamic Configs

**Risk:** TypeScript generics might not work well with dynamic configurations

**Mitigation:**
- Use strong typing for PickerConfig<T> interface
- Validate configurations at runtime (PickerConfigService)
- Provide type guards for common picker types

### Risk 3: API Method Dynamic Invocation

**Risk:** Calling ApiService methods by string name is error-prone

**Mitigation:**
- Validate method exists at registration time
- Provide clear error messages if method not found
- Consider using enum for known API methods

---

## Future Enhancements

### Phase 5: Advanced Features (Post-MVP)

**Multi-select modes:**
- Single selection (radio buttons)
- Multi-select (checkboxes) - current default
- Range selection (shift+click)

**Hierarchical pickers:**
- Support tree structures (manufacturer → models)
- Collapsible/expandable groups
- Parent/child selection logic

**Server-side pagination:**
- For large datasets (>10,000 rows)
- Lazy loading
- Virtual scrolling

**Custom cell templates:**
- Allow configuration to specify custom cell renderers
- Support icons, badges, custom formatting
- Richer UI elements

---

## Appendix A: Architecture Diagrams

### Current Architecture (Manufacturer-Model Picker)

```
┌─────────────────────────────────────┐
│    TablePickerComponent             │
│  (Manufacturer-Model specific)      │
│                                     │
│  - Hardcoded columns                │
│  - Hardcoded selection logic        │
│  - Hardcoded URL param (modelCombos)│
└────────────┬────────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────────┐
│    TablePickerDataSource            │
│  (Manufacturer-Model specific)      │
│                                     │
│  - Hardcoded API endpoint           │
│  - Hardcoded filtering logic        │
│  - Hardcoded data transformation    │
└────────────┬────────────────────────┘
             │ calls
             ▼
┌─────────────────────────────────────┐
│         ApiService                  │
│  getManufacturerModelCombinations() │
└─────────────────────────────────────┘
```

### Proposed Architecture (Generic Picker)

```
┌─────────────────────────────────────┐
│  ManufacturerModelPickerComponent   │
│  (Thin wrapper, config ID only)     │
└────────────┬────────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────────┐
│    BasePickerComponent<T>           │
│  (Generic, reusable)                │
│                                     │
│  - Config-driven columns            │
│  - Generic selection logic          │
│  - Config-driven URL serialization  │
└────────────┬──────────┬─────────────┘
             │          │
             │          │ uses config
             ▼          ▼
┌──────────────────┐  ┌─────────────────────┐
│BasePickerData    │  │PickerConfigService  │
│Source<T>         │  │                     │
│                  │  │ - Config registry   │
│- Config-driven   │  │ - Validation        │
│  API calls       │  └─────────────────────┘
│- Config-driven   │             │
│  filtering       │             │ provides config
└────────┬─────────┘             │
         │                       ▼
         │ calls        ┌─────────────────────┐
         ▼              │  PickerConfig<T>    │
┌──────────────────┐   │                     │
│   ApiService     │   │ - Column defs       │
│                  │   │ - API config        │
│ [dynamic method  │   │ - Row key config    │
│  invocation]     │   │ - Selection config  │
└──────────────────┘   └─────────────────────┘
```

---

## Appendix B: Configuration Reference

### PickerConfig<T> Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier |
| `displayName` | `string` | ✅ | Human-readable name |
| `columns` | `TableColumn<T>[]` | ✅ | Column definitions |
| `api.method` | `string` | ✅ | ApiService method name |
| `api.paramMapper` | `function` | ❌ | Transform params for API |
| `api.responseTransformer` | `function` | ✅ | Transform API response |
| `row.keyGenerator` | `function` | ✅ | Generate unique row key |
| `row.keyParser` | `function` | ✅ | Parse key back to row |
| `selection.urlParam` | `string` | ✅ | URL parameter name |
| `selection.serializer` | `function` | ✅ | Serialize to URL |
| `selection.deserializer` | `function` | ✅ | Deserialize from URL |
| `filtering.filters` | `Record<string, function>` | ❌ | Client-side filters |
| `sorting.comparators` | `Record<string, function>` | ❌ | Client-side sorting |
| `caching.enabled` | `boolean` | ❌ | Enable data caching |
| `caching.ttl` | `number` | ❌ | Cache TTL (ms) |

---

**Last Updated:** 2025-11-02
**Status:** 🚧 IN DESIGN - Ready for implementation
**Next Step:** Phase 1, Step 1 - Create PickerConfig interfaces

---
