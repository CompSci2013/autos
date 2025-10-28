import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DataSourceAdapterBase,
  DataSourceQuery,
  DataSourceResponse,
  InstanceResponse,
  AggregationResponse,
  AggregationBucket,
  Entity,
  EntityInstance
} from '../models/generic';
import { ApiService } from '../services/api.service';
import { VehicleResult, VehicleInstance } from '../models';

/**
 * Legacy API Adapter
 *
 * Wraps the existing ApiService in the GenericDataSource interface.
 * This allows us to use the legacy implementation while testing the new architecture.
 *
 * Used when environment.useGenericArchitecture = false
 *
 * @example
 * const adapter = new LegacyApiAdapter(apiService);
 * adapter.fetch(query).subscribe(results => console.log(results));
 */
export class LegacyApiAdapter extends DataSourceAdapterBase<Entity<VehicleResult>, EntityInstance<VehicleInstance>> {

  constructor(private apiService: ApiService) {
    super();
    console.log('[LegacyApiAdapter] Initialized - using legacy ApiService');
  }

  /**
   * Fetch entities using legacy ApiService
   */
  fetch(query: DataSourceQuery): Observable<DataSourceResponse<Entity<VehicleResult>>> {
    const filters = query.filters;

    // Convert DomainFilters to legacy format
    const modelsParam = this.buildModelsParam(filters);
    const legacyFilters = this.convertToLegacyFilters(filters);

    const startTime = Date.now();

    return this.apiService.getVehicleDetails(
      modelsParam,
      filters.page || 1,
      filters.size || 20,
      legacyFilters,
      filters.sort,
      filters.sortDirection
    ).pipe(
      map(response => {
        const took = Date.now() - startTime;

        // Transform to generic format
        return {
          results: (response.results || []).map(result => this.transformEntity(result)),
          total: response.total || 0,
          page: response.page || 1,
          size: response.size || 20,
          totalPages: response.totalPages || 0,
          metadata: {
            took,
            source: 'legacy',
            cached: false,
            timestamp: new Date().toISOString()
          }
        };
      })
    );
  }

  /**
   * Fetch instances using legacy ApiService
   */
  fetchInstances(entityId: string, count: number = 8): Observable<InstanceResponse<EntityInstance<VehicleInstance>>> {
    return this.apiService.getVehicleInstances(entityId, count).pipe(
      map(response => {
        return {
          parentId: entityId,
          instances: (response.instances || []).map(instance => this.transformInstance(instance)),
          total: response.instances?.length || 0,
          metadata: {
            generated: true,
            timestamp: new Date().toISOString()
          }
        };
      })
    );
  }

  /**
   * Fetch aggregations using legacy ApiService
   */
  fetchAggregations(hierarchyId?: string): Observable<AggregationResponse> {
    return this.apiService.getManufacturerModelCombinations().pipe(
      map(response => {
        const buckets: AggregationBucket[] = (response.data || []).map(manufacturer => ({
          key: manufacturer.manufacturer,
          count: manufacturer.count,
          label: manufacturer.manufacturer,
          children: (manufacturer.models || []).map(model => ({
            key: model.model,
            count: model.count,
            label: model.model
          }))
        }));

        return {
          aggregations: buckets,
          total: buckets.reduce((sum, bucket) => sum + bucket.count, 0)
        };
      })
    );
  }

  /**
   * Transform VehicleResult to generic Entity
   */
  private transformEntity(raw: VehicleResult): Entity<VehicleResult> {
    return {
      ...raw,
      _meta: {
        id: raw.vehicle_id,
        type: 'vehicle',
        source: raw.data_source,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Transform VehicleInstance to generic EntityInstance
   */
  private transformInstance(raw: VehicleInstance): EntityInstance<VehicleInstance> {
    return {
      ...raw,
      _meta: {
        parentId: '', // Will be set by caller
        instanceId: raw.vin,
        type: 'vin',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Build models parameter from selectedItems
   * Format: "Ford:F-150,Chevrolet:Corvette"
   */
  private buildModelsParam(filters: any): string {
    if (!filters.selectedItems || filters.selectedItems.length === 0) {
      return '';
    }

    return filters.selectedItems
      .map((sel: any) => sel.path.join(':'))
      .join(',');
  }

  /**
   * Convert generic DomainFilters to legacy filter format
   */
  private convertToLegacyFilters(filters: any): any {
    const legacyFilters: any = {};

    // Column filters
    if (filters.columnFilters) {
      if (filters.columnFilters.manufacturer) {
        legacyFilters.manufacturer = filters.columnFilters.manufacturer;
      }
      if (filters.columnFilters.model) {
        legacyFilters.model = filters.columnFilters.model;
      }
      if (filters.columnFilters.bodyClass) {
        legacyFilters.bodyClass = filters.columnFilters.bodyClass;
      }
      if (filters.columnFilters.dataSource) {
        legacyFilters.dataSource = filters.columnFilters.dataSource;
      }
    }

    // Range filters
    if (filters.rangeFilters && filters.rangeFilters.year) {
      if (filters.rangeFilters.year.min !== undefined) {
        legacyFilters.yearMin = filters.rangeFilters.year.min;
      }
      if (filters.rangeFilters.year.max !== undefined) {
        legacyFilters.yearMax = filters.rangeFilters.year.max;
      }
    }

    return legacyFilters;
  }
}
