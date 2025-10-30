import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { StateManagementService } from '../../../core/services/state-management.service';
import { ApiService } from '../../../services/api.service';
import { VehicleResult, VehicleInstance, SearchFilters } from '../../../models';
import { TableColumn, TableQueryParams } from '../../../shared/models';
import { VehicleDataSourceAdapter } from './vehicle-data-source.adapter';

/**
 * Results-Table Component
 *
 * Displays vehicle search results with pagination, sorting, and row expansion.
 * Uses BaseDataTableComponent for consistent table behavior.
 *
 * STATE OWNERSHIP (Angular Best Practice - Single Responsibility):
 * ----------------------------------------------------------------
 * This component READS filter state but NEVER WRITES it.
 * Only Query Control component writes filter state.
 *
 * Writes (owns):
 *   - page: Current page number
 *   - size: Results per page
 *   - sort: Sort column
 *   - sortDirection: Sort order (asc/desc)
 *
 * Reads (does not own):
 *   - manufacturer: Filter by manufacturer (Query Control)
 *   - model: Filter by model (Query Control)
 *   - yearMin/yearMax: Year range filter (Query Control)
 *   - bodyClass: Body class filter (Query Control)
 *   - dataSource: Data source filter (Query Control)
 *   - modelCombos: Selected manufacturer-model pairs (Picker)
 *
 * This clear separation prevents state conflicts and follows the
 * Single Responsibility Principle.
 */
@Component({
  selector: 'app-results-table',
  templateUrl: './results-table.component.html',
  styleUrls: ['./results-table.component.scss'],
})
export class ResultsTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Column configuration (matches VehicleResultsTableComponent)
  columns: TableColumn<VehicleResult>[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'model',
      label: 'Model',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'year',
      label: 'Year',
      width: '120px',
      sortable: true,
      filterable: true,
      filterType: 'number',
      hideable: true,
    },
    {
      key: 'body_class',
      label: 'Body Class',
      width: '150px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'data_source',
      label: 'Data Source',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
    },
    {
      key: 'vehicle_id',
      label: 'Vehicle ID',
      width: 'auto',
      sortable: true,
      filterable: false,
      hideable: true,
    },
  ];

  // Data source adapter
  dataSource: VehicleDataSourceAdapter;

  // Query params for BaseDataTable (non-optional, with default)
  tableQueryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  // Row expansion state
  expandedRowInstances = new Map<string, VehicleInstance[]>();
  loadingInstances = new Set<string>();

  constructor(
    private stateService: StateManagementService,
    private apiService: ApiService
  ) {
    // Initialize data source adapter
    this.dataSource = new VehicleDataSourceAdapter(this.apiService);
  }

  ngOnInit(): void {
    // Subscribe to state changes (from URL)
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('ResultsTable: Filters updated from URL:', filters);

        // Convert SearchFilters → TableQueryParams
        this.tableQueryParams = this.convertToTableParams(filters);

        // Update data source with new models
        if (filters.modelCombos && filters.modelCombos.length > 0) {
          const modelsParam = filters.modelCombos
            .map((c) => `${c.manufacturer}:${c.model}`)
            .join(',');
          this.dataSource.updateModels(modelsParam);
        } else {
          this.dataSource.updateModels('');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Convert SearchFilters (app-level) to TableQueryParams (component-level)
   */
  private convertToTableParams(filters: SearchFilters): TableQueryParams {
    return {
      page: filters.page || 1,
      size: filters.size || 20,
      sortBy: filters.sort,
      sortOrder: filters.sortDirection,
      filters: {
        manufacturer: filters.manufacturer,
        model: filters.model,
        yearMin: filters.yearMin,
        yearMax: filters.yearMax,
        bodyClass: filters.bodyClass,
        dataSource: filters.dataSource,
        // Include modelCombos to trigger change detection in BaseDataTable
        _modelCombos: filters.modelCombos?.map(c => `${c.manufacturer}:${c.model}`).join(',') || '',
      },
    };
  }

  /**
   * Handle table query changes (user interactions)
   *
   * IMPORTANT: Results table only manages pagination and sort state.
   * Filter state is owned exclusively by Query Control component.
   * This follows Angular best practices for state ownership and single responsibility.
   *
   * State Ownership:
   * - Results Table: page, size, sort, sortDirection
   * - Query Control: manufacturer, model, year, bodyClass, dataSource
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('ResultsTable: Table query changed (pagination/sort only):', params);

    // Only update pagination and sort - never filters
    // Filters are owned by Query Control and read-only for this component
    this.stateService.updateFilters({
      page: params.page,
      size: params.size,
      sort: params.sortBy || undefined,
      sortDirection: params.sortOrder || undefined,
      // Explicitly do NOT update filter properties here
      // Query Control is the sole owner of filter state
    });
  }

  /**
   * Handle row expansion
   * Lazy load VIN instances on first expand
   */
  onRowExpand(vehicle: VehicleResult): void {
    console.log('ResultsTable: Row expanded:', vehicle.vehicle_id);

    // Only load if not already cached
    if (!this.expandedRowInstances.has(vehicle.vehicle_id)) {
      this.loadVehicleInstances(vehicle.vehicle_id);
    }
  }

  /**
   * Load VIN instances for expanded row
   */
  private loadVehicleInstances(vehicleId: string): void {
    this.loadingInstances.add(vehicleId);

    this.apiService
      .getVehicleInstances(vehicleId, 8)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.expandedRowInstances.set(vehicleId, response.instances);
          this.loadingInstances.delete(vehicleId);
        },
        error: (err) => {
          console.error('Error loading VIN instances:', err);
          this.loadingInstances.delete(vehicleId);
        },
      });
  }

  /**
   * Get instances for expanded row
   */
  getInstances(vehicleId: string): VehicleInstance[] {
    return this.expandedRowInstances.get(vehicleId) || [];
  }

  /**
   * Check if instances are loading
   */
  isLoadingInstances(vehicleId: string): boolean {
    return this.loadingInstances.has(vehicleId);
  }

  /**
   * Get color for title status badge
   */
  getTitleStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      Clean: 'green',
      Salvage: 'red',
      Rebuilt: 'orange',
      Lemon: 'red',
      Flood: 'red',
      'Theft Recovery': 'orange',
      Junk: 'red',
    };
    return statusColors[status] || 'default';
  }
}
