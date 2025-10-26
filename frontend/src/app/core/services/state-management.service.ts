import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject, Observable, throwError } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  takeUntil,
  take,
  filter,
  tap,
  catchError,
} from 'rxjs/operators';
import { AppState, SearchFilters } from '../../models/search-filters.model';
import { RouteStateService } from './route-state.service';
import {
  RequestCoordinatorService,
  RequestState,
} from './request-coordinator.service';
import { ApiService } from '../../services/api.service';
import {
  VehicleDetailsResponse,
  ManufacturerModelSelection,
} from '../../models';

/**
 * StateManagementService - AUTOS Version
 *
 * Manages application state with URL as single source of truth
 * Now includes API integration with request coordination
 */
@Injectable({
  providedIn: 'root',
})
export class StateManagementService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private isPopoutWindow = false;

  // ========== PRIVATE STATE ==========
  private stateSubject = new BehaviorSubject<AppState>(this.getInitialState());

  // ========== PUBLIC OBSERVABLES ==========
  public state$ = this.stateSubject.asObservable();

  public filters$ = this.state$.pipe(
    map((state) => state.filters),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  );

  public results$ = this.state$.pipe(
    map((state) => state.results),
    distinctUntilChanged()
  );

  public loading$ = this.state$.pipe(
    map((state) => state.loading),
    distinctUntilChanged()
  );

  public error$ = this.state$.pipe(
    map((state) => state.error),
    distinctUntilChanged()
  );

  public totalResults$ = this.state$.pipe(
    map((state) => state.totalResults),
    distinctUntilChanged()
  );

  constructor(
    private routeState: RouteStateService,
    private router: Router,
    private apiService: ApiService,
    private requestCoordinator: RequestCoordinatorService
  ) {
    // Detect if we're in a pop-out window
    this.isPopoutWindow = this.router.url.startsWith('/panel/');

    if (this.isPopoutWindow) {
      console.log('[StateManagement] Pop-out window detected - URL watching DISABLED, API calls DISABLED');
      // Pop-out windows receive state via BroadcastChannel, not URL
      // Do not initialize from URL or watch URL changes
      // Do not make API calls
    } else {
      console.log('[StateManagement] Main window detected - URL watching ENABLED');
      this.initializeFromUrl();
      this.watchUrlChanges();
    }
  }

  // ========== INITIALIZATION ==========

  private getInitialState(): AppState {
    return {
      filters: {
        page: 1,
        size: 20,
      },
      results: [],
      loading: false,
      error: null,
      totalResults: 0,
    };
  }

  private initializeFromUrl(): void {
    const params = this.routeState.getCurrentParams();
    const filters = this.routeState.paramsToFilters(params);

    console.log('[StateManagement] Initializing from URL:', filters);

    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      filters,
    });

    // NEW: Auto-fetch data on initialization if we have model selections
    if (filters.modelCombos && filters.modelCombos.length > 0) {
      console.log('[StateManagement] Auto-fetching data on initialization');
      this.fetchVehicleData().pipe(take(1)).subscribe();
    }
  }

  private watchUrlChanges(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const params = this.routeState.getCurrentParams();
        const filters = this.routeState.paramsToFilters(params);
        const currentState = this.stateSubject.value;

        // Only update if something actually changed
        if (JSON.stringify(filters) !== JSON.stringify(currentState.filters)) {
          console.log(
            '🟡 watchUrlChanges: URL changed, updating filters:',
            filters
          );
          this.updateState({ filters });

          // NEW: Trigger data fetch if we have model selections
          if (filters.modelCombos && filters.modelCombos.length > 0) {
            console.log('🟡 watchUrlChanges: Triggering fetchVehicleData()');
            this.fetchVehicleData().subscribe({
              next: () => console.log('🟢 watchUrlChanges: Data fetched'),
              error: (err) =>
                console.error('🔴 watchUrlChanges: Fetch failed:', err),
            });
          }
        }
      });
  }

  private updateState(updates: Partial<AppState>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, ...updates });
  }

  private syncStateToUrl(): void {
    const state = this.stateSubject.value;
    const params = this.routeState.filtersToParams(state.filters);
    this.routeState.setParams(params, false);
  }

  // ========== PUBLIC METHODS ==========

  /**
   * Update filters and sync to URL
   * This is called by parent component when picker emits selections
   */
  updateFilters(filters: Partial<SearchFilters>): void {
    const currentFilters = this.stateSubject.value.filters;

    // Separate undefined values (to be removed) from defined values
    const filtersToRemove: string[] = [];
    const filtersToSet: Partial<SearchFilters> = {};

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
    filtersToRemove.forEach((key) => {
      delete newFilters[key as keyof SearchFilters];
    });

    // Merge in the new defined values
    Object.assign(newFilters, filtersToSet);

    // Reset to page 1 if any filter changed (except page/size)
    const nonPaginationKeys = Object.keys(filters).filter(
      (k) => k !== 'page' && k !== 'size'
    );
    if (nonPaginationKeys.length > 0 && filters.page === undefined) {
      newFilters.page = 1;
    }

    console.log('🔵 StateManagement.updateFilters() called with:', filters);
    console.log('🔵 Filters to remove:', filtersToRemove);
    console.log('🔵 Filters to set:', filtersToSet);
    console.log('🔵 Result filters:', newFilters);

    this.updateState({ filters: newFilters });

    if (!this.isPopoutWindow) {
      this.syncStateToUrl();

      // Trigger API search if we have model selections
      if (newFilters.modelCombos && newFilters.modelCombos.length > 0) {
        console.log('🔵 Triggering fetchVehicleData()');
        this.fetchVehicleData().subscribe({
          next: () => console.log('🟢 Data fetched successfully'),
          error: (err) => console.error('🔴 Fetch failed:', err),
        });
      } else {
        console.log('🔵 No models selected, clearing results');
        this.updateState({
          results: [],
          totalResults: 0,
          error: null,
        });
      }
    } else {
      console.log('[StateManagement] Pop-out window: Ignoring state update (read-only)');
    }
  }
  /**
   * Update pagination and sync to URL
   */
  updatePage(page: number): void {
    if (this.isPopoutWindow) {
      console.log('[StateManagement] Pop-out window: Ignoring updatePage (read-only)');
      return;
    }

    const currentFilters = this.stateSubject.value.filters;
    const newFilters = { ...currentFilters, page };

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // Trigger API search
    if (newFilters.modelCombos && newFilters.modelCombos.length > 0) {
      this.fetchVehicleData().subscribe();
    }
  }

  /**
   * Update sorting and sync to URL
   */
  updateSort(sort: string, sortDirection: 'asc' | 'desc'): void {
    if (this.isPopoutWindow) {
      console.log('[StateManagement] Pop-out window: Ignoring updateSort (read-only)');
      return;
    }

    const currentFilters = this.stateSubject.value.filters;
    const newFilters = {
      ...currentFilters,
      sort,
      sortDirection,
      page: 1, // Reset to page 1 when sort changes
    };

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // Trigger API search
    if (newFilters.modelCombos && newFilters.modelCombos.length > 0) {
      this.fetchVehicleData().subscribe();
    }
  }

  /**
   * Reset all filters and clear URL
   */
  resetFilters(): void {
    const initialFilters: SearchFilters = {
      page: 1,
      size: 20,
    };

    this.updateState({
      filters: initialFilters,
      results: [],
      error: null,
      totalResults: 0,
    });

    this.syncStateToUrl();
  }

  /**
   * Get current filter state (synchronous)
   */
  getCurrentFilters(): SearchFilters {
    return this.stateSubject.value.filters;
  }

  // ========== NEW: API INTEGRATION WITH REQUEST COORDINATION ==========

  /**
   * Fetch vehicle data with request coordination
   * Uses RequestCoordinatorService for deduplication, caching, and retry
   */
  fetchVehicleData(): Observable<VehicleDetailsResponse> {
    const filters = this.getCurrentFilters();

    // Don't make API call if no models selected
    if (!filters.modelCombos || filters.modelCombos.length === 0) {
      return throwError(() => new Error('No models selected'));
    }

    // Build unique cache key from filters
    const cacheKey = this.buildCacheKey('vehicle-details', filters);

    // Execute through coordinator
    return this.requestCoordinator
      .execute(
        cacheKey,
        () =>
          this.apiService.getVehicleDetails(
            this.buildModelsParam(filters.modelCombos),
            filters.page || 1,
            filters.size || 20,
            this.buildFilterParams(filters),
            filters.sort,
            filters.sortDirection
          ),
        {
          cacheTime: 30000, // Cache for 30 seconds
          deduplication: true, // Deduplicate identical requests
          retryAttempts: 2, // Retry twice on failure
          retryDelay: 1000, // Start with 1s delay
        }
      )
      .pipe(
        tap((response) => {
          // Update state on success
          this.updateState({
            results: response.results,
            totalResults: response.total,
            loading: false,
            error: null,
          });
        }),
        catchError((error) => {
          // Update state on error
          this.updateState({
            results: [],
            totalResults: 0,
            loading: false,
            error: this.formatError(error),
          });
          console.error(
            'StateManagementService: Failed to load vehicle data:',
            error
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get loading state for vehicle data
   * Returns observable of loading state for the current filters
   */
  getVehicleDataLoadingState$(): Observable<RequestState> {
    const filters = this.getCurrentFilters();
    const cacheKey = this.buildCacheKey('vehicle-details', filters);
    return this.requestCoordinator.getLoadingState$(cacheKey);
  }

  /**
   * Get global loading state (any request loading)
   * Returns true if ANY request is currently in progress
   */
  getGlobalLoadingState$(): Observable<boolean> {
    return this.requestCoordinator.getGlobalLoading$();
  }

  /**
   * Cancel all active requests
   * Useful for cleanup on navigation or component destroy
   */
  cancelAllRequests(): void {
    this.requestCoordinator.cancelAll();
  }

  /**
   * Clear response cache
   * Can clear specific key or all cached responses
   */
  clearCache(key?: string): void {
    this.requestCoordinator.clearCache(key);
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Build unique cache key from filter state
   * Creates deterministic key for request deduplication and caching
   */
  private buildCacheKey(prefix: string, filters: SearchFilters): string {
    // Create deterministic key from filters
    const filterString = JSON.stringify({
      modelCombos: filters.modelCombos?.sort((a, b) =>
        `${a.manufacturer}:${a.model}`.localeCompare(
          `${b.manufacturer}:${b.model}`
        )
      ),
      page: filters.page,
      size: filters.size,
      sort: filters.sort,
      sortDirection: filters.sortDirection,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      bodyStyle: filters.bodyStyle,
      q: filters.q,
      // ✅ ADD MISSING COLUMN FILTERS:
      manufacturer: filters.manufacturer,
      model: filters.model,
      bodyClass: filters.bodyClass,
      dataSource: filters.dataSource,
    });

    // Use base64 encoding for URL-safe key
    return `${prefix}:${btoa(filterString)}`;
  }

  /**
   * Build models parameter string for API
   * Format: "Ford:F-150,Ford:Mustang,Chevrolet:Corvette"
   */
  private buildModelsParam(modelCombos?: ManufacturerModelSelection[]): string {
    if (!modelCombos || modelCombos.length === 0) {
      return '';
    }
    return modelCombos.map((c) => `${c.manufacturer}:${c.model}`).join(',');
  }

  /**
   * Build filter parameters object for API
   * Extracts relevant filter fields for backend
   */
  private buildFilterParams(filters: SearchFilters): any {
    const params: any = {};

    // Column filters
    if (filters.manufacturer) {
      params.manufacturer = filters.manufacturer;
    }
    if (filters.model) {
      params.model = filters.model;
    }
    if (filters.bodyClass) {
      params.bodyClass = filters.bodyClass;
    }
    if (filters.dataSource) {
      params.dataSource = filters.dataSource;
    }

    // Year range filters
    if (filters.yearMin !== undefined && filters.yearMin !== null) {
      params.yearMin = filters.yearMin;
    }
    if (filters.yearMax !== undefined && filters.yearMax !== null) {
      params.yearMax = filters.yearMax;
    }

    // Legacy/other filters
    if (filters.bodyStyle) {
      params.bodyStyle = filters.bodyStyle;
    }
    if (filters.q) {
      params.q = filters.q;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  /**
   * Format error message for display
   * Converts technical errors to user-friendly messages
   */
  private formatError(error: any): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }
    if (error.status === 404) {
      return 'No vehicles found matching your criteria.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  // ========== POP-OUT SUPPORT ==========

  /**
   * Get current state snapshot
   * Used by pop-out service to send initial state to new pop-outs
   */
  public getCurrentState(): AppState {
    return this.stateSubject.value;
  }

  /**
   * Directly update state without making API calls
   * Used by pop-out windows to sync state from main window
   */
  public syncStateFromExternal(state: Partial<AppState>): void {
    const currentState = this.stateSubject.value;
    const newState = {
      ...currentState,
      ...state
    };
    console.log('[StateManagement] syncStateFromExternal:', {
      currentResults: currentState.results?.length,
      newResults: newState.results?.length,
      currentFilters: currentState.filters,
      newFilters: newState.filters
    });
    this.stateSubject.next(newState);
  }

  // ========== CLEANUP ==========

  ngOnDestroy(): void {
    this.cancelAllRequests();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
