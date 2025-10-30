import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../services/api.service';

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

  /** Dialog values */
  rangeMin?: number;
  rangeMax?: number;
  stringValue?: string;

  /** Currently selected field definition */
  currentField?: QueryField;

  // Manufacturer multi-select state
  manufacturerList: string[] = [];
  selectedManufacturersArray: string[] = [];
  isLoadingManufacturers = false;

  // ========== LIFECYCLE ==========

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Manufacturers loaded on-demand when field is selected
  }

  // ========== FIELD SELECTION ==========

  onFieldSelect(fieldKey: string): void {
    const field = this.queryFields.find((f) => f.key === fieldKey);
    if (!field) return;

    this.currentField = field;

    // Show appropriate dialog based on field type
    if (field.type === 'range') {
      this.rangeMin = undefined;
      this.rangeMax = undefined;
      this.rangeDialogVisible = true;
    } else if (field.type === 'multiselect') {
      // Manufacturer dropdown - load data from API and clear selections
      this.selectedManufacturersArray = [];
      if (field.key === 'manufacturer') {
        this.loadManufacturers();
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

  // ========== MANUFACTURER MULTI-SELECT DROPDOWN ==========

  loadManufacturers(): void {
    this.isLoadingManufacturers = true;
    console.log('Loading manufacturers from API...');

    // Fetch all manufacturers (use large page size to get all)
    this.apiService.getManufacturerModelCombinations(1, 10000).subscribe({
      next: (response) => {
        // Extract unique manufacturers (using Set for safety) and sort alphabetically
        const uniqueManufacturers = Array.from(
          new Set(response.data.map((item) => item.manufacturer))
        );
        this.manufacturerList = uniqueManufacturers.sort((a, b) => a.localeCompare(b));
        this.isLoadingManufacturers = false;
        console.log('Loaded manufacturers:', this.manufacturerList.length, 'unique values');
      },
      error: (error) => {
        console.error('Error loading manufacturers:', error);
        this.isLoadingManufacturers = false;
      },
    });
  }

  onManufacturerSelectionChange(): void {
    if (!this.currentField) return;

    console.log('Manufacturer selection changed:', this.selectedManufacturersArray);

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: 'multiselect',
      values: this.selectedManufacturersArray,
    };

    this.filterAdd.emit(filter);
  }
}
