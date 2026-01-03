import { Injectable, NgZone } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { API_BASE } from '../api.config';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

// const API_BASE = (window as any)['API_BASE'] || '';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private listening = false;
  constructor(private dialog: MatDialog, private http: HttpClient, private router: Router, private ngZone: NgZone) {}

  startListening() {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener('sessionExpired', (ev: any) => {
      const msg = ev && ev.detail && ev.detail.message ? ev.detail.message : 'Your session has expired';
      // run dialog open inside Angular zone
      this.ngZone.run(() => this.promptExtendOrLogout(msg));
    });
  }

  private promptExtendOrLogout(message: string) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Session Expired',
        message: message + '\nWould you like to extend your session?',
        confirmText: 'Extend',
        cancelText: 'Logout'
      },
      disableClose: true
    });

    ref.afterClosed().pipe(first()).subscribe((ok: boolean) => {
      if (ok) {
        this.tryRefreshToken();
      } else {
        this.doLogout();
      }
    });
  }

  private tryRefreshToken() {
     const raw = sessionStorage.getItem('user');
     let userId = null;
     if (raw) {
     try { userId = JSON.parse(raw).user_id || JSON.parse(raw).userId || null; } catch(e) { userId = null; }
     }
     const url = `${API_BASE}/refresh-token`;
     const payload: any = {};
     if (userId) payload.user_id = userId;
        this.http.post<any>(url, payload).pipe(first()).subscribe({ next: (res) => {
      // Expecting { token, user } on success
      try {
        if (res && res.token) {
        sessionStorage.setItem('token', res.token);
        }
        if (res && res.user) {
        sessionStorage.setItem('user', JSON.stringify(res.user));
        }
      } catch (e) {}
      // Close any session-expired dialogs now that token was refreshed
      try { this.dialog.closeAll(); } catch (e) {}
      }, error: () => { try { this.dialog.closeAll(); } catch (e) {} ; this.doLogout(); } });
  }

  private doLogout() {
    // Attempt to notify backend about logout. If it fails (e.g. expired token), still clear client state.
    try {
      const raw = sessionStorage.getItem('user');
      let userId = null;
      if (raw) {
        try { userId = JSON.parse(raw).user_id || JSON.parse(raw).userId || null; } catch(e) { userId = null; }
      }
      const url = `${API_BASE}/logout`;
      const payload: any = {};
      if (userId) payload.user_id = userId;
      this.http.post<any>(url, payload).pipe(first()).subscribe({ next: () => {
        // ignore server response
      }, error: () => {
        // ignore errors; we'll still clear client-side session
      }, complete: () => {
        this.clearAndRedirect();
      }});
      // Safety: if the POST hangs, ensure we still clear after a short timeout
      setTimeout(() => this.clearAndRedirect(), 3000);
    } catch (e) {
      this.clearAndRedirect();
    }
  }

  private clearAndRedirect() {
    try {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('isLogin');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('institute');
      sessionStorage.removeItem('institute_id');
    } catch (e) {}
    try { this.router.navigate(['/login']); } catch (e) { try { window.location.href = '/login'; } catch (e) {} }
  }
}
