import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ManufacturerModelResponse, VehicleDetailsResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get manufacturer-model combinations for picker
   * Maps to backend: GET /api/v1/manufacturer-model-combinations
   */
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

  /**
   * Get detailed vehicle records for selected manufacturer-model combinations
   * Maps to backend: GET /api/v1/vehicles/details
   * 
   * URL-first pattern: Constructs query parameter for shareable/bookmarkable URLs
   * Example: ?models=Ford:F-150,Chevrolet:Corvette
   * 
   * @param modelCombos - Array of {manufacturer, model} selections
   * @param page - Page number (1-indexed)
   * @param size - Results per page
   */
  getVehicleDetails(
    modelCombos: Array<{ manufacturer: string; model: string }>,
    page: number = 1,
    size: number = 20
  ): Observable<VehicleDetailsResponse> {
    // Construct models query parameter: "Manufacturer:Model,Manufacturer:Model"
    const modelsParam = modelCombos
      .map(combo => `${combo.manufacturer}:${combo.model}`)
      .join(',');

    let params = new HttpParams()
      .set('models', modelsParam)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<VehicleDetailsResponse>(
      `${this.apiUrl}/vehicles/details`,
      { params }
    );
  }
}