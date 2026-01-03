import { Component, ViewChild, AfterViewInit, ElementRef, TemplateRef, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_BASE } from 'src/app/shared/api.config';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { notify } from 'src/app/shared/global-notify';
import { ConfirmService } from 'src/app/shared/services/confirm.service';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

export interface Institute {
  id: number;
  name: string;
  short: string;
  city?: string;
  state?: string;
  country?: string;
  active: boolean;
  primary_contact?: string;
  primary_email?: string;
  primary_contact_person?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  website?: string;
  max_users?: number;
  industry_type?: string;
  industry_sector?: string;
  subscription_start?: string;
  subscription_end?: string;
  active_status?: boolean;
  // internal id from backend (UUID) - not shown in UI but used for actions
  institute_id?: string;
  raw?: any;
}

@Component({
  selector: 'app-view-institutes',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatSlideToggleModule, MatTabsModule, MatInputModule, MatFormFieldModule, MatSelectModule, FormsModule, ReactiveFormsModule, RouterModule, MatPaginatorModule, MatSortModule, OverlayModule, PortalModule],
  templateUrl: './view-institutes.component.html',
  styleUrls: ['./view-institutes.component.scss']
})
export class ViewInstitutesComponent {
  // Show only requested columns in list-card table (include subscription dates and active)
  columns = ['name','short','industry_type','industry_sector', 'primary_contact_person','subscription_start','subscription_end','active','actions'];

  filter = '';

  industryTypes = ['School', 'College', 'BPO', 'Bank', 'IT'];
  industrySectors = ['School', 'Engineering', 'Arts', 'Healthcare', 'Finance', 'Banking', 'IT'];
  
  // filters
  filters: any = { name: '', industry: '', sector: '', country: '', city: '', active_status: '' };
  countries: Array<{ code: string; name: string }> = [];
  states: Array<{ code: string; name: string }> = [];
  cities: Array<{ code: string; name: string }> = [];

  institutes: Institute[] = [];
  dataSource = new MatTableDataSource<Institute>([]);
  // keep raw response objects so detail modal can show full fields
  private rawRecords: any[] = [];

  selectedInstitute: any = null; // used for modal detail view
  showFilters = false; // control visibility of filter-block (mini modal)
  editing = false;
  editableInstitute: any = null;
  // reactive edit form to mirror the register page
  editForm: FormGroup | null = null;

  private apiUrl = `${API_BASE}/get-institutes`;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;

  private filtersOverlayRef: OverlayRef | null = null;
  
  constructor(private http: HttpClient, private router: Router, private loader: LoaderService, private pageMeta: PageMetaService, private overlay: Overlay, private vcr: ViewContainerRef, private confirmService: ConfirmService) {
    this.loadInstitutes();
    this.loadCountries();
  }

  ngOnInit(): void {

    try {
      this.pageMeta.setMeta('Institutes', 'View and manage registered institutes');
    } catch (e) { /* ignore if service not available */ }
  }
  ngAfterViewInit(): void {
    try{ this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }catch(e){}
  }

