import { GridsterConfig } from 'angular-gridster2';
import { WorkspacePanel } from './workspace-panel.model';

/**
 * Configuration for a single grid in the workspace
 */
export interface GridConfig {
  /** Unique identifier for this grid */
  id: string;

  /** Display name for the grid */
  name: string;

  /** Border color for visual distinction */
  borderColor: string;

  /** Gridster configuration options */
  options: GridsterConfig;

  /** Grid items (panels) */
  items: WorkspacePanel[];
}
