// models/search-filters.model.ts
import { ManufacturerModelSelection } from './index';
import { VehicleStatistics } from './vehicle-statistics.model';

export interface SearchFilters {
  // Text search
  q?: string;

  // Table column filters (Pattern 2: Search vs Filter Separation)
  // Partial matching across all fields (manufacturer, model, body_class, data_source)
  search?: string;

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