  applyFilter(value: string){
    const q = (value || '').trim().toLowerCase();
    this.dataSource.filter = q;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  loadInstitutes() {
    const params: any = {};
  if(this.filters.name) params.name = this.filters.name;
  if(this.filters.industry) params.industry = this.filters.industry;
  if(this.filters.sector) params.sector = this.filters.sector;
  if(this.filters.country) params.country = this.filters.country;
  if(this.filters.city) params.city = this.filters.city;
    if(this.filters.active_status !== '') params.active_status = this.filters.active_status;

    this.loader.show();
    this.http.get<any>(this.apiUrl, { params }).subscribe({
      next: (res) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.rawRecords = res.data;
          this.institutes = res.data.map((r: any, idx: number) => ({
            id: idx + 1,
            name: r.name,
            short: r.short_name || r.short || '',
            // prefer top-level city/state/country, fallback to first campus if present
            city: r.city || (r.campuses && r.campuses[0] && r.campuses[0].city && r.campuses[0].city.city_name) || '',
            state: r.state || (r.campuses && r.campuses[0] && r.campuses[0].state && r.campuses[0].state.state_name) || '',
            country: r.country || (r.campuses && r.campuses[0] && r.campuses[0].country && r.campuses[0].country.country_name) || '',
            primary_contact: r.primary_contact_person || '',
            primary_email: r.primary_contact_email || '',
            primary_contact_phone: r.primary_contact_phone || r.primary_contact_phone || r.primary_contact_phone || r.primary_contact_phone || '',
            website: r.website || '',
            max_users: r.max_users || null,
            subscription_start: r.subscription_start || r.subscriptionStart || '',
            subscription_end: r.subscription_end || r.subscriptionEnd || '',
            industry_type: r.industry_type || '',
            industry_sector: r.industry_sector || '',
            active: !!r.active_status,
            active_status: !!r.active_status,
            institute_id: r.institute_id,
            raw: r
          }));
          // update table data source
          this.dataSource.data = this.institutes;
          // set filter predicate to look into key fields
          this.dataSource.filterPredicate = (data: Institute, filter: string) => {
            const q = (filter || '').toLowerCase();
            return (data.name || '').toLowerCase().includes(q)
              || (data.short || '').toLowerCase().includes(q)
              || (data.country || '').toLowerCase().includes(q)
              || (data.city || '').toLowerCase().includes(q)
              || (data.state || '').toLowerCase().includes(q)
              || (data.industry_type || '').toLowerCase().includes(q)
              || (data.industry_sector || '').toLowerCase().includes(q);
          };
          // attach paginator/sort if available
          setTimeout(() => {
            try{ this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }catch(e){}
          }, 0);
        }
      },
      error: (err) => {
        console.warn('Failed to load institutes:', err);
        try{ this.loader.hide(); }catch(e){}
      },
      complete: () => { try{ this.loader.hide(); }catch(e){} }
    });
  }

  applyFilters(){ this.loadInstitutes(); }

  resetFilters(){ this.filters = { name: '', industry: '', sector: '', country: '', city: '', active_status: '' };  this.loadInstitutes(); }

  toggleFilters(){ this.showFilters = !this.showFilters }

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

  // country -> city filtering removed: we now load all cities in loadCountries()

  loadCountries(){
    const url = `${API_BASE}/location-hierarchy`;
  this.loader.show();
  this.http.get<any>(url).subscribe({
      next: (res) => {
      try{
        const countries = res?.data?.countries || res?.countries || res?.data || [];
        this.countries = countries.map((c:any)=> ({ code: c.country_code || c.code || c.id, name: c.country_name || c.name || c.country }));
        // try to aggregate all cities from the countries payload (if present)
        let allCities: any[] = [];
        if(Array.isArray(countries)){
          countries.forEach((c:any)=>{
            if(Array.isArray(c.cities)) allCities = allCities.concat(c.cities);
            if(Array.isArray(c.states)) c.states.forEach((s:any)=>{ if(Array.isArray(s.cities)) allCities = allCities.concat(s.cities); });
            if(Array.isArray(c.children)) c.children.forEach((ch:any)=>{ if(Array.isArray(ch.cities)) allCities = allCities.concat(ch.cities); });
          });
        }
        // fallback: if API returned a top-level cities array
        if((allCities.length === 0) && (res?.data?.cities || res?.cities)){
          allCities = res?.data?.cities || res?.cities || [];
        }
        this.cities = (allCities || []).map((c:any)=> ({ code: c.city_code || c.code || c.id, name: c.city_name || c.name || c.city }));
      }catch(e){ this.countries = []; this.cities = []; }
    },
    error: () => { this.countries = []; this.cities = []; try{ this.loader.hide(); }catch(e){} },
    complete: () => { try{ this.loader.hide(); }catch(e){} }
  });
  }

  // country/state/city filters removed for Institutes view; helpers left intentionally blank

  get filtered() {
    const q = this.filter && this.filter.toLowerCase();
    if (!q) return this.institutes;
    return this.institutes.filter(i => i.name.toLowerCase().includes(q)
      || (i.short||'').toLowerCase().includes(q)
      || (i.country||'').toLowerCase().includes(q)
      || (i.city||'').toLowerCase().includes(q)
      || (i.state||'').toLowerCase().includes(q)
      || (i.industry_type||'').toLowerCase().includes(q)
      || (i.industry_sector||'').toLowerCase().includes(q)
    );
  }

  toggleActive(i: Institute){
    const previous = !!i.active;
    const newState = !previous;
    const actionVerb = newState ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${actionVerb} institute "${i.name}"?`;
    // show confirmation dialog using ConfirmService
    try {
      this.confirmService.confirm({ title: 'Confirm', message: confirmMessage, confirmText: 'Yes', cancelText: 'No' }).subscribe((ok) => {
        if (!ok) return;

        // optimistic update for responsiveness
        i.active = newState;
        const action = i.active ? 'activate' : 'deactivate';
        const uuid = i.institute_id || (i.raw && (i.raw.institute_id || i.raw.id || i.raw._id));
        if(!uuid){
          console.warn('No institute id present for toggleActive');
          // revert
          i.active = previous;
          return;
        }
        const url = `${API_BASE}/institute/${action}/${uuid}`;
        // include current user id in body
        let current_user_id: any = null;
        try{
          const raw = sessionStorage.getItem('user') || sessionStorage.getItem('user_profile');
          if(raw) {
            const obj = JSON.parse(raw);
            current_user_id = obj.user_id || obj.id || null;
          }
        }catch(e){ current_user_id = null; }
        const body: any = { current_user: current_user_id };
        try{ this.loader.show(); }catch(e){}
        this.http.put(url, body, { observe: 'response' }).subscribe({
          next: (res) => {
            try{ this.loader.hide(); }catch(e){}
            try { notify(`Institute ${i.name} ${action}d successfully`, 'success'); } catch (e) {}
          },
          error: (err) => {
            try{ this.loader.hide(); }catch(e){}
            console.error('Failed to toggle institute active state', err);
            // revert
            i.active = previous;
            try { notify('Failed to change institute status. Please try again.', 'error'); } catch (e) {}
          }
        });
      });
      return;
    } catch (e) { return; }
  }

  viewDetails(i: Institute){
    // keep the backend institute_id in storage for feature development, but don't show it in UI
    const payload = { ...i };
    try { sessionStorage.setItem('view_institute', JSON.stringify(payload)); } catch(e){}
    // open detail modal
    this.selectedInstitute = i.raw || i;
  }

  startEdit(i: Institute){
    // Redirect to the institute-register page and prefill the form from storage
    try {
      const raw = i.raw || i || {};
      const payload: any = { ...raw };
      // Normalize subscription dates to YYYY-MM-DD strings so date inputs display correctly
      const fmt = (val: any) => {
        if (!val && val !== 0) return '';
        try {
          // If it's already a Date
          if (val instanceof Date) return val.toISOString().slice(0,10);
          // Try parsing ISO / timestamp strings
          const d = new Date(String(val));
          if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
          // Try to extract YYYY-MM-DD from common formats
          const m = String(val).match(/(\d{4}-\d{2}-\d{2})/);
          if (m) return m[1];
          const m2 = String(val).match(/(\d{2}\/\d{2}\/\d{4})/);
          if (m2) {
            // convert DD/MM/YYYY or MM/DD/YYYY guess to YYYY-MM-DD (try both)
            const parts = m2[1].split(/\//);
            // assume DD/MM/YYYY
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          }
        } catch(e) {}
        return '';
      };
      try { payload.subscription_start = fmt(raw.subscription_start || raw.subscriptionStart || ''); } catch(e) { payload.subscription_start = ''; }
      try { payload.subscription_end = fmt(raw.subscription_end || raw.subscriptionEnd || ''); } catch(e) { payload.subscription_end = ''; }
      sessionStorage.setItem('edit_institute', JSON.stringify(payload));
    } catch(e) {}
    this.router.navigate(['/institute-register']);
    return;
    // build a reactive edit form mirroring the register form for consistent UX
    try{
      const fb = new FormBuilder();
      this.editForm = fb.group({
        name: [this.editableInstitute.name || ''],
        short_name: [this.editableInstitute.short_name || this.editableInstitute.short || ''],
        industry_type: [this.editableInstitute.industry_type || ''],
        industry_sector: [this.editableInstitute.industry_sector || ''],
        primary_contact_person: [this.editableInstitute.primary_contact_person || ''],
        primary_contact_email: [this.editableInstitute.primary_contact_email || ''],
        primary_contact_phone: [this.editableInstitute.primary_contact_phone || ''],
        website: [this.editableInstitute.website || ''],
        max_users: [this.editableInstitute.max_users || null],
        subscription_start: [this.editableInstitute.subscription_start || ''],
        subscription_end: [this.editableInstitute.subscription_end || ''],
        active_status: [!!this.editableInstitute.active_status]
      });
    }catch(e){ this.editForm = null; }
    // prepare CSV/JSON helper fields for editing complex arrays
    try{
      this.editableInstitute._departmentsCsv = (this.editableInstitute.departments && Array.isArray(this.editableInstitute.departments)) ? this.editableInstitute.departments.map((d:any)=> d && d.name ? d.name : (typeof d === 'string' ? d : '')).join(',') : '';
    }catch(e){ this.editableInstitute._departmentsCsv = ''; }
    try{
      this.editableInstitute._teamsCsv = (this.editableInstitute.teams && Array.isArray(this.editableInstitute.teams)) ? this.editableInstitute.teams.map((t:any)=> t && t.name ? t.name : (typeof t === 'string' ? t : '')).join(',') : '';
    }catch(e){ this.editableInstitute._teamsCsv = ''; }
    try{
      this.editableInstitute._campusesJson = JSON.stringify(this.editableInstitute.campuses || [], null, 2);
    }catch(e){ this.editableInstitute._campusesJson = '[]'; }
  }

  confirmDelete(i: Institute){
    try {
      this.confirmService.confirm({ title: 'Delete Institute', message: `Delete institute ${i.name}? This action cannot be undone.`, confirmText: 'Delete', cancelText: 'Cancel' }).subscribe((ok) => {
        if (!ok) return;
        const uuid = i.institute_id || (i.raw && (i.raw.institute_id || i.raw.id || i.raw._id));
        if(!uuid){
          // remove locally if no uuid
          this.institutes = this.institutes.filter(x => x.id !== i.id);
          try { notify('Institute removed locally', 'info'); } catch (e) {}
          return;
        }
        const url = `${API_BASE}/institute/delete/${uuid}`;
        try{ this.loader.show(); }catch(e){}
        this.http.delete<any>(url, { observe: 'response' }).subscribe({
          next: (res) => {
            try{ this.loader.hide(); }catch(e){}
            // remove from list
            this.institutes = this.institutes.filter(x => x.institute_id !== uuid && x.id !== i.id);
            try { notify('Institute deleted successfully', 'success'); } catch (e) {}
          },
          error: (err) => {
            try{ this.loader.hide(); }catch(e){}
            console.error('Failed to delete institute', err);
            try { notify('Failed to delete institute. Please try again later.', 'error'); } catch (e) {}
          }
        });
      });
    } catch (e) { return; }
  }

  closeModal(){ this.selectedInstitute = null; this.editing = false; this.editableInstitute = null }

  saveEdit(){
    if(!this.editableInstitute) return;
    // if editForm exists, ensure it's valid before proceeding
    if (this.editForm && this.editForm.invalid) {
      try { notify('Please correct errors in the edit form before saving.', 'error'); } catch(e){}
      return;
    }
    // apply locally to institutes list; backend save TODO
    const idx = this.institutes.findIndex(x => x.institute_id === this.editableInstitute.institute_id || x.id === this.editableInstitute.id);
    if(idx >= 0){
      // merge: update displayed columns and raw object with full edited payload
      const raw = this.editableInstitute;
      // if a reactive editForm exists, prefer its values (keeps validation/formatting consistent)
      if (this.editForm) {
        const fv = this.editForm.value;
        raw.name = fv.name; raw.short_name = fv.short_name; raw.industry_type = fv.industry_type; raw.industry_sector = fv.industry_sector;
        raw.primary_contact_person = fv.primary_contact_person; raw.primary_contact_email = fv.primary_contact_email; raw.primary_contact_phone = fv.primary_contact_phone;
        raw.website = fv.website; raw.max_users = fv.max_users; raw.subscription_start = fv.subscription_start; raw.subscription_end = fv.subscription_end; raw.active_status = !!fv.active_status;
      }
      // if CSV/JSON helper fields were edited, reconcile them into raw arrays
      if(raw._departmentsCsv !== undefined){
        const parts = (raw._departmentsCsv || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        raw.departments = parts.map((p: string) => ({ name: p }));
      }
      if(raw._teamsCsv !== undefined){
        const parts = (raw._teamsCsv || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        raw.teams = parts.map((p: string) => ({ name: p }));
      }
      if(raw._campusesJson !== undefined){
        try{
          const parsed = JSON.parse(raw._campusesJson || '[]');
          raw.campuses = Array.isArray(parsed) ? parsed : raw.campuses;
        }catch(e){
          // keep existing campuses if JSON invalid
        }
      }
      this.institutes[idx] = {
        ...this.institutes[idx],
  name: raw.name,
        short: raw.short_name || raw.short || '',
        city: raw.city || (raw.campuses && raw.campuses[0] && raw.campuses[0].city && raw.campuses[0].city.city_name) || '',
        state: raw.state || (raw.campuses && raw.campuses[0] && raw.campuses[0].state && raw.campuses[0].state.state_name) || '',
        country: raw.country || (raw.campuses && raw.campuses[0] && raw.campuses[0].country && raw.campuses[0].country.country_name) || '',
  primary_contact: raw.primary_contact_person || raw.primary_contact || '',
  primary_email: raw.primary_contact_email || '',
  primary_contact_phone: raw.primary_contact_phone || raw.primary_contact_phone || '',
        website: raw.website || '',
        max_users: raw.max_users || null,
        industry_type: raw.industry_type || '',
        industry_sector: raw.industry_sector || '',
        active: !!raw.active_status,
        raw: raw
      } as Institute;
    }
    this.closeModal();
  }
}
