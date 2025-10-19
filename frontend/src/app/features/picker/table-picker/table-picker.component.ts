import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { ManufacturerModelSelection } from '../../../models';
import { TableColumn, TableQueryParams } from '../../../shared/models';
import { TablePickerDataSource, PickerTableRow } from './table-picker-data-source';

/**
 * Table Picker Component
 * 
 * Manufacturer-Model selector using BaseDataTableComponent.
 * Provides same functionality as existing picker but with:
 * - Sortable columns
 * - Server-side filtering
 * - Column reordering (drag-drop)
 * - Persistent UI preferences
 */
@Component({
  selector: 'app-table-picker',
  templateUrl: './table-picker.component.html',
  styleUrls: ['./table-picker.component.scss']
})
export class TablePickerComponent implements OnInit, OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();

  // ========== INPUTS/OUTPUTS ==========

  @Input() initialSelections: ManufacturerModelSelection[] = [];
  @Input() clearTrigger: number = 0;
  
  @Output() selectionChange = new EventEmitter<ManufacturerModelSelection[]>();

  // ========== TABLE CONFIGURATION ==========

  columns: TableColumn<PickerTableRow>[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      width: '40%'
    },
    {
      key: 'model',
      label: 'Model',
      sortable: true,
      filterable: true,
      filterType: 'text',
      hideable: false,
      width: '40%'
    },
    {
      key: 'count',
      label: 'Count',
      sortable: true,
      filterable: false,
      hideable: true,
      width: '20%',
      align: 'right'
    }
  ];

  dataSource: TablePickerDataSource;
  tableQueryParams: TableQueryParams = {
    page: 1,
    size: 10,
    filters: {}
  };

  // ========== SELECTION STATE ==========

  selectedRows = new Set<string>(); // Set of keys: "manufacturer|model"
  private lastClearTrigger: number = 0;

  // ========== LIFECYCLE ==========

  constructor(private apiService: ApiService) {
    this.dataSource = new TablePickerDataSource(this.apiService);
  }

  ngOnInit(): void {
    // Initial hydration from URL state
    this.hydrateSelections();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle clear trigger (parent commanding "clear now")
    if (changes['clearTrigger'] && !changes['clearTrigger'].firstChange) {
      const newValue = changes['clearTrigger'].currentValue;
      if (newValue !== this.lastClearTrigger) {
        this.lastClearTrigger = newValue;
        this.selectedRows.clear();
      }
    }

    // Handle initial selections (hydration from URL)
    if (changes['initialSelections']) {
      this.hydrateSelections();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== HYDRATION ==========

  /**
   * Hydrate selections from initialSelections input
   * Called when URL state changes (browser navigation, refresh, deep link)
   */
  private hydrateSelections(): void {
    // Clear existing selections first (idempotent operation)
    this.selectedRows.clear();

    // If no initial selections provided, nothing to hydrate
    if (!this.initialSelections || this.initialSelections.length === 0) {
      return;
    }

    // Add each selection to the Set
    this.initialSelections.forEach(selection => {
      const key = `${selection.manufacturer}|${selection.model}`;
      this.selectedRows.add(key);
    });

    console.log(`[TablePicker] Hydrated ${this.initialSelections.length} selections from URL`);
  }

  // ========== SELECTION LOGIC ==========

  /**
   * Check if a row is selected
   */
  isRowSelected(row: PickerTableRow): boolean {
    return this.selectedRows.has(row.key);
  }

  /**
   * Toggle row selection
   */
  toggleRowSelection(row: PickerTableRow, selected: boolean): void {
    if (selected) {
      this.selectedRows.add(row.key);
    } else {
      this.selectedRows.delete(row.key);
    }
  }

  /**
   * Get current selections as array
   */
  get currentSelections(): ManufacturerModelSelection[] {
    return Array.from(this.selectedRows)
      .map(key => {
        const [manufacturer, model] = key.split('|');
        return { manufacturer, model };
      })
      .sort((a, b) => {
        const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
        if (mfrCompare !== 0) return mfrCompare;
        return a.model.localeCompare(b.model);
      });
  }

  // ========== CHIP HANDLERS ==========

  /**
   * Handle removal of individual model chip
   */
  onRemoveModelChip(selection: ManufacturerModelSelection): void {
    const key = `${selection.manufacturer}|${selection.model}`;
    this.selectedRows.delete(key);
  }

  /**
   * Handle removal of entire manufacturer group
   */
  onRemoveManufacturerChip(manufacturer: string): void {
    const keysToRemove: string[] = [];
    
    this.selectedRows.forEach(key => {
      if (key.startsWith(`${manufacturer}|`)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.selectedRows.delete(key));
  }

  // ========== ACTION HANDLERS ==========

  /**
   * Apply selections - emit to parent
   */
  onApply(): void {
    console.log('[TablePicker] Apply clicked, selections:', this.currentSelections);
    this.selectionChange.emit(this.currentSelections);
  }

  /**
   * Clear all selections
   */
  onClear(): void {
    this.selectedRows.clear();
    this.selectionChange.emit([]);
  }

  /**
   * Handle table query changes (pagination, sorting, filtering)
   */
  onTableQueryChange(params: TableQueryParams): void {
    this.tableQueryParams = params;
  }
}
