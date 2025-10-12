import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { SearchFilters } from '../../models/search-filters.model';

/**
 * RouteStateService - AUTOS Version
 *
 * Handles URL query parameter synchronization
 * Adapted from Transportation Portal for Manufacturer+Model combinations
 */
@Injectable({
  providedIn: 'root',
})
export class RouteStateService {
  private queryParamsSubject = new BehaviorSubject<Params>({});
  public queryParams$ = this.queryParamsSubject.asObservable();

  constructor(private router: Router, private route: ActivatedRoute) {
    this.initQueryParamsListener();
  }

  // ========== INITIALIZATION ==========

  private initQueryParamsListener(): void {
    // Subscribe to route query params changes
    this.route.queryParams.subscribe((params) => {
      this.queryParamsSubject.next(params);
    });
  }

  // ========== READ URL PARAMS ==========

  getCurrentParams(): Params {
    return this.route.snapshot.queryParams;
  }

  getParam(key: string): string | null {
    return this.route.snapshot.queryParams[key] || null;
  }

  watchParam(key: string): Observable<string | null> {
    return this.queryParams$.pipe(
      map((params) => params[key] || null),
      distinctUntilChanged()
    );
  }

  // ========== WRITE URL PARAMS ==========

  updateParams(params: Params, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: replaceUrl,
    });
  }

  setParams(params: Params, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: '',
      replaceUrl: replaceUrl,
    });
  }

  removeParam(key: string): void {
    const current = this.getCurrentParams();
    delete current[key];
    this.setParams(current);
  }

  clearAllParams(): void {
    this.setParams({}, true);
  }

  // ========== CONVERSIONS ==========

  /**
   * Convert SearchFilters to URL params
   * Format: ?models=Ford:F-150,Ford:Mustang,Chevrolet:Corvette
   */
  filtersToParams(filters: SearchFilters): Params {
    const params: Params = {};

    // Handle manufacturer-model combinations
    if (filters.modelCombos && filters.modelCombos.length > 0) {
      params['models'] = filters.modelCombos
        .map((c) => `${c.manufacturer}:${c.model}`)
        .join(',');
    }

    // Text search
    if (filters.q) params['q'] = filters.q;

    // Year range
    if (filters.yearMin !== undefined && filters.yearMin !== null) {
      params['yearMin'] = String(filters.yearMin);
    }
    if (filters.yearMax !== undefined && filters.yearMax !== null) {
      params['yearMax'] = String(filters.yearMax);
    }

    // Body style
    if (filters.bodyStyle) params['bodyStyle'] = filters.bodyStyle;

    // Pagination
    if (filters.page) params['page'] = String(filters.page);
    if (filters.size) params['size'] = String(filters.size);

    // Sorting
    if (filters.sort) params['sort'] = filters.sort;
    if (filters.sortDirection) params['sortDirection'] = filters.sortDirection;

    return params;
  }

  /**
   * Convert URL params to SearchFilters
   * Parse: ?models=Ford:F-150,Ford:Mustang
   */
  paramsToFilters(params: Params): SearchFilters {
    const filters: SearchFilters = {};

    // Handle manufacturer-model combinations from URL
    if (params['models']) {
      const modelsArray = params['models'].split(',').map((combo: string) => {
        const [manufacturer, model] = combo.split(':');
        return { manufacturer, model };
      });
      filters.modelCombos = modelsArray;
    }

    // Text search
    if (params['q']) filters.q = params['q'];

    // Year range
    if (params['yearMin']) filters.yearMin = parseInt(params['yearMin'], 10);
    if (params['yearMax']) filters.yearMax = parseInt(params['yearMax'], 10);

    // Body style
    if (params['bodyStyle']) filters.bodyStyle = params['bodyStyle'];

    // Pagination
    if (params['page']) filters.page = parseInt(params['page'], 10);
    if (params['size']) filters.size = parseInt(params['size'], 10);

    // Sorting
    if (params['sort']) filters.sort = params['sort'];
    if (params['sortDirection']) {
      filters.sortDirection = params['sortDirection'] as 'asc' | 'desc';
    }

    return filters;
  }
}
