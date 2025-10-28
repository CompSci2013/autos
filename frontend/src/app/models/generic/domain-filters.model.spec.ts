import {
  DomainFilters,
  ColumnFilters,
  RangeFilters,
  RangeFilter,
  AppState,
  FilterMetadata,
  createEmptyFilters,
  createEmptyAppState,
  hasActiveFilters
} from './domain-filters.model';
import { Entity } from './entity.model';

describe('Domain Filters Model', () => {
  describe('DomainFilters interface', () => {
    it('should create valid filters with all fields', () => {
      const filters: DomainFilters = {
        selectedItems: [
          { path: ['Ford', 'F-150'], display: 'Ford F-150', level: 1 }
        ],
        columnFilters: {
          bodyClass: 'Pickup',
          dataSource: 'NHTSA'
        },
        rangeFilters: {
          year: { min: 2015, max: 2020 }
        },
        textSearch: 'Ford',
        page: 1,
        size: 20,
        sort: 'year',
        sortDirection: 'desc'
      };

      expect(filters.selectedItems?.length).toBe(1);
      expect(filters.columnFilters?.bodyClass).toBe('Pickup');
      expect(filters.rangeFilters?.year?.min).toBe(2015);
      expect(filters.page).toBe(1);
      expect(filters.sort).toBe('year');
    });

    it('should allow partial filters', () => {
      const filters: DomainFilters = {
        page: 1,
        size: 20
      };

      expect(filters.page).toBe(1);
      expect(filters.selectedItems).toBeUndefined();
      expect(filters.columnFilters).toBeUndefined();
    });
  });

  describe('RangeFilter interface', () => {
    it('should create range filter with min and max', () => {
      const range: RangeFilter = {
        min: 2015,
        max: 2020
      };

      expect(range.min).toBe(2015);
      expect(range.max).toBe(2020);
    });

    it('should allow optional min', () => {
      const range: RangeFilter = {
        max: 2020
      };

      expect(range.min).toBeUndefined();
      expect(range.max).toBe(2020);
    });

    it('should allow optional max', () => {
      const range: RangeFilter = {
        min: 2015
      };

      expect(range.min).toBe(2015);
      expect(range.max).toBeUndefined();
    });
  });

  describe('AppState interface', () => {
    it('should create valid app state', () => {
      interface TestEntity extends Entity {
        name: string;
      }

      const state: AppState<TestEntity> = {
        filters: {
          page: 1,
          size: 20
        },
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
        loading: false,
        error: null
      };

      expect(state.results.length).toBe(1);
      expect(state.total).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('should handle loading state', () => {
      const state: AppState = {
        filters: { page: 1, size: 20 },
        results: [],
        total: 0,
        loading: true,
        error: null
      };

      expect(state.loading).toBe(true);
      expect(state.results.length).toBe(0);
    });

    it('should handle error state', () => {
      const state: AppState = {
        filters: { page: 1, size: 20 },
        results: [],
        total: 0,
        loading: false,
        error: 'Failed to load data'
      };

      expect(state.error).toBe('Failed to load data');
      expect(state.loading).toBe(false);
    });
  });

  describe('FilterMetadata interface', () => {
    it('should create filter metadata', () => {
      const metadata: FilterMetadata = {
        key: 'year',
        label: 'Year',
        type: 'range',
        enabled: true,
        visible: true
      };

      expect(metadata.key).toBe('year');
      expect(metadata.type).toBe('range');
      expect(metadata.enabled).toBe(true);
    });

    it('should allow options', () => {
      const metadata: FilterMetadata = {
        key: 'bodyClass',
        label: 'Body Class',
        type: 'select',
        enabled: true,
        visible: true,
        options: ['Sedan', 'Pickup', 'SUV']
      };

      expect(metadata.options).toEqual(['Sedan', 'Pickup', 'SUV']);
    });
  });

  describe('createEmptyFilters helper', () => {
    it('should create empty filters with defaults', () => {
      const filters = createEmptyFilters();

      expect(filters.page).toBe(1);
      expect(filters.size).toBe(20);
      expect(filters.selectedItems).toEqual([]);
      expect(filters.columnFilters).toEqual({});
      expect(filters.rangeFilters).toEqual({});
      expect(filters.textSearch).toBe('');
      expect(filters.sort).toBeUndefined();
      expect(filters.sortDirection).toBeUndefined();
    });
  });

  describe('createEmptyAppState helper', () => {
    it('should create empty app state', () => {
      const state = createEmptyAppState();

      expect(state.filters.page).toBe(1);
      expect(state.results).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('hasActiveFilters helper', () => {
    it('should return true when selectedItems exist', () => {
      const filters: DomainFilters = {
        selectedItems: [
          { path: ['Ford'], display: 'Ford', level: 0 }
        ],
        page: 1,
        size: 20
      };

      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when columnFilters exist', () => {
      const filters: DomainFilters = {
        columnFilters: {
          bodyClass: 'Pickup'
        },
        page: 1,
        size: 20
      };

      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when rangeFilters exist', () => {
      const filters: DomainFilters = {
        rangeFilters: {
          year: { min: 2015 }
        },
        page: 1,
        size: 20
      };

      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when textSearch exists', () => {
      const filters: DomainFilters = {
        textSearch: 'Ford',
        page: 1,
        size: 20
      };

      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return false when no active filters', () => {
      const filters: DomainFilters = {
        page: 1,
        size: 20
      };

      expect(hasActiveFilters(filters)).toBe(false);
    });

    it('should return false when filters are empty', () => {
      const filters: DomainFilters = {
        selectedItems: [],
        columnFilters: {},
        rangeFilters: {},
        textSearch: '',
        page: 1,
        size: 20
      };

      expect(hasActiveFilters(filters)).toBe(false);
    });
  });
});
