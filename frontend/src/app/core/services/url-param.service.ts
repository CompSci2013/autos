import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * URL Parameter Service
 *
 * Lightweight service for managing URL query parameters without triggering
 * state management side effects (e.g., API calls, state updates).
 *
 * Use Cases:
 * - Picker components that need URL persistence for selections
 * - UI components that store preferences in URL
 * - Any component needing bookmarkable/shareable state via URL
 *
 * Advantages over StateManagementService:
 * - No coupling to vehicle search state
 * - No automatic API calls on parameter updates
 * - Type-safe (no 'as any' required)
 * - Reusable across any component
 *
 * @example
 * // Update single parameter
 * urlParamService.updateParam('selectedVins', 'VIN1,VIN2,VIN3');
 *
 * @example
 * // Update multiple parameters
 * urlParamService.updateParams({
 *   selectedVins: 'VIN1,VIN2',
 *   pickerMode: 'multi'
 * });
 *
 * @example
 * // Get parameter value
 * const vins = urlParamService.getParam('selectedVins');
 *
 * @example
 * // Remove parameter
 * urlParamService.removeParam('selectedVins');
 *
 * @example
 * // Watch parameter changes
 * urlParamService.watchParam('selectedVins').subscribe(value => {
 *   console.log('selectedVins changed:', value);
 * });
 */
@Injectable({
  providedIn: 'root',
})
export class UrlParamService {
  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  /**
   * Update a single URL query parameter
   *
   * @param key - Parameter name
   * @param value - Parameter value (undefined to remove)
   * @param extras - Optional navigation extras (e.g., replaceUrl)
   * @returns Promise that resolves when navigation completes
   *
   * @example
   * // Add/update parameter
   * urlParamService.updateParam('tab', 'details');
   *
   * @example
   * // Remove parameter
   * urlParamService.updateParam('tab', undefined);
   *
   * @example
   * // Replace URL without adding to history
   * urlParamService.updateParam('tab', 'details', { replaceUrl: true });
   */
  updateParam(
    key: string,
    value: string | number | boolean | undefined,
    extras?: NavigationExtras
  ): Promise<boolean> {
    const queryParams: any = { [key]: value };

    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge', // Preserve existing params
      ...extras,
    });
  }

  /**
   * Update multiple URL query parameters at once
   *
   * @param params - Object with parameter key-value pairs
   * @param extras - Optional navigation extras
   * @returns Promise that resolves when navigation completes
   *
   * @example
   * urlParamService.updateParams({
   *   page: 2,
   *   size: 50,
   *   sort: 'name'
   * });
   *
   * @example
   * // Remove multiple parameters
   * urlParamService.updateParams({
   *   filter1: undefined,
   *   filter2: undefined
   * });
   */
  updateParams(
    params: Record<string, string | number | boolean | undefined>,
    extras?: NavigationExtras
  ): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      ...extras,
    });
  }

  /**
   * Get current value of a URL query parameter
   *
   * @param key - Parameter name
   * @returns Parameter value or null if not present
   *
   * @example
   * const page = urlParamService.getParam('page'); // Returns '1' or null
   */
  getParam(key: string): string | null {
    return this.route.snapshot.queryParamMap.get(key);
  }

  /**
   * Get current value of a URL query parameter as a specific type
   *
   * @param key - Parameter name
   * @param defaultValue - Default value if parameter not present
   * @returns Typed parameter value
   *
   * @example
   * const page = urlParamService.getParamAsNumber('page', 1); // Returns number
   * const enabled = urlParamService.getParamAsBoolean('enabled', false);
   */
  getParamAsNumber(key: string, defaultValue: number): number {
    const value = this.getParam(key);
    if (value === null) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  getParamAsBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.getParam(key);
    if (value === null) return defaultValue;
    return value === 'true' || value === '1';
  }

  /**
   * Get all current URL query parameters
   *
   * @returns Object with all query parameters
   *
   * @example
   * const allParams = urlParamService.getAllParams();
   * // Returns { page: '1', size: '20', sort: 'name' }
   */
  getAllParams(): Record<string, string> {
    const params: Record<string, string> = {};
    this.route.snapshot.queryParamMap.keys.forEach((key) => {
      const value = this.route.snapshot.queryParamMap.get(key);
      if (value !== null) {
        params[key] = value;
      }
    });
    return params;
  }

  /**
   * Remove a URL query parameter
   *
   * @param key - Parameter name to remove
   * @param extras - Optional navigation extras
   * @returns Promise that resolves when navigation completes
   *
   * @example
   * urlParamService.removeParam('filter');
   */
  removeParam(key: string, extras?: NavigationExtras): Promise<boolean> {
    return this.updateParam(key, undefined, extras);
  }

  /**
   * Remove multiple URL query parameters at once
   *
   * @param keys - Array of parameter names to remove
   * @param extras - Optional navigation extras
   * @returns Promise that resolves when navigation completes
   *
   * @example
   * urlParamService.removeParams(['filter1', 'filter2', 'sort']);
   */
  removeParams(keys: string[], extras?: NavigationExtras): Promise<boolean> {
    const params: Record<string, undefined> = {};
    keys.forEach((key) => {
      params[key] = undefined;
    });
    return this.updateParams(params, extras);
  }

  /**
   * Clear all URL query parameters
   *
   * @param extras - Optional navigation extras
   * @returns Promise that resolves when navigation completes
   *
   * @example
   * urlParamService.clearAllParams();
   */
  clearAllParams(extras?: NavigationExtras): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      ...extras,
    });
  }

  /**
   * Watch for changes to a specific URL query parameter
   *
   * @param key - Parameter name to watch
   * @returns Observable that emits when parameter changes
   *
   * @example
   * urlParamService.watchParam('page').subscribe(page => {
   *   console.log('Page changed to:', page);
   * });
   */
  watchParam(key: string): Observable<string | null> {
    return this.route.queryParamMap.pipe(
      map((params) => params.get(key))
    );
  }

  /**
   * Watch for changes to multiple URL query parameters
   *
   * @param keys - Array of parameter names to watch
   * @returns Observable that emits object with parameter values when any change
   *
   * @example
   * urlParamService.watchParams(['page', 'size']).subscribe(params => {
   *   console.log('Pagination changed:', params);
   * });
   */
  watchParams(keys: string[]): Observable<Record<string, string | null>> {
    return this.route.queryParamMap.pipe(
      map((paramMap) => {
        const result: Record<string, string | null> = {};
        keys.forEach((key) => {
          result[key] = paramMap.get(key);
        });
        return result;
      })
    );
  }

  /**
   * Check if a URL query parameter exists
   *
   * @param key - Parameter name
   * @returns True if parameter exists in URL
   *
   * @example
   * if (urlParamService.hasParam('debug')) {
   *   console.log('Debug mode enabled');
   * }
   */
  hasParam(key: string): boolean {
    return this.route.snapshot.queryParamMap.has(key);
  }

  /**
   * Set multiple parameters and clear all others
   *
   * @param params - New parameters to set
   * @param extras - Optional navigation extras
   * @returns Promise that resolves when navigation completes
   *
   * @example
   * // Replace all URL params with new ones
   * urlParamService.setParams({ page: 1, filter: 'active' });
   */
  setParams(
    params: Record<string, string | number | boolean | undefined>,
    extras?: NavigationExtras
  ): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      // Don't merge - replace all params
      ...extras,
    });
  }
}
