/**
 * Vehicle picker row representing a single manufacturer-model combination
 */
export interface PickerRow {
  manufacturer: string;
  model: string;
  count: number;
  key: string; // Format: "manufacturer|model"
}

/**
 * Model detail for nested display
 */
export interface ModelDetail {
  model: string;
  count: number;
}

/**
 * Manufacturer group with models for hierarchical display
 */
export interface ManufacturerGroup {
  manufacturer: string;
  totalCount: number;
  models: ModelDetail[];
  expanded: boolean;
}

/**
 * Selected manufacturer-model combination
 */
export interface ManufacturerModelSelection {
  manufacturer: string;
  model: string;
}

/**
 * API response from backend /api/v1/manufacturer-model-combinations
 */
export interface ManufacturerModelResponse {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  data: Array<{
    manufacturer: string;
    count: number;
    models: Array<{
      model: string;
      count: number;
    }>;
  }>;
}
