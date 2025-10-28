import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HierarchicalSelection, AggregationBucket } from '../../../models/generic';
import { GenericDataService } from '../../../services/generic';
import { DomainConfigService } from '../../../services/generic';

/**
 * Generic Hierarchical Picker Component
 *
 * Configuration-driven picker that supports any domain hierarchy.
 * Adapts to domain configuration for:
 * - Number of hierarchy levels (2, 3, 4+)
 * - Field names and labels
 * - Display mode (tree, table, both)
 *
 * @example
 * // Vehicles (2 levels): Manufacturer → Model
 * <app-generic-hierarchical-picker
 *   [initialSelections]="selectedItems"
 *   (selectionChange)="onSelectionChange($event)">
 * </app-generic-hierarchical-picker>
 *
 * // Aircraft (3 levels): Manufacturer → Model → Variant
 * // Same component, different behavior based on domain config
 */
@Component({
  selector: 'app-generic-hierarchical-picker',
  templateUrl: './generic-hierarchical-picker.component.html',
  styleUrls: ['./generic-hierarchical-picker.component.scss']
})
export class GenericHierarchicalPickerComponent implements OnInit, OnDestroy {

  @Input() initialSelections: HierarchicalSelection[] = [];
  @Output() selectionChange = new EventEmitter<HierarchicalSelection[]>();

  // Configuration from domain
  title: string = 'Select Items';
  mode: 'tree' | 'table' | 'both' = 'both';
  multiSelect: boolean = true;
  showCounts: boolean = true;
  hierarchyLevels: any[] = [];

  // Data
  aggregations: AggregationBucket[] = [];
  loading: boolean = false;
  error: string | null = null;

  // Selections
  selectedItems: HierarchicalSelection[] = [];

  // Tree data (for tree mode)
  treeData: any[] = [];

  // Table data (for table mode)
  tableData: any[] = [];

