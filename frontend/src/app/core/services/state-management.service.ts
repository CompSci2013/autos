import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, filter } from 'rxjs/operators';
import { AppState, SearchFilters } from '../../models/search-filters.model';
import { RouteStateService } from './route-state.service';

/**
 * StateManagementService - AUTOS Version (Simplified MVP)
 *
 * Manages application state with URL as single source of truth
 * No API integration yet - just URL <-> State synchronization
 */
@Injectable({
  providedIn: 'root',
})
export class StateManagementService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // ========== PRIVATE STATE ==========
  private stateSubject = new BehaviorSubject<AppState>(
    this.getInitialState()
  );

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
    private router: Router
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

    console.log('StateManagementService initialized from URL:', filters);
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
        if (
          JSON.stringify(filters) !== JSON.stringify(currentState.filters)
        ) {
          this.updateState({ filters });
          console.log('StateManagementService: URL changed, filters updated:', filters);
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
    const newFilters = {
      ...currentFilters,
      ...filters,
    };

    // Reset to page 1 if filters changed (but not if page is being explicitly set)
    if (filters.page === undefined && filters.modelCombos !== undefined) {
      newFilters.page = 1;
    }

    console.log('StateManagementService: Updating filters:', newFilters);
    
    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // TODO: Trigger API search when backend integration is added
    // this.performSearch();
  }

  /**
   * Update pagination and sync to URL
   */
  updatePage(page: number): void {
    const currentFilters = this.stateSubject.value.filters;
    const newFilters = { ...currentFilters, page };

    this.updateState({ filters: newFilters });
    this.syncStateToUrl();

    // TODO: Trigger API search
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

    // TODO: Trigger API search
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
