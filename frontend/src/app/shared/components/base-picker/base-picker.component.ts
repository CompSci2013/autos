/**
 * Base Picker Component
 *
 * Generic, reusable picker component driven by PickerConfig.
 * Handles selection logic, URL hydration, and pop-out awareness.
 *
 * Features:
 * - Configuration-driven (columns, API, selection logic)
 * - Client-side and server-side pagination
 * - URL-driven state management
 * - Pop-out window support
 * - Set-based selection (O(1) lookups)
 * - Uses BaseDataTableComponent for display
 *
 * Usage:
 *   <app-base-picker
 *     [configId]="'manufacturer-model'"
 *     [context]="{ vehicleId: '123' }"
 *     (selectionChange)="onSelectionChange($event)"
 *   >
 *   </app-base-picker>
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  PickerConfig,
  PickerSelectionEvent,
  resolveColumnValue,
} from '../../models/picker-config.model';
import { TableColumn, TableQueryParams } from '../../models';
import { BaseDataTableComponent } from '../base-data-table/base-data-table.component';
import { BasePickerDataSource } from '../../services/base-picker-data-source';
import { PickerConfigService } from '../../../core/services/picker-config.service';
import { PopOutContextService } from '../../../core/services/popout-context.service';
import { StateManagementService } from '../../../core/services/state-management.service';
import { RouteStateService } from '../../../core/services/route-state.service';
import { ApiService } from '../../../services/api.service';

/**
 * Base Picker Component
 * Generic implementation driven by PickerConfig
 */
