import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HierarchicalSelection, DomainFilters } from '../../../models/generic';
import { GenericStateManagementService } from '../../../services/generic';
import { DomainConfigService } from '../../../services/generic';

/**
 * Generic Discovery Page Component
 *
 * Main container for the discovery experience.
 * Works with any domain configuration - vehicles, aircraft, flora, etc.
 *
 * Layout:
 * - Top: Hierarchical picker (manufacturer-model, manufacturer-model-variant, etc.)
 * - Bottom: Results table with expandable rows for instances
 *
 * @example
 * // Vehicles domain
 * <app-generic-discovery-page></app-generic-discovery-page>
 *
 * // Aircraft domain - same component, different behavior based on config
 * <app-generic-discovery-page></app-generic-discovery-page>
 */
@Component({
  selector: 'app-generic-discovery-page',
  templateUrl: './generic-discovery-page.component.html',
  styleUrls: ['./generic-discovery-page.component.scss']
})
export class GenericDiscoveryPageComponent implements OnInit, OnDestroy {

  // Configuration
  domainName: string = '';
  domainIcon: string = '';

  // State
  selectedItems: HierarchicalSelection[] = [];
  hasResults: boolean = false;
  resultsCount: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private stateService: GenericStateManagementService,
    private domainConfig: DomainConfigService
  ) {}

  ngOnInit(): void {
    this.initializeFromConfig();
    this.subscribeToState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize from domain configuration
   */
  private initializeFromConfig(): void {
    const config = this.domainConfig.getCurrentConfig();
    if (!config) {
      console.error('[GenericDiscoveryPage] No domain configuration found');
      return;
    }

    this.domainName = config.domain.name;
    this.domainIcon = config.domain.icon || 'database';

    console.log('[GenericDiscoveryPage] Initialized for domain:', this.domainName);
  }

  /**
   * Subscribe to state changes
   */
  private subscribeToState(): void {
    // Subscribe to filters (for selected items)
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.selectedItems = filters.selectedItems || [];
      });

    // Subscribe to results (to show/hide results section)
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.hasResults = state.results.length > 0;
        this.resultsCount = state.total;
      });
  }

  /**
   * Handle selection change from picker
   */
  onSelectionChange(selections: HierarchicalSelection[]): void {
    console.log('[GenericDiscoveryPage] Selection changed:', selections);

    this.stateService.updateFilters({
      selectedItems: selections,
      page: 1 // Reset to first page on selection change
    });
  }

  /**
   * Clear all selections
   */
  clearSelections(): void {
    this.onSelectionChange([]);
  }
}
