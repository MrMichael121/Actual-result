import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { PageAccessService } from '../services/page-access.service';
import { AuthService } from '../../home/service/auth.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[hasAccess]'
})
export class HasAccessDirective implements OnInit, OnDestroy {
  @Input('hasAccess') pageName!: string;
  @Input('hasAccessAction') action: 'view'|'add'|'edit'|'delete' = 'view';
  // microsyntax desugaring creates an input name like 'hasAccessHasAccessAction'
  @Input('hasAccessHasAccessAction') set _microAction(v: any) {
    if (v) this.action = v as any;
  }

  private userId: string | null = null;
  private sub?: Subscription;

  constructor(
    private tpl: TemplateRef<any>,
    private vcr: ViewContainerRef,
    private pageAccess: PageAccessService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // react to authentication changes so directive works when user is set after login
    this.sub = this.auth.user$.subscribe(user => {
      this.userId = user && (user.id || user.user_id || user.userId) ? (user.id || user.user_id || user.userId) : null;
      console.debug('[HasAccessDirective] auth.user$ emitted userId:', this.userId, 'pageName:', this.pageName, 'action:', this.action);
      this.updateView();
    });
  }

  private updateView() {
    this.vcr.clear();
    if (!this.pageName || !this.userId) {
      return;
    }
    this.pageAccess.hasPermission(this.userId, this.pageName, this.action).subscribe(has => {
      console.debug('[HasAccessDirective] permission check:', { userId: this.userId, pageName: this.pageName, action: this.action, result: has });
      this.vcr.clear();
      if (has) this.vcr.createEmbeddedView(this.tpl);
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }
}
