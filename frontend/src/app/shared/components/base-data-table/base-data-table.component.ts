import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { TableColumn } from '../../models/table-column.model';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../../models/table-data-source.model';
import { TableStatePersistenceService } from '../../services/table-state-persistence.service';

@Component({
  selector: 'app-base-data-table',
  templateUrl: './base-data-table.component.html',
  styleUrls: ['./base-data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseDataTableComponent<T> implements OnInit, OnDestroy, OnChanges {
  // ========== INPUTS ==========

  /** Unique identifier for this table (used for localStorage) */
  @Input() tableId!: string;

  /** Column definitions */
  @Input() columns: TableColumn<T>[] = [];

  /** Data source for fetching table data */
  @Input() dataSource!: TableDataSource<T>;

  /** Initial query parameters from parent */
  @Input() queryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  /** Whether rows can be expanded */
  @Input() expandable = false;

  /** Loading state from parent */
  @Input() loading = false;

  // ========== OUTPUTS ==========

  /** Emits when query parameters change */
  @Output() queryParamsChange = new EventEmitter<TableQueryParams>();

  /** Emits when a row is expanded */
  @Output() rowExpand = new EventEmitter<T>();

  /** Emits when a row is collapsed */
  @Output() rowCollapse = new EventEmitter<T>();

  // ========== TEMPLATE REFERENCES ==========

  /** Custom cell template from parent */
  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<any>;

  /** Custom expansion template from parent */
  @ContentChild('expansionTemplate') expansionTemplate?: TemplateRef<any>;

  // ========== STATE ==========

  /** Table data */
  tableData: T[] = [];

  /** Total count for pagination */
  totalCount = 0;

  /** Current page (1-indexed) */
  currentPage = 1;

  /** Page size */
  pageSize = 20;

  /** Expanded row set */
  expandedRowSet = new Set<any>();

  /** Column manager drawer visibility */
  columnManagerVisible = false;

  /** Filter values */
  filters: { [key: string]: any } = {};

  /** Sort column key */
  sortBy?: string;

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Internal loading state */
  isLoading = false;

  // ========== PRIVATE ==========

  private destroy$ = new Subject<void>();
  private filterSubject$ = new Subject<void>();
  private isReorderingColumns = false;

  // ========== LIFECYCLE ==========

  constructor(private persistenceService: TableStatePersistenceService) {}

  ngOnInit(): void {
    // Load preferences
    this.loadPreferences();

    // Initialize from input queryParams
    this.currentPage = this.queryParams.page || 1;
    this.pageSize = this.queryParams.size || 20;
    this.filters = this.queryParams.filters || {};
    this.sortBy = this.queryParams.sortBy;
    this.sortOrder = this.queryParams.sortOrder;

    // Set up filter debouncing
    this.filterSubject$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1; // Reset to first page on filter change
        this.fetchData();
      });

    // Initial data fetch
    this.fetchData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['queryParams'] && !changes['queryParams'].firstChange) {
      this.fetchData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== DATA FETCHING ==========

  fetchData(): void {
    if (this.isReorderingColumns) {
      return; // Don't fetch during column reordering
    }
    this.isLoading = true;

    const params: TableQueryParams = {
      page: this.currentPage,
      size: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      filters: this.filters,
    };

    this.dataSource
      .fetch(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: TableResponse<T>) => {
          this.tableData = response.results;
          this.totalCount = response.total;
          this.isLoading = false;

          // Emit query params to parent
          this.queryParamsChange.emit(params);
        },
        error: (error) => {
          console.error('Failed to fetch table data:', error);
          this.isLoading = false;
        },
      });
  }

  // ========== PERSISTENCE ==========

  loadPreferences(): void {
    const prefs = this.persistenceService.loadPreferences(this.tableId);
    if (prefs) {
      // Apply column order
      if (prefs.columnOrder && prefs.columnOrder.length > 0) {
        this.applyColumnOrder(prefs.columnOrder);
      }

      // Apply column visibility
      if (prefs.visibleColumns && prefs.visibleColumns.length > 0) {
        this.applyColumnVisibility(prefs.visibleColumns);
      }

      // Apply page size
      if (prefs.pageSize) {
        this.pageSize = prefs.pageSize;
      }
    }
  }

  savePreferences(): void {
    const columnOrder = this.columns.map((col) => col.key);
    const visibleColumns = this.columns
      .filter((col) => col.visible !== false)
      .map((col) => col.key);

    this.persistenceService.savePreferences(this.tableId, {
      columnOrder,
      visibleColumns,
      pageSize: this.pageSize,
      lastUpdated: Date.now(),
    });
  }

  applyColumnOrder(order: string[]): void {
    const orderedColumns: TableColumn<T>[] = [];
    order.forEach((key) => {
      const col = this.columns.find((c) => c.key === key);
      if (col) {
        orderedColumns.push(col);
      }
    });

    // Add any columns not in saved order (new columns)
    this.columns.forEach((col) => {
      if (!orderedColumns.find((c) => c.key === col.key)) {
        orderedColumns.push(col);
      }
    });

    this.columns = orderedColumns;
  }

  applyColumnVisibility(visibleKeys: string[]): void {
    this.columns.forEach((col) => {
      col.visible = visibleKeys.includes(col.key);
    });
  }

  // ========== PAGINATION ==========

  onPageChange(page: number): void {
    this.currentPage = page;
    this.fetchData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    this.savePreferences();
    this.fetchData();
  }

  // ========== SORTING ==========

  onSort(columnKey: string): void {
    if (this.sortBy === columnKey) {
      // Toggle sort order
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New sort column
      this.sortBy = columnKey;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  // ========== FILTERING ==========

  onFilterChange(columnKey: string, value: any): void {
    if (value === null || value === undefined || value === '') {
      delete this.filters[columnKey];
    } else {
      this.filters[columnKey] = value;
    }
    this.filterSubject$.next();
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage = 1;
    this.fetchData();
  }

  // ========== COLUMN MANAGEMENT ==========

  onColumnDrop(event: CdkDragDrop<TableColumn<T>[]>): void {
    this.isReorderingColumns = true;
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.savePreferences();
    setTimeout(() => {
      this.isReorderingColumns = false;
    }, 100);

    console.log('🔴 BaseDataTable: onColumnDrop() END', {
      isReorderingColumns_AFTER: this.isReorderingColumns,
    });
  }

  onColumnDragStart(event: any): void {
    // Prevent the event from bubbling up to the grid
    if (event && event.source && event.source.element) {
      const nativeElement = event.source.element.nativeElement;
      // Add a flag to prevent grid from capturing
      nativeElement.classList.add('column-dragging');
    }
  }

  onHeaderMouseDown(event: MouseEvent): void {
    // Stop the mousedown event from reaching the grid container
    event.stopPropagation();
  }

  toggleColumnVisibility(columnKey: string): void {
    const column = this.columns.find((col) => col.key === columnKey);
    if (column) {
      column.visible = !column.visible;
      this.savePreferences();
    }
  }

  openColumnManager(): void {
    this.columnManagerVisible = true;
  }

  closeColumnManager(): void {
    this.columnManagerVisible = false;
  }

  resetColumns(): void {
    // Reset to default visibility and order
    this.columns.forEach((col) => {
      col.visible = col.hideable ? undefined : true;
    });
    this.persistenceService.resetPreferences(this.tableId);
  }

  getVisibleColumns(): TableColumn<T>[] {
    return this.columns.filter((col) => col.visible !== false);
  }

  // ========== ROW EXPANSION ==========

  isRowExpanded(row: T): boolean {
    return this.expandedRowSet.has(row);
  }

  toggleRowExpansion(row: T): void {
    if (this.expandedRowSet.has(row)) {
      this.expandedRowSet.delete(row);
      this.rowCollapse.emit(row);
    } else {
      this.expandedRowSet.add(row);
      this.rowExpand.emit(row);
    }
  }

  // ========== UTILITY ==========

  trackByKey(index: number, column: TableColumn<T>): string {
    return column.key;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getFilterCount(): number {
    return Object.keys(this.filters).length;
  }
}
