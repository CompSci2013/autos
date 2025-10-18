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
 * Data source adapter for VehicleResultsTable
 * Implements TableDataSource interface to work with BaseDataTableComponent
 */
export class VehicleDataSource implements TableDataSource<VehicleResult> {
  constructor(
    private apiService: ApiService,
    private modelsParam: string // Comma-separated "Manufacturer:Model" pairs
  ) {}

  /**
   * Fetch vehicle results from API
   * Transforms API response to match TableResponse interface
   */
  fetch(params: TableQueryParams): Observable<TableResponse<VehicleResult>> {
    // Extract filters
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
}
