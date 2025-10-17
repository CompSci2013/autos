import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StateManagementService } from '../../../core/services/state-management.service';
import { ApiService } from '../../../services/api.service';
import { VehicleResult, VehicleInstance } from '../../../models';

// Column definition interface
interface TableColumn {
  key: string;
  label: string;
  width: string;
  sortable: boolean;
  filterable: boolean;
  filterType?: 'text' | 'number' | 'year-range';
}

@Component({
  selector: 'app-vehicle-results-table',
  templateUrl: './vehicle-results-table.component.html',
  styleUrls: ['./vehicle-results-table.component.scss'],
})
export class VehicleResultsTableComponent implements OnInit, OnDestroy {
  // Data
  results: VehicleResult[] = [];
  total = 0;
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;

  // UI State
  loading = false;
  error: string | null = null;

  // Column configuration and ordering
  columns: TableColumn[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'model',
      label: 'Model',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'year',
      label: 'Year',
      width: '120px',
      sortable: true,
      filterable: true,
      filterType: 'year-range',
    },
    {
      key: 'body_class',
      label: 'Body Class',
      width: '150px',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'data_source',
      label: 'Data Source',
      width: '180px',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'vehicle_id',
      label: 'Vehicle ID',
      width: 'auto',
      sortable: false,
      filterable: false,
    },
  ];

  // Column filters (for server-side filtering)
  manufacturerFilter = '';
  modelFilter = '';
  yearMinFilter: number | null = null;
  yearMaxFilter: number | null = null;
  bodyClassFilter = '';
  dataSourceFilter = '';

  // Sorting (for server-side sorting)
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;

  // Expandable rows
  expandSet = new Set<string>();
  expandedRowInstances = new Map<string, VehicleInstance[]>();
  loadingInstances = new Set<string>();

  // Filter subjects for debouncing
  private manufacturerFilterSubject = new Subject<string>();
  private modelFilterSubject = new Subject<string>();
  private bodyClassFilterSubject = new Subject<string>();
  private dataSourceFilterSubject = new Subject<string>();

  // Subscription management
  private destroy$ = new Subject<void>();
  currentModelCombos: Array<{ manufacturer: string; model: string }> = [];

  constructor(
    private stateService: StateManagementService,
    private apiService: ApiService // Keep temporarily for loadVehicleInstances
  ) {}

  ngOnInit(): void {
    this.loadColumnOrder();
    this.subscribeToStateChanges();
    this.setupFilterDebouncing();
  }

  /**
   * Subscribe to StateManagementService observables
   * Component receives data from StateManagement instead of fetching directly
   */
  private subscribeToStateChanges(): void {
    // Subscribe to results
    this.stateService.results$
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        this.results = results;
      });

    // Subscribe to loading state
    this.stateService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
      });

    // Subscribe to error state
    this.stateService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.error = error;
      });

    // Subscribe to total results
    this.stateService.totalResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe((total) => {
        this.total = total;
        this.totalPages = Math.ceil(total / this.pageSize);
      });

    // NEW: Subscribe to filters to hydrate local input values from URL
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('🟣 Table: Hydrating filters from state:', filters);

        // Hydrate local filter values (but don't trigger the debounce subjects)
        this.manufacturerFilter = filters.manufacturer || '';
        this.modelFilter = filters.model || '';
        this.yearMinFilter = filters.yearMin || null;
        this.yearMaxFilter = filters.yearMax || null;
        this.bodyClassFilter = filters.bodyClass || '';
        this.dataSourceFilter = filters.dataSource || '';
        this.currentPage = filters.page || 1;
        this.pageSize = filters.size || 20;
        this.sortColumn = filters.sort || null;
        this.sortDirection = filters.sortDirection || null;
        this.currentModelCombos = filters.modelCombos || [];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Column reordering methods
  onColumnDrop(event: CdkDragDrop<TableColumn[]>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.saveColumnOrder();
    console.log(
      'Column order updated:',
      this.columns.map((c) => c.key)
    );
  }

  private saveColumnOrder(): void {
    const columnOrder = this.columns.map((c) => c.key);
    localStorage.setItem(
      'autos-results-column-order',
      JSON.stringify(columnOrder)
    );
  }

  private loadColumnOrder(): void {
    const saved = localStorage.getItem('autos-results-column-order');
    if (saved) {
      try {
        const savedOrder: string[] = JSON.parse(saved);
        // Reorder columns array based on saved order
        const reorderedColumns: TableColumn[] = [];
        savedOrder.forEach((key) => {
          const column = this.columns.find((c) => c.key === key);
          if (column) {
            reorderedColumns.push(column);
          }
        });
        // Add any new columns that weren't in saved order
        this.columns.forEach((column) => {
          if (!reorderedColumns.find((c) => c.key === column.key)) {
            reorderedColumns.push(column);
          }
        });
        this.columns = reorderedColumns;
        console.log(
          'Loaded column order from localStorage:',
          this.columns.map((c) => c.key)
        );
      } catch (e) {
        console.error('Failed to load column order:', e);
      }
    }
  }

  resetColumnOrder(): void {
    // Reset to default order
    this.columns = [
      {
        key: 'manufacturer',
        label: 'Manufacturer',
        width: '180px',
        sortable: true,
        filterable: true,
        filterType: 'text',
      },
      {
        key: 'model',
        label: 'Model',
        width: '180px',
        sortable: true,
        filterable: true,
        filterType: 'text',
      },
      {
        key: 'year',
        label: 'Year',
        width: '120px',
        sortable: true,
        filterable: true,
        filterType: 'year-range',
      },
      {
        key: 'body_class',
        label: 'Body Class',
        width: '150px',
        sortable: true,
        filterable: true,
        filterType: 'text',
      },
      {
        key: 'data_source',
        label: 'Data Source',
        width: '180px',
        sortable: true,
        filterable: true,
        filterType: 'text',
      },
      {
        key: 'vehicle_id',
        label: 'Vehicle ID',
        width: 'auto',
        sortable: false,
        filterable: false,
      },
    ];
    localStorage.removeItem('autos-results-column-order');
    console.log('Column order reset to default');
  }

  onColumnDragStart(event: any): void {
    console.log('Column drag started - stopping propagation');
    // Prevent the event from bubbling up to the grid
    if (event && event.source && event.source.element) {
      const nativeElement = event.source.element.nativeElement;
      // Add a flag to prevent grid from capturing
      nativeElement.classList.add('column-dragging');
    }
  }

  onHeaderMouseDown(event: MouseEvent): void {
    // Stop the mousedown event from reaching the grid container
    event.stopPropagation();
    console.log('Header mousedown - propagation stopped');
  }

  getFilterValue(columnKey: string): string | number | null {
    const filterMap: { [key: string]: string | number | null } = {
      manufacturer: this.manufacturerFilter,
      model: this.modelFilter,
      body_class: this.bodyClassFilter,
      data_source: this.dataSourceFilter,
    };
    return filterMap[columnKey] || '';
  }

  onFilterChange(columnKey: string, value: string): void {
    switch (columnKey) {
      case 'manufacturer':
        this.onManufacturerFilterChange(value);
        break;
      case 'model':
        this.onModelFilterChange(value);
        break;
      case 'body_class':
        this.onBodyClassFilterChange(value);
        break;
      case 'data_source':
        this.onDataSourceFilterChange(value);
        break;
    }
  }

  private setupFilterDebouncing(): void {
    this.manufacturerFilterSubject
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((value) => {
        console.log('🔵 Manufacturer filter debounced:', value);
        this.manufacturerFilter = value;
        this.stateService.updateFilters({
          manufacturer: value || undefined,
          page: 1,
        });
      });

    this.modelFilterSubject
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((value) => {
        console.log('🔵 Model filter debounced:', value);
        this.modelFilter = value;
        this.stateService.updateFilters({
          model: value || undefined,
          page: 1,
        });
      });

    this.bodyClassFilterSubject
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((value) => {
        console.log('🔵 Body Class filter debounced:', value);
        this.bodyClassFilter = value;
        this.stateService.updateFilters({
          bodyClass: value || undefined,
          page: 1,
        });
      });

    this.dataSourceFilterSubject
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((value) => {
        console.log('🔵 Data Source filter debounced:', value);
        this.dataSourceFilter = value;
        this.stateService.updateFilters({
          dataSource: value || undefined,
          page: 1,
        });
      });
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortColumn = null;
        this.sortDirection = null;
      } else {
        this.sortDirection = 'asc';
      }
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Map frontend column keys to backend field names
    const sortByMap: { [key: string]: string } = {
      manufacturer: 'manufacturer',
      model: 'model',
      year: 'year',
      body_class: 'body_class',
      data_source: 'data_source',
    };

    // Update StateManagement with new sort
    if (this.sortColumn && this.sortDirection) {
      const backendSortField = sortByMap[this.sortColumn] || this.sortColumn;
      this.stateService.updateSort(backendSortField, this.sortDirection);
    } else {
      // Clear sort by updating filters
      this.stateService.updateFilters({
        sort: undefined,
        sortDirection: undefined,
      });
    }
  }

  onManufacturerFilterChange(value: string): void {
    this.manufacturerFilterSubject.next(value);
  }

  onModelFilterChange(value: string): void {
    this.modelFilterSubject.next(value);
  }

  onYearMinFilterChange(value: string): void {
    // Just update local state, don't trigger search yet
    this.yearMinFilter = value ? parseInt(value, 10) : null;
  }

  onYearMaxFilterChange(value: string): void {
    // Just update local state, don't trigger search yet
    this.yearMaxFilter = value ? parseInt(value, 10) : null;
  }

  onYearMinFilterBlur(): void {
    // Only trigger search if yearMax is not set OR yearMax >= yearMin
    if (
      this.yearMaxFilter === null ||
      this.yearMinFilter === null ||
      this.yearMaxFilter >= this.yearMinFilter
    ) {
      this.stateService.updateFilters({
        yearMin: this.yearMinFilter || undefined,
        yearMax: this.yearMaxFilter || undefined,
        page: 1,
      });
    } else {
      // Invalid range: yearMax < yearMin, don't search
      console.warn(
        `Invalid year range: min=${this.yearMinFilter}, max=${this.yearMaxFilter}. Min must be <= Max.`
      );
    }
  }

  onYearMaxFilterBlur(): void {
    // Only trigger search if yearMin is not set OR yearMin <= yearMax
    if (
      this.yearMinFilter === null ||
      this.yearMaxFilter === null ||
      this.yearMinFilter <= this.yearMaxFilter
    ) {
      this.stateService.updateFilters({
        yearMin: this.yearMinFilter || undefined,
        yearMax: this.yearMaxFilter || undefined,
        page: 1,
      });
    } else {
      // Invalid range: yearMin > yearMax, don't search
      console.warn(
        `Invalid year range: min=${this.yearMinFilter}, max=${this.yearMaxFilter}. Min must be <= Max.`
      );
    }
  }

  onBodyClassFilterChange(value: string): void {
    this.bodyClassFilterSubject.next(value);
  }

  onDataSourceFilterChange(value: string): void {
    this.dataSourceFilterSubject.next(value);
  }

  clearAllFilters(): void {
    // Clear local filter state
    this.manufacturerFilter = '';
    this.modelFilter = '';
    this.yearMinFilter = null;
    this.yearMaxFilter = null;
    this.bodyClassFilter = '';
    this.dataSourceFilter = '';
    this.sortColumn = null;
    this.sortDirection = null;

    // Clear all filters in StateManagement (keeps modelCombos, clears everything else)
    this.stateService.updateFilters({
      manufacturer: undefined,
      model: undefined,
      yearMin: undefined,
      yearMax: undefined,
      bodyClass: undefined,
      dataSource: undefined,
      sort: undefined,
      sortDirection: undefined,
      page: 1,
    });
  }

  onPageChange(page: number): void {
    this.stateService.updatePage(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.stateService.updateFilters({
      size: size,
      page: 1, // Reset to page 1 when changing page size
    });
  }

  onExpandChange(vehicleId: string, expanded: boolean): void {
    if (expanded) {
      this.expandSet.add(vehicleId);

      if (!this.expandedRowInstances.has(vehicleId)) {
        this.loadVehicleInstances(vehicleId);
      }
    } else {
      this.expandSet.delete(vehicleId);
    }
  }

  // Keep this method - it's for detail data (VIN instances), not main results
  private loadVehicleInstances(vehicleId: string): void {
    this.loadingInstances.add(vehicleId);

    this.apiService
      .getVehicleInstances(vehicleId, 8)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.expandedRowInstances.set(vehicleId, response.instances);
          this.loadingInstances.delete(vehicleId);
        },
        error: (err: any) => {
          console.error('Error loading VIN instances:', err);
          this.loadingInstances.delete(vehicleId);
        },
      });
  }

  getInstances(vehicleId: string): VehicleInstance[] {
    return this.expandedRowInstances.get(vehicleId) || [];
  }

  isLoadingInstances(vehicleId: string): boolean {
    return this.loadingInstances.has(vehicleId);
  }

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

  trackByVehicleId(index: number, vehicle: VehicleResult): string {
    return vehicle.vehicle_id;
  }
}
