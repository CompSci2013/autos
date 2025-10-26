import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ChangeDetectorRef,
  SimpleChange,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { TablePickerComponent } from './table-picker.component';
import {
  TablePickerDataSource,
  ManufacturerSummaryRow,
} from './table-picker-data-source';
import { ManufacturerModelSelection } from '../../../models';
import { TableQueryParams } from '../../../shared/models';
import { of } from 'rxjs';
import { NzIconService } from 'ng-zorro-antd/icon';

/**
 * TablePickerComponent Test Suite
 *
 * Tests the complex hierarchical table picker component that uses BaseDataTableComponent
 * with manufacturer-model selection logic, command pattern for clearing, and Set-based
 * selection management.
 *
 * Key Testing Areas:
 * - Input-based hydration from initialSelections
 * - Clear trigger command pattern (increment counter)
 * - Hierarchical selection (parent/child checkboxes)
 * - Selection state management (Set<string> pattern)
 * - Apply/Clear button actions
 * - Chip removal (individual model and manufacturer)
 * - Expand/collapse all functionality
 * - ChangeDetectionStrategy.OnPush integration
 */
describe('TablePickerComponent', () => {
  let component: TablePickerComponent;
  let fixture: ComponentFixture<TablePickerComponent>;
  let mockDataSource: jasmine.SpyObj<TablePickerDataSource>;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;

  // Test data
  const createManufacturerRow = (
    manufacturer: string,
    models: string[],
    modelCount?: number
  ): ManufacturerSummaryRow => ({
    key: manufacturer,
    manufacturer,
    totalCount: models.length * 1000, // Total count of all instances
    modelCount: modelCount || models.length,
    models: models.map((model) => ({
      model,
      count: 1000,
    })),
  });

  beforeEach(async () => {
    // Create spies
    mockDataSource = jasmine.createSpyObj('TablePickerDataSource', [
      'fetch',
      'loadData',
    ]);
    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

    // Mock data source fetch to return empty results
    mockDataSource.fetch.and.returnValue(
      of({ results: [], total: 0, page: 1, size: 20, totalPages: 0 })
    );

    // Mock NzIconService to prevent icon lookup errors
    const mockIconService = jasmine.createSpyObj('NzIconService', ['getRenderedContent']);
    mockIconService.getRenderedContent.and.callFake(() => {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      return of(svgElement);
    });

    await TestBed.configureTestingModule({
      declarations: [TablePickerComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: TablePickerDataSource, useValue: mockDataSource },
        { provide: ChangeDetectorRef, useValue: mockCdr },
        { provide: NzIconService, useValue: mockIconService },
      ],
      schemas: [NO_ERRORS_SCHEMA], // Suppress template errors for BaseDataTable
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TablePickerComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges yet - let tests control initialization
  });

  /**
   * =========================================================================
   * COMPONENT INITIALIZATION
   * =========================================================================
   */
  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty selectedRows Set', () => {
      expect(component.selectedRows).toBeInstanceOf(Set);
      expect(component.selectedRows.size).toBe(0);
    });

    it('should initialize with default tableQueryParams', () => {
      expect(component.tableQueryParams).toEqual({
        page: 1,
        size: 20,
        filters: {},
      });
    });

    it('should initialize with empty initialSelections array', () => {
      expect(component.initialSelections).toEqual([]);
    });

    it('should initialize with clearTrigger set to 0', () => {
      expect(component.clearTrigger).toBe(0);
    });

    it('should initialize with predefined columns', () => {
      expect(component.columns).toBeDefined();
      expect(component.columns.length).toBe(3);
      expect(component.columns[0].key).toBe('manufacturer');
      expect(component.columns[1].key).toBe('model');
      expect(component.columns[2].key).toBe('modelCount');
    });

    it('should have dataSource injected', () => {
      expect(component.dataSource).toBe(mockDataSource);
    });
  });

  /**
   * =========================================================================
   * INPUT-BASED HYDRATION (initialSelections)
   * =========================================================================
   */
  describe('Input-Based Hydration from initialSelections', () => {
    it('should hydrate selections when initialSelections input changes', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
      ];

      component.initialSelections = selections;
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, selections, true),
      });

      expect(component.selectedRows.size).toBe(2);
      expect(component.selectedRows.has('Ford:F-150')).toBe(true);
      expect(component.selectedRows.has('Chevrolet:Corvette')).toBe(true);
    });

    it('should clear existing selections before hydrating (idempotent)', () => {
      // Pre-populate with selections
      component.selectedRows.add('Toyota:Camry');
      component.selectedRows.add('Honda:Accord');

      const newSelections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      component.initialSelections = newSelections;
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, newSelections, false),
      });

      // Old selections should be cleared
      expect(component.selectedRows.size).toBe(1);
      expect(component.selectedRows.has('Ford:F-150')).toBe(true);
      expect(component.selectedRows.has('Toyota:Camry')).toBe(false);
      expect(component.selectedRows.has('Honda:Accord')).toBe(false);
    });

    it('should handle empty initialSelections array', () => {
      component.selectedRows.add('Ford:F-150');

      component.initialSelections = [];
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, [], false),
      });

      expect(component.selectedRows.size).toBe(0);
    });

    it('should handle null initialSelections', () => {
      component.selectedRows.add('Ford:F-150');

      component.initialSelections = null as any;
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, null, false),
      });

      expect(component.selectedRows.size).toBe(0);
    });

    it('should handle large initialSelections array', () => {
      const largeSelections: ManufacturerModelSelection[] = [];
      for (let i = 0; i < 100; i++) {
        largeSelections.push({
          manufacturer: `Manufacturer${i}`,
          model: `Model${i}`,
        });
      }

      component.initialSelections = largeSelections;
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, largeSelections, false),
      });

      expect(component.selectedRows.size).toBe(100);
    });

    it('should call markForCheck after hydration', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      component.initialSelections = selections;
      component.ngOnChanges({
        initialSelections: new SimpleChange(null, selections, false),
      });

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });

  /**
   * =========================================================================
   * CLEAR TRIGGER COMMAND PATTERN
   * =========================================================================
   */
  describe('Clear Trigger Command Pattern', () => {
    it('should clear selections when clearTrigger increments', () => {
      // Pre-populate selections
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Chevrolet:Corvette');

      // Simulate clearTrigger change from 0 to 1
      component.clearTrigger = 1;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(0, 1, false),
      });

      expect(component.selectedRows.size).toBe(0);
    });

    it('should NOT clear on first change (initialization)', () => {
      component.selectedRows.add('Ford:F-150');

      // First change (firstChange = true)
      component.clearTrigger = 0;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(undefined, 0, true),
      });

      // Should NOT clear because firstChange = true
      expect(component.selectedRows.size).toBe(1);
    });

    it('should clear when trigger increments from 1 to 2', () => {
      component.selectedRows.add('Ford:F-150');

      component.clearTrigger = 2;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(1, 2, false),
      });

      expect(component.selectedRows.size).toBe(0);
    });

    it('should only clear once per trigger value change', () => {
      component.selectedRows.add('Ford:F-150');

      // First trigger
      component.clearTrigger = 1;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(0, 1, false),
      });
      expect(component.selectedRows.size).toBe(0);

      // Add new selection
      component.selectedRows.add('Toyota:Camry');

      // Same trigger value - should NOT clear
      component.ngOnChanges({
        clearTrigger: new SimpleChange(1, 1, false),
      });
      expect(component.selectedRows.size).toBe(1);
    });

    it('should call markForCheck after clearing via trigger', () => {
      component.selectedRows.add('Ford:F-150');
      mockCdr.markForCheck.calls.reset();

      component.clearTrigger = 1;
      component.ngOnChanges({
        clearTrigger: new SimpleChange(0, 1, false),
      });

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });

  /**
   * =========================================================================
   * SELECTION STATE MANAGEMENT (Set<string> Pattern)
   * =========================================================================
   */
  describe('Selection State Management', () => {
    it('should use Set<string> for efficient lookups', () => {
      component.selectedRows.add('Ford:F-150');
      expect(component.selectedRows.has('Ford:F-150')).toBe(true);
      expect(component.selectedRows.has('Chevrolet:Corvette')).toBe(false);
    });

    it('should format selection keys as "manufacturer:model"', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Chevrolet:Corvette');

      const keys = Array.from(component.selectedRows);
      expect(keys).toContain('Ford:F-150');
      expect(keys).toContain('Chevrolet:Corvette');
    });

    it('should handle duplicate additions (Set deduplication)', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:F-150');

      expect(component.selectedRows.size).toBe(1);
    });

    it('should delete selections correctly', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Chevrolet:Corvette');

      component.selectedRows.delete('Ford:F-150');

      expect(component.selectedRows.size).toBe(1);
      expect(component.selectedRows.has('Ford:F-150')).toBe(false);
      expect(component.selectedRows.has('Chevrolet:Corvette')).toBe(true);
    });
  });

  /**
   * =========================================================================
   * PARENT CHECKBOX STATE CALCULATION
   * =========================================================================
   */
  describe('Manufacturer Checkbox State Calculation', () => {
    it('should return "unchecked" when no models are selected', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang']);
      const state = component.getManufacturerCheckboxState(row);
      expect(state).toBe('unchecked');
    });

    it('should return "checked" when all models are selected', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang']);
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');

      const state = component.getManufacturerCheckboxState(row);
      expect(state).toBe('checked');
    });

    it('should return "indeterminate" when some models are selected', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang', 'Explorer']);
      component.selectedRows.add('Ford:F-150');

      const state = component.getManufacturerCheckboxState(row);
      expect(state).toBe('indeterminate');
    });

    it('should return "unchecked" for empty models array', () => {
      const row = createManufacturerRow('Ford', []);
      const state = component.getManufacturerCheckboxState(row);
      expect(state).toBe('unchecked');
    });

    it('should handle single-model manufacturer correctly', () => {
      const row = createManufacturerRow('Tesla', ['Model S']);

      // Unchecked
      let state = component.getManufacturerCheckboxState(row);
      expect(state).toBe('unchecked');

      // Checked
      component.selectedRows.add('Tesla:Model S');
      state = component.getManufacturerCheckboxState(row);
      expect(state).toBe('checked');
    });
  });

  /**
   * =========================================================================
   * PARENT CHECKBOX TOGGLING
   * =========================================================================
   */
  describe('Manufacturer Checkbox Toggling', () => {
    it('should select all models when checking parent checkbox', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang', 'Explorer']);

      component.onManufacturerCheckboxChange(row, true);

      expect(component.selectedRows.size).toBe(3);
      expect(component.selectedRows.has('Ford:F-150')).toBe(true);
      expect(component.selectedRows.has('Ford:Mustang')).toBe(true);
      expect(component.selectedRows.has('Ford:Explorer')).toBe(true);
    });

    it('should deselect all models when unchecking parent checkbox', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang', 'Explorer']);
      // Pre-select all
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');
      component.selectedRows.add('Ford:Explorer');

      component.onManufacturerCheckboxChange(row, false);

      expect(component.selectedRows.size).toBe(0);
    });

    it('should only affect models from that manufacturer', () => {
      const fordRow = createManufacturerRow('Ford', ['F-150', 'Mustang']);
      const chevyRow = createManufacturerRow('Chevrolet', ['Corvette', 'Camaro']);

      // Pre-select Chevrolet models
      component.selectedRows.add('Chevrolet:Corvette');
      component.selectedRows.add('Chevrolet:Camaro');

      // Check Ford
      component.onManufacturerCheckboxChange(fordRow, true);

      // Should have 4 total (2 Chevy + 2 Ford)
      expect(component.selectedRows.size).toBe(4);
      expect(component.selectedRows.has('Chevrolet:Corvette')).toBe(true);
      expect(component.selectedRows.has('Chevrolet:Camaro')).toBe(true);
    });

    it('should call markForCheck after toggling parent checkbox', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang']);
      mockCdr.markForCheck.calls.reset();

      component.onManufacturerCheckboxChange(row, true);

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should handle checking empty manufacturer gracefully', () => {
      const row = createManufacturerRow('Ford', []);

      component.onManufacturerCheckboxChange(row, true);

      expect(component.selectedRows.size).toBe(0);
    });
  });

  /**
   * =========================================================================
   * MODEL CHECKBOX TOGGLING
   * =========================================================================
   */
  describe('Model Checkbox Toggling', () => {
    it('should add model to selectedRows when checked', () => {
      component.onModelCheckboxChange('Ford', 'F-150', true);

      expect(component.selectedRows.size).toBe(1);
      expect(component.selectedRows.has('Ford:F-150')).toBe(true);
    });

    it('should remove model from selectedRows when unchecked', () => {
      component.selectedRows.add('Ford:F-150');

      component.onModelCheckboxChange('Ford', 'F-150', false);

      expect(component.selectedRows.size).toBe(0);
      expect(component.selectedRows.has('Ford:F-150')).toBe(false);
    });

    it('should handle multiple model selections independently', () => {
      component.onModelCheckboxChange('Ford', 'F-150', true);
      component.onModelCheckboxChange('Ford', 'Mustang', true);
      component.onModelCheckboxChange('Chevrolet', 'Corvette', true);

      expect(component.selectedRows.size).toBe(3);
    });

    it('should call markForCheck after toggling model checkbox', () => {
      mockCdr.markForCheck.calls.reset();

      component.onModelCheckboxChange('Ford', 'F-150', true);

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should affect parent checkbox state', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang']);

      // Initially unchecked
      expect(component.getManufacturerCheckboxState(row)).toBe('unchecked');

      // Select one model
      component.onModelCheckboxChange('Ford', 'F-150', true);
      expect(component.getManufacturerCheckboxState(row)).toBe('indeterminate');

      // Select second model
      component.onModelCheckboxChange('Ford', 'Mustang', true);
      expect(component.getManufacturerCheckboxState(row)).toBe('checked');
    });
  });

  /**
   * =========================================================================
   * isModelSelected() METHOD
   * =========================================================================
   */
  describe('isModelSelected() Method', () => {
    it('should return true when model is selected', () => {
      component.selectedRows.add('Ford:F-150');
      expect(component.isModelSelected('Ford', 'F-150')).toBe(true);
    });

    it('should return false when model is not selected', () => {
      expect(component.isModelSelected('Ford', 'F-150')).toBe(false);
    });

    it('should distinguish between different manufacturers with same model name', () => {
      component.selectedRows.add('Ford:F-150');

      expect(component.isModelSelected('Ford', 'F-150')).toBe(true);
      expect(component.isModelSelected('Chevrolet', 'F-150')).toBe(false);
    });
  });

  /**
   * =========================================================================
   * getSelectionCount() METHOD
   * =========================================================================
   */
  describe('getSelectionCount() Method', () => {
    it('should return 0 when no models selected for manufacturer', () => {
      expect(component.getSelectionCount('Ford')).toBe(0);
    });

    it('should count selected models for manufacturer', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');
      component.selectedRows.add('Ford:Explorer');

      expect(component.getSelectionCount('Ford')).toBe(3);
    });

    it('should only count models for specified manufacturer', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');
      component.selectedRows.add('Chevrolet:Corvette');
      component.selectedRows.add('Chevrolet:Camaro');

      expect(component.getSelectionCount('Ford')).toBe(2);
      expect(component.getSelectionCount('Chevrolet')).toBe(2);
    });

    it('should handle manufacturer with no selections', () => {
      component.selectedRows.add('Ford:F-150');
      expect(component.getSelectionCount('Toyota')).toBe(0);
    });
  });

  /**
   * =========================================================================
   * selectedItems GETTER
   * =========================================================================
   */
  describe('selectedItems Getter', () => {
    it('should return empty array when no selections', () => {
      expect(component.selectedItems).toEqual([]);
    });

    it('should convert Set to array of ManufacturerModelSelection', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Chevrolet:Corvette');

      const items = component.selectedItems;

      expect(items.length).toBe(2);
      expect(items).toContain({ manufacturer: 'Ford', model: 'F-150' });
      expect(items).toContain({ manufacturer: 'Chevrolet', model: 'Corvette' });
    });

    it('should sort by manufacturer then model alphabetically', () => {
      component.selectedRows.add('Chevrolet:Corvette');
      component.selectedRows.add('Ford:Mustang');
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('BMW:M3');

      const items = component.selectedItems;

      expect(items[0]).toEqual({ manufacturer: 'BMW', model: 'M3' });
      expect(items[1]).toEqual({ manufacturer: 'Chevrolet', model: 'Corvette' });
      expect(items[2]).toEqual({ manufacturer: 'Ford', model: 'F-150' });
      expect(items[3]).toEqual({ manufacturer: 'Ford', model: 'Mustang' });
    });

    it('should handle selections with special characters in keys', () => {
      component.selectedRows.add("Ford:F-150'Raptor");
      const items = component.selectedItems;

      expect(items.length).toBe(1);
      expect(items[0]).toEqual({ manufacturer: 'Ford', model: "F-150'Raptor" });
    });
  });

  /**
   * =========================================================================
   * APPLY BUTTON
   * =========================================================================
   */
  describe('Apply Button (onApply)', () => {
    it('should emit selectionChange with current selections', () => {
      spyOn(component.selectionChange, 'emit');

      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Chevrolet:Corvette');

      component.onApply();

      expect(component.selectionChange.emit).toHaveBeenCalledWith(
        component.selectedItems
      );
    });

    it('should emit empty array when no selections', () => {
      spyOn(component.selectionChange, 'emit');

      component.onApply();

      expect(component.selectionChange.emit).toHaveBeenCalledWith([]);
    });

    it('should emit sorted selections', () => {
      spyOn(component.selectionChange, 'emit');

      component.selectedRows.add('Chevrolet:Corvette');
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('BMW:M3');

      component.onApply();

      const emittedValue = (component.selectionChange.emit as jasmine.Spy).calls
        .mostRecent().args[0];

      expect(emittedValue[0].manufacturer).toBe('BMW');
      expect(emittedValue[1].manufacturer).toBe('Chevrolet');
      expect(emittedValue[2].manufacturer).toBe('Ford');
    });
  });

  /**
   * =========================================================================
   * CLEAR BUTTON
   * =========================================================================
   */
  describe('Clear Button (onClear)', () => {
    it('should clear selectedRows Set', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Chevrolet:Corvette');

      component.onClear();

      expect(component.selectedRows.size).toBe(0);
    });

    it('should emit empty array', () => {
      spyOn(component.selectionChange, 'emit');

      component.selectedRows.add('Ford:F-150');
      component.onClear();

      expect(component.selectionChange.emit).toHaveBeenCalledWith([]);
    });

    it('should call markForCheck', () => {
      mockCdr.markForCheck.calls.reset();

      component.onClear();

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should work when already empty', () => {
      spyOn(component.selectionChange, 'emit');

      component.onClear();

      expect(component.selectedRows.size).toBe(0);
      expect(component.selectionChange.emit).toHaveBeenCalledWith([]);
    });
  });

  /**
   * =========================================================================
   * CHIP REMOVAL (Individual Model)
   * =========================================================================
   */
  describe('Chip Removal - Individual Model (onRemoveModel)', () => {
    it('should remove specific model from selections', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');
      component.selectedRows.add('Chevrolet:Corvette');

      component.onRemoveModel({ manufacturer: 'Ford', model: 'F-150' });

      expect(component.selectedRows.size).toBe(2);
      expect(component.selectedRows.has('Ford:F-150')).toBe(false);
      expect(component.selectedRows.has('Ford:Mustang')).toBe(true);
      expect(component.selectedRows.has('Chevrolet:Corvette')).toBe(true);
    });

    it('should call markForCheck after removal', () => {
      component.selectedRows.add('Ford:F-150');
      mockCdr.markForCheck.calls.reset();

      component.onRemoveModel({ manufacturer: 'Ford', model: 'F-150' });

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should handle removing non-existent model gracefully', () => {
      component.selectedRows.add('Ford:F-150');

      component.onRemoveModel({ manufacturer: 'Chevrolet', model: 'Corvette' });

      expect(component.selectedRows.size).toBe(1);
      expect(component.selectedRows.has('Ford:F-150')).toBe(true);
    });
  });

  /**
   * =========================================================================
   * CHIP REMOVAL (Entire Manufacturer)
   * =========================================================================
   */
  describe('Chip Removal - Manufacturer (onRemoveManufacturer)', () => {
    it('should remove all models for a manufacturer', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');
      component.selectedRows.add('Ford:Explorer');
      component.selectedRows.add('Chevrolet:Corvette');

      component.onRemoveManufacturer('Ford');

      expect(component.selectedRows.size).toBe(1);
      expect(component.selectedRows.has('Chevrolet:Corvette')).toBe(true);
      expect(component.selectedRows.has('Ford:F-150')).toBe(false);
      expect(component.selectedRows.has('Ford:Mustang')).toBe(false);
      expect(component.selectedRows.has('Ford:Explorer')).toBe(false);
    });

    it('should call markForCheck after removal', () => {
      component.selectedRows.add('Ford:F-150');
      mockCdr.markForCheck.calls.reset();

      component.onRemoveManufacturer('Ford');

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should handle removing manufacturer with no selections', () => {
      component.selectedRows.add('Ford:F-150');

      component.onRemoveManufacturer('Chevrolet');

      expect(component.selectedRows.size).toBe(1);
    });

    it('should handle multiple manufacturers correctly', () => {
      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');
      component.selectedRows.add('Chevrolet:Corvette');
      component.selectedRows.add('Chevrolet:Camaro');
      component.selectedRows.add('Toyota:Camry');

      component.onRemoveManufacturer('Chevrolet');

      expect(component.selectedRows.size).toBe(3);
      expect(component.selectedRows.has('Ford:F-150')).toBe(true);
      expect(component.selectedRows.has('Ford:Mustang')).toBe(true);
      expect(component.selectedRows.has('Toyota:Camry')).toBe(true);
    });
  });

  /**
   * =========================================================================
   * EXPAND/COLLAPSE ALL
   * =========================================================================
   */
  describe('Expand/Collapse All Functionality', () => {
    it('should call baseTable.expandAllRows() when onExpandAll is called', () => {
      // Mock baseTable ViewChild
      const mockBaseTable = jasmine.createSpyObj('BaseDataTableComponent', [
        'expandAllRows',
      ]);
      component.baseTable = mockBaseTable;

      component.onExpandAll();

      expect(mockBaseTable.expandAllRows).toHaveBeenCalled();
    });

    it('should call baseTable.collapseAllRows() when onCollapseAll is called', () => {
      const mockBaseTable = jasmine.createSpyObj('BaseDataTableComponent', [
        'collapseAllRows',
      ]);
      component.baseTable = mockBaseTable;

      component.onCollapseAll();

      expect(mockBaseTable.collapseAllRows).toHaveBeenCalled();
    });

    it('should handle missing baseTable gracefully in onExpandAll', () => {
      component.baseTable = undefined as any;

      expect(() => component.onExpandAll()).not.toThrow();
    });

    it('should handle missing baseTable gracefully in onCollapseAll', () => {
      component.baseTable = undefined as any;

      expect(() => component.onCollapseAll()).not.toThrow();
    });
  });

  /**
   * =========================================================================
   * TABLE QUERY CHANGES
   * =========================================================================
   */
  describe('Table Query Changes', () => {
    it('should update tableQueryParams when onTableQueryChange is called', () => {
      const newParams: TableQueryParams = {
        page: 2,
        size: 50,
        filters: { manufacturer: 'Ford' },
        sortBy: 'manufacturer',
        sortOrder: 'asc',
      };

      component.onTableQueryChange(newParams);

      expect(component.tableQueryParams).toEqual(newParams);
    });

    it('should create a new object reference (immutability)', () => {
      const originalParams = component.tableQueryParams;
      const newParams: TableQueryParams = {
        page: 2,
        size: 20,
        filters: {},
      };

      component.onTableQueryChange(newParams);

      expect(component.tableQueryParams).not.toBe(originalParams);
    });
  });

  /**
   * =========================================================================
   * ROW EXPANSION
   * =========================================================================
   */
  describe('Row Expansion', () => {
    it('should handle row expansion without API call (models pre-loaded)', () => {
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang']);

      expect(() => component.onRowExpand(row)).not.toThrow();
      // No API call should be made since models are in row.models
    });

    it('should log manufacturer name on expansion', () => {
      spyOn(console, 'log');
      const row = createManufacturerRow('Ford', ['F-150', 'Mustang']);

      component.onRowExpand(row);

      expect(console.log).toHaveBeenCalledWith(
        'TablePickerComponent: Manufacturer expanded:',
        'Ford'
      );
    });
  });

  /**
   * =========================================================================
   * LIFECYCLE HOOKS
   * =========================================================================
   */
  describe('Lifecycle Hooks', () => {
    it('should log on ngOnInit', () => {
      spyOn(console, 'log');

      component.ngOnInit();

      expect(console.log).toHaveBeenCalledWith(
        'TablePickerComponent: Initialized'
      );
    });

    it('should complete destroy$ subject on ngOnDestroy', () => {
      const destroySpy = jasmine.createSpyObj('Subject', ['next', 'complete']);
      (component as any).destroy$ = destroySpy;

      component.ngOnDestroy();

      expect(destroySpy.next).toHaveBeenCalled();
      expect(destroySpy.complete).toHaveBeenCalled();
    });
  });

  /**
   * =========================================================================
   * EDGE CASES AND ERROR HANDLING
   * =========================================================================
   */
  describe('Edge Cases and Error Handling', () => {
    it('should handle selections with special characters in manufacturer names', () => {
      component.selectedRows.add("Aston-Martin:DB11'V12");

      const items = component.selectedItems;
      expect(items[0]).toEqual({
        manufacturer: 'Aston-Martin',
        model: "DB11'V12",
      });
    });

    it('should handle very long manufacturer/model names', () => {
      const longManufacturer = 'A'.repeat(100);
      const longModel = 'B'.repeat(100);
      const key = `${longManufacturer}:${longModel}`;

      component.selectedRows.add(key);

      expect(component.selectedRows.has(key)).toBe(true);
      expect(component.selectedItems.length).toBe(1);
    });

    it('should handle manufacturer checkbox with modelCount mismatch', () => {
      // modelCount = 5 but only 2 models in array (edge case)
      const row: ManufacturerSummaryRow = {
        key: 'Ford',
        manufacturer: 'Ford',
        totalCount: 2000,
        modelCount: 5,
        models: [
          { model: 'F-150', count: 1000 },
          { model: 'Mustang', count: 1000 },
        ],
      };

      component.selectedRows.add('Ford:F-150');
      component.selectedRows.add('Ford:Mustang');

      // Should be checked because all AVAILABLE models are selected
      const state = component.getManufacturerCheckboxState(row);
      expect(state).toBe('indeterminate'); // Because 2 !== 5
    });

    it('should handle concurrent hydration and clear trigger changes', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
      ];

      // Both inputs change simultaneously
      component.initialSelections = selections;
      component.clearTrigger = 1;

      component.ngOnChanges({
        initialSelections: new SimpleChange(null, selections, false),
        clearTrigger: new SimpleChange(0, 1, false),
      });

      // Clear should win (processed after hydration in ngOnChanges)
      expect(component.selectedRows.size).toBe(0);
    });
  });

  /**
   * =========================================================================
   * PERFORMANCE AND OPTIMIZATION
   * =========================================================================
   */
  describe('Performance and Optimization', () => {
    it('should use ChangeDetectionStrategy.OnPush', () => {
      const metadata = (TablePickerComponent as any).__annotations__[0];
      expect(metadata.changeDetection).toBe(2); // ChangeDetectionStrategy.OnPush = 2
    });

    it('should efficiently handle large selection sets (1000+ items)', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        component.selectedRows.add(`Manufacturer${i}:Model${i}`);
      }

      const end = performance.now();

      expect(component.selectedRows.size).toBe(1000);
      expect(end - start).toBeLessThan(100); // Should be very fast with Set
    });

    it('should efficiently check selection state with large Set', () => {
      // Add 1000 selections
      for (let i = 0; i < 1000; i++) {
        component.selectedRows.add(`Manufacturer${i}:Model${i}`);
      }

      const start = performance.now();
      const isSelected = component.isModelSelected('Manufacturer500', 'Model500');
      const end = performance.now();

      expect(isSelected).toBe(true);
      expect(end - start).toBeLessThan(5); // O(1) lookup with Set
    });
  });
});
