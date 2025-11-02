import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ManufacturerModelSelection } from '../../../models';
import { TableColumn, TableQueryParams } from '../../../shared/models';
import {
  TablePickerDataSource,
  PickerFlatRow,
} from './table-picker-data-source';
import { BaseDataTableComponent } from 'src/app/shared/components/base-data-table/base-data-table.component';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { StateManagementService } from '../../../core/services/state-management.service';

/**
 * Table-Picker Component
 *
 * Uses BaseDataTableComponent with flat manufacturer-model rows.
 * All combinations visible without expansion.
 *
 * POP-OUT AWARE: This component adapts its behavior based on context:
 * - Normal mode: Subscribes to StateManagementService, updates state directly
 * - Pop-out mode: Same subscription, sends user interactions to main window via PopOutContextService
 *
 * The component is completely self-contained and requires no inputs/outputs.
 */
@Component({
  selector: 'app-table-picker',
  templateUrl: './table-picker.component.html',
  styleUrls: ['./table-picker.component.scss'],
  providers: [TablePickerDataSource],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablePickerComponent implements OnInit, OnDestroy {
  @ViewChild(BaseDataTableComponent)
  baseTable!: BaseDataTableComponent<PickerFlatRow>;
  private destroy$ = new Subject<void>();


  // Column configuration (flat rows)
  columns: TableColumn<PickerFlatRow>[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '50%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
    },
    {
      key: 'model',
      label: 'Model',
      width: '50%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
    },
  ];

  // Data source (client-side filtering)
  dataSource: TablePickerDataSource;

  // Query params for BaseDataTable - CRITICAL: Must be non-null with defaults
  tableQueryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  // Selection state (EFFICIENT: Set<string> pattern)
  selectedRows = new Set<string>();

  // Track pending hydration (selections to apply after data loads)
  private pendingHydration: ManufacturerModelSelection[] = [];
  private dataLoaded = false;

  constructor(
    dataSource: TablePickerDataSource,
    private cdr: ChangeDetectorRef,
    private popOutContext: PopOutContextService,
    private stateService: StateManagementService
  ) {
    this.dataSource = dataSource;
  }

  ngOnInit(): void {
    console.log(`[TablePicker] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);

    // Subscribe to state changes for hydration
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      console.log('[TablePicker] Filters updated:', filters);

      // Store for pending hydration
      this.pendingHydration = filters.modelCombos || [];

      // If data already loaded, hydrate immediately
      if (this.dataLoaded) {
        this.hydrateSelections();
        this.cdr.markForCheck();
      } else {
        console.log('[TablePicker] Data not loaded yet, deferring hydration');
      }
    });

    // Data loading is handled by BaseDataTable
    // We listen to (dataLoaded) event in template to know when data arrives
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Hydrate selections from pendingHydration
   * CRITICAL: Only call after data is loaded
   */
  private hydrateSelections(): void {
    // Clear existing selections first (idempotent operation)
    this.selectedRows.clear();

    // If no pending selections, nothing to hydrate
    if (!this.pendingHydration || this.pendingHydration.length === 0) {
      return;
    }

    // Add each selection to the Set (using | separator to match data source)
    this.pendingHydration.forEach((selection) => {
      const key = `${selection.manufacturer}|${selection.model}`;
      this.selectedRows.add(key);
    });

    console.log(
      `TablePickerComponent: Hydrated ${this.pendingHydration.length} selections from URL state`
    );
  }

  /**
   * Handle data loaded event from BaseDataTable
   * Called when data fetch completes successfully
   */
  onDataLoaded(): void {
    this.dataLoaded = true;
    console.log('TablePickerComponent: Data loaded event received');

    // Apply any pending hydration
    if (this.pendingHydration.length > 0) {
      this.hydrateSelections();
      this.cdr.markForCheck();
    }
  }

  /**
   * Handle table query changes (pagination, sorting, filtering)
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('🔶 onTableQueryChange called:', params);
    this.tableQueryParams = { ...params };
  }

  /**
   * Get selection state for manufacturer checkbox
   * Checks all flat rows with this manufacturer to determine state
   */
  getManufacturerCheckboxState(
    manufacturer: string
  ): 'checked' | 'indeterminate' | 'unchecked' {
    // Get all rows for this manufacturer from data source
    const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);
    if (manufacturerRows.length === 0) return 'unchecked';

    // Count how many are selected
    const checkedCount = manufacturerRows.filter((row) =>
      this.selectedRows.has(row.key)
    ).length;

    if (checkedCount === 0) return 'unchecked';
    if (checkedCount === manufacturerRows.length) return 'checked';
    return 'indeterminate';
  }

  /**
   * Helper: Get all flat rows for a manufacturer
   */
  private getAllRowsForManufacturer(manufacturer: string): PickerFlatRow[] {
    // Access the data source's internal data
    return (this.dataSource as any).allRows?.filter(
      (row: PickerFlatRow) => row.manufacturer === manufacturer
    ) || [];
  }

  /**
   * Toggle all models for a manufacturer (checkbox)
   * Selects/deselects all flat rows for this manufacturer
   */
  onManufacturerCheckboxChange(
    manufacturer: string,
    checked: boolean
  ): void {
    console.log('🔵 onManufacturerCheckboxChange START:', {
      manufacturer,
      checked,
    });

    const manufacturerRows = this.getAllRowsForManufacturer(manufacturer);

    manufacturerRows.forEach((row) => {
      if (checked) {
        this.selectedRows.add(row.key);
      } else {
        this.selectedRows.delete(row.key);
      }
    });

    // Trigger change detection after Set mutation
    this.cdr.markForCheck();

    console.log(
      '🟢 onManufacturerCheckboxChange COMPLETE. Set size:',
      this.selectedRows.size
    );
  }

  /**
   * Toggle individual model selection (checkbox)
   * Selects/deselects a single flat row
   */
  onModelCheckboxChange(
    manufacturer: string,
    model: string,
    checked: boolean
  ): void {
    console.log('🔵 onModelCheckboxChange START:', {
      manufacturer,
      model,
      checked,
    });

    const key = `${manufacturer}|${model}`;
    if (checked) {
      this.selectedRows.add(key);
    } else {
      this.selectedRows.delete(key);
    }

    // Trigger change detection after Set mutation
    this.cdr.markForCheck();

    console.log(
      '🟢 onModelCheckboxChange COMPLETE. Set size:',
      this.selectedRows.size
    );
  }

  /**
   * Check if a specific row is selected
   */
  isRowSelected(row: PickerFlatRow): boolean {
    return this.selectedRows.has(row.key);
  }

  /**
   * Check if individual model is selected (legacy method for template)
   */
  isModelSelected(manufacturer: string, model: string): boolean {
    return this.selectedRows.has(`${manufacturer}|${model}`);
  }

  /**
   * Get selection count for manufacturer
   */
  getSelectionCount(manufacturer: string): number {
    // Count keys in Set that start with this manufacturer
    let count = 0;
    this.selectedRows.forEach((key) => {
      if (key.startsWith(`${manufacturer}|`)) {
        count++;
      }
    });
    return count;
  }

  /**
   * Get selected items as array
   */
  get selectedItems(): ManufacturerModelSelection[] {
    return Array.from(this.selectedRows)
      .map((key) => {
        const [manufacturer, model] = key.split('|');
        return { manufacturer, model };
      })
      .sort((a, b) => {
        const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
        return mfrCompare !== 0 ? mfrCompare : a.model.localeCompare(b.model);
      });
  }

  /**
   * Handle Apply button click
   * Context-aware: Updates state directly or sends message to main window
   */
  onApply(): void {
    console.log('[TablePicker] Apply clicked');
    console.log('[TablePicker] Selected items:', this.selectedItems);

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'SELECTION_CHANGE',
        payload: this.selectedItems
      });
    } else {
      // Normal mode: update state directly
      this.stateService.updateFilters({
        modelCombos: this.selectedItems
      });
    }
  }

  /**
   * Handle Clear button click
   * Context-aware: Clears state directly or sends message to main window
   */
  onClear(): void {
    console.log('[TablePicker] Clear clicked');
    this.selectedRows.clear();
    this.cdr.markForCheck();

    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'CLEAR_ALL',
        payload: null
      });
    } else {
      // Normal mode: update state directly
      this.stateService.updateFilters({
        modelCombos: []
      });
    }
  }

  /**
   * Remove a specific model from selections
   */
  onRemoveModel(selection: ManufacturerModelSelection): void {
    const key = `${selection.manufacturer}|${selection.model}`;
    this.selectedRows.delete(key);
    this.cdr.markForCheck();
  }

  /**
   * Remove all models for a manufacturer
   */
  onRemoveManufacturer(manufacturer: string): void {
    const keysToRemove: string[] = [];
    this.selectedRows.forEach((key) => {
      if (key.startsWith(`${manufacturer}|`)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => this.selectedRows.delete(key));
    this.cdr.markForCheck();
  }
}
