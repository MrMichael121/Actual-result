import { Component, OnInit, ViewChild, AfterViewInit,ElementRef, TemplateRef,ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_BASE } from 'src/app/shared/api.config';
import { Router } from '@angular/router';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { ConfirmService } from 'src/app/shared/services/confirm.service';
import { notify } from 'src/app/shared/global-notify';
import { AuthService } from 'src/app/home/service/auth.service';
import { Subscription } from 'rxjs';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { TemplatePortal } from '@angular/cdk/portal';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { SharedModule } from 'src/app/shared/shared.module';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  institute?: string;
  active: boolean;
  phone?: string;
  role?: string;
  raw?: any;
  department?: string;
  team?: string;
  privileges?: any[];
  user_privileges?: any[];
}

@Component({
  selector: 'app-view-users',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatSlideToggleModule, MatInputModule, MatTabsModule, MatFormFieldModule, MatSelectModule, FormsModule, RouterModule, HttpClientModule, MatPaginatorModule, MatSortModule,OverlayModule, PortalModule, SharedModule],
  templateUrl: './view-users.component.html',
  styleUrls: ['./view-users.component.scss']
})
export class ViewUsersComponent {
  // loading = false;
  // show full name, institute, role, department, team, active
  columns = ['name','institute','role','department','team','active','actions'];
  filter = '';
  selectedInstitute = '';
  users: UserRow[] = [];
  dataSource = new MatTableDataSource<UserRow>([]);
  rawRecords: any[] = [];

  // pagination
  pageSize = 25;
  pageIndex = 0; // zero-based index for MatPaginator
  totalCount = 0; // total records from API

  // filter model and lists (match fields in the filters panel)
  filters: any = { institute: '', name: '', department: '', team: '', joining_from: '', joining_to: '', active_status: '', country: '', city: '' };
  // institutes: Array<{ id: string; name: string }> = [];
  institutes: Array<{ short_name: string; institute_id?: string }> = [];
  countries: Array<{ code: string; name: string }> = [];
  states: Array<{ code: string; name: string }> = [];
  cities: Array<{ code: string; name: string }> = [];
  departments: Array<{ id: string; name: string }> = [];
  teams: Array<{ id: string; name: string }> = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;
  selectedUser: any = null;
  editing = false;
  editableUser: any = null;

  isSuperAdmin = false;
  private _subs: Subscription | null = null;
  constructor(private http: HttpClient, private router: Router, private loading: LoaderService, private auth: AuthService, private overlay: Overlay, private vcr: ViewContainerRef,private pageMeta: PageMetaService, private confirmService: ConfirmService) {
    // initialize isSuperAdmin from AuthService (synchronous helper)
    try {
      this.isSuperAdmin = !!this.auth.currentUserValue && ['super_admin', 'superadmin', 'super-admin'].includes((this.auth.currentUserValue.role || '').toLowerCase());
    } catch (e) { this.isSuperAdmin = false; }
    try {
      this._subs = this.auth.user$.subscribe((user: any) => {
        this.isSuperAdmin = !!user && ['super_admin', 'superadmin', 'super-admin'].includes((user.role || '').toLowerCase());
      });
    } catch (e) { /* ignore in tests */ }
  }

  ngOnDestroy(): void {
    try { this._subs?.unsubscribe(); } catch (e) { /* ignore */ }
  }
  private filtersOverlayRef: OverlayRef | null = null;
  ngOnInit(): void{

    this.pageMeta.setMeta('Users', 'Manage platform users');
    this.loadInstitutes();
    // this.loadCountries();
    // this.loadCities();

    try { } catch(e) {}
  }

  onInstituteChange(iid: string) {
    try {
      if (iid) {
        this.loadDepartments(iid);
        this.loadTeams(iid);
        // also reload users filtered to the institute
        this.loadUsers(iid);
      } else {
        this.departments = [];
        this.teams = [];
        this.loadUsers();
      }
    } catch (e) { }
  }

