import { Component, OnInit, Output, EventEmitter } from '@angular/core';

/**
 * Field definition for query control dropdown
 */
export interface QueryField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'range';
  placeholder?: string;
}

/**
 * Query filter value from dialog
 */
export interface QueryFilter {
  field: string;
  fieldLabel: string;
  type: 'string' | 'number' | 'range';
  value?: string | number;
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
      type: 'string',
      placeholder: 'e.g., Ford, Chevrolet',
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

  // ========== LIFECYCLE ==========

  ngOnInit(): void {}

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
}
