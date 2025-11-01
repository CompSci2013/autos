import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateManagementService } from '../../core/services/state-management.service';
import { ManufacturerModelSelection } from '../../models';
import { SearchFilters } from '../../models/search-filters.model';

@Component({
  selector: 'app-panel-popout',
  templateUrl: './panel-popout.component.html',
  styleUrls: ['./panel-popout.component.scss']
})
export class PanelPopoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Panel metadata from route
  gridId!: string;
  panelId!: string;
  panelType!: string;

  // State for picker
  pickerClearTrigger = 0;
  pickerInitialSelections: ManufacturerModelSelection[] = [];

  // State for results
  currentFilters: SearchFilters = {};

  // Broadcast channel for state sync
  private channel!: BroadcastChannel;

  constructor(
    private route: ActivatedRoute,
    private stateService: StateManagementService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Get panel info from route params
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.gridId = params['gridId'];
      this.panelId = params['panelId'];
      this.panelType = params['type'];

      console.log(`Pop-out panel initialized: ${this.panelType} (${this.panelId})`);
      this.initializeBroadcastChannel();
      // DO NOT subscribe to StateManagementService - pop-out gets state via BroadcastChannel only
    });
  }

  private initializeBroadcastChannel(): void {
    // Create broadcast channel for communication with main window
    this.channel = new BroadcastChannel(`panel-${this.panelId}`);

    // Listen for messages from main window
    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // Notify main window that pop-out is ready
    this.channel.postMessage({
      type: 'PANEL_READY',
      panelId: this.panelId
    });
  }

  private subscribeToState(): void {
    // Subscribe to state changes from StateManagementService
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((filters) => {
      console.log('Pop-out: Filters updated from URL:', filters);

      this.currentFilters = filters;

      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.pickerInitialSelections = [...filters.modelCombos];
      } else {
        this.pickerInitialSelections = [];
      }
    });
  }

  private handleMessage(message: any): void {
    console.log('[PopOut] Received message:', message.type);

    // BroadcastChannel callbacks run outside Angular's zone
    // We need to run inside the zone to trigger change detection
    this.ngZone.run(() => {
      switch (message.type) {
        case 'STATE_UPDATE':
          // Handle state updates from main window
          // Sync FULL state to local StateManagementService
          if (message.state) {
            console.log('[PopOut] Syncing full state:', {
              filters: message.state.filters,
              resultsCount: message.state.results?.length,
              loading: message.state.loading,
              error: message.state.error,
              totalResults: message.state.totalResults
            });

            this.stateService.syncStateFromExternal(message.state);

            // Update local UI state
            this.currentFilters = message.state.filters;
            console.log('[PopOut] Updated currentFilters:', this.currentFilters);
            console.log('[PopOut] hasActiveFilters:', this.hasActiveFilters);

            // Update picker selections
            if (message.state.filters.modelCombos) {
              this.pickerInitialSelections = [...message.state.filters.modelCombos];
            } else {
              this.pickerInitialSelections = [];
            }
          }
          break;
        case 'CLEAR_SELECTION':
          this.pickerClearTrigger++;
          this.currentFilters = {};
          this.pickerInitialSelections = [];
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    });
  }

  // Event handlers
  onPickerSelectionChange(selections: ManufacturerModelSelection[]): void {
    console.log('Pop-out: Picker selections changed:', selections);

    // DO NOT update state service - only broadcast to main window
    // Main window will update state and broadcast back to us
    this.channel.postMessage({
      type: 'SELECTION_CHANGE',
      data: selections
    });
  }

  onClearAll(): void {
    console.log('Pop-out: Clear all triggered');

    // DO NOT reset filters locally - only broadcast to main window
    this.channel.postMessage({
      type: 'CLEAR_ALL'
    });
  }

  closeWindow(): void {
    window.close();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.currentFilters.modelCombos &&
      this.currentFilters.modelCombos.length > 0
    );
  }

  get selectionCount(): number {
    return this.currentFilters.modelCombos?.length || 0;
  }

  get panelTitle(): string {
    switch (this.panelType) {
      case 'picker':
        return 'Model Picker';
      case 'results':
        return 'Vehicle Results';
      case 'plotly':
      case 'chart':
        return 'Chart';
      default:
        return 'Panel';
    }
  }

  ngOnDestroy(): void {
    if (this.channel) {
      this.channel.close();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
