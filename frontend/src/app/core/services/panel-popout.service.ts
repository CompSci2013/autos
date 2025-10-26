import { Injectable } from '@angular/core';
import { WorkspacePanel } from '../../models/workspace-panel.model';
import { GridTransferService } from './grid-transfer.service';
import { StateManagementService } from './state-management.service';

export interface PopoutWindow {
  panelId: string;
  gridId: string;
  panel: WorkspacePanel;  // Store full panel data for restoration
  window: Window | null;
  channel: BroadcastChannel;
  checkInterval?: number;
}

interface PopoutMetadata {
  panelId: string;
  gridId: string;
  panel: WorkspacePanel;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PanelPopoutService {
  private readonly POPOUT_STORAGE_KEY = 'autos-workshop-popouts';
  private popouts = new Map<string, PopoutWindow>();
  private restoreInProgress = false;

  constructor(
    private gridTransfer: GridTransferService,
    private stateService: StateManagementService
  ) {
    // Restore any panels that were popped out before page refresh
    this.restorePopoutsFromStorage();

    // Subscribe to state changes and broadcast to all pop-outs
    this.stateService.filters$.subscribe(filters => {
      this.broadcastToAll({
        type: 'STATE_UPDATE',
        filters
      });
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.closeAllPopouts();
    });
  }

  /**
   * Pop out a panel to a new window (MOVE semantics - removes from grid)
   */
  popOutPanel(gridId: string, panel: WorkspacePanel): void {
    const panelId = panel.id!;

    // Check if already popped out
    if (this.popouts.has(panelId)) {
      const existing = this.popouts.get(panelId);
      if (existing?.window && !existing.window.closed) {
        existing.window.focus();
        return;
      } else {
        // Clean up stale reference
        this.closePopout(panelId);
      }
    }

    // MOVE SEMANTICS: Remove panel from grid BEFORE opening window
    this.gridTransfer.removeItem(gridId, panelId);
    console.log(`Panel ${panelId} removed from grid ${gridId}`);

    // Calculate window size based on panel type
    const windowFeatures = this.getWindowFeatures(panel.panelType);

    // Build URL with panel info
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/panel/${gridId}/${panelId}/${panel.panelType}`;

    // Open new window
    const newWindow = window.open(url, `panel-${panelId}`, windowFeatures);

    if (!newWindow) {
      console.error('Failed to open pop-out window. Pop-up blocker may be active.');
      // Restore panel to grid since pop-out failed
      this.gridTransfer.addItem(gridId, panel);
      return;
    }

    // Create broadcast channel for state sync
    const channel = new BroadcastChannel(`panel-${panelId}`);

    // Monitor window close
    const checkInterval = window.setInterval(() => {
      if (newWindow.closed) {
        this.closePopout(panelId);
      }
    }, 500);

    // Store reference with full panel data for restoration
    this.popouts.set(panelId, {
      panelId,
      gridId,
      panel,  // Store full panel data
      window: newWindow,
      channel,
      checkInterval
    });

    // Save to localStorage for persistence across page refreshes
    this.savePopoutMetadata();

    // Listen for messages from pop-out
    channel.onmessage = (event) => {
      this.handlePopoutMessage(gridId, panelId, event.data);
    };

    console.log(`Panel ${panelId} popped out to new window (MOVED from grid ${gridId})`);
  }

  /**
   * Get window features based on panel type
   */
  private getWindowFeatures(panelType?: string): string {
    let width = 1200;
    let height = 800;

    // Customize window size based on panel type
    switch (panelType) {
      case 'plotly':
      case 'chart':
        width = 1600;
        height = 1000;
        break;
      case 'results':
        width = 1400;
        height = 900;
        break;
      case 'picker':
        width = 1000;
        height = 700;
        break;
    }

    // Center on screen
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    return `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`;
  }

  /**
   * Broadcast message to a specific popped-out panel
   */
  broadcastToPanel(panelId: string, message: any): void {
    const popout = this.popouts.get(panelId);
    if (popout && popout.window && !popout.window.closed) {
      popout.channel.postMessage(message);
    }
  }

  /**
   * Broadcast message to all popped-out panels
   */
  broadcastToAll(message: any): void {
    this.popouts.forEach((popout) => {
      if (popout.window && !popout.window.closed) {
        popout.channel.postMessage(message);
      }
    });
  }

  /**
   * Close a specific popped-out panel and restore to grid
   */
  closePopout(panelId: string): void {
    const popout = this.popouts.get(panelId);
    if (popout) {
      // Clear interval
      if (popout.checkInterval) {
        clearInterval(popout.checkInterval);
      }

      // Close channel
      popout.channel.close();

      // Close window if still open
      if (popout.window && !popout.window.closed) {
        popout.window.close();
      }

      // MOVE SEMANTICS: Restore panel to its original grid location
      if (!this.restoreInProgress) {
        this.gridTransfer.addItem(popout.gridId, popout.panel);
        console.log(`Panel ${panelId} restored to grid ${popout.gridId}`);
      }

      // Remove from map
      this.popouts.delete(panelId);

      // Update localStorage
      this.savePopoutMetadata();

      console.log(`Pop-out ${panelId} closed`);
    }
  }

  /**
   * Close all popped-out panels
   */
  closeAllPopouts(): void {
    this.popouts.forEach((popout, panelId) => {
      this.closePopout(panelId);
    });
  }

  /**
   * Check if a panel is currently popped out
   */
  isPoppedOut(panelId: string): boolean {
    const popout = this.popouts.get(panelId);
    return !!(popout && popout.window && !popout.window.closed);
  }

  /**
   * Handle messages from popped-out windows
   * This is the KEY method for bidirectional state sync
   */
  private handlePopoutMessage(gridId: string, panelId: string, message: any): void {
    console.log(`Message from panel ${panelId}:`, message);

    switch (message.type) {
      case 'SELECTION_CHANGE':
        // Pop-out sent selection change - update MAIN window state
        console.log('Selection changed in pop-out:', message.data);
        this.stateService.updateFilters({
          modelCombos: message.data.length > 0 ? message.data : undefined,
        });
        // State change will automatically broadcast back to pop-out via subscription
        break;

      case 'CLEAR_ALL':
        // Pop-out requested clear - update MAIN window state
        console.log('Clear all requested from pop-out');
        this.stateService.resetFilters();
        // State change will automatically broadcast back to pop-out via subscription
        break;

      case 'PANEL_READY':
        // Pop-out is ready - send current state
        console.log('Pop-out panel ready, sending current state');
        const currentFilters = this.stateService.getCurrentFilters();
        this.broadcastToPanel(panelId, {
          type: 'STATE_UPDATE',
          filters: currentFilters
        });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Save current popout metadata to localStorage
   */
  private savePopoutMetadata(): void {
    const metadata: PopoutMetadata[] = [];
    this.popouts.forEach((popout) => {
      metadata.push({
        panelId: popout.panelId,
        gridId: popout.gridId,
        panel: popout.panel,
        timestamp: Date.now()
      });
    });
    localStorage.setItem(this.POPOUT_STORAGE_KEY, JSON.stringify(metadata));
  }

  /**
   * Restore popouts from localStorage on page load
   * Panels are restored to grid if their windows are no longer open
   */
  private restorePopoutsFromStorage(): void {
    const stored = localStorage.getItem(this.POPOUT_STORAGE_KEY);
    if (!stored) return;

    try {
      const metadata: PopoutMetadata[] = JSON.parse(stored);
      this.restoreInProgress = true;

      // Since we can't tell if pop-out windows survived the refresh,
      // restore all panels to their grids
      metadata.forEach((meta) => {
        console.log(`Restoring panel ${meta.panelId} to grid ${meta.gridId}`);
        this.gridTransfer.addItem(meta.gridId, meta.panel);
      });

      // Clear localStorage since all panels are now back in grids
      localStorage.removeItem(this.POPOUT_STORAGE_KEY);

      this.restoreInProgress = false;
    } catch (error) {
      console.error('Failed to restore popouts from storage:', error);
      localStorage.removeItem(this.POPOUT_STORAGE_KEY);
      this.restoreInProgress = false;
    }
  }
}
