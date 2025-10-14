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

/**
 * VIN-level instance data (individual vehicle)
 */
export interface VehicleInstance {
  vin: string;
  condition_rating: number;
  condition_description: string;
  mileage: number;
  mileage_verified: boolean;
  registered_state: string;
  registration_status: string;
  title_status: string;
  exterior_color: string;
  factory_options: string[];
  estimated_value: number;
  matching_numbers: boolean;
  last_service_date: string;
}

/**
 * API response for vehicle instances endpoint
 */
export interface VehicleInstancesResponse {
  vehicle_id: string;
  manufacturer: string;
  model: string;
  year: number;
  body_class: string;
  instance_count: number;
  instances: VehicleInstance[];
}
