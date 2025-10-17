import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject, Observable, throwError } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  takeUntil,
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
    this.initializeFromUrl();
    this.watchUrlChanges();
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

    this.updateState({
      filters,
    });

    // If URL contains model selections, fetch data immediately
    if (filters.modelCombos && filters.modelCombos.length > 0) {
      console.log('🟢 Initializing from URL with models:', filters.modelCombos);
      this.fetchVehicleData().subscribe({
        next: () => console.log('🟢 Initial data loaded from URL'),
        error: (err) => console.error('🔴 Failed to load initial data:', err),
      });
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
          this.updateState({ filters });
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

    // ✅ Clean undefined values before merging (prevents accidental overwrites)
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined)
    ) as Partial<SearchFilters>;

    const newFilters = {
      ...currentFilters,
      ...cleanFilters, // Only merge defined values
    };

    // Reset to page 1 if any filter changed (except page/size)
    if (
      cleanFilters.page === undefined &&
      Object.keys(cleanFilters).some((k) => k !== 'size')
    ) {
      newFilters.page = 1;
    }

    console.log('🔵 StateManagement.updateFilters() called with:', filters);
    console.log('🔵 Cleaned filters:', cleanFilters);
    console.log('🔵 Result filters:', newFilters);

    this.updateState({ filters: newFilters });
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
  }

  /**
   * Update pagination and sync to URL
   */
  updatePage(page: number): void {
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

  // ========== CLEANUP ==========

  ngOnDestroy(): void {
    this.cancelAllRequests();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
