import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { VehiclesDomainAdapter } from './vehicles-domain.adapter';
import { DomainConfigService } from '../services/generic';
import { DataSourceQuery, DataSourceResponse } from '../models/generic';
import { VehicleResult } from '../models/vehicle-result.model';

describe('VehiclesDomainAdapter', () => {
  let adapter: VehiclesDomainAdapter;
  let httpMock: HttpTestingController;
  let domainConfigService: jasmine.SpyObj<DomainConfigService>;

  beforeEach(() => {
    const configSpy = jasmine.createSpyObj('DomainConfigService', [
      'getCurrentConfig',
      'getApiUrl'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        VehiclesDomainAdapter,
        { provide: DomainConfigService, useValue: configSpy }
      ]
    });

    adapter = TestBed.inject(VehiclesDomainAdapter);
    httpMock = TestBed.inject(HttpTestingController);
    domainConfigService = TestBed.inject(DomainConfigService) as jasmine.SpyObj<DomainConfigService>;

    // Default config mock
    domainConfigService.getCurrentConfig.and.returnValue({
      domain: { id: 'vehicles', name: 'Vehicles', version: '1.0.0' },
      dataSource: {
        type: 'rest',
        endpoints: {
          search: '/api/vehicles/search',
          details: '/api/vehicles/details',
          instances: '/api/vehicles/instances',
          counts: '/api/vehicles/counts'
        }
      }
    } as any);

    domainConfigService.getApiUrl.and.returnValue('http://test-api.com/api/v1');
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('fetch', () => {
    it('should fetch vehicle data', (done) => {
      const query: DataSourceQuery = {
        filters: {
          selectedItems: [
            { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }
          ],
          page: 1,
          size: 20
        }
      };

      const mockResponse = {
        results: [
          {
            manufacturer: 'Ford',
            model: 'F-150',
            year: 2020,
            body_class: 'Pickup',
            data_source: 'NHTSA',
            vehicle_id: 'test-id'
          }
        ],
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1
      };

      adapter.fetch(query).subscribe(response => {
        expect(response.results.length).toBe(1);
        expect(response.results[0]._meta).toBeDefined();
        expect(response.results[0]._meta.type).toBe('vehicle');
        expect((response.results[0] as any).manufacturer).toBe('Ford');
        done();
      });

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/details')
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should build query params for selected items', (done) => {
      const query: DataSourceQuery = {
        filters: {
          selectedItems: [
            { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 },
            { path: ['Chevrolet', 'Corvette'], display: 'Chevrolet Corvette', level: 1 }
          ],
          page: 1,
          size: 20
        }
      };

      adapter.fetch(query).subscribe();

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/details')
      );
      expect(req.request.params.get('models')).toBe('Ford:F-150,Chevrolet:Corvette');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
      done();
    });

    it('should include pagination params', (done) => {
      const query: DataSourceQuery = {
        filters: {
          page: 2,
          size: 50
        }
      };

      adapter.fetch(query).subscribe();

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/details')
      );
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('50');
      req.flush({ results: [], total: 0, page: 2, size: 50, totalPages: 0 });
      done();
    });

    it('should include sort params', (done) => {
      const query: DataSourceQuery = {
        filters: {
          page: 1,
          size: 20,
          sort: 'year',
          sortDirection: 'desc'
        }
      };

      adapter.fetch(query).subscribe();

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/details')
      );
      expect(req.request.params.get('sortBy')).toBe('year');
      expect(req.request.params.get('sortOrder')).toBe('desc');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
      done();
    });

    it('should include column filters', (done) => {
      const query: DataSourceQuery = {
        filters: {
          page: 1,
          size: 20,
          columnFilters: {
            bodyClass: 'Pickup',
            dataSource: 'NHTSA'
          }
        }
      };

      adapter.fetch(query).subscribe();

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/details')
      );
      expect(req.request.params.get('bodyClass')).toBe('Pickup');
      expect(req.request.params.get('dataSource')).toBe('NHTSA');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
      done();
    });

    it('should include range filters', (done) => {
      const query: DataSourceQuery = {
        filters: {
          page: 1,
          size: 20,
          rangeFilters: {
            year: { min: 2015, max: 2020 }
          }
        }
      };

      adapter.fetch(query).subscribe();

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/details')
      );
      expect(req.request.params.get('yearMin')).toBe('2015');
      expect(req.request.params.get('yearMax')).toBe('2020');
      req.flush({ results: [], total: 0, page: 1, size: 20, totalPages: 0 });
      done();
    });
  });

  describe('fetchInstances', () => {
    it('should fetch vehicle instances', (done) => {
      const entityId = 'test-vehicle-id';
      const count = 8;

      const mockResponse = {
        vehicle_id: entityId,
        instances: [
          {
            vin: '1HGBH41JXMN109186',
            state: 'CA',
            color: 'Blue'
          }
        ]
      };

      adapter.fetchInstances(entityId, count).subscribe(response => {
        expect(response.entityId).toBe(entityId);
        expect(response.instances.length).toBe(1);
        expect(response.instances[0]._meta).toBeDefined();
        expect((response.instances[0] as any).vin).toBe('1HGBH41JXMN109186');
        done();
      });

      const req = httpMock.expectOne(request =>
        request.url.includes(`/vehicles/instances/${entityId}`)
      );
      expect(req.request.params.get('count')).toBe('8');
      req.flush(mockResponse);
    });

    it('should use default count if not provided', (done) => {
      const entityId = 'test-vehicle-id';

      adapter.fetchInstances(entityId).subscribe();

      const req = httpMock.expectOne(request =>
        request.url.includes(`/vehicles/instances/${entityId}`)
      );
      expect(req.request.params.get('count')).toBe('8');
      req.flush({ vehicle_id: entityId, instances: [] });
      done();
    });
  });

  describe('fetchAggregations', () => {
    it('should fetch aggregations', (done) => {
      const mockResponse = {
        manufacturers: [
          {
            manufacturer: 'Ford',
            models: [
              { model: 'F-150', count: 100 },
              { model: 'Mustang', count: 50 }
            ]
          }
        ]
      };

      adapter.fetchAggregations().subscribe(response => {
        expect(response.aggregations.length).toBe(1);
        expect(response.aggregations[0].key).toBe('Ford');
        expect(response.aggregations[0].children?.length).toBe(2);
        expect(response.total).toBeGreaterThan(0);
        done();
      });

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/counts')
      );
      req.flush(mockResponse);
    });

    it('should transform nested structure correctly', (done) => {
      const mockResponse = {
        manufacturers: [
          {
            manufacturer: 'Ford',
            models: [
              { model: 'F-150', count: 100 }
            ]
          }
        ]
      };

      adapter.fetchAggregations().subscribe(response => {
        const ford = response.aggregations[0];
        expect(ford.key).toBe('Ford');
        expect(ford.label).toBe('Ford');
        expect(ford.children![0].key).toBe('F-150');
        expect(ford.children![0].count).toBe(100);
        done();
      });

      const req = httpMock.expectOne(request =>
        request.url.includes('/vehicles/counts')
      );
      req.flush(mockResponse);
    });
  });

  describe('transformEntity', () => {
    it('should transform raw vehicle to entity', () => {
      const raw = {
        manufacturer: 'Ford',
        model: 'F-150',
        year: 2020,
        body_class: 'Pickup',
        data_source: 'NHTSA',
        vehicle_id: 'test-id'
      };

      const entity = (adapter as any).transformEntity(raw);

      expect(entity._meta).toBeDefined();
      expect(entity._meta.id).toBe('test-id');
      expect(entity._meta.type).toBe('vehicle');
      expect(entity._meta.source).toBe('NHTSA');
      expect(entity.manufacturer).toBe('Ford');
    });
  });

  describe('transformInstance', () => {
    it('should transform raw instance to entity instance', () => {
      const raw = {
        vin: '1HGBH41JXMN109186',
        state: 'CA',
        color: 'Blue'
      };

      const instance = (adapter as any).transformInstance(raw, 'test-vehicle-id');

      expect(instance._meta).toBeDefined();
      expect(instance._meta.instanceId).toBe('1HGBH41JXMN109186');
      expect(instance._meta.entityId).toBe('test-vehicle-id');
      expect(instance.vin).toBe('1HGBH41JXMN109186');
    });
  });
});
