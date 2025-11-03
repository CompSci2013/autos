import * as Plotly from 'plotly.js-dist-min';
import { VehicleStatistics } from '../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../models/search-filters.model';
import { ChartDataSource, ChartData } from '../models/chart-data-source.model';

/**
 * Manufacturer Chart Data Source
 *
 * Transforms VehicleStatistics.byManufacturer into Plotly bar chart
 * Handles both segmented ({total, highlighted}) and legacy (number) formats
 */
export class ManufacturerChartDataSource extends ChartDataSource {
  private static readonly TOP_N = 20;
  private static readonly CHART_HEIGHT = 400;

  transform(
    statistics: VehicleStatistics | null,
    highlights: HighlightFilters,
    selectedValue: string | null,
    containerWidth: number
  ): ChartData | null {
    if (!statistics?.byManufacturer) {
      return null;
    }

    const entries = Object.entries(statistics.byManufacturer);

    // Check if data has segmented format ({total, highlighted})
    const isSegmented = entries.length > 0 &&
      typeof entries[0][1] === 'object' &&
      'total' in entries[0][1];

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const sorted = entries
        .sort((a, b) => ((b[1] as any).total || 0) - ((a[1] as any).total || 0))
        .slice(0, ManufacturerChartDataSource.TOP_N);

      const labels = sorted.map(([label]) => label);
      const highlightedCounts = sorted.map(([, stats]: [string, any]) => stats.highlighted || 0);
      const nonHighlightedCounts = sorted.map(([, stats]: [string, any]) =>
        (stats.total || 0) - (stats.highlighted || 0)
      );

      traces = [
        {
          x: labels,
          y: highlightedCounts,
          type: 'bar',
          name: 'Highlighted',
          marker: {
            color: '#1890ff',
            line: { color: '#096dd9', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Highlighted: %{y}<extra></extra>',
        },
        {
          x: labels,
          y: nonHighlightedCounts,
          type: 'bar',
          name: 'Other',
          marker: {
            color: '#d9d9d9',
            line: { color: '#bfbfbf', width: 2 }
          },
          hovertemplate: '<b>%{x}</b><br>Other: %{y}<extra></extra>',
        }
      ];
    } else {
      // Legacy format: render single-color bars
      const data = entries
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, ManufacturerChartDataSource.TOP_N);

      traces = [{
        x: data.map(([label]) => label),
        y: data.map(([, count]) => count as number),
        type: 'bar',
        marker: {
          color: data.map(([label]) =>
            label === selectedValue ? '#28a745' : '#4a90e2'
          ),
          line: {
            color: data.map(([label]) =>
              label === selectedValue ? '#218838' : '#357abd'
            ),
            width: 2,
          },
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
      xaxis: { title: 'Manufacturer' },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: ManufacturerChartDataSource.CHART_HEIGHT,
      margin: { t: 60, r: 20, b: 100, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,
      showlegend: isSegmented,
    };

    return { traces, layout };
  }

  getTitle(): string {
    return 'Manufacturers';
  }

  handleClick(event: any): string | null {
    // Extract clicked manufacturer from event
    if (event.points && event.points.length > 0) {
      return event.points[0].x;
    }
    return null;
  }
}