  // load departments for the selected institute
  loadDepartments(instituteId: string) {
    const url = `${API_BASE}/get-department-list`;
    this.http.get<any>(url, { params: { institute_id: instituteId } }).subscribe({ next: (res) => {
      try { const data = res?.data || []; this.departments = data.map((d: any) => ({ id: d.dept_id || d.id || d.deptId, name: d.name })); } catch(e){ this.departments = []; }
    }, error: () => { this.departments = []; } });
  }

  // load teams for the selected institute
  loadTeams(instituteId: string) {
    const url = `${API_BASE}/get-teams-list`;
    this.http.get<any>(url, { params: { institute_id: instituteId } }).subscribe({ next: (res) => {
      try { const data = res?.data || []; this.teams = data.map((t: any) => ({ id: t.team_id || t.id || t.teamId, name: t.name })); } catch(e) { this.teams = []; }
    }, error: () => { this.teams = []; } });
  }

  ngAfterViewInit(): void {
    try{ this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }catch(e){}
  }

  applyFilter(value: string){
    const q = (value || '').trim().toLowerCase();
    this.dataSource.filter = q;
    if (this.dataSource.paginator) {
      // reset to first page when filter text changes
      this.pageIndex = 0;
      this.dataSource.paginator.firstPage();
    }
  }

