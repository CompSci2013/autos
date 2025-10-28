import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GenericDataSource,
  DataSourceQuery,
  DataSourceResponse,
  InstanceResponse,
  AggregationResponse,
  Entity,
  EntityInstance
} from '../../models/generic';
import { DomainConfigService } from './domain-config.service';
import { VehiclesDomainAdapter } from '../../adapters/vehicles-domain.adapter';
import { AircraftDomainAdapter } from '../../adapters/aircraft-domain.adapter';
import { TransportDomainAdapter } from '../../adapters/transport-domain.adapter';
import { LegacyApiAdapter } from '../../adapters/legacy-api.adapter';
import { ApiService } from '../api.service';
import { environment } from '../../../environments/environment';

/**
 * Generic Data Service
 *
 * Provides domain-agnostic data access through adapters.
 * Uses factory pattern to select the appropriate domain adapter based on configuration.
 *
 * This service acts as a facade, delegating all operations to domain-specific adapters
 * that handle the details of API communication and data transformation.
 *
 * @example
 * // In component:
 * constructor(private dataService: GenericDataService<VehicleResult, VehicleInstance>) {}
 *
 * ngOnInit() {
 *   const query: DataSourceQuery = {
 *     filters: {
 *       selectedItems: [...],
 *       page: 1,
 *       size: 20
 *     }
 *   };
 *
 *   this.dataService.fetch(query).subscribe(response => {
 *     console.log('Results:', response.results);
 *   });
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class GenericDataService<
  T extends Entity = Entity,
  I extends EntityInstance = EntityInstance
> implements GenericDataSource<T, I> {

  private adapter: GenericDataSource<T, I>;

  constructor(
    private http: HttpClient,
    private domainConfig: DomainConfigService,
    private apiService: ApiService
  ) {
    console.log('[GenericDataService] Initializing...');
    this.adapter = this.loadAdapter();
  }

  /**
   * Load the appropriate domain adapter based on configuration
   *
   * Uses factory pattern to instantiate domain-specific adapters.
   * Falls back to generic REST adapter if no specific adapter found.
   *
   * @returns Domain-specific data source adapter
   * @throws Error if domain configuration not loaded or domain not supported
   */
  private loadAdapter(): GenericDataSource<T, I> {
    // Check if we should use legacy implementation (for parallel testing)
    if (environment.useGenericArchitecture === false) {
      console.log('[GenericDataService] Feature flag disabled, using legacy implementation');
      return new LegacyApiAdapter(this.apiService) as any;
    }

    console.log('[GenericDataService] Feature flag enabled, using generic architecture');

    const config = this.domainConfig.getCurrentConfig();
    if (!config) {
      throw new Error('Domain configuration not loaded. Call DomainConfigService.initialize() first.');
    }

    const domainId = config.domain.id;
    console.log(`[GenericDataService] Loading adapter for domain: ${domainId}`);

    // Factory: Select adapter based on domain ID
    switch (domainId) {
      case 'vehicles':
        console.log('[GenericDataService] Creating VehiclesDomainAdapter');
        return new VehiclesDomainAdapter(this.domainConfig, this.http) as any;

      case 'aircraft':
        console.log('[GenericDataService] Creating AircraftDomainAdapter');
        return new AircraftDomainAdapter(this.domainConfig, this.http) as any;

      case 'transport':
        console.log('[GenericDataService] Creating TransportDomainAdapter');
        return new TransportDomainAdapter(this.domainConfig, this.http) as any;

      case 'flora':
        // Future: return new FloraDomainAdapter(this.domainConfig, this.http) as any;
        throw new Error(`Domain adapter not yet implemented: ${domainId}`);

      default:
        // Future: Generic REST adapter as fallback
        throw new Error(`No adapter available for domain: ${domainId}`);
    }
  }

  /**
   * Fetch entities based on query parameters
   *
   * @param query Query parameters including filters, pagination, sorting
   * @returns Observable of data source response with results
   */
  fetch(query: DataSourceQuery): Observable<DataSourceResponse<T>> {
    console.log('[GenericDataService] fetch() called with query:', query);
    return this.adapter.fetch(query);
  }

  /**
   * Fetch instances/details for a specific entity
   *
   * Examples:
   * - Vehicles: Fetch VIN instances for a vehicle
   * - Aircraft: Fetch registrations for an aircraft model
   * - Flora: Fetch specimens for a species
   *
   * @param entityId Unique identifier of the parent entity
   * @param count Number of instances to fetch (default varies by domain)
   * @returns Observable of instance response
   */
  fetchInstances(entityId: string, count?: number): Observable<InstanceResponse<I>> {
    console.log(`[GenericDataService] fetchInstances() called for entity: ${entityId}, count: ${count}`);
    return this.adapter.fetchInstances(entityId, count);
  }

  /**
   * Fetch aggregations for hierarchical picker
   *
   * Returns hierarchical counts for building picker UI.
   * Examples:
   * - Vehicles: Manufacturer → Model counts
   * - Aircraft: Manufacturer → Model → Variant counts
   * - Flora: Family → Genus → Species counts
   *
   * @param hierarchyId Optional identifier for specific hierarchy (if domain has multiple)
   * @returns Observable of aggregation response with hierarchical buckets
   */
  fetchAggregations(hierarchyId?: string): Observable<AggregationResponse> {
    console.log(`[GenericDataService] fetchAggregations() called with hierarchy: ${hierarchyId || 'default'}`);
    return this.adapter.fetchAggregations(hierarchyId);
  }

  /**
   * Fetch single entity by ID (optional, not all adapters implement)
   *
   * @param entityId Unique identifier of the entity
   * @returns Observable of single entity
   * @throws Error if adapter doesn't support this operation
   */
  fetchById(entityId: string): Observable<T> {
    console.log(`[GenericDataService] fetchById() called for: ${entityId}`);

    if (!this.adapter.fetchById) {
      throw new Error('Current adapter does not support fetchById operation');
    }

    return this.adapter.fetchById(entityId);
  }

  /**
   * Get current query state from adapter (optional)
   *
   * @returns Current query parameters or undefined
   */
  getCurrentQuery(): DataSourceQuery | undefined {
    if (!this.adapter.getCurrentQuery) {
      return undefined;
    }
    return this.adapter.getCurrentQuery();
  }

  /**
   * Clear any cached data in the adapter
   *
   * Useful for forcing fresh data fetch or after configuration changes.
   */
  clearCache(): void {
    console.log('[GenericDataService] Clearing adapter cache');
    if (this.adapter.clearCache) {
      this.adapter.clearCache();
    }
  }

  /**
   * Reload adapter (useful if domain configuration changes)
   *
   * @returns New adapter instance
   */
  reloadAdapter(): void {
    console.log('[GenericDataService] Reloading adapter');
    this.adapter = this.loadAdapter();
  }

  /**
   * Get the current adapter instance
   * Useful for testing or advanced use cases
   *
   * @returns Current data source adapter
   */
  getAdapter(): GenericDataSource<T, I> {
    return this.adapter;
  }

  /**
   * Check if current adapter supports a specific operation
   *
   * @param operation Operation name ('fetchById', 'getCurrentQuery', 'clearCache')
   * @returns True if adapter supports the operation
   */
  supportsOperation(operation: keyof GenericDataSource<T, I>): boolean {
    return typeof this.adapter[operation] === 'function';
  }
}
