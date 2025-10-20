import { VehicleResult } from '../../../../models/vehicle-result.model';

/**
 * Mock vehicle data for testing BaseDataTableComponent
 * Provides realistic test data with various scenarios
 */
export const MOCK_VEHICLE_DATA: VehicleResult[] = [
  {
    vehicle_id: '1',
    manufacturer: 'Ford',
    model: 'F-150',
    year: 2020,
    body_class: 'Pickup',
    data_source: 'vPIC',
    ingested_at: '2024-01-15T10:30:00Z'
  },
  {
    vehicle_id: '2',
    manufacturer: 'Chevrolet',
    model: 'Silverado',
    year: 2021,
    body_class: 'Pickup',
    data_source: 'vPIC',
    ingested_at: '2024-01-15T10:31:00Z'
  },
  {
    vehicle_id: '3',
    manufacturer: 'Toyota',
    model: 'Camry',
    year: 2019,
    body_class: 'Sedan',
    data_source: 'vPIC',
    ingested_at: '2024-01-15T10:32:00Z'
  },
  {
    vehicle_id: '4',
    manufacturer: 'Honda',
    model: 'Civic',
    year: 2022,
    body_class: 'Sedan',
    data_source: 'vPIC',
    ingested_at: '2024-01-15T10:33:00Z'
  },
  {
    vehicle_id: '5',
    manufacturer: 'Ford',
    model: 'Mustang',
    year: 2021,
    body_class: 'Coupe',
    data_source: 'vPIC',
    ingested_at: '2024-01-15T10:34:00Z'
  }
];

/**
 * Generate a mock table response for testing
 */
export function createMockTableResponse(
  data: VehicleResult[] = MOCK_VEHICLE_DATA,
  page: number = 1,
  size: number = 20
): any {
  const start = (page - 1) * size;
  const end = start + size;
  const results = data.slice(start, end);
  
  return {
    results: results,
    total: data.length,
    page: page,
    size: size,
    totalPages: Math.ceil(data.length / size)
  };
}
