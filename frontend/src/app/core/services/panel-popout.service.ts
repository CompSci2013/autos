import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WorkspacePanel } from '../../models/workspace-panel.model';
import { GridTransferService } from './grid-transfer.service';
import { StateManagementService } from './state-management.service';

export interface PopoutWindow {
  panelId: string;
  gridId: string;
  panel: WorkspacePanel; // Store full panel data for restoration
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
  providedIn: 'root',
})
export class PanelPopoutService implements OnDestroy {
  private readonly POPOUT_STORAGE_KEY = 'autos-workshop-popouts';
  private popouts = new Map<string, PopoutWindow>();
  private restoreInProgress = false;
  private destroy$ = new Subject<void>();

  constructor(
    private gridTransfer: GridTransferService,
    private stateService: StateManagementService
  ) {
    // Restore any panels that were popped out before page refresh
    this.restorePopoutsFromStorage();

    // Subscribe to state changes and broadcast FULL state to all pop-outs
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        console.log(
          '[PanelPopoutService] Broadcasting state to all pop-outs:',
          {
            resultsCount: state.results?.length,
            filters: state.filters,
            popoutsCount: this.popouts.size,
          }
        );
        this.broadcastToAll({
          type: 'STATE_UPDATE',
          state, // Send complete AppState (filters, results, loading, error, totalResults)
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
      console.error(
        'Failed to open pop-out window. Pop-up blocker may be active.'
      );
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
      panel, // Store full panel data
      window: newWindow,
      channel,
      checkInterval,
    });

    // Save to localStorage for persistence across page refreshes
    this.savePopoutMetadata();

    // Listen for messages from pop-out
    channel.onmessage = (event) => {
      this.handlePopoutMessage(gridId, panelId, event.data);
    };

    console.log(
      `Panel ${panelId} popped out to new window (MOVED from grid ${gridId})`
    );
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
   * Properly cleans up interval timer and BroadcastChannel to prevent memory leaks
   */
  closePopout(panelId: string): void {
    const popout = this.popouts.get(panelId);
    if (popout) {
      // Clear interval timer (prevents memory leak)
      if (popout.checkInterval) {
        clearInterval(popout.checkInterval);
      }

      // Close BroadcastChannel (prevents memory leak)
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
  private handlePopoutMessage(
    gridId: string,
    panelId: string,
    message: any
  ): void {
    console.log(`[PanelPopoutService] Message from panel ${panelId}:`, message);

    // Support both message.data (old) and message.payload (new)
    const payload = message.payload ?? message.data;

    switch (message.type) {
      case 'SELECTION_CHANGE':
        // Pop-out sent selection change - update MAIN window state
        console.log(
          '[PanelPopoutService] Selection changed in pop-out:',
          payload
        );
        this.stateService.updateFilters({
          modelCombos: payload && payload.length > 0 ? payload : undefined,
        });
        // State change will automatically broadcast back to pop-out via subscription
        break;

      case 'CLEAR_ALL':
        // Pop-out requested clear - update MAIN window state
        console.log('[PanelPopoutService] Clear all requested from pop-out');
        // Use updateFilters to clear all filters and trigger a fresh fetch
        // This matches the picker's Clear button behavior and Discover's Clear All
        this.stateService.updateFilters({
          modelCombos: undefined,
          manufacturer: undefined,
          model: undefined,
          yearMin: undefined,
          yearMax: undefined,
          bodyClass: undefined,
          dataSource: undefined
        });
        // State change will automatically broadcast back to pop-out via subscription
        break;

      case 'MANUFACTURER_CLICK':
        // Pop-out chart clicked on manufacturer
        console.log(
          '[PanelPopoutService] Manufacturer clicked in pop-out:',
          payload
        );
        this.stateService.updateFilters({
          manufacturer: payload || undefined,
        });
        break;

      case 'YEAR_RANGE_CLICK':
        // Pop-out chart clicked on year (now individual year instead of range)
        console.log('[PanelPopoutService] Year clicked in pop-out:', payload);
        if (payload && typeof payload === 'object' && 'yearMin' in payload) {
          // New format: { yearMin: number, yearMax: number }
          this.stateService.updateFilters({
            yearMin: payload.yearMin,
            yearMax: payload.yearMax,
          });
        } else if (payload && typeof payload === 'string') {
          // Legacy format: "1960-1969" (for backward compatibility)
          const [minYear, maxYear] = payload
            .split('-')
            .map((y: string) => parseInt(y, 10));
          this.stateService.updateFilters({
            yearMin: minYear,
            yearMax: maxYear,
          });
        } else {
          this.stateService.updateFilters({
            yearMin: undefined,
            yearMax: undefined,
          });
        }
        break;

      case 'BODY_CLASS_CLICK':
        // Pop-out chart clicked on body class
        console.log(
          '[PanelPopoutService] Body class clicked in pop-out:',
          payload
        );
        this.stateService.updateFilters({
          bodyClass: payload || undefined,
        });
        break;

      case 'PAGINATION_SORT_CHANGE':
        // Pop-out results table changed pagination or sorting
        console.log(
          '[PanelPopoutService] Pagination/sort changed in pop-out:',
          payload
        );
        this.stateService.updateFilters(payload);
        break;

      case 'PANEL_READY':
        // Pop-out is ready - send current FULL state
        console.log(
          '[PanelPopoutService] Pop-out panel ready, sending current state'
        );
        const currentState = this.stateService.getCurrentState();
        this.broadcastToPanel(panelId, {
          type: 'STATE_UPDATE',
          state: currentState, // Send complete AppState
        });
        break;

      case 'FILTER_ADD':
        // Pop-out query control added a filter
        console.log('[PanelPopoutService] Filter added from pop-out:', payload);
        if (payload) {
          // Convert QueryFilter to SearchFilters format
          const updates: any = {};

          if (payload.type === 'range') {
            if (payload.field === 'year') {
              if (payload.rangeMin !== undefined) {
                updates.yearMin = payload.rangeMin;
              }
              if (payload.rangeMax !== undefined) {
                updates.yearMax = payload.rangeMax;
              }
            }
          } else if (payload.type === 'multiselect') {
            if (payload.field === 'manufacturer') {
              updates.manufacturer = payload.values && payload.values.length > 0
                ? payload.values.join(',')
                : undefined;
            } else if (payload.field === 'model') {
              updates.model = payload.values && payload.values.length > 0
                ? payload.values.join(',')
                : undefined;
            } else if (payload.field === 'bodyClass') {
              updates.bodyClass = payload.values && payload.values.length > 0
                ? payload.values.join(',')
                : undefined;
            } else if (payload.field === 'dataSource') {
              updates.dataSource = payload.values && payload.values.length > 0
                ? payload.values.join(',')
                : undefined;
            }
          } else {
            // String/number filters
            if (payload.field === 'manufacturer') {
              updates.manufacturer = payload.value as string;
            } else if (payload.field === 'model') {
              updates.model = payload.value as string;
            } else if (payload.field === 'body_class') {
              updates.bodyClass = payload.value as string;
            } else if (payload.field === 'data_source') {
              updates.dataSource = payload.value as string;
            }
          }

          this.stateService.updateFilters(updates);
        }
        break;

      case 'FILTER_REMOVE':
        // Pop-out query control removed a filter
        console.log('[PanelPopoutService] Filter removed from pop-out:', payload);
        if (payload && payload.updates) {
          this.stateService.updateFilters(payload.updates);
        }
        break;

      default:
        console.log('[PanelPopoutService] Unknown message type:', message.type);
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
        timestamp: Date.now(),
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

  /**
   * Lifecycle hook - cleanup all resources to prevent memory leaks
   */
  ngOnDestroy(): void {
    console.log(
      '[PanelPopoutService] Destroying service - cleaning up resources'
    );

    // Complete the destroy$ subject to trigger takeUntil cleanup
    this.destroy$.next();
    this.destroy$.complete();

    // Close all pop-out windows and clean up their resources
    // This will clear intervals and close BroadcastChannels
    this.closeAllPopouts();

    console.log('[PanelPopoutService] Cleanup complete');
  }
}