@Component({
  selector: 'app-base-picker',
  templateUrl: './base-picker.component.html',
  styleUrls: ['./base-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasePickerComponent<T = any> implements OnInit, OnDestroy {
  /**
   * Configuration ID (required)
   * Example: 'manufacturer-model', 'vin-picker'
   */
  @Input() configId!: string;

  /**
   * Optional context data for API calls
   * Example: { vehicleId: '123' } for VIN picker
   */
  @Input() context?: Record<string, any>;

  /**
   * Selection change event
   * Emitted when user applies or clears selections
   */
  @Output() selectionChange = new EventEmitter<PickerSelectionEvent<T>>();

  /** Reference to BaseDataTableComponent */
  @ViewChild(BaseDataTableComponent)
  baseTable!: BaseDataTableComponent<T>;

  /** Picker configuration (loaded from PickerConfigService) */
  config!: PickerConfig<T>;

  /** Data source (created from configuration) */
  dataSource!: BasePickerDataSource<T>;

  /** Column configuration for BaseDataTableComponent */
  columns: TableColumn<T>[] = [];

  /** Query params for BaseDataTableComponent */
  tableQueryParams: TableQueryParams = {
    page: 1,
    size: 20,
    filters: {},
  };

  /** Selection state (Set<string> for O(1) lookups) */
  selectedRows = new Set<string>();

  /** Cached display labels for selected items (prevents template function calls) */
  selectedItemsDisplay: string[] = [];

  /** Pending hydration (selections to apply after data loads) */
  private pendingHydration: string[] = [];

  /** Flag indicating if data has been loaded */
  private dataLoaded = false;

  /** Destroy subject for subscription cleanup */
  private destroy$ = new Subject<void>();

  constructor(
    private pickerConfigService: PickerConfigService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private popOutContext: PopOutContextService,
    private stateService: StateManagementService,
    private routeState: RouteStateService
  ) {}

  ngOnInit(): void {
    // Validate required inputs
    if (!this.configId) {
      throw new Error('[BasePickerComponent] configId input is required');
    }

    // Load configuration
    try {
      this.config = this.pickerConfigService.getConfig<T>(this.configId);
      console.log(
        `[BasePickerComponent] Loaded configuration: ${this.config.id} (${this.config.displayName})`
      );
    } catch (error) {
      console.error('[BasePickerComponent] Failed to load configuration:', error);
      throw error;
    }

    // Create data source
    this.dataSource = new BasePickerDataSource<T>(this.apiService, this.config);

    // Set up columns (convert PickerColumnConfig to TableColumn)
    this.columns = this.config.columns.map((col) => ({
      ...col,
      // TableColumn uses 'key' but we may have 'valuePath'
      // The resolveColumnValue() function will handle this
    })) as TableColumn<T>[];

    // Set up initial query params
    this.tableQueryParams = {
      page: 1,
      size: this.config.pagination.defaultPageSize,
      filters: { ...this.context }, // Add context to filters (e.g., vehicleId)
    };

    // Subscribe to URL state for hydration
    this.subscribeToUrlState();

    console.log(
      `[BasePickerComponent] Initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to URL state changes for selection hydration
   */
  private subscribeToUrlState(): void {
    const urlParam = this.config.selection.urlParam;

    this.routeState.watchParam(urlParam).pipe(
      takeUntil(this.destroy$)
    ).subscribe((urlValue) => {
      console.log(`[BasePickerComponent] URL param '${urlParam}' changed:`, urlValue);

      // Deserialize selections from URL
      const selections = urlValue
        ? this.config.selection.deserializer(urlValue)
        : [];

      // Convert to keys
      this.pendingHydration = selections.map((sel) =>
        this.config.row.keyGenerator(sel as T)
      );

      // If data already loaded, hydrate immediately
      if (this.dataLoaded) {
        this.hydrateSelections();
        this.cdr.markForCheck();
      } else {
        console.log(
          '[BasePickerComponent] Data not loaded yet, deferring hydration'
        );
      }
    });
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
      this.updateSelectedItemsDisplay();
      return;
    }

    // Add each selection key to the Set
    this.pendingHydration.forEach((key) => {
      this.selectedRows.add(key);
    });

    // Update display cache
    this.updateSelectedItemsDisplay();

    console.log(
      `[BasePickerComponent] Hydrated ${this.pendingHydration.length} selections from URL state`
    );
  }

  /**
   * Handle data loaded event from BaseDataTable
   * Called when data fetch completes successfully
   */
  onDataLoaded(): void {
    this.dataLoaded = true;
    console.log('[BasePickerComponent] Data loaded event received');

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
    console.log('[BasePickerComponent] Table query changed:', params);

    // Merge context into filters
    this.tableQueryParams = {
      ...params,
      filters: { ...params.filters, ...this.context },
    };
  }

  /**
   * Check if a specific row is selected
   */
  isRowSelected(row: T): boolean {
    const key = this.config.row.keyGenerator(row);
    return this.selectedRows.has(key);
  }

  /**
   * Toggle row selection
   */
  onRowSelectionChange(row: T, checked: boolean): void {
    const key = this.config.row.keyGenerator(row);

    if (checked) {
      this.selectedRows.add(key);
    } else {
      this.selectedRows.delete(key);
    }

    // Update display cache
    this.updateSelectedItemsDisplay();

    console.log(
      `[BasePickerComponent] Row selection changed. Total selected: ${this.selectedRows.size}`
    );

    // Trigger change detection after Set mutation
    this.cdr.markForCheck();
  }

  /**
   * Get selected items as array
   */
  get selectedItems(): T[] {
    return Array.from(this.selectedRows).map((key) =>
      this.config.row.keyParser(key)
    ) as T[];
  }

  /**
   * Update cached display labels for selected items
   * Called whenever selection changes to avoid template function calls
   */
  private updateSelectedItemsDisplay(): void {
    this.selectedItemsDisplay = Array.from(this.selectedRows);
  }

  /**
   * Handle Apply button click
   * Context-aware: Updates state directly or sends message to main window
   */
  onApply(): void {
    console.log('[BasePickerComponent] Apply clicked');
    console.log('[BasePickerComponent] Selected items:', this.selectedItems);

    // Emit selection change event
    this.selectionChange.emit({
      pickerId: this.config.id,
      selections: this.selectedItems,
      keys: Array.from(this.selectedRows),
    });

    // Update state based on context (pop-out vs normal)
    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'PICKER_SELECTION_CHANGE',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam,
          urlValue: this.config.selection.serializer(this.selectedItems),
        },
      });
    } else {
      // Normal mode: update state directly
      const urlValue = this.config.selection.serializer(this.selectedItems);
      this.stateService.updateFilters({
        [this.config.selection.urlParam]: urlValue,
      } as any);
    }
  }

  /**
   * Handle Clear button click
   * Context-aware: Clears state directly or sends message to main window
   */
  onClear(): void {
    console.log('[BasePickerComponent] Clear clicked');
    this.selectedRows.clear();
    this.updateSelectedItemsDisplay();
    this.cdr.markForCheck();

    // Emit selection change event
    this.selectionChange.emit({
      pickerId: this.config.id,
      selections: [],
      keys: [],
    });

    // Update state based on context (pop-out vs normal)
    if (this.popOutContext.isInPopOut()) {
      // Pop-out mode: send message to main window
      this.popOutContext.sendMessage({
        type: 'PICKER_CLEAR',
        payload: {
          configId: this.config.id,
          urlParam: this.config.selection.urlParam,
        },
      });
    } else {
      // Normal mode: update state directly
      this.stateService.updateFilters({
        [this.config.selection.urlParam]: '',
      } as any);
    }
  }

  /**
   * Get selection count
   */
  get selectionCount(): number {
    return this.selectedRows.size;
  }
}
