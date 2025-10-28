import { HierarchicalSelection } from './entity.model';

/**
 * Generic Domain Filters
 *
 * Represents filter state for any domain (vehicles, aircraft, flora, etc.)
 * Replaces domain-specific SearchFilters with a generic, configuration-driven approach
 */

/**
 * Generic filter state for any domain
 *
 * @example Vehicle domain:
 * {
 *   q: 'Ford',
 *   page: 1,
 *   size: 20,
 *   selectedItems: [{ path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }],
 *   columnFilters: { bodyClass: 'Pickup', dataSource: 'NHTSA' },
 *   rangeFilters: { year: { min: 2015, max: 2020 } }
 * }
 *
 * @example Aircraft domain:
 * {
 *   q: 'Boeing',
 *   selectedItems: [{ path: ['Boeing', '737'], display: 'Boeing 737', level: 1 }],
 *   columnFilters: { engineType: 'Turbofan', status: 'Active' },
 *   rangeFilters: { manufactureYear: { min: 2000, max: 2023 } }
 * }
 */
export interface DomainFilters {
  // Text search across all searchable fields
  q?: string;

  // Pagination
  page?: number;
  size?: number;

  // Sorting
  sort?: string;               // Column key to sort by
  sortDirection?: 'asc' | 'desc';

  // Hierarchical selections (replaces modelCombos)
  // Examples:
  // - Vehicles: [{ path: ['Ford', 'F-150'], ... }]
  // - Aircraft: [{ path: ['Boeing', '737', '737-800'], ... }]
  // - Flora: [{ path: ['Rosaceae', 'Rosa', 'Rosa rugosa'], ... }]
  selectedItems?: HierarchicalSelection[];

  // Column-level filters (exact match or contains)
  // Domain-agnostic: keys come from domain configuration
  // Examples:
  // - Vehicles: { bodyClass: 'Pickup', dataSource: 'NHTSA' }
  // - Aircraft: { engineType: 'Turbofan', status: 'Active' }
  // - Flora: { habitat: 'Temperate', nativeRegion: 'North America' }
  columnFilters?: {
    [key: string]: string | number | boolean;
  };

  // Range filters (min/max for numeric or date fields)
  // Domain-agnostic: keys come from domain configuration
  // Examples:
  // - Vehicles: { year: { min: 2015, max: 2020 } }
  // - Aircraft: { manufactureYear: { min: 2000, max: 2023 }, maxRange: { min: 3000 } }
  // - Flora: { bloomTime: { min: 5, max: 8 }, height: { max: 200 } }
  rangeFilters?: {
    [key: string]: {
      min?: number | string;   // Can be number or ISO date string
      max?: number | string;
    };
  };
}

/**
 * Generic application state
 *
 * @template T The domain entity type (VehicleResult, AircraftResult, FloraResult, etc.)
 *
 * @example
 * AppState<VehicleResult> - for vehicle domain
 * AppState<AircraftResult> - for aircraft domain
 * AppState<FloraResult> - for flora domain
 */
export interface AppState<T = any> {
  filters: DomainFilters;
  results: T[];
  loading: boolean;
  error: string | null;
  totalResults: number;
}

/**
 * Helper type for filter metadata
 * Used by UI components to render filter controls dynamically
 */
export interface FilterMetadata {
  key: string;                 // Filter identifier (e.g., 'bodyClass', 'engineType')
  label: string;               // Display label (e.g., 'Body Class', 'Engine Type')
  type: 'text' | 'number' | 'boolean' | 'select' | 'range';
  operators?: ('eq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between')[];
  options?: {                  // For select filters
    value: string | number;
    label: string;
  }[];
  min?: number;                // For range filters
  max?: number;
  step?: number;
}

/**
 * Type guard to check if filters contain hierarchical selections
 */
export function hasHierarchicalSelections(filters: DomainFilters): filters is DomainFilters & { selectedItems: HierarchicalSelection[] } {
  return filters.selectedItems !== undefined && filters.selectedItems.length > 0;
}

/**
 * Type guard to check if filters contain column filters
 */
export function hasColumnFilters(filters: DomainFilters): filters is DomainFilters & { columnFilters: Record<string, any> } {
  return filters.columnFilters !== undefined && Object.keys(filters.columnFilters).length > 0;
}

/**
 * Type guard to check if filters contain range filters
 */
export function hasRangeFilters(filters: DomainFilters): filters is DomainFilters & { rangeFilters: Record<string, any> } {
  return filters.rangeFilters !== undefined && Object.keys(filters.rangeFilters).length > 0;
}

/**
 * Helper function to convert domain-specific filters to generic DomainFilters
 * Useful during migration phase when both filter types coexist
 *
 * @param specificFilters Domain-specific filters (e.g., SearchFilters for vehicles)
 * @param conversionMap Map of specific filter keys to generic filter structures
 * @returns Generic DomainFilters
 */
export function convertToGenericFilters(
  specificFilters: any,
  conversionMap: {
    hierarchicalPath?: string[];  // Keys to extract for hierarchical selections
    columnFilterKeys?: string[];  // Keys to move to columnFilters
    rangeFilterKeys?: string[];   // Keys to move to rangeFilters
  }
): DomainFilters {
  const genericFilters: DomainFilters = {
    q: specificFilters.q,
    page: specificFilters.page,
    size: specificFilters.size,
    sort: specificFilters.sort,
    sortDirection: specificFilters.sortDirection,
  };

  // Convert hierarchical selections if mapping provided
  if (conversionMap.hierarchicalPath && specificFilters[conversionMap.hierarchicalPath[0]]) {
    genericFilters.selectedItems = specificFilters[conversionMap.hierarchicalPath[0]];
  }

  // Convert column filters if mapping provided
  if (conversionMap.columnFilterKeys) {
    genericFilters.columnFilters = {};
    for (const key of conversionMap.columnFilterKeys) {
      if (specificFilters[key] !== undefined) {
        genericFilters.columnFilters[key] = specificFilters[key];
      }
    }
  }

  // Convert range filters if mapping provided
  if (conversionMap.rangeFilterKeys) {
    genericFilters.rangeFilters = {};
    for (const key of conversionMap.rangeFilterKeys) {
      const minKey = `${key}Min`;
      const maxKey = `${key}Max`;
      if (specificFilters[minKey] !== undefined || specificFilters[maxKey] !== undefined) {
        genericFilters.rangeFilters[key] = {
          min: specificFilters[minKey],
          max: specificFilters[maxKey],
        };
      }
    }
  }

  return genericFilters;
}
