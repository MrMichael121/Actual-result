import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, HostListener } from '@angular/core';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../home/service/auth.service';
import { Router, NavigationEnd ,RouterModule} from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { API_BASE } from 'src/app/shared/api.config';
import { PageMetaService } from '../../services/page-meta.service';

@Component({
  selector: 'app-navbar-main',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatDialogModule, MatSnackBarModule, MatButtonModule, HttpClientModule],
  templateUrl: './navbar-main.component.html',
  styleUrls: ['./navbar-main.component.scss']
})
export class NavbarMainComponent implements OnInit, OnDestroy {
  @ViewChild('logoutConfirmationDialog') logoutConfirmationDialog!: TemplateRef<any>;
  showProfileDropdown: boolean = false; // Profile dropdown visibility
  isLogin = false;
  moduleName: string = '';
  moduleData: string = '';

  instituteShortName = (() => {
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.institute_short_name || '';
      }
      return '';
    } catch (e) {
      return '';
    }
  })();

  private routerSubscription: Subscription;
  private authSubscription?: Subscription;
  private userSubscription?: Subscription;
  private pageMetaSubscription?: Subscription;

  username = sessionStorage.getItem('username') || 'Guest'; // Default to 'Guest' if username is not set
  userRole = sessionStorage.getItem('userRole') || 'unknown user role'; // Default to 'unknown user role' if not set
  displayName = this.username;
  displayInstitute = sessionStorage.getItem('institute') || '';
  userObj: any = null;
  initials = this.username ? this.username.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase() : 'G';

  constructor(
    public router: Router,
    private authService: AuthService,
    private pageMeta: PageMetaService,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private http: HttpClient
  ) {
    // subscribe to page meta service for dynamic module title/subtitle
    this.pageMetaSubscription = this.pageMeta.getMetaObservable().subscribe(m => {
      this.moduleName = m.title || '';
      this.moduleData = m.subtitle || '';
    });
    // subscribe to auth state so navbar updates immediately on login/logout
    this.authSubscription = this.authService.isLoggedIn$.subscribe(v => this.isLogin = !!v);
    this.userSubscription = this.authService.user$.subscribe(u => {
      if (u) {
        this.userObj = u;
        this.displayName = u.name || sessionStorage.getItem('username') || 'Guest';
        this.displayInstitute = u.institute || sessionStorage.getItem('institute') || '';
        this.instituteShortName = u.institute_short_name || this.instituteShortName;
        this.userRole = u.role || this.userRole;
        this.initials = (this.displayName || 'G').split(' ').map((s: string) => s[0]).slice(0,2).join('').toUpperCase();
      } else {
        this.displayName = sessionStorage.getItem('username') || 'Guest';
        this.displayInstitute = sessionStorage.getItem('institute') || '';
        this.initials = (this.displayName || 'G').split(' ').map((s: string) => s[0]).slice(0,2).join('').toUpperCase();
      }
    });

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // keep route-change behaviour (close dropdown etc.)
        this.showProfileDropdown = false;
      });
  }

  ngOnInit(): void { }

  openMenu(event: MouseEvent): void {
    event.stopPropagation(); // Prevent closing the menu immediately
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  // Close menu if click happens outside of it
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close the menu if clicked outside
    if (this.showProfileDropdown) {
      this.showProfileDropdown = false;
    }
  }

  private updateLoginStatus(): void {
    // kept for compatibility; primary source of truth is AuthService
    this.isLogin = this.authService.isLoggedIn;
  }

  confirmLogout() {
    this.dialog.open(this.logoutConfirmationDialog, { width: '420px', panelClass: 'logout-dialog-panel' });
  }

  logout(): void {
    const url = `${API_BASE}/logout`;
    // include token and user id from sessionStorage if available
    const payload: any = {};
    const token = sessionStorage.getItem('token');
    // parse user and attach user_id to payload if present
    let userId: any = null;
    // explicit saved key (some flows may write user_id separately)
    try { userId = sessionStorage.getItem('user_id') || null; } catch (e) { userId = null; }
    try {
      const rawUser = sessionStorage.getItem('user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        // try a list of common id keys used by different backends
        const idKeys = ['id', 'user_id', 'userId', 'userid', '_id', 'uid'];
        for (const k of idKeys) {
          if (!userId && u && (u[k] !== undefined && u[k] !== null)) {
            userId = u[k];
            break;
          }
        }
      }
    } catch (e) { /* ignore parse errors */ }

    // fallback: use username if no numeric id is available (server may accept this)
    if (!userId) {
      try { userId = sessionStorage.getItem('username') || null; } catch (e) { userId = null; }
    }

    if (userId) payload.user_id = userId;
    else console.warn('NavbarMainComponent.logout: user_id not found in sessionStorage; sending logout without user_id');

    // prepare headers: include Authorization only when token is present
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    this.http.post(url, payload, { headers, observe: 'response' }).subscribe({
      next: (res) => {
        // clear client session via AuthService so all subscribers update
        try { this.authService.logout(); } catch (e) { try { sessionStorage.clear(); } catch (e) {} }
        this.dialog.closeAll();
        this._snackBar.open('You have been logged out', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      },
      error: (err) => {
        // Even if server logout failed, clear local session and notify user
        try { this.authService.logout(); } catch (e) { try { sessionStorage.clear(); } catch (e) {} }
        this.dialog.closeAll();
        this._snackBar.open('Logout completed locally (server not reachable).', 'Close', { duration: 4000 });
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.userSubscription) this.userSubscription.unsubscribe();
    if (this.pageMetaSubscription) this.pageMetaSubscription.unsubscribe();
  }
}
