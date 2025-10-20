import { Observable, of, delay } from 'rxjs';
import { TableDataSource, TableQueryParams, TableResponse } from '../../../models/table-data-source.model';
import { VehicleResult } from '../../../../models/vehicle-result.model';
import { MOCK_VEHICLE_DATA, createMockTableResponse } from './mock-table-data';

/**
 * Mock implementation of TableDataSource for testing
 * Simulates server-side filtering, sorting, and pagination
 */
export class MockTableDataSource implements TableDataSource<VehicleResult> {
  private data: VehicleResult[] = [...MOCK_VEHICLE_DATA];
  public lastParams?: TableQueryParams;
  public fetchCallCount = 0;

  /**
   * Fetch data with optional delay to simulate network latency
   */
  fetch(params: TableQueryParams): Observable<TableResponse<VehicleResult>> {
    this.lastParams = params;
    this.fetchCallCount++;

    let filteredData = [...this.data];

    // Apply filters
    if (params.filters) {
      Object.keys(params.filters).forEach(key => {
        const filterValue = params.filters![key];
        if (filterValue) {
          filteredData = filteredData.filter(item => {
            const itemValue = (item as any)[key];
            if (typeof itemValue === 'string') {
              return itemValue.toLowerCase().includes(filterValue.toLowerCase());
            }
            return itemValue === filterValue;
          });
        }
      });
    }

    // Apply sorting
    if (params.sortBy) {
      filteredData.sort((a, b) => {
        const aValue = (a as any)[params.sortBy!];
        const bValue = (b as any)[params.sortBy!];
        
        if (aValue < bValue) return params.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return params.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const start = (params.page - 1) * params.size;
    const end = start + params.size;
    const results = filteredData.slice(start, end);

    const response: TableResponse<VehicleResult> = {
      results,
      total: filteredData.length,
      page: params.page,
      size: params.size,
      totalPages: Math.ceil(filteredData.length / params.size)
    };

    // Simulate network delay (can be disabled for faster tests)
    return of(response).pipe(delay(0));
  }

  /**
   * Reset the mock data source to initial state
   */
  reset(): void {
    this.data = [...MOCK_VEHICLE_DATA];
    this.lastParams = undefined;
    this.fetchCallCount = 0;
  }

  /**
   * Set custom data for testing specific scenarios
   */
  setData(data: VehicleResult[]): void {
    this.data = [...data];
  }
}
