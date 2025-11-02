import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { GridTransferService } from '../../core/services/grid-transfer.service';
import { PanelPopoutService } from '../../core/services/panel-popout.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';
import { VehicleStatistics, HistogramData } from '../../models/vehicle-statistics.model';
import { WorkspacePanel } from '../../models/workspace-panel.model';
import { GridConfig } from '../../models/grid-config.model';
import { GridsterConfig, GridType, CompactType } from 'angular-gridster2';
import { QueryFilter } from '../filters/query-control/query-control.component';

/**
 * DiscoverPageComponent - AUTOS with Grid Workspace
 *
 * Features dual-grid workspace with drag-and-drop panels
 * Moved from Workshop (experimental design promoted to main page)
 */
@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrls: ['./discover.component.scss'],
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Grid configurations (array for N grids)
  grids: GridConfig[] = [];

  // Panel collapse states (keyed by grid ID)
  panelCollapseStates: Map<string, boolean> = new Map();

  // State passed to picker
  pickerClearTrigger = 0;
  pickerInitialSelections: ManufacturerModelSelection[] = [];

  // Current filters from state
  currentFilters: SearchFilters = {};

  constructor(
    private stateService: StateManagementService,
    private gridTransfer: GridTransferService,
    private popoutService: PanelPopoutService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeGrids();
    this.loadGridState();
    this.subscribeToGridChanges();
    this.subscribeToStateFilters();
  }

  private initializeGrids(): void {
    // Define grid configurations
    const gridDefinitions = [
      { id: 'grid-0', name: 'Left Workspace', borderColor: '#1890ff' },
      { id: 'grid-1', name: 'Right Workspace', borderColor: '#52c41a' }
    ];

    this.grids = gridDefinitions.map(def => this.createGridConfig(def.id, def.name, def.borderColor));
  }

  private createGridConfig(id: string, name: string, borderColor: string): GridConfig {
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
        stop: (item, gridsterItem, event) => this.onDragStop(id, item, gridsterItem, event),
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
      emptyCellDropCallback: (event, item) => this.onGridDrop(id, event, item),
      itemChangeCallback: (item, itemComponent) => this.onGridChange(id, item, itemComponent),
      itemResizeCallback: undefined
    };

    return {
      id,
      name,
      borderColor,
      options: baseConfig,
      items: []
    };
  }

  private loadGridState(): void {
    const savedState = localStorage.getItem('autos-discover-grid-state');

    if (savedState) {
      const state = JSON.parse(savedState);
      // Load items into each grid
      this.grids.forEach(grid => {
        grid.items = state[grid.id] || [];
        this.panelCollapseStates.set(grid.id, false);
      });

      // Migration: Check if query-control panel exists in grid-0
      const grid0Items = this.grids[0].items;
      const hasQueryControl = grid0Items.some(item => item.panelType === 'query-control');

      if (!hasQueryControl) {
        // Add query-control panel at the top
        console.log('Migrating layout: Adding query-control panel to grid-0');

        // Shift existing panels down
        grid0Items.forEach(item => {
          if (item.y !== undefined) {
            item.y += 2; // Shift down by 2 rows to make room
          }
        });

        // Add query-control panel at top
        grid0Items.unshift({
          cols: 12,
          rows: 2,
          y: 0,
          x: 0,
          id: 'query-control-1',
          panelType: 'query-control'
        });

        // Save updated state
        this.saveGridState();
      }
    } else {
      // Initialize with default panels
      this.grids[0].items = [
        { cols: 12, rows: 2, y: 0, x: 0, id: 'query-control-1', panelType: 'query-control' },
        { cols: 12, rows: 8, y: 2, x: 0, id: 'plotly-charts-1', panelType: 'plotly-charts' },
        { cols: 12, rows: 16, y: 10, x: 0, id: 'picker-1', panelType: 'picker' }
      ];
      this.grids[1].items = [
        { cols: 12, rows: 10, y: 0, x: 0, id: 'results-1', panelType: 'results' }
      ];
    }

    // Initialize collapse states
    this.grids.forEach(grid => {
      this.panelCollapseStates.set(grid.id, false);
    });

    // Sync to transfer service
    const gridsMap = new Map<string, WorkspacePanel[]>();
    this.grids.forEach(grid => {
      gridsMap.set(grid.id, grid.items);
    });
    this.gridTransfer.setGrids(gridsMap);
  }

  private subscribeToGridChanges(): void {
    this.gridTransfer.grids$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(gridsMap => {
      this.grids.forEach(grid => {
        grid.items = gridsMap.get(grid.id) || [];
      });
      this.saveGridState();
    });
  }

  private subscribeToStateFilters(): void {
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('Discover: Filters updated from URL:', filters);

        this.currentFilters = filters;

        if (filters.modelCombos && filters.modelCombos.length > 0) {
          this.pickerInitialSelections = [...filters.modelCombos];
        } else {
          this.pickerInitialSelections = [];
        }
      });
  }

  private saveGridState(): void {
    const state: { [gridId: string]: WorkspacePanel[] } = {};
    this.grids.forEach(grid => {
      state[grid.id] = grid.items;
    });
    localStorage.setItem('autos-discover-grid-state', JSON.stringify(state));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drag & Drop Handlers
  onDragStop(sourceGridId: string, item: WorkspacePanel, gridsterItem: any, event: MouseEvent): void {
    const targetGridId = this.detectTargetGrid(event);

    if (targetGridId && targetGridId !== sourceGridId) {
      // Cross-grid drop detected
      this.gridTransfer.transferItem(item, sourceGridId, targetGridId);
    }
  }

  private detectTargetGrid(event: MouseEvent): string | null {
    const x = event.clientX;
    const y = event.clientY;

    // Check each grid to see if coordinates are within bounds
    for (const grid of this.grids) {
      const gridEl = document.querySelector(`.grid-wrapper[data-grid-id="${grid.id}"]`);
      if (!gridEl) continue;

      const rect = gridEl.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right &&
          y >= rect.top && y <= rect.bottom) {
        return grid.id;
      }
    }

    return null;
  }

  onGridDrop(gridId: string, event: MouseEvent, item: WorkspacePanel): void {
    console.log(`Item dropped on grid ${gridId}:`, item);
  }

  onGridChange(gridId: string, item: WorkspacePanel, gridsterItem: any): void {
    this.saveGridState();
  }

  // Panel Actions
  removePanel(item: WorkspacePanel, gridId: string): void {
    this.gridTransfer.removeItem(gridId, item.id!);
  }

  addPanel(gridId: string, panelType: 'picker' | 'results'): void {
    const newItem: WorkspacePanel = {
      cols: 2,
      rows: 2,
      y: 0,
      x: 0,
      id: `${gridId}-${panelType}-${Date.now()}`,
      panelType
    };

    this.gridTransfer.addItem(gridId, newItem);
  }

  // Helper to get collapse state for a grid
  getPanelCollapseState(gridId: string): boolean {
    return this.panelCollapseStates.get(gridId) || false;
  }

  // Helper to toggle collapse state for a grid
  togglePanelCollapse(gridId: string): void {
    const currentState = this.panelCollapseStates.get(gridId) || false;
    this.panelCollapseStates.set(gridId, !currentState);
  }

  // Pop-out panel to new window
  popOutPanel(gridId: string, panel: WorkspacePanel): void {
    this.popoutService.popOutPanel(gridId, panel);
  }

  onPickerSelectionChange(selections: ManufacturerModelSelection[]): void {
    console.log('Discover: Picker selections changed:', selections);
    this.stateService.updateFilters({
      modelCombos: selections.length > 0 ? selections : undefined,
    });
  }

  onClearAll(): void {
    console.log('Discover: Clear all triggered');
    this.pickerClearTrigger++;
    this.stateService.resetFilters();
  }

  onFilterAdd(filter: QueryFilter): void {
    console.log('Discover: Query filter added:', filter);

    const updates: Partial<SearchFilters> = {};

    // Map filter to SearchFilters properties
    if (filter.type === 'range') {
      // Handle range filters (year)
      if (filter.field === 'year') {
        if (filter.rangeMin !== undefined) {
          updates.yearMin = filter.rangeMin;
        }
        if (filter.rangeMax !== undefined) {
          updates.yearMax = filter.rangeMax;
        }
      }
    } else if (filter.type === 'multiselect') {
      // Handle multiselect filters (manufacturer, model, bodyClass, dataSource)
      if (filter.field === 'manufacturer') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple manufacturers with comma
          updates.manufacturer = filter.values.join(',');
        } else {
          // Clear manufacturer filter when array is empty
          updates.manufacturer = undefined;
        }
      } else if (filter.field === 'model') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple models with comma
          updates.model = filter.values.join(',');
        } else {
          // Clear model filter when array is empty
          updates.model = undefined;
        }
      } else if (filter.field === 'bodyClass') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple body classes with comma
          updates.bodyClass = filter.values.join(',');
        } else {
          // Clear body class filter when array is empty
          updates.bodyClass = undefined;
        }
      } else if (filter.field === 'dataSource') {
        if (filter.values && filter.values.length > 0) {
          // Join multiple data sources with comma
          updates.dataSource = filter.values.join(',');
        } else {
          // Clear data source filter when array is empty
          updates.dataSource = undefined;
        }
      }
    } else {
      // Handle string/number filters
      if (filter.field === 'manufacturer') {
        updates.manufacturer = filter.value as string;
      } else if (filter.field === 'model') {
        updates.model = filter.value as string;
      } else if (filter.field === 'body_class') {
        updates.bodyClass = filter.value as string;
      } else if (filter.field === 'data_source') {
        updates.dataSource = filter.value as string;
      }
    }

    this.stateService.updateFilters(updates);
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

  // ===== Histogram Charts Support =====

  get statistics(): VehicleStatistics | null {
    // Get statistics from state service
    const state = this.stateService.currentState;
    return state?.statistics || null;
  }

  get selectedManufacturer(): string | null {
    return this.stateService.currentState?.selectedManufacturer || null;
  }

  get selectedYearRange(): string | null {
    const filters = this.currentFilters;
    if (filters.yearMin && filters.yearMax) {
      // Find matching year range
      const ranges = [
        '1960-1969', '1970-1979', '1980-1989', '1990-1999',
        '2000-2009', '2010-2019', '2020-2025'
      ];

      for (const range of ranges) {
        const [min, max] = range.split('-').map(Number);
        if (filters.yearMin === min && filters.yearMax === max) {
          return range;
        }
      }
    }
    return null;
  }

  get selectedBodyClass(): string | null {
    const bodyClass = this.currentFilters.bodyClass;
    // If it's a comma-separated list, take the first one for selection highlighting
    return bodyClass ? bodyClass.split(',')[0] : null;
  }

  get manufacturerHistogramData(): HistogramData[] {
    if (!this.statistics?.byManufacturer) return [];

    return Object.entries(this.statistics.byManufacturer)
      .map(([label, count]) => ({ label, count }));
  }

  get modelsHistogramData(): HistogramData[] {
    if (!this.statistics?.modelsByManufacturer) return [];

    const selectedMfr = this.selectedManufacturer;
    const data: HistogramData[] = [];

    Object.entries(this.statistics.modelsByManufacturer).forEach(
      ([manufacturer, models]) => {
        // Filter by selected manufacturer if set
        if (selectedMfr && manufacturer !== selectedMfr) return;

        Object.entries(models).forEach(([model, count]) => {
          data.push({
            label: `${manufacturer} ${model}`,
            count: count as number
          });
        });
      }
    );

    return data;
  }

  get yearRangeHistogramData(): HistogramData[] {
    if (!this.statistics?.byYearRange) return [];

    // Return in chronological order, filtering out ranges with zero count
    const ranges = [
      '1960-1969', '1970-1979', '1980-1989', '1990-1999',
      '2000-2009', '2010-2019', '2020-2025'
    ];

    return ranges
      .filter(range => this.statistics!.byYearRange[range] > 0)
      .map(range => ({
        label: range,
        count: this.statistics!.byYearRange[range]
      }));
  }

  get bodyClassHistogramData(): HistogramData[] {
    if (!this.statistics?.byBodyClass) return [];

    return Object.entries(this.statistics.byBodyClass)
      .map(([label, count]) => ({ label, count }));
  }

  onManufacturerBarClick(manufacturer: string): void {
    // Toggle selection
    const currentSelection = this.selectedManufacturer;

    if (currentSelection === manufacturer) {
      // Deselect
      this.stateService.selectManufacturer(null);
    } else {
      // Select
      this.stateService.selectManufacturer(manufacturer);
    }
  }

  onYearRangeBarClick(yearRange: string): void {
    // Parse "1990-1999" → yearMin: 1990, yearMax: 1999
    const [minStr, maxStr] = yearRange.split('-');
    const yearMin = parseInt(minStr, 10);
    const yearMax = parseInt(maxStr, 10);

    // Check if this range is already selected
    const currentMin = this.currentFilters.yearMin;
    const currentMax = this.currentFilters.yearMax;

    if (currentMin === yearMin && currentMax === yearMax) {
      // Deselect - clear year filters
      this.stateService.updateFilters({
        yearMin: undefined,
        yearMax: undefined
      });
    } else {
      // Select - update year filters
      this.stateService.updateFilters({
        yearMin,
        yearMax
      });
    }
  }

  onBodyClassBarClick(bodyClass: string): void {
    // Check if already selected
    const currentBodyClass = this.currentFilters.bodyClass;

    if (currentBodyClass === bodyClass) {
      // Deselect - clear body class filter
      this.stateService.updateFilters({
        bodyClass: undefined
      });
    } else {
      // Select - update body class filter
      this.stateService.updateFilters({
        bodyClass: bodyClass
      });
    }
  }
}
