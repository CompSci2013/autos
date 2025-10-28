import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DataSourceAdapterBase,
  DataSourceQuery,
  DataSourceResponse,
  DataSourceInstancesResponse,
  DataSourceAggregationsResponse,
  AggregationBucket
} from '../models/generic';
import { Entity, EntityInstance } from '../models/generic';
import { DomainConfigService } from '../services/generic';

/**
 * Transport Vehicle Result Entity
 *
 * Represents multi-modal transport vehicles (planes, automobiles, marine).
 * Uses discriminated union based on transport_type.
 */
export interface TransportVehicleResult {
  transport_id: string;
  transport_type: 'plane' | 'automobile' | 'marine';
  registration_id: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  category?: string;
  registration_status?: string;
  location?: {
    city?: string;
    state_province?: string;
    country?: string;
  };
  // Type-specific nested data
  plane_data?: {
    n_number?: string;
    serial_number?: string;
    aircraft_type?: string;
    engine_count?: number;
    engine_manufacturer?: string;
    engine_model?: string;
  };
  automobile_data?: {
    vin?: string;
    make_id?: number;
    model_id?: number;
    body_class?: string;
  };
  marine_data?: {
    imo_number?: string;
    vessel_type?: string;
    gross_tonnage?: number;
  };
  data_source?: string;
  ingested_at?: string;
}

/**
 * Transport Registration Instance
 *
 * Individual registration record (varies by transport type).
 */
export interface TransportRegistration {
  registration_id: string;
  transport_type: string;
  status: string;
  owner?: string;
  operator?: string;
  location?: {
    city?: string;
    state_province?: string;
    country?: string;
  };
  last_updated?: string;
}

/**
 * Transport Domain Adapter
 *
 * Adapter for multi-modal transportation data.
 *
 * Key Features:
 * - Supports planes, automobiles, and marine vessels
 * - Two-dimensional hierarchy: Manufacturer × State (matrix, not tree)
 * - Discriminated union with conditional nested data
 * - Type-specific fields based on transport_type
 *
 * Hierarchy Example:
 * - Manufacturer: Boeing × State: WA → 1,234 planes
 * - Manufacturer: Cessna × State: TX → 987 planes
 * - Manufacturer: Ford × State: CA → 5,432 automobiles
 *
 * This is different from traditional tree hierarchies (vehicles, aircraft).
 */
@Injectable()
export class TransportDomainAdapter extends DataSourceAdapterBase<
  Entity<TransportVehicleResult>,
  EntityInstance<TransportRegistration>
