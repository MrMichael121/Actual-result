import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError, of } from 'rxjs';
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // endpoints that should not receive Authorization header or be auto-redirected
    const skipAuthPaths = ['/login', '/refresh-token', '/public'];

    try {
      let token: string | null = null;
      try { token = sessionStorage.getItem('token'); } catch (e) { token = null; }

      const url = req.url || '';
      const shouldSkip = skipAuthPaths.some(p => url.includes(p));
      if (token && !req.headers.has('Authorization') && !shouldSkip) {
        console.debug('[AuthInterceptor] attaching token to request', url);
        req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      } else if (shouldSkip) {
        console.debug('[AuthInterceptor] skipping auth header for', url);
      } else {
        console.debug('[AuthInterceptor] no token available for', url);
      }
    } catch (e) {
      console.debug('[AuthInterceptor] error reading token', e);
    }

    return next.handle(req).pipe(
      tap((event: any) => {
        try {
          // some APIs return 200 with { status: false, statusMessage: 'Signature has expired' }
          const body = event && event.body ? event.body : null;
          if (body && (body.status === false || body.status === 'false')) {
            const msg = body.statusMessage || body.message || body.error || '';
          if (msg && /expire/i.test(msg)) {
            console.debug('[AuthInterceptor] detected expired token in 200 response:', msg);
            try {
              // Dispatch a sessionExpired event so the application can decide
              // whether to try a refresh/extend or to logout the user.
              window.dispatchEvent(new CustomEvent('sessionExpired', { detail: { message: msg || 'Session expired' } }));
            } catch (e) {}
          }
          }
        } catch (e) {}
      }),
      catchError((err: any) => {
        try {
          const status = err && (err.status || err.statusCode);
          const body = err && err.error ? err.error : err;
          const message = body && (body.statusMessage || body.message || body.error);

          // If token expired or invalid, clear session and redirect to login
          if (status === 401 || (message && /expire/i.test(message))) {
            try {
              // Notify the app that session expired — the app can then
              // prompt the user to extend the session or logout.
              window.dispatchEvent(new CustomEvent('sessionExpired', { detail: { message: message || 'Unauthorized - session expired' } }));
            } catch (e) {}
          }
          else {
            console.debug('[AuthInterceptor] non-auth error status:', status, 'message:', message);
          }
        } catch (e) {
          // ignore
        }
        return throwError(() => err);
      })
    );
  }
}
