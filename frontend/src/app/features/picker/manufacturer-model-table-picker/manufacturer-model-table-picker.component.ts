import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { Subscription } from 'rxjs';
import {
  PickerRow,
  ModelDetail,
  ManufacturerGroup,
  ManufacturerModelSelection,
} from '../../../models';

@Component({
  selector: 'app-manufacturer-model-table-picker',
  templateUrl: './manufacturer-model-table-picker.component.html',
  styleUrls: ['./manufacturer-model-table-picker.component.scss'],
})
export class ManufacturerModelTablePickerComponent
  implements OnInit, OnDestroy
{
  @Output() selectionChange = new EventEmitter<ManufacturerModelSelection[]>();

  allRows: PickerRow[] = [];
  manufacturerGroups: ManufacturerGroup[] = [];
  filteredGroups: ManufacturerGroup[] = [];
  selectedRows = new Set<string>();

  currentPage: number = 1;
  pageSize: number = 20;
  visibleRowOptions = [10, 20, 50];
  searchTerm: string = '';
  loading: boolean = false;

  private subscription?: Subscription;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
    this.loadPageSizePreference();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;

    // FIXED: Changed size from 10000 to 100 (backend max is 100)
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

          this.manufacturerGroups = this.groupByManufacturer(this.allRows);
          this.applyFilter();
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load combinations:', error);
          this.loading = false;
        },
      });
  }

  private groupByManufacturer(flatData: PickerRow[]): ManufacturerGroup[] {
    const grouped = new Map<string, ManufacturerGroup>();

    for (const row of flatData) {
      if (!grouped.has(row.manufacturer)) {
        grouped.set(row.manufacturer, {
          manufacturer: row.manufacturer,
          totalCount: 0,
          models: [],
          expanded: false,
        });
      }

      const group = grouped.get(row.manufacturer)!;
      group.totalCount += row.count;
      group.models.push({ model: row.model, count: row.count });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.manufacturer.localeCompare(b.manufacturer)
    );
  }

  getParentCheckboxState(
    manufacturer: string
  ): 'checked' | 'indeterminate' | 'unchecked' {
    const models = this.getModelsForManufacturer(manufacturer);
    if (!models || models.length === 0) return 'unchecked';

    const checkedCount = models.filter((m) =>
      this.selectedRows.has(`${manufacturer}|${m.model}`)
    ).length;

    if (checkedCount === 0) return 'unchecked';
    if (checkedCount === models.length) return 'checked';
    return 'indeterminate';
  }

  private getModelsForManufacturer(manufacturer: string): ModelDetail[] {
    const group = this.filteredGroups.find(
      (g) => g.manufacturer === manufacturer
    );
    return group ? group.models : [];
  }

  onParentCheckboxChange(manufacturer: string, checked: boolean): void {
    const models = this.getModelsForManufacturer(manufacturer);

    models.forEach((model) => {
      const key = `${manufacturer}|${model.model}`;
      if (checked) {
        this.selectedRows.add(key);
      } else {
        this.selectedRows.delete(key);
      }
    });
  }

  onChildCheckboxChange(
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

  isModelSelected(manufacturer: string, model: string): boolean {
    return this.selectedRows.has(`${manufacturer}|${model}`);
  }

  onExpandChange(manufacturer: string, expanded: boolean): void {
    const group = this.filteredGroups.find(
      (g) => g.manufacturer === manufacturer
    );
    if (group) {
      group.expanded = expanded;
    }
  }

  selectAll(): void {
    this.visibleGroups.forEach((group) => {
      group.models.forEach((model) => {
        const key = `${group.manufacturer}|${model.model}`;
        this.selectedRows.add(key);
      });
    });
  }

  deselectAll(): void {
    this.visibleGroups.forEach((group) => {
      group.models.forEach((model) => {
        const key = `${group.manufacturer}|${model.model}`;
        this.selectedRows.delete(key);
      });
    });
  }

  get allVisibleSelected(): boolean {
    if (this.visibleGroups.length === 0) return false;

    return this.visibleGroups.every((group) =>
      group.models.every((model) =>
        this.selectedRows.has(`${group.manufacturer}|${model.model}`)
      )
    );
  }

  get someVisibleSelected(): boolean {
    if (this.visibleGroups.length === 0) return false;

    const hasAnySelected = this.visibleGroups.some((group) =>
      group.models.some((model) =>
        this.selectedRows.has(`${group.manufacturer}|${model.model}`)
      )
    );

    return hasAnySelected && !this.allVisibleSelected;
  }

  applyFilter(): void {
    if (!this.searchTerm.trim()) {
      this.filteredGroups = this.manufacturerGroups;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredGroups = this.manufacturerGroups.filter(
        (group) =>
          group.manufacturer.toLowerCase().includes(term) ||
          group.models.some((m) => m.model.toLowerCase().includes(term))
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

  get visibleGroups(): ManufacturerGroup[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredGroups.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredGroups.length / this.pageSize);
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
