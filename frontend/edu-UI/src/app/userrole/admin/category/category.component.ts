import { Component, OnInit, AfterViewInit, ViewChild,ElementRef, TemplateRef, ViewContainerRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router , RouterModule} from '@angular/router';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule } from '@angular/forms';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { ConfirmService } from 'src/app/shared/services/confirm.service';
import { notify } from 'src/app/shared/global-notify';
import { API_BASE } from 'src/app/shared/api.config';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { TemplatePortal } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';

@Component({
  selector: 'app-category',
  standalone: true,
  // imports: [CommonModule, SharedModule, FormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTableModule, MatSelectModule, MatSlideToggleModule, MatSortModule, HttpClientModule],
  imports: [CommonModule, SharedModule, FormsModule, MatPaginatorModule, HttpClientModule, RouterModule, MatTableModule, MatIconModule, MatSortModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatSlideToggleModule, MatButtonModule, MatCheckboxModule, MatTabsModule, OverlayModule, PortalModule],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit, AfterViewInit {
  filter = '';
  name = '';
  description = '';
  // filters
  filterName = '';
  selectedCategory: any = null;
  editing = false;
  selectedInstitute: string | null = null;
  selectedDepartments: string[] = [];
  selectedTeams: string[] = [];
  // additional filters
  filterCreationDateAfter: Date | null = null;
  filterCreationDate: Date | null = null;
  filterActiveStatus: boolean | null = null;
  // checkbox filters
  filterCreatedByMe: boolean = false; // if true, only categories created by current user
  filterPublicAccess: boolean | null = null; // tri-state: null = any, true = public, false = restricted
  // role
  isSuperAdmin: boolean = false;

  institutes: Array<{ institute_id: string; short_name: string }> = [];
  departments: Array<{ id: string; name: string }> = [];
  teams: Array<{ id: string; name: string }> = [];

  categories: Array<{ id: string; name: string; description?: string; institute?: any; departments?: any[]; teams?: any[] }> = [];
  dataSource = new MatTableDataSource<any>([]);
  columns = ['name','description','evaluation','active','actions'];

  private filtersOverlayRef: OverlayRef | null = null;
  constructor(private http: HttpClient, private router: Router, private loader: LoaderService, private pageMeta: PageMetaService, private overlay: Overlay, private vcr: ViewContainerRef, private confirmService: ConfirmService) {}

  ngOnInit(): void {

    this.pageMeta.setMeta('Categories', 'View and manage question bank categories');

    // try to auto-select institute based on logged-in user
    try {
      const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
      if (raw) {
        const obj = JSON.parse(raw);
        // detect super admin role
        const role = obj?.role || obj?.user_role || obj?.role_name || '';
        this.isSuperAdmin = (String(role) === 'super_admin' || String(role) === 'super-admin');
        // if user belongs to an institute, pre-select it
        const iid = obj?.institute_id || obj?.instituteId || obj?.institute || null;
        if (iid) {
          this.selectedInstitute = iid;
        }
      }
    } catch (e) { /* ignore */ }
    this.loadFilterLists();
    // if an institute was auto-selected, load its departments/teams and fetch categories scoped
    if (this.selectedInstitute) {
      this.onInstituteChange(this.selectedInstitute);
    }
    this.fetchCategories();
  }

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  refresh(){
    this.fetchCategories();
  }

  addCategory(){
    const title = (this.name||'').trim();
    if (!title) return;
    const id = Date.now().toString();
    this.categories.unshift({ id, name: title, description: (this.description||'').trim() });
    this.dataSource.data = this.categories;
    this.name = '';
    this.description = '';
  }

  openFiltersOverlay(){
    if(!this.filtersBtn) return;
    if(this.filtersOverlayRef){ try{ this.filtersOverlayRef.dispose(); }catch(e){}; this.filtersOverlayRef = null; }

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.filtersBtn)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }
      ])
      .withPush(true);

    this.filtersOverlayRef = this.overlay.create({ positionStrategy, hasBackdrop: true, backdropClass: 'cdk-overlay-transparent-backdrop', scrollStrategy: this.overlay.scrollStrategies.reposition() });
    this.filtersOverlayRef.backdropClick().subscribe(() => this.closeFiltersOverlay());
    this.filtersOverlayRef.keydownEvents().subscribe((ev:any) => { if(ev.key === 'Escape') this.closeFiltersOverlay(); });

    const portal = new TemplatePortal(this.filtersPanelTpl, this.vcr);
    this.filtersOverlayRef.attach(portal);
  }
  closeFiltersOverlay(){ if(this.filtersOverlayRef){ try{ this.filtersOverlayRef.dispose(); }catch(e){}; this.filtersOverlayRef = null; } }

  applyFilter(value: any) {
    const q = (value || '').trim().toLowerCase();
    this.filter = q;
    // this.dataSource.filterPredicate = (d: categories, filter: string) => {
    //   return (d.name || '').toLowerCase().includes(filter) || (d.description || '').toLowerCase().includes(filter);
    // };
    this.dataSource.filter = q;
  }
  deleteCategory(c: any){
    const id = c.category_id || c.id;
    if (!id) return;
    this.confirmService.confirm({ title: 'Delete Category', message: `Delete category ${c.name}? This action cannot be undone.`, confirmText: 'Delete', cancelText: 'Cancel' }).subscribe(ok => {
      if (!ok) return;
      // optimistic remove
      const prev = [...this.categories];
      this.categories = this.categories.filter(x => x.id !== c.id);
      this.dataSource.data = this.categories;
      const url = `${API_BASE}/category/${encodeURIComponent(String(id))}/manage`;
      // call backend generic manage route (category/delete)
      this.http.put<any>(`${API_BASE}/category/delete/${encodeURIComponent(String(id))}`, { current_user: sessionStorage.getItem('user_profile') || sessionStorage.getItem('user') || '' }).subscribe({
        next: (res) => { try { notify('Category deleted', 'success'); } catch(e) {} },
        error: (err) => { console.error('Failed deleting category', err); try { notify('Failed to delete category', 'error'); } catch(e) {}; this.categories = prev; this.dataSource.data = this.categories; }
      });
    });
  }

  setName(v: string){ this.name = v || ''; }
  setDescription(v: string){ this.description = v || ''; }

  // load initial lists for institute/department/team filters (best-effort endpoints)
  loadFilterLists(){
    // try to load institutes, departments, teams if endpoints available
    this.http.get<any>(`${API_BASE}/get-institute-list`).subscribe({ next: (res) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.institutes = (data || []).map((i: any) => ({ institute_id: i.institute_id || i.id || i.instituteId || null, short_name: i.short_name || i.name || i.institute_name || '' }));
      }, error: () => {} });

    // load unscoped departments/teams as fallback
    this.http.get<any>(`${API_BASE}/get-department-list`).subscribe({ next: (res) => { const data = Array.isArray(res) ? res : (res?.data || []); this.departments = (data || []).map((d:any)=> ({ id: d.dept_id || d.id || d.deptId, name: d.name })); }, error: () => {} });
    this.http.get<any>(`${API_BASE}/get-teams-list`).subscribe({ next: (res) => { const data = Array.isArray(res) ? res : (res?.data || []); this.teams = (data || []).map((t:any)=> ({ id: t.team_id || t.id || t.teamId, name: t.name })); }, error: () => {} });
  }

  onInstituteChange(iid: any) {
    // called when institute selection changes; fetch departments and teams scoped to institute
    if (!iid) {
      this.departments = [];
      this.teams = [];
      return;
    }
    // departments
    this.http.get<any>(`${API_BASE}/get-department-list`, { params: { institute_id: iid } }).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.departments = (data || []).map((d:any)=> ({ id: d.dept_id || d.id || d.deptId, name: d.name }));
      }, error: () => { this.departments = []; }
    });
    // teams
    this.http.get<any>(`${API_BASE}/get-teams-list`, { params: { institute_id: iid } }).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.teams = (data || []).map((t:any)=> ({ id: t.team_id || t.id || t.teamId, name: t.name }));
      }, error: () => { this.teams = []; }
    });
  }

  // fetch categories, optionally with current filter values
  fetchCategories(){
    this.loader.show();
    let params = new HttpParams();
    if (this.filterName) params = params.set('name', this.filterName);
    if (this.selectedInstitute) params = params.set('institute', this.selectedInstitute);
    if (this.selectedDepartments && this.selectedDepartments.length) params = params.set('departments', this.selectedDepartments.join(','));
    if (this.selectedTeams && this.selectedTeams.length) params = params.set('teams', this.selectedTeams.join(','));
    // optional date filters
    if (this.filterCreationDateAfter) {
      try { params = params.set('created_after', (this.filterCreationDateAfter as Date).toISOString().slice(0,10)); } catch(e){}
    }
    if (this.filterCreationDate) {
      try { params = params.set('created_before', (this.filterCreationDate as Date).toISOString().slice(0,10)); } catch(e){}
    }
    if (this.filterActiveStatus !== null && typeof this.filterActiveStatus !== 'undefined') {
      params = params.set('active_status', String(this.filterActiveStatus));
    }
    // created-by-me filter (boolean flag)
    if (this.filterCreatedByMe) {
      // Assign current login user's user_id for created_by filter
      try {
        const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
        if (raw) {
          const obj = JSON.parse(raw);
          const userId = obj?.user_id || obj?.id || obj?._id;
          if (userId) {
        params = params.set('created_by', String(userId));
          }
        }
      } catch (e) {}
    }
    // public access checkbox — when true/false filter explicitly; when null, don't add param
    if (this.filterPublicAccess !== null && typeof this.filterPublicAccess !== 'undefined') {
      params = params.set('public_access', String(this.filterPublicAccess));
    }

  this.http.get<any>(`${API_BASE}/category-details`, { params }).subscribe({
      next: (res) => {
        // response may be array or {data: array}
        const items = Array.isArray(res) ? res : (res?.data || []);
        // normalize items
        this.categories = items.map((it: any, idx: number) => ({
          category_id: it.category_id || it.id || it._id || String(idx),
          id: it.category_id || it.id || it._id || String(idx),
          name: it.name || it.category_name || '',
          description: it.description || '',
          answer_by: it.answer_by || '',
          type: it.type || '',
          evaluation: it.evaluation || '',
          mark_each_question: (typeof it.mark_each_question !== 'undefined') ? it.mark_each_question : (it.mark_for_each_question ?? null),
          active_status: typeof it.active_status !== 'undefined' ? it.active_status : (it.active ?? false),
          active: typeof it.active_status !== 'undefined' ? it.active_status : (it.active ?? false),
          public_access: typeof it.public_access !== 'undefined' ? it.public_access : (it.public ?? false),
          institute: (it.institute && typeof it.institute === 'object')
            ? {
          institute_id: it.institute.institute_id || it.institute.id || null,
          institute_name: it.institute.institute_name || it.institute.name || null
              }
            : (typeof it.institute === 'string' ? { institute_id: null, institute_name: it.institute } : (it.institute || null)),
          // normalize departments/teams to arrays (handles {} or arrays)
          departments: this.iterableList(it.departments || it.department_ids),
          teams: this.iterableList(it.teams || it.team_ids),
          created_by: it.created_by,
          updated_by: it.updated_by,
          created_date: it.created_date,
          updated_date: it.updated_date,
          // keep full raw item for reference if needed
          raw: it
        }));
        this.loader.hide();
        this.dataSource.data = this.categories;

      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.categories = []; 
        this.dataSource.data = this.categories;
      },
      complete: () => {
        this.loader.hide();
      }

    });
  }

  onApply(){
    this.fetchCategories();
  }

  onReset(){
    this.filterName = '';
    // this.selectedInstitute = null;
    this.selectedDepartments = [];
    this.selectedTeams = [];
    this.filterCreationDateAfter = null;
    this.filterCreationDate = null;
    this.filterActiveStatus = null;
    this.filterCreatedByMe = false;
    this.filterPublicAccess = null;
    this.fetchCategories();
  }

  // toggle active state locally and try to persist to server (best-effort)
  toggleActive(element: any){
    const newState = !element.active;
    const action = newState ? 'activate' : 'deactivate';
    this.confirmService.confirm({ title: `${action[0].toUpperCase()+action.slice(1)} Category`, message: `${action[0].toUpperCase()+action.slice(1)} category ${element.name}?`, confirmText: action[0].toUpperCase()+action.slice(1), cancelText: 'Cancel' }).subscribe(ok => {
      if (!ok) return;
      const prev = element.active;
      element.active = newState;
      element.active_status = newState;
      const id = element.category_id || element.id;
      if (!id) { element.active = prev; return; }
      const url = `${API_BASE}/category/${action}/${encodeURIComponent(String(id))}`;
      this.http.put<any>(url, { current_user: sessionStorage.getItem('user_profile') || sessionStorage.getItem('user') || '' }).subscribe({
        next: () => { try { notify(`Category ${action}d`, 'success'); } catch(e) {} },
        error: (err) => { console.error('Failed updating category state', err); try { notify('Failed to update category status', 'error'); } catch(e) {} ; element.active = prev; element.active_status = prev; }
      });
    });
  }

  viewDetails(element: any){
    const id = element.category_id || element.id;
    if (!id) return;
    this.selectedCategory = element;
  }

  EditCategory(element: any){
    try{ sessionStorage.setItem('edit_category', JSON.stringify(element)); }catch(e){}
    // navigate to create page where the form will load edit data
    this.router.navigate(['/category/create']);
  }

  closeModal(){
    this.selectedCategory = null;
    this.editing = false;
  }

  // utility used by template: return numeric length for arrays or object keys
  keysLength(v: any): number {
    if (!v) return 0;
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'object') return Object.keys(v).length;
    return 0;
  }

  // helper to normalize iterable departments/teams for *ngFor if backend sometimes returns an object
  iterableList(v: any): any[] {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'object') return Object.keys(v).map(k => v[k]);
    return [];
  }
}
