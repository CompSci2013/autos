/**
 * Base Picker Data Source
 *
 * Generic, reusable data source for picker components.
 * Implements TableDataSource<T> interface with configuration-driven behavior.
 *
 * Features:
 * - Client-side pagination (load once, filter/sort/paginate in memory)
 * - Server-side pagination (request each page from API)
 * - Dynamic API method invocation
 * - Nested data support via valuePath
 * - Data caching (client-side mode)
 *
 * Usage:
 *   const dataSource = new BasePickerDataSource(apiService, config);
 *   dataSource.fetch(params).subscribe(response => { ... });
 */

import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../models/table-data-source.model';
import {
  PickerConfig,
  resolveColumnValue,
} from '../models/picker-config.model';
import { ApiService } from '../../services/api.service';

/**
 * Base Picker Data Source
 * Generic implementation of TableDataSource driven by PickerConfig
 *
 * Note: This class is NOT injectable. It's instantiated manually with `new BasePickerDataSource(apiService, config)`
 */
export class BasePickerDataSource<T> implements TableDataSource<T> {
  /**
   * Cached data (for client-side pagination mode)
   * Null if data not loaded yet
   */
  private cachedData: T[] | null = null;

  /**
   * Timestamp of last data load (for cache TTL)
   */
  private lastLoadTime: number | null = null;

  /**
   * Flag indicating if data is currently loading
   */
  private isLoading = false;

  constructor(
    private apiService: ApiService,
    private config: PickerConfig<T>
  ) {
    console.log(
      `[BasePickerDataSource] Initialized for '${config.id}' (${config.pagination.mode} mode)`
    );
  }

  /**
   * Fetch data based on query parameters
   *
   * Behavior depends on pagination mode:
   * - Client-side: Load all data once, filter/sort/paginate in memory
   * - Server-side: Request specific page from API each time
   *
   * @param params Query parameters (page, size, filters, sort)
   * @returns Observable of table response
   */
  fetch(params: TableQueryParams): Observable<TableResponse<T>> {
    console.log(
      `[BasePickerDataSource] fetch() called for '${this.config.id}'`,
      params
    );

    if (this.config.pagination.mode === 'client') {
      return this.fetchClientSide(params);
    } else {
      return this.fetchServerSide(params);
    }
  }

  /**
   * Reset cached data (force reload on next fetch)
   */
  reset(): void {
    this.cachedData = null;
    this.lastLoadTime = null;
    console.log(`[BasePickerDataSource] Reset cache for '${this.config.id}'`);
  }

  /**
   * Get cached data (client-side mode only)
   * Returns null if no data cached
   */
  getCachedData(): T[] | null {
    return this.cachedData;
  }

  /**
   * Check if cache is valid based on TTL
   */
  private isCacheValid(): boolean {
    if (!this.cachedData || !this.lastLoadTime) {
      return false;
    }

    // If caching disabled, cache is never valid
    if (!this.config.caching?.enabled) {
      return false;
    }

    // If TTL is 0, cache forever
    if (this.config.caching.ttl === 0) {
      return true;
    }

    // Check if cache has expired
    const now = Date.now();
    const elapsed = now - this.lastLoadTime;
    return elapsed < this.config.caching.ttl;
  }

  /**
   * Fetch data in client-side pagination mode
   * Loads all data once, then filters/sorts/paginates in memory
   */
  private fetchClientSide(params: TableQueryParams): Observable<TableResponse<T>> {
    // If cache is valid, use it
    if (this.isCacheValid()) {
      console.log(
        `[BasePickerDataSource] Using cached data for '${this.config.id}'`
      );
      return of(this.filterSortPaginate(this.cachedData!, params));
    }

    // If already loading, return empty response (prevent duplicate requests)
    if (this.isLoading) {
      console.warn(
        `[BasePickerDataSource] Already loading data for '${this.config.id}', skipping duplicate request`
      );
      return of({
        results: [],
        total: 0,
        page: params.page,
        size: params.size,
        totalPages: 0,
      });
    }

    // Load all data from API
    console.log(
      `[BasePickerDataSource] Loading all data for '${this.config.id}' (client-side mode)`
    );

    this.isLoading = true;

    // Call API method dynamically
    return this.callApiMethod(params).pipe(
      tap((response) => {
        // Cache the data
        this.cachedData = response.results;
        this.lastLoadTime = Date.now();
        this.isLoading = false;
        console.log(
          `[BasePickerDataSource] Loaded ${response.results.length} rows for '${this.config.id}'`
        );
      }),
      map((response) => {
        // Apply client-side filter/sort/paginate
        return this.filterSortPaginate(response.results, params);
      }),
      catchError((error) => {
        this.isLoading = false;
        console.error(
          `[BasePickerDataSource] Error loading data for '${this.config.id}':`,
          error
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch data in server-side pagination mode
   * Requests specific page from API each time
   */
  private fetchServerSide(params: TableQueryParams): Observable<TableResponse<T>> {
    console.log(
      `[BasePickerDataSource] Fetching page ${params.page} for '${this.config.id}' (server-side mode)`
    );

    // Call API method with page/size parameters
    return this.callApiMethod(params).pipe(
      tap((response) => {
        console.log(
          `[BasePickerDataSource] Received ${response.results.length} rows (total: ${response.total}) for '${this.config.id}'`
        );
      }),
      catchError((error) => {
        console.error(
          `[BasePickerDataSource] Error fetching page for '${this.config.id}':`,
          error
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Call API method dynamically based on configuration
   */
  private callApiMethod(params: TableQueryParams): Observable<TableResponse<T>> {
    const methodName = this.config.api.method;

    // Check if method exists on ApiService
    if (!(methodName in this.apiService)) {
      throw new Error(
        `[BasePickerDataSource] API method '${methodName}' not found on ApiService`
      );
    }

    // Get the method reference
    const method = (this.apiService as any)[methodName];
    if (typeof method !== 'function') {
      throw new Error(
        `[BasePickerDataSource] API method '${methodName}' is not a function`
      );
    }

    // Transform params if paramMapper provided
    const apiParams = this.config.api.paramMapper
      ? this.config.api.paramMapper(params)
      : params;

    console.log(
      `[BasePickerDataSource] Calling ApiService.${methodName}()`,
      apiParams
    );

    // Call the method and transform response
    return method.call(this.apiService, ...Object.values(apiParams)).pipe(
      map((response: any) => {
        console.log(
          `[BasePickerDataSource] Raw API response for '${this.config.id}':`,
          response
        );
        return this.config.api.responseTransformer(response);
      })
    );
  }

  /**
   * Filter, sort, and paginate data in memory (client-side mode)
   */
  private filterSortPaginate(
    data: T[],
    params: TableQueryParams
  ): TableResponse<T> {
    let filtered = [...data];

    // Apply filters
    if (params.filters && this.config.filtering) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const filterFn = this.config.filtering!.filters[key];
          if (filterFn) {
            filtered = filtered.filter((row) => filterFn(row, value));
          }
        }
      });
    }

    // Apply sorting
    if (params.sortBy && params.sortOrder && this.config.sorting) {
      const comparator = this.config.sorting.comparators[params.sortBy];
      if (comparator) {
        filtered.sort((a, b) => {
          const result = comparator(a, b);
          return params.sortOrder === 'asc' ? result : -result;
        });
      }
    }

    // Calculate pagination
    const total = filtered.length;
    const start = (params.page - 1) * params.size;
    const end = start + params.size;
    const results = filtered.slice(start, end);

    return {
      results,
      total,
      page: params.page,
      size: params.size,
      totalPages: Math.ceil(total / params.size),
    };
  }
}
