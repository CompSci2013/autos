import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
  SimpleChanges,
  OnChanges,
  ChangeDetectorRef, // ADD THIS
  ChangeDetectionStrategy, // ADD THIS
} from '@angular/core';
import { Subject } from 'rxjs';
import { ManufacturerModelSelection } from '../../../models';
import { TableColumn, TableQueryParams } from '../../../shared/models';
import {
  TablePickerDataSource,
  ManufacturerSummaryRow,
} from './table-picker-data-source';

/**
 * Table-Picker Component
 *
 * Uses BaseDataTableComponent with hierarchical manufacturer rows.
 * Expands to show model checkboxes.
 */
@Component({
  selector: 'app-table-picker',
  templateUrl: './table-picker.component.html',
  styleUrls: ['./table-picker.component.scss'],
  providers: [TablePickerDataSource],
  changeDetection: ChangeDetectionStrategy.OnPush, // ADD THIS
})
export class TablePickerComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  // Inputs from parent (Workshop)
  @Input() initialSelections: ManufacturerModelSelection[] = [];
  @Input() clearTrigger: number = 0;

  // Output to parent
  @Output() selectionChange = new EventEmitter<ManufacturerModelSelection[]>();

  // Column configuration (manufacturer summary rows)
  columns: TableColumn<ManufacturerSummaryRow>[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      width: '95%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
    },
    {
      key: 'model',
      label: 'Model',
      width: '5%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: true,
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

  constructor(
    dataSource: TablePickerDataSource,
    private cdr: ChangeDetectorRef // ADD THIS
  ) {
    this.dataSource = dataSource;
  }

  ngOnInit(): void {
    console.log('TablePickerComponent: Initialized');
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
        this.cdr.markForCheck(); // ADD THIS
      }
    }

    // Handle initial selections (hydration from URL)
    if (changes['initialSelections']) {
      console.log(
        'TablePickerComponent: Initial selections changed:',
        this.initialSelections
      );
      this.hydrateSelections();
      this.cdr.markForCheck(); // ADD THIS
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Hydrate selections from initialSelections input
   */
  private hydrateSelections(): void {
    // Clear existing selections first (idempotent operation)
    this.selectedRows.clear();

    // If no initial selections provided, nothing to hydrate
    if (!this.initialSelections || this.initialSelections.length === 0) {
      return;
    }

    // Add each selection to the Set
    this.initialSelections.forEach((selection) => {
      const key = `${selection.manufacturer}:${selection.model}`;
      this.selectedRows.add(key);
    });

    console.log(
      `TablePickerComponent: Hydrated ${this.initialSelections.length} selections`
    );
  }

  /**
   * Handle table query changes (pagination, sorting, filtering)
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('🔶 onTableQueryChange called:', params);
    this.tableQueryParams = { ...params };
  }

  /**
   * Handle row expansion - models already loaded
   */
  onRowExpand(row: ManufacturerSummaryRow): void {
    console.log(
      'TablePickerComponent: Manufacturer expanded:',
      row.manufacturer
    );
    // Models are already in row.models, no API call needed
  }

  /**
   * Get selection state for manufacturer checkbox (parent checkbox)
   * MATCHES ORIGINAL PICKER: Calculates state from Set, no Map needed
   */
  getManufacturerCheckboxState(
    row: ManufacturerSummaryRow
  ): 'checked' | 'indeterminate' | 'unchecked' {
    if (!row.models || row.models.length === 0) return 'unchecked';

    // Count how many models are selected
    const checkedCount = row.models.filter((m) =>
      this.selectedRows.has(`${row.manufacturer}:${m.model}`)
    ).length;

    if (checkedCount === 0) return 'unchecked';
    if (checkedCount === row.modelCount) return 'checked';
    return 'indeterminate';
  }

  /**
   * Toggle all models for a manufacturer (parent checkbox)
   * MATCHES ORIGINAL PICKER: Only updates Set
   */
  onManufacturerCheckboxChange(
    row: ManufacturerSummaryRow,
    checked: boolean
  ): void {
    console.log('🔵 onManufacturerCheckboxChange START:', {
      manufacturer: row.manufacturer,
      checked,
      modelCount: row.models.length,
    });

    row.models.forEach((m) => {
      const key = `${row.manufacturer}:${m.model}`;
      if (checked) {
        this.selectedRows.add(key);
      } else {
        this.selectedRows.delete(key);
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
   * Toggle individual model selection (child checkbox)
   * MATCHES ORIGINAL PICKER: Only updates Set
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

    const key = `${manufacturer}:${model}`;
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
   * Check if individual model is selected
   */
  isModelSelected(manufacturer: string, model: string): boolean {
    return this.selectedRows.has(`${manufacturer}:${model}`);
  }

  /**
   * Get selection count for manufacturer
   * MATCHES ORIGINAL PICKER: Calculates from Set
   */
  getSelectionCount(manufacturer: string): number {
    // Count keys in Set that start with this manufacturer
    let count = 0;
    this.selectedRows.forEach((key) => {
      if (key.startsWith(`${manufacturer}:`)) {
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
        const [manufacturer, model] = key.split(':');
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
    const key = `${selection.manufacturer}:${selection.model}`;
    this.selectedRows.delete(key);
    this.cdr.markForCheck(); // ADD THIS
  }

  /**
   * Remove all models for a manufacturer
   */
  onRemoveManufacturer(manufacturer: string): void {
    const keysToRemove: string[] = [];
    this.selectedRows.forEach((key) => {
      if (key.startsWith(`${manufacturer}:`)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => this.selectedRows.delete(key));
    this.cdr.markForCheck(); // ADD THIS
  }
}
