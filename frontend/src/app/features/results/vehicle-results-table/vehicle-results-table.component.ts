import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { StateManagementService } from '../../../core/services/state-management.service';
import { ApiService } from '../../../services/api.service';
import { VehicleResult, VehicleDetailsResponse } from '../../../models';

@Component({
  selector: 'app-vehicle-results-table',
  templateUrl: './vehicle-results-table.component.html',
  styleUrls: ['./vehicle-results-table.component.scss']
})
export class VehicleResultsTableComponent implements OnInit, OnDestroy {
  // Data
  results: VehicleResult[] = [];
  total = 0;
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;

  // UI State
  loading = false;
  error: string | null = null;

  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private stateService: StateManagementService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Subscribe to filters from state (which comes from URL)
    // This makes the component loosely coupled and URL-driven
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => {
        // Only trigger fetch when modelCombos actually changes
        return JSON.stringify(prev.modelCombos) === JSON.stringify(curr.modelCombos);
      })
    ).subscribe(filters => {
      // If modelCombos exists and has selections, fetch vehicle details
      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.fetchVehicleDetails(filters.modelCombos, 1, this.pageSize);
      } else {
        // No selections - clear results
        this.clearResults();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetch vehicle details from backend
   * URL-first: Uses GET with query params for shareability
   */
  private fetchVehicleDetails(
    modelCombos: Array<{ manufacturer: string; model: string }>,
    page: number,
    size: number
  ): void {
    this.loading = true;
    this.error = null;

    this.apiService.getVehicleDetails(modelCombos, page, size).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: VehicleDetailsResponse) => {
        this.results = response.results;
        this.total = response.total;
        this.currentPage = response.page;
        this.pageSize = response.size;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to fetch vehicle details:', error);
        this.error = 'Failed to load vehicle details. Please try again.';
        this.loading = false;
        this.clearResults();
      }
    });
  }

  /**
   * Clear results when no selections
   */
  private clearResults(): void {
    this.results = [];
    this.total = 0;
    this.currentPage = 1;
    this.totalPages = 0;
    this.loading = false;
    this.error = null;
  }

  /**
   * Handle pagination - triggered by user clicking page buttons
   */
  onPageChange(page: number): void {
    // Get current filters from state
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.fetchVehicleDetails(filters.modelCombos, page, this.pageSize);
      }
    });
  }

  /**
   * Handle page size change
   */
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    
    // Get current filters and refetch with new page size
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      if (filters.modelCombos && filters.modelCombos.length > 0) {
        this.fetchVehicleDetails(filters.modelCombos, 1, size);
      }
    });
  }
}