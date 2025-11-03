import { GridsterItem } from 'angular-gridster2';

/**
 * Extended GridsterItem with custom properties for workspace panels
 */
export interface WorkspacePanel extends GridsterItem {
  id?: string;
  panelType?: 'picker' | 'results' | 'query-control' | 'plotly-charts' | 'manufacturer-chart' | 'year-chart' | 'models-chart' | 'body-class-chart' | 'static-parabola';
  data?: any;
}
