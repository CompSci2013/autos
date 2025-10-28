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
 * First implementation using BaseDataTableComponent.
 * Demonstrates proper data source adapter pattern and state management integration.
 *
 * This component is placed on the Workshop page ABOVE the grid container
 * to showcase the reusable base table in action.
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

        // Update data source with new models FIRST
        if (filters.modelCombos && filters.modelCombos.length > 0) {
          const modelsParam = filters.modelCombos
            .map((c) => `${c.manufacturer}:${c.model}`)
            .join(',');
          this.dataSource.updateModels(modelsParam);
        } else {
          this.dataSource.updateModels('');
        }

        // Convert SearchFilters → TableQueryParams
        // IMPORTANT: Always create NEW object reference to trigger change detection in BaseDataTable
        this.tableQueryParams = { ...this.convertToTableParams(filters) };
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
        // Include models so BaseDataTableComponent detects changes
        _models: filters.modelCombos?.map(c => `${c.manufacturer}:${c.model}`).join(',') || ''
      },
    };
  }

  /**
   * Handle table query changes (user interactions)
   * Convert TableQueryParams → SearchFilters and update state
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('ResultsTable: Table query changed:', params);

    // Use bracket notation for optional filters
    const filters = params.filters || {};

    this.stateService.updateFilters({
      page: params.page,
      size: params.size,
      sort: params.sortBy,
      sortDirection: params.sortOrder,
      manufacturer: filters['manufacturer'],
      model: filters['model'],
      yearMin: filters['yearMin'],
      yearMax: filters['yearMax'],
      bodyClass: filters['bodyClass'],
      dataSource: filters['dataSource'],
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
