import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { WorkshopComponent } from './workshop.component';
import { StateManagementService } from '../../core/services/state-management.service';
import { GridTransferService } from '../../core/services/grid-transfer.service';
import { PanelPopoutService } from '../../core/services/panel-popout.service';
import { BehaviorSubject } from 'rxjs';
import { SearchFilters, ManufacturerModelSelection } from '../../models';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('WorkshopComponent - URL-First State Management', () => {
  let component: WorkshopComponent;
  let fixture: ComponentFixture<WorkshopComponent>;
  let mockStateService: jasmine.SpyObj<StateManagementService>;
  let mockGridTransfer: jasmine.SpyObj<GridTransferService>;
  let mockPopoutService: jasmine.SpyObj<PanelPopoutService>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;
  let filtersSubject: BehaviorSubject<SearchFilters>;
  let gridsSubject: BehaviorSubject<Map<string, any[]>>;

  beforeEach(async () => {
    // Create filters subject
    filtersSubject = new BehaviorSubject<SearchFilters>({
      page: 1,
      size: 20,
    });

    // Create grids subject
    gridsSubject = new BehaviorSubject<Map<string, any[]>>(new Map());

    // Create mock state service
    mockStateService = jasmine.createSpyObj('StateManagementService', [
      'updateFilters',
      'resetFilters',
      'getCurrentFilters',
    ]);

    // Create mock grid transfer service
    mockGridTransfer = jasmine.createSpyObj('GridTransferService', [
      'setGrids',
      'addItem',
      'removeItem',
      'transferItem',
    ]);

    // Make setGrids() update the gridsSubject to simulate real behavior
    mockGridTransfer.setGrids.and.callFake((gridsMap: Map<string, any[]>) => {
      gridsSubject.next(gridsMap);
    });

    // Create mock popout service
    mockPopoutService = jasmine.createSpyObj('PanelPopoutService', [
      'popOutPanel',
      'closePopout',
    ]);

    mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    // Add observable properties
    Object.defineProperty(mockStateService, 'filters$', {
      get: () => filtersSubject.asObservable(),
    });

    Object.defineProperty(mockGridTransfer, 'grids$', {
      get: () => gridsSubject.asObservable(),
    });

    await TestBed.configureTestingModule({
      declarations: [WorkshopComponent],
      providers: [
        { provide: StateManagementService, useValue: mockStateService },
        { provide: GridTransferService, useValue: mockGridTransfer },
        { provide: PanelPopoutService, useValue: mockPopoutService },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    // Clear localStorage before each test
    localStorage.clear();

    fixture = TestBed.createComponent(WorkshopComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize grids array', () => {
      fixture.detectChanges();

      expect(component.grids).toBeDefined();
      expect(component.grids.length).toBe(2);
      expect(component.grids[0].id).toBe('grid-0');
      expect(component.grids[1].id).toBe('grid-1');
    });

    it('should initialize Gridster options for each grid', () => {
      fixture.detectChanges();

      expect(component.grids[0].options).toBeDefined();
      expect(component.grids[1].options).toBeDefined();
      expect(component.grids[0].options.gridType).toBe('fit');
      expect(component.grids[1].options.gridType).toBe('fit');
    });

    it('should initialize with default panel layout when no saved state', () => {
      fixture.detectChanges();

      expect(component.grids[0].items).toBeDefined();
      expect(component.grids[1].items).toBeDefined();
      expect(component.grids[0].items.length).toBe(1); // Picker in left grid
      expect(component.grids[1].items.length).toBe(1); // Results in right grid
    });

    it('should set default grid-0 layout when no saved state', () => {
      fixture.detectChanges();

      const pickerPanel = component.grids[0].items[0];
      expect(pickerPanel.cols).toBe(2);
      expect(pickerPanel.rows).toBe(3);
      expect(pickerPanel.panelType).toBe('picker');
    });

    it('should set default grid-1 layout when no saved state', () => {
      fixture.detectChanges();

      const resultsPanel = component.grids[1].items[0];
      expect(resultsPanel.cols).toBe(2);
      expect(resultsPanel.rows).toBe(3);
      expect(resultsPanel.panelType).toBe('results');
    });

    it('should initialize panel collapse states map', () => {
      fixture.detectChanges();

      expect(component.panelCollapseStates).toBeDefined();
      expect(component.panelCollapseStates instanceof Map).toBe(true);
      expect(component.panelCollapseStates.get('grid-0')).toBe(false);
      expect(component.panelCollapseStates.get('grid-1')).toBe(false);
    });

    it('should subscribe to state filters on init', () => {
      fixture.detectChanges();

      expect(component.currentFilters).toBeDefined();
    });
  });

  describe('UI Preferences: localStorage Persistence', () => {
    it('should load saved grid state from localStorage', () => {
      const savedState = {
        'grid-0': [{ cols: 2, rows: 2, y: 0, x: 0, id: 'picker-1', panelType: 'picker' as 'picker' }],
        'grid-1': [{ cols: 2, rows: 3, y: 0, x: 0, id: 'results-1', panelType: 'results' as 'results' }],
      };
      localStorage.setItem('autos-workshop-multi-grid-state', JSON.stringify(savedState));

      fixture = TestBed.createComponent(WorkshopComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.grids[0].items).toEqual(savedState['grid-0']);
      expect(component.grids[1].items).toEqual(savedState['grid-1']);
    });

    it('should load partial grid state from localStorage', () => {
      const savedState = {
        'grid-0': [
          { cols: 1, rows: 2, y: 0, x: 0, id: 'picker-1', panelType: 'picker' as 'picker' },
          { cols: 1, rows: 2, y: 2, x: 0, id: 'results-1', panelType: 'results' as 'results' },
        ],
      };
      localStorage.setItem('autos-workshop-multi-grid-state', JSON.stringify(savedState));

      fixture = TestBed.createComponent(WorkshopComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.grids[0].items).toEqual(savedState['grid-0']);
      expect(component.grids[1].items).toEqual([]); // grid-1 not in saved state
    });

    it('should save grid state to localStorage', () => {
      fixture.detectChanges();

      component.grids[0].items = [{ cols: 2, rows: 3, y: 0, x: 0, id: 'test-1', panelType: 'picker' as 'picker' }];
      component.grids[1].items = [{ cols: 1, rows: 2, y: 0, x: 0, id: 'test-2', panelType: 'results' as 'results' }];

      // Trigger save via private method (called by onGridChange)
      (component as any).saveGridState();

      const savedState = localStorage.getItem('autos-workshop-multi-grid-state');
      expect(savedState).toBeTruthy();

      const parsed = JSON.parse(savedState!);
      expect(parsed['grid-0']).toEqual(component.grids[0].items);
      expect(parsed['grid-1']).toEqual(component.grids[1].items);
    });

    it('should save grid state on item change', () => {
      fixture.detectChanges();

      const initialItems = [...component.grids[0].items];
      const testItem = { cols: 3, rows: 4, y: 0, x: 0, id: 'changed-panel', panelType: 'picker' as 'picker' };
      component.grids[0].items = [testItem];

      component.onGridChange('grid-0', testItem, null);

      const savedState = localStorage.getItem('autos-workshop-multi-grid-state');
      expect(savedState).toBeTruthy();

      const parsed = JSON.parse(savedState!);
      expect(parsed['grid-0']).not.toEqual(initialItems);
      expect(parsed['grid-0']).toEqual([testItem]);
    });
  });

  describe('URL-First Principle: Storage Layer Separation', () => {
    it('should store grid layout in localStorage, NOT in URL', () => {
      fixture.detectChanges();

      component.grids[0].items = [{ cols: 3, rows: 4, y: 0, x: 0, id: 'test', panelType: 'picker' as 'picker' }];
      (component as any).saveGridState();

      // Layout saved to localStorage
      expect(localStorage.getItem('autos-workshop-multi-grid-state')).toBeTruthy();

      // Should NOT call updateFilters (URL updates)
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();
    });

    it('should store panel collapse states locally, NOT in URL', () => {
      fixture.detectChanges();

      component.panelCollapseStates.set('grid-0', true);
      component.panelCollapseStates.set('grid-1', true);

      // Panel states are component properties (not in URL)
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();
    });

    it('should store model selections in URL, NOT in localStorage', () => {
      fixture.detectChanges();

      const selections: ManufacturerModelSelection[] = [{ manufacturer: 'Ford', model: 'F-150' }];

      component.onPickerSelectionChange(selections);

      // Should update URL via state service
      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: selections,
      });

      // Should NOT be in localStorage
      expect(localStorage.getItem('autos-modelCombos')).toBeNull();
    });
  });

  describe('URL-First Principle: Hydration from State', () => {
    it('should hydrate picker selections from URL state', () => {
      const urlFilters: SearchFilters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Chevrolet', model: 'Corvette' },
        ],
      };

      filtersSubject.next(urlFilters);
      fixture.detectChanges();

      expect(component.pickerInitialSelections).toEqual(urlFilters.modelCombos!);
    });

    it('should update selections when URL changes (back button)', (done) => {
      fixture.detectChanges();

      filtersSubject.next({ modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }] });

      setTimeout(() => {
        expect(component.pickerInitialSelections).toEqual([{ manufacturer: 'Ford', model: 'F-150' }]);

        // Simulate back button
        filtersSubject.next({ modelCombos: [{ manufacturer: 'Chevrolet', model: 'Corvette' }] });

        setTimeout(() => {
          expect(component.pickerInitialSelections).toEqual([
            { manufacturer: 'Chevrolet', model: 'Corvette' },
          ]);
          done();
        }, 10);
      }, 10);
    });

    it('should clear selections when URL has no models', (done) => {
      filtersSubject.next({ modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }] });
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.pickerInitialSelections.length).toBe(1);

        filtersSubject.next({ page: 1, size: 20 });

        setTimeout(() => {
          expect(component.pickerInitialSelections).toEqual([]);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('User Interactions: Model Selection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update state when user selects models', () => {
      const selections: ManufacturerModelSelection[] = [{ manufacturer: 'Ford', model: 'Mustang' }];

      component.onPickerSelectionChange(selections);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: selections,
      });
    });

    it('should remove modelCombos when selection is empty', () => {
      component.onPickerSelectionChange([]);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: undefined,
      });
    });

    it('should handle multiple selections', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
        { manufacturer: 'Ford', model: 'Mustang' },
      ];

      component.onPickerSelectionChange(selections);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: selections,
      });
    });
  });

  describe('User Interactions: Clear All', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should increment clear trigger counter', () => {
      const initialTrigger = component.pickerClearTrigger;

      component.onClearAll();

      expect(component.pickerClearTrigger).toBe(initialTrigger + 1);
    });

    it('should reset filters in state service', () => {
      component.onClearAll();

      expect(mockStateService.resetFilters).toHaveBeenCalled();
    });

    it('should increment trigger for each clear', () => {
      component.onClearAll();
      expect(component.pickerClearTrigger).toBe(1);

      component.onClearAll();
      expect(component.pickerClearTrigger).toBe(2);

      component.onClearAll();
      expect(component.pickerClearTrigger).toBe(3);
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should indicate no active filters when modelCombos empty', () => {
      component.currentFilters = { page: 1, size: 20 };

      expect(component.hasActiveFilters).toBe(false);
    });

    it('should indicate active filters when modelCombos present', () => {
      component.currentFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      };

      expect(component.hasActiveFilters).toBe(true);
    });

    it('should count selections correctly', () => {
      component.currentFilters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Chevrolet', model: 'Corvette' },
        ],
      };

      expect(component.selectionCount).toBe(2);
    });

    it('should return zero when no selections', () => {
      component.currentFilters = {};

      expect(component.selectionCount).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should complete destroy subject on ngOnDestroy', () => {
      fixture.detectChanges();

      const destroySpy = jasmine.createSpy('complete');
      (component as any).destroy$.subscribe({ complete: destroySpy });

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should unsubscribe from filters on destroy', () => {
      fixture.detectChanges();

      const initialSubscriptions = filtersSubject.observers.length;
      component.ngOnDestroy();

      expect(filtersSubject.observers.length).toBeLessThan(initialSubscriptions);
    });

    it('should not process filter updates after destroy', (done) => {
      fixture.detectChanges();
      const initialSelections = [...component.pickerInitialSelections];

      component.ngOnDestroy();

      filtersSubject.next({
        modelCombos: [{ manufacturer: 'New', model: 'Model' }],
      });

      setTimeout(() => {
        expect(component.pickerInitialSelections).toEqual(initialSelections);
        done();
      }, 10);
    });
  });

  describe('Gridster Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should configure drag handlers correctly for all grids', () => {
      component.grids.forEach(grid => {
        expect(grid.options.draggable?.enabled).toBe(true);
        expect(grid.options.draggable?.dragHandleClass).toBe('drag-handle');
        expect(grid.options.draggable?.ignoreContentClass).toBe('no-drag');
      });
    });

    it('should configure resize handlers correctly for all grids', () => {
      component.grids.forEach(grid => {
        expect(grid.options.resizable?.enabled).toBe(true);
      });
    });

    it('should have consistent grid configuration across all grids', () => {
      component.grids.forEach(grid => {
        expect(grid.options.gridType).toBe('fit');
        expect(grid.options.compactType).toBeDefined(); // CompactType.None
        expect(grid.options.swap).toBe(false);
        expect(grid.options.pushItems).toBe(true);
      });
    });

    it('should have drag stop callbacks configured', () => {
      component.grids.forEach(grid => {
        expect(grid.options.draggable?.stop).toBeDefined();
      });
    });

    it('should have empty cell drop callbacks configured', () => {
      component.grids.forEach(grid => {
        expect(grid.options.emptyCellDropCallback).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined modelCombos gracefully', () => {
      filtersSubject.next({ page: 1, size: 20 });
      fixture.detectChanges();

      expect(component.pickerInitialSelections).toEqual([]);
      expect(component.selectionCount).toBe(0);
    });

    it('should handle rapid grid layout changes', () => {
      fixture.detectChanges();

      const item1 = { cols: 2, rows: 2, y: 0, x: 0, id: 'test-1', panelType: 'picker' as 'picker' };
      const item2 = { cols: 2, rows: 3, y: 0, x: 0, id: 'test-1', panelType: 'picker' as 'picker' };
      const item3 = { cols: 2, rows: 4, y: 0, x: 0, id: 'test-1', panelType: 'picker' as 'picker' };

      component.grids[0].items = [item1];
      component.onGridChange('grid-0', item1, null);

      component.grids[0].items = [item2];
      component.onGridChange('grid-0', item2, null);

      component.grids[0].items = [item3];
      component.onGridChange('grid-0', item3, null);

      const savedState = localStorage.getItem('autos-workshop-multi-grid-state');
      const parsed = JSON.parse(savedState!);
      expect(parsed['grid-0'][0].rows).toBe(4); // Latest state
    });

    it('should preserve other filter properties', () => {
      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        yearMin: 1960,
        yearMax: 1980,
        page: 3,
      });
      fixture.detectChanges();

      expect(component.currentFilters.yearMin).toBe(1960);
      expect(component.currentFilters.yearMax).toBe(1980);
      expect(component.currentFilters.page).toBe(3);
    });

    it('should handle empty grid state from localStorage', () => {
      localStorage.setItem('autos-workshop-multi-grid-state', JSON.stringify({}));

      fixture = TestBed.createComponent(WorkshopComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Empty saved state means grids have no panels (user cleared them)
      expect(component.grids[0].items.length).toBe(0);
      expect(component.grids[1].items.length).toBe(0);
    });
  });
});
