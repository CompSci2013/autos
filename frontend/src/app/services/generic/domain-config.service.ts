import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import {
  DomainConfig,
  validateDomainConfig,
  getFilterConfig,
  getTableColumnConfig
} from '../../models/generic/domain-config.interface';

/**
 * Domain Configuration Service
 *
 * Loads and manages domain configurations from JSON files.
 * Provides the current active domain configuration to the application.
 *
 * Responsibilities:
 * - Load domain configuration JSON files from /assets/config/domains/
 * - Validate configurations against schema
 * - Provide current active domain configuration
 * - Support domain switching (future)
 * - Cache loaded configurations
 *
 * @example
 * // In component:
 * constructor(private domainConfig: DomainConfigService) {}
 *
 * ngOnInit() {
 *   this.domainConfig.currentConfig$.subscribe(config => {
 *     console.log('Active domain:', config.domain.name);
 *     this.columns = config.ui.table.columns;
 *   });
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class DomainConfigService {
  /**
   * Current active domain configuration
   * Components subscribe to this to get domain config
   */
  private currentConfigSubject = new BehaviorSubject<DomainConfig | null>(null);
  public currentConfig$ = this.currentConfigSubject.asObservable();

  /**
   * Cache of loaded domain configurations
   * Key: domain ID, Value: configuration
   */
  private configCache = new Map<string, DomainConfig>();

  /**
   * Currently active domain ID
   */
  private activeDomainId: string = 'transport'; // Default domain

  /**
   * Configuration file path template
   */
  private configBasePath = 'assets/config/domains';

  constructor(private http: HttpClient) {}

  /**
   * Initialize service by loading the default domain
   * Call this in AppComponent.ngOnInit()
   *
   * @param domainId Domain ID to load (default: 'transport')
   * @returns Observable of the loaded configuration
   */
  initialize(domainId: string = 'transport'): Observable<DomainConfig> {
    console.log(`[DomainConfigService] Initializing with domain: ${domainId}`);
    return this.loadDomain(domainId);
  }

  /**
   * Load a domain configuration
   *
   * @param domainId Domain identifier (e.g., 'vehicles', 'aircraft')
   * @returns Observable of the loaded configuration
   */
  loadDomain(domainId: string): Observable<DomainConfig> {
    // Check cache first
    const cached = this.configCache.get(domainId);
    if (cached) {
      console.log(`[DomainConfigService] Using cached config for: ${domainId}`);
      this.activeDomainId = domainId;
      this.currentConfigSubject.next(cached);
      return of(cached);
    }

    // Load from file
    const configPath = `${this.configBasePath}/${domainId}.domain.json`;
    console.log(`[DomainConfigService] Loading config from: ${configPath}`);

    return this.http.get<DomainConfig>(configPath).pipe(
      tap(config => {
        console.log(`[DomainConfigService] Loaded config:`, config.domain);

        // Validate configuration
        const errors = validateDomainConfig(config);
        if (errors.length > 0) {
          console.error(`[DomainConfigService] Configuration validation errors:`, errors);
          throw new Error(`Invalid domain configuration: ${errors.join(', ')}`);
        }

        // Cache and activate
        this.configCache.set(domainId, config);
        this.activeDomainId = domainId;
        this.currentConfigSubject.next(config);
      }),
      catchError(error => {
        console.error(`[DomainConfigService] Failed to load domain config: ${domainId}`, error);
        return throwError(() => new Error(`Failed to load domain configuration: ${domainId}`));
      }),
      shareReplay(1) // Share result among multiple subscribers
    );
  }

  /**
   * Switch to a different domain
   * Loads the new domain configuration and updates current config
   *
   * @param domainId Domain identifier to switch to
   * @returns Observable of the new configuration
   */
  switchDomain(domainId: string): Observable<DomainConfig> {
    console.log(`[DomainConfigService] Switching domain from ${this.activeDomainId} to ${domainId}`);
    return this.loadDomain(domainId);
  }

  /**
   * Get current active configuration (synchronous)
   *
   * @returns Current domain configuration or null if not loaded
   */
  getCurrentConfig(): DomainConfig | null {
    return this.currentConfigSubject.value;
  }

  /**
   * Get current active domain ID
   *
   * @returns Active domain identifier
   */
  getActiveDomainId(): string {
    return this.activeDomainId;
  }

  /**
   * Check if a domain is loaded and cached
   *
   * @param domainId Domain identifier
   * @returns True if domain is cached
   */
  isDomainCached(domainId: string): boolean {
    return this.configCache.has(domainId);
  }

  /**
   * Clear configuration cache
   * Useful for development/testing
   */
  clearCache(): void {
    console.log('[DomainConfigService] Clearing configuration cache');
    this.configCache.clear();
  }

  /**
   * Preload multiple domain configurations
   * Useful for faster domain switching
   *
   * @param domainIds Array of domain identifiers to preload
   * @returns Observable that completes when all domains are loaded
   */
  preloadDomains(domainIds: string[]): Observable<DomainConfig[]> {
    console.log('[DomainConfigService] Preloading domains:', domainIds);

    const loads = domainIds.map(id =>
      this.isDomainCached(id)
        ? of(this.configCache.get(id)!)
        : this.loadDomain(id)
    );

    return of(loads).pipe(
      map(observables => observables as unknown as DomainConfig[])
    );
  }

  // ========== Convenience Methods ==========
  // These methods provide quick access to specific parts of the configuration

  /**
   * Get filter configuration by key
   */
  getFilterConfig(filterKey: string): any {
    const config = this.getCurrentConfig();
    if (!config) return undefined;
    return getFilterConfig(config, filterKey);
  }

  /**
   * Get table column configuration by key
   */
  getTableColumnConfig(columnKey: string): any {
    const config = this.getCurrentConfig();
    if (!config) return undefined;
    return getTableColumnConfig(config, columnKey);
  }

  /**
   * Get entity schema
   */
  getEntitySchema(): any {
    const config = this.getCurrentConfig();
    return config?.entity;
  }

  /**
   * Get data source configuration
   */
  getDataSourceConfig(): any {
    const config = this.getCurrentConfig();
    return config?.dataSource;
  }

  /**
   * Get picker configuration
   */
  getPickerConfig(): any {
    const config = this.getCurrentConfig();
    return config?.picker;
  }

  /**
   * Get UI configuration
   */
  getUIConfig(): any {
    const config = this.getCurrentConfig();
    return config?.ui;
  }

  /**
   * Get all available hierarchies
   */
  getHierarchies(): any[] {
    const config = this.getCurrentConfig();
    return config?.entity.hierarchies || [];
  }

  /**
   * Get hierarchy by ID
   */
  getHierarchy(hierarchyId: string): any {
    const hierarchies = this.getHierarchies();
    return hierarchies.find(h => h.id === hierarchyId);
  }

  /**
   * Get all table columns
   */
  getTableColumns(): any[] {
    const config = this.getCurrentConfig();
    return config?.ui.table.columns || [];
  }

  /**
   * Get all filters configuration
   */
  getFiltersConfig(): any {
    const config = this.getCurrentConfig();
    return config?.filters;
  }

  /**
   * Get pagination configuration
   */
  getPaginationConfig(): any {
    const config = this.getCurrentConfig();
    return config?.dataSource.pagination;
  }

  /**
   * Get domain metadata
   */
  getDomainMetadata(): any {
    const config = this.getCurrentConfig();
    return config?.domain;
  }
}
