import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../../../shared/models/table-data-source.model';
import { ApiService } from '../../../services/api.service';
import { VehicleResult } from '../../../models/vehicle-result.model';
import { RequestCoordinatorService } from '../../../core/services/request-coordinator.service';

/**
 * Data source adapter for results-table component
 * Implements TableDataSource interface to work with BaseDataTableComponent
 *
 * This adapter wraps ApiService.getVehicleDetails() and transforms the response
 * to match the TableResponse<VehicleResult> interface expected by BaseDataTableComponent.
 *
 * Uses RequestCoordinatorService for deduplication, caching, and retry logic.
 * This ensures that identical requests from StateManagementService and DataSource
 * are deduplicated and only one API call is made.
 */
export class VehicleDataSourceAdapter implements TableDataSource<VehicleResult> {
  private modelsParam = ''; // Comma-separated "Manufacturer:Model" pairs

  constructor(
    private apiService: ApiService,
    private requestCoordinator: RequestCoordinatorService
  ) {}

  /**
   * Fetch vehicle results from API
   * Transforms API response to match TableResponse interface
   *
   * Uses RequestCoordinatorService for deduplication and caching.
   * This ensures identical requests are deduplicated with StateManagementService.
   *
   * @param params Query parameters from BaseDataTableComponent
   * @returns Observable of table response with vehicle results
   *
   * Note: If modelsParam is empty, API will return all vehicles (filtered by other criteria)
   */
  fetch(params: TableQueryParams): Observable<TableResponse<VehicleResult>> {
    // Extract filters from params
    const filters = params.filters || {};

    // Build cache key (must match StateManagementService format for deduplication)
    const cacheKey = this.buildCacheKey(params);

    console.log('🔷 DataSource: Fetching via RequestCoordinator, key:', cacheKey);

    // Use RequestCoordinator for deduplication, caching, and retry
    return this.requestCoordinator
      .execute(
        cacheKey,
        () =>
          this.apiService.getVehicleDetails(
            this.modelsParam, // String format: "Ford:F-150,Chevrolet:Corvette"
            params.page,
            params.size,
            filters,
            params.sortBy,
            params.sortOrder
          ),
        {
          cacheTime: 30000, // Cache for 30 seconds (matches StateManagementService)
          deduplication: true, // Deduplicate with StateManagementService
          retryAttempts: 2,
          retryDelay: 1000,
        }
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
   * Build cache key for request deduplication
   * Must match StateManagementService.buildCacheKey() format exactly
   *
   * @param params Query parameters
   * @returns Cache key string
   */
  private buildCacheKey(params: TableQueryParams): string {
    const filters = params.filters || {};

    // Parse models from modelsParam string to array for consistent sorting
    const modelCombos = this.modelsParam
      ? this.modelsParam.split(',').map((combo) => {
          const [manufacturer, model] = combo.split(':');
          return { manufacturer, model };
        })
      : [];

    // Sort model combos for deterministic key
    modelCombos.sort((a, b) =>
      `${a.manufacturer}:${a.model}`.localeCompare(`${b.manufacturer}:${b.model}`)
    );

    // Create deterministic filter object (matches StateManagementService format)
    const filterObject = {
      modelCombos,
      page: params.page,
      size: params.size,
      sort: params.sortBy,
      sortDirection: params.sortOrder,
      // Column filters
      manufacturer: filters['manufacturer'],
      model: filters['model'],
      yearMin: filters['yearMin'],
      yearMax: filters['yearMax'],
      bodyClass: filters['bodyClass'],
      dataSource: filters['dataSource'],
    };

    const filterString = JSON.stringify(filterObject);

    // Use base64 encoding for URL-safe key (matches StateManagementService)
    return `vehicle-details:${btoa(filterString)}`;
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
