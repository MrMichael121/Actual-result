import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from './shared/shared.module';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './home/service/auth.service';
import { SessionService } from './shared/services/session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'edu-UI';
  isLoggedIn$: Observable<boolean>;

  constructor(private auth: AuthService, private sessionService: SessionService) {
    this.isLoggedIn$ = this.auth.isLoggedIn$;
    // start listening for session expiry events so the app can offer extend/logout
    this.sessionService.startListening();
  }
}
