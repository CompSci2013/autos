import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Entity, EntityInstance, DomainFilters } from '../../../models/generic';
import { TableColumn, TableQueryParams } from '../../../shared/models';
import { GenericStateManagementService } from '../../../services/generic';
import { GenericDataService } from '../../../services/generic';
import { DomainConfigService } from '../../../services/generic';

/**
 * Generic Results Table Component
 *
 * Configuration-driven results table that works with any domain.
 * Adapts to domain configuration for:
 * - Column definitions and formatting
 * - Sort behavior
 * - Expandable rows for instances
 * - Pagination
 *
 * @example
 * // Vehicles domain: Shows manufacturer, model, year, etc.
 * <app-generic-results-table></app-generic-results-table>
 *
 * // Aircraft domain: Shows manufacturer, model, variant, etc.
 * // Same component, different behavior based on domain config
 */
@Component({
  selector: 'app-generic-results-table',
  templateUrl: './generic-results-table.component.html',
  styleUrls: ['./generic-results-table.component.scss']
})
export class GenericResultsTableComponent implements OnInit, OnDestroy {

  @Input() enableExpansion: boolean = true;

  // Configuration from domain
  columns: TableColumn[] = [];
  entityType: string = '';
  instanceType: string = '';
  primaryKey: string = '';

  // Data
  results: Entity[] = [];
  total: number = 0;
  loading: boolean = false;
  error: string | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 20;
  pageSizeOptions: number[] = [10, 20, 50, 100];

  // Sorting
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;

  // Expansion
  expandedRows: Set<string> = new Set();
  instancesCache: Map<string, EntityInstance[]> = new Map();
  loadingInstances: Set<string> = new Set();

  private destroy$ = new Subject<void>();

  constructor(
    private stateService: GenericStateManagementService,
    private dataService: GenericDataService,
    private domainConfig: DomainConfigService
  ) {}

