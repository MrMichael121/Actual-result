import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HomeService {
  getWelcomeMessage() {
    return 'Welcome from HomeService';
  }
}
