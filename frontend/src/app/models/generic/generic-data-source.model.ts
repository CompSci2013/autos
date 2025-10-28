import { Observable } from 'rxjs';
import { Entity, EntityInstance } from './entity.model';
import { DomainFilters } from './domain-filters.model';

/**
 * Generic Data Source Interfaces
 *
 * Abstracts data fetching for any domain (vehicles, aircraft, flora, etc.)
 * Adapters implement these interfaces to connect domain configurations to specific APIs
 */

/**
 * Query parameters for data source requests
 *
 * @example Vehicle search:
 * {
 *   filters: { selectedItems: [...], columnFilters: { bodyClass: 'Pickup' } },
 *   page: 1,
 *   size: 20,
 *   sortBy: 'year',
 *   sortOrder: 'desc'
 * }
 */
export interface DataSourceQuery {
  filters: DomainFilters;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response from data source queries
 *
 * @template T The domain entity type (VehicleResult, AircraftResult, etc.)
 */
export interface DataSourceResponse<T extends Entity = Entity> {
  results: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  metadata?: {
    took?: number;             // Query execution time (ms)
    source?: string;           // Data source identifier
    cached?: boolean;          // Whether response was cached
    timestamp?: string;        // Response timestamp (ISO 8601)
  };
}

/**
 * Response from instance queries (detail/child entities)
 *
 * @template T The instance entity type (VehicleInstance, AircraftRegistration, etc.)
 */
export interface InstanceResponse<T extends EntityInstance = EntityInstance> {
  parentId: string;
  instances: T[];
  total?: number;
  metadata?: {
    generated?: boolean;       // Whether instances were generated on-demand
    timestamp?: string;
  };
}

/**
 * Response from aggregation/count queries
 *
 * @example Manufacturer-Model counts for vehicles:
 * {
 *   aggregations: [
 *     { key: 'Ford', count: 150, children: [
 *       { key: 'F-150', count: 45 },
 *       { key: 'Mustang', count: 38 }
 *     ]}
 *   ]
 * }
 */
export interface AggregationResponse {
  aggregations: AggregationBucket[];
  total: number;
}

/**
 * Single aggregation bucket (hierarchical)
 */
export interface AggregationBucket {
  key: string;                 // Bucket key (e.g., 'Ford', 'Boeing')
  count: number;               // Document count
  label?: string;              // Display label (defaults to key)
  metadata?: {
    [key: string]: any;
  };
  children?: AggregationBucket[];  // Child buckets (for hierarchies)
}

/**
 * Generic data source interface
 *
 * All domain adapters must implement this interface.
 * The interface is domain-agnostic and works with any entity type.
 *
 * @template T The domain entity type
 * @template I The instance entity type
 *
 * @example
 * VehicleDataSource implements GenericDataSource<VehicleResult, VehicleInstance>
 * AircraftDataSource implements GenericDataSource<AircraftResult, AircraftRegistration>
 */
export interface GenericDataSource<
  T extends Entity = Entity,
  I extends EntityInstance = EntityInstance
> {
  /**
   * Fetch entities based on query parameters
   */
  fetch(query: DataSourceQuery): Observable<DataSourceResponse<T>>;

  /**
   * Fetch instances/details for a specific entity
   */
  fetchInstances(entityId: string, count?: number): Observable<InstanceResponse<I>>;

  /**
   * Fetch aggregations/counts for hierarchical picker
   */
  fetchAggregations(hierarchyId?: string): Observable<AggregationResponse>;

  /**
   * Optional: Fetch single entity by ID
   */
  fetchById?(entityId: string): Observable<T>;

  /**
   * Optional: Get current query state
   */
  getCurrentQuery?(): DataSourceQuery | undefined;

  /**
   * Optional: Clear any cached data
   */
  clearCache?(): void;
}

/**
 * Base adapter class providing common functionality
 *
 * Domain-specific adapters can extend this class to reduce boilerplate
 *
 * @template T The domain entity type
 * @template I The instance entity type
 */
export abstract class DataSourceAdapterBase<
  T extends Entity = Entity,
  I extends EntityInstance = EntityInstance
> implements GenericDataSource<T, I> {

  protected currentQuery?: DataSourceQuery;
  protected cache = new Map<string, any>();
  protected cacheEnabled = true;
  protected cacheTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Subclasses must implement fetch
   */
  abstract fetch(query: DataSourceQuery): Observable<DataSourceResponse<T>>;

  /**
   * Subclasses must implement fetchInstances
   */
  abstract fetchInstances(entityId: string, count?: number): Observable<InstanceResponse<I>>;

  /**
   * Subclasses must implement fetchAggregations
   */
  abstract fetchAggregations(hierarchyId?: string): Observable<AggregationResponse>;

  /**
   * Get current query state
   */
  getCurrentQuery(): DataSourceQuery | undefined {
    return this.currentQuery;
  }

  /**
   * Update current query (for tracking)
   */
  protected setCurrentQuery(query: DataSourceQuery): void {
    this.currentQuery = query;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get from cache with TTL check
   */
  protected getFromCache<V>(key: string): V | undefined {
    if (!this.cacheEnabled) return undefined;

    const cached = this.cache.get(key);
    if (!cached) return undefined;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.value as V;
  }

  /**
   * Put in cache with timestamp
   */
  protected putInCache<V>(key: string, value: V): void {
    if (!this.cacheEnabled) return;

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Generate cache key from query
   */
  protected generateCacheKey(query: DataSourceQuery): string {
    return JSON.stringify(query);
  }

  /**
   * Enable/disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Set cache TTL in milliseconds
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}

/**
 * Type guard to check if response has metadata
 */
export function hasResponseMetadata<T extends Entity>(
  response: DataSourceResponse<T>
): response is DataSourceResponse<T> & { metadata: Required<DataSourceResponse<T>['metadata']> } {
  return response.metadata !== undefined;
}

/**
 * Type guard to check if aggregation has children
 */
export function hasChildBuckets(bucket: AggregationBucket): bucket is AggregationBucket & { children: AggregationBucket[] } {
  return bucket.children !== undefined && bucket.children.length > 0;
}

/**
 * Helper function to flatten hierarchical aggregation buckets
 */
export function flattenAggregations(buckets: AggregationBucket[]): AggregationBucket[] {
  const flattened: AggregationBucket[] = [];

  function flatten(bucket: AggregationBucket): void {
    flattened.push(bucket);
    if (hasChildBuckets(bucket)) {
      bucket.children.forEach(flatten);
    }
  }

  buckets.forEach(flatten);
  return flattened;
}

/**
 * Helper function to build hierarchy path from aggregation buckets
 */
export function buildHierarchyPath(bucket: AggregationBucket, ancestors: AggregationBucket[] = []): string[] {
  return [...ancestors.map(a => a.key), bucket.key];
}
