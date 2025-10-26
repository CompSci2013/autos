import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';
import { GridsterConfig, GridsterItem } from 'angular-gridster2';

@Component({
  selector: 'app-workshop',
  templateUrl: './workshop.component.html',
  styleUrls: ['./workshop.component.scss'],
})
export class WorkshopComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Gridster options for both grids
  options1!: GridsterConfig;
  options2!: GridsterConfig;

  // Dashboard layouts
  dashboard1!: Array<GridsterItem>;
  dashboard2!: Array<GridsterItem>;

  // Panel collapse states
  demoCollapsed = false;
  pickerCollapsed = false;
  resultsCollapsed = false;
  pickerComparisonCollapsed = false; // ✅ ADDED

  // State passed to picker
  pickerClearTrigger = 0;
  pickerInitialSelections: ManufacturerModelSelection[] = [];

  // Current filters from state
  currentFilters: SearchFilters = {};

  constructor(
    private stateService: StateManagementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialize Gridster options for grid 1
    this.options1 = {
      gridType: 'fit',
      displayGrid: 'onDrag&Resize',
      pushItems: true,
      draggable: {
        enabled: true,
        ignoreContent: true,
        dragHandleClass: 'drag-handler',
      },
      resizable: {
        enabled: true,
      },
      swap: true,
      margin: 2,
      outerMargin: true,
      minCols: 12,
      maxCols: 12,
      minRows: 1,
      maxRows: 100,
      itemChangeCallback: (item: GridsterItem, itemComponent: any) => {
        this.itemChange(item, itemComponent);
      },
      itemResizeCallback: (item: GridsterItem, itemComponent: any) => {
        this.itemResize(item, itemComponent);
      },
    };

    // Initialize Gridster options for grid 2
    this.options2 = {
      gridType: 'fit',
      displayGrid: 'onDrag&Resize',
      pushItems: true,
      draggable: {
        enabled: true,
        ignoreContent: true,
        dragHandleClass: 'drag-handler',
      },
      resizable: {
        enabled: true,
      },
      swap: false,
      margin: 16,
      outerMargin: true,
      minCols: 12,
      maxCols: 12,
      minRows: 1,
      maxRows: 100,
      itemChangeCallback: this.itemChange.bind(this),
      itemResizeCallback: this.itemResize.bind(this),
    };

    // Load saved layout 1 (Picker Comparison + Results Table Demo grid)
    const savedLayout1 = localStorage.getItem('autos-workshop-layout1');
    if (savedLayout1) {
      this.dashboard1 = JSON.parse(savedLayout1);
    } else {
      // ✅ UPDATED: Two items instead of one
      this.dashboard1 = [
        { cols: 12, rows: 16, y: 0, x: 0 }, // Picker Comparison
        { cols: 12, rows: 20, y: 16, x: 0 }, // Results Table Demo (increased from 14 to 20 for more vertical space)
      ];
    }

    // Load saved layout 2 (Picker + Results grid)
    const savedLayout2 = localStorage.getItem('autos-workshop-layout2');
    if (savedLayout2) {
      this.dashboard2 = JSON.parse(savedLayout2);
    } else {
      this.dashboard2 = [
        { cols: 12, rows: 16, y: 0, x: 0 },
        { cols: 12, rows: 50, y: 16, x: 0 },
      ];
    }

    // Subscribe to filters from state
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('Workshop: Filters updated from URL:', filters);

        this.currentFilters = filters;

        if (filters.modelCombos && filters.modelCombos.length > 0) {
          this.pickerInitialSelections = [...filters.modelCombos];
        } else {
          this.pickerInitialSelections = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  itemChange(item: GridsterItem, itemComponent: any): void {
    console.log('Item changed:', item);
    console.log('Current dashboard1:', JSON.stringify(this.dashboard1));
    this.cdr.detectChanges();
    this.saveLayouts();
  }

  itemResize(item: GridsterItem, itemComponent: any): void {
    console.log('Item resized:', item);
    console.log('Current dashboard1:', JSON.stringify(this.dashboard1));
    this.cdr.detectChanges();
    this.saveLayouts();
  }

  saveLayouts(): void {
    localStorage.setItem(
      'autos-workshop-layout1',
      JSON.stringify(this.dashboard1)
    );
    localStorage.setItem(
      'autos-workshop-layout2',
      JSON.stringify(this.dashboard2)
    );
  }

  onPickerSelectionChange(selections: ManufacturerModelSelection[]): void {
    console.log('Workshop: Picker selections changed:', selections);
    this.stateService.updateFilters({
      modelCombos: selections.length > 0 ? selections : undefined,
    });
  }

  onClearAll(): void {
    console.log('Workshop: Clear all triggered');
    this.pickerClearTrigger++;
    this.stateService.resetFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.currentFilters.modelCombos &&
      this.currentFilters.modelCombos.length > 0
    );
  }

  get selectionCount(): number {
    return this.currentFilters.modelCombos?.length || 0;
  }
}
