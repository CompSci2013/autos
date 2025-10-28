import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GenericDataService } from './generic-data.service';
import { DomainConfigService } from './domain-config.service';
import { ApiService } from '../api.service';
import { of } from 'rxjs';

describe('GenericDataService', () => {
  let service: GenericDataService;
  let domainConfigService: jasmine.SpyObj<DomainConfigService>;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const configSpy = jasmine.createSpyObj('DomainConfigService', [
      'getCurrentConfig',
      'getApiUrl',
      'getEndpoint'
    ]);
    const apiSpy = jasmine.createSpyObj('ApiService', [
      'getVehicleDetails',
      'getVehicleInstances',
      'getManufacturerModelCounts'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GenericDataService,
        { provide: DomainConfigService, useValue: configSpy },
        { provide: ApiService, useValue: apiSpy }
      ]
    });

    domainConfigService = TestBed.inject(DomainConfigService) as jasmine.SpyObj<DomainConfigService>;
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  describe('adapter selection (useGenericArchitecture = false)', () => {
    beforeEach(() => {
      // Mock environment flag as false
      const environment = require('../../environments/environment');
      spyOnProperty(environment.environment, 'useGenericArchitecture', 'get').and.returnValue(false);

      domainConfigService.getCurrentConfig.and.returnValue({
        domain: { id: 'vehicles', name: 'Vehicles', version: '1.0.0' }
      } as any);

      service = TestBed.inject(GenericDataService);
    });

    it('should use LegacyApiAdapter when flag is false', () => {
      expect((service as any).adapter.constructor.name).toBe('LegacyApiAdapter');
    });

    it('should delegate fetch to legacy adapter', (done) => {
      const mockResponse = {
        results: [],
        total: 0,
        page: 1,
        size: 20,
        totalPages: 0
      };

      apiService.getVehicleDetails.and.returnValue(of(mockResponse));

      const query = {
        filters: { page: 1, size: 20 }
      };

      service.fetch(query).subscribe(response => {
        expect(apiService.getVehicleDetails).toHaveBeenCalled();
        expect(response.results).toEqual([]);
        done();
      });
    });
  });

  describe('adapter selection (useGenericArchitecture = true, vehicles domain)', () => {
    beforeEach(() => {
      // Mock environment flag as true
      const environment = require('../../environments/environment');
      spyOnProperty(environment.environment, 'useGenericArchitecture', 'get').and.returnValue(true);

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

      service = TestBed.inject(GenericDataService);
    });

    it('should use VehiclesDomainAdapter when flag is true and domain is vehicles', () => {
      expect((service as any).adapter.constructor.name).toBe('VehiclesDomainAdapter');
    });
  });

  describe('adapter selection (useGenericArchitecture = true, aircraft domain)', () => {
    beforeEach(() => {
      // Mock environment flag as true
      const environment = require('../../environments/environment');
      spyOnProperty(environment.environment, 'useGenericArchitecture', 'get').and.returnValue(true);

      domainConfigService.getCurrentConfig.and.returnValue({
        domain: { id: 'aircraft', name: 'Aircraft', version: '1.0.0' },
        dataSource: {
          type: 'rest',
          endpoints: {
            search: '/api/aircraft/search',
            details: '/api/aircraft/details',
            instances: '/api/aircraft/instances',
            counts: '/api/aircraft/counts'
          }
        }
      } as any);

      domainConfigService.getApiUrl.and.returnValue('http://test-api.com/api/v1');
    });

    it('should throw error for unimplemented domain', () => {
      expect(() => {
        service = TestBed.inject(GenericDataService);
      }).toThrowError('Domain adapter not yet implemented: aircraft');
    });
  });

  describe('adapter selection (unknown domain)', () => {
    beforeEach(() => {
      const environment = require('../../environments/environment');
      spyOnProperty(environment.environment, 'useGenericArchitecture', 'get').and.returnValue(true);

      domainConfigService.getCurrentConfig.and.returnValue({
        domain: { id: 'unknown', name: 'Unknown', version: '1.0.0' },
        dataSource: {
          type: 'rest',
          endpoints: {}
        }
      } as any);
    });

    it('should throw error for unknown domain', () => {
      expect(() => {
        service = TestBed.inject(GenericDataService);
      }).toThrowError('No adapter available for domain: unknown');
    });
  });

  describe('fetch method delegation', () => {
    beforeEach(() => {
      const environment = require('../../environments/environment');
      spyOnProperty(environment.environment, 'useGenericArchitecture', 'get').and.returnValue(true);

      domainConfigService.getCurrentConfig.and.returnValue({
        domain: { id: 'vehicles', name: 'Vehicles', version: '1.0.0' },
        dataSource: {
          type: 'rest',
          endpoints: {
            details: '/api/vehicles/details',
            instances: '/api/vehicles/instances',
            counts: '/api/vehicles/counts'
          }
        }
      } as any);

      domainConfigService.getApiUrl.and.returnValue('http://test-api.com/api/v1');

      service = TestBed.inject(GenericDataService);
    });

    it('should delegate fetch to adapter', (done) => {
      const adapterSpy = spyOn((service as any).adapter, 'fetch').and.returnValue(
        of({
          results: [],
          total: 0,
          page: 1,
          size: 20,
          totalPages: 0
        })
      );

      const query = {
        filters: { page: 1, size: 20 }
      };

      service.fetch(query).subscribe(() => {
        expect(adapterSpy).toHaveBeenCalledWith(query);
        done();
      });
    });

    it('should delegate fetchInstances to adapter', (done) => {
      const adapterSpy = spyOn((service as any).adapter, 'fetchInstances').and.returnValue(
        of({
          entityId: 'test-id',
          instances: [],
          total: 0
        })
      );

      service.fetchInstances('test-id', 5).subscribe(() => {
        expect(adapterSpy).toHaveBeenCalledWith('test-id', 5);
        done();
      });
    });

    it('should delegate fetchAggregations to adapter', (done) => {
      const adapterSpy = spyOn((service as any).adapter, 'fetchAggregations').and.returnValue(
        of({
          aggregations: [],
          total: 0
        })
      );

      service.fetchAggregations().subscribe(() => {
        expect(adapterSpy).toHaveBeenCalled();
        done();
      });
    });
  });
});
