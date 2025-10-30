import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { RequestCoordinatorService } from '../../../core/services/request-coordinator.service';

/**
 * Field definition for query control dropdown
 */
export interface QueryField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'range' | 'multiselect';
  placeholder?: string;
}

/**
 * Query filter value from dialog
 */
export interface QueryFilter {
  field: string;
  fieldLabel: string;
  type: 'string' | 'number' | 'range' | 'multiselect';
  value?: string | number;
  values?: string[]; // For multiselect
  rangeMin?: number;
  rangeMax?: number;
}

@Component({
  selector: 'app-query-control',
  templateUrl: './query-control.component.html',
  styleUrls: ['./query-control.component.scss'],
})
export class QueryControlComponent implements OnInit {
  // ========== OUTPUTS ==========

  /** Emits when a filter is added */
  @Output() filterAdd = new EventEmitter<QueryFilter>();

  // ========== STATE ==========

  /** Available fields for querying */
  queryFields: QueryField[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      type: 'multiselect',
      placeholder: 'Select manufacturers',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'string',
      placeholder: 'e.g., F-150, Corvette',
    },
    {
      key: 'year',
      label: 'Year',
      type: 'range',
    },
    {
      key: 'body_class',
      label: 'Body Class',
      type: 'string',
      placeholder: 'e.g., Pickup, Sedan',
    },
    {
      key: 'data_source',
      label: 'Data Source',
      type: 'string',
      placeholder: 'e.g., NHTSA',
    },
  ];

  /** Selected field from dropdown */
  selectedField?: string;

  /** Dialog visibility */
  rangeDialogVisible = false;
  stringDialogVisible = false;
  manufacturerDialogVisible = false;

  /** Dialog values */
  rangeMin?: number;
  rangeMax?: number;
  stringValue?: string;

  /** Currently selected field definition */
  currentField?: QueryField;

  // Filter data lists (loaded on-demand)
  manufacturerList: string[] = [];
  modelList: string[] = [];
  bodyClassList: string[] = [];
  dataSourceList: string[] = [];
  yearRange: { min: number; max: number } | null = null;

  // Selected values
  selectedManufacturersArray: string[] = [];
  selectedModelsArray: string[] = [];
  selectedBodyClassesArray: string[] = [];
  selectedDataSourcesArray: string[] = [];

  // Temporary staging for dialog selections (before Apply)
  tempSelectedManufacturers: string[] = [];

  // Search functionality
  manufacturerSearchTerm: string = '';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  // Loading states
  isLoadingManufacturers = false;
  isLoadingModels = false;
  isLoadingBodyClasses = false;
  isLoadingDataSources = false;
  isLoadingYearRange = false;

  // ========== LIFECYCLE ==========

  constructor(
    private apiService: ApiService,
    private requestCoordinator: RequestCoordinatorService
  ) {}

  ngOnInit(): void {
    // Manufacturers loaded on-demand when field is selected
  }

  // ========== COMPUTED PROPERTIES ==========

  get filteredManufacturers(): string[] {
    if (!this.manufacturerSearchTerm.trim()) {
      return this.manufacturerList;
    }

    const searchLower = this.manufacturerSearchTerm.toLowerCase();
    return this.manufacturerList.filter(manufacturer =>
      manufacturer.toLowerCase().includes(searchLower)
    );
  }

  // ========== FIELD SELECTION ==========

  onFieldSelect(fieldKey: string): void {
    const field = this.queryFields.find((f) => f.key === fieldKey);
    if (!field) return;

    this.currentField = field;

    // Load data on-demand based on field type
    if (field.type === 'range') {
      if (field.key === 'year') {
        this.loadYearRange();
        this.rangeMin = undefined;
        this.rangeMax = undefined;
        this.rangeDialogVisible = true;
      }
    } else if (field.type === 'multiselect') {
      // Show manufacturer dialog
      if (field.key === 'manufacturer') {
        this.loadManufacturers();
        this.tempSelectedManufacturers = [...this.selectedManufacturersArray]; // Copy current selections
        this.manufacturerSearchTerm = ''; // Clear search
        this.manufacturerDialogVisible = true;

        // Auto-focus search input after dialog opens
        setTimeout(() => {
          this.searchInput?.nativeElement?.focus();
        }, 200);
      }
    } else if (field.type === 'string' || field.type === 'number') {
      this.stringValue = undefined;
      this.stringDialogVisible = true;
    }
  }

  // ========== RANGE DIALOG ==========

  onRangeDialogOk(): void {
    if (!this.currentField) return;

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: 'range',
      rangeMin: this.rangeMin,
      rangeMax: this.rangeMax,
    };

    this.filterAdd.emit(filter);
    this.rangeDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  onRangeDialogCancel(): void {
    this.rangeDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  // ========== STRING/NUMBER DIALOG ==========

  onStringDialogOk(): void {
    if (!this.currentField || !this.stringValue) return;

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: this.currentField.type,
      value: this.stringValue,
    };

    this.filterAdd.emit(filter);
    this.stringDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
    this.stringValue = undefined;
  }

  onStringDialogCancel(): void {
    this.stringDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
    this.stringValue = undefined;
  }

  // ========== MANUFACTURER MULTI-SELECT DIALOG ==========

  onManufacturerSearchChange(): void {
    // Just trigger change detection - filteredManufacturers getter handles the filtering
  }

  clearManufacturerSearch(): void {
    this.manufacturerSearchTerm = '';
    // Re-focus the search input after clearing
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 0);
  }

  toggleManufacturer(manufacturer: string): void {
    const index = this.tempSelectedManufacturers.indexOf(manufacturer);
    if (index === -1) {
      // Add to selection
      this.tempSelectedManufacturers.push(manufacturer);
    } else {
      // Remove from selection
      this.tempSelectedManufacturers.splice(index, 1);
    }
  }

  onManufacturerDialogOk(): void {
    if (!this.currentField) return;

    // Apply temporary selections to actual array
    this.selectedManufacturersArray = [...this.tempSelectedManufacturers];

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: 'multiselect',
      values: this.selectedManufacturersArray,
    };

    this.filterAdd.emit(filter);
    this.manufacturerDialogVisible = false;
    this.manufacturerSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  onManufacturerDialogCancel(): void {
    // Discard temporary selections
    this.tempSelectedManufacturers = [];
    this.manufacturerDialogVisible = false;
    this.manufacturerSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  // ========== VALIDATION ==========

  isRangeValid(): boolean {
    // At least one value must be set
    if (this.rangeMin === undefined && this.rangeMax === undefined) {
      return false;
    }

    // If both are set, min must be <= max
    if (
      this.rangeMin !== undefined &&
      this.rangeMax !== undefined &&
      this.rangeMin > this.rangeMax
    ) {
      return false;
    }

    return true;
  }

  isStringValid(): boolean {
    return !!this.stringValue && this.stringValue.trim().length > 0;
  }

  // ========== FILTER DATA LOADING (ON-DEMAND WITH CACHING) ==========

  loadManufacturers(): void {
    if (this.manufacturerList.length > 0) {
      console.log('Manufacturers already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingManufacturers = true;
    console.log('Loading manufacturers from API...');

    this.requestCoordinator
      .execute(
        'filters/manufacturers',
        () => this.apiService.getDistinctManufacturers(),
        {
          cacheTime: 300000, // Cache for 5 minutes
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.manufacturerList = response.manufacturers;
          this.isLoadingManufacturers = false;
          console.log('Loaded manufacturers:', this.manufacturerList.length);
        },
        error: (error) => {
          console.error('Error loading manufacturers:', error);
          this.isLoadingManufacturers = false;
        },
      });
  }

  loadModels(): void {
    if (this.modelList.length > 0) {
      console.log('Models already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingModels = true;
    console.log('Loading models from API...');

    this.requestCoordinator
      .execute(
        'filters/models',
        () => this.apiService.getDistinctModels(),
        {
          cacheTime: 300000, // Cache for 5 minutes
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.modelList = response.models;
          this.isLoadingModels = false;
          console.log('Loaded models:', this.modelList.length);
        },
        error: (error) => {
          console.error('Error loading models:', error);
          this.isLoadingModels = false;
        },
      });
  }

  loadBodyClasses(): void {
    if (this.bodyClassList.length > 0) {
      console.log('Body classes already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingBodyClasses = true;
    console.log('Loading body classes from API...');

    this.requestCoordinator
      .execute(
        'filters/body-classes',
        () => this.apiService.getDistinctBodyClasses(),
        {
          cacheTime: 300000, // Cache for 5 minutes
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.bodyClassList = response.body_classes;
          this.isLoadingBodyClasses = false;
          console.log('Loaded body classes:', this.bodyClassList.length);
        },
        error: (error) => {
          console.error('Error loading body classes:', error);
          this.isLoadingBodyClasses = false;
        },
      });
  }

  loadDataSources(): void {
    if (this.dataSourceList.length > 0) {
      console.log('Data sources already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingDataSources = true;
    console.log('Loading data sources from API...');

    this.requestCoordinator
      .execute(
        'filters/data-sources',
        () => this.apiService.getDistinctDataSources(),
        {
          cacheTime: 300000, // Cache for 5 minutes
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.dataSourceList = response.data_sources;
          this.isLoadingDataSources = false;
          console.log('Loaded data sources:', this.dataSourceList.length);
        },
        error: (error) => {
          console.error('Error loading data sources:', error);
          this.isLoadingDataSources = false;
        },
      });
  }

  loadYearRange(): void {
    if (this.yearRange !== null) {
      console.log('Year range already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingYearRange = true;
    console.log('Loading year range from API...');

    this.requestCoordinator
      .execute(
        'filters/year-range',
        () => this.apiService.getYearRange(),
        {
          cacheTime: 300000, // Cache for 5 minutes
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.yearRange = response;
          this.isLoadingYearRange = false;
          console.log('Loaded year range:', this.yearRange);
        },
        error: (error) => {
          console.error('Error loading year range:', error);
          this.isLoadingYearRange = false;
        },
      });
  }

}
