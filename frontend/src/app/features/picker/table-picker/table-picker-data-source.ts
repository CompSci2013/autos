import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../../../shared/models/table-data-source.model';
import { ApiService } from '../../../services/api.service';

/**
 * Flat picker row for table picker
 * Each row represents one manufacturer-model combination
 */
export interface PickerFlatRow {
  manufacturer: string;
  model: string;
  count: number;
  key: string; // "Manufacturer|Model"
}

/**
 * TablePickerDataSource
 *
 * Returns flat picker rows (one per manufacturer-model combination)
 * All combinations are visible without expansion
 */
@Injectable()
export class TablePickerDataSource
  implements TableDataSource<PickerFlatRow>
{
  private allRows: PickerFlatRow[] = [];
  private dataLoaded = false;

  constructor(private apiService: ApiService) {}

  /**
   * Fetch data - loads all manufacturer-model combinations once, then filters in memory
   */
  fetch(
    params: TableQueryParams
  ): Observable<TableResponse<PickerFlatRow>> {
    // If data already loaded, filter and return from memory
    if (this.dataLoaded) {
      return of(this.filterAndPaginate(params));
    }

    // First load: fetch all data from API and transform to flat rows
    console.log('TablePickerDataSource: Loading all data (one-time)');

    return this.apiService.getManufacturerModelCombinations(1, 100).pipe(
      tap((response) => {
        // Transform hierarchical API response to flat rows
        this.allRows = [];
        response.data.forEach((mfr) => {
          mfr.models.forEach((model) => {
            this.allRows.push({
              manufacturer: mfr.manufacturer,
              model: model.model,
              count: model.count,
              key: `${mfr.manufacturer}|${model.model}`,
            });
          });
        });

        // Sort by manufacturer, then model
        this.allRows.sort((a, b) => {
          const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
          if (mfrCompare !== 0) return mfrCompare;
          return a.model.localeCompare(b.model);
        });

        this.dataLoaded = true;
        console.log(
          `TablePickerDataSource: Loaded ${this.allRows.length} manufacturer-model combinations`
        );
      }),
      map(() => this.filterAndPaginate(params))
    );
  }

  /**
   * Filter and paginate flat rows in memory
   */
  private filterAndPaginate(
    params: TableQueryParams
  ): TableResponse<PickerFlatRow> {
    let filtered = [...this.allRows];

    // Apply filters
    if (params.filters) {
      // Manufacturer name filter
      if (params.filters['manufacturer']) {
        const value = String(params.filters['manufacturer']).toLowerCase();
        filtered = filtered.filter((row) =>
          row.manufacturer.toLowerCase().includes(value)
        );
      }

      // Model name filter
      if (params.filters['model']) {
        const value = String(params.filters['model']).toLowerCase();
        filtered = filtered.filter((row) =>
          row.model.toLowerCase().includes(value)
        );
      }
    }

    // Apply sorting
    if (params.sortBy && params.sortOrder) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[params.sortBy!];
        const bVal = (b as any)[params.sortBy!];
        const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return params.sortOrder === 'asc' ? compare : -compare;
      });
    }

    // Calculate pagination
    const total = filtered.length;
    const start = (params.page - 1) * params.size;
    const end = start + params.size;
    const results = filtered.slice(start, end);

    return {
      results,
      total,
      page: params.page,
      size: params.size,
      totalPages: Math.ceil(total / params.size),
    };
  }

  /**
   * Reset data (force reload on next fetch)
   */
  reset(): void {
    this.allRows = [];
    this.dataLoaded = false;
  }
}
