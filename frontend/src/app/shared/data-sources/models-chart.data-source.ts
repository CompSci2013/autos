import * as Plotly from 'plotly.js-dist-min';
import { VehicleStatistics } from '../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../models/search-filters.model';
import { ChartDataSource, ChartData } from '../models/chart-data-source.model';

/**
 * Models Chart Data Source
 *
 * Transforms VehicleStatistics.byModels into Plotly bar chart
 * Groups models by manufacturer for better visualization
 */
export class ModelsChartDataSource extends ChartDataSource {
  private static readonly TOP_N = 20;
  private static readonly CHART_HEIGHT = 400;

  transform(
    statistics: VehicleStatistics | null,
    highlights: HighlightFilters,
    selectedValue: string | null,
    containerWidth: number
  ): ChartData | null {
    if (!statistics?.modelsByManufacturer) {
      return null;
    }

    // Flatten nested structure: { [manufacturer]: { [model]: count } }
    const flatData: Array<[string, string, number | {total: number, highlighted: number}]> = [];

    for (const [manufacturer, models] of Object.entries(statistics.modelsByManufacturer)) {
      for (const [model, count] of Object.entries(models as { [model: string]: number | {total: number, highlighted: number} })) {
        flatData.push([manufacturer, model, count]);
      }
    }

    // Check if data has segmented format
    const isSegmented = flatData.length > 0 &&
      flatData[0] && flatData[0][2] &&
      typeof flatData[0][2] === 'object' &&
      'total' in flatData[0][2];

    let traces: Plotly.Data[];

    if (isSegmented) {
      // Segmented statistics: render stacked bars
      const sorted = flatData
        .sort((a, b) => ((b[2] as any).total || 0) - ((a[2] as any).total || 0))
        .slice(0, ModelsChartDataSource.TOP_N);

      const labels = sorted.map(([mfr, model]) => `${model} (${mfr})`);
      const highlightedCounts = sorted.map(([, , stats]) => (stats as any).highlighted || 0);
      const nonHighlightedCounts = sorted.map(([, , stats]) =>
        ((stats as any).total || 0) - ((stats as any).highlighted || 0)
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
      const sorted = flatData
        .sort((a, b) => (b[2] as number) - (a[2] as number))
        .slice(0, ModelsChartDataSource.TOP_N);

      const labels = sorted.map(([mfr, model]) => `${model} (${mfr})`);
      const counts = sorted.map(([, , count]) => count as number);

      traces = [{
        x: labels,
        y: counts,
        type: 'bar',
        marker: {
          color: '#17a2b8',
          line: { color: '#138496', width: 2 },
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
        title: 'Model',
        tickangle: -45,
      },
      yaxis: { title: 'Count' },
      width: containerWidth,
      height: ModelsChartDataSource.CHART_HEIGHT,
      margin: { t: 60, r: 20, b: 120, l: 60 },
      barmode: isSegmented ? 'stack' : undefined,
      showlegend: !!isSegmented,
    };

    return { traces, layout };
  }

  getTitle(): string {
    return 'Models';
  }

  handleClick(event: any): string | null {
    // Extract model from label like "F-150 (Ford)"
    if (event.points && event.points.length > 0) {
      const label = event.points[0].x;
      const match = label.match(/^(.+) \((.+)\)$/);
      if (match) {
        return `${match[2]}:${match[1]}`; // Return "Ford:F-150"
      }
    }
    return null;
  }
}
