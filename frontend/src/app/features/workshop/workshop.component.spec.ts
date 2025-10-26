import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { WorkshopComponent } from './workshop.component';
import { StateManagementService } from '../../core/services/state-management.service';
import { BehaviorSubject } from 'rxjs';
import { SearchFilters, ManufacturerModelSelection } from '../../models';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('WorkshopComponent - URL-First State Management', () => {
  let component: WorkshopComponent;
  let fixture: ComponentFixture<WorkshopComponent>;
  let mockStateService: jasmine.SpyObj<StateManagementService>;
  let mockChangeDetectorRef: jasmine.SpyObj<ChangeDetectorRef>;
  let filtersSubject: BehaviorSubject<SearchFilters>;

  beforeEach(async () => {
    // Create filters subject
    filtersSubject = new BehaviorSubject<SearchFilters>({
      page: 1,
      size: 20,
    });

    // Create mock state service
    mockStateService = jasmine.createSpyObj('StateManagementService', [
      'updateFilters',
      'resetFilters',
      'getCurrentFilters',
    ]);

    mockChangeDetectorRef = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    // Add observable property
    Object.defineProperty(mockStateService, 'filters$', {
      get: () => filtersSubject.asObservable(),
    });

    await TestBed.configureTestingModule({
      declarations: [WorkshopComponent],
      providers: [
        { provide: StateManagementService, useValue: mockStateService },
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

    it('should initialize Gridster options', () => {
      fixture.detectChanges();

      expect(component.options1).toBeDefined();
      expect(component.options2).toBeDefined();
      expect(component.options1.gridType).toBe('fit');
      expect(component.options2.gridType).toBe('fit');
    });

    it('should initialize with default dashboard layout', () => {
      fixture.detectChanges();

      expect(component.dashboard1).toBeDefined();
      expect(component.dashboard2).toBeDefined();
      expect(component.dashboard1.length).toBe(2); // Picker Comparison + Results Demo
      expect(component.dashboard2.length).toBe(2); // Picker + Results
    });

    it('should set default dashboard1 layout when no saved layout', () => {
      fixture.detectChanges();

      expect(component.dashboard1[0]).toEqual({ cols: 12, rows: 16, y: 0, x: 0 });
      expect(component.dashboard1[1]).toEqual({ cols: 12, rows: 14, y: 16, x: 0 });
    });

    it('should set default dashboard2 layout when no saved layout', () => {
      fixture.detectChanges();

      expect(component.dashboard2[0]).toEqual({ cols: 12, rows: 16, y: 0, x: 0 });
      expect(component.dashboard2[1]).toEqual({ cols: 12, rows: 14, y: 16, x: 0 });
    });

    it('should initialize panel collapse states', () => {
      expect(component.demoCollapsed).toBe(false);
      expect(component.pickerCollapsed).toBe(false);
      expect(component.resultsCollapsed).toBe(false);
      expect(component.pickerComparisonCollapsed).toBe(false);
    });

    it('should subscribe to state filters on init', () => {
      fixture.detectChanges();

      expect(component.currentFilters).toBeDefined();
    });
  });

  describe('UI Preferences: localStorage Persistence', () => {
    it('should load saved layout1 from localStorage', () => {
      const savedLayout = [
        { cols: 6, rows: 20, y: 0, x: 0 },
        { cols: 6, rows: 20, y: 0, x: 6 },
      ];
      localStorage.setItem('autos-workshop-layout1', JSON.stringify(savedLayout));

      fixture = TestBed.createComponent(WorkshopComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.dashboard1).toEqual(savedLayout);
    });

    it('should load saved layout2 from localStorage', () => {
      const savedLayout = [
        { cols: 12, rows: 10, y: 0, x: 0 },
        { cols: 12, rows: 10, y: 10, x: 0 },
      ];
      localStorage.setItem('autos-workshop-layout2', JSON.stringify(savedLayout));

      fixture = TestBed.createComponent(WorkshopComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.dashboard2).toEqual(savedLayout);
    });

    it('should save layouts to localStorage', () => {
      fixture.detectChanges();

      component.dashboard1 = [{ cols: 12, rows: 30, y: 0, x: 0 }];
      component.dashboard2 = [{ cols: 6, rows: 15, y: 0, x: 0 }];

      component.saveLayouts();

      const savedLayout1 = localStorage.getItem('autos-workshop-layout1');
      const savedLayout2 = localStorage.getItem('autos-workshop-layout2');

      expect(savedLayout1).toBeTruthy();
      expect(savedLayout2).toBeTruthy();
      expect(JSON.parse(savedLayout1!)).toEqual(component.dashboard1);
      expect(JSON.parse(savedLayout2!)).toEqual(component.dashboard2);
    });

    it('should save layouts on item change', () => {
      fixture.detectChanges();

      const initialLayout = [...component.dashboard1];
      component.dashboard1[0] = { cols: 6, rows: 20, y: 0, x: 0 };

      component.itemChange(component.dashboard1[0], null);

      const savedLayout = localStorage.getItem('autos-workshop-layout1');
      expect(savedLayout).toBeTruthy();
      expect(JSON.parse(savedLayout!)).not.toEqual(initialLayout);
    });

    it('should save layouts on item resize', () => {
      fixture.detectChanges();

      const item = { cols: 12, rows: 25, y: 0, x: 0 };
      component.dashboard1[0] = item;

      component.itemResize(item, null);

      const savedLayout = localStorage.getItem('autos-workshop-layout1');
      expect(savedLayout).toBeTruthy();
    });

    it('should trigger change detection on layout changes', () => {
      fixture.detectChanges();

      component.itemChange(component.dashboard1[0], null);

      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
    });
  });

  describe('URL-First Principle: Storage Layer Separation', () => {
    it('should store layout in localStorage, NOT in URL', () => {
      fixture.detectChanges();

      component.dashboard1 = [{ cols: 8, rows: 20, y: 0, x: 0 }];
      component.saveLayouts();

      // Layout saved to localStorage
      expect(localStorage.getItem('autos-workshop-layout1')).toBeTruthy();

      // Should NOT call updateFilters (URL updates)
      expect(mockStateService.updateFilters).not.toHaveBeenCalled();
    });

    it('should store panel collapse states locally, NOT in URL', () => {
      fixture.detectChanges();

      component.pickerCollapsed = true;
      component.resultsCollapsed = true;

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

    it('should configure drag handlers correctly', () => {
      expect(component.options1.draggable?.enabled).toBe(true);
      expect(component.options1.draggable?.dragHandleClass).toBe('drag-handler');
      expect(component.options1.draggable?.ignoreContent).toBe(true);
    });

    it('should configure resize handlers correctly', () => {
      expect(component.options1.resizable?.enabled).toBe(true);
      expect(component.options2.resizable?.enabled).toBe(true);
    });

    it('should have grid configuration for 12-column layout', () => {
      expect(component.options1.minCols).toBe(12);
      expect(component.options1.maxCols).toBe(12);
      expect(component.options2.minCols).toBe(12);
      expect(component.options2.maxCols).toBe(12);
    });

    it('should configure swap behavior differently for grids', () => {
      expect(component.options1.swap).toBe(true);
      expect(component.options2.swap).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined modelCombos gracefully', () => {
      filtersSubject.next({ page: 1, size: 20 });
      fixture.detectChanges();

      expect(component.pickerInitialSelections).toEqual([]);
      expect(component.selectionCount).toBe(0);
    });

    it('should handle rapid layout changes', () => {
      fixture.detectChanges();

      component.dashboard1 = [{ cols: 12, rows: 10, y: 0, x: 0 }];
      component.itemChange(component.dashboard1[0], null);

      component.dashboard1 = [{ cols: 12, rows: 20, y: 0, x: 0 }];
      component.itemChange(component.dashboard1[0], null);

      component.dashboard1 = [{ cols: 12, rows: 30, y: 0, x: 0 }];
      component.itemChange(component.dashboard1[0], null);

      const savedLayout = localStorage.getItem('autos-workshop-layout1');
      expect(JSON.parse(savedLayout!)[0].rows).toBe(30); // Latest state
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
  });
});