  // Search
  searchValue: string = '';
  filteredData: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private dataService: GenericDataService,
    private domainConfig: DomainConfigService
  ) {}

  ngOnInit(): void {
    this.initializeFromConfig();
    this.selectedItems = [...this.initialSelections];
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize component from domain configuration
   */
  private initializeFromConfig(): void {
    const config = this.domainConfig.getCurrentConfig();
    if (!config) {
      console.error('[GenericHierarchicalPicker] No domain configuration found');
      return;
    }

    // Get picker configuration
    const pickerConfig = config.picker;
    this.mode = pickerConfig.mode;
    this.multiSelect = pickerConfig.multiSelect;
    this.showCounts = pickerConfig.showCounts;

    // Get hierarchy configuration
    if (config.entity.hierarchies && config.entity.hierarchies.length > 0) {
      const hierarchy = config.entity.hierarchies[0]; // Use first hierarchy
      this.hierarchyLevels = hierarchy.levels;
      this.title = `Select ${hierarchy.name}`;
    }

    console.log('[GenericHierarchicalPicker] Initialized:', {
      mode: this.mode,
      levels: this.hierarchyLevels.length,
      multiSelect: this.multiSelect
    });
  }

  /**
   * Load hierarchical data from API
   */
  private loadData(): void {
    this.loading = true;
    this.error = null;

    this.dataService.fetchAggregations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          console.log('[GenericHierarchicalPicker] Data loaded:', response);
          this.aggregations = response.aggregations;
          this.buildDisplayData();
          this.loading = false;
        },
        error: err => {
          console.error('[GenericHierarchicalPicker] Load error:', err);
          this.error = err.message || 'Failed to load data';
          this.loading = false;
        }
      });
  }

  /**
   * Build tree and table data from aggregations
   */
  private buildDisplayData(): void {
    if (this.mode === 'tree' || this.mode === 'both') {
      this.treeData = this.buildTreeData(this.aggregations);
    }

    if (this.mode === 'table' || this.mode === 'both') {
      this.tableData = this.buildTableData(this.aggregations);
      this.filteredData = [...this.tableData];
    }
  }

  /**
   * Build tree structure for NZ-Tree
   */
  private buildTreeData(buckets: AggregationBucket[]): any[] {
    return buckets.map(bucket => this.bucketToTreeNode(bucket, 0));
  }

  private bucketToTreeNode(bucket: AggregationBucket, level: number): any {
    const levelConfig = this.hierarchyLevels[level];
    const node: any = {
      title: `${bucket.label || bucket.key} ${this.showCounts ? `(${bucket.count})` : ''}`,
      key: bucket.key,
      level: level,
      count: bucket.count,
      isLeaf: !bucket.children || bucket.children.length === 0,
      selectable: true,
      expanded: false,
      selected: this.isSelected(bucket.key, level)
    };

    // Add children recursively
    if (bucket.children && bucket.children.length > 0) {
      node.children = bucket.children.map(child =>
        this.bucketToTreeNode(child, level + 1)
      );
    }

    return node;
  }

  /**
   * Build flat table data
   */
  private buildTableData(buckets: AggregationBucket[]): any[] {
    const rows: any[] = [];

    const flatten = (bucket: AggregationBucket, parentPath: string[] = []) => {
      const currentPath = [...parentPath, bucket.key];

      // Create row for this bucket
      const row: any = {
        path: currentPath,
        display: currentPath.join(' '),
        count: bucket.count,
        level: parentPath.length,
        selected: this.isPathSelected(currentPath)
      };

      // Add values for each hierarchy level
      this.hierarchyLevels.forEach((level, index) => {
        row[level.key] = currentPath[index] || '';
      });

      rows.push(row);

      // Process children
      if (bucket.children) {
        bucket.children.forEach(child => flatten(child, currentPath));
      }
    };

    buckets.forEach(bucket => flatten(bucket));
    return rows;
  }

  /**
   * Check if a key at a specific level is selected
   */
  private isSelected(key: string, level: number): boolean {
    return this.selectedItems.some(item =>
      item.path.length > level && item.path[level] === key
    );
  }

  /**
   * Check if a path is selected
   */
  private isPathSelected(path: string[]): boolean {
    return this.selectedItems.some(item =>
      JSON.stringify(item.path) === JSON.stringify(path)
    );
  }

  /**
   * Handle tree node click
   */
  onTreeNodeClick(event: any): void {
    const node = event.node;
    if (!node) return;

    const path = this.getNodePath(node);
    const selection: HierarchicalSelection = {
      path,
      display: path.join(' '),
      level: node.level
    };

    this.toggleSelection(selection);
  }

  /**
   * Get full path for a tree node
   */
  private getNodePath(node: any): string[] {
    const path: string[] = [];
    let current = node;

    while (current) {
      path.unshift(current.key);
      current = current.parent;
    }

    return path;
  }

  /**
   * Handle table row selection
   */
  onTableRowSelect(row: any): void {
    const selection: HierarchicalSelection = {
      path: row.path,
      display: row.display,
      level: row.level
    };

    this.toggleSelection(selection);
    row.selected = !row.selected;
  }

  /**
   * Toggle selection (add or remove)
   */
  private toggleSelection(selection: HierarchicalSelection): void {
    const index = this.selectedItems.findIndex(item =>
      JSON.stringify(item.path) === JSON.stringify(selection.path)
    );

    if (index >= 0) {
      // Remove selection
      this.selectedItems.splice(index, 1);
    } else {
      // Add selection
      if (this.multiSelect) {
        this.selectedItems.push(selection);
      } else {
        this.selectedItems = [selection];
      }
    }

    console.log('[GenericHierarchicalPicker] Selection changed:', this.selectedItems);
    this.selectionChange.emit([...this.selectedItems]);
  }

  /**
   * Handle search
   */
  onSearch(value: string): void {
    this.searchValue = value.toLowerCase();

    if (!this.searchValue) {
      this.filteredData = [...this.tableData];
      return;
    }

    this.filteredData = this.tableData.filter(row =>
      row.display.toLowerCase().includes(this.searchValue)
    );
  }

  /**
   * Select all items
   */
  selectAll(): void {
    this.selectedItems = this.tableData.map(row => ({
      path: row.path,
      display: row.display,
      level: row.level
    }));

    this.tableData.forEach(row => row.selected = true);
    this.selectionChange.emit([...this.selectedItems]);
  }

  /**
   * Clear all selections
   */
  clearAll(): void {
    this.selectedItems = [];
    this.tableData.forEach(row => row.selected = false);
    this.selectionChange.emit([]);
  }

  /**
   * Get selected count
   */
  getSelectedCount(): number {
    return this.selectedItems.length;
  }

  /**
   * Check if any items are selected
   */
  hasSelections(): boolean {
    return this.selectedItems.length > 0;
  }
}
