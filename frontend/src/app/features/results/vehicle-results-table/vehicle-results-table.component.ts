import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StateManagementService } from '../../../core/services/state-management.service';
import { ApiService } from '../../../services/api.service';
import { VehicleResult, VehicleDetailsResponse, VehicleInstance } from '../../../models';

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
  styleUrls: ['./vehicle-results-table.component.scss']
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
  isFilteringOrSorting = false;
  error: string | null = null;

  // Column configuration and ordering
  columns: TableColumn[] = [
    { key: 'manufacturer', label: 'Manufacturer', width: '180px', sortable: true, filterable: true, filterType: 'text' },
    { key: 'model', label: 'Model', width: '180px', sortable: true, filterable: true, filterType: 'text' },
    { key: 'year', label: 'Year', width: '120px', sortable: true, filterable: true, filterType: 'year-range' },
    { key: 'body_class', label: 'Body Class', width: '150px', sortable: true, filterable: true, filterType: 'text' },
    { key: 'data_source', label: 'Data Source', width: '180px', sortable: true, filterable: true, filterType: 'text' },
    { key: 'vehicle_id', label: 'Vehicle ID', width: 'auto', sortable: false, filterable: false }
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
  private currentModelCombos: Array<{ manufacturer: string; model: string }> = [];

  constructor(
    private stateService: StateManagementService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Load saved column order from localStorage
    this.loadColumnOrder();

    this.stateService.filters$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => {
        return JSON.stringify(prev.modelCombos) === JSON.stringify(curr.modelCombos);
      })
    ).subscribe(filters => {
      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.currentModelCombos = filters.modelCombos;
        this.fetchVehicleDetails(1, false);
      } else {
        this.clearResults();
      }
    });

    this.setupFilterDebouncing();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Column reordering methods
  onColumnDrop(event: CdkDragDrop<TableColumn[]>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.saveColumnOrder();
    console.log('Column order updated:', this.columns.map(c => c.key));
  }

  private saveColumnOrder(): void {
    const columnOrder = this.columns.map(c => c.key);
    localStorage.setItem('autos-results-column-order', JSON.stringify(columnOrder));
  }

  private loadColumnOrder(): void {
    const saved = localStorage.getItem('autos-results-column-order');
    if (saved) {
      try {
        const savedOrder: string[] = JSON.parse(saved);
        // Reorder columns array based on saved order
        const reorderedColumns: TableColumn[] = [];
        savedOrder.forEach(key => {
          const column = this.columns.find(c => c.key === key);
          if (column) {
            reorderedColumns.push(column);
          }
        });
        // Add any new columns that weren't in saved order
        this.columns.forEach(column => {
          if (!reorderedColumns.find(c => c.key === column.key)) {
            reorderedColumns.push(column);
          }
        });
        this.columns = reorderedColumns;
        console.log('Loaded column order from localStorage:', this.columns.map(c => c.key));
      } catch (e) {
        console.error('Failed to load column order:', e);
      }
    }
  }

  resetColumnOrder(): void {
    // Reset to default order
    this.columns = [
      { key: 'manufacturer', label: 'Manufacturer', width: '180px', sortable: true, filterable: true, filterType: 'text' },
      { key: 'model', label: 'Model', width: '180px', sortable: true, filterable: true, filterType: 'text' },
      { key: 'year', label: 'Year', width: '120px', sortable: true, filterable: true, filterType: 'year-range' },
      { key: 'body_class', label: 'Body Class', width: '150px', sortable: true, filterable: true, filterType: 'text' },
      { key: 'data_source', label: 'Data Source', width: '180px', sortable: true, filterable: true, filterType: 'text' },
      { key: 'vehicle_id', label: 'Vehicle ID', width: 'auto', sortable: false, filterable: false }
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
      'manufacturer': this.manufacturerFilter,
      'model': this.modelFilter,
      'body_class': this.bodyClassFilter,
      'data_source': this.dataSourceFilter
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
    this.manufacturerFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.manufacturerFilter = value;
      this.fetchVehicleDetails(1, true);
    });

    this.modelFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.modelFilter = value;
      this.fetchVehicleDetails(1, true);
    });

    this.bodyClassFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.bodyClassFilter = value;
      this.fetchVehicleDetails(1, true);
    });

    this.dataSourceFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.dataSourceFilter = value;
      this.fetchVehicleDetails(1, true);
    });
  }

  private fetchVehicleDetails(page: number, isFilterOrSort: boolean = false): void {
    if (!this.currentModelCombos || this.currentModelCombos.length === 0) {
      return;
    }

    this.loading = true;
    this.isFilteringOrSorting = isFilterOrSort;
    this.error = null;

    const modelsParam = this.currentModelCombos
      .map(c => `${c.manufacturer}:${c.model}`)
      .join(',');

    const filters: any = {};
    if (this.manufacturerFilter) filters.manufacturer = this.manufacturerFilter;
    if (this.modelFilter) filters.model = this.modelFilter;
    if (this.yearMinFilter !== null) filters.yearMin = this.yearMinFilter;
    if (this.yearMaxFilter !== null) filters.yearMax = this.yearMaxFilter;
    if (this.bodyClassFilter) filters.bodyClass = this.bodyClassFilter;
    if (this.dataSourceFilter) filters.dataSource = this.dataSourceFilter;

    const sortByMap: { [key: string]: string } = {
      'manufacturer': 'manufacturer',
      'model': 'model',
      'year': 'year',
      'body_class': 'body_class',
      'data_source': 'data_source'
    };

    const sortBy = this.sortColumn ? sortByMap[this.sortColumn] : undefined;

    this.apiService.getVehicleDetails(
      modelsParam,
      page,
      this.pageSize,
      Object.keys(filters).length > 0 ? filters : undefined,
      sortBy,
      this.sortDirection || undefined
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: VehicleDetailsResponse) => {
        this.results = response.results;
        this.total = response.total;
        this.currentPage = response.page;
        this.pageSize = response.size;
        this.totalPages = response.totalPages;
        this.loading = false;
        this.isFilteringOrSorting = false;
      },
      error: (error) => {
        console.error('Failed to fetch vehicle details:', error);
        this.error = 'Failed to load vehicle details. Please try again.';
        this.loading = false;
        this.isFilteringOrSorting = false;
        this.clearResults();
      }
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

    this.fetchVehicleDetails(1, true);
  }

  onManufacturerFilterChange(value: string): void {
    this.manufacturerFilterSubject.next(value);
  }

  onModelFilterChange(value: string): void {
    this.modelFilterSubject.next(value);
  }

  onYearMinFilterChange(value: string): void {
    this.yearMinFilter = value ? parseInt(value, 10) : null;
    this.fetchVehicleDetails(1, true);
  }

  onYearMaxFilterChange(value: string): void {
    this.yearMaxFilter = value ? parseInt(value, 10) : null;
    this.fetchVehicleDetails(1, true);
  }

  onBodyClassFilterChange(value: string): void {
    this.bodyClassFilterSubject.next(value);
  }

  onDataSourceFilterChange(value: string): void {
    this.dataSourceFilterSubject.next(value);
  }

  private clearResults(): void {
    this.results = [];
    this.total = 0;
    this.currentPage = 1;
    this.totalPages = 0;
    this.loading = false;
    this.isFilteringOrSorting = false;
    this.error = null;
  }

  clearAllFilters(): void {
    this.manufacturerFilter = '';
    this.modelFilter = '';
    this.yearMinFilter = null;
    this.yearMaxFilter = null;
    this.bodyClassFilter = '';
    this.dataSourceFilter = '';
    this.sortColumn = null;
    this.sortDirection = null;
    this.fetchVehicleDetails(1, true);
  }

  onPageChange(page: number): void {
    this.fetchVehicleDetails(page, false);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.fetchVehicleDetails(1, false);
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
        }
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
      'Clean': 'green',
      'Salvage': 'red',
      'Rebuilt': 'orange',
      'Lemon': 'red',
      'Flood': 'red',
      'Theft Recovery': 'orange',
      'Junk': 'red'
    };
    return statusColors[status] || 'default';
  }

  trackByVehicleId(index: number, vehicle: VehicleResult): string {
    return vehicle.vehicle_id;
  }
}