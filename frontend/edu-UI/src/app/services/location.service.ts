import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { API_BASE } from 'src/app/shared/api.config';

export interface MasterItem { id: string; name: string; order?: number; active?: boolean }
export interface Country extends MasterItem {}
export interface State extends MasterItem { country_id: string }
export interface City extends MasterItem { state_id: string }

export interface LocationHierarchyResponse {
  statusMessage: string;
  status: boolean;
  data: {
    countries: Country[];
    states: State[];
    cities: City[];
  }
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private hierarchy$?: Observable<LocationHierarchyResponse['data']>;
  private readonly url = `${API_BASE}/location-hierarchy`;

  constructor(private http: HttpClient) {}

  getHierarchy(forceReload = false): Observable<LocationHierarchyResponse['data']> {
    if (!this.hierarchy$ || forceReload) {
      this.hierarchy$ = this.http.get<LocationHierarchyResponse>(this.url).pipe(
        map(r => r.data),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.hierarchy$;
  }

  getCountries(forceReload = false): Observable<Country[]> {
    return this.getHierarchy(forceReload).pipe(map(d => (d.countries || []).slice().sort((a,b) => (a.order||0) - (b.order||0))));
  }

  getStatesForCountry(countryId: string): Observable<State[]> {
    return this.getHierarchy().pipe(map(d => (d.states || []).filter(s => s.country_id === countryId).slice().sort((a,b) => (a.order||0) - (b.order||0))));
  }

  getCitiesForState(stateId: string): Observable<City[]> {
    return this.getHierarchy().pipe(map(d => (d.cities || []).filter(c => c.state_id === stateId).slice().sort((a,b) => (a.order||0) - (b.order||0))));
  }
}
