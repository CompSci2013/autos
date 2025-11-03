import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as Plotly from 'plotly.js-dist-min';
import { VehicleStatistics } from '../../../models/vehicle-statistics.model';
import { HighlightFilters } from '../../../models/search-filters.model';
import { ChartDataSource } from '../../models/chart-data-source.model';
import { PopOutContextService } from '../../../core/services/popout-context.service';

/**
 * BaseChartComponent - Reusable Plotly.js Chart Container
 *
 * Similar to BaseDataTableComponent from Milestone 003,
 * this component provides a reusable foundation for all chart types.
 *
 * Uses composition pattern:
 * - Accepts ChartDataSource for data transformation
 * - Handles Plotly.js lifecycle (init, update, destroy)
 * - Manages resize events and pop-out context
 * - Forwards click events to parent
 *
 * Usage:
 * ```html
 * <app-base-chart
 *   [dataSource]="manufacturerDataSource"
 *   [statistics]="statistics$ | async"
 *   [highlights]="highlights$ | async"
 *   [selectedValue]="selectedManufacturer"
 *   (chartClick)="onChartClick($event)">
 * </app-base-chart>
 * ```
 */
@Component({
  selector: 'app-base-chart',
  template: `
    <div #chartContainer class="chart-container"></div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      height: 100%;
      min-height: 400px;
    }
  `]
})
export class BaseChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();
  private viewInitialized = false;
  private plotlyInitialized = false;

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  /**
   * Data source that transforms statistics into chart data
   * Provided by parent chart component (e.g., ManufacturerChartComponent)
   */
  @Input() dataSource!: ChartDataSource;

  /**
   * Statistics data from StateManagementService
   */
  @Input() statistics: VehicleStatistics | null = null;

  /**
   * Current highlight filters
   */
  @Input() highlights: HighlightFilters = {};

  /**
   * Currently selected value (for visual highlighting)
   */
  @Input() selectedValue: string | null = null;

  /**
   * Emitted when user clicks on a chart element
   * Parent component handles the click (e.g., set filters/highlights)
   */
  @Output() chartClick = new EventEmitter<{value: string, isHighlightMode: boolean}>();

  /** Highlight mode tracking (hold 'h' key) */
  private isHighlightModeActive = false;

  private plotlyConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
  };

  constructor(
    private popOutContext: PopOutContextService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Keyboard event listeners for highlight mode
   * Hold 'h' key while clicking chart to create highlights instead of filters
   */
  @HostListener('document:keydown.h')
  onHighlightKeyDown(): void {
    if (this.isHighlightModeActive) return;
    this.isHighlightModeActive = true;
    console.log('[BaseChart] 🟦 Highlight mode ACTIVATED');
  }

  @HostListener('document:keyup.h')
  onHighlightKeyUp(): void {
    this.isHighlightModeActive = false;
    console.log('[BaseChart] Highlight mode DEACTIVATED');
  }

  /** Handle window resize */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.plotlyInitialized) {
      this.renderChart();
    }
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    console.log(`[BaseChart] View initialized (pop-out mode: ${this.popOutContext.isInPopOut()})`);
    this.renderChart();
  }

  ngOnChanges(): void {
    // Re-render when inputs change
    if (this.viewInitialized) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    if (!this.viewInitialized || !this.dataSource || !this.chartContainer?.nativeElement) {
      return;
    }

    const el = this.chartContainer.nativeElement;
    const containerWidth = el.offsetWidth || el.parentElement?.offsetWidth || 600;

    // Transform data using provided data source
    const chartData = this.dataSource.transform(
      this.statistics,
      this.highlights,
      this.selectedValue,
      containerWidth
    );

    if (!chartData) {
      console.log('[BaseChart] No chart data to render');
      return;
    }

    console.log(`[BaseChart] Rendering ${this.dataSource.getTitle()} chart (width: ${containerWidth}px)`);

    // Render with Plotly
    Plotly.react(el, chartData.traces, chartData.layout, this.plotlyConfig).then(() => {
      console.log(`[BaseChart] ${this.dataSource.getTitle()} chart rendered successfully`);
      this.plotlyInitialized = true;

      // Setup click handler
      (el as any).on('plotly_click', (data: any) => {
        const clickedValue = this.dataSource.handleClick(data);
        if (clickedValue) {
          console.log(`[BaseChart] Chart clicked: ${clickedValue} (highlight mode: ${this.isHighlightModeActive})`);
          this.chartClick.emit({
            value: clickedValue,
            isHighlightMode: this.isHighlightModeActive
          });
        }
      });

      // Setup box/lasso select handler for range selection
      (el as any).on('plotly_selected', (data: any) => {
        if (!data || !data.points || data.points.length === 0) return;

        // Pass the full selected event to data source
        const selectedValue = this.dataSource.handleClick({ range: data.range, points: data.points });
        if (selectedValue) {
          console.log(`[BaseChart] Box select: ${selectedValue} (highlight mode: ${this.isHighlightModeActive})`);
          this.chartClick.emit({
            value: selectedValue,
            isHighlightMode: this.isHighlightModeActive
          });
        }
      });

      // Force resize in pop-out windows
      if (this.popOutContext.isInPopOut()) {
        setTimeout(() => {
          Plotly.Plots.resize(el);
        }, 100);
      }
    }).catch(err => {
      console.error(`[BaseChart] Error rendering ${this.dataSource.getTitle()} chart:`, err);
    });
  }

  ngOnDestroy(): void {
    if (this.chartContainer?.nativeElement && this.plotlyInitialized) {
      Plotly.purge(this.chartContainer.nativeElement);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
