// models/search-filters.model.ts
import { ManufacturerModelSelection } from './index';

export interface SearchFilters {
  // Text search
  q?: string;

  // Manufacturer-Model combinations (from picker)
  modelCombos?: ManufacturerModelSelection[];

  // Pagination
  page?: number;
  size?: number;

  // Sorting
  sort?: string;
  sortDirection?: 'asc' | 'desc';

  // Column-level filters
  manufacturer?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  bodyClass?: string;
  dataSource?: string;
  bodyStyle?: string; // Keep for backwards compatibility
}

export interface AppState {
  filters: SearchFilters;
  results: any[];
  loading: boolean;
  error: string | null;
  totalResults: number;
}
