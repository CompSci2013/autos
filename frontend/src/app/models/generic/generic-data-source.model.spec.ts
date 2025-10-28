import {
  GenericDataSource,
  DataSourceQuery,
  DataSourceResponse,
  DataSourceInstancesResponse,
  DataSourceAggregationsResponse,
  AggregationBucket,
  DataSourceAdapterBase
} from './generic-data-source.model';
import { Entity, EntityInstance } from './entity.model';
import { DomainFilters } from './domain-filters.model';
import { Observable, of } from 'rxjs';

describe('Generic Data Source Model', () => {
  describe('DataSourceQuery interface', () => {
    it('should create valid query', () => {
      const query: DataSourceQuery = {
        filters: {
          page: 1,
          size: 20
        }
      };

      expect(query.filters.page).toBe(1);
      expect(query.filters.size).toBe(20);
    });

    it('should include optional cache config', () => {
      const query: DataSourceQuery = {
        filters: {
          page: 1,
          size: 20
        },
        cache: {
          enabled: true,
          ttl: 60000
        }
      };

      expect(query.cache?.enabled).toBe(true);
      expect(query.cache?.ttl).toBe(60000);
    });
  });

  describe('DataSourceResponse interface', () => {
    it('should create valid response', () => {
      interface TestEntity extends Entity {
        name: string;
      }

      const response: DataSourceResponse<TestEntity> = {
        results: [
          {
            name: 'Test',
            _meta: {
              id: '1',
              type: 'test',
              source: 'test',
              timestamp: '2025-10-28T00:00:00Z'
            }
          }
        ],
        total: 1,
        page: 1,
        size: 20,
        totalPages: 1
      };

      expect(response.results.length).toBe(1);
      expect(response.total).toBe(1);
      expect(response.totalPages).toBe(1);
    });
  });

  describe('DataSourceInstancesResponse interface', () => {
    it('should create valid instances response', () => {
      interface TestInstance extends EntityInstance {
        code: string;
      }

      const response: DataSourceInstancesResponse<TestInstance> = {
        entityId: 'entity-1',
        instances: [
          {
            code: 'TEST-001',
            _meta: {
              instanceId: 'inst-1',
              entityId: 'entity-1',
              timestamp: '2025-10-28T00:00:00Z'
            }
          }
        ],
        total: 1
      };

      expect(response.entityId).toBe('entity-1');
      expect(response.instances.length).toBe(1);
      expect(response.total).toBe(1);
    });
  });

  describe('DataSourceAggregationsResponse interface', () => {
    it('should create valid aggregations response', () => {
      const response: DataSourceAggregationsResponse = {
        aggregations: [
          {
            key: 'Ford',
            label: 'Ford',
            count: 100,
            children: [
              {
                key: 'F-150',
                label: 'F-150',
                count: 50
              }
            ]
          }
        ],
        total: 100
      };

      expect(response.aggregations.length).toBe(1);
      expect(response.aggregations[0].key).toBe('Ford');
      expect(response.aggregations[0].children?.length).toBe(1);
    });
  });

  describe('AggregationBucket interface', () => {
    it('should create simple bucket', () => {
      const bucket: AggregationBucket = {
        key: 'Ford',
        label: 'Ford',
        count: 100
      };

      expect(bucket.key).toBe('Ford');
      expect(bucket.count).toBe(100);
    });

    it('should support nested children', () => {
      const bucket: AggregationBucket = {
        key: 'Ford',
        label: 'Ford',
        count: 100,
        children: [
          {
            key: 'F-150',
            label: 'F-150',
            count: 50
          },
          {
            key: 'Mustang',
            label: 'Mustang',
            count: 30
          }
        ]
      };

      expect(bucket.children?.length).toBe(2);
      expect(bucket.children![0].key).toBe('F-150');
    });

    it('should support deep nesting', () => {
      const bucket: AggregationBucket = {
        key: 'Boeing',
        label: 'Boeing',
        count: 200,
        children: [
          {
            key: '737',
            label: '737',
            count: 150,
            children: [
              {
                key: '737-800',
                label: '737-800',
                count: 100
              }
            ]
          }
        ]
      };

      expect(bucket.children![0].children?.length).toBe(1);
      expect(bucket.children![0].children![0].key).toBe('737-800');
    });
  });

  describe('DataSourceAdapterBase', () => {
    class TestAdapter extends DataSourceAdapterBase<Entity, EntityInstance> {
      fetch(query: DataSourceQuery): Observable<DataSourceResponse<Entity>> {
        return of({
          results: [],
          total: 0,
          page: 1,
          size: 20,
          totalPages: 0
        });
      }

      fetchInstances(entityId: string, count?: number): Observable<DataSourceInstancesResponse<EntityInstance>> {
        return of({
          entityId,
          instances: [],
          total: 0
        });
      }

      fetchAggregations(filters?: DomainFilters): Observable<DataSourceAggregationsResponse> {
        return of({
          aggregations: [],
          total: 0
        });
      }
    }

    it('should create adapter instance', () => {
      const adapter = new TestAdapter();
      expect(adapter).toBeDefined();
    });

    it('should implement fetch method', (done) => {
      const adapter = new TestAdapter();
      const query: DataSourceQuery = {
        filters: { page: 1, size: 20 }
      };

      adapter.fetch(query).subscribe(response => {
        expect(response.results).toEqual([]);
        expect(response.total).toBe(0);
        done();
      });
    });

    it('should implement fetchInstances method', (done) => {
      const adapter = new TestAdapter();

      adapter.fetchInstances('entity-1', 5).subscribe(response => {
        expect(response.entityId).toBe('entity-1');
        expect(response.instances).toEqual([]);
        done();
      });
    });

    it('should implement fetchAggregations method', (done) => {
      const adapter = new TestAdapter();

      adapter.fetchAggregations().subscribe(response => {
        expect(response.aggregations).toEqual([]);
        expect(response.total).toBe(0);
        done();
      });
    });
  });

  describe('GenericDataSource interface', () => {
    class MockDataSource implements GenericDataSource<Entity, EntityInstance> {
      fetch(query: DataSourceQuery): Observable<DataSourceResponse<Entity>> {
        return of({
          results: [],
          total: 0,
          page: query.filters.page || 1,
          size: query.filters.size || 20,
          totalPages: 0
        });
      }

      fetchInstances(entityId: string, count?: number): Observable<DataSourceInstancesResponse<EntityInstance>> {
        return of({
          entityId,
          instances: [],
          total: 0
        });
      }

      fetchAggregations(filters?: DomainFilters): Observable<DataSourceAggregationsResponse> {
        return of({
          aggregations: [],
          total: 0
        });
      }
    }

    it('should implement all required methods', () => {
      const dataSource = new MockDataSource();

      expect(typeof dataSource.fetch).toBe('function');
      expect(typeof dataSource.fetchInstances).toBe('function');
      expect(typeof dataSource.fetchAggregations).toBe('function');
    });

    it('should return observables', () => {
      const dataSource = new MockDataSource();

      const fetchResult = dataSource.fetch({ filters: { page: 1, size: 20 } });
      expect(fetchResult).toBeInstanceOf(Observable);

      const instancesResult = dataSource.fetchInstances('entity-1');
      expect(instancesResult).toBeInstanceOf(Observable);

      const aggsResult = dataSource.fetchAggregations();
      expect(aggsResult).toBeInstanceOf(Observable);
    });
  });
});
