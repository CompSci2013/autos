import { TestBed } from '@angular/core/testing';
import { TableStatePersistenceService, TablePreferences } from './table-state-persistence.service';

describe('TableStatePersistenceService - UI Preferences Persistence', () => {
  let service: TableStatePersistenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TableStatePersistenceService],
    });
    service = TestBed.inject(TableStatePersistenceService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should use correct storage prefix', () => {
      const preferences: TablePreferences = {
        columnOrder: ['col1', 'col2'],
        visibleColumns: ['col1'],
      };

      service.savePreferences('testTable', preferences);

      const key = localStorage.key(0);
      expect(key).toContain('autos-table-');
      expect(key).toContain('testTable');
    });
  });

  describe('URL-First Principle: Storage Layer Separation', () => {
    it('should store UI preferences in localStorage, NOT URL', () => {
      const preferences: TablePreferences = {
        columnOrder: ['manufacturer', 'model', 'year'],
        visibleColumns: ['manufacturer', 'model'],
      };

      service.savePreferences('vehicleTable', preferences);

      // Should be in localStorage
      const stored = localStorage.getItem('autos-table-vehicleTable-preferences');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(preferences);
    });

    it('should persist column order separately from query state', () => {
      const preferences: TablePreferences = {
        columnOrder: ['year', 'manufacturer', 'model'], // Custom order
        visibleColumns: ['year', 'manufacturer', 'model'],
      };

      service.savePreferences('resultsTable', preferences);

      const loaded = service.loadPreferences('resultsTable');
      expect(loaded?.columnOrder).toEqual(['year', 'manufacturer', 'model']);
    });

    it('should persist column visibility separately from query state', () => {
      const preferences: TablePreferences = {
        columnOrder: ['manufacturer', 'model', 'year', 'bodyClass'],
        visibleColumns: ['manufacturer', 'model'], // Only 2 visible
      };

      service.savePreferences('resultsTable', preferences);

      const loaded = service.loadPreferences('resultsTable');
      expect(loaded?.visibleColumns).toEqual(['manufacturer', 'model']);
      expect(loaded?.visibleColumns.length).toBe(2);
    });

    it('should persist page size preference separately from URL page param', () => {
      const preferences: TablePreferences = {
        columnOrder: ['col1'],
        visibleColumns: ['col1'],
        pageSize: 50, // User's preferred default
      };

      service.savePreferences('myTable', preferences);

      const loaded = service.loadPreferences('myTable');
      expect(loaded?.pageSize).toBe(50);
    });
  });

  describe('Save Preferences', () => {
    it('should save basic preferences to localStorage', () => {
      const preferences: TablePreferences = {
        columnOrder: ['col1', 'col2', 'col3'],
        visibleColumns: ['col1', 'col2'],
      };

      service.savePreferences('table1', preferences);

      const stored = localStorage.getItem('autos-table-table1-preferences');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(preferences);
    });

    it('should save preferences with page size', () => {
      const preferences: TablePreferences = {
        columnOrder: ['a', 'b'],
        visibleColumns: ['a'],
        pageSize: 100,
      };

      service.savePreferences('table2', preferences);

      const loaded = service.loadPreferences('table2');
      expect(loaded?.pageSize).toBe(100);
    });

    it('should save preferences with timestamp', () => {
      const timestamp = Date.now();
      const preferences: TablePreferences = {
        columnOrder: ['x'],
        visibleColumns: ['x'],
        lastUpdated: timestamp,
      };

      service.savePreferences('table3', preferences);

      const loaded = service.loadPreferences('table3');
      expect(loaded?.lastUpdated).toBe(timestamp);
    });

    it('should overwrite existing preferences', () => {
      const oldPrefs: TablePreferences = {
        columnOrder: ['old1', 'old2'],
        visibleColumns: ['old1'],
      };

      const newPrefs: TablePreferences = {
        columnOrder: ['new1', 'new2', 'new3'],
        visibleColumns: ['new1', 'new2'],
      };

      service.savePreferences('table4', oldPrefs);
      service.savePreferences('table4', newPrefs);

      const loaded = service.loadPreferences('table4');
      expect(loaded?.columnOrder).toEqual(['new1', 'new2', 'new3']);
    });

    it('should handle multiple tables independently', () => {
      const prefs1: TablePreferences = {
        columnOrder: ['a1'],
        visibleColumns: ['a1'],
      };

      const prefs2: TablePreferences = {
        columnOrder: ['b1', 'b2'],
        visibleColumns: ['b1'],
      };

      service.savePreferences('tableA', prefs1);
      service.savePreferences('tableB', prefs2);

      const loadedA = service.loadPreferences('tableA');
      const loadedB = service.loadPreferences('tableB');

      expect(loadedA?.columnOrder).toEqual(['a1']);
      expect(loadedB?.columnOrder).toEqual(['b1', 'b2']);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

      const preferences: TablePreferences = {
        columnOrder: ['col1'],
        visibleColumns: ['col1'],
      };

      // Should not throw
      expect(() => {
        service.savePreferences('table5', preferences);
      }).not.toThrow();
    });
  });

  describe('Load Preferences', () => {
    it('should load saved preferences', () => {
      const preferences: TablePreferences = {
        columnOrder: ['manufacturer', 'model', 'year'],
        visibleColumns: ['manufacturer', 'model'],
        pageSize: 50,
      };

      service.savePreferences('vehicleTable', preferences);

      const loaded = service.loadPreferences('vehicleTable');
      expect(loaded).toEqual(preferences);
    });

    it('should return null when no preferences exist', () => {
      const loaded = service.loadPreferences('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('autos-table-corrupt-preferences', 'not valid json {');

      const loaded = service.loadPreferences('corrupt');
      expect(loaded).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      spyOn(localStorage, 'getItem').and.throwError('SecurityError');

      const loaded = service.loadPreferences('table6');
      expect(loaded).toBeNull();
    });

    it('should parse complex preferences correctly', () => {
      const preferences: TablePreferences = {
        columnOrder: ['col1', 'col2', 'col3', 'col4', 'col5'],
        visibleColumns: ['col1', 'col3', 'col5'],
        pageSize: 20,
        lastUpdated: 1234567890,
      };

      service.savePreferences('complexTable', preferences);

      const loaded = service.loadPreferences('complexTable');
      expect(loaded?.columnOrder.length).toBe(5);
      expect(loaded?.visibleColumns.length).toBe(3);
      expect(loaded?.pageSize).toBe(20);
      expect(loaded?.lastUpdated).toBe(1234567890);
    });
  });

  describe('Reset Preferences', () => {
    it('should remove preferences from localStorage', () => {
      const preferences: TablePreferences = {
        columnOrder: ['col1'],
        visibleColumns: ['col1'],
      };

      service.savePreferences('table7', preferences);
      expect(service.loadPreferences('table7')).toBeTruthy();

      service.resetPreferences('table7');
      expect(service.loadPreferences('table7')).toBeNull();
    });

    it('should not affect other tables when resetting', () => {
      const prefs1: TablePreferences = {
        columnOrder: ['a'],
        visibleColumns: ['a'],
      };

      const prefs2: TablePreferences = {
        columnOrder: ['b'],
        visibleColumns: ['b'],
      };

      service.savePreferences('tableX', prefs1);
      service.savePreferences('tableY', prefs2);

      service.resetPreferences('tableX');

      expect(service.loadPreferences('tableX')).toBeNull();
      expect(service.loadPreferences('tableY')).toBeTruthy();
    });

    it('should handle reset of non-existent table gracefully', () => {
      expect(() => {
        service.resetPreferences('doesNotExist');
      }).not.toThrow();
    });

    it('should handle localStorage errors gracefully', () => {
      spyOn(localStorage, 'removeItem').and.throwError('SecurityError');

      expect(() => {
        service.resetPreferences('table8');
      }).not.toThrow();
    });
  });

  describe('Export Preferences', () => {
    it('should export preferences as formatted JSON string', () => {
      const preferences: TablePreferences = {
        columnOrder: ['manufacturer', 'model'],
        visibleColumns: ['manufacturer'],
      };

      service.savePreferences('exportTable', preferences);

      const exported = service.exportPreferences('exportTable');
      expect(exported).toBeTruthy();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported!);
      expect(parsed).toEqual(preferences);
    });

    it('should return null for non-existent table', () => {
      const exported = service.exportPreferences('noSuchTable');
      expect(exported).toBeNull();
    });

    it('should export with pretty formatting (2-space indent)', () => {
      const preferences: TablePreferences = {
        columnOrder: ['a', 'b'],
        visibleColumns: ['a'],
      };

      service.savePreferences('prettyTable', preferences);

      const exported = service.exportPreferences('prettyTable');
      expect(exported).toContain('\n');
      expect(exported).toContain('  '); // 2-space indent
    });
  });

  describe('Import Preferences', () => {
    it('should import preferences from JSON string', () => {
      const preferences: TablePreferences = {
        columnOrder: ['col1', 'col2'],
        visibleColumns: ['col1'],
      };

      const json = JSON.stringify(preferences);
      const success = service.importPreferences('importTable', json);

      expect(success).toBe(true);

      const loaded = service.loadPreferences('importTable');
      expect(loaded).toEqual(preferences);
    });

    it('should import preferences with all optional fields', () => {
      const preferences: TablePreferences = {
        columnOrder: ['a', 'b', 'c'],
        visibleColumns: ['a', 'b'],
        pageSize: 100,
        lastUpdated: 9876543210,
      };

      const json = JSON.stringify(preferences);
      service.importPreferences('fullImport', json);

      const loaded = service.loadPreferences('fullImport');
      expect(loaded?.pageSize).toBe(100);
      expect(loaded?.lastUpdated).toBe(9876543210);
    });

    it('should return false for invalid JSON', () => {
      const success = service.importPreferences('badImport', 'not valid json {');
      expect(success).toBe(false);
    });

    it('should return false for empty string', () => {
      const success = service.importPreferences('emptyImport', '');
      expect(success).toBe(false);
    });

    it('should handle malformed JSON gracefully', () => {
      const success = service.importPreferences('malformed', '{incomplete:');
      expect(success).toBe(false);

      const loaded = service.loadPreferences('malformed');
      expect(loaded).toBeNull();
    });

    it('should overwrite existing preferences on import', () => {
      const oldPrefs: TablePreferences = {
        columnOrder: ['old'],
        visibleColumns: ['old'],
      };

      const newPrefs: TablePreferences = {
        columnOrder: ['new1', 'new2'],
        visibleColumns: ['new1'],
      };

      service.savePreferences('overwriteTable', oldPrefs);

      const json = JSON.stringify(newPrefs);
      service.importPreferences('overwriteTable', json);

      const loaded = service.loadPreferences('overwriteTable');
      expect(loaded?.columnOrder).toEqual(['new1', 'new2']);
    });
  });

  describe('Storage Key Generation', () => {
    it('should generate consistent keys for same table ID', () => {
      const prefs: TablePreferences = {
        columnOrder: ['a'],
        visibleColumns: ['a'],
      };

      service.savePreferences('consistentTable', prefs);
      service.savePreferences('consistentTable', prefs);

      // Should have exactly 1 key in localStorage
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('consistentTable')) {
          count++;
        }
      }

      expect(count).toBe(1);
    });

    it('should generate different keys for different table IDs', () => {
      const prefs: TablePreferences = {
        columnOrder: ['a'],
        visibleColumns: ['a'],
      };

      service.savePreferences('table1', prefs);
      service.savePreferences('table2', prefs);

      const keys = Object.keys(localStorage);
      expect(keys.length).toBe(2);
      expect(keys.some((k) => k.includes('table1'))).toBe(true);
      expect(keys.some((k) => k.includes('table2'))).toBe(true);
    });

    it('should include table ID in storage key', () => {
      const prefs: TablePreferences = {
        columnOrder: ['a'],
        visibleColumns: ['a'],
      };

      service.savePreferences('mySpecialTable', prefs);

      const keys = Object.keys(localStorage);
      expect(keys[0]).toContain('mySpecialTable');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty column arrays', () => {
      const preferences: TablePreferences = {
        columnOrder: [],
        visibleColumns: [],
      };

      service.savePreferences('emptyTable', preferences);

      const loaded = service.loadPreferences('emptyTable');
      expect(loaded?.columnOrder).toEqual([]);
      expect(loaded?.visibleColumns).toEqual([]);
    });

    it('should handle very long column lists', () => {
      const longList = Array.from({ length: 100 }, (_, i) => `col${i}`);
      const preferences: TablePreferences = {
        columnOrder: longList,
        visibleColumns: longList.slice(0, 50),
      };

      service.savePreferences('longTable', preferences);

      const loaded = service.loadPreferences('longTable');
      expect(loaded?.columnOrder.length).toBe(100);
      expect(loaded?.visibleColumns.length).toBe(50);
    });

    it('should handle special characters in table ID', () => {
      const preferences: TablePreferences = {
        columnOrder: ['a'],
        visibleColumns: ['a'],
      };

      service.savePreferences('table-with-dashes_and_underscores', preferences);

      const loaded = service.loadPreferences('table-with-dashes_and_underscores');
      expect(loaded).toEqual(preferences);
    });

    it('should handle preferences with only required fields', () => {
      const minimalPrefs: TablePreferences = {
        columnOrder: ['col1'],
        visibleColumns: ['col1'],
      };

      service.savePreferences('minimalTable', minimalPrefs);

      const loaded = service.loadPreferences('minimalTable');
      expect(loaded?.pageSize).toBeUndefined();
      expect(loaded?.lastUpdated).toBeUndefined();
    });

    it('should preserve column order exactly as provided', () => {
      const preferences: TablePreferences = {
        columnOrder: ['z', 'a', 'm', 'b'], // Not alphabetically sorted
        visibleColumns: ['z', 'm'],
      };

      service.savePreferences('orderTable', preferences);

      const loaded = service.loadPreferences('orderTable');
      expect(loaded?.columnOrder).toEqual(['z', 'a', 'm', 'b']);
    });
  });

  describe('Round-Trip Integrity', () => {
    it('should preserve data through save/load cycle', () => {
      const original: TablePreferences = {
        columnOrder: ['manufacturer', 'model', 'year', 'bodyClass'],
        visibleColumns: ['manufacturer', 'model', 'year'],
        pageSize: 50,
        lastUpdated: Date.now(),
      };

      service.savePreferences('roundTripTable', original);
      const loaded = service.loadPreferences('roundTripTable');

      expect(loaded).toEqual(original);
    });

    it('should preserve data through export/import cycle', () => {
      const original: TablePreferences = {
        columnOrder: ['a', 'b', 'c'],
        visibleColumns: ['a', 'b'],
        pageSize: 100,
      };

      service.savePreferences('exportImportTable', original);
      const exported = service.exportPreferences('exportImportTable');

      service.resetPreferences('exportImportTable');
      service.importPreferences('exportImportTable', exported!);

      const loaded = service.loadPreferences('exportImportTable');
      expect(loaded).toEqual(original);
    });
  });
});
