/**
 * Defines the structure and behavior of a table column
 * Used by BaseDataTableComponent for rendering and functionality
 */
export interface TableColumn<T = any> {
  /** Unique identifier for the column (matches data property key) */
  key: string;

  /** Display label for column header */
  label: string;

  /** Whether column supports server-side sorting */
  sortable: boolean;

  /** Whether column supports filtering */
  filterable: boolean;

  /** Type of filter input (text, number, date, select, number-range) */
  filterType?: 'text' | 'number' | 'date' | 'select' | 'number-range';

  /** Options for select-type filters */
  filterOptions?: Array<{ label: string; value: any }>;

  /** Range filter configuration (for number-range type) */
  rangeConfig?: {
    min: number;
    max: number;
    step?: number;
    marks?: { [key: number]: string };
  };

  /** Whether column can be hidden by user */
  hideable: boolean;

  /** Column width (CSS value: '100px', '20%', etc.) */
  width?: string;

  /** Minimum width to prevent column from being too narrow */
  minWidth?: string;

  /** Whether column is currently visible */
  visible?: boolean;

  /** Display order (managed by persistence service) */
  order?: number;

  /** Columns that must be visible if this column is visible */
  dependencies?: string[];

  /** Group ID for toggling multiple related columns */
  groupId?: string;

  /** Simple formatter function for cell values */
  formatter?: (value: any, row: T) => string | number;

  /** Text alignment in cells */
  align?: 'left' | 'center' | 'right';
}
