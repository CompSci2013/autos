/**
 * Domain Configuration Schema
 *
 * Defines the structure of JSON configuration files for different domains.
 * Each domain (vehicles, aircraft, flora, etc.) will have its own .domain.json file
 * following this schema.
 *
 * @example vehicles.domain.json, aircraft.domain.json, flora.domain.json
 */

/**
 * Complete domain configuration
 */
export interface DomainConfig {
  domain: DomainMetadata;
  dataSource: DataSourceConfig;
  entity: EntitySchema;
  filters: FiltersConfig;
  picker: PickerConfig;
  ui: UIConfig;
}

/**
 * Domain metadata
 */
export interface DomainMetadata {
  id: string;                  // Unique identifier (e.g., 'vehicles', 'aircraft')
  name: string;                // Display name (e.g., 'Automotive Data Explorer')
  version: string;             // Schema version (e.g., '1.0.0')
  description: string;         // Brief description
  icon?: string;               // Icon identifier (e.g., 'car', 'plane')
  author?: string;             // Domain configuration author
  lastUpdated?: string;        // ISO 8601 timestamp
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  type: 'elasticsearch' | 'rest' | 'graphql' | 'custom';
  endpoints: {
    search: string;            // Main search endpoint
    details: string;           // Entity details endpoint
    instances?: string;        // Instance details endpoint (optional)
    counts?: string;           // Aggregation/counts endpoint (optional)
  };
  authentication?: {
    type: 'none' | 'apikey' | 'bearer' | 'basic';
    headerName?: string;       // e.g., 'Authorization', 'X-API-Key'
  };
  pagination: {
    type: 'offset' | 'cursor' | 'page';
    defaultSize: number;
    maxSize: number;
    sizeOptions: number[];     // e.g., [10, 20, 50, 100]
  };
  // Elasticsearch-specific
  elasticsearch?: {
    index: string;             // Index name (e.g., 'autos-unified')
    compositeKey?: string;     // Field used for grouping (e.g., 'make_model_year')
  };
}

/**
 * Entity schema definition
 */
export interface EntitySchema {
  type: string;                // Entity type name (e.g., 'vehicle', 'aircraft')
  instanceType?: string;       // Instance type name (e.g., 'vin', 'registration')
  primaryKey: string;          // Primary identifier field (e.g., 'vehicle_id')
  displayField: string;        // Field to display as entity name
  fields: FieldDefinition[];   // All entity fields
  hierarchies: HierarchyDefinition[];  // Hierarchical structures
}

/**
 * Field definition for entity properties
 */
export interface FieldDefinition {
  key: string;                 // Field identifier (e.g., 'manufacturer', 'year')
  label: string;               // Display label (e.g., 'Manufacturer', 'Year')
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  format?: string;             // For dates: 'iso8601', numbers: 'currency', etc.
  searchable?: boolean;        // Include in text search
  sortable?: boolean;          // Allow sorting
  filterable?: boolean;        // Allow filtering
  required?: boolean;          // Required field
  description?: string;        // Field description
}

/**
 * Hierarchy definition (e.g., manufacturer → model, family → genus → species)
 */
export interface HierarchyDefinition {
  id: string;                  // Hierarchy identifier
  name: string;                // Display name
  levels: HierarchyLevel[];    // Ordered list of levels
  separator?: string;          // Display separator (default: ' ')
}

/**
 * Single level in a hierarchy
 */
export interface HierarchyLevel {
  key: string;                 // Field key (e.g., 'manufacturer', 'model')
  label: string;               // Display label (e.g., 'Manufacturer', 'Model')
  parentKey?: string;          // Parent level key (if not top level)
  valueField?: string;         // Field to use as value (defaults to key)
  displayField?: string;       // Field to use for display (defaults to valueField)
}

/**
 * Filters configuration
 */
export interface FiltersConfig {
  textSearch: {
    enabled: boolean;
    placeholder: string;       // e.g., 'Search vehicles...', 'Search aircraft...'
    fields: string[];          // Fields to search across
  };
  columnFilters: ColumnFilterConfig[];
  rangeFilters: RangeFilterConfig[];
  defaultFilters?: {           // Default filter values
    [key: string]: any;
  };
}

/**
 * Column filter configuration
 */
export interface ColumnFilterConfig {
  key: string;                 // Filter identifier
  label: string;               // Display label
  type: 'text' | 'select' | 'multiselect' | 'boolean';
  options?: FilterOption[];    // For select/multiselect
  placeholder?: string;
  allowCustom?: boolean;       // Allow custom values (for select types)
}

/**
 * Range filter configuration
 */
export interface RangeFilterConfig {
  key: string;                 // Filter identifier
  label: string;               // Display label
  type: 'number' | 'date';
  min?: number | string;       // Minimum allowed value
  max?: number | string;       // Maximum allowed value
  step?: number;               // Step size (for number ranges)
  format?: string;             // Display format
}

/**
 * Filter option for select/multiselect filters
 */
export interface FilterOption {
  value: string | number | boolean;
  label: string;
  icon?: string;
  color?: string;
}

/**
 * Picker configuration
 */
