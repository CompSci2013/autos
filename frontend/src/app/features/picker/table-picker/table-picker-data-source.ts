import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../../../shared/models/table-data-source.model';
import { ApiService } from '../../../services/api.service';
import { PickerRow, ModelDetail } from '../../../models/vehicle.model';

/**
 * Manufacturer summary row for picker table
 * Each row represents one manufacturer with aggregate data
 */
export interface ManufacturerSummaryRow {
  manufacturer: string;
  totalCount: number;
  modelCount: number;
  models: ModelDetail[]; // Stored for expansion
  key: string;
}

/**
 * TablePickerDataSource
 *
 * Returns manufacturer summary rows (one per manufacturer)
 * Models are stored in each row and displayed on expansion
 */
@Injectable()
export class TablePickerDataSource
  implements TableDataSource<ManufacturerSummaryRow>
{
  private allManufacturers: ManufacturerSummaryRow[] = [];
  private dataLoaded = false;

  constructor(private apiService: ApiService) {}

  /**
   * Fetch data - loads all manufacturers once, then filters in memory
   */
  fetch(
    params: TableQueryParams
  ): Observable<TableResponse<ManufacturerSummaryRow>> {
    // If data already loaded, filter and return from memory
    if (this.dataLoaded) {
      return of(this.filterAndPaginate(params));
    }

    // First load: fetch all data from API and transform to manufacturer summaries
    console.log('TablePickerDataSource: Loading all data (one-time)');

    // Match original picker: page=1, size=100, NO third parameter
    return this.apiService.getManufacturerModelCombinations(1, 100).pipe(
      tap((response) => {
        // Transform hierarchical API response to manufacturer summary rows
        this.allManufacturers = response.data.map((mfr) => ({
          manufacturer: mfr.manufacturer,
          totalCount: mfr.count,
          modelCount: mfr.models.length,
          models: mfr.models, // Store models for expansion
          key: mfr.manufacturer,
        }));

        // Sort by manufacturer name
        this.allManufacturers.sort((a, b) =>
          a.manufacturer.localeCompare(b.manufacturer)
        );

        this.dataLoaded = true;
        console.log(
          `TablePickerDataSource: Loaded ${this.allManufacturers.length} manufacturers`
        );
      }),
      map(() => this.filterAndPaginate(params))
    );
  }

  /**
   * Filter and paginate manufacturer summaries in memory
   * CRITICAL: Model filter searches across ALL manufacturers' models
   */
  private filterAndPaginate(
    params: TableQueryParams
  ): TableResponse<ManufacturerSummaryRow> {
    let filtered = [...this.allManufacturers];

    // Apply filters
    if (params.filters) {
      // Manufacturer name filter (filters rows)
      if (params.filters['manufacturer']) {
        const value = String(params.filters['manufacturer']).toLowerCase();
        filtered = filtered.filter((row) =>
          row.manufacturer.toLowerCase().includes(value)
        );
      }

      // Model name filter (searches within models array, shows matching manufacturers)
      if (params.filters['model']) {
        const value = String(params.filters['model']).toLowerCase();
        filtered = filtered.filter((row) =>
          row.models.some((m) => m.model.toLowerCase().includes(value))
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
    this.allManufacturers = [];
    this.dataLoaded = false;
  }
}
