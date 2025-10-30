import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../../../shared/models/table-data-source.model';
import { ApiService } from '../../../services/api.service';
import { VehicleResult } from '../../../models/vehicle-result.model';

/**
 * Data source adapter for results-table component
 * Implements TableDataSource interface to work with BaseDataTableComponent
 * 
 * This adapter wraps ApiService.getVehicleDetails() and transforms the response
 * to match the TableResponse<VehicleResult> interface expected by BaseDataTableComponent.
 */
export class VehicleDataSourceAdapter implements TableDataSource<VehicleResult> {
  private modelsParam = ''; // Comma-separated "Manufacturer:Model" pairs

  constructor(private apiService: ApiService) {}

  /**
   * Fetch vehicle results from API
   * Transforms API response to match TableResponse interface
   *
   * @param params Query parameters from BaseDataTableComponent
   * @returns Observable of table response with vehicle results
   *
   * Note: If modelsParam is empty, API will return all vehicles (filtered by other criteria)
   */
  fetch(params: TableQueryParams): Observable<TableResponse<VehicleResult>> {
    // Extract filters from params
    const filters = params.filters || {};

    // Call existing API service method
    return this.apiService
      .getVehicleDetails(
        this.modelsParam, // String format: "Ford:F-150,Chevrolet:Corvette"
        params.page,
        params.size,
        filters,
        params.sortBy,
        params.sortOrder
      )
      .pipe(
        map((response) => ({
          results: response.results,
          total: response.total,
          page: response.page,
          size: response.size,
          totalPages: Math.ceil(response.total / response.size),
        }))
      );
  }

  /**
   * Update models parameter (when user changes selection)
   * @param modelsParam Comma-separated "Manufacturer:Model" string
   */
  updateModels(modelsParam: string): void {
    this.modelsParam = modelsParam;
  }

  /**
   * Get current models parameter
   * @returns Current models parameter string
   */
  getModels(): string {
    return this.modelsParam;
  }
}
