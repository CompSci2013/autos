import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  TableDataSource,
  TableQueryParams,
  TableResponse,
} from '../../../shared/models';
import { ApiService } from '../../../services/api.service';

/**
 * Flattened row for table display
 * Each row represents one manufacturer-model combination
 */
export interface PickerTableRow {
  key: string; // "manufacturer|model"
  manufacturer: string;
  model: string;
  count: number;
  selected: boolean; // Managed by component
}

/**
 * Data source adapter for table-picker component
 * Transforms hierarchical API response into flat table rows
 */
export class TablePickerDataSource implements TableDataSource<PickerTableRow> {
  constructor(private apiService: ApiService) {}

  /**
   * Fetch manufacturer-model combinations from API
   * Transform to flat rows for table display
   */
  fetch(params: TableQueryParams): Observable<TableResponse<PickerTableRow>> {
    // Extract search term from filters
    const search = params.filters?.['search'] || '';

    return this.apiService
      .getManufacturerModelCombinations(params.page, params.size, search)
      .pipe(
        map((response) => {
          // Flatten hierarchical data into table rows
          const rows: PickerTableRow[] = [];

          response.data.forEach((mfr) => {
            mfr.models.forEach((model) => {
              rows.push({
                key: `${mfr.manufacturer}|${model.model}`,
                manufacturer: mfr.manufacturer,
                model: model.model,
                count: model.count,
                selected: false, // Component will manage this
              });
            });
          });

          return {
            results: rows,
            total: rows.length, // Total items (not manufacturers)
            page: response.page,
            size: response.size,
            totalPages: response.totalPages,
          };
        })
      );
  }
}
