import { MatSnackBar } from '@angular/material/snack-bar';

export function notify(message: string, severity: 'info'|'success'|'error' = 'info') {
  try {
    const win: any = window as any;
    const injector = win && win.__rootInjector;
    if (!injector) {
      // If the Angular injector is not yet available (app still bootstrapping),
      // queue the notification so it can be displayed once bootstrap finishes.
      try {
        win.__notifyQueue = win.__notifyQueue || [];
          // store a timer so we can fallback to console if bootstrap never occurs
          const fallbackTimer = setTimeout(() => {
            try { console.warn('notify (fallback):', message); } catch (e) {}
          }, 2000);
          win.__notifyQueue.push({ message, severity, fallbackTimer });
      } catch (e) {
          try { console.warn('notify error:', message); } catch (e) {}
        }
        return;
    }
    const snack = injector.get(MatSnackBar) as MatSnackBar;
    const config: any = { duration: 4000, horizontalPosition: 'right', verticalPosition: 'bottom' };
    if (severity === 'error') config.duration = 6000;
    snack.open(message, 'Close', config);
  } catch (e) {
    try { console.warn('notify fatal error:', message); } catch (e) {}
  }
}