  get filtered(){
    const q = (this.filter||'').toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u =>
      (u.name||'').toLowerCase().includes(q) ||
      (u.email||'').toLowerCase().includes(q) ||
      (u.institute||'').toLowerCase().includes(q) ||
      (u.phone||'').toLowerCase().includes(q) ||
      (u.role||'').toLowerCase().includes(q)
    );
  }

  toggleActive(u: UserRow){
    const newState = !u.active;
    const action = newState ? 'Activate' : 'Deactivate';
    this.confirmService.confirm({ title: `${action} User`, message: `${action} user ${u.name}?`, confirmText: action, cancelText: 'Cancel' }).subscribe(ok => {
      if (!ok) return;
      // optimistic update
      const prev = u.active;
      u.active = newState;
      const id = u.id || (u.raw && (u.raw.user_id || u.raw.id));
      if (!id) { try { notify('User id missing', 'error'); } catch(e){}; u.active = prev; return; }
      const url = `${API_BASE}/user/${newState ? 'activate' : 'deactivate'}/${encodeURIComponent(String(id))}`;
      this.http.put<any>(url, { current_user: sessionStorage.getItem('user_profile') || sessionStorage.getItem('user') || '' }).subscribe({
        next: (res) => { try { notify(`User ${newState ? 'activated' : 'deactivated'}`, 'success'); } catch(e){} },
        error: (err) => { console.error('Failed toggling user active', err); try { notify('Failed to update user status', 'error'); } catch(e){}; u.active = prev; }
      });
    });
  }


  loadUsers(instituteId?: string){
    // if an instituteId was explicitly provided, prefer it and keep local state in sync
    if (typeof instituteId !== 'undefined' && instituteId !== null) {
      try { this.selectedInstitute = instituteId as any; } catch (e) {}
      try { this.filters.institute = String(instituteId); } catch (e) {}
    }

    this.loading.show();
    const url = `${API_BASE}/get-users`;
    // build query params from filters (prefer explicit institute param, then filter model, then selectedInstitute)
    const params: any = {};
    const instituteParam = (typeof instituteId !== 'undefined' && instituteId !== null) ? instituteId : (this.filters.institute || this.selectedInstitute);
    if (instituteParam) params.institute_id = instituteParam;
    if (this.filters.name) params.name = this.filters.name;
    if (this.filters.department) params.department = this.filters.department;
    if (this.filters.team) params.team = this.filters.team;
    if (this.filters.country) params.country = this.filters.country;
    if (this.filters.city) params.city = this.filters.city;
    if (this.filters.campus) params.campus = this.filters.campus;
    if (this.filters.joining_from) params.joining_from = this.filters.joining_from;
    if (this.filters.joining_to) params.joining_to = this.filters.joining_to;
    if (this.filters.active_status !== '') params.active_status = this.filters.active_status;
    // include pagination params (API expects pageNumber and pageSize)
    try {
      params.pageNumber = (this.pageIndex || 0) + 1; // send 1-based page number
      params.pageSize = this.pageSize || 25;
    } catch(e) {}

    this.http.get<any>(url, { params }).subscribe({
      next: (res) => {
        try{
          // support different shapes: top-level data array or res.data
          const data = res?.data || res?.users || res || [];
          // total count may be provided as totalCount or total_count
          this.totalCount = Number(res?.totalCount ?? res?.total_count ?? res?.data?.totalCount ?? res?.data?.total_count ?? res?.total ?? 0) || 0;
          // map API user shape to UserRow expected by the table
          this.rawRecords = data;
          this.users = data.map((u: any) => ({
            id: u.user_id || u.id,
            // prefer API full_name when available
            name: u.full_name || u.name || `${u.first_name||''} ${u.last_name||''}`.trim() || u.email,
            user_name: u.user_name,
            email: u.email,
            institute: (u.institute && (u.institute.institute_name || u.institute.short_name)) || u.institute_name || '',
            active: (typeof u.active_status === 'boolean') ? u.active_status : (u.active_status === 1 || u.active_status === '1'),
            phone: u.contact_no || u.phone || '',
            role: u.user_role || u.role || '',
            joining_date: u.joining_date || u.joining || '',
            department: (u.department && (u.department.department_name || u.department.name)) || u.department_name || '',
            team: (u.team && (u.team.team_name || u.team.name)) || u.team_name || '',
            campus: (u.campus && (u.campus.campus_name || u.campus.name)) || u.campus_name || '',
            country: (u.country && (u.country.country_name || u.country.name)) || u.country_name || '',
            state: (u.state && (u.state.state_name || u.state.name)) || u.state_name || '',
            city: (u.city && (u.city.city_name || u.city.name)) || u.city_name || '',
            created_by: u.created_by || '',
            created_date: u.created_date || u.created_at || '',
            updated_by: u.updated_by || '',
            updated_date: u.updated_date || u.updated_at || '',
            // normalize privileges from API (support multiple keys)
            privileges: (u.user_privileges || u.privileges || []).map((p: any) => ({
              page_id: p.page_id || p.pageId || p.id,
              page_name: p.page_name || p.pageName || p.page || p.name,
              can_add: !!p.can_add,
              can_delete: !!p.can_delete,
              can_edit: !!p.can_edit,
              can_view: !!p.can_view,
              raw: p
            })),
            user_privileges: u.user_privileges || u.privileges || [],
            raw: u
          }));
          this.dataSource.data = this.users;
          this.dataSource.filterPredicate = (d: UserRow, filter: string) => {
            const q = (filter || '').toLowerCase();
            return (d.name||'').toLowerCase().includes(q) || (d.email||'').toLowerCase().includes(q) || (d.institute||'').toLowerCase().includes(q) || (d.department||'').toLowerCase().includes(q) || (d.team||'').toLowerCase().includes(q);
          };
        }catch(e){ console.error('Error mapping users', e); this.users = []; }
        this.loading.hide();
      },
      error: (err) => { console.error('Failed loading users', err); this.loading.hide(); this.users = []; }
    });
  }

  applyFilters(){ this.loadUsers(); }

  resetFilters(){ this.filters = { institute: '', name: '', department: '', team: '', joining_from: '', joining_to: '', active_status: '', country: '', city: '' }; this.states=[]; /* keep cities loaded so options remain visible */ this.loadUsers(); }

  onPageEvent(ev: PageEvent){
    try{
      this.pageIndex = ev.pageIndex || 0;
      this.pageSize = ev.pageSize || this.pageSize;
      this.loadUsers();
    }catch(e){}
  }

  // load all cities (not scoped to a country) so city dropdown can show global options
  loadCities(){
    this.loading.show();
    this.cities = [];
    const url = `${API_BASE}/location-hierarchy`;
    this.http.get<any>(url).subscribe({ next: (res) => {
      try{
        // try top-level cities first
        let citiesRaw = res?.data?.cities || res?.cities || [];
        // if cities are nested under countries/states, aggregate them
        if ((!citiesRaw || citiesRaw.length === 0) && (res?.data?.countries || res?.countries)){
          const countries = res?.data?.countries || res?.countries || [];
          let agg: any[] = [];
          if (Array.isArray(countries)){
            countries.forEach((c:any)=>{ if (Array.isArray(c.cities)) agg = agg.concat(c.cities); if (Array.isArray(c.states)) c.states.forEach((s:any)=>{ if (Array.isArray(s.cities)) agg = agg.concat(s.cities); }); });
          }
          citiesRaw = agg;
        }
        this.cities = (citiesRaw || []).map((c:any)=> ({ code: c.city_code || c.code || c.id, name: c.city_name || c.name || c.city }));
      }catch(e){ this.cities = []; }
      this.loading.hide();
    }, error: () =>  { this.cities = []; this.loading.hide(); } });
  }

  loadInstitutes(){ 
    this.loading.show();
    const url = `${API_BASE}/get-institute-list`;
    this.http.get<any>(url).subscribe({ next: (res) => {
      const data = res?.data||[];
      // ensure each institute object includes an institute_id property so session-based lookup works
      this.institutes = data.map((i:any)=>({ institute_id: i.institute_id || i.id || i._id || '', short_name: i.short_name || i.institute_name || i.name || '' }));
          // If a selectedInstitute is already set (e.g. via route/session), prefer that
          try {
            if (this.selectedInstitute) {
              const found = this.institutes.find(i => String(i.institute_id) === String(this.selectedInstitute));
              if (found) {
                // ensure exact match type/value and load schedules
                this.selectedInstitute = found.institute_id as any;
                this.loadUsers(this.selectedInstitute);
                this.loadDepartments(this.selectedInstitute);
                this.loadTeams(this.selectedInstitute);
                return;
              }
            }
          } catch (e) { /* ignore */ }

          // Fallback: try reading user's institute from sessionStorage and apply it
          try {
            const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
            if (raw) {
              const u = JSON.parse(raw);
              const instId = u?.institute_id || u?.instituteId || u?.institute || '';
              if (instId) {
                const found = this.institutes.find(i => String(i.institute_id) === String(instId));
                if (found) {
                  this.selectedInstitute = found.institute_id as any;
                  this.loadUsers(this.selectedInstitute);
                  this.loadDepartments(this.selectedInstitute);
                  this.loadTeams(this.selectedInstitute);
                  this.loadCountries(this.selectedInstitute);
                } else {
                  // institute list shape didn't match or id not present in fetched list - still set and load using raw instId
                  this.selectedInstitute = instId as any;
                  try { this.filters.institute = String(instId); } catch (e) { /* ignore */ }
                  this.loadUsers(this.selectedInstitute);
                }
              }
            }
          } catch (e) { /* ignore malformed session data */ }
    }, error: () => { this.institutes = []; this.loading.hide(); } });
    this.loading.hide();
  }

  loadCountries( instituteId: string){ 
    const url = `${API_BASE}/location-hierarchy`;
    this.http.get<any>(url, { params: { institute_id: instituteId } }).subscribe({ next: (res) => { try{ const countries = res?.data?.countries || res?.countries || res?.data || []; this.countries = countries.map((c:any)=> ({ code: c.country_code || c.code || c.id, name: c.country_name || c.name || c.country })); }catch(e){ this.countries = []; } }, error: () => { this.countries = []; } });
  }

  // load states and cities for a selected country (aggregate from countries payload or request country scoped)
  onCountryChange(){
    this.states = [];
    this.cities = [];
    if(!this.filters.country) return;
    const url = `${API_BASE}/location-hierarchy`;
    const selectedCountry = this.filters.country;
    this.http.get<any>(url, { params: { country_id: selectedCountry } }).subscribe({ next: (res) => {
      try{
        // states: prefer top-level states array
        const statesRaw = res?.data?.states || res?.states || [];
        this.states = (Array.isArray(statesRaw) ? statesRaw : []).map((s:any)=> ({ code: s.state_code || s.code || s.id, name: s.state_name || s.name || s.state }));

        // cities: try top-level cities first (they may include state_id references)
        let citiesRaw = res?.data?.cities || res?.cities || [];
        let allCities: any[] = [];

        if (Array.isArray(citiesRaw) && citiesRaw.length > 0) {
          // filter top-level cities to those whose state belongs to the selected country
          const stateIds = (Array.isArray(statesRaw) ? statesRaw.map((s:any) => (s.id || s.state_id || s.code || s.state_code)).filter(Boolean) : []);
          if (stateIds.length > 0) {
            allCities = citiesRaw.filter((c:any) => stateIds.includes(c.state_id || c.state || c.stateId || c.state_code));
          } else {
            // no states returned; include all top-level cities as a fallback
            allCities = citiesRaw;
          }
        } else {
          // aggregate from countries -> cities and countries -> states -> cities, preferring the selected country
          const countries = res?.data?.countries || res?.countries || [];
          if (Array.isArray(countries) && countries.length > 0) {
            const foundCountry = countries.find((ct:any) => String(ct.id || ct.country_id || ct.country_code || ct.code) === String(selectedCountry));
            if (foundCountry) {
              if (Array.isArray(foundCountry.cities)) allCities = allCities.concat(foundCountry.cities);
              if (Array.isArray(foundCountry.states)) foundCountry.states.forEach((s:any) => { if (Array.isArray(s.cities)) allCities = allCities.concat(s.cities); });
            } else {
              // fallback: aggregate all countries
              countries.forEach((c:any) => {
                if (Array.isArray(c.cities)) allCities = allCities.concat(c.cities);
                if (Array.isArray(c.states)) c.states.forEach((s:any)=>{ if (Array.isArray(s.cities)) allCities = allCities.concat(s.cities); });
              });
            }
          } else {
            allCities = res?.data?.cities || res?.cities || [];
          }
        }

        this.cities = (allCities || []).map((c:any)=> ({ code: c.city_code || c.code || c.id, name: c.city_name || c.name || c.city }));
      }catch(e){ this.states = []; this.cities = []; }
    }, error: () => { this.states = []; this.cities = []; } });
  }

  onStateChange(){ this.cities = []; if(!this.filters.state) return; const url = `${API_BASE}/location-hierarchy`; this.http.get<any>(url, { params: { country: this.filters.country, state: this.filters.state } }).subscribe({ next: (res) => { try{ const cities = res?.data?.cities || res?.cities || res?.data || []; this.cities = cities.map((c:any)=> ({ code: c.city_code || c.code || c.id, name: c.city_name || c.name || c.city })); }catch(e){ this.cities = []; } }, error: () => { this.cities = []; } }); }

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

  refresh(){ this.loadUsers(); }

  // Modal / actions
    viewDetails(u: UserRow){
      // store a lightweight view payload for future features (matches institutes behavior)
        const payload: any = { ...u };
        // ensure privileges are included in the view payload (prefer normalized privileges)
        try { payload.user_privileges = u.privileges && u.privileges.length ? u.privileges : (u.raw && u.raw.user_privileges) ? u.raw.user_privileges : (u.user_privileges || []); } catch(e) { payload.user_privileges = (u.user_privileges || []); }
          try { sessionStorage.setItem('view_user', JSON.stringify(payload)); } catch(e) {}
          // open detail modal using the prepared payload so normalized privileges are visible
          this.selectedUser = payload;
  }

  startEditUser(u: UserRow){
    // route to the user-register page and let that page handle editing
    try {
      const raw = u.raw || u || {};
      // normalize common alternate field names so the register form can patch correctly
      const payload: any = { ...raw };
      // ensure campus object or id fields
      payload.campus = payload.campus || (payload.campus_id ? { campus_id: payload.campus_id } : payload.campus);

      // Helper: produce YYYY-MM-DD from various date-like fields
      const fmtDate = (val: any) => {
        if (val == null || val === '') return '';
        try {
          if (val instanceof Date) return val.toISOString().slice(0,10);
          const s = String(val || '');
          // ISO-like or timestamp prefixed values
          if (s.length >= 10) return s.substring(0,10);
          return s;
        } catch(e) { return val; }
      };

      // ensure joining_date available as string YYYY-MM-DD (try many keys)
      if (!payload.joining_date) {
        payload.joining_date = fmtDate(payload.joining_date || payload.joining || payload.joiningDate || payload.joined_at || payload.joinedAt || payload.created_at || payload.createdAt || payload.joined_on || payload.joinedOn || payload.created_date || payload.createdDate || '');
      } else {
        payload.joining_date = fmtDate(payload.joining_date);
      }

      // normalize location nested objects if backend used different keys
      if (!payload.campus && payload.institute_campus) payload.campus = payload.institute_campus;

      // prefer explicit id/code fields for country/state/city. Try many possible keys and nested shapes.
      const pickId = (obj: any, candidates: string[]) => {
        try {
          for (const k of candidates) {
            const v = obj && obj[k];
            if (v !== undefined && v !== null && String(v) !== '') return String(v);
          }
        } catch(e) {}
        return '';
      };

      // country
      if (!payload.country || String(payload.country).length === 0) {
        payload.country = pickId(payload, ['country_id','countryCode','country_code','code','id']);
        if (!payload.country) payload.country = pickId(payload.country || payload, ['country_id','countryCode','country_code','code','id']);
        if (!payload.country) payload.country = pickId(payload.campus?.country || {}, ['country_id','countryCode','country_code','code','id']);
      }

      // state
      if (!payload.state || String(payload.state).length === 0) {
        payload.state = pickId(payload, ['state_id','stateCode','state_code','code','id']);
        if (!payload.state) payload.state = pickId(payload.state || payload, ['state_id','stateCode','state_code','code','id']);
        if (!payload.state) payload.state = pickId(payload.campus?.state || {}, ['state_id','stateCode','state_code','code','id']);
      }

      // city
      if (!payload.city || String(payload.city).length === 0) {
        payload.city = pickId(payload, ['city_id','cityCode','city_code','code','id']);
        if (!payload.city) payload.city = pickId(payload.city || payload, ['city_id','cityCode','city_code','code','id']);
        if (!payload.city) payload.city = pickId(payload.campus?.city || {}, ['city_id','cityCode','city_code','code','id']);
      }
      // ensure privileges are preserved when navigating to edit form (keep raw and also produce page_access for register form)
      try {
        if (!payload.user_privileges || payload.user_privileges.length === 0) payload.user_privileges = (u.privileges && u.privileges.length) ? u.privileges : (raw.user_privileges || raw.privileges || []);
      } catch(e) { payload.user_privileges = (raw.user_privileges || raw.privileges || []); }
      try {
        const ups = payload.user_privileges || [];
        if (Array.isArray(ups) && ups.length > 0) {
          // convert to page_access array expected by user-register (page_key + view/add/edit/delete)
          payload.page_access = ups.map((p: any) => ({
            page_key: p.page_id || p.pageId || p.page || p.page_key || p.key || p.page_name || p.pageName,
            view: !!(p.can_view || p.canView || p.view),
            add: !!(p.can_add || p.canAdd || p.add),
            edit: !!(p.can_edit || p.canEdit || p.edit),
            delete: !!(p.can_delete || p.canDelete || p.delete)
          }));
          // also provide a 'pages' alias in case some code looks there
          payload.pages = payload.page_access;
        }
      } catch(e) { /* ignore privilege shaping errors */ }

      // Normalize joining_date: convert common formats like DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
      const normalizeJoiningDate = (val: any) => {
        if (!val && val !== 0) return '';
        try {
          const s = String(val || '').trim();
          // already ISO-ish YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          // dd-mm-yyyy or dd/mm/yyyy
          const m1 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
          if (m1) {
            const d = m1[1].padStart(2,'0');
            const mo = m1[2].padStart(2,'0');
            const y = m1[3];
            return `${y}-${mo}-${d}`;
          }
          // try Date parse fallback
          const dt = new Date(s);
          if (!isNaN(dt.getTime())) return dt.toISOString().slice(0,10);
          return s.length >= 10 ? s.substring(0,10) : s;
        } catch(e) { return val; }
      };
      try { payload.joining_date = normalizeJoiningDate(payload.joining_date || payload.joining || payload.joiningDate || payload.joined_at || payload.joinedAt || payload.created_at || payload.createdAt || payload.joined_on || payload.joinedOn || payload.created_date || payload.createdDate || ''); } catch(e) { /* ignore */ }

      // Ensure top-level id fields for country/state/city/campus so user-register can patch selects
      try {
        // campus
        const campusId = (payload.campus && (payload.campus.campus_id || payload.campus.id)) || payload.campus_id || payload.campus || '';
        if (campusId) {
          payload.campus_id = String(campusId);
          if (!payload.campus || typeof payload.campus !== 'object') payload.campus = { campus_id: payload.campus_id };
          else payload.campus.campus_id = payload.campus.campus_id || payload.campus.id || payload.campus_id;
        }

        // country
        const countryId = (payload.country && (payload.country.country_id || payload.country.id)) || payload.country_id || payload.country || '';
        if (countryId) {
          payload.country_id = String(countryId);
          payload.country = payload.country_id;
        }

        // state
        const stateId = (payload.state && (payload.state.state_id || payload.state.id)) || payload.state_id || payload.state || '';
        if (stateId) {
          payload.state_id = String(stateId);
          payload.state = payload.state_id;
        }

        // city
        const cityId = (payload.city && (payload.city.city_id || payload.city.id)) || payload.city_id || payload.city || '';
        if (cityId) {
          payload.city_id = String(cityId);
          payload.city = payload.city_id;
        }
      } catch(e) { /* ignore */ }

      sessionStorage.setItem('edit_user', JSON.stringify(payload));
    } catch(e) {}
    this.router.navigate(['/user-register']);
  }

  saveEditUser(){
    if(!this.editableUser) return;
    const idx = this.users.findIndex(x => x.id === (this.editableUser.user_id || this.editableUser.id));
    if(idx >= 0){
      this.users[idx] = { ...this.users[idx], name: this.editableUser.user_name, email: this.editableUser.email, phone: this.editableUser.contact_no, role: this.editableUser.user_role, active: !!this.editableUser.active_status, raw: this.editableUser };
    }
    this.closeModal();
  }

  deleteUser(u: UserRow){
    try {
      this.confirmService.confirm({ title: 'Delete User', message: `Delete user ${u.name}?`, confirmText: 'Delete', cancelText: 'Cancel' }).subscribe(ok => {
        if (!ok) return;
        this.users = this.users.filter(x => x.id !== u.id);
        try { notify('User deleted', 'success'); } catch (e) {}
      });
    } catch (e) {}
  }

  closeModal(){ this.selectedUser = null; this.editing = false; this.editableUser = null }
}
