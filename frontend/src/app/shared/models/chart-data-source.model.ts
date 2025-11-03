import * as Plotly from 'plotly.js-dist-min';
import { VehicleStatistics } from '../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../models/search-filters.model';

/**
 * Chart data returned by ChartDataSource.transform()
 */
export interface ChartData {
  /** Plotly traces (one for legacy, two for segmented) */
  traces: Plotly.Data[];

  /** Chart layout configuration */
  layout: Partial<Plotly.Layout>;

  /** Optional: Data used for click event handling */
  clickData?: any;
}

/**
 * Abstract interface for chart data transformation
 * Similar to TableDataSource pattern from Milestone 003
 *
 * Each chart type implements this interface to transform
 * VehicleStatistics into Plotly-compatible chart data
 */
export abstract class ChartDataSource {
  /**
   * Transform statistics into chart data
   *
   * @param statistics - Vehicle statistics from backend
   * @param highlights - Current highlight filters
   * @param selectedValue - Currently selected value (for highlighting)
   * @param containerWidth - Chart container width for responsive sizing
   * @returns ChartData ready for Plotly.react()
   */
  abstract transform(
    statistics: VehicleStatistics | null,
    highlights: HighlightFilters,
    selectedValue: string | null,
    containerWidth: number
  ): ChartData | null;

  /**
   * Get chart title
   */
  abstract getTitle(): string;

  /**
   * Handle chart click events
   * Returns the data value that was clicked
   */
  abstract handleClick(event: any): string | null;
}
