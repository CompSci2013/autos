import * as Plotly from 'plotly.js-dist-min';
import { VehicleStatistics } from '../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../models/search-filters.model';
import { ChartDataSource, ChartData } from '../models/chart-data-source.model';

/**
 * Year Chart Data Source
 *
 * Transforms VehicleStatistics.yearDistribution into Plotly bar chart
 * Handles time series data with chronological sorting
 */
export class YearChartDataSource extends ChartDataSource {
  private static readonly CHART_HEIGHT = 400;

  transform(
    statistics: VehicleStatistics | null,
    highlights: HighlightFilters,
    selectedValue: string | null,
    containerWidth: number
  ): ChartData | null {
    if (!statistics?.byYearRange) {
      return null;
    }

    const entries = Object.entries(statistics.byYearRange);

    // Check if data has segmented format ({total, highlighted})
    const isSegmented = entries.length > 0 &&
      entries[0] && entries[0][1] &&
      typeof entries[0][1] === 'object' &&
      'total' in entries[0][1];

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const years = entries.map(([year]) => parseInt(year, 10));
      const highlightedCounts = entries.map(([, stats]: [string, any]) => stats.highlighted || 0);
      const nonHighlightedCounts = entries.map(([, stats]: [string, any]) =>
        (stats.total || 0) - (stats.highlighted || 0)
      );

      traces = [
        {
          x: years,
          y: highlightedCounts,
          type: 'bar',
          name: 'Highlighted',
          marker: {
            color: '#1890ff',
            line: { color: '#096dd9', width: 1 }
          },
          hovertemplate: '<b>%{x}</b><br>Highlighted: %{y}<extra></extra>',
        },
        {
          x: years,
          y: nonHighlightedCounts,
          type: 'bar',
          name: 'Other',
          marker: {
            color: '#d9d9d9',
            line: { color: '#bfbfbf', width: 1 }
          },
          hovertemplate: '<b>%{x}</b><br>Other: %{y}<extra></extra>',
        }
      ];
    } else {
      // Legacy format: render single-color bars
      const years = entries.map(([year]) => parseInt(year, 10));
      const counts = entries.map(([, count]) => count as number);

      traces = [{
        x: years,
        y: counts,
        type: 'bar',
        marker: {
          color: '#28a745',
          line: { color: '#218838', width: 1 },
        },
        hovertemplate: '<b>%{x}</b><br>Count: %{y}<extra></extra>',
      }];
    }

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: this.getTitle(),
        font: { size: 18, family: 'Arial, sans-serif' },
        xref: 'paper',
        x: 0.5,
      },
      xaxis: {
        title: 'Year',
        type: 'linear',
        dtick: 5, // Show every 5 years
      },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: YearChartDataSource.CHART_HEIGHT,
      margin: { t: 60, r: 20, b: 60, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,
      showlegend: !!isSegmented,
    };

    return { traces, layout };
  }

  getTitle(): string {
    return 'Year';
  }

  handleClick(event: any): string | null {
    // Extract clicked year range from Box Select event
    if (event.range && event.range.x) {
      const [minYear, maxYear] = event.range.x;
      return `${Math.round(minYear)}-${Math.round(maxYear)}`;
    }
    // Single click - return year
    if (event.points && event.points.length > 0) {
      return String(event.points[0].x);
    }
    return null;
  }
}
