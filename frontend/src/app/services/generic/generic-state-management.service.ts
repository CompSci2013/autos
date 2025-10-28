import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  takeUntil,
  take,
  filter,
  tap
} from 'rxjs/operators';
import {
  DomainFilters,
  AppState,
  Entity,
  EntityInstance,
  DataSourceQuery
} from '../../models/generic';
import { RouteStateService } from '../../core/services/route-state.service';
import { RequestCoordinatorService } from '../../core/services/request-coordinator.service';
import { GenericDataService } from './generic-data.service';
import { DomainConfigService } from './domain-config.service';

/**
 * Generic State Management Service
 *
 * Domain-agnostic state management with URL as single source of truth.
 * Works with any domain configuration by reading filter mappings from domain config.
 *
 * Key Features:
 * - URL-driven state (supports bookmarking, sharing, back/forward)
 * - Configuration-driven filter parsing
 * - Integration with GenericDataService
 * - Request deduplication via RequestCoordinatorService
 * - Pop-out window support (via BroadcastChannel)
 *
 * @example
 * // In component:
 * constructor(private stateService: GenericStateManagementService<VehicleResult>) {}
 *
 * ngOnInit() {
 *   this.stateService.results$.subscribe(results => {
 *     console.log('Results:', results);
 *   });
 *
 *   this.stateService.updateFilters({
 *     selectedItems: [{ path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }],
 *     page: 1,
 *     size: 20
 *   });
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class GenericStateManagementService<
  T extends Entity = Entity,
  I extends EntityInstance = EntityInstance
> implements OnDestroy {

  private destroy$ = new Subject<void>();

  // ========== PRIVATE STATE ==========
  private stateSubject = new BehaviorSubject<AppState<T>>(this.getInitialState());

  // ========== PUBLIC OBSERVABLES ==========
  public state$ = this.stateSubject.asObservable();

  public filters$ = this.state$.pipe(
    map(state => state.filters),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  );

  public results$ = this.state$.pipe(
    map(state => state.results),
    distinctUntilChanged()
  );

  public loading$ = this.state$.pipe(
    map(state => state.loading),
    distinctUntilChanged()
  );

  public error$ = this.state$.pipe(
    map(state => state.error),
    distinctUntilChanged()
  );

  public totalResults$ = this.state$.pipe(
    map(state => state.totalResults),
    distinctUntilChanged()
  );

  constructor(
    private routeState: RouteStateService,
    private router: Router,
    private dataService: GenericDataService<T, I>,
    private requestCoordinator: RequestCoordinatorService,
    private domainConfig: DomainConfigService
  ) {
    console.log('[GenericStateManagement] Initializing...');

    // Detect if we're in a pop-out window
    const isPopout = this.router.url.startsWith('/panel/');

    if (isPopout) {
      console.log('[GenericStateManagement] Pop-out window detected - URL watching DISABLED');
      // Pop-out windows receive initial state via BroadcastChannel, not URL
    } else {
      console.log('[GenericStateManagement] Main window detected - URL watching ENABLED');
      this.initializeFromUrl();
      this.watchUrlChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== INITIALIZATION ==========

  private getInitialState(): AppState<T> {
    return {
      filters: {
        page: 1,
        size: 20
      },
      results: [],
      loading: false,
      error: null,
      totalResults: 0
    };
  }

  /**
   * Initialize state from URL parameters
   * Parses URL using domain configuration for filter mappings
   */
  private initializeFromUrl(): void {
    const params = this.routeState.getCurrentParams();
    const filters = this.parseFiltersFromUrl(params);

    console.log('[GenericStateManagement] Initializing from URL:', filters);

    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      filters
    });

    // Auto-fetch data on initialization if we have selections
    if (this.hasActiveFilters(filters)) {
      console.log('[GenericStateManagement] Auto-fetching data on initialization');
      this.fetchData().pipe(take(1)).subscribe();
    }
  }

  /**
   * Watch for URL changes and update state
   */
  private watchUrlChanges(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const params = this.routeState.getCurrentParams();
      const filters = this.parseFiltersFromUrl(params);
      const currentState = this.stateSubject.value;

      // Only update if something actually changed
      if (JSON.stringify(filters) !== JSON.stringify(currentState.filters)) {
        console.log('[GenericStateManagement] URL changed, updating filters:', filters);
        this.updateState({ filters });

        // Trigger data fetch if we have active filters
        if (this.hasActiveFilters(filters)) {
          console.log('[GenericStateManagement] Triggering fetchData()');
          this.fetchData().subscribe();
        }
      }
    });
  }

  /**
   * Parse filters from URL parameters using domain configuration
   */
  private parseFiltersFromUrl(params: any): DomainFilters {
    const config = this.domainConfig.getCurrentConfig();
    if (!config) {
      console.warn('[GenericStateManagement] No domain config, using defaults');
      return { page: 1, size: 20 };
    }

    const filters: DomainFilters = {};

    // Parse pagination
    filters.page = parseInt(params['page'] || '1');
    const defaultSize = config.dataSource.pagination?.defaultSize || 20;
    filters.size = parseInt(params['size'] || defaultSize.toString());

    // Parse sorting
    if (params['sort']) {
      filters.sort = params['sort'];
    }
    if (params['sortDirection']) {
      filters.sortDirection = params['sortDirection'] as 'asc' | 'desc';
    }

    // Parse global search
    if (params['q']) {
      filters.q = params['q'];
    }

    // Parse selected items (hierarchical selections)
    // Format: "Ford:F-150,Chevrolet:Corvette"
    if (params['selected']) {
      filters.selectedItems = this.parseSelectedItems(params['selected']);
    }

    // Parse column filters based on domain config
    filters.columnFilters = {};
    if (config.filters.columnFilters) {
      config.filters.columnFilters.forEach(filterConfig => {
        const paramValue = params[filterConfig.key];
        if (paramValue) {
          filters.columnFilters![filterConfig.key] = paramValue;
        }
      });
    }

    // Parse range filters based on domain config
    filters.rangeFilters = {};
    if (config.filters.rangeFilters) {
      config.filters.rangeFilters.forEach(rangeConfig => {
        const minValue = params[`${rangeConfig.key}Min`];
        const maxValue = params[`${rangeConfig.key}Max`];

        if (minValue || maxValue) {
          filters.rangeFilters![rangeConfig.key] = {
            min: minValue ? (rangeConfig.type === 'number' ? parseFloat(minValue) : minValue) : undefined,
            max: maxValue ? (rangeConfig.type === 'number' ? parseFloat(maxValue) : maxValue) : undefined
          };
        }
      });
    }

    return filters;
  }

  /**
   * Parse selected items from URL parameter
   * Format: "Ford:F-150,Chevrolet:Corvette" → HierarchicalSelection[]
   */
  private parseSelectedItems(param: string): any[] {
    if (!param) return [];

    return param.split(',').map(item => {
      const path = item.split(':');
      return {
        path,
        display: path.join(' '),
        level: path.length - 1
      };
    });
  }

  /**
   * Sync current state to URL
   */
  private syncStateToUrl(): void {
    const state = this.stateSubject.value;
    const params = this.filtersToParams(state.filters);
    this.routeState.setParams(params, false);
  }

  /**
   * Convert DomainFilters to URL parameters using domain configuration
   */
  private filtersToParams(filters: DomainFilters): any {
    const config = this.domainConfig.getCurrentConfig();
    const params: any = {};

    // Pagination
    if (filters.page !== undefined) {
      params['page'] = filters.page.toString();
    }
    if (filters.size !== undefined) {
      params['size'] = filters.size.toString();
    }

    // Sorting
    if (filters.sort) {
      params['sort'] = filters.sort;
    }
    if (filters.sortDirection) {
      params['sortDirection'] = filters.sortDirection;
    }

    // Global search
    if (filters.q) {
      params['q'] = filters.q;
    }

    // Selected items
    if (filters.selectedItems && filters.selectedItems.length > 0) {
      params['selected'] = filters.selectedItems
        .map(sel => sel.path.join(':'))
        .join(',');
    }

    // Column filters
    if (filters.columnFilters) {
      Object.entries(filters.columnFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value.toString();
        }
      });
    }

    // Range filters
    if (filters.rangeFilters) {
      Object.entries(filters.rangeFilters).forEach(([key, range]) => {
        if (range.min !== undefined && range.min !== null) {
          params[`${key}Min`] = range.min.toString();
        }
        if (range.max !== undefined && range.max !== null) {
          params[`${key}Max`] = range.max.toString();
        }
      });
    }

    return params;
  }

  /**
   * Check if filters have any active selections
   */
  private hasActiveFilters(filters: DomainFilters): boolean {
    return !!(
      filters.selectedItems?.length ||
      Object.keys(filters.columnFilters || {}).length ||
      Object.keys(filters.rangeFilters || {}).length ||
      filters.q
    );
  }

  /**
   * Update internal state
   */
  private updateState(updates: Partial<AppState<T>>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, ...updates });
  }

  // ========== PUBLIC METHODS ==========

  /**
   * Update filters and sync to URL
   * This is the main method called by components
   */
  updateFilters(filters: Partial<DomainFilters>): void {
    const currentFilters = this.stateSubject.value.filters;

    // Separate undefined values (to be removed) from defined values
    const filtersToRemove: string[] = [];
    const filtersToSet: Partial<DomainFilters> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined) {
        filtersToRemove.push(key);
      } else {
        (filtersToSet as any)[key] = value;
      }
    });

    // Start with current filters
    const newFilters = { ...currentFilters };

    // Remove filters that are explicitly set to undefined
    filtersToRemove.forEach(key => {
      delete (newFilters as any)[key];
    });

    // Merge in the new defined values
    Object.assign(newFilters, filtersToSet);

    // Reset to page 1 if any filter changed (except page/size)
    const nonPaginationKeys = Object.keys(filters).filter(k => k !== 'page' && k !== 'size');
    if (nonPaginationKeys.length > 0 && filters.page === undefined) {
      newFilters.page = 1;
    }

    console.log('[GenericStateManagement] updateFilters() called with:', filters);
    console.log('[GenericStateManagement] Result filters:', newFilters);

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // Trigger API search if we have active filters
    if (this.hasActiveFilters(newFilters)) {
      console.log('[GenericStateManagement] Triggering fetchData()');
      this.fetchData().subscribe();
    } else {
      console.log('[GenericStateManagement] No active filters, clearing results');
      this.updateState({
        results: [],
        totalResults: 0,
        error: null
      });
    }
  }

  /**
   * Update pagination
   */
  updatePage(page: number): void {
    this.updateFilters({ page });
  }

  /**
   * Update sorting
   */
  updateSort(sort: string, sortDirection: 'asc' | 'desc'): void {
    this.updateFilters({ sort, sortDirection });
  }

  /**
   * Update page size
   */
  updatePageSize(size: number): void {
    this.updateFilters({ size, page: 1 });
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    const emptyFilters: DomainFilters = {
      page: 1,
      size: 20
    };

    this.updateState({
      filters: emptyFilters,
      results: [],
      totalResults: 0,
      error: null
    });
    this.syncStateToUrl();
  }

  /**
   * Get current filters (synchronous)
   */
  getCurrentFilters(): DomainFilters {
    return this.stateSubject.value.filters;
  }

  /**
   * Get current state (synchronous)
   */
  getCurrentState(): AppState<T> {
    return this.stateSubject.value;
  }

  /**
   * Fetch data from API using current filters
   */
  private fetchData(): Observable<void> {
    const currentState = this.stateSubject.value;

    // Set loading state
    this.updateState({
      loading: true,
      error: null
    });

    // Build query
    const query: DataSourceQuery = {
      filters: currentState.filters
    };

    // Use request coordinator for deduplication and caching
    const cacheKey = this.buildCacheKey(query);

    return this.requestCoordinator.execute(
      cacheKey,
      () => this.dataService.fetch(query)
    ).pipe(
      tap(response => {
        console.log('[GenericStateManagement] Data fetched:', response);
        this.updateState({
          results: response.results,
          totalResults: response.total,
          loading: false,
          error: null,
          metadata: response.metadata
        });
      }),
      map(() => void 0),
      // Error handling
      tap({
        error: err => {
          console.error('[GenericStateManagement] Fetch error:', err);
          this.updateState({
            loading: false,
            error: err.message || 'Failed to fetch data'
          });
        }
      })
    );
  }

  /**
   * Build cache key for request coordinator
   */
  private buildCacheKey(query: DataSourceQuery): string {
    return `generic-data-${JSON.stringify(query)}`;
  }

  /**
   * Force refresh (bypass cache)
   */
  refresh(): void {
    this.dataService.clearCache();
    this.requestCoordinator.clearCache();
    if (this.hasActiveFilters(this.getCurrentFilters())) {
      this.fetchData().subscribe();
    }
  }
}
