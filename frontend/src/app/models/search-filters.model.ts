// models/search-filters.model.ts
import { ManufacturerModelSelection } from './index';
import { VehicleStatistics } from './vehicle-statistics.model';

export interface SearchFilters {
  // Text search
  q?: string;

  // Table column filters (Pattern 2: Field-specific partial matching)
  manufacturerSearch?: string;  // Partial match on manufacturer field only
  modelSearch?: string;          // Partial match on model field only
  bodyClassSearch?: string;      // Partial match on body_class field only
  dataSourceSearch?: string;     // Partial match on data_source field only

  // Manufacturer-Model combinations (from picker)
  modelCombos?: ManufacturerModelSelection[];

  // Pagination
  page?: number;
  size?: number;

  // Sorting
  sort?: string;
  sortDirection?: 'asc' | 'desc';

  // Column-level filters (exact matching from Query Control)
  manufacturer?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  bodyClass?: string;
  dataSource?: string;
  vehicleID?: string;
  bodyStyle?: string; // Keep for backwards compatibility
}

export interface AppState {
  filters: SearchFilters;
  results: any[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  statistics?: VehicleStatistics; // Statistics for histogram charts
  selectedManufacturer?: string | null; // Currently selected manufacturer in histogram
}
