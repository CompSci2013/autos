import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ManufacturerModelResponse } from '../models';

@Injectable({
  providedIn: 'root',
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
}
