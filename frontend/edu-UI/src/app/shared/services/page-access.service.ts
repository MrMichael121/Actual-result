import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { API_BASE } from '../api.config';

export interface PageAccessRow {
  page_id: string;
  page_name: string;
  can_add: number;
  can_edit: number;
  can_view: number;
  can_delete: number;
}

@Injectable({ providedIn: 'root' })
export class PageAccessService {
  // cache stores a shared Observable so multiple callers reuse the same in-flight request
  private cache = new Map<string, Observable<PageAccessRow[]>>();

  constructor(private http: HttpClient) {}

  // fetch for a given user id (or use current user id)
  fetchForUser(userId: string): Observable<PageAccessRow[]> {
    if (!userId) {
     console.warn('[PageAccessService] No userId provided for fetchForUser');
      return of([]);
    }

    // If there's already a cached observable (or completed result wrapped as observable), return it
    if (this.cache.has(userId)) {
      console.debug('[PageAccessService] Returning cached observable for user:', userId);
      return this.cache.get(userId)!;
    }

    const url = `${API_BASE}/get-user-page-access/${userId}`;
    console.debug('[PageAccessService] Fetching page access from API:', url);

    const req$ = this.http.get<any>(url).pipe(
      map(res => {
        console.debug('[PageAccessService] API response:', res);
        return res && res.data ? res.data as PageAccessRow[] : [];
      }),
      catchError(err => {
        console.error('[PageAccessService] Failed to fetch page access:', err);
        return of([]);
      }),
      // shareReplay ensures multiple subscribers share the same in-flight HTTP request
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // store the shared observable immediately so concurrent callers get the same request
    this.cache.set(userId, req$);

    return req$;
  }

  // convenience: check access by page name
  hasPermission(userId: string, pageName: string, action: 'view'|'add'|'edit'|'delete'): Observable<boolean> {
    return this.fetchForUser(userId).pipe(
      map(rows => {
        const r = rows.find(x => x.page_name && x.page_name.toLowerCase() === (pageName || '').toLowerCase());
        if (!r) return false;
        console.debug('[PageAccessService] Checking permission for page:', pageName, 'action:', action);
        console.debug('[PageAccessService] Available rows:', rows);
        switch (action) {
          case 'add': return !!r.can_add;
          case 'edit': return !!r.can_edit;
          case 'delete': return !!r.can_delete;
          default: return !!r.can_view;
        }
      })
    );
  }

  // optional: clear cache for a user
  clearCache(userId: string) {
    this.cache.delete(userId);
  }
}