> {
  private apiUrl: string;

  constructor(
    private domainConfig: DomainConfigService,
    private http: HttpClient
  ) {
    super();
    this.apiUrl = this.domainConfig.getApiUrl();
  }

  /**
   * Fetch transport vehicles based on filters
   */
  fetch(query: DataSourceQuery): Observable<DataSourceResponse<Entity<TransportVehicleResult>>> {
    const params = this.buildQueryParams(query.filters);
    const endpoint = `${this.apiUrl}/transport/search`;

    console.log('[TransportDomainAdapter] Fetching transport vehicles:', { endpoint, params: params.toString() });

    return this.http.get<any>(endpoint, { params }).pipe(
      map(response => ({
        results: (response.results || []).map((vehicle: any) => this.transformEntity(vehicle)),
        total: response.total || 0,
        page: response.page || 1,
        size: response.size || 20,
        totalPages: response.totalPages || Math.ceil((response.total || 0) / (response.size || 20))
      }))
    );
  }

  /**
   * Fetch registration instances for a transport vehicle
   */
  fetchInstances(
    entityId: string,
    count: number = 8
  ): Observable<DataSourceInstancesResponse<EntityInstance<TransportRegistration>>> {
    const params = new HttpParams().set('count', count.toString());
    const endpoint = `${this.apiUrl}/transport/registrations/${entityId}`;

    console.log('[TransportDomainAdapter] Fetching registrations:', { entityId, count });

    return this.http.get<any>(endpoint, { params }).pipe(
      map(response => ({
        entityId: response.transport_id || entityId,
        instances: (response.registrations || []).map((reg: any) =>
          this.transformInstance(reg, entityId)
        ),
        total: response.total || 0
      }))
    );
  }

  /**
   * Fetch aggregations (manufacturer-state combinations)
   *
   * NOTE: This returns a MATRIX/GRID structure, not a tree.
   * Each bucket represents a manufacturer-state combination.
   */
  fetchAggregations(): Observable<DataSourceAggregationsResponse> {
    const endpoint = `${this.apiUrl}/transport/manufacturer-state-combinations`;

    console.log('[TransportDomainAdapter] Fetching manufacturer-state combinations');

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

    // Selected items (manufacturer-state combinations)
    // Format: "Boeing:WA,Cessna:TX,Ford:CA"
    if (filters.selectedItems && filters.selectedItems.length > 0) {
      const combosParam = filters.selectedItems
        .map((item: any) => item.path.join(':'))
        .join(',');
      params = params.set('manufacturer_state_combos', combosParam);
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
      params = params.set('sort', filters.sort);
      if (filters.sortDirection) {
        params = params.set('sortOrder', filters.sortDirection);
      }
    }

    // Text search
    if (filters.textSearch) {
      params = params.set('query', filters.textSearch);
    }

    // Column filters
    if (filters.columnFilters) {
      Object.keys(filters.columnFilters).forEach(key => {
        const value = filters.columnFilters[key];
        if (value !== null && value !== undefined && value !== '') {
          // Handle nested path for state_province
          if (key === 'state_province') {
            params = params.set('filter_state', value.toString());
          } else {
            params = params.set(`filter_${key}`, value.toString());
          }
        }
      });
    }

    // Range filters
    if (filters.rangeFilters) {
      Object.keys(filters.rangeFilters).forEach(key => {
        const range = filters.rangeFilters[key];
        if (range.min !== undefined && range.min !== null) {
          params = params.set(`filter_${key}_min`, range.min.toString());
        }
        if (range.max !== undefined && range.max !== null) {
          params = params.set(`filter_${key}_max`, range.max.toString());
        }
      });
    }

    return params;
  }

  /**
   * Transform raw transport vehicle data to Entity
   */
  private transformEntity(raw: any): Entity<TransportVehicleResult> {
    return {
      ...raw,
      _meta: {
        id: raw.transport_id,
        type: 'transport_vehicle',
        source: raw.data_source || 'Transport API',
        timestamp: raw.ingested_at || new Date().toISOString()
      }
    };
  }

  /**
   * Transform raw registration to EntityInstance
   */
  private transformInstance(raw: any, transportId: string): EntityInstance<TransportRegistration> {
    return {
      ...raw,
      _meta: {
        instanceId: raw.registration_id,
        entityId: transportId,
        timestamp: raw.last_updated || new Date().toISOString()
      }
    };
  }

  /**
   * Transform API response to aggregation buckets (2D matrix structure)
   *
   * Expected response format:
   * {
   *   combinations: [
   *     { manufacturer: "Boeing", state: "WA", count: 1234 },
   *     { manufacturer: "Cessna", state: "TX", count: 987 },
   *     ...
   *   ]
   * }
   *
   * Transform to tree structure for picker:
   * - Level 1: Manufacturers (with total across all states)
   * - Level 2: States for each manufacturer (with counts)
   */
  private transformAggregations(response: any): AggregationBucket[] {
    if (!response.combinations) {
      return [];
    }

    // Group by manufacturer
    const manufacturerMap = new Map<string, Map<string, number>>();

    response.combinations.forEach((combo: any) => {
      if (!manufacturerMap.has(combo.manufacturer)) {
        manufacturerMap.set(combo.manufacturer, new Map());
      }
      manufacturerMap.get(combo.manufacturer)!.set(combo.state, combo.count || 0);
    });

    // Convert to tree structure
    const buckets: AggregationBucket[] = [];

    manufacturerMap.forEach((states, manufacturer) => {
      const children: AggregationBucket[] = [];
      let totalCount = 0;

      states.forEach((count, state) => {
        children.push({
          key: state,
          label: state,
          count: count
        });
        totalCount += count;
      });

      buckets.push({
        key: manufacturer,
        label: manufacturer,
        count: totalCount,
        children: children
      });
    });

    // Sort by count (descending)
    buckets.sort((a, b) => b.count - a.count);
    buckets.forEach(bucket => {
      if (bucket.children) {
        bucket.children.sort((a, b) => b.count - a.count);
      }
    });

    return buckets;
  }

  /**
   * Calculate total count across all aggregations
   */
  private calculateTotal(aggregations: AggregationBucket[]): number {
    return aggregations.reduce((sum, bucket) => sum + bucket.count, 0);
  }
}
