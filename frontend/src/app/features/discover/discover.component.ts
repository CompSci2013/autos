import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';

/**
 * DiscoverPageComponent - AUTOS MVP
 *
 * Parent component that:
 * 1. Reads state from StateManagementService (which reads from URL)
 * 2. Passes state to picker component as inputs
 * 3. Receives picker events and updates state (which updates URL)
 */
@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrls: ['./discover.component.scss'],
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State passed to picker
  pickerClearTrigger = 0;
  pickerInitialSelections: ManufacturerModelSelection[] = [];

  // Current filters from state
  currentFilters: SearchFilters = {};

  constructor(private stateService: StateManagementService) {}

  ngOnInit(): void {
    // Subscribe to filters from state (which come from URL)
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        console.log('DiscoverPage: Filters updated from URL:', filters);
        
        this.currentFilters = filters;

        // Update picker's initial selections when URL changes
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

  /**
   * Handle picker selection changes
   * User clicked "Apply" button with selections
   */
  onPickerSelectionChange(selections: ManufacturerModelSelection[]): void {
    console.log('DiscoverPage: Picker selections changed:', selections);

    // Update state (which will update URL)
    this.stateService.updateFilters({
      modelCombos: selections.length > 0 ? selections : undefined,
    });
  }

  /**
   * Handle clear all button
   */
  onClearAll(): void {
    console.log('DiscoverPage: Clear all triggered');
    
    // Increment trigger to signal picker to clear
    this.pickerClearTrigger++;

    // Clear filters in state (which clears URL)
    this.stateService.resetFilters();
  }

  /**
   * Check if any filters are active
   */
  get hasActiveFilters(): boolean {
    return !!(
      this.currentFilters.modelCombos &&
      this.currentFilters.modelCombos.length > 0
    );
  }

  /**
   * Get selection count for display
   */
  get selectionCount(): number {
    return this.currentFilters.modelCombos?.length || 0;
  }
}