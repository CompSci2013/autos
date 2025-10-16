import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';
import { KtdGridLayout, KtdGridLayoutItem, ktdTrackById, KtdGridComponent } from '@katoid/angular-grid-layout';

@Component({
  selector: 'app-workshop',
  templateUrl: './workshop.component.html',
  styleUrls: ['./workshop.component.scss']
})
export class WorkshopComponent implements OnInit, OnDestroy {
  @ViewChild(KtdGridComponent) grid?: KtdGridComponent;
  
  private destroy$ = new Subject<void>();
  private gridDragEnabled = true;

  // Grid layout configuration
  cols = 12;
  rowHeight = 50;
  gap = 16;
  layout: KtdGridLayout = [
    { id: 'picker', x: 0, y: 0, w: 12, h: 16 },
    { id: 'results', x: 0, y: 16, w: 12, h: 14 }
  ];
  trackById = ktdTrackById;

  // Panel collapse states
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
    // Load saved layout from localStorage
    const savedLayout = localStorage.getItem('autos-workshop-layout');
    if (savedLayout) {
      this.layout = JSON.parse(savedLayout);
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupColumnDragListeners(): void {
    // Wait for the view to initialize
    setTimeout(() => {
      const gridElement = this.el.nativeElement.querySelector('.grid-container');
      
      if (gridElement) {
        // Listen for CDK drag start (from table columns)
        this.renderer.listen('document', 'mousedown', (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          // Check if the mousedown is on a draggable table header
          if (target.closest('.draggable-header')) {
            console.log('Column drag detected - disabling grid');
            this.disableGridDrag();
          }
        });

        // Listen for CDK drag end
        this.renderer.listen('document', 'mouseup', (event: MouseEvent) => {
          // Re-enable grid drag after any drag operation ends
          if (!this.gridDragEnabled) {
            console.log('Drag ended - re-enabling grid');
            setTimeout(() => this.enableGridDrag(), 100);
          }
        });

        // Additional safety: listen for cdkDragStarted and cdkDragEnded events
        this.renderer.listen('document', 'cdkDragStarted', () => {
          console.log('CDK Drag started - disabling grid');
          this.disableGridDrag();
        });

        this.renderer.listen('document', 'cdkDragEnded', () => {
          console.log('CDK Drag ended - re-enabling grid');
          setTimeout(() => this.enableGridDrag(), 100);
        });
      }
    }, 500);
  }

  private disableGridDrag(): void {
    if (this.gridDragEnabled) {
      this.gridDragEnabled = false;
      const gridElement = this.el.nativeElement.querySelector('.grid-container');
      if (gridElement) {
        this.renderer.addClass(gridElement, 'grid-drag-disabled');
      }
      
      // Disable draggable on all grid items
      const gridItems = this.el.nativeElement.querySelectorAll('ktd-grid-item');
      gridItems.forEach((item: HTMLElement) => {
        this.renderer.setStyle(item, 'pointer-events', 'none');
      });
      
      // Re-enable pointer events for table content
      const tables = this.el.nativeElement.querySelectorAll('.results-table-container');
      tables.forEach((table: HTMLElement) => {
        this.renderer.setStyle(table, 'pointer-events', 'auto');
      });
    }
  }

  private enableGridDrag(): void {
    if (!this.gridDragEnabled) {
      this.gridDragEnabled = true;
      const gridElement = this.el.nativeElement.querySelector('.grid-container');
      if (gridElement) {
        this.renderer.removeClass(gridElement, 'grid-drag-disabled');
      }
      
      // Re-enable draggable on all grid items
      const gridItems = this.el.nativeElement.querySelectorAll('ktd-grid-item');
      gridItems.forEach((item: HTMLElement) => {
        this.renderer.removeStyle(item, 'pointer-events');
      });
    }
  }

  onLayoutUpdated(layout: KtdGridLayout): void {
    this.layout = layout;
    // Save layout to localStorage
    localStorage.setItem('autos-workshop-layout', JSON.stringify(layout));
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