export interface PickerConfig {
  mode: 'tree' | 'table' | 'both';  // Display mode
  multiSelect: boolean;
  showCounts: boolean;         // Show entity counts
  expandDefault?: boolean;     // Expand tree by default
  columns?: PickerColumn[];    // For table mode
  treeConfig?: {
    maxDepth?: number;
    lazyLoad?: boolean;
    searchable?: boolean;
  };
}

/**
 * Picker column configuration (for table mode)
 */
export interface PickerColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  searchable?: boolean;
}

/**
 * UI configuration
 */
export interface UIConfig {
  theme?: {
    primaryColor?: string;
    accentColor?: string;
  };
  branding?: {
    title?: string;            // Application title
    subtitle?: string;         // Application subtitle
    logo?: string;             // Logo URL or identifier
  };
  table: TableUIConfig;
  layout?: {
    defaultView?: 'discover' | 'workshop';
    enableWorkshop?: boolean;
    enablePopouts?: boolean;
  };
}

/**
 * Table UI configuration
 */
export interface TableUIConfig {
  columns: TableColumnConfig[];
  defaultSort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  expandable?: boolean;
  expansionConfig?: {
    mode: 'inline' | 'modal';
    lazyLoad?: boolean;
    maxInstances?: number;
  };
}

/**
 * Table column configuration
 */
export interface TableColumnConfig {
  key: string;                 // Field key
  label: string;               // Column header
  width?: string;              // Column width (e.g., '180px', 'auto')
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'number' | 'select';
  hideable?: boolean;          // Can be hidden by user
  defaultHidden?: boolean;     // Hidden by default
  format?: ColumnFormat;       // Display format
  cellRenderer?: string;       // Custom renderer identifier
}

/**
 * Column format configuration
 */
export interface ColumnFormat {
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'badge' | 'custom';
  options?: {
    locale?: string;           // e.g., 'en-US'
    currency?: string;         // e.g., 'USD'
    dateFormat?: string;       // e.g., 'short', 'medium', 'yyyy-MM-dd'
    precision?: number;        // Decimal places for numbers
    badgeColors?: {            // Color mapping for badge format
      [value: string]: string;
    };
  };
}

/**
 * Type guard to check if config has Elasticsearch data source
 */
export function isElasticsearchConfig(config: DomainConfig): config is DomainConfig & {
  dataSource: DataSourceConfig & { type: 'elasticsearch'; elasticsearch: Required<DataSourceConfig['elasticsearch']> }
} {
  return config.dataSource.type === 'elasticsearch' && !!config.dataSource.elasticsearch;
}

/**
 * Type guard to check if picker is tree mode
 */
export function isTreePicker(config: DomainConfig): boolean {
  return config.picker.mode === 'tree' || config.picker.mode === 'both';
}

/**
 * Type guard to check if picker is table mode
 */
export function isTablePicker(config: DomainConfig): boolean {
  return config.picker.mode === 'table' || config.picker.mode === 'both';
}

/**
 * Helper function to get filter by key
 */
export function getFilterConfig(
  config: DomainConfig,
  key: string
): ColumnFilterConfig | RangeFilterConfig | undefined {
  const columnFilter = config.filters.columnFilters.find(f => f.key === key);
  if (columnFilter) return columnFilter;

  const rangeFilter = config.filters.rangeFilters.find(f => f.key === key);
  if (rangeFilter) return rangeFilter;

  return undefined;
}

/**
 * Helper function to get table column config by key
 */
export function getTableColumnConfig(
  config: DomainConfig,
  key: string
): TableColumnConfig | undefined {
  return config.ui.table.columns.find(c => c.key === key);
}

/**
 * Helper function to validate domain config
 * Returns array of validation errors (empty if valid)
 */
export function validateDomainConfig(config: any): string[] {
  const errors: string[] = [];

  // Check required top-level properties
  if (!config.domain) errors.push('Missing required property: domain');
  if (!config.dataSource) errors.push('Missing required property: dataSource');
  if (!config.entity) errors.push('Missing required property: entity');
  if (!config.filters) errors.push('Missing required property: filters');
  if (!config.picker) errors.push('Missing required property: picker');
  if (!config.ui) errors.push('Missing required property: ui');

  // Check domain metadata
  if (config.domain) {
    if (!config.domain.id) errors.push('domain.id is required');
    if (!config.domain.name) errors.push('domain.name is required');
    if (!config.domain.version) errors.push('domain.version is required');
  }

  // Check data source
  if (config.dataSource) {
    if (!['elasticsearch', 'rest', 'graphql', 'custom'].includes(config.dataSource.type)) {
      errors.push('dataSource.type must be one of: elasticsearch, rest, graphql, custom');
    }
    if (!config.dataSource.endpoints) {
      errors.push('dataSource.endpoints is required');
    } else {
      if (!config.dataSource.endpoints.search) errors.push('dataSource.endpoints.search is required');
      if (!config.dataSource.endpoints.details) errors.push('dataSource.endpoints.details is required');
    }
  }

  // Check entity schema
  if (config.entity) {
    if (!config.entity.type) errors.push('entity.type is required');
    if (!config.entity.primaryKey) errors.push('entity.primaryKey is required');
    if (!config.entity.fields || !Array.isArray(config.entity.fields)) {
      errors.push('entity.fields must be an array');
    }
    if (!config.entity.hierarchies || !Array.isArray(config.entity.hierarchies)) {
      errors.push('entity.hierarchies must be an array');
    }
  }

  return errors;
}
