import { Injectable } from '@angular/core';
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
  EntityInstance
} from '../models/generic';
import { DomainConfigService } from '../services/generic';
import { environment } from '../../environments/environment';

/**
 * Aircraft Result Entity
 *
 * Represents aircraft data from the API.
 */
export interface AircraftResult {
  aircraft_id: string;
  manufacturer: string;
  model: string;
  variant?: string;
  year_built: number;
  aircraft_type: string;
  engine_type?: string;
  max_range_nm?: number;
  cruise_speed_kts?: number;
  seating_capacity?: number;
  data_source: string;
  ingested_at?: string;
}

/**
 * Aircraft Instance (Registration)
 *
 * Represents individual aircraft registrations.
 */
export interface AircraftInstance {
  registration: string;  // e.g., "N12345"
  country: string;
  owner?: string;
  operator?: string;
  status: string;  // Active, Stored, Scrapped
  last_seen?: string;
}

/**
 * Aircraft Domain Adapter
 *
 * Adapter for aviation data with 3-level hierarchy:
 * Manufacturer → Model → Variant
 *
 * Example hierarchy:
 * - Boeing
 *   - 737
 *     - 737-700
 *     - 737-800
 *     - 737 MAX 8
 *   - 777
 *     - 777-200
 *     - 777-300ER
 *
 * Transforms between generic interfaces and aircraft API.
 */
@Injectable()
export class AircraftDomainAdapter extends DataSourceAdapterBase<
  Entity<AircraftResult>,
  EntityInstance<AircraftInstance>
> {
  private apiUrl: string;

  constructor(
    private domainConfig: DomainConfigService,
    private http: HttpClient
  ) {
    super();
    // Use environment API URL
    this.apiUrl = environment.apiUrl || '/api/v1';
  }

  /**
   * Fetch aircraft entities based on filters
   */
  fetch(query: DataSourceQuery): Observable<DataSourceResponse<Entity<AircraftResult>>> {
    const params = this.buildQueryParams(query.filters);
    const endpoint = `${this.apiUrl}/aircraft/details`;

    console.log('[AircraftDomainAdapter] Fetching aircraft:', { endpoint, params: params.toString() });

    return this.http.get<any>(endpoint, { params }).pipe(
      map(response => ({
        results: (response.results || []).map((aircraft: any) => this.transformEntity(aircraft)),
        total: response.total || 0,
        page: response.page || 1,
        size: response.size || 20,
        totalPages: response.totalPages || Math.ceil((response.total || 0) / (response.size || 20))
      }))
    );
  }

  /**
   * Fetch aircraft instances (registrations)
   */
  fetchInstances(
    entityId: string,
    count: number = 8
  ): Observable<InstanceResponse<EntityInstance<AircraftInstance>>> {
    const params = new HttpParams().set('count', count.toString());
    const endpoint = `${this.apiUrl}/aircraft/registrations/${entityId}`;

    console.log('[AircraftDomainAdapter] Fetching registrations:', { entityId, count });

    return this.http.get<any>(endpoint, { params }).pipe(
      map(response => ({
        entityId: response.aircraft_id || entityId,
        parentId: entityId,
        instances: (response.registrations || []).map((reg: any) =>
          this.transformInstance(reg, entityId)
        ),
        total: response.total || 0
      }))
    );
  }

  /**
   * Fetch aggregations (manufacturer-model-variant counts)
   */
  fetchAggregations(): Observable<AggregationResponse> {
    const endpoint = `${this.apiUrl}/aircraft/manufacturer-model-variant-counts`;

    console.log('[AircraftDomainAdapter] Fetching aggregations');

    return this.http.get<any>(endpoint).pipe(
      map(response => {
        const aggregations = this.transformAggregations(response);
        const total = this.calculateTotal(aggregations);

        return {
          aggregations,
          total
        };
      })
    );
  }

  /**
   * Build HTTP query parameters from domain filters
   */
  private buildQueryParams(filters: any): HttpParams {
    let params = new HttpParams();

    // Selected items (manufacturer-model-variant combinations)
    // Format: "Boeing:737:737-800,Airbus:A320:A320neo"
    if (filters.selectedItems && filters.selectedItems.length > 0) {
      const itemsParam = filters.selectedItems
        .map((item: any) => item.path.join(':'))
        .join(',');
      params = params.set('items', itemsParam);
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
      if (filters.sortDirection) {
        params = params.set('sortOrder', filters.sortDirection);
      }
    }

    // Column filters
    if (filters.columnFilters) {
      Object.keys(filters.columnFilters).forEach(key => {
        const value = filters.columnFilters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    // Range filters
    if (filters.rangeFilters) {
      Object.keys(filters.rangeFilters).forEach(key => {
        const range = filters.rangeFilters[key];
        if (range.min !== undefined && range.min !== null) {
          params = params.set(`${key}Min`, range.min.toString());
        }
        if (range.max !== undefined && range.max !== null) {
          params = params.set(`${key}Max`, range.max.toString());
        }
      });
    }

    return params;
  }

  /**
   * Transform raw aircraft data to Entity
   */
  private transformEntity(raw: any): Entity<AircraftResult> {
    return {
      ...raw,
      _meta: {
        id: raw.aircraft_id,
        type: 'aircraft',
        source: raw.data_source || 'Unknown',
        timestamp: raw.ingested_at || new Date().toISOString()
      }
    };
  }

  /**
   * Transform raw registration to EntityInstance
   */
  private transformInstance(raw: any, aircraftId: string): EntityInstance<AircraftInstance> {
    return {
      ...raw,
      _meta: {
        instanceId: raw.registration,
        entityId: aircraftId,
        timestamp: raw.last_seen || new Date().toISOString()
      }
    };
  }

  /**
   * Transform API response to aggregation buckets (3-level hierarchy)
   */
  private transformAggregations(response: any): AggregationBucket[] {
    if (!response.manufacturers) {
      return [];
    }

    return response.manufacturers.map((mfr: any) => ({
      key: mfr.manufacturer,
      label: mfr.manufacturer,
      count: this.sumModelCounts(mfr.models || []),
      children: (mfr.models || []).map((model: any) => ({
        key: model.model,
        label: model.model,
        count: this.sumVariantCounts(model.variants || []),
        children: (model.variants || []).map((variant: any) => ({
          key: variant.variant,
          label: variant.variant,
          count: variant.count || 0
        }))
      }))
    }));
  }

  /**
   * Sum counts across all models (including variants)
   */
  private sumModelCounts(models: any[]): number {
    return models.reduce((sum, model) => {
      return sum + this.sumVariantCounts(model.variants || []);
    }, 0);
  }

  /**
   * Sum counts across all variants
   */
  private sumVariantCounts(variants: any[]): number {
    return variants.reduce((sum, variant) => sum + (variant.count || 0), 0);
  }

  /**
   * Calculate total count across all aggregations
   */
  private calculateTotal(aggregations: AggregationBucket[]): number {
    return aggregations.reduce((sum, bucket) => sum + bucket.count, 0);
  }
}
