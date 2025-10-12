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
  
  // Additional filters (for future use)
  yearMin?: number;
  yearMax?: number;
  bodyStyle?: string;
}

export interface AppState {
  filters: SearchFilters;
  results: any[];
  loading: boolean;
  error: string | null;
  totalResults: number;
}
