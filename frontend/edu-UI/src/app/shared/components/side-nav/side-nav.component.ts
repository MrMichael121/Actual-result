import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../home/service/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DirectivesModule } from 'src/app/shared/directives/directives.module';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, DirectivesModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
// export class SideNavComponent { }
export class SideNavComponent implements OnInit, OnDestroy {
  @HostBinding('class.collapsed') get hostCollapsed() { return this.collapsed }
  // class bindings are handled in the template; no HostBinding needed
  isLogin = false;
  userRole: string | null = null;
  userName = sessionStorage.getItem('username') || '';
  userInstitute: string | null = sessionStorage.getItem('userInstitute') || '';
  menus: Array<{ label: string, path: string, icon?: string }> = [];
  collapsed = false;
  private routerSubscription: Subscription;
  private authSubscription?: Subscription;
  private userSubscription?: Subscription;
  constructor(
    public router: Router,
    private authService: AuthService,
    //     private _snackBar: MatSnackBar,
    //     public dialog: MatDialog
  ) {
    // Check login status initially
    // Subscribe to AuthService so UI responds immediately to login/logout
    this.authSubscription = this.authService.isLoggedIn$.subscribe(v => {
      this.isLogin = !!v;
      this.setupMenus();
    });
    this.userSubscription = this.authService.user$.subscribe(u => {
      if (u) {
        this.userRole = u.role || this.userRole;
        this.userName = u.name || this.userName;
        this.userInstitute = u.institute_name || u.institute || this.userInstitute || '';
      } else {
        this.userRole = sessionStorage.getItem('userRole');
        this.userName = sessionStorage.getItem('username') || '';
      }
      this.setupMenus();
    });

    // Subscribe to router events to check login status after navigation
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // keep previous route-change based checks
        this.setupMenus();
      });
  }

  ngOnInit(): void {
    // No need for redirects here as the router will handle it
  }

  toggleCollapse() { this.collapsed = !this.collapsed; this.updateParentSidenavClass(); }
  
  private updateParentSidenavClass() {
    try {
      const parent = document.querySelector('.app-sidenav');
      if (parent) {
        if (this.collapsed) parent.classList.add('sidenav-collapsed'); else parent.classList.remove('sidenav-collapsed');
      }
    } catch (e) { /* no-op */ }
  }



  // Method to update login status from sessionStorage
  // legacy method kept but primary sources are AuthService observables
  private updateLoginStatus(): void {
    const loginStatus = sessionStorage.getItem('isLogin');
    this.isLogin = loginStatus === 'true';
    const raw = sessionStorage.getItem('user');
    if (raw) {
      try { this.userRole = JSON.parse(raw).role; } catch (e) { this.userRole = sessionStorage.getItem('userRole'); }
    } else {
      this.userRole = sessionStorage.getItem('userRole');
    }
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      this.userInstitute = parsed?.institute_name || parsed?.institute || sessionStorage.getItem('userInstitute') || '';
    } catch(e) { this.userInstitute = sessionStorage.getItem('userInstitute') || ''; }
    this.setupMenus();
  }

  private setupMenus() {
    // default empty
    this.menus = [];
    if (!this.isLogin) return;

    const role = (this.userRole || '').toLowerCase();
    if (role === 'super_admin' || role === 'super-admin') {
      this.menus.push({ label: 'Super Admin Dashboard', path: '/super-admin-dashboard', icon: 'dashboard' });
      this.menus.push({ label: 'Institutes', path: '/view-institutes', icon: 'apartment' });
    }

    if (role === 'admin' || role === 'super_admin' || role === 'super-admin') {
      // admin and super-admin may see admin tools
      this.menus.push({ label: 'Admin Dashboard', path: '/admin-dashboard', icon: 'dashboard' });
      this.menus.push({ label: 'Users', path: '/view-users', icon: 'people' });
      this.menus.push({ label: 'Categories', path: '/category', icon: 'category' });
      this.menus.push({ label: 'Questions', path: '/view-questions', icon: 'help_center' });
      this.menus.push({ label: 'Exams', path: '/exams', icon: 'assignment' });
      this.menus.push({ label: 'Schedule Exam', path: '/view-schedule-exam', icon: 'event' });
      this.menus.push({ label: 'Exam Reports', path: '/admin/exam-reports', icon: 'bar_chart' });
    }

    if (role === 'user' || role === 'candidate' || role === 'super_admin' || role === 'super-admin') {
      // typical user menus
      this.menus.push({ label: 'User Dashboard', path: '/user-dashboard', icon: 'dashboard' });
      this.menus.push({ label: 'Exam', path: '/user/exam', icon: 'play_circle' });
    }
  }


  ngOnDestroy(): void {
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.userSubscription) this.userSubscription.unsubscribe();
  }
}