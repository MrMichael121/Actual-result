import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PageMeta {
  title: string;
  subtitle?: string;
}

@Injectable({ providedIn: 'root' })
export class PageMetaService {
  private meta$ = new BehaviorSubject<PageMeta>({ title: '', subtitle: '' });

  setMeta(title: string, subtitle?: string) {
    this.meta$.next({ title, subtitle: subtitle || '' });
  }

  clear() {
    this.meta$.next({ title: '', subtitle: '' });
  }

  getMetaObservable() {
    return this.meta$.asObservable();
  }
}
