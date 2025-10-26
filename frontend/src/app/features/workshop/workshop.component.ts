import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { GridTransferService } from '../../core/services/grid-transfer.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';
import { WorkspacePanel } from '../../models/workspace-panel.model';
import { GridsterConfig, GridType, CompactType } from 'angular-gridster2';

@Component({
  selector: 'app-workshop',
  templateUrl: './workshop.component.html',
  styleUrls: ['./workshop.component.scss'],
})
export class WorkshopComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Grid configurations
  leftGridOptions!: GridsterConfig;
  rightGridOptions!: GridsterConfig;

  // Grid items
  leftGridItems: WorkspacePanel[] = [];
  rightGridItems: WorkspacePanel[] = [];

  // Panel collapse states
  leftPanelCollapsed = false;
  rightPanelCollapsed = false;

  // State passed to picker
  pickerClearTrigger = 0;
  pickerInitialSelections: ManufacturerModelSelection[] = [];

  // Current filters from state
  currentFilters: SearchFilters = {};

  constructor(
    private stateService: StateManagementService,
    private gridTransfer: GridTransferService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeGrids();
    this.loadGridState();
    this.subscribeToGridChanges();
    this.subscribeToStateFilters();
  }

  private initializeGrids(): void {
    const baseConfig: GridsterConfig = {
      gridType: GridType.Fit,
      compactType: CompactType.None,
      margin: 10,
      outerMargin: true,
      outerMarginTop: null,
      outerMarginRight: null,
      outerMarginBottom: null,
      outerMarginLeft: null,
      useTransformPositioning: true,
      mobileBreakpoint: 640,
      minCols: 1,
      maxCols: 100,
      minRows: 1,
      maxRows: 100,
      maxItemCols: 100,
      minItemCols: 1,
      maxItemRows: 100,
      minItemRows: 1,
      maxItemArea: 2500,
      minItemArea: 1,
      defaultItemCols: 1,
      defaultItemRows: 1,
      fixedColWidth: 105,
      fixedRowHeight: 105,
      enableEmptyCellClick: false,
      enableEmptyCellContextMenu: false,
      enableEmptyCellDrop: true,
      enableEmptyCellDrag: false,
      enableOccupiedCellDrop: false,
      emptyCellDragMaxCols: 50,
      emptyCellDragMaxRows: 50,
      ignoreMarginInRow: false,
      draggable: {
        enabled: true,
        ignoreContentClass: 'no-drag',
        ignoreContent: false,
        dragHandleClass: 'drag-handle',
        stop: undefined,
        start: undefined
      },
      resizable: {
        enabled: true
      },
      swap: false,
      pushItems: true,
      disablePushOnDrag: false,
      disablePushOnResize: false,
      pushDirections: { north: true, east: true, south: true, west: true },
      pushResizeItems: false,
      displayGrid: 'onDrag&Resize',
      disableWindowResize: false,
      disableWarnings: false,
      scrollToNewItems: false,
      itemChangeCallback: undefined,
      itemResizeCallback: undefined
    };

    // Left grid configuration
    this.leftGridOptions = {
      ...baseConfig,
      emptyCellDropCallback: this.onLeftGridDrop.bind(this),
      draggable: {
        ...baseConfig.draggable,
        stop: this.onDragStop.bind(this, 'left')
      },
      itemChangeCallback: this.onLeftGridChange.bind(this)
    };

    // Right grid configuration
    this.rightGridOptions = {
      ...baseConfig,
      emptyCellDropCallback: this.onRightGridDrop.bind(this),
      draggable: {
        ...baseConfig.draggable,
        stop: this.onDragStop.bind(this, 'right')
      },
      itemChangeCallback: this.onRightGridChange.bind(this)
    };
  }

  private loadGridState(): void {
    const savedState = localStorage.getItem('autos-workshop-dual-grid-state');
    if (savedState) {
      const state = JSON.parse(savedState);
      this.leftGridItems = state.leftGrid || [];
      this.rightGridItems = state.rightGrid || [];
    } else {
      // Initialize with default panels
      this.leftGridItems = [
        { cols: 2, rows: 3, y: 0, x: 0, id: 'left-picker', panelType: 'picker' }
      ];

      this.rightGridItems = [
        { cols: 2, rows: 3, y: 0, x: 0, id: 'right-results', panelType: 'results' }
      ];
    }

    this.gridTransfer.setGrids(this.leftGridItems, this.rightGridItems);
  }

  private subscribeToGridChanges(): void {
    this.gridTransfer.leftGrid$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(items => {
      this.leftGridItems = items;
      this.saveGridState();
    });

    this.gridTransfer.rightGrid$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(items => {
      this.rightGridItems = items;
      this.saveGridState();
    });
  }

  private subscribeToStateFilters(): void {
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

  private saveGridState(): void {
    const state = {
      leftGrid: this.leftGridItems,
      rightGrid: this.rightGridItems
    };
    localStorage.setItem('autos-workshop-dual-grid-state', JSON.stringify(state));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drag & Drop Handlers
  onDragStop(sourceGrid: 'left' | 'right', item: WorkspacePanel, gridsterItem: any, event: MouseEvent): void {
    const targetGrid = this.detectTargetGrid(event);

    if (targetGrid && targetGrid !== sourceGrid) {
      // Cross-grid drop detected
      this.gridTransfer.transferItem(item, sourceGrid, targetGrid);
    }
  }

  private detectTargetGrid(event: MouseEvent): 'left' | 'right' | null {
    const leftGridEl = document.querySelector('.left-grid');
    const rightGridEl = document.querySelector('.right-grid');

    if (!leftGridEl || !rightGridEl) return null;

    const leftRect = leftGridEl.getBoundingClientRect();
    const rightRect = rightGridEl.getBoundingClientRect();

    const x = event.clientX;
    const y = event.clientY;

    // Check if coordinates are within left grid
    if (x >= leftRect.left && x <= leftRect.right &&
        y >= leftRect.top && y <= leftRect.bottom) {
      return 'left';
    }

    // Check if coordinates are within right grid
    if (x >= rightRect.left && x <= rightRect.right &&
        y >= rightRect.top && y <= rightRect.bottom) {
      return 'right';
    }

    return null;
  }

  onLeftGridDrop(event: MouseEvent, item: WorkspacePanel): void {
    console.log('Item dropped on left grid:', item);
  }

  onRightGridDrop(event: MouseEvent, item: WorkspacePanel): void {
    console.log('Item dropped on right grid:', item);
  }

  onLeftGridChange(item: WorkspacePanel, gridsterItem: any): void {
    this.saveGridState();
  }

  onRightGridChange(item: WorkspacePanel, gridsterItem: any): void {
    this.saveGridState();
  }

  // Panel Actions
  removePanel(item: WorkspacePanel, grid: 'left' | 'right'): void {
    if (grid === 'left') {
      const index = this.leftGridItems.indexOf(item);
      this.leftGridItems.splice(index, 1);
    } else {
      const index = this.rightGridItems.indexOf(item);
      this.rightGridItems.splice(index, 1);
    }
    this.saveGridState();
  }

  addPanel(grid: 'left' | 'right', panelType: 'picker' | 'results'): void {
    const newItem: WorkspacePanel = {
      cols: 2,
      rows: 2,
      y: 0,
      x: 0,
      id: `${grid}-${Date.now()}`,
      panelType
    };

    if (grid === 'left') {
      this.leftGridItems.push(newItem);
    } else {
      this.rightGridItems.push(newItem);
    }

    this.saveGridState();
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
