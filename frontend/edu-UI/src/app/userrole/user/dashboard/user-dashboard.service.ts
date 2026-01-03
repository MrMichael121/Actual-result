import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from 'src/app/shared/api.config';
import { Observable, of } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class UserDashboardService {
  private apiBase = `${API_BASE}`;
  constructor(private http: HttpClient) {}

  getDashboard(userId: string | null): Observable<any>{
    const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return this.http.get<any>(`${this.apiBase}/user-dashboard${params}`);
  }

  getUsersList(): Observable<any>{
    // Deprecated simple endpoint; prefer get-users-list to support filtering
    return this.http.get<any>(`${this.apiBase}/dashboard/users`);
  }

  getUsersByInstitute(instituteId?: string | null): Observable<any>{
    const params = instituteId ? `?institute_id=${encodeURIComponent(instituteId)}` : '';
    return this.http.get<any>(`${this.apiBase}/get-users-list${params}`);
  }

  getInstitutes(): Observable<any>{
    return this.http.get<any>(`${this.apiBase}/institutes/list`);
  }

  getLoggedInUserId(): string | null{
    try{ const raw = sessionStorage.getItem('user'); if(!raw) return null; const u = JSON.parse(raw); return u?.user_id || u?.userId || u?.id || null; } catch(e){ return null; }
  }
}
