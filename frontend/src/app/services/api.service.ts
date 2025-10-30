import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ManufacturerModelResponse, VehicleDetailsResponse, VehicleInstancesResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getManufacturerModelCombinations(
    page: number = 1,
    size: number = 20,
    search: string = ''
  ): Observable<ManufacturerModelResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ManufacturerModelResponse>(
      `${this.apiUrl}/manufacturer-model-combinations`,
      { params }
    );
  }

  getVehicleDetails(
    models: string,
    page: number = 1,
    size: number = 20,
    filters?: {
      manufacturer?: string;
      model?: string;
      yearMin?: number;
      yearMax?: number;
      bodyClass?: string;
      dataSource?: string;
    },
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Observable<VehicleDetailsResponse> {
    let params = new HttpParams()
      .set('models', models)
      .set('page', page.toString())
      .set('size', size.toString());

    // Add filter parameters if provided
    if (filters) {
      if (filters.manufacturer) {
        params = params.set('manufacturer', filters.manufacturer);
      }
      if (filters.model) {
        params = params.set('model', filters.model);
      }
      if (filters.yearMin !== undefined) {
        params = params.set('yearMin', filters.yearMin.toString());
      }
      if (filters.yearMax !== undefined) {
        params = params.set('yearMax', filters.yearMax.toString());
      }
      if (filters.bodyClass) {
        params = params.set('bodyClass', filters.bodyClass);
      }
      if (filters.dataSource) {
        params = params.set('dataSource', filters.dataSource);
      }
    }

    // Add sort parameters if provided
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    if (sortOrder) {
      params = params.set('sortOrder', sortOrder);
    }

    return this.http.get<VehicleDetailsResponse>(
      `${this.apiUrl}/vehicles/details`,
      { params }
    );
  }

  getVehicleInstances(
    vehicleId: string,
    count: number = 8
  ): Observable<VehicleInstancesResponse> {
    let params = new HttpParams().set('count', count.toString());

    return this.http.get<VehicleInstancesResponse>(
      `${this.apiUrl}/vehicles/${vehicleId}/instances`,
      { params }
    );
  }

  // ========== FILTER ENDPOINTS ==========

  /**
   * Unified filter options endpoint
   * @param fieldName - 'manufacturers', 'models', 'body-classes', 'data-sources', or 'year-range'
   * @param search - Optional search term for filtering (currently supported for manufacturers)
   * @param limit - Optional limit for number of results (default: 1000)
   * @returns Observable with field-specific response format
   */
  getFilterOptions(fieldName: string, search?: string, limit?: number): Observable<any> {
    let params = new HttpParams();

    if (search) {
      params = params.set('search', search);
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<any>(
      `${this.apiUrl}/filters/${fieldName}`,
      { params: params }
    );
  }

  /**
   * Convenience method: Get distinct manufacturers
   * @param search - Optional search term for filtering manufacturers
   * @param limit - Optional limit for number of results (default: 1000)
   */
  getDistinctManufacturers(search?: string, limit?: number): Observable<{ manufacturers: string[] }> {
    return this.getFilterOptions('manufacturers', search, limit);
  }

  /**
   * Convenience method: Get distinct models
   */
  getDistinctModels(): Observable<{ models: string[] }> {
    return this.getFilterOptions('models');
  }

  /**
   * Convenience method: Get distinct body classes
   */
  getDistinctBodyClasses(): Observable<{ body_classes: string[] }> {
    return this.getFilterOptions('body-classes');
  }

  /**
   * Convenience method: Get distinct data sources
   */
  getDistinctDataSources(): Observable<{ data_sources: string[] }> {
    return this.getFilterOptions('data-sources');
  }

  /**
   * Convenience method: Get year range
   */
  getYearRange(): Observable<{ min: number; max: number }> {
    return this.getFilterOptions('year-range');
  }
}
