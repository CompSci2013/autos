import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import * as Plotly from 'plotly.js-dist-min';

/**
 * StaticParabolaChartComponent
 *
 * Simple static Plotly chart showing a parabola (y = x²) from -5 to +5
 */
@Component({
  selector: 'app-static-parabola-chart',
  templateUrl: './static-parabola-chart.component.html',
  styleUrls: ['./static-parabola-chart.component.scss']
})
export class StaticParabolaChartComponent implements OnInit, AfterViewInit {
  @ViewChild('parabolaChart', { static: false }) parabolaChartEl!: ElementRef;

  private plotlyConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  ngOnInit(): void {
    console.log('[StaticParabolaChart] Component initialized');
  }

  ngAfterViewInit(): void {
    // Use requestAnimationFrame to ensure DOM is fully laid out
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.renderParabola();
      });
    });
  }

  private renderParabola(): void {
    if (!this.parabolaChartEl?.nativeElement) {
      console.warn('[StaticParabolaChart] Chart element not found');
      return;
    }

    const el = this.parabolaChartEl.nativeElement;

    // Generate data points for parabola y = x² from -5 to +5
    const xValues: number[] = [];
    const yValues: number[] = [];

    for (let x = -5; x <= 5; x += 0.1) {
      xValues.push(x);
      yValues.push(x * x);
    }

    const trace: Plotly.Data = {
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#1890ff',
        width: 3
      },
      name: 'y = x²',
      hovertemplate: '<b>x:</b> %{x:.2f}<br><b>y:</b> %{y:.2f}<extra></extra>'
    };

    const layout: Partial<Plotly.Layout> = {
      title: 'Static Parabola Chart (y = x²)',
      xaxis: {
        title: 'x',
        gridcolor: '#e8e8e8',
        zeroline: true,
        zerolinecolor: '#595959',
        zerolinewidth: 2
      },
      yaxis: {
        title: 'y = x²',
        gridcolor: '#e8e8e8',
        zeroline: true,
        zerolinecolor: '#595959',
        zerolinewidth: 2
      },
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff',
      margin: { t: 60, r: 40, b: 60, l: 60 },
      height: 500
    };

    console.log('[StaticParabolaChart] Rendering parabola chart');
    Plotly.newPlot(el, [trace], layout, this.plotlyConfig).then(() => {
      console.log('[StaticParabolaChart] Chart rendered successfully');
    }).catch(err => {
      console.error('[StaticParabolaChart] Error rendering chart:', err);
    });
  }
}
