import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';
import {
  KtdGridLayout,
  KtdGridLayoutItem,
  ktdTrackById,
  KtdGridComponent,
} from '@katoid/angular-grid-layout';

@Component({
  selector: 'app-workshop',
  templateUrl: './workshop.component.html',
  styleUrls: ['./workshop.component.scss'],
})
export class WorkshopComponent implements OnInit, OnDestroy {
  @ViewChild(KtdGridComponent) grid?: KtdGridComponent;

  private destroy$ = new Subject<void>();
  private gridDragEnabled = true;
  // Add these properties to store listener cleanup functions
  private documentListeners: Array<() => void> = [];

  // Grid 1 layout configuration (Results Table Demo only)
  cols1 = 12;
  rowHeight1 = 50;
  gap1 = 16;
  layout1: KtdGridLayout = [{ id: 'results', x: 0, y: 0, w: 12, h: 12 }];

  // Grid 2 layout configuration (Original: Picker + Results)
  cols2 = 12;
  rowHeight2 = 50;
  gap2 = 16;
  layout2: KtdGridLayout = [
    { id: 'picker', x: 0, y: 0, w: 12, h: 16 },
    { id: 'demo', x: 0, y: 16, w: 12, h: 14 },
  ];
  trackById = ktdTrackById;

  // Panel collapse states
  demoCollapsed = false; // Add this line
  pickerCollapsed = false;
  resultsCollapsed = false;

  // State passed to picker
  pickerClearTrigger = 0;
  pickerInitialSelections: ManufacturerModelSelection[] = [];

  // Current filters from state
  currentFilters: SearchFilters = {};

  constructor(
    private stateService: StateManagementService,
    private renderer: Renderer2,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    // Load saved layout 1 (Results Table Demo grid)
    const savedLayout1 = localStorage.getItem('autos-workshop-layout1');
    if (savedLayout1) {
      this.layout1 = JSON.parse(savedLayout1);
    }

    // Load saved layout 2 (Picker + Results grid)
    const savedLayout2 = localStorage.getItem('autos-workshop-layout2');
    if (savedLayout2) {
      this.layout2 = JSON.parse(savedLayout2);
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

    // Set up listeners for column drag events
    this.setupColumnDragListeners();
  }

  ngOnDestroy(): void {
    // Clean up all event listeners
    this.documentListeners.forEach((unlisten) => unlisten());
    this.documentListeners = [];

    // Re-enable grid drag to clean up any lingering state
    if (!this.gridDragEnabled) {
      this.enableGridDrag();
    }

    // Clean up RxJS subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupColumnDragListeners(): void {
    // Wait for the view to initialize
    setTimeout(() => {
      // Listen for CDK drag start (from table columns) - SCOPED to workshop
      const mousedownListener = this.renderer.listen(
        this.el.nativeElement,
        'mousedown',
        (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          // Check if the mousedown is on a draggable table header
          if (target.closest('.draggable-header')) {
            console.log('Column drag detected - disabling grid');
            this.disableGridDrag();
          }
        }
      );
      this.documentListeners.push(mousedownListener);

      // Listen for CDK drag end - SCOPED to workshop
      const mouseupListener = this.renderer.listen(
        this.el.nativeElement,
        'mouseup',
        (event: MouseEvent) => {
          // Re-enable grid drag after any drag operation ends
          if (!this.gridDragEnabled) {
            console.log('Drag ended - re-enabling grid');
            setTimeout(() => this.enableGridDrag(), 100);
          }
        }
      );
      this.documentListeners.push(mouseupListener);

      // Additional safety: listen for cdkDragStarted - SCOPED to workshop
      const dragStartListener = this.renderer.listen(
        this.el.nativeElement,
        'cdkDragStarted',
        () => {
          console.log('CDK Drag started - disabling grid');
          this.disableGridDrag();
        }
      );
      this.documentListeners.push(dragStartListener);

      // Additional safety: listen for cdkDragEnded - SCOPED to workshop
      const dragEndListener = this.renderer.listen(
        this.el.nativeElement,
        'cdkDragEnded',
        () => {
          console.log('CDK Drag ended - re-enabling grid');
          setTimeout(() => this.enableGridDrag(), 100);
        }
      );
      this.documentListeners.push(dragEndListener);
    }, 500);
  }

  private disableGridDrag(): void {
    if (this.gridDragEnabled) {
      this.gridDragEnabled = false;

      // Disable both grid containers
      const gridElements =
        this.el.nativeElement.querySelectorAll('.grid-container');
      gridElements.forEach((gridElement: HTMLElement) => {
        this.renderer.addClass(gridElement, 'grid-drag-disabled');
      });

      // Disable draggable on all grid items
      const gridItems = this.el.nativeElement.querySelectorAll('ktd-grid-item');
      gridItems.forEach((item: HTMLElement) => {
        this.renderer.setStyle(item, 'pointer-events', 'none');
      });

      // Re-enable pointer events for ALL table content (both grids)
      const tables = this.el.nativeElement.querySelectorAll(
        '.ant-table, app-results-table, app-vehicle-results-table'
      );
      tables.forEach((table: HTMLElement) => {
        this.renderer.setStyle(table, 'pointer-events', 'auto');
      });
    }
  }

  private enableGridDrag(): void {
    if (!this.gridDragEnabled) {
      this.gridDragEnabled = true;

      // Re-enable both grid containers
      const gridElements =
        this.el.nativeElement.querySelectorAll('.grid-container');
      gridElements.forEach((gridElement: HTMLElement) => {
        this.renderer.removeClass(gridElement, 'grid-drag-disabled');
      });

      // Re-enable draggable on all grid items
      const gridItems = this.el.nativeElement.querySelectorAll('ktd-grid-item');
      gridItems.forEach((item: HTMLElement) => {
        this.renderer.removeStyle(item, 'pointer-events');
      });
    }
  }

  onLayoutUpdated1(layout: KtdGridLayout): void {
    this.layout1 = layout;
    localStorage.setItem('autos-workshop-layout1', JSON.stringify(layout));
  }

  onLayoutUpdated2(layout: KtdGridLayout): void {
    this.layout2 = layout;
    localStorage.setItem('autos-workshop-layout2', JSON.stringify(layout));
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
