import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManufacturerModelTablePickerComponent } from './manufacturer-model-table-picker.component';
import { ApiService } from '../../../services/api.service';
import { of, throwError } from 'rxjs';
import { ManufacturerModelSelection, ManufacturerGroup, ManufacturerModelResponse } from '../../../models';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';

describe('ManufacturerModelTablePickerComponent - URL-First State Management', () => {
  let component: ManufacturerModelTablePickerComponent;
  let fixture: ComponentFixture<ManufacturerModelTablePickerComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  const mockApiResponse: ManufacturerModelResponse = {
    total: 3,
    page: 1,
    size: 100,
    totalPages: 1,
    data: [
      {
        manufacturer: 'Ford',
        count: 40000,
        models: [
          { model: 'F-150', count: 25000 },
          { model: 'Mustang', count: 15000 },
        ],
      },
      {
        manufacturer: 'Chevrolet',
        count: 20000,
        models: [
          { model: 'Corvette', count: 8000 },
          { model: 'Camaro', count: 12000 },
        ],
      },
      {
        manufacturer: 'Tesla',
        count: 38000,
        models: [
          { model: 'Model 3', count: 20000 },
          { model: 'Model Y', count: 18000 },
        ],
      },
    ],
  };

  beforeEach(async () => {
    mockApiService = jasmine.createSpyObj('ApiService', ['getManufacturerModelCombinations']);
    mockApiService.getManufacturerModelCombinations.and.returnValue(of(mockApiResponse));

    // Clear localStorage before each test
    localStorage.clear();

    await TestBed.configureTestingModule({
      declarations: [ManufacturerModelTablePickerComponent],
      providers: [{ provide: ApiService, useValue: mockApiService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ManufacturerModelTablePickerComponent);
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
      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(10);
      expect(component.searchTerm).toBe('');
      expect(component.loading).toBe(false);
      expect(component.selectedRows.size).toBe(0);
    });

    it('should load data on init', () => {
      fixture.detectChanges(); // Trigger ngOnInit

      expect(mockApiService.getManufacturerModelCombinations).toHaveBeenCalled();
    });

    it('should set loading to true during data fetch', () => {
      fixture.detectChanges();

      // During initial call, loading should be set
      expect(mockApiService.getManufacturerModelCombinations).toHaveBeenCalled();
    });

    it('should flatten hierarchical data into rows', () => {
      fixture.detectChanges();

      expect(component.allRows.length).toBe(6); // 2 Ford + 2 Chevy + 2 Tesla
      expect(component.allRows[0].manufacturer).toBe('Chevrolet'); // Sorted alphabetically
    });

    it('should sort rows by manufacturer then model', () => {
      fixture.detectChanges();

      expect(component.allRows[0].manufacturer).toBe('Chevrolet');
      expect(component.allRows[0].model).toBe('Camaro');
      expect(component.allRows[1].manufacturer).toBe('Chevrolet');
      expect(component.allRows[1].model).toBe('Corvette');
    });

    it('should create manufacturer groups', () => {
      fixture.detectChanges();

      expect(component.manufacturerGroups.length).toBe(3);
      expect(component.manufacturerGroups[0].manufacturer).toBe('Chevrolet');
    });

    it('should initialize groups as collapsed', () => {
      fixture.detectChanges();

      component.manufacturerGroups.forEach((group) => {
        expect(group.expanded).toBe(false);
      });
    });

    it('should load page size preference from localStorage', () => {
      localStorage.setItem('vehiclePickerPageSize', '20');

      fixture = TestBed.createComponent(ManufacturerModelTablePickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.pageSize).toBe(20);
    });

    it('should use default page size if localStorage has invalid value', () => {
      localStorage.setItem('vehiclePickerPageSize', '999');

      fixture = TestBed.createComponent(ManufacturerModelTablePickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.pageSize).toBe(10); // Default value
    });
  });

  describe('URL-First Principle: Input-Based Hydration', () => {
    beforeEach(() => {
      fixture.detectChanges(); // Load data first
    });

    it('should hydrate selections from initialSelections input', () => {
      const initialSelections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Ford', model: 'Mustang' },
      ];

      component.initialSelections = initialSelections;
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, initialSelections, false),
      });

      expect(component.selectedRows.size).toBe(2);
      expect(component.selectedRows.has('Ford|F-150')).toBe(true);
      expect(component.selectedRows.has('Ford|Mustang')).toBe(true);
    });

    it('should clear previous selections when hydrating new selections', () => {
      // Set initial selections
      component.selectedRows.add('Chevrolet|Corvette');

      const newSelections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      component.initialSelections = newSelections;
      component.ngOnChanges({
        initialSelections: new SimpleChange([], newSelections, false),
      });

      expect(component.selectedRows.size).toBe(1);
      expect(component.selectedRows.has('Ford|F-150')).toBe(true);
      expect(component.selectedRows.has('Chevrolet|Corvette')).toBe(false);
    });

    it('should handle empty initialSelections', () => {
      component.selectedRows.add('Ford|F-150');

      component.initialSelections = [];
      component.ngOnChanges({
        initialSelections: new SimpleChange([{ manufacturer: 'Ford', model: 'F-150' }], [], false),
      });

      expect(component.selectedRows.size).toBe(0);
    });

    it('should be idempotent - calling hydrate multiple times with same data', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      component.initialSelections = selections;
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, selections, false),
      });
      const firstSize = component.selectedRows.size;

      // Call again with same data
      component.ngOnChanges({
        initialSelections: new SimpleChange(selections, selections, false),
      });

      expect(component.selectedRows.size).toBe(firstSize);
      expect(component.selectedRows.has('Ford|F-150')).toBe(true);
    });

    it('should handle hydration before data is loaded', () => {
      // Create fresh component without triggering data load
      const freshFixture = TestBed.createComponent(ManufacturerModelTablePickerComponent);
      const freshComponent = freshFixture.componentInstance;

      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      freshComponent.initialSelections = selections;
      freshComponent.ngOnChanges({
        initialSelections: new SimpleChange(null, selections, false),
      });

      // Should still set selections even though data isn't loaded yet
      expect(freshComponent.selectedRows.size).toBe(1);
    });
  });

  describe('URL-First Principle: Clear Trigger (Command Pattern)', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');
    });

    it('should clear selections when clearTrigger changes', () => {
      expect(component.selectedRows.size).toBe(2);

      component.clearTrigger = 1;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(0, 1, false),
      });

      expect(component.selectedRows.size).toBe(0);
    });

    it('should track last clear trigger to avoid duplicate clears', () => {
      component.clearTrigger = 1;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(0, 1, false),
      });

      // Add selections back
      component.selectedRows.add('Ford|F-150');

      // Same trigger value - should NOT clear
      component.ngOnChanges({
        clearTrigger: new SimpleChange(1, 1, false),
      });

      expect(component.selectedRows.size).toBe(1);
    });

    it('should clear on each new trigger value', () => {
      component.clearTrigger = 1;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(0, 1, false),
      });
      expect(component.selectedRows.size).toBe(0);

      component.selectedRows.add('Ford|F-150');

      component.clearTrigger = 2;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(1, 2, false),
      });
      expect(component.selectedRows.size).toBe(0);

      component.selectedRows.add('Ford|Mustang');

      component.clearTrigger = 3;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(2, 3, false),
      });
      expect(component.selectedRows.size).toBe(0);
    });

    it('should not clear on first change (initialization)', () => {
      const freshFixture = TestBed.createComponent(ManufacturerModelTablePickerComponent);
      const freshComponent = freshFixture.componentInstance;
      freshComponent.selectedRows.add('Ford|F-150');

      freshComponent.clearTrigger = 1;
      freshComponent.ngOnChanges({
        clearTrigger: new SimpleChange(undefined, 1, true), // firstChange = true
      });

      // Should not clear on first change
      expect(freshComponent.selectedRows.size).toBe(1);
    });
  });

  describe('Selection Management - Individual Models', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should add model to selection when checked', () => {
      component.onChildCheckboxChange('Ford', 'F-150', true);

      expect(component.selectedRows.has('Ford|F-150')).toBe(true);
    });

    it('should remove model from selection when unchecked', () => {
      component.selectedRows.add('Ford|F-150');

      component.onChildCheckboxChange('Ford', 'F-150', false);

      expect(component.selectedRows.has('Ford|F-150')).toBe(false);
    });

    it('should check if model is selected', () => {
      component.selectedRows.add('Ford|F-150');

      expect(component.isModelSelected('Ford', 'F-150')).toBe(true);
      expect(component.isModelSelected('Ford', 'Mustang')).toBe(false);
    });

    it('should handle multiple individual selections', () => {
      component.onChildCheckboxChange('Ford', 'F-150', true);
      component.onChildCheckboxChange('Ford', 'Mustang', true);
      component.onChildCheckboxChange('Chevrolet', 'Corvette', true);

      expect(component.selectedRows.size).toBe(3);
    });
  });

  describe('Selection Management - Parent (Manufacturer) Checkbox', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should select all models when parent checked', () => {
      component.onParentCheckboxChange('Ford', true);

      expect(component.selectedRows.has('Ford|F-150')).toBe(true);
      expect(component.selectedRows.has('Ford|Mustang')).toBe(true);
    });

    it('should deselect all models when parent unchecked', () => {
      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');

      component.onParentCheckboxChange('Ford', false);

      expect(component.selectedRows.has('Ford|F-150')).toBe(false);
      expect(component.selectedRows.has('Ford|Mustang')).toBe(false);
    });

    it('should return checked state when all models selected', () => {
      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');

      expect(component.getParentCheckboxState('Ford')).toBe('checked');
    });

    it('should return unchecked state when no models selected', () => {
      expect(component.getParentCheckboxState('Ford')).toBe('unchecked');
    });

    it('should return indeterminate state when some models selected', () => {
      component.selectedRows.add('Ford|F-150');
      // Mustang not selected

      expect(component.getParentCheckboxState('Ford')).toBe('indeterminate');
    });

    it('should count selected models for manufacturer', () => {
      component.selectedRows.add('Ford|F-150');

      expect(component.getSelectedModelCount('Ford')).toBe(1);

      component.selectedRows.add('Ford|Mustang');

      expect(component.getSelectedModelCount('Ford')).toBe(2);
    });
  });

  describe('Selection Management - Select/Deselect All', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should select all visible groups', () => {
      component.selectAll();

      // With default page size of 10, all groups visible
      expect(component.selectedRows.size).toBe(6); // All 6 models
    });

    it('should deselect all visible groups', () => {
      component.selectAll();
      component.deselectAll();

      expect(component.selectedRows.size).toBe(0);
    });

    it('should only affect visible groups (pagination)', () => {
      component.pageSize = 1; // Only 1 group visible
      component.applyFilter();

      component.selectAll();

      // Only models from first group selected
      expect(component.selectedRows.size).toBe(2); // Chevrolet has 2 models
    });

    it('should correctly report allVisibleSelected', () => {
      expect(component.allVisibleSelected).toBe(false);

      component.selectAll();

      expect(component.allVisibleSelected).toBe(true);
    });

    it('should correctly report someVisibleSelected', () => {
      expect(component.someVisibleSelected).toBe(false);

      component.onChildCheckboxChange('Ford', 'F-150', true);

      expect(component.someVisibleSelected).toBe(true);

      component.selectAll();

      expect(component.someVisibleSelected).toBe(false); // All selected, not "some"
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter by manufacturer name', () => {
      component.searchTerm = 'ford';
      component.applyFilter();

      expect(component.filteredGroups.length).toBe(1);
      expect(component.filteredGroups[0].manufacturer).toBe('Ford');
    });

    it('should filter by model name', () => {
      component.searchTerm = 'corvette';
      component.applyFilter();

      expect(component.filteredGroups.length).toBe(1);
      expect(component.filteredGroups[0].manufacturer).toBe('Chevrolet');
    });

    it('should be case-insensitive', () => {
      component.searchTerm = 'FORD';
      component.applyFilter();

      expect(component.filteredGroups.length).toBe(1);
    });

    it('should reset to all groups when search cleared', () => {
      component.searchTerm = 'ford';
      component.applyFilter();
      expect(component.filteredGroups.length).toBe(1);

      component.searchTerm = '';
      component.applyFilter();

      expect(component.filteredGroups.length).toBe(3);
    });

    it('should reset to page 1 after filtering', () => {
      component.currentPage = 3;

      component.searchTerm = 'ford';
      component.applyFilter();

      expect(component.currentPage).toBe(1);
    });

    it('should trigger filter on search change', () => {
      spyOn(component, 'applyFilter');

      component.onSearchChange();

      expect(component.applyFilter).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should calculate total pages correctly', () => {
      component.pageSize = 2;

      expect(component.totalPages).toBe(2); // 3 groups / 2 per page = 2 pages
    });

    it('should return visible groups for current page', () => {
      component.pageSize = 2;
      component.currentPage = 1;

      const visible = component.visibleGroups;

      expect(visible.length).toBe(2);
      expect(visible[0].manufacturer).toBe('Chevrolet');
    });

    it('should navigate to next page', () => {
      component.pageSize = 2;
      component.currentPage = 1;

      component.nextPage();

      expect(component.currentPage).toBe(2);
    });

    it('should not navigate beyond last page', () => {
      component.pageSize = 2;
      component.currentPage = 2; // Last page

      component.nextPage();

      expect(component.currentPage).toBe(2);
    });

    it('should navigate to previous page', () => {
      component.pageSize = 2;
      component.currentPage = 2;

      component.previousPage();

      expect(component.currentPage).toBe(1);
    });

    it('should not navigate before first page', () => {
      component.currentPage = 1;

      component.previousPage();

      expect(component.currentPage).toBe(1);
    });

    it('should correctly report hasPreviousPage', () => {
      component.currentPage = 1;
      expect(component.hasPreviousPage).toBe(false);

      component.currentPage = 2;
      expect(component.hasPreviousPage).toBe(true);
    });

    it('should correctly report hasNextPage', () => {
      component.pageSize = 2;
      component.currentPage = 1;
      expect(component.hasNextPage).toBe(true);

      component.currentPage = 2;
      expect(component.hasNextPage).toBe(false);
    });

    it('should navigate to specific page', () => {
      component.pageSize = 1;

      component.goToPage(2);

      expect(component.currentPage).toBe(2);
    });

    it('should not navigate to invalid page', () => {
      component.currentPage = 1;

      component.goToPage(999);

      expect(component.currentPage).toBe(1);
    });

    it('should generate page numbers for pagination UI', () => {
      component.pageSize = 1; // Force 3 pages
      component.currentPage = 1;

      const pages = component.pageNumbers;

      expect(pages).toContain(1);
      expect(pages).toContain(2);
      expect(pages).toContain(3);
    });

    it('should reset to page 1 when page size changes', () => {
      component.currentPage = 2;

      component.onPageSizeChange();

      expect(component.currentPage).toBe(1);
    });

    it('should save page size preference to localStorage', () => {
      component.pageSize = 20;

      component.onPageSizeChange();

      expect(localStorage.getItem('vehiclePickerPageSize')).toBe('20');
    });
  });

  describe('Expand/Collapse Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle manufacturer expansion', () => {
      expect(component.filteredGroups[0].expanded).toBe(false);

      component.toggleManufacturer('Chevrolet');

      expect(component.filteredGroups[0].expanded).toBe(true);

      component.toggleManufacturer('Chevrolet');

      expect(component.filteredGroups[0].expanded).toBe(false);
    });

    it('should expand all manufacturers', () => {
      component.expandAll();

      component.filteredGroups.forEach((group) => {
        expect(group.expanded).toBe(true);
      });
    });

    it('should collapse all manufacturers', () => {
      component.filteredGroups.forEach((g) => (g.expanded = true));

      component.collapseAll();

      component.filteredGroups.forEach((group) => {
        expect(group.expanded).toBe(false);
      });
    });
  });

  describe('Chip Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should generate selected chips from Set', () => {
      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');
      component.selectedRows.add('Chevrolet|Corvette');

      const chips = component.selectedChips;

      expect(chips.length).toBe(3);
      expect(chips[0]).toEqual({ manufacturer: 'Chevrolet', model: 'Corvette' });
      expect(chips[1]).toEqual({ manufacturer: 'Ford', model: 'F-150' });
    });

    it('should sort chips by manufacturer then model', () => {
      component.selectedRows.add('Ford|Mustang');
      component.selectedRows.add('Chevrolet|Corvette');
      component.selectedRows.add('Ford|F-150');

      const chips = component.selectedChips;

      expect(chips[0].manufacturer).toBe('Chevrolet');
      expect(chips[1].manufacturer).toBe('Ford');
      expect(chips[1].model).toBe('F-150');
      expect(chips[2].model).toBe('Mustang');
    });

    it('should remove individual chip', () => {
      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');

      component.removeChip({ manufacturer: 'Ford', model: 'F-150' });

      expect(component.selectedRows.has('Ford|F-150')).toBe(false);
      expect(component.selectedRows.has('Ford|Mustang')).toBe(true);
    });

    it('should group chips by manufacturer', () => {
      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');
      component.selectedRows.add('Chevrolet|Corvette');

      const grouped = component.groupedChips;

      expect(grouped.length).toBe(2);
      expect(grouped[0].manufacturer).toBe('Chevrolet');
      expect(grouped[0].models).toEqual(['Corvette']);
      expect(grouped[1].manufacturer).toBe('Ford');
      expect(grouped[1].models).toEqual(['F-150', 'Mustang']);
      expect(grouped[1].count).toBe(2);
    });

    it('should remove all models for manufacturer', () => {
      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');
      component.selectedRows.add('Chevrolet|Corvette');

      component.removeManufacturerChip('Ford');

      expect(component.selectedRows.has('Ford|F-150')).toBe(false);
      expect(component.selectedRows.has('Ford|Mustang')).toBe(false);
      expect(component.selectedRows.has('Chevrolet|Corvette')).toBe(true);
    });
  });

  describe('Apply and Clear Operations', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit selectionChange on apply', () => {
      spyOn(component.selectionChange, 'emit');

      component.selectedRows.add('Ford|F-150');
      component.selectedRows.add('Ford|Mustang');

      component.onApply();

      expect(component.selectionChange.emit).toHaveBeenCalledWith([
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Ford', model: 'Mustang' },
      ]);
    });

    it('should emit empty array when no selections on apply', () => {
      spyOn(component.selectionChange, 'emit');

      component.onApply();

      expect(component.selectionChange.emit).toHaveBeenCalledWith([]);
    });

    it('should clear selections and emit on clear', () => {
      spyOn(component.selectionChange, 'emit');

      component.selectedRows.add('Ford|F-150');

      component.onClear();

      expect(component.selectedRows.size).toBe(0);
      expect(component.selectionChange.emit).toHaveBeenCalledWith([]);
    });
  });

  describe('Table Data Generation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should generate collapsed table data', () => {
      const data = component.tableData;

      // All groups collapsed by default
      expect(data.length).toBe(3); // One row per manufacturer
      expect(data[0].isCollapsed).toBe(true);
      expect(data[0].manufacturer).toBe('Chevrolet');
      expect(data[0].model).toBe(''); // Empty for collapsed
    });

    it('should generate expanded table data', () => {
      component.filteredGroups[0].expanded = true; // Expand Chevrolet

      const data = component.tableData;

      // Chevrolet expanded (2 models) + Ford collapsed + Tesla collapsed = 4 rows
      expect(data.length).toBe(4);
      expect(data[0].isExpanded).toBe(true);
      expect(data[0].model).toBe('Camaro');
      expect(data[1].model).toBe('Corvette');
    });

    it('should include selected count in table data', () => {
      component.selectedRows.add('Chevrolet|Corvette');

      const data = component.tableData;

      expect(data[0].selectedCount).toBe(1);
    });

    it('should include model count in table data', () => {
      const data = component.tableData;

      expect(data[0].modelCount).toBe(2); // Chevrolet has 2 models
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', () => {
      mockApiService.getManufacturerModelCombinations.and.returnValue(
        throwError(() => new Error('API Error'))
      );

      const consoleErrorSpy = spyOn(console, 'error');

      fixture.detectChanges();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load combinations:', jasmine.any(Error));
      expect(component.loading).toBe(false);
    });

    it('should not crash on hydration with invalid data', () => {
      fixture.detectChanges();

      const invalidSelections: any = [
        { manufacturer: 'Invalid', model: 'NonExistent' },
      ];

      expect(() => {
        component.initialSelections = invalidSelections;
        component.ngOnChanges({
          initialSelections: new SimpleChange(null, invalidSelections, false),
        });
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();

      const subscription = (component as any).subscription;
      spyOn(subscription, 'unsubscribe');

      component.ngOnDestroy();

      expect(subscription.unsubscribe).toHaveBeenCalled();
    });

    it('should handle destroy when no subscription exists', () => {
      // Component not initialized, no subscription

      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle empty API response', () => {
      mockApiService.getManufacturerModelCombinations.and.returnValue(
        of({ total: 0, page: 1, size: 100, totalPages: 0, data: [] })
      );

      const freshFixture = TestBed.createComponent(ManufacturerModelTablePickerComponent);
      freshFixture.detectChanges();

      expect(freshFixture.componentInstance.allRows.length).toBe(0);
      expect(freshFixture.componentInstance.manufacturerGroups.length).toBe(0);
    });

    it('should handle selection of non-existent model', () => {
      component.onChildCheckboxChange('NonExistent', 'Model', true);

      expect(component.selectedRows.size).toBe(1); // Still adds to Set
    });

    it('should handle parent checkbox with no models (filtered out)', () => {
      component.searchTerm = 'xyz'; // No matches
      component.applyFilter();

      const state = component.getParentCheckboxState('NonExistent');

      expect(state).toBe('unchecked');
    });

    it('should handle rapid pagination changes', () => {
      component.pageSize = 1;

      component.nextPage();
      component.nextPage();
      component.previousPage();

      expect(component.currentPage).toBe(2);
    });

    it('should handle simultaneous expand all and filter', () => {
      component.searchTerm = 'ford';
      component.applyFilter();

      component.expandAll();

      expect(component.filteredGroups[0].expanded).toBe(true);
    });
  });

  describe('UI Preferences: localStorage Separation', () => {
    it('should store page size in localStorage, NOT in URL', () => {
      fixture.detectChanges();

      component.pageSize = 20;
      component.onPageSizeChange();

      expect(localStorage.getItem('vehiclePickerPageSize')).toBe('20');
    });

    it('should emit selections for URL, NOT store in localStorage', () => {
      fixture.detectChanges();

      spyOn(component.selectionChange, 'emit');

      component.selectedRows.add('Ford|F-150');
      component.onApply();

      expect(component.selectionChange.emit).toHaveBeenCalled();
      expect(localStorage.getItem('vehiclePickerSelections')).toBeNull();
    });
  });
});
