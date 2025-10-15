import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';
import { KtdGridLayout, KtdGridLayoutItem, ktdTrackById } from '@katoid/angular-grid-layout';

@Component({
  selector: 'app-workshop',
  templateUrl: './workshop.component.html',
  styleUrls: ['./workshop.component.scss']
})
export class WorkshopComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

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

  constructor(private stateService: StateManagementService) {}

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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