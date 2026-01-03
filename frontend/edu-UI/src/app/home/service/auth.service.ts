import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { API_BASE } from 'src/app/shared/api.config';
import { PageAccessService } from 'src/app/shared/services/page-access.service';

interface LoginResponse {
  status?: boolean | string;
  statusMessage?: string;
  token?: string;
  user?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _logged = new BehaviorSubject<boolean>(false);
  readonly isLoggedIn$ = this._logged.asObservable();
  get isLoggedIn() { return this._logged.value; }

  private _user = new BehaviorSubject<any | null>(null);
  readonly user$ = this._user.asObservable();

  // synchronous accessor for current user value
  get currentUserValue() { return this._user.value; }

  constructor(private http: HttpClient, private pageAccess: PageAccessService) {
    // Initialize from sessionStorage if available
    try {
      const raw = sessionStorage.getItem('user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // normalize user shape so other code can rely on `id`
          if (parsed && !parsed.id && parsed.user_id) parsed.id = parsed.user_id;
          this._user.next(parsed);
          this._logged.next(sessionStorage.getItem('isLogin') === 'true');
          // preload page access for persisted user (use normalized id)
          try {
            const uid = parsed && (parsed.id || parsed.user_id || parsed.userId);
            if (uid) {
              console.debug('[AuthService] constructor preloading page access for userId:', uid);
              this.pageAccess.fetchForUser(uid.toString()).subscribe(rows => console.debug('[AuthService] constructor fetched page access rows:', rows));
            }
          } catch (e) {}
        } catch (e) {
          // if parsing fails, fallback to raw user value
          this._user.next(JSON.parse(raw));
          this._logged.next(sessionStorage.getItem('isLogin') === 'true');
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async login(email: string, password: string): Promise<boolean> {
  const url = `${API_BASE}/login`;
    try {
      const resp = await firstValueFrom(this.http.post<LoginResponse>(url, { email, password }));
      // treat presence of token or status true/success as success
      const ok = !!(resp && (resp.token || resp.status === true || resp.status === 'success' || resp.status === 'true'));
      this._logged.next(ok);
      if (ok) {
        try {
            if (resp.token) sessionStorage.setItem('token', resp.token);
            if (resp.user) {
            // normalize incoming user object: ensure `id` exists for compatibility
            try {
              const u = { ...resp.user } as any;
              if (!u.id && (u.user_id || u.userId)) u.id = u.user_id || u.userId;
              sessionStorage.setItem('user', JSON.stringify(u));
              this._user.next(u);
              // also set username for legacy components
              if (u.name) sessionStorage.setItem('username', u.name);
              if (u.role) sessionStorage.setItem('userRole', u.role);
              if (u.institute) sessionStorage.setItem('institute', u.institute);
              if (u.institute_id) sessionStorage.setItem('institute_id', u.institute_id.toString());
            } catch (e) {
              sessionStorage.setItem('user', JSON.stringify(resp.user));
              this._user.next(resp.user);
            }
            }
            // fetch page access immediately for the logged in user
            try {
              // use the normalized user object from _user (ensures `id` present)
              const current = this._user.value;
              const uid = current && (current.id || current.user_id || current.userId);
              if (uid) {
                console.debug('[AuthService] Fetching page access for userId (post-login):', uid);
                this.pageAccess.fetchForUser(uid.toString()).subscribe(rows => {
                  console.debug('[AuthService] Fetched page access rows (post-login):', rows);
                });
              }
            } catch (e) {}
        } catch (e) {
          // ignore storage errors
        }
      }
      return ok;
    } catch (err) {
      this._logged.next(false);
      this._user.next(null);
      return false;
    }
  }

  logout() {
    this._logged.next(false);
    this._user.next(null);
    try {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('isLogin');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('institute');
      // clear page access cache for current user
      try {
        const raw = sessionStorage.getItem('user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const uid = parsed && (parsed.id || parsed.user_id || parsed.userId);
          if (uid) this.pageAccess.clearCache(uid.toString());
        }
      } catch (e) {}
    } catch (e) {}
  }
}