  ngOnInit(): void {
    this.initializeFromConfig();
    this.subscribeToState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize component from domain configuration
   */
  private initializeFromConfig(): void {
    const config = this.domainConfig.getCurrentConfig();
    if (!config) {
      console.error('[GenericResultsTable] No domain configuration found');
      return;
    }

    // Get entity metadata
    this.entityType = config.entity.type;
    this.instanceType = config.entity.instanceType;
    this.primaryKey = config.entity.primaryKey;

    // Build columns from config
    this.columns = this.buildColumnsFromConfig(config);

    // Get pagination options
    if (config.dataSource.pagination) {
      this.pageSize = config.dataSource.pagination.defaultSize;
      this.pageSizeOptions = config.dataSource.pagination.sizeOptions || [10, 20, 50, 100];
    }

    // Get default sort
    if (config.ui.table?.defaultSort) {
      this.sortColumn = config.ui.table.defaultSort.column;
      this.sortDirection = config.ui.table.defaultSort.direction;
    }

    console.log('[GenericResultsTable] Initialized:', {
      entityType: this.entityType,
      columns: this.columns.length,
      pageSize: this.pageSize,
      defaultSort: this.sortColumn
    });
  }

  /**
   * Build table columns from domain configuration
   */
  private buildColumnsFromConfig(config: any): TableColumn[] {
    const columns: TableColumn[] = [];

    if (!config.ui.table?.columns) {
      console.warn('[GenericResultsTable] No table columns defined in config');
      return columns;
    }

    config.ui.table.columns.forEach((colConfig: any) => {
      const column: TableColumn = {
        key: colConfig.key,
        label: colConfig.label,
        width: colConfig.width || 'auto',
        sortable: colConfig.sortable !== false,
        filterable: colConfig.filterable !== false,
        hideable: colConfig.hideable !== false,
        visible: !colConfig.defaultHidden,
        formatter: this.createFormatter(colConfig.format)
      };

      columns.push(column);
    });

    return columns;
  }

  /**
   * Create formatter function based on column format configuration
   */
  private createFormatter(formatConfig: any): ((value: any, row: any) => string | number) | undefined {
    if (!formatConfig) {
      return undefined;
    }

    return (value: any, row: any) => {
      if (value === null || value === undefined) {
        return '-';
      }

      switch (formatConfig.type) {
        case 'number':
          const precision = formatConfig.options?.precision ?? 0;
          return typeof value === 'number' ? value.toFixed(precision) : value;
        case 'date':
        case 'datetime':
          const date = typeof value === 'string' ? new Date(value) : value;
          return !isNaN(date?.getTime()) ? date.toLocaleDateString() : '-';
        case 'badge':
        case 'text':
        default:
          return String(value);
      }
    };
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToState(): void {
    // Subscribe to results
    this.stateService.results$
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.results = results;
        console.log('[GenericResultsTable] Results updated:', results.length);
      });

    // Subscribe to loading state
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.loading = state.loading;
        this.error = state.error;
        this.total = state.totalResults;
      });

    // Subscribe to filters (for pagination/sort)
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.currentPage = filters.page || 1;
        this.pageSize = filters.size || 20;
        this.sortColumn = filters.sort || null;
        this.sortDirection = filters.sortDirection || null;
      });
  }

  /**
   * Handle sort change
   */
  onSort(event: { column: string; direction: 'asc' | 'desc' | null }): void {
    console.log('[GenericResultsTable] Sort changed:', event);

    this.stateService.updateFilters({
      sort: event.column,
      sortDirection: event.direction || undefined,
      page: 1 // Reset to first page on sort
    });
  }

  /**
   * Handle page change
   */
  onPageChange(page: number): void {
    console.log('[GenericResultsTable] Page changed:', page);

    this.stateService.updateFilters({ page });
  }

  /**
   * Handle page size change
   */
  onPageSizeChange(size: number): void {
    console.log('[GenericResultsTable] Page size changed:', size);

    this.stateService.updateFilters({
      size,
      page: 1 // Reset to first page on size change
    });
  }

  /**
   * Handle row expansion
   */
  onRowExpand(entity: Entity): void {
    const entityId = this.getEntityId(entity);

    if (this.expandedRows.has(entityId)) {
      // Collapse
      this.expandedRows.delete(entityId);
    } else {
      // Expand
      this.expandedRows.add(entityId);

      // Load instances if not cached
      if (!this.instancesCache.has(entityId)) {
        this.loadInstances(entity);
      }
    }
  }

  /**
   * Check if row is expanded
   */
  isRowExpanded(entity: Entity): boolean {
    const entityId = this.getEntityId(entity);
    return this.expandedRows.has(entityId);
  }

  /**
   * Load instances for entity
   */
  private loadInstances(entity: Entity): void {
    const entityId = this.getEntityId(entity);

    if (this.loadingInstances.has(entityId)) {
      return; // Already loading
    }

    this.loadingInstances.add(entityId);

    this.dataService.fetchInstances(entityId, 8)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.instancesCache.set(entityId, response.instances);
          this.loadingInstances.delete(entityId);
          console.log('[GenericResultsTable] Instances loaded:', entityId, response.instances.length);
        },
        error: err => {
          console.error('[GenericResultsTable] Error loading instances:', err);
          this.loadingInstances.delete(entityId);
        }
      });
  }

  /**
   * Get instances for entity
   */
  getInstances(entity: Entity): EntityInstance[] {
    const entityId = this.getEntityId(entity);
    return this.instancesCache.get(entityId) || [];
  }

  /**
   * Check if instances are loading
   */
  isLoadingInstances(entity: Entity): boolean {
    const entityId = this.getEntityId(entity);
    return this.loadingInstances.has(entityId);
  }

  /**
   * Get entity ID (primary key value)
   */
  private getEntityId(entity: Entity): string {
    return (entity as any)[this.primaryKey] || '';
  }

  /**
   * Get cell value for display
   */
  getCellValue(entity: Entity, column: TableColumn): any {
    return (entity as any)[column.key];
  }

  /**
   * Format cell value using column formatter if available
   */
  formatCellValue(value: any, column: TableColumn, entity: Entity): string | number {
    if (column.formatter) {
      return column.formatter(value, entity);
    }

    if (value === null || value === undefined) {
      return '-';
    }

    return String(value);
  }

  /**
   * Get visible columns
   */
  getVisibleColumns(): TableColumn[] {
    return this.columns.filter(col => col.visible !== false);
  }

  /**
   * Get column by key
   */
  getColumn(key: string): TableColumn | undefined {
    return this.columns.find(col => col.key === key);
  }

  /**
   * Refresh data
   */
  refresh(): void {
    // Trigger a new fetch with current filters
    const currentState = this.stateService.state$.getValue ? this.stateService.state$.getValue() : null;
    if (currentState) {
      this.stateService.updateFilters({ ...currentState.filters });
    }
  }
}


