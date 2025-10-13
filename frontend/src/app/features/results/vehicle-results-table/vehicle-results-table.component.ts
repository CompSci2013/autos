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
  filteredResults: VehicleResult[] = [];
  total = 0;
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;

  // UI State
  loading = false;
  error: string | null = null;

  // Column filters
  manufacturerFilter = '';
  modelFilter = '';
  yearMinFilter: number | null = null;
  yearMaxFilter: number | null = null;
  bodyClassFilter = '';
  dataSourceFilter = '';

  // Sorting
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;

  // Expandable rows (NEW)
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
        this.fetchVehicleDetails(filters.modelCombos, 1, this.pageSize);
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
      debounceTime(300)
    ).subscribe(value => {
      this.manufacturerFilter = value;
      this.applyFilters();
    });

    this.modelFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(value => {
      this.modelFilter = value;
      this.applyFilters();
    });

    this.bodyClassFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(value => {
      this.bodyClassFilter = value;
      this.applyFilters();
    });

    this.dataSourceFilterSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(value => {
      this.dataSourceFilter = value;
      this.applyFilters();
    });
  }

  private fetchVehicleDetails(
    modelCombos: Array<{ manufacturer: string; model: string }>,
    page: number,
    size: number
  ): void {
    this.loading = true;
    this.error = null;

    // Convert to string format expected by API
    const modelsParam = modelCombos
      .map(c => `${c.manufacturer}:${c.model}`)
      .join(',');

    this.apiService.getVehicleDetails(modelsParam, page, size).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: VehicleDetailsResponse) => {
        this.results = response.results;
        this.total = response.total;
        this.currentPage = response.page;
        this.pageSize = response.size;
        this.totalPages = response.totalPages;
        this.loading = false;
        
        this.applyFilters();
      },
      error: (error) => {
        console.error('Failed to fetch vehicle details:', error);
        this.error = 'Failed to load vehicle details. Please try again.';
        this.loading = false;
        this.clearResults();
      }
    });
  }

  private applyFilters(): void {
    let filtered = [...this.results];

    if (this.manufacturerFilter) {
      const search = this.manufacturerFilter.toLowerCase();
      filtered = filtered.filter(v => 
        v.manufacturer.toLowerCase().includes(search)
      );
    }

    if (this.modelFilter) {
      const search = this.modelFilter.toLowerCase();
      filtered = filtered.filter(v => 
        v.model.toLowerCase().includes(search)
      );
    }

    if (this.yearMinFilter !== null) {
      filtered = filtered.filter(v => v.year >= this.yearMinFilter!);
    }
    if (this.yearMaxFilter !== null) {
      filtered = filtered.filter(v => v.year <= this.yearMaxFilter!);
    }

    if (this.bodyClassFilter) {
      const search = this.bodyClassFilter.toLowerCase();
      filtered = filtered.filter(v => 
        (v.body_class || '').toLowerCase().includes(search)
      );
    }

    if (this.dataSourceFilter) {
      const search = this.dataSourceFilter.toLowerCase();
      filtered = filtered.filter(v => 
        v.data_source.toLowerCase().includes(search)
      );
    }

    if (this.sortColumn && this.sortDirection) {
      filtered = this.sortData(filtered, this.sortColumn, this.sortDirection);
    }

    this.filteredResults = filtered;
  }

  private sortData(data: VehicleResult[], column: string, direction: 'asc' | 'desc'): VehicleResult[] {
    return data.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (column) {
        case 'manufacturer':
          aVal = a.manufacturer;
          bVal = b.manufacturer;
          break;
        case 'model':
          aVal = a.model;
          bVal = b.model;
          break;
        case 'year':
          aVal = a.year;
          bVal = b.year;
          break;
        case 'body_class':
          aVal = a.body_class || '';
          bVal = b.body_class || '';
          break;
        case 'data_source':
          aVal = a.data_source;
          bVal = b.data_source;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
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

    this.applyFilters();
  }

  onManufacturerFilterChange(value: string): void {
    this.manufacturerFilterSubject.next(value);
  }

  onModelFilterChange(value: string): void {
    this.modelFilterSubject.next(value);
  }

  onYearMinFilterChange(value: string): void {
    this.yearMinFilter = value ? parseInt(value, 10) : null;
    this.applyFilters();
  }

  onYearMaxFilterChange(value: string): void {
    this.yearMaxFilter = value ? parseInt(value, 10) : null;
    this.applyFilters();
  }

  onBodyClassFilterChange(value: string): void {
    this.bodyClassFilterSubject.next(value);
  }

  onDataSourceFilterChange(value: string): void {
    this.dataSourceFilterSubject.next(value);
  }

  private clearResults(): void {
    this.results = [];
    this.filteredResults = [];
    this.total = 0;
    this.currentPage = 1;
    this.totalPages = 0;
    this.loading = false;
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
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.fetchVehicleDetails(filters.modelCombos, page, this.pageSize);
      }
    });
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.fetchVehicleDetails(filters.modelCombos, 1, size);
      }
    });
  }

  // NEW: Expandable row methods
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
}
