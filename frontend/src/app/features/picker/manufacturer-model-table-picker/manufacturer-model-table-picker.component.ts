import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  OnDestroy,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { Subscription } from 'rxjs';
import {
  PickerRow,
  ManufacturerModelSelection,
} from '../../../models';

@Component({
  selector: 'app-manufacturer-model-table-picker',
  templateUrl: './manufacturer-model-table-picker.component.html',
  styleUrls: ['./manufacturer-model-table-picker.component.scss'],
})
export class ManufacturerModelTablePickerComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Output() selectionChange = new EventEmitter<ManufacturerModelSelection[]>();

  // NEW: Inputs for URL-first state management
  @Input() clearTrigger: number = 0;
  @Input() initialSelections: ManufacturerModelSelection[] = [];

  allRows: PickerRow[] = [];
  filteredRows: PickerRow[] = [];
  selectedRows = new Set<string>();

  currentPage: number = 1;
  pageSize: number = 10;
  visibleRowOptions = [5, 10, 20, 50];
  searchTerm: string = '';
  loading: boolean = false;

  private subscription?: Subscription;
  private lastClearTrigger: number = 0;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
    this.loadPageSizePreference();
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
    this.subscription?.unsubscribe();
  }

  /**
   * Hydrate selections from initialSelections input
   * Called when URL state changes (browser navigation, refresh, deep link)
   * CRITICAL: Must be called AFTER data is loaded
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
      const key = `${selection.manufacturer}|${selection.model}`;
      this.selectedRows.add(key);
    });

    console.log(
      `Hydrated ${this.initialSelections.length} selections from URL state`
    );
  }

  loadData(): void {
    this.loading = true;

    this.subscription = this.apiService
      .getManufacturerModelCombinations(1, 100, '')
      .subscribe({
        next: (response) => {
          // Flatten the hierarchical response into rows
          this.allRows = [];
          response.data.forEach((mfr) => {
            mfr.models.forEach((model) => {
              this.allRows.push({
                manufacturer: mfr.manufacturer,
                model: model.model,
                count: model.count,
                key: `${mfr.manufacturer}|${model.model}`,
              });
            });
          });

          // Sort by manufacturer, then model
          this.allRows.sort((a, b) => {
            const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
            if (mfrCompare !== 0) return mfrCompare;
            return a.model.localeCompare(b.model);
          });

          this.applyFilter();
          this.loading = false;

          // CRITICAL: Hydrate selections AFTER data is loaded
          // This ensures checkboxes exist before trying to select them
          this.hydrateSelections();
        },
        error: (error) => {
          console.error('Failed to load combinations:', error);
          this.loading = false;
        },
      });
  }

  /**
   * Get checkbox state for a manufacturer in the flat table
   * Checks all rows with this manufacturer to determine state
   */
  getManufacturerCheckboxState(
    manufacturer: string
  ): 'checked' | 'indeterminate' | 'unchecked' {
    const manufacturerRows = this.filteredRows.filter(
      (row) => row.manufacturer === manufacturer
    );
    if (manufacturerRows.length === 0) return 'unchecked';

    const checkedCount = manufacturerRows.filter((row) =>
      this.selectedRows.has(row.key)
    ).length;

    if (checkedCount === 0) return 'unchecked';
    if (checkedCount === manufacturerRows.length) return 'checked';
    return 'indeterminate';
  }

  /**
   * Handle manufacturer checkbox change
   * Selects/deselects all models for this manufacturer
   */
  onManufacturerCheckboxChange(manufacturer: string, checked: boolean): void {
    const manufacturerRows = this.filteredRows.filter(
      (row) => row.manufacturer === manufacturer
    );

    manufacturerRows.forEach((row) => {
      if (checked) {
        this.selectedRows.add(row.key);
      } else {
        this.selectedRows.delete(row.key);
      }
    });
  }

  /**
   * Handle model checkbox change
   * Selects/deselects a single model
   */
  onModelCheckboxChange(
    manufacturer: string,
    model: string,
    checked: boolean
  ): void {
    const key = `${manufacturer}|${model}`;
    if (checked) {
      this.selectedRows.add(key);
    } else {
      this.selectedRows.delete(key);
    }
  }

  /**
   * Check if a specific row is selected
   */
  isRowSelected(row: PickerRow): boolean {
    return this.selectedRows.has(row.key);
  }

  selectAll(): void {
    this.visibleRows.forEach((row) => {
      this.selectedRows.add(row.key);
    });
  }

  deselectAll(): void {
    this.visibleRows.forEach((row) => {
      this.selectedRows.delete(row.key);
    });
  }

  get allVisibleSelected(): boolean {
    if (this.visibleRows.length === 0) return false;

    return this.visibleRows.every((row) =>
      this.selectedRows.has(row.key)
    );
  }

  get someVisibleSelected(): boolean {
    if (this.visibleRows.length === 0) return false;

    const hasAnySelected = this.visibleRows.some((row) =>
      this.selectedRows.has(row.key)
    );

    return hasAnySelected && !this.allVisibleSelected;
  }

  applyFilter(): void {
    if (!this.searchTerm.trim()) {
      this.filteredRows = this.allRows;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredRows = this.allRows.filter(
        (row) =>
          row.manufacturer.toLowerCase().includes(term) ||
          row.model.toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.savePageSizePreference();
  }

  get visibleRows(): PickerRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRows.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRows.length / this.pageSize);
  }

  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  previousPage(): void {
    if (this.hasPreviousPage) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);

      if (start > 1) pages.push(1);
      if (start > 2) pages.push(-1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < this.totalPages - 1) pages.push(-1);
      if (end < this.totalPages) pages.push(this.totalPages);
    }

    return pages;
  }

  get selectedChips(): ManufacturerModelSelection[] {
    return Array.from(this.selectedRows)
      .map((key) => {
        const [manufacturer, model] = key.split('|');
        return { manufacturer, model };
      })
      .sort((a, b) => {
        const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
        if (mfrCompare !== 0) return mfrCompare;
        return a.model.localeCompare(b.model);
      });
  }

  removeChip(chip: ManufacturerModelSelection): void {
    const key = `${chip.manufacturer}|${chip.model}`;
    this.selectedRows.delete(key);
  }

  get groupedChips(): Array<{
    manufacturer: string;
    models: string[];
    count: number;
  }> {
    const groups = new Map<string, string[]>();

    this.selectedChips.forEach((chip) => {
      if (!groups.has(chip.manufacturer)) {
        groups.set(chip.manufacturer, []);
      }
      groups.get(chip.manufacturer)!.push(chip.model);
    });

    return Array.from(groups.entries())
      .map((entry) => ({
        manufacturer: entry[0],
        models: entry[1].sort(),
        count: entry[1].length,
      }))
      .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
  }

  removeManufacturerChip(manufacturer: string): void {
    const keysToRemove: string[] = [];
    this.selectedRows.forEach((key) => {
      if (key.startsWith(`${manufacturer}|`)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => this.selectedRows.delete(key));
  }

  onApply(): void {
    console.log('Selected vehicles:', this.selectedChips);
    this.selectionChange.emit(this.selectedChips);
  }

  onClear(): void {
    this.selectedRows.clear();
    this.onApply();
  }


  private loadPageSizePreference(): void {
    const saved = localStorage.getItem('vehiclePickerPageSize');
    if (saved) {
      const size = parseInt(saved, 10);
      if (this.visibleRowOptions.includes(size)) {
        this.pageSize = size;
      }
    }
  }

  private savePageSizePreference(): void {
    localStorage.setItem('vehiclePickerPageSize', this.pageSize.toString());
  }
}
