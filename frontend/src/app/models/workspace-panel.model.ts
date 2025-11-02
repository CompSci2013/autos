import { GridsterItem } from 'angular-gridster2';

/**
 * Extended GridsterItem with custom properties for workspace panels
 */
export interface WorkspacePanel extends GridsterItem {
  id?: string;
  panelType?: 'picker' | 'results' | 'query-control' | 'plotly-charts';
  data?: any;
}
