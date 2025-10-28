import { HttpClient, HttpParams } from '@angular/common/http';
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
  EntityInstance,
  DomainFilters
} from '../models/generic';
import { VehicleResult, VehicleInstance, ManufacturerModelResponse } from '../models';
import { DomainConfigService } from '../services/generic';

/**
 * Vehicles Domain Adapter
 *
 * Implements domain-specific logic for the vehicles domain.
 * Transforms between generic interfaces and vehicles-specific API calls.
 *
 * @example
 * const adapter = new VehiclesDomainAdapter(configService, http);
 * adapter.fetch(query).subscribe(results => console.log(results));
 */
export class VehiclesDomainAdapter extends DataSourceAdapterBase<Entity<VehicleResult>, EntityInstance<VehicleInstance>> {

  private apiUrl: string;

  constructor(
    private configService: DomainConfigService,
    private http: HttpClient
  ) {
    super();
    const config = this.configService.getCurrentConfig();
    // Get base URL from config, fallback to /api
    this.apiUrl = config?.dataSource.endpoints.search.replace('/search/vehicle-details', '') || '/api/v1';
  }

  /**
   * Transform raw API response to generic Entity
   */
  transformEntity(raw: any): Entity<VehicleResult> {
    return {
      manufacturer: raw.manufacturer,
      model: raw.model,
      year: raw.year,
      body_class: raw.body_class,
      data_source: raw.data_source,
      vehicle_id: raw.vehicle_id,
      ingested_at: raw.ingested_at,
      _meta: {
        id: raw.vehicle_id,
        type: 'vehicle',
        source: raw.data_source,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Transform raw instance response to generic EntityInstance
   */
  transformInstance(raw: any): EntityInstance<VehicleInstance> {
    return {
      vin: raw.vin,
      condition_rating: raw.condition_rating,
      condition_description: raw.condition_description,
      mileage: raw.mileage,
      mileage_verified: raw.mileage_verified,
      registered_state: raw.registered_state,
      registration_status: raw.registration_status,
      title_status: raw.title_status,
      exterior_color: raw.exterior_color,
      factory_options: raw.factory_options,
      estimated_value: raw.estimated_value,
      matching_numbers: raw.matching_numbers,
      last_service_date: raw.last_service_date,
      _meta: {
        parentId: '', // Will be set in fetchInstances
        instanceId: raw.vin,
        type: 'vin',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Build HTTP query parameters from generic filters
   */
  buildQueryParams(filters: DomainFilters): HttpParams {
    let params = new HttpParams();

    // Selected items (manufacturer-model combinations)
    // Format: "Ford:F-150,Chevrolet:Corvette"
    if (filters.selectedItems && filters.selectedItems.length > 0) {
      const modelsParam = filters.selectedItems
        .map(sel => sel.path.join(':'))
        .join(',');
      params = params.set('models', modelsParam);
    }

    // Pagination
    if (filters.page !== undefined) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.size !== undefined) {
      params = params.set('size', filters.size.toString());
    }

    // Sorting
    if (filters.sort) {
      params = params.set('sortBy', filters.sort);
    }
    if (filters.sortDirection) {
      params = params.set('sortOrder', filters.sortDirection);
    }

    // Column filters (direct mapping)
    if (filters.columnFilters) {
      Object.entries(filters.columnFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    // Range filters (convert to min/max params)
    if (filters.rangeFilters) {
      Object.entries(filters.rangeFilters).forEach(([key, range]) => {
        if (range.min !== undefined && range.min !== null) {
          params = params.set(`${key}Min`, range.min.toString());
        }
        if (range.max !== undefined && range.max !== null) {
          params = params.set(`${key}Max`, range.max.toString());
        }
      });
    }

    // Global search
    if (filters.q) {
      params = params.set('q', filters.q);
    }

    return params;
  }

  /**
   * Fetch entities based on query
   */
  fetch(query: DataSourceQuery): Observable<DataSourceResponse<Entity<VehicleResult>>> {
    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = this.getFromCache<DataSourceResponse<Entity<VehicleResult>>>(cacheKey);
    if (cached) {
      return new Observable(subscriber => {
        subscriber.next(cached);
        subscriber.complete();
      });
    }

    // Build query params
    const params = this.buildQueryParams(query.filters);

    // Make API call
    const startTime = Date.now();
    return this.http.get<any>(`${this.apiUrl}/vehicles/details`, { params }).pipe(
      map(response => {
        const took = Date.now() - startTime;

        // Transform to generic format
        const genericResponse: DataSourceResponse<Entity<VehicleResult>> = {
          results: (response.results || []).map((r: any) => this.transformEntity(r)),
          total: response.total || 0,
          page: response.page || 1,
          size: response.size || 20,
          totalPages: response.totalPages || Math.ceil((response.total || 0) / (response.size || 20)),
          metadata: {
            took,
            source: 'vehicles',
            cached: false,
            timestamp: new Date().toISOString()
          }
        };

        // Cache the response
        this.putInCache(cacheKey, genericResponse);

        // Track current query
        this.setCurrentQuery(query);

        return genericResponse;
      })
    );
  }

  /**
   * Fetch instances for a specific entity
   */
  fetchInstances(entityId: string, count: number = 8): Observable<InstanceResponse<EntityInstance<VehicleInstance>>> {
    const params = new HttpParams().set('count', count.toString());

    return this.http.get<any>(`${this.apiUrl}/vehicles/${entityId}/instances`, { params }).pipe(
      map(response => {
        return {
          parentId: entityId,
          instances: (response.instances || []).map((instance: any) => {
            const transformed = this.transformInstance(instance);
            // Set parent ID
            if (transformed._meta) {
              transformed._meta.parentId = entityId;
            }
            return transformed;
          }),
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
   * Fetch aggregations for hierarchical picker
   */
  fetchAggregations(hierarchyId?: string): Observable<AggregationResponse> {
    // For vehicles, we fetch manufacturer-model counts
    return this.http.get<ManufacturerModelResponse>(`${this.apiUrl}/manufacturer-model-combinations`).pipe(
      map(response => {
        // Transform to generic aggregation format
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
   * Optional: Fetch single entity by ID
   */
  fetchById(entityId: string): Observable<Entity<VehicleResult>> {
    // Fetch with filter for specific vehicle_id
    const query: DataSourceQuery = {
      filters: {
        columnFilters: {
          vehicle_id: entityId
        },
        page: 1,
        size: 1
      }
    };

    return this.fetch(query).pipe(
      map(response => {
        if (response.results.length === 0) {
          throw new Error(`Vehicle not found: ${entityId}`);
        }
        return response.results[0];
      })
    );
  }
}
