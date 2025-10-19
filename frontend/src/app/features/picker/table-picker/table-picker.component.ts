import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
  SimpleChanges,
  OnChanges,
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
      width: '50%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
    },
    {
      key: 'modelCount',
      label: 'Models',
      width: '25%',
      sortable: true,
      filterable: false,
      hideable: true,
    },
    {
      key: 'totalCount',
      label: 'Total Count',
      width: '25%',
      sortable: true,
      filterable: false,
      hideable: true,
    },
  ];

  // Data source (client-side filtering)
  dataSource: TablePickerDataSource;

  // Query params for BaseDataTable
  tableQueryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  // Selection state (EFFICIENT: Set<string> pattern)
  selectedRows = new Set<string>();

  // Track which manufacturers have models selected (for checkbox states)
  manufacturerSelections = new Map<string, Set<string>>(); // manufacturer -> Set<modelNames>

  // Track last clear trigger
  private lastClearTrigger = 0;

  constructor(dataSource: TablePickerDataSource) {
    this.dataSource = dataSource;
  }

  ngOnInit(): void {
    console.log('TablePickerComponent: Initialized');
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle clear trigger (parent commanding "clear now")
    if (changes['clearTrigger'] && !changes['clearTrigger'].firstChange) {
      const newValue = changes['clearTrigger'].currentValue;
      if (newValue !== this.lastClearTrigger) {
        console.log('TablePickerComponent: Clear trigger fired');
        this.lastClearTrigger = newValue;
        this.selectedRows.clear();
        this.manufacturerSelections.clear();
      }
    }

    // Handle initial selections (hydration from URL)
    if (changes['initialSelections']) {
      console.log(
        'TablePickerComponent: Initial selections changed:',
        this.initialSelections
      );
      this.hydrateSelections();
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
    this.manufacturerSelections.clear();

    // If no initial selections provided, nothing to hydrate
    if (!this.initialSelections || this.initialSelections.length === 0) {
      return;
    }

    // Add each selection to the Set
    this.initialSelections.forEach((selection) => {
      const key = `${selection.manufacturer}:${selection.model}`;
      this.selectedRows.add(key);

      // Track in manufacturer map
      if (!this.manufacturerSelections.has(selection.manufacturer)) {
        this.manufacturerSelections.set(selection.manufacturer, new Set());
      }
      this.manufacturerSelections
        .get(selection.manufacturer)!
        .add(selection.model);
    });

    console.log(
      `TablePickerComponent: Hydrated ${this.initialSelections.length} selections`
    );
  }

  /**
   * Handle table query changes (pagination, sorting, filtering)
   */
  onTableQueryChange(params: TableQueryParams): void {
    console.log('TablePickerComponent: Table query changed:', params);
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
   */
  getManufacturerCheckboxState(
    row: ManufacturerSummaryRow
  ): 'checked' | 'indeterminate' | 'unchecked' {
    const selections = this.manufacturerSelections.get(row.manufacturer);
    if (!selections || selections.size === 0) return 'unchecked';
    if (selections.size === row.modelCount) return 'checked';
    return 'indeterminate';
  }

  /**
   * Toggle all models for a manufacturer (parent checkbox)
   */
  onManufacturerCheckboxChange(
    row: ManufacturerSummaryRow,
    checked: boolean
  ): void {
    if (!this.manufacturerSelections.has(row.manufacturer)) {
      this.manufacturerSelections.set(row.manufacturer, new Set());
    }

    const selections = this.manufacturerSelections.get(row.manufacturer)!;

    if (checked) {
      // Select all models
      row.models.forEach((m) => {
        selections.add(m.model);
        this.selectedRows.add(`${row.manufacturer}:${m.model}`);
      });
    } else {
      // Deselect all models
      row.models.forEach((m) => {
        selections.delete(m.model);
        this.selectedRows.delete(`${row.manufacturer}:${m.model}`);
      });
    }
  }

  /**
   * Toggle individual model selection (child checkbox)
   */
  onModelCheckboxChange(
    manufacturer: string,
    model: string,
    checked: boolean
  ): void {
    if (!this.manufacturerSelections.has(manufacturer)) {
      this.manufacturerSelections.set(manufacturer, new Set());
    }

    const selections = this.manufacturerSelections.get(manufacturer)!;
    const key = `${manufacturer}:${model}`;

    if (checked) {
      selections.add(model);
      this.selectedRows.add(key);
    } else {
      selections.delete(model);
      this.selectedRows.delete(key);
    }
  }

  /**
   * Check if individual model is selected
   */
  isModelSelected(manufacturer: string, model: string): boolean {
    return this.selectedRows.has(`${manufacturer}:${model}`);
  }

  /**
   * Get selection count for manufacturer
   */
  getSelectionCount(manufacturer: string): number {
    const selections = this.manufacturerSelections.get(manufacturer);
    return selections ? selections.size : 0;
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
    this.manufacturerSelections.clear();
    this.selectionChange.emit([]);
  }

  /**
   * Remove a specific model from selections
   */
  onRemoveModel(selection: ManufacturerModelSelection): void {
    const key = `${selection.manufacturer}:${selection.model}`;
    this.selectedRows.delete(key);

    const selections = this.manufacturerSelections.get(selection.manufacturer);
    if (selections) {
      selections.delete(selection.model);
    }
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
    this.manufacturerSelections.delete(manufacturer);
  }
}
