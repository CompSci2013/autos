import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VehicleResultsTableComponent } from './vehicle-results-table.component';
import { StateManagementService } from '../../../core/services/state-management.service';
import { ApiService } from '../../../services/api.service';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { SearchFilters, VehicleResult } from '../../../models';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { VehicleInstance, VehicleInstancesResponse } from '../../../models/vehicle.model';

describe('VehicleResultsTableComponent - URL-First State Management', () => {
  let component: VehicleResultsTableComponent;
  let fixture: ComponentFixture<VehicleResultsTableComponent>;
  let mockStateService: jasmine.SpyObj<StateManagementService>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let resultsSubject: BehaviorSubject<VehicleResult[]>;
  let loadingSubject: BehaviorSubject<boolean>;
  let errorSubject: BehaviorSubject<string | null>;
  let totalResultsSubject: BehaviorSubject<number>;
  let filtersSubject: BehaviorSubject<SearchFilters>;

  const mockResults: VehicleResult[] = [
    {
      vehicle_id: 'v1',
      manufacturer: 'Ford',
      model: 'F-150',
      year: 2020,
      body_class: 'Pickup',
      data_source: 'NHTSA',
      ingested_at: new Date().toISOString(),
    },
    {
      vehicle_id: 'v2',
      manufacturer: 'Ford',
      model: 'Mustang',
      year: 1969,
      body_class: 'Coupe',
      data_source: 'NHTSA',
      ingested_at: new Date().toISOString(),
    },
  ];

  const createVehicleInstance = (
    overrides?: Partial<VehicleInstance>
  ): VehicleInstance => ({
    vin: '1FTFW1ET5DFC12345',
    condition_rating: 8,
    condition_description: 'Good',
    mileage: 25000,
    mileage_verified: true,
    registered_state: 'CA',
    registration_status: 'Current',
    title_status: 'Clean',
    exterior_color: 'Blue',
    factory_options: ['Leather', 'Sunroof'],
    estimated_value: 35000,
    matching_numbers: true,
    last_service_date: '2024-01-15',
    ...overrides,
  });

  const createVehicleInstancesResponse = (
    vehicleId: string,
    instances: VehicleInstance[]
  ): VehicleInstancesResponse => ({
    vehicle_id: vehicleId,
    manufacturer: 'Ford',
    model: 'F-150',
    year: 2020,
    body_class: 'Pickup',
    instance_count: instances.length,
    instances,
  });

  beforeEach(async () => {
    // Create subjects for observables
    resultsSubject = new BehaviorSubject<VehicleResult[]>([]);
    loadingSubject = new BehaviorSubject<boolean>(false);
    errorSubject = new BehaviorSubject<string | null>(null);
    totalResultsSubject = new BehaviorSubject<number>(0);
    filtersSubject = new BehaviorSubject<SearchFilters>({ page: 1, size: 20 });

    mockStateService = jasmine.createSpyObj('StateManagementService', [
      'updateFilters',
      'updatePage',
      'updateSort',
    ]);

    // Add observable properties
    Object.defineProperty(mockStateService, 'results$', {
      get: () => resultsSubject.asObservable(),
    });
    Object.defineProperty(mockStateService, 'loading$', {
      get: () => loadingSubject.asObservable(),
    });
    Object.defineProperty(mockStateService, 'error$', {
      get: () => errorSubject.asObservable(),
    });
    Object.defineProperty(mockStateService, 'totalResults$', {
      get: () => totalResultsSubject.asObservable(),
    });
    Object.defineProperty(mockStateService, 'filters$', {
      get: () => filtersSubject.asObservable(),
    });

    mockApiService = jasmine.createSpyObj('ApiService', ['getVehicleInstances']);

    // Clear localStorage before each test
    localStorage.clear();

    await TestBed.configureTestingModule({
      declarations: [VehicleResultsTableComponent],
      providers: [
        { provide: StateManagementService, useValue: mockStateService },
        { provide: ApiService, useValue: mockApiService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleResultsTableComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.results).toEqual([]);
      expect(component.total).toBe(0);
      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(20);
      expect(component.loading).toBe(false);
      expect(component.error).toBeNull();
    });

    it('should initialize with default columns', () => {
      expect(component.columns.length).toBe(6);
      expect(component.columns[0].key).toBe('manufacturer');
      expect(component.columns[1].key).toBe('model');
    });

    it('should subscribe to state observables on init', () => {
      fixture.detectChanges();

      expect(component.results).toEqual([]);
      expect(component.loading).toBe(false);
    });

    it('should load column order from localStorage', () => {
      const customOrder = ['year', 'manufacturer', 'model', 'body_class', 'data_source', 'vehicle_id'];
      localStorage.setItem('autos-results-column-order', JSON.stringify(customOrder));

      fixture = TestBed.createComponent(VehicleResultsTableComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.columns[0].key).toBe('year');
      expect(component.columns[1].key).toBe('manufacturer');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('autos-results-column-order', '{invalid json}');

      const consoleErrorSpy = spyOn(console, 'error');

      fixture = TestBed.createComponent(VehicleResultsTableComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(consoleErrorSpy).toHaveBeenCalled();
      // Should fall back to default order
      expect(component.columns[0].key).toBe('manufacturer');
    });
  });

  describe('URL-First Principle: State Subscription', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should receive results from state service', () => {
      resultsSubject.next(mockResults);

      expect(component.results).toEqual(mockResults);
    });

    it('should receive loading state from state service', () => {
      loadingSubject.next(true);

      expect(component.loading).toBe(true);

      loadingSubject.next(false);

      expect(component.loading).toBe(false);
    });

    it('should receive error state from state service', () => {
      const errorMsg = 'API Error';
      errorSubject.next(errorMsg);

      expect(component.error).toBe(errorMsg);
    });

    it('should receive total results and calculate pages', () => {
      component.pageSize = 20;
      totalResultsSubject.next(150);

      expect(component.total).toBe(150);
      expect(component.totalPages).toBe(8); // ceil(150/20)
    });

    it('should recalculate total pages when page size changes', () => {
      totalResultsSubject.next(100);
      component.pageSize = 10;
      totalResultsSubject.next(100); // Re-emit to trigger calculation

      expect(component.totalPages).toBe(10);
    });
  });

  describe('URL-First Principle: Filter Hydration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should hydrate all filter values from URL state', () => {
      const urlFilters: SearchFilters = {
        manufacturer: 'Ford',
        model: 'Mustang',
        yearMin: 1965,
        yearMax: 1973,
        bodyClass: 'Coupe',
        dataSource: 'NHTSA',
        page: 3,
        size: 50,
        sort: 'year',
        sortDirection: 'desc',
      };

      filtersSubject.next(urlFilters);

      expect(component.manufacturerFilter).toBe('Ford');
      expect(component.modelFilter).toBe('Mustang');
      expect(component.yearMinFilter).toBe(1965);
      expect(component.yearMaxFilter).toBe(1973);
      expect(component.bodyClassFilter).toBe('Coupe');
      expect(component.dataSourceFilter).toBe('NHTSA');
      expect(component.currentPage).toBe(3);
      expect(component.pageSize).toBe(50);
      expect(component.sortColumn).toBe('year');
      expect(component.sortDirection).toBe('desc');
    });

    it('should handle missing/undefined filter values', () => {
      const urlFilters: SearchFilters = {
        page: 1,
        size: 20,
      };

      filtersSubject.next(urlFilters);

      expect(component.manufacturerFilter).toBe('');
      expect(component.yearMinFilter).toBeNull();
      expect(component.yearMaxFilter).toBeNull();
    });

    it('should be idempotent - hydrate multiple times with same state', () => {
      const urlFilters: SearchFilters = {
        manufacturer: 'Ford',
        page: 2,
      };

      filtersSubject.next(urlFilters);
      const firstManufacturer = component.manufacturerFilter;
      const firstPage = component.currentPage;

      filtersSubject.next(urlFilters);

      expect(component.manufacturerFilter).toBe(firstManufacturer);
      expect(component.currentPage).toBe(firstPage);
    });

    it('should update when URL changes (browser back button)', () => {
      filtersSubject.next({ manufacturer: 'Ford', page: 1 });
      expect(component.manufacturerFilter).toBe('Ford');

      // Simulate browser back button
      filtersSubject.next({ manufacturer: 'Chevrolet', page: 1 });

      expect(component.manufacturerFilter).toBe('Chevrolet');
    });

    it('should hydrate model combinations for display', () => {
      const urlFilters: SearchFilters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Ford', model: 'Mustang' },
        ],
      };

      filtersSubject.next(urlFilters);

      expect(component.currentModelCombos.length).toBe(2);
      expect(component.currentModelCombos[0]).toEqual({ manufacturer: 'Ford', model: 'F-150' });
    });
  });

  describe('Filter Operations - Debounced Text Filters', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should debounce manufacturer filter changes', fakeAsync(() => {
      component.onManufacturerFilterChange('Ford');

      // Should not update immediately
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();

      tick(300); // Wait for debounce

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        manufacturer: 'Ford',
        page: 1,
      });
    }));

    it('should debounce model filter changes', fakeAsync(() => {
      component.onModelFilterChange('Mustang');

      tick(300);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        model: 'Mustang',
        page: 1,
      });
    }));

    it('should debounce body class filter changes', fakeAsync(() => {
      component.onBodyClassFilterChange('Coupe');

      tick(300);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        bodyClass: 'Coupe',
        page: 1,
      });
    }));

    it('should debounce data source filter changes', fakeAsync(() => {
      component.onDataSourceFilterChange('NHTSA');

      tick(300);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        dataSource: 'NHTSA',
        page: 1,
      });
    }));

    it('should cancel previous debounce when filter changes rapidly', fakeAsync(() => {
      component.onManufacturerFilterChange('F');
      tick(100);
      component.onManufacturerFilterChange('Fo');
      tick(100);
      component.onManufacturerFilterChange('For');
      tick(100);
      component.onManufacturerFilterChange('Ford');

      tick(300); // Wait for final debounce

      // Should only emit once with final value
      expect(mockStateService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        manufacturer: 'Ford',
        page: 1,
      });
    }));

    it('should reset to page 1 when filter changes', fakeAsync(() => {
      component.currentPage = 5;

      component.onManufacturerFilterChange('Ford');
      tick(300);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith(
        jasmine.objectContaining({ page: 1 })
      );
    }));

    it('should clear filter when empty string provided', fakeAsync(() => {
      component.onManufacturerFilterChange('');

      tick(300);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        manufacturer: undefined,
        page: 1,
      });
    }));
  });

  describe('Filter Operations - Year Range', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update local state on year min change', () => {
      component.onYearMinFilterChange('1965');

      expect(component.yearMinFilter).toBe(1965);
      expect(mockStateService.updateFilters).not.toHaveBeenCalled(); // Not until blur
    });

    it('should update local state on year max change', () => {
      component.onYearMaxFilterChange('1973');

      expect(component.yearMaxFilter).toBe(1973);
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();
    });

    it('should trigger state update on year min blur with valid range', () => {
      component.yearMinFilter = 1965;
      component.yearMaxFilter = 1973;

      component.onYearMinFilterBlur();

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        yearMin: 1965,
        yearMax: 1973,
        page: 1,
      });
    });

    it('should trigger state update on year max blur with valid range', () => {
      component.yearMinFilter = 1965;
      component.yearMaxFilter = 1973;

      component.onYearMaxFilterBlur();

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        yearMin: 1965,
        yearMax: 1973,
        page: 1,
      });
    });

    it('should NOT update state if yearMax < yearMin', () => {
      const consoleWarnSpy = spyOn(console, 'warn');
      component.yearMinFilter = 1973;
      component.yearMaxFilter = 1965;

      component.onYearMinFilterBlur();

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();
    });

    it('should allow yearMin to be set without yearMax', () => {
      component.yearMinFilter = 1965;
      component.yearMaxFilter = null;

      component.onYearMinFilterBlur();

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        yearMin: 1965,
        yearMax: undefined,
        page: 1,
      });
    });

    it('should allow yearMax to be set without yearMin', () => {
      component.yearMinFilter = null;
      component.yearMaxFilter = 1973;

      component.onYearMaxFilterBlur();

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        yearMin: undefined,
        yearMax: 1973,
        page: 1,
      });
    });

    it('should handle empty string for year filters', () => {
      component.onYearMinFilterChange('');
      component.onYearMaxFilterChange('');

      expect(component.yearMinFilter).toBeNull();
      expect(component.yearMaxFilter).toBeNull();
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set sort to asc on first click', () => {
      component.onSort('manufacturer');

      expect(component.sortColumn).toBe('manufacturer');
      expect(component.sortDirection).toBe('asc');
      expect(mockStateService.updateSort).toHaveBeenCalledWith('manufacturer', 'asc');
    });

    it('should toggle sort to desc on second click', () => {
      component.sortColumn = 'manufacturer';
      component.sortDirection = 'asc';

      component.onSort('manufacturer');

      expect(component.sortDirection).toBe('desc');
      expect(mockStateService.updateSort).toHaveBeenCalledWith('manufacturer', 'desc');
    });

    it('should clear sort on third click', () => {
      component.sortColumn = 'manufacturer';
      component.sortDirection = 'desc';

      component.onSort('manufacturer');

      expect(component.sortColumn).toBeNull();
      expect(component.sortDirection).toBeNull();
      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        sort: undefined,
        sortDirection: undefined,
      });
    });

    it('should reset to asc when clicking different column', () => {
      component.sortColumn = 'manufacturer';
      component.sortDirection = 'desc';

      component.onSort('year');

      expect(component.sortColumn).toBe('year');
      expect(component.sortDirection).toBe('asc');
    });

    it('should map frontend keys to backend field names', () => {
      component.onSort('body_class');

      expect(mockStateService.updateSort).toHaveBeenCalledWith('body_class', 'asc');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update page through state service', () => {
      component.onPageChange(3);

      expect(mockStateService.updatePage).toHaveBeenCalledWith(3);
    });

    it('should update page size and reset to page 1', () => {
      component.currentPage = 5;

      component.onPageSizeChange(50);

      expect(component.pageSize).toBe(50);
      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        size: 50,
        page: 1,
      });
    });
  });

  describe('Clear All Filters', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clear all local filter state', () => {
      component.manufacturerFilter = 'Ford';
      component.modelFilter = 'Mustang';
      component.yearMinFilter = 1965;
      component.yearMaxFilter = 1973;
      component.bodyClassFilter = 'Coupe';
      component.dataSourceFilter = 'NHTSA';
      component.sortColumn = 'year';
      component.sortDirection = 'desc';

      component.clearAllFilters();

      expect(component.manufacturerFilter).toBe('');
      expect(component.modelFilter).toBe('');
      expect(component.yearMinFilter).toBeNull();
      expect(component.yearMaxFilter).toBeNull();
      expect(component.bodyClassFilter).toBe('');
      expect(component.dataSourceFilter).toBe('');
      expect(component.sortColumn).toBeNull();
      expect(component.sortDirection).toBeNull();
    });

    it('should update state service with undefined for all filters', () => {
      component.clearAllFilters();

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        manufacturer: undefined,
        model: undefined,
        yearMin: undefined,
        yearMax: undefined,
        bodyClass: undefined,
        dataSource: undefined,
        vehicleID: undefined,
        sort: undefined,
        sortDirection: undefined,
        page: 1,
      });
    });
  });

  describe('Column Reordering (UI Preference)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reorder columns on drag drop', () => {
      const event = {
        previousIndex: 0,
        currentIndex: 2,
      } as CdkDragDrop<any[]>;

      const originalFirst = component.columns[0].key;

      component.onColumnDrop(event);

      expect(component.columns[2].key).toBe(originalFirst);
    });

    it('should save column order to localStorage on drop', () => {
      const event = {
        previousIndex: 0,
        currentIndex: 1,
      } as CdkDragDrop<any[]>;

      component.onColumnDrop(event);

      const saved = localStorage.getItem('autos-results-column-order');
      expect(saved).toBeTruthy();

      const savedOrder = JSON.parse(saved!);
      expect(savedOrder).toContain('manufacturer');
      expect(savedOrder).toContain('model');
    });

    it('should reset column order to default', () => {
      // Reorder columns first
      const event = {
        previousIndex: 0,
        currentIndex: 2,
      } as CdkDragDrop<any[]>;
      component.onColumnDrop(event);

      component.resetColumnOrder();

      expect(component.columns[0].key).toBe('manufacturer');
      expect(component.columns[1].key).toBe('model');
      expect(localStorage.getItem('autos-results-column-order')).toBeNull();
    });

    it('should store column order in localStorage, NOT in URL', () => {
      const event = {
        previousIndex: 0,
        currentIndex: 1,
      } as CdkDragDrop<any[]>;

      component.onColumnDrop(event);

      expect(localStorage.getItem('autos-results-column-order')).toBeTruthy();
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();
    });
  });

  describe('Expandable Rows - VIN Instances', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should expand row and load instances', () => {
      const mockInstances = [
        createVehicleInstance({ vin: 'ABC123', registered_state: 'CA', exterior_color: 'Blue', condition_description: 'Excellent' }),
      ];
      mockApiService.getVehicleInstances.and.returnValue(
        of(createVehicleInstancesResponse('v1', mockInstances))
      );

      component.onExpandChange('v1', true);

      expect(component.expandSet.has('v1')).toBe(true);
      expect(mockApiService.getVehicleInstances).toHaveBeenCalledWith('v1', 8);
    });

    it('should collapse row without loading instances', () => {
      component.expandSet.add('v1');

      component.onExpandChange('v1', false);

      expect(component.expandSet.has('v1')).toBe(false);
      expect(mockApiService.getVehicleInstances).not.toHaveBeenCalled();
    });

    it('should not reload instances if already loaded', () => {
      const mockInstances = [
        createVehicleInstance({ vin: 'ABC123', registered_state: 'CA', exterior_color: 'Blue', condition_description: 'Excellent' })
      ];
      component.expandedRowInstances.set('v1', mockInstances);

      component.onExpandChange('v1', true);

      expect(mockApiService.getVehicleInstances).not.toHaveBeenCalled();
    });

    it('should track loading state for instances', () => {
      mockApiService.getVehicleInstances.and.returnValue(of(createVehicleInstancesResponse('v1', [])));

      expect(component.isLoadingInstances('v1')).toBe(false);

      component.onExpandChange('v1', true);

      // Loading state is synchronous, so check after tick
      expect(component.isLoadingInstances('v1')).toBe(false); // Completes immediately in test
    });

    it('should get instances for vehicle', () => {
      const mockInstances = [createVehicleInstance({ vin: 'ABC123' })];
      component.expandedRowInstances.set('v1', mockInstances);

      const instances = component.getInstances('v1');

      expect(instances).toEqual(mockInstances);
    });

    it('should return empty array for non-existent vehicle', () => {
      const instances = component.getInstances('nonexistent');

      expect(instances).toEqual([]);
    });

    it('should handle instance loading error gracefully', () => {
      const consoleErrorSpy = spyOn(console, 'error');
      mockApiService.getVehicleInstances.and.returnValue(throwError(() => new Error('API Error')));

      component.onExpandChange('v1', true);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(component.isLoadingInstances('v1')).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should return correct title status color', () => {
      expect(component.getTitleStatusColor('Clean')).toBe('green');
      expect(component.getTitleStatusColor('Salvage')).toBe('red');
      expect(component.getTitleStatusColor('Rebuilt')).toBe('orange');
      expect(component.getTitleStatusColor('Unknown')).toBe('default');
    });

    it('should track by vehicle ID for performance', () => {
      const vehicle = mockResults[0];

      const id = component.trackByVehicleId(0, vehicle);

      expect(id).toBe('v1');
    });

    it('should get filter value for column key', () => {
      component.manufacturerFilter = 'Ford';
      component.modelFilter = 'Mustang';

      expect(component.getFilterValue('manufacturer')).toBe('Ford');
      expect(component.getFilterValue('model')).toBe('Mustang');
      expect(component.getFilterValue('unknown')).toBe('');
    });

    it('should route filter changes to correct handlers', () => {
      spyOn(component, 'onManufacturerFilterChange');
      spyOn(component, 'onModelFilterChange');
      spyOn(component, 'onBodyClassFilterChange');

      component.onFilterChange('manufacturer', 'Ford');
      expect(component.onManufacturerFilterChange).toHaveBeenCalledWith('Ford');

      component.onFilterChange('model', 'Mustang');
      expect(component.onModelFilterChange).toHaveBeenCalledWith('Mustang');

      component.onFilterChange('body_class', 'Coupe');
      expect(component.onBodyClassFilterChange).toHaveBeenCalledWith('Coupe');
    });
  });

  describe('Cleanup', () => {
    it('should complete destroy subject on destroy', () => {
      fixture.detectChanges();

      const destroySpy = jasmine.createSpy('complete');
      (component as any).destroy$.subscribe({ complete: destroySpy });

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should unsubscribe from all observables on destroy', () => {
      fixture.detectChanges();

      const resultsSubscribers = resultsSubject.observers.length;
      const loadingSubscribers = loadingSubject.observers.length;

      component.ngOnDestroy();

      expect(resultsSubject.observers.length).toBeLessThan(resultsSubscribers);
      expect(loadingSubject.observers.length).toBeLessThan(loadingSubscribers);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle empty results from state', () => {
      resultsSubject.next([]);

      expect(component.results).toEqual([]);
    });

    it('should handle very large page numbers', () => {
      component.onPageChange(99999);

      expect(mockStateService.updatePage).toHaveBeenCalledWith(99999);
    });

    it('should handle rapid expand/collapse of same row', () => {
      mockApiService.getVehicleInstances.and.returnValue(of(createVehicleInstancesResponse('v1', [])));

      component.onExpandChange('v1', true);
      component.onExpandChange('v1', false);
      component.onExpandChange('v1', true);

      // Should only load once (cached)
      expect(mockApiService.getVehicleInstances).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid year input gracefully', () => {
      component.onYearMinFilterChange('abc');

      expect(component.yearMinFilter).toBeNaN();
    });

    it('should handle column order with missing columns', () => {
      const partialOrder = ['year', 'manufacturer']; // Missing other columns
      localStorage.setItem('autos-results-column-order', JSON.stringify(partialOrder));

      fixture = TestBed.createComponent(VehicleResultsTableComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Should include all columns
      expect(component.columns.length).toBe(6);
      // Saved columns should come first
      expect(component.columns[0].key).toBe('year');
      expect(component.columns[1].key).toBe('manufacturer');
    });
  });

  describe('URL-First Principle: Storage Layer Separation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should store column order in localStorage, NOT URL', () => {
      const event = { previousIndex: 0, currentIndex: 1 } as CdkDragDrop<any[]>;

      component.onColumnDrop(event);

      expect(localStorage.getItem('autos-results-column-order')).toBeTruthy();
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();
    });

    it('should store filter values in URL, NOT localStorage', fakeAsync(() => {
      component.onManufacturerFilterChange('Ford');
      tick(300);

      expect(mockStateService.updateFilters).toHaveBeenCalled();
      expect(localStorage.getItem('manufacturerFilter')).toBeNull();
    }));

    it('should store sort state in URL, NOT localStorage', () => {
      component.onSort('year');

      expect(mockStateService.updateSort).toHaveBeenCalled();
      expect(localStorage.getItem('sortColumn')).toBeNull();
    });

    it('should store pagination in URL, NOT localStorage', () => {
      component.onPageChange(5);

      expect(mockStateService.updatePage).toHaveBeenCalled();
      expect(localStorage.getItem('currentPage')).toBeNull();
    });
  });
});
