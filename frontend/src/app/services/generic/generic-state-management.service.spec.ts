import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GenericStateManagementService } from './generic-state-management.service';
import { GenericDataService } from './generic-data.service';
import { RouteStateService } from '../../core/services/route-state.service';
import { RequestCoordinatorService } from '../../core/services/request-coordinator.service';
import { DomainConfigService } from './domain-config.service';
import { of, throwError } from 'rxjs';

describe('GenericStateManagementService', () => {
  let service: GenericStateManagementService;
  let dataService: jasmine.SpyObj<GenericDataService>;
  let routeState: jasmine.SpyObj<RouteStateService>;
  let router: jasmine.SpyObj<Router>;
  let requestCoordinator: jasmine.SpyObj<RequestCoordinatorService>;
  let domainConfig: jasmine.SpyObj<DomainConfigService>;

  beforeEach(() => {
    const dataSpy = jasmine.createSpyObj('GenericDataService', [
      'fetch',
      'fetchInstances',
      'fetchAggregations'
    ]);
    const routeSpy = jasmine.createSpyObj('RouteStateService', [
      'getQueryParam',
      'setQueryParam',
      'removeQueryParam',
      'getAllQueryParams'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      url: '/generic-discover'
    });
    const coordSpy = jasmine.createSpyObj('RequestCoordinatorService', [
      'executeRequest'
    ]);
    const configSpy = jasmine.createSpyObj('DomainConfigService', [
      'getCurrentConfig'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GenericStateManagementService,
        { provide: GenericDataService, useValue: dataSpy },
        { provide: RouteStateService, useValue: routeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: RequestCoordinatorService, useValue: coordSpy },
        { provide: DomainConfigService, useValue: configSpy }
      ]
    });

    dataService = TestBed.inject(GenericDataService) as jasmine.SpyObj<GenericDataService>;
    routeState = TestBed.inject(RouteStateService) as jasmine.SpyObj<RouteStateService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    requestCoordinator = TestBed.inject(RequestCoordinatorService) as jasmine.SpyObj<RequestCoordinatorService>;
    domainConfig = TestBed.inject(DomainConfigService) as jasmine.SpyObj<DomainConfigService>;

    // Default config mock
    domainConfig.getCurrentConfig.and.returnValue({
      domain: { id: 'vehicles', name: 'Vehicles', version: '1.0.0' },
      filters: {
        columnFilters: [
          { key: 'bodyClass', label: 'Body Class', type: 'select' },
          { key: 'dataSource', label: 'Data Source', type: 'select' }
        ],
        rangeFilters: [
          { key: 'year', label: 'Year', type: 'number', min: 1900, max: 2025 }
        ]
      }
    } as any);

    // Default route params mock
    routeState.getAllQueryParams.and.returnValue({});

    service = TestBed.inject(GenericStateManagementService);
  });

  describe('initialization', () => {
    it('should create service', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default state', (done) => {
      service.state$.subscribe(state => {
        expect(state.filters.page).toBe(1);
        expect(state.filters.size).toBe(20);
        expect(state.results).toEqual([]);
        expect(state.total).toBe(0);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
        done();
      });
    });
  });

  describe('parseFiltersFromUrl', () => {
    it('should parse pagination from URL', () => {
      routeState.getAllQueryParams.and.returnValue({
        page: '2',
        size: '50'
      });

      const service2 = new GenericStateManagementService(
        routeState,
        router,
        dataService,
        requestCoordinator,
        domainConfig
      );

      service2.filters$.subscribe(filters => {
        expect(filters.page).toBe(2);
        expect(filters.size).toBe(50);
      });
    });

    it('should parse selected items from URL', () => {
      routeState.getAllQueryParams.and.returnValue({
        selected: 'Ford:F-150,Chevrolet:Corvette'
      });

      const service2 = new GenericStateManagementService(
        routeState,
        router,
        dataService,
        requestCoordinator,
        domainConfig
      );

      service2.filters$.subscribe(filters => {
        expect(filters.selectedItems?.length).toBe(2);
        expect(filters.selectedItems![0].path).toEqual(['Ford', 'F-150']);
        expect(filters.selectedItems![1].path).toEqual(['Chevrolet', 'Corvette']);
      });
    });

    it('should parse column filters from URL', () => {
      routeState.getAllQueryParams.and.returnValue({
        bodyClass: 'Pickup',
        dataSource: 'NHTSA'
      });

      const service2 = new GenericStateManagementService(
        routeState,
        router,
        dataService,
        requestCoordinator,
        domainConfig
      );

      service2.filters$.subscribe(filters => {
        expect(filters.columnFilters?.bodyClass).toBe('Pickup');
        expect(filters.columnFilters?.dataSource).toBe('NHTSA');
      });
    });

    it('should parse range filters from URL', () => {
      routeState.getAllQueryParams.and.returnValue({
        yearMin: '2015',
        yearMax: '2020'
      });

      const service2 = new GenericStateManagementService(
        routeState,
        router,
        dataService,
        requestCoordinator,
        domainConfig
      );

      service2.filters$.subscribe(filters => {
        expect(filters.rangeFilters?.year?.min).toBe(2015);
        expect(filters.rangeFilters?.year?.max).toBe(2020);
      });
    });

    it('should parse sort params from URL', () => {
      routeState.getAllQueryParams.and.returnValue({
        sort: 'year',
        sortDirection: 'desc'
      });

      const service2 = new GenericStateManagementService(
        routeState,
        router,
        dataService,
        requestCoordinator,
        domainConfig
      );

      service2.filters$.subscribe(filters => {
        expect(filters.sort).toBe('year');
        expect(filters.sortDirection).toBe('desc');
      });
    });
  });

  describe('updateFilters', () => {
    beforeEach(() => {
      dataService.fetch.and.returnValue(
        of({
          results: [],
          total: 0,
          page: 1,
          size: 20,
          totalPages: 0
        })
      );

      requestCoordinator.executeRequest.and.callFake((key, request$) => request$);
    });

    it('should update filters and sync to URL', () => {
      service.updateFilters({
        page: 2,
        size: 50
      });

      expect(routeState.setQueryParam).toHaveBeenCalledWith('page', '2');
      expect(routeState.setQueryParam).toHaveBeenCalledWith('size', '50');
    });

    it('should trigger data fetch when filters have selectedItems', (done) => {
      service.updateFilters({
        selectedItems: [
          { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }
        ]
      });

      setTimeout(() => {
        expect(dataService.fetch).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should not trigger fetch without active filters', () => {
      service.updateFilters({
        page: 2
      });

      expect(dataService.fetch).not.toHaveBeenCalled();
    });

    it('should emit updated state', (done) => {
      service.updateFilters({ page: 3 });

      service.filters$.subscribe(filters => {
        if (filters.page === 3) {
          expect(filters.page).toBe(3);
          done();
        }
      });
    });
  });

  describe('fetchData', () => {
    beforeEach(() => {
      requestCoordinator.executeRequest.and.callFake((key, request$) => request$);
    });

    it('should fetch data and update results', (done) => {
      const mockResponse = {
        results: [
          {
            _meta: {
              id: '1',
              type: 'vehicle',
              source: 'NHTSA',
              timestamp: '2025-10-28T00:00:00Z'
            }
          }
        ],
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1
      };

      dataService.fetch.and.returnValue(of(mockResponse as any));

      service.updateFilters({
        selectedItems: [
          { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }
        ]
      });

      setTimeout(() => {
        service.results$.subscribe(results => {
          if (results.length > 0) {
            expect(results.length).toBe(1);
            done();
          }
        });
      }, 100);
    });

    it('should set loading state during fetch', (done) => {
      dataService.fetch.and.returnValue(of({
        results: [],
        total: 0,
        page: 1,
        size: 20,
        totalPages: 0
      }));

      const loadingStates: boolean[] = [];

      service.state$.subscribe(state => {
        loadingStates.push(state.loading);
      });

      service.updateFilters({
        selectedItems: [{ path: ['Ford'], display: 'Ford', level: 0 }]
      });

      setTimeout(() => {
        expect(loadingStates).toContain(true); // Should have been true during fetch
        done();
      }, 100);
    });

    it('should handle fetch errors', (done) => {
      dataService.fetch.and.returnValue(
        throwError(() => new Error('API error'))
      );

      service.updateFilters({
        selectedItems: [{ path: ['Ford'], display: 'Ford', level: 0 }]
      });

      setTimeout(() => {
        service.state$.subscribe(state => {
          if (state.error) {
            expect(state.error).toContain('Failed to fetch data');
            expect(state.loading).toBe(false);
            done();
          }
        });
      }, 100);
    });
  });

  describe('refreshData', () => {
    beforeEach(() => {
      dataService.fetch.and.returnValue(
        of({
          results: [],
          total: 0,
          page: 1,
          size: 20,
          totalPages: 0
        })
      );

      requestCoordinator.executeRequest.and.callFake((key, request$) => request$);
    });

    it('should refresh data with current filters', (done) => {
      service.updateFilters({
        selectedItems: [{ path: ['Ford'], display: 'Ford', level: 0 }],
        page: 2
      });

      setTimeout(() => {
        dataService.fetch.calls.reset();
        service.refreshData();

        setTimeout(() => {
          expect(dataService.fetch).toHaveBeenCalled();
          done();
        }, 50);
      }, 50);
    });
  });

  describe('hasActiveFilters', () => {
    it('should detect active filters', () => {
      expect((service as any).hasActiveFilters({ page: 1, size: 20 })).toBe(false);
      expect((service as any).hasActiveFilters({
        selectedItems: [{ path: ['Ford'], display: 'Ford', level: 0 }],
        page: 1,
        size: 20
      })).toBe(true);
    });
  });
});
