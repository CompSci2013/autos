import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { StateManagementService } from '../../../core/services/state-management.service';
import { ApiService } from '../../../services/api.service';
import { VehicleResult, VehicleDetailsResponse, VehicleInstance } from '../../../models';

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
  isFilteringOrSorting = false; // NEW: Track if current operation is filter/sort
  error: string | null = null;

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
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => {
        return JSON.stringify(prev.modelCombos) === JSON.stringify(curr.modelCombos);
      })
    ).subscribe(filters => {
      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.currentModelCombos = filters.modelCombos;
        this.fetchVehicleDetails(1, false); // Initial load, not filtering
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

  private setupFilterDebouncing(): void {
    this.manufacturerFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.manufacturerFilter = value;
      this.fetchVehicleDetails(1, true); // Filtering operation
    });

    this.modelFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.modelFilter = value;
      this.fetchVehicleDetails(1, true); // Filtering operation
    });

    this.bodyClassFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.bodyClassFilter = value;
      this.fetchVehicleDetails(1, true); // Filtering operation
    });

    this.dataSourceFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(800)
    ).subscribe(value => {
      this.dataSourceFilter = value;
      this.fetchVehicleDetails(1, true); // Filtering operation
    });
  }

  private fetchVehicleDetails(page: number, isFilterOrSort: boolean = false): void {
    if (!this.currentModelCombos || this.currentModelCombos.length === 0) {
      return;
    }

    this.loading = true;
    this.isFilteringOrSorting = isFilterOrSort; // NEW: Set flag
    this.error = null;

    // Convert to string format expected by API
    const modelsParam = this.currentModelCombos
      .map(c => `${c.manufacturer}:${c.model}`)
      .join(',');

    // Build filters object
    const filters: any = {};
    if (this.manufacturerFilter) filters.manufacturer = this.manufacturerFilter;
    if (this.modelFilter) filters.model = this.modelFilter;
    if (this.yearMinFilter !== null) filters.yearMin = this.yearMinFilter;
    if (this.yearMaxFilter !== null) filters.yearMax = this.yearMaxFilter;
    if (this.bodyClassFilter) filters.bodyClass = this.bodyClassFilter;
    if (this.dataSourceFilter) filters.dataSource = this.dataSourceFilter;

    // Map frontend column names to backend field names
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
        this.isFilteringOrSorting = false; // NEW: Reset flag
      },
      error: (error) => {
        console.error('Failed to fetch vehicle details:', error);
        this.error = 'Failed to load vehicle details. Please try again.';
        this.loading = false;
        this.isFilteringOrSorting = false; // NEW: Reset flag
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

    this.fetchVehicleDetails(1, true); // Sorting operation
  }

  onManufacturerFilterChange(value: string): void {
    this.manufacturerFilterSubject.next(value);
  }

  onModelFilterChange(value: string): void {
    this.modelFilterSubject.next(value);
  }

  onYearMinFilterChange(value: string): void {
    this.yearMinFilter = value ? parseInt(value, 10) : null;
    this.fetchVehicleDetails(1, true); // Filtering operation
  }

  onYearMaxFilterChange(value: string): void {
    this.yearMaxFilter = value ? parseInt(value, 10) : null;
    this.fetchVehicleDetails(1, true); // Filtering operation
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
    this.isFilteringOrSorting = false; // NEW: Reset flag
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
    this.fetchVehicleDetails(1, true); // Filtering operation
  }

  onPageChange(page: number): void {
    this.fetchVehicleDetails(page, false); // Pagination is not filtering
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.fetchVehicleDetails(1, false); // Page size change is not filtering
  }

  // Expandable row methods
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