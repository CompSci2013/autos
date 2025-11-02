import { VehicleStatistics } from './vehicle-statistics.model';

/**
 * Detailed vehicle result for results table
 * Matches Elasticsearch document structure
 */
export interface VehicleResult {
  vehicle_id: string;
  manufacturer: string;
  model: string;
  year: number;

  // Body information
  body_class?: string;

  // Metadata
  data_source: string;
  ingested_at: string;
}

/**
 * API response for vehicle details query
 * Backend endpoint: GET /api/v1/vehicles/details
 */
export interface VehicleDetailsResponse {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  query: {
    modelCombos: Array<{
      manufacturer: string;
      model: string;
    }>;
  };
  results: VehicleResult[];
  statistics?: VehicleStatistics; // NEW: Statistics for histogram charts
}
