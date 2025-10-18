import { Observable } from 'rxjs';

/**
 * Interface for table data sources
 * Allows BaseDataTableComponent to work with any data provider
 */
export interface TableDataSource<T> {
  /**
   * Fetch data from server based on query parameters
   * @param params Query parameters (page, size, filters, sort)
   * @returns Observable of paginated response
   */
  fetch(params: TableQueryParams): Observable<TableResponse<T>>;
}

/**
 * Query parameters sent to data source
 */
export interface TableQueryParams {
  /** Current page number (1-indexed) */
  page: number;

  /** Number of items per page */
  size: number;

  /** Column key to sort by */
  sortBy?: string;

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';

  /** Filter values keyed by column key */
  filters?: { [key: string]: any };
}

/**
 * Expected response structure from data source
 */
export interface TableResponse<T> {
  /** Array of data items for current page */
  results: T[];

  /** Total number of items across all pages */
  total: number;

  /** Current page number */
  page: number;

  /** Items per page */
  size: number;

  /** Total number of pages */
  totalPages: number;
}
