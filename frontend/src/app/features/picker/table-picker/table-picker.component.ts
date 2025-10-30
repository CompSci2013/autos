import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
  SimpleChanges,
  OnChanges,
  ViewChild,
  ChangeDetectorRef, // ADD THIS
  ChangeDetectionStrategy, // ADD THIS
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

/**
 * Table-Picker Component
 *
 * Uses BaseDataTableComponent with flat manufacturer-model rows.
 * All combinations visible without expansion.
 */
@Component({
  selector: 'app-table-picker',
  templateUrl: './table-picker.component.html',
  styleUrls: ['./table-picker.component.scss'],
  providers: [TablePickerDataSource],
  changeDetection: ChangeDetectionStrategy.OnPush, // ADD THIS
})
export class TablePickerComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild(BaseDataTableComponent)
  baseTable!: BaseDataTableComponent<PickerFlatRow>;
  private destroy$ = new Subject<void>();

  // Inputs from parent (Workshop)
  @Input() initialSelections: ManufacturerModelSelection[] = [];
  @Input() clearTrigger: number = 0;

  // Output to parent
  @Output() selectionChange = new EventEmitter<ManufacturerModelSelection[]>();

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

  // Track last clear trigger
  private lastClearTrigger = 0;

  // Track pending hydration (selections to apply after data loads)
  private pendingHydration: ManufacturerModelSelection[] = [];
  private dataLoaded = false;

  constructor(
    dataSource: TablePickerDataSource,
    private cdr: ChangeDetectorRef // ADD THIS
  ) {
    this.dataSource = dataSource;
  }

  ngOnInit(): void {
    console.log('TablePickerComponent: Initialized');
    // Data loading is handled by BaseDataTable
    // We listen to (dataLoaded) event in template to know when data arrives
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔶 ngOnChanges triggered:', Object.keys(changes));

    // Handle clear trigger (parent commanding "clear now")
    if (changes['clearTrigger'] && !changes['clearTrigger'].firstChange) {
      const newValue = changes['clearTrigger'].currentValue;
      if (newValue !== this.lastClearTrigger) {
        console.log('TablePickerComponent: Clear trigger fired');
        this.lastClearTrigger = newValue;
        this.selectedRows.clear();
        this.pendingHydration = [];
        this.cdr.markForCheck();
      }
    }

    // Handle initial selections (hydration from URL)
    if (changes['initialSelections']) {
      console.log(
        'TablePickerComponent: Initial selections changed:',
        this.initialSelections
      );

      // Store for pending hydration
      this.pendingHydration = this.initialSelections || [];

      // If data already loaded, hydrate immediately
      // Otherwise, wait for data to load (ngOnInit subscription)
      if (this.dataLoaded) {
        this.hydrateSelections();
        this.cdr.markForCheck();
      } else {
        console.log('TablePickerComponent: Data not loaded yet, deferring hydration');
      }
    }
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
   */
  onApply(): void {
    console.log('TablePickerComponent: Apply clicked');
    console.log(
      'TablePickerComponent: Emitting selections:',
      this.selectedItems
    );
    this.selectionChange.emit(this.selectedItems);
  }

  /**
   * Handle Clear button click
   */
  onClear(): void {
    console.log('TablePickerComponent: Clear clicked');
    this.selectedRows.clear();
    this.cdr.markForCheck(); // ADD THIS
    this.selectionChange.emit([]);
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
