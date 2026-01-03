import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../service/auth.service';
import { NotificationService } from 'src/app/shared/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule
    ,MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  hide = true;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private notify: NotificationService) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { username, password } = this.loginForm.value;
    // call AuthService which posts to the backend
    this.auth.login(username, password).then((ok) => {
      console.debug('[LoginComponent] login resolved', ok);
      if (ok) {
        try { console.debug('[LoginComponent] sessionStorage user after login', sessionStorage.getItem('user')); } catch(e) {}
        // persist login state for components that read sessionStorage
        try {
          // if backend returns full user info and token in sessionStorage from AuthService or other, preserve it
          sessionStorage.setItem('isLogin', 'true');
          sessionStorage.setItem('username', username);
          // attempt to read full response saved by AuthService (some backends may set it); otherwise leave it for future
          // nothing to do here if AuthService doesn't return user object. If you later update AuthService to return user, write it here.
        } catch (e) {
          // ignore storage errors
        }
        // route based on role if available
        let role = '';
        try{ const raw = sessionStorage.getItem('user') || sessionStorage.getItem('user_profile'); const u = raw ? JSON.parse(raw) : null; role = u?.role || sessionStorage.getItem('userRole') || ''; }catch(e){}
        role = (role || '').toLowerCase();
        if (role === 'super-admin' || role === 'superadmin' || role === 'super_admin') {
          this.router.navigate(['/super-admin-dashboard']);
        } else if (role === 'admin') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigate(['/user-dashboard']);
        }
      } else {
        this.notify.error('Login failed. Please check your credentials.');
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
