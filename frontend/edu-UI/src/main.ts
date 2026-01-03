import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, inject } from '@angular/core';
import { AppComponent } from './app/app.component';
import { AppModule } from './app/app.module';

bootstrapApplication(AppComponent, {
  providers: [importProvidersFrom(AppModule)]
}).then(appRef => {
  try {
    const win: any = window as any;
    // expose injector so utility helpers can access Angular services
    const injector = (appRef as any)._injector || (appRef as any).injector || null;
    if (injector) win.__rootInjector = injector;
    // drain any queued notifications created before injector was ready
    try {
      const queue = win.__notifyQueue || [];
      if (queue && queue.length && injector) {
        import('@angular/material/snack-bar').then(mod => {
          try {
            const MatSnackBar = mod.MatSnackBar;
            const snack = injector.get(MatSnackBar);
            for (const item of queue) {
              try { clearTimeout(item.fallbackTimer); } catch(e){}
              const config: any = { duration: item.severity === 'error' ? 6000 : 4000, horizontalPosition: 'right', verticalPosition: 'bottom' };
              snack.open(item.message, 'Close', config);
            }
          } catch(e) { /* ignore */ }
        }).catch(e => { /* ignore import errors */ });
      }
      win.__notifyQueue = [];
    } catch(e) { /* ignore if material not available or errors during import */ }
  } catch (e) {}
}).catch(err => console.error(err));
