import * as Plotly from 'plotly.js-dist-min';
import { VehicleStatistics } from '../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../models/search-filters.model';
import { ChartDataSource, ChartData } from '../models/chart-data-source.model';

/**
 * Body Class Chart Data Source
 *
 * Transforms VehicleStatistics.bodyClassDistribution into Plotly bar chart
 */
export class BodyClassChartDataSource extends ChartDataSource {
  private static readonly TOP_N = 15;
  private static readonly CHART_HEIGHT = 400;

  transform(
    statistics: VehicleStatistics | null,
    highlights: HighlightFilters,
    selectedValue: string | null,
    containerWidth: number
  ): ChartData | null {
    if (!statistics?.byBodyClass) {
      return null;
    }

    const entries = Object.entries(statistics.byBodyClass);

    // Check if data has segmented format ({total, highlighted})
    const isSegmented = entries.length > 0 &&
      entries[0] && entries[0][1] &&
      typeof entries[0][1] === 'object' &&
      'total' in entries[0][1];

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const sorted = entries
        .sort((a, b) => ((b[1] as any).total || 0) - ((a[1] as any).total || 0))
        .slice(0, BodyClassChartDataSource.TOP_N);

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
        .slice(0, BodyClassChartDataSource.TOP_N);

      traces = [{
        x: data.map(([label]) => label),
        y: data.map(([, count]) => count as number),
        type: 'bar',
        marker: {
          color: data.map(([label]) =>
            label === selectedValue ? '#dc3545' : '#e74c3c'
          ),
          line: {
            color: data.map(([label]) =>
              label === selectedValue ? '#c82333' : '#c0392b'
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
      xaxis: {
        title: 'Body Class',
        tickangle: -45,
      },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: BodyClassChartDataSource.CHART_HEIGHT,
      margin: { t: 60, r: 20, b: 100, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,
      showlegend: !!isSegmented,
    };

    return { traces, layout };
  }

  getTitle(): string {
    return 'Body Class';
  }

  handleClick(event: any): string | null {
    // Extract clicked body class from event
    if (event.points && event.points.length > 0) {
      return event.points[0].x;
    }
    return null;
  }
}
