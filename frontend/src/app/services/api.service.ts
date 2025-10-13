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
    size: number = 20
  ): Observable<VehicleDetailsResponse> {
    let params = new HttpParams()
      .set('models', models)
      .set('page', page.toString())
      .set('size', size.toString());

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
}
