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
  manufacturerDialogVisible = false;

  /** Dialog values */
  rangeMin?: number;
  rangeMax?: number;
  stringValue?: string;

  /** Currently selected field definition */
  currentField?: QueryField;

  // Manufacturer multi-select state
  manufacturerList: string[] = [];
  filteredManufacturerList: string[] = [];
  selectedManufacturers: Set<string> = new Set();
  manufacturerSearchText = '';
  isLoadingManufacturers = false;

  // ========== LIFECYCLE ==========

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadManufacturers();
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
      this.selectedManufacturers.clear();
      this.manufacturerSearchText = '';
      this.filteredManufacturerList = [...this.manufacturerList];
      this.manufacturerDialogVisible = true;
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

  // ========== MANUFACTURER MULTI-SELECT DIALOG ==========

  loadManufacturers(): void {
    this.isLoadingManufacturers = true;
    // Fetch all manufacturers (use large page size to get all)
    this.apiService.getManufacturerModelCombinations(1, 10000).subscribe({
      next: (response) => {
        // Extract unique manufacturers and sort alphabetically
        this.manufacturerList = response.data
          .map((item) => item.manufacturer)
          .sort((a, b) => a.localeCompare(b));
        this.filteredManufacturerList = [...this.manufacturerList];
        this.isLoadingManufacturers = false;
      },
      error: (error) => {
        console.error('Error loading manufacturers:', error);
        this.isLoadingManufacturers = false;
      },
    });
  }

  onManufacturerSearch(searchText: string): void {
    this.manufacturerSearchText = searchText;
    if (!searchText.trim()) {
      this.filteredManufacturerList = [...this.manufacturerList];
    } else {
      const search = searchText.toLowerCase();
      this.filteredManufacturerList = this.manufacturerList.filter((mfr) =>
        mfr.toLowerCase().includes(search)
      );
    }
  }

  toggleManufacturer(manufacturer: string): void {
    if (this.selectedManufacturers.has(manufacturer)) {
      this.selectedManufacturers.delete(manufacturer);
    } else {
      this.selectedManufacturers.add(manufacturer);
    }
  }

  isManufacturerSelected(manufacturer: string): boolean {
    return this.selectedManufacturers.has(manufacturer);
  }

  onManufacturerDialogOk(): void {
    if (!this.currentField || this.selectedManufacturers.size === 0) return;

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: 'multiselect',
      values: Array.from(this.selectedManufacturers),
    };

    this.filterAdd.emit(filter);
    this.manufacturerDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
    this.selectedManufacturers.clear();
    this.manufacturerSearchText = '';
  }

  onManufacturerDialogCancel(): void {
    this.manufacturerDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
    this.selectedManufacturers.clear();
    this.manufacturerSearchText = '';
  }

  isManufacturerValid(): boolean {
    return this.selectedManufacturers.size > 0;
  }
}
