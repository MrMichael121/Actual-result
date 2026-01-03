import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PageAccessService } from '../services/page-access.service';
import { AuthService } from 'src/app/home/service/auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private pageAccess: PageAccessService,
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const pageName = (route.data && (route.data as any)['pageName']) || (route.data && (route.data as any)['page']) || '';
    const action = (route.data && (route.data as any)['action']) || 'view';
    // optional role-based access: route.data.requiredRole can be string or array of strings
    const requiredRole = (route.data && (route.data as any)['requiredRole']) || null;
    const user = (this.auth as any).currentUserValue || null;
    if (!user) return of(this.router.createUrlTree(['/login']));
    // if requiredRole is specified, check user's role first
    if (requiredRole) {
      const userRole = (user.role || user.user_role || '').toString().toLowerCase();
      const allowed = Array.isArray(requiredRole) ? requiredRole.map((r: any) => String(r).toLowerCase()) : [String(requiredRole).toLowerCase()];
      if (!allowed.includes(userRole)) {
        return of(this.router.createUrlTree(['/unauthorized']));
      }
      // role matches — grant access immediately (role-based routes bypass page-permission checks)
      return of(true);
    }
    const userId = user.id || user.user_id || user.userId || null;
    if (!userId) return of(this.router.createUrlTree(['/login']));

    return this.pageAccess.hasPermission(userId.toString(), pageName, action).pipe(
      map((has: boolean) => has ? true : this.router.createUrlTree(['/unauthorized'])),
      catchError(() => of(this.router.createUrlTree(['/unauthorized'])))
    );
  }
}
