import { Component, ChangeDetectorRef, ViewChild, ElementRef, TemplateRef, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatListModule } from '@angular/material/list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatStepperModule } from '@angular/material/stepper';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { API_BASE } from 'src/app/shared/api.config';
import { notify } from 'src/app/shared/global-notify';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { LoaderService } from 'src/app/shared/services/loader.service';

@Component({
  selector: 'app-admin-schedule-test',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatIconModule, MatButtonModule, MatCheckboxModule, MatSlideToggleModule, MatListModule, MatDatepickerModule, MatNativeDateModule, MatStepperModule, OverlayModule, PortalModule],
  templateUrl: './schedule-test.component.html',
  styleUrls: ['./schedule-test.component.scss']
})
export class AdminScheduleTestComponent {
  // institute list will be fetched from backend
  institutes: Array<{ name: string; institute_id?: string }> = [];
  batches = ['Batch A', 'Batch B', 'Batch C'];

  // User selection related
  users: Array<{ id: string; name: string; email?: string; institute?: string; department?: string; team?: string }> = [];
  selectedUsers: string[] = [];
  selectAll = false;
  userFilters: any = { department_id: '', teams_id: '', country_id: '', city_id: '', campus_id: '' };
  departmentList: string[] = [];
  teamList: string[] = [];
  campusList: string[] = [];
  countries: Array<{ code: string; name: string }> = [];
  states: Array<{ code: string; name: string }> = [];
  cities: Array<{ code: string; name: string }> = [];

  model: any = {
    institute: '',
    // scheduler name shown on the schedule list (user-provided)
    schedulerName: '',
    // selected exam id from catalog (optional)
    exam_id: '',
    testType: 'MCQ',
    startDate: '',
    startTime: '',
    // new combined fields (datetime-local format: yyyy-MM-ddTHH:mm)
    startDateTime: '',
    durationMin: 60,
    endDate: '',
    endTime: '',
    endDateTime: '',
    assignBatches: [] as string[],
    maxAttempts: 1,
    publish: false,
    userreview: false,
    // initialize categories so UI can bind reliably
    categories: [] as Array<{ name: string, questions: number }>
  };

  // categories support
  newCategory: { name: string; questions: number } = { name: '', questions: 0 };


  readOnly = false;
  isSuperAdmin: boolean = false;

  scheduled: any[] = [
    { institute: 'Institute Alpha', testName: 'Math Test', start: '2025-09-28 10:00', duration: 60, published: true }
  ];

  toggleBatch(name: string) {
    const i = this.model.assignBatches.indexOf(name);
    if (i >= 0) this.model.assignBatches.splice(i, 1);
    else this.model.assignBatches.push(name);
  }

  ngOnInit(): void {
    try {
      this.pageMeta.setMeta('Exam Schedule', 'Schedule and manage exams for your institute');
    } catch (e) { /* ignore if service not available */ }
  }
  // Load users from backend using filters (reuses get-users endpoint conventions)
  loadUsers() {
    this.loader.show();
    const url = `${API_BASE}/get-users-list`;
    const params: any = {};
    // Preferred API param names (template binds to these keys)
    if (this.userFilters.department_id) params.department_id = this.userFilters.department_id;
    // support both `teams_id` (preferred) and legacy `team_id`
    if (this.userFilters.teams_id) params.teams_id = this.userFilters.teams_id;
    if (this.userFilters.team_id && !params.teams_id) params.teams_id = this.userFilters.team_id;
    if (this.userFilters.country_id) params.country_id = this.userFilters.country_id;
    if (this.userFilters.city_id) params.city_id = this.userFilters.city_id;
    if (this.userFilters.campus_id) params.campus_id = this.userFilters.campus_id;
    // Backwards-compatible fallbacks (in case template still binds older keys)
    if (!params.department_id && (this.userFilters.department || this.userFilters.department_id)) params.department_id = this.userFilters.department || this.userFilters.department_id;
    if (!params.teams_id && (this.userFilters.team || this.userFilters.teams_id || this.userFilters.team_id)) params.teams_id = this.userFilters.teams_id || this.userFilters.team || this.userFilters.team_id;
    if (!params.country_id && (this.userFilters.country || this.userFilters.country_id)) params.country_id = this.userFilters.country || this.userFilters.country_id;
    if (!params.city_id && (this.userFilters.city || this.userFilters.city_id)) params.city_id = this.userFilters.city || this.userFilters.city_id;
    if (!params.campus_id && (this.userFilters.campus || this.userFilters.campus_id)) params.campus_id = this.userFilters.campus || this.userFilters.campus_id;
    if (this.model.institute) params.institute_id = this.model.institute;
    this.http.get<any>(url, { params }).subscribe({
      next: (res) => {
        const data = res?.data || [];
        this.users = Array.isArray(data) ? data.map((u: any) => ({ id: String(u.user_id || u.id || ''), name: u.full_name || u.user_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim(), email: u.email, institute: u.institute_name || (u.institute && u.institute.institute_name) || '', department: u.department_name || (u.department && (u.department.name || u.department.department_name)) || '', team: u.team_name || (u.team && (u.team.name || u.team.team_name)) || '' })) : [];
        // prefill department/team/campus lists if empty
        if (this.departmentList.length === 0) { this.departmentList = Array.from(new Set(this.users.map(u => u.department || '').filter((s: string) => !!s))); }
        if (this.teamList.length === 0) { this.teamList = Array.from(new Set(this.users.map(u => u.team || '').filter((s: string) => !!s))); }
        if (this.campusList.length === 0) { this.campusList = Array.from(new Set(this.users.map(u => u.institute || '').filter((s: string) => !!s))); }
      },
      error: () => { this.users = []; },
      complete: () => { this.loader.hide(); }
    });
  }

  toggleUserSelection(userId: string, checked: boolean) {
    const idx = this.selectedUsers.indexOf(userId);
    if (checked && idx < 0) this.selectedUsers.push(userId);
    if (!checked && idx >= 0) this.selectedUsers.splice(idx, 1);
    this.selectAll = this.users.length > 0 && this.selectedUsers.length === this.users.length;
  }

  toggleSelectAll(checked: boolean) {
    this.selectAll = !!checked;
    if (this.selectAll) this.selectedUsers = this.users.map(u => u.id);
    else this.selectedUsers = [];
  }

  // Helper to set time fields. Accepts 'HH:MM' or 'now' to set current time rounded to minutes.
  private formatNowTime(): string {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Keep legacy helpers but prefer combined datetime setters below
  setStartTime(value: string) {
    if (value === 'now') this.model.startTime = this.formatNowTime();
    else this.model.startTime = value;
  }

  setEndTime(value: string) {
    if (value === 'now') this.model.endTime = this.formatNowTime();
    else this.model.endTime = value;
  }

  // Format a Date object to a local datetime-local string: YYYY-MM-DDTHH:mm
  private toLocalDateTimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Preset setters for new combined fields. Accepts 'HH:MM' or 'now'.
  // Initialize defaults for start/end date & time when no edit/view payload present
  private initializeDefaults() {
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      const nowTime = `${hh}:${mm}`;

      // Only set defaults if fields are not already populated (e.g. when editing/viewing)
      if (!this.model.startDate) this.model.startDate = today;
      if (!this.model.startTime) this.model.startTime = nowTime;
      if (!this.model.startDateTime) this.model.startDateTime = this.toLocalDateTimeInput(new Date());

      if (!this.model.endDate) this.model.endDate = today;
      if (!this.model.endTime) this.model.endTime = '23:59';
      if (!this.model.endDateTime) {
        const endDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0);
        this.model.endDateTime = this.toLocalDateTimeInput(endDt);
      }
    } catch (e) { /* ignore */ }
  }

  // category helpers
  private ensureCategories() {
    if (!this.model.categories) this.model.categories = [];
  }

  addCategory() {
    if (!this.newCategory || !this.newCategory.name || !(Number(this.newCategory.questions) > 0)) return;
    this.ensureCategories();
    const entry = { name: String(this.newCategory.name).trim(), questions: Number(this.newCategory.questions) };
    // assign a new array to help Angular detect changes
    this.model.categories = (this.model.categories || []).concat([entry]);
    this.newCategory = { name: '', questions: 0 };
    // ensure Angular view updates when using programmatic array replacement
    try { this.cd.detectChanges(); } catch (e) { /* noop */ }
  }

  removeCategory(index: number) {
    this.ensureCategories();
    if (index >= 0 && index < this.model.categories.length) {
      this.model.categories = this.model.categories.filter((_: any, i: number) => i !== index);
      try { this.cd.detectChanges(); } catch (e) { /* noop */ }
    }
  }


  private apiUrl = `${API_BASE}/get-institutes`;

  constructor(private http: HttpClient, private router: Router, private loader: LoaderService,private cd: ChangeDetectorRef, private pageMeta: PageMetaService, private overlay: Overlay, private vcr: ViewContainerRef) {
    this.loadInstitutes();
    this.loadCountries();
    // this.loadUsers();
    this.applyEditOrView();
    // initialize default dates/times only after applying any edit/view payload
    this.initializeDefaults();
    // try to infer super-admin status from session storage user profile
    try {
      const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        this.isSuperAdmin = !!(u && (u.is_super_admin === true || u.isSuperAdmin || u.role === 'super_admin' || u.user_role === 'super_admin'));
      }
    } catch (e) { /* ignore parse errors */ }
  }

  loadCountries() {
    const url = `${API_BASE}/location-hierarchy`;
    this.http.get<any>(url).subscribe({ next: (res) => { try { const countries = res?.data?.countries || res?.countries || res?.data || []; this.countries = countries.map((c: any) => ({ code: c.country_code || c.code || c.id, name: c.country_name || c.name || c.country })); } catch (e) { this.countries = []; } }, error: () => { this.countries = []; } });
  }

  onCountryChange() {
    this.states = [];
    this.cities = [];
    if (!this.userFilters.country_id) return;
    const url = `${API_BASE}/location-hierarchy`;
    this.http.get<any>(url, { params: { country: this.userFilters.country_id } }).subscribe({
      next: (res) => {
        try {
          const statesRaw = res?.data?.states || res?.states || [];
          this.states = (Array.isArray(statesRaw) ? statesRaw : []).map((s: any) => ({ code: s.state_code || s.code || s.id, name: s.state_name || s.name || s.state }));
          let allCities: any[] = [];
          const countries = res?.data?.countries || res?.countries || [];
          if (Array.isArray(countries)) {
            countries.forEach((c: any) => { if (Array.isArray(c.cities)) allCities = allCities.concat(c.cities); if (Array.isArray(c.states)) c.states.forEach((s: any) => { if (Array.isArray(s.cities)) allCities = allCities.concat(s.cities); }); });
          }
          if (allCities.length === 0 && (res?.data?.cities || res?.cities)) allCities = res?.data?.cities || res?.cities || [];
          this.cities = (allCities || []).map((c: any) => ({ code: c.city_code || c.code || c.id, name: c.city_name || c.name || c.city }));
        } catch (e) { this.states = []; this.cities = []; }
      }, error: () => { this.states = []; this.cities = []; }
    });
  }

  goBack() {
    // navigate back to the admin exams listing
    this.router.navigate(['/view-schedule-exam']);
  }

  loadInstitutes() {
    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.institutes = res.data.map((r: any) => ({ name: r.name || r.institute_name || r.short_name || '', institute_id: r.institute_id }));
          // If the model already has an institute (for example when applying edit/view), prefer it
          try {
            if (this.model && this.model.institute) {
              const instId = this.model.institute;
              const found = this.institutes.find(i => String(i.institute_id) === String(instId));
              if (found) {
                this.model.institute = found.institute_id as any;
                this.onInstituteChange(this.model.institute);
                return;
              }
            }
          } catch (e) { /* ignore */ }

          // Fallback: If user has an institute in session storage, set it as default
          try {
            const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
            if (raw) {
              const u = JSON.parse(raw);
              const instId = u?.institute_id || u?.instituteId || u?.institute || '';
              if (instId) {
                // only set if the institute exists in the loaded list
                const found = this.institutes.find(i => String(i.institute_id) === String(instId));
                if (found) {
                  this.model.institute = found.institute_id as any;
                  // trigger change handlers to populate dependent lists
                  this.onInstituteChange(this.model.institute);
                }
              }
            }
          } catch (e) { /* ignore malformed session data */ }
        }
      },
      error: (err) => {
        console.warn('Failed to load institutes', err);
      }
    });
  }

  // when the institute select changes in the template, call this helper to load exams
  onInstituteChange(value: string) {
    this.model.institute = value || '';
    this.loadExams(this.model.institute);
    // load department/team/campus lists for the selected institute
    this.loadDepartmentList(this.model.institute);
    this.loadTeamsList(this.model.institute);
    this.loadCampusList(this.model.institute);
    this.loadUsers();
  }

  // Called when the Enable Filters checkbox toggles
  onFilterToggle(enabled: boolean) {
    this.filterEnabled = !!enabled;
    // if enabling, ensure dependent lists are loaded so filters populate
    if (this.filterEnabled) {
      try { this.loadExams(this.model.institute); } catch (e) { /* noop */ }
      try { this.loadDepartmentList(this.model.institute); } catch (e) { /* noop */ }
      try { this.loadTeamsList(this.model.institute); } catch (e) { /* noop */ }
      // open overlay if the template and anchor exist
      try { this.openFiltersOverlay(); } catch (e) { /* noop */ }
    } else {
      try { this.closeFiltersOverlay(); } catch (e) { /* noop */ }
    }
    try { this.cd.detectChanges(); } catch (e) { /* noop */ }
  }

  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;
  @ViewChild('userFiltersBtn', { read: ElementRef }) userFiltersBtn!: ElementRef;
  @ViewChild('filtersPaneluser') filtersPanelUserTpl!: TemplateRef<any>;
  @ViewChild('filtersPanelUserAnchor') filtersPanelUserAnchorTpl!: TemplateRef<any>;
  private filtersOverlayRef: OverlayRef | null = null;
  private userFiltersOverlayRef: OverlayRef | null = null;
  // display mode: 'anchor' = below filters button, 'center' = centered on screen
  filtersPanelPosition: 'anchor' | 'center' = 'anchor';

  openExamFilter(): void {
    this.filterEnabled = true;
    this.onFilterToggle(true);  // if you already use this hook
  }
  openFiltersOverlay() {
    if (!this.filtersBtn) return;
    // ensure template's inner *ngIf becomes true so template content renders inside the overlay
    this.filterEnabled = true;
    if (this.filtersOverlayRef) { try { this.filtersOverlayRef.dispose(); } catch (e) { }; this.filtersOverlayRef = null; }

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.filtersBtn)
      .withPositions([
        // prefer aligning overlay to the left of the button (overlay sits left of button)
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
        { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
        { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }
      ])
      .withPush(true);

    this.filtersOverlayRef = this.overlay.create({ positionStrategy, hasBackdrop: true, backdropClass: 'cdk-overlay-transparent-backdrop', panelClass: 'overlay-filters-panel-left', scrollStrategy: this.overlay.scrollStrategies.reposition() });
    this.filtersOverlayRef.backdropClick().subscribe(() => this.closeFiltersOverlay());
    this.filtersOverlayRef.keydownEvents().subscribe((ev: any) => { if (ev.key === 'Escape') this.closeFiltersOverlay(); });

    const portal = new TemplatePortal(this.filtersPanelTpl, this.vcr);
    this.filtersOverlayRef.attach(portal);
  }

  // ensure UI flag is cleared when overlay closes
  closeFiltersOverlay() { if (this.filtersOverlayRef) { try { this.filtersOverlayRef.dispose(); } catch (e) { }; this.filtersOverlayRef = null; } this.filterEnabled = false; }

  openUserFiltersOverlay() {
    if (!this.userFiltersBtn) return;
    this.userFilterOpen = true;
    if (this.userFiltersOverlayRef) { try { this.userFiltersOverlayRef.dispose(); } catch (e) { }; this.userFiltersOverlayRef = null; }

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.userFiltersBtn)
      .withPositions([
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
        { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 }
      ])
      .withPush(true);

    this.userFiltersOverlayRef = this.overlay.create({ positionStrategy, hasBackdrop: true, backdropClass: 'cdk-overlay-transparent-backdrop', panelClass: 'overlay-filters-panel-left', scrollStrategy: this.overlay.scrollStrategies.reposition() });
    this.userFiltersOverlayRef.backdropClick().subscribe(() => this.closeUserFiltersOverlay());
    this.userFiltersOverlayRef.keydownEvents().subscribe((ev: any) => { if (ev.key === 'Escape') this.closeUserFiltersOverlay(); });

    // Attach the anchored user filters template (compact overlay panel)
    const portal = new TemplatePortal(this.filtersPanelUserAnchorTpl, this.vcr);
    this.userFiltersOverlayRef.attach(portal);
  }

  closeUserFiltersOverlay() { if (this.userFiltersOverlayRef) { try { this.userFiltersOverlayRef.dispose(); } catch (e) { }; this.userFiltersOverlayRef = null; } this.userFilterOpen = false; }

  // Open/close the Select Users filter modal
  openUserFilter() { this.userFilterOpen = true; try { this.cd.detectChanges(); } catch (e) { } }
  closeUserFilter() { this.userFilterOpen = false; try { this.cd.detectChanges(); } catch (e) { } }

  // load exams for a selected institute (populate the exam dropdown)
  examsList: Array<{ id: string; title: string }> = [];
  // raw exams array with extra metadata (description, etc.)
  examsRaw: any[] = [];
  selectedExam: any = null;
  // exam filters (UI bound)
  filterExamName = '';
  selectedDepartments: string[] = [];
  selectedTeams: string[] = [];
  filterCreationDateAfter: Date | null = null;
  filterCreationDate: Date | null = null;
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;
  filterCreatedByMe = false;
  filterEnabled = false;
  // controls the Select Users filter modal
  userFilterOpen = false;

  loadExams(instituteId: string) {
    this.loader.show();
    this.examsList = [];
    if (!instituteId) { return; }
    let url = `${API_BASE}/get-exams-list`;
    const params: string[] = [];
    params.push(`institute_id=${encodeURIComponent(instituteId)}`);
    if (this.filterExamName) params.push(`name=${encodeURIComponent(this.filterExamName)}`);
    if (this.selectedDepartments && this.selectedDepartments.length) params.push(`departments=${encodeURIComponent(this.selectedDepartments.join(','))}`);
    if (this.selectedTeams && this.selectedTeams.length) params.push(`teams=${encodeURIComponent(this.selectedTeams.join(','))}`);
    if (this.filterCreationDateAfter) params.push(`created_after=${encodeURIComponent((this.filterCreationDateAfter as Date).toISOString().slice(0, 10))}`);
    if (this.filterCreationDate) params.push(`created_before=${encodeURIComponent((this.filterCreationDate as Date).toISOString().slice(0, 10))}`);
    if (this.filterStartDate) params.push(`start_after=${encodeURIComponent((this.filterStartDate as Date).toISOString().slice(0, 10))}`);
    if (this.filterEndDate) params.push(`start_before=${encodeURIComponent((this.filterEndDate as Date).toISOString().slice(0, 10))}`);
    if (this.filterCreatedByMe) {
      try {
        const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
        if (raw) {
          const obj = JSON.parse(raw);
          const userId = obj?.user_id || obj?.id || obj?._id;
          if (userId) {
            params.push(`created_by=${encodeURIComponent(String(userId))}`);
          }
        }
      } catch (e) { }
    }
    if (params.length) url += `?${params.join('&')}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.examsRaw = Array.isArray(arr) ? arr : [];
        this.examsList = this.examsRaw.map((e: any) => ({ id: e.exam_id || e.id || e.test_id || e._id, title: e.title || e.name || '' }));
        // if an exam id is already selected, update selectedExam
        if (this.model && this.model.exam_id) this.onExamChange(this.model.exam_id);
      },
      error: (err) => {
        console.warn('Failed to load exams list', err);
        this.examsList = [];
      },
      complete: () => { this.loader.hide(); }
    });
  }

  // Called when Apply button is clicked (explicit apply wrapper)
  applyFilters() {
    this.loader.show();
    // Build the exams API URL using the active filters (include departments/teams explicitly)
    let url = `${API_BASE}/get-exams-list`;
    const params: string[] = [];
    if (this.model && this.model.institute) params.push(`institute_id=${encodeURIComponent(this.model.institute)}`);
    if (this.filterExamName) params.push(`name=${encodeURIComponent(this.filterExamName)}`);
    if (this.selectedDepartments && this.selectedDepartments.length) params.push(`departments=${encodeURIComponent(this.selectedDepartments.join(','))}`);
    if (this.selectedTeams && this.selectedTeams.length) params.push(`teams=${encodeURIComponent(this.selectedTeams.join(','))}`);
    if (this.filterCreationDateAfter) params.push(`created_after=${encodeURIComponent((this.filterCreationDateAfter as Date).toISOString().slice(0, 10))}`);
    if (this.filterCreationDate) params.push(`created_before=${encodeURIComponent((this.filterCreationDate as Date).toISOString().slice(0, 10))}`);
    if (this.filterCreatedByMe) {
      try {
        const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
        if (raw) {
          const obj = JSON.parse(raw);
          const userId = obj?.user_id || obj?.id || obj?._id;
          if (userId) {
            params.push(`created_by=${encodeURIComponent(String(userId))}`);
          }
        }
      } catch (e) { }
    }
    if (params.length) url += `?${params.join('&')}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.examsRaw = Array.isArray(arr) ? arr : [];
        this.examsList = this.examsRaw.map((e: any) => ({ id: e.exam_id || e.id || e.test_id || e._id, title: e.title || e.name || '' }));
        if (this.model && this.model.exam_id) {
          const stillExists = this.examsRaw.find((e: any) => String(e.exam_id || e.id || e._id) === String(this.model.exam_id));
          if (!stillExists) this.selectedExam = null;
        }
      },
      error: (err) => {
        console.warn('Failed to apply exam filters', err);
        this.examsList = [];
        this.examsRaw = [];
        this.selectedExam = null;
      },
      complete: () => {
        this.loader.hide();
      }
    });
  }

  // Reset filter fields to defaults and reload exams
  resetFilters() {
    this.filterExamName = '';
    this.selectedDepartments = [];
    this.selectedTeams = [];
    this.filterCreationDateAfter = null;
    this.filterCreationDate = null;
    this.filterCreatedByMe = false;
    // reload exams without filters
    this.loadExams(this.model.institute);
  }

  // When exam select value changes, find details and populate selectedExam
  onExamChange(examId: string) {
    this.model.exam_id = examId || '';
    this.selectedExam = null;
    if (!examId) return;
    const found = (this.examsRaw || []).find((e: any) => String(e.exam_id || e.id || e.test_id || e._id) === String(examId));
    if (found) this.selectedExam = found;
    // otherwise optionally fetch exam detail from API (not implemented)
  }

  // load department list for a specific institute
  loadDepartmentList(instituteId: string) {
    this.departmentList = [];
    if (!instituteId) return;
    const url = `${API_BASE}/get-department-list?institute_id=${encodeURIComponent(instituteId)}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        // normalize to strings
        this.departmentList = arr.map((d: any) => (d.name || d.department_name || d.department || d).toString()).filter((s: any) => !!s);
      }, error: (err) => { console.warn('Failed to load department list', err); this.departmentList = []; }
    });
  }

  // load teams list for a specific institute
  loadTeamsList(instituteId: string) {
    this.teamList = [];
    if (!instituteId) return;
    const url = `${API_BASE}/get-teams-list?institute_id=${encodeURIComponent(instituteId)}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.teamList = arr.map((t: any) => (t.name || t.team_name || t.team || t).toString()).filter((s: any) => !!s);
      }, error: (err) => { console.warn('Failed to load teams list', err); this.teamList = []; }
    });
  }

  // load campus list for a specific institute
  loadCampusList(instituteId: string) {
    this.campusList = [];
    if (!instituteId) return;
    const url = `${API_BASE}/get-campus-list?institute_id=${encodeURIComponent(instituteId)}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.campusList = arr.map((c: any) => (c.name || c.campus_name || c.campus || c).toString()).filter((s: any) => !!s);
      }, error: (err) => { console.warn('Failed to load campus list', err); this.campusList = []; }
    });
  }

  schedule() {
    // build payload matching the DB columns described by the user
    const start = this.model.startDateTime || `${this.model.startDate} ${this.model.startTime}`;
    const duration = Number(this.model.durationMin) || 10;
    const total_questions = Number(this.model.totalQuestions) || 0;
    const number_of_attempts = Number(this.model.maxAttempts) || 1;

    // compute end_time by adding duration minutes to the start datetime
    // If explicit endDate/endTime provided, prefer those values for end_time
    let startIso: string | null = null;
    let endIso: string | null = null;
    // Helper: robust Date parser that accepts:
    // - Date objects
    // - ISO strings (with T)
    // - space-separated datetimes like 'YYYY-MM-DD HH:mm'
    // - separate date (YYYY-MM-DD) and time (HH:mm) parts
    const parseDateInput = (dateLike: any, timeLike?: any): Date | null => {
      try {
        // Date instance
        if (dateLike instanceof Date) {
          return isNaN(dateLike.getTime()) ? null : dateLike;
        }

        // numeric timestamp
        if (typeof dateLike === 'number' && !isNaN(dateLike)) {
          const d = new Date(dateLike);
          return isNaN(d.getTime()) ? null : d;
        }

        if (!dateLike && !timeLike) return null;

        const sDate = String(dateLike || '').trim();
        const sTime = (typeof timeLike !== 'undefined' && timeLike !== null) ? String(timeLike).trim() : '';

        // If dateLike already contains a time part (T or space), try direct parse first
        if (sDate.includes('T') || sDate.includes(' ')) {
          // normalize space to 'T' for Date parsing
          const tryIso = sDate.includes('T') ? sDate : sDate.replace(' ', 'T');
          const d = new Date(tryIso);
          if (!isNaN(d.getTime())) return d;
          // sometimes datetime-local strings lack seconds/zone - try appending ':00' where appropriate
          const alt = tryIso.replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/, '$1:00');
          const d2 = new Date(alt);
          if (!isNaN(d2.getTime())) return d2;
        }

        // If only date part provided (YYYY-MM-DD or with slashes), parse numbers
        const dateMatch = sDate.match(/^(\d{4})[^\d]?(\d{1,2})[^\d]?(\d{1,2})$/);
        if (dateMatch) {
          const y = Number(dateMatch[1]);
          const m = Number(dateMatch[2]);
          const day = Number(dateMatch[3]);
          let hh = 0, mm = 0;
          if (sTime) {
            const tparts = sTime.split(':').map((v: any) => Number(v));
            if (!isNaN(tparts[0])) hh = tparts[0];
            if (!isNaN(tparts[1])) mm = tparts[1];
          }
          const dt = new Date(y, (m || 1) - 1, day || 1, hh || 0, mm || 0);
          if (!isNaN(dt.getTime())) return dt;
        }

        // As a last resort, attempt Date() on combined strings
        if (sDate) {
          const combined = sTime ? `${sDate}T${sTime}` : sDate;
          const d3 = new Date(combined);
          if (!isNaN(d3.getTime())) return d3;
        }
      } catch (e) {
        // fallthrough to return null
      }
      return null;
    };

    // Prefer explicit split fields (startDate + startTime) if provided — this ensures edits to time inputs
    let dt: Date | null = null;
    if (this.model.startDate && this.model.startTime) {
      dt = parseDateInput(this.model.startDate, this.model.startTime);
      if (!dt) { notify('Invalid start date or time', 'error'); return; }
    } else if (this.model.startDateTime) {
      dt = parseDateInput(this.model.startDateTime);
      if (!dt) { notify('Invalid start datetime', 'error'); return; }
    }

    if (dt) startIso = dt.toISOString();

    // Build end time
    let endDt: Date | null = null;
    if (this.model.endDate && this.model.endTime) {
      endDt = parseDateInput(this.model.endDate, this.model.endTime);
      if (!endDt) { notify('Invalid end date or time', 'error'); return; }
      endIso = endDt.toISOString();
    } else if (this.model.endDateTime) {
      endDt = parseDateInput(this.model.endDateTime);
      if (!endDt) { notify('Invalid end datetime', 'error'); return; }
      endIso = endDt.toISOString();
    } else if (dt) {
      const computed = new Date(dt.getTime() + duration * 60000);
      endIso = computed.toISOString();
    }

    const payload: {
      title: any;
      exam_id: any;
      institute_id: any;
      duration_mins: number;
      total_questions: number;
      number_of_attempts: number;
      assigned_user_ids: string[];
      categories: any;
      start_time: string | null;
      end_time: string | null;
      created_by: string;
      published: any;
      userreview: any;
      schedule_id?: any;
      updated_by?: any;
    } = {
      title: this.model.schedulerName || this.model.testName || 'Untitled Test',
      exam_id: this.model.exam_id || null,
      institute_id: this.model.institute, // bind to institute_id from the select
      duration_mins: duration,
      total_questions,
      number_of_attempts,
      assigned_user_ids: this.selectedUsers || [],
      categories: Array.isArray(this.model.categories) ? this.model.categories : undefined,
      start_time: startIso,
      end_time: endIso,
      created_by: sessionStorage.getItem('user_id') || sessionStorage.getItem('username') || 'admin',
      published: this.model.publish || false,
      userreview: this.model.userreview || false
    };

    // If editing an existing schedule, call update endpoint, otherwise create
    const scheduleId = this.model && (this.model.schedule_id || this.model.id || this.model._id);
    if (scheduleId) {
      // include schedule id and current_user as updated_by for auditing
      payload['schedule_id'] = scheduleId;
      try {
        const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
        const u = raw ? JSON.parse(raw) : null;
        payload['updated_by'] = (u && (u.user_id || u.id || u._id)) || sessionStorage.getItem('username') || 'admin';
      } catch (e) {
        payload['updated_by'] = sessionStorage.getItem('username') || 'admin';
      }
      const putUrl = `${API_BASE}/update-exam-schedule`;
      this.http.post<any>(putUrl, payload).subscribe({
        next: (resp) => {
          try { const msg = resp?.statusMessage || resp?.message || 'Scheduled test updated successfully'; const ok = typeof resp?.status === 'undefined' ? true : !!resp.status; notify(msg, ok ? 'success' : 'error'); } catch(e){}
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to update scheduled test', err);
          try { notify(err?.error?.statusMessage || err?.error?.message || 'Failed to update scheduled test. See console for details.', 'error'); } catch(e){}
        }
      });
    } else {
      // POST to backend API to persist the scheduled test
      const postUrl = `${API_BASE}/add-exam-schedule`;
      this.http.post<any>(postUrl, payload).subscribe({
        next: (resp) => {
          try { const msg = resp?.statusMessage || resp?.message || 'Scheduled test saved successfully'; const ok = typeof resp?.status === 'undefined' ? true : !!resp.status; notify(msg, ok ? 'success' : 'error'); } catch(e){}
          // on success add to local scheduled list for UI
          this.scheduled.push({ institute: this.model.institute, testName: this.model.testName, start, duration, published: this.model.publish });
          this.model.testName = '';
        },
        error: (err) => {
          console.error('Failed to save scheduled test', err);
          try { notify(err?.error?.statusMessage || err?.error?.message || 'Failed to save scheduled test. See console for details.', 'error'); } catch(e){}
        }
      });
    }
  }

  applyEditOrView() {
    try {
      const rawEdit = sessionStorage.getItem('edit_exam');
      const rawView = sessionStorage.getItem('view_exam');
      if (rawEdit) {
        const e = JSON.parse(rawEdit);
        // preserve schedule id for update detection
        this.model.schedule_id = e.schedule_id || e.id || e._id || e.scheduleId || null;
        // map fields into the form model where possible
        this.model.institute = e.institute || e.institute_id || '';
        // try multiple shapes for exam reference
        this.model.exam_id = e.exam_id || (e.exam && (e.exam.exam_id || e.exam.id || e.exam._id || e.exam.test_id)) || e.test_id || '';
        // scheduler name used in template; also set legacy testName for compatibility
        this.model.schedulerName = e.title || e.testName || e.schedulerName || '';
        this.model.testName = this.model.testName || this.model.schedulerName;
        // ensure exams dropdown is loaded for the institute before attempting to bind exam id
        try { this.loadExams(this.model.institute); } catch (e) { /* noop */ }
        // try to parse start_time ISO into combined datetime-local format and legacy date/time
        if (e.start_time) {
          const dt = new Date(e.start_time);
          // legacy split fields
          this.model.startDate = dt.toISOString().slice(0, 10);
          this.model.startTime = dt.toTimeString().slice(0, 5);
          // combined field used by the datetime-local input
          this.model.startDateTime = this.toLocalDateTimeInput(dt);
          // end time: prefer explicit end_time, otherwise compute using duration
          if (e.end_time) {
            const edt = new Date(e.end_time);
            this.model.endDateTime = this.toLocalDateTimeInput(edt);
            this.model.endDate = edt.toISOString().slice(0, 10);
            this.model.endTime = edt.toTimeString().slice(0, 5);
          } else {
            const dur = Number(e.duration_mins || e.duration || this.model.durationMin) || this.model.durationMin;
            const endDt = new Date(dt.getTime() + dur * 60000);
            this.model.endDateTime = this.toLocalDateTimeInput(endDt);
            this.model.endDate = endDt.toISOString().slice(0, 10);
            this.model.endTime = endDt.toTimeString().slice(0, 5);
          }
        }
        this.model.durationMin = e.duration_mins || e.duration || this.model.durationMin;
        this.model.maxAttempts = e.number_of_attempts || this.model.maxAttempts;
        // coerce various publish/user-review field variants into booleans
        try {
          const toBool = (v: any) => {
            if (typeof v === 'boolean') return v;
            if (typeof v === 'number') return v === 1;
            if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
            return !!v;
          };
          const pubCandidates = [e.publish, e.published, e.is_published, e.isPublished, e.published_flag, (e.settings && e.settings.publish)];
          for (const c of pubCandidates) { if (typeof c !== 'undefined') { this.model.publish = toBool(c); break; } }
          const reviewCandidates = [e.user_review, e.userreview, e.review_available, e.review, e.allow_review, e.review_enabled, e.is_reviewable, (e.settings && e.settings.user_review)];
          for (const c of reviewCandidates) { if (typeof c !== 'undefined') { this.model.userreview = toBool(c); break; } }
        } catch (err) { /* ignore */ }
        // clear edit after applying
        // normalize assigned users so the Select Users step pre-selects them
        try {
          const au = e.assigned_users || e.assignedUsers || e.assignees || e.users || e.assigned_user_ids || [];
          let normalized: string[] = [];
          if (!au) normalized = [];
          else if (Array.isArray(au)) {
            normalized = au.map((x: any) => {
              if (!x && x !== 0) return '';
              if (typeof x === 'string' || typeof x === 'number') return String(x);
              if (typeof x === 'object') return String(x.user_id || x.id || x._id || x.uid || x.userId || x.value || '');
              return String(x);
            }).filter((v: string) => v && v.length);
          } else if (typeof au === 'string') {
            normalized = au.split(',').map((s: string) => s.trim()).filter((s: string) => s.length);
          } else if (typeof au === 'object') {
            const v = au.user_id || au.id || au._id || au.uid || au.userId || '';
            normalized = v ? [String(v)] : [];
          }
          this.selectedUsers = normalized;
          // if users list is not yet loaded or institute differs, attempt to load users for the institute
          try { if (!this.users || this.users.length === 0) this.loadUsers(); } catch (e) { }
        } catch (err) { /* ignore normalization errors */ }
        sessionStorage.removeItem('edit_exam');
      } else if (rawView) {
        const v = JSON.parse(rawView);
        // set schedule id for view mode as well
        this.model.schedule_id = v.schedule_id || v.id || v._id || v.scheduleId || null;
        this.model.institute = v.institute || v.institute_id || '';
        // exam id from view payload (similar shapes as edit)
        this.model.exam_id = v.exam_id || (v.exam && (v.exam.exam_id || v.exam.id || v.exam._id || v.exam.test_id)) || v.test_id || '';
        this.model.schedulerName = v.title || v.testName || v.schedulerName || '';
        this.model.testName = this.model.testName || this.model.schedulerName;
        if (v.start_time) {
          const dt = new Date(v.start_time);
          this.model.startDate = dt.toISOString().slice(0, 10);
          this.model.startTime = dt.toTimeString().slice(0, 5);
          this.model.startDateTime = this.toLocalDateTimeInput(dt);
          if (v.end_time) {
            const edt = new Date(v.end_time);
            this.model.endDateTime = this.toLocalDateTimeInput(edt);
            this.model.endDate = edt.toISOString().slice(0, 10);
            this.model.endTime = edt.toTimeString().slice(0, 5);
          }
        }
        try { this.loadExams(this.model.institute); } catch (e) { /* noop */ }
        this.model.durationMin = v.duration_mins || v.duration || this.model.durationMin;
        this.model.maxAttempts = v.number_of_attempts || this.model.maxAttempts;
        try {
          const toBool = (v: any) => {
            if (typeof v === 'boolean') return v;
            if (typeof v === 'number') return v === 1;
            if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
            return !!v;
          };
          const pubCandidates = [v.publish, v.published, v.is_published, v.isPublished, v.published_flag, (v.settings && v.settings.publish)];
          for (const c of pubCandidates) { if (typeof c !== 'undefined') { this.model.publish = toBool(c); break; } }
          const reviewCandidates = [v.user_review, v.userreview, v.review_available, v.review, v.allow_review, v.review_enabled, v.is_reviewable, (v.settings && v.settings.user_review)];
          for (const c of reviewCandidates) { if (typeof c !== 'undefined') { this.model.userreview = toBool(c); break; } }
        } catch (err) { /* ignore */ }
        this.readOnly = true;
        sessionStorage.removeItem('view_exam');
          // also normalize assigned users for view mode so UI highlights them if needed
          try {
            const au = v.assigned_users || v.assignedUsers || v.assignees || v.users || v.assigned_user_ids || [];
            let normalized: string[] = [];
            if (!au) normalized = [];
            else if (Array.isArray(au)) {
              normalized = au.map((x: any) => {
                if (!x && x !== 0) return '';
                if (typeof x === 'string' || typeof x === 'number') return String(x);
                if (typeof x === 'object') return String(x.user_id || x.id || x._id || x.uid || x.userId || x.value || '');
                return String(x);
              }).filter((v: string) => v && v.length);
            } else if (typeof au === 'string') {
              normalized = au.split(',').map((s: string) => s.trim()).filter((s: string) => s.length);
            } else if (typeof au === 'object') {
              const val = au.user_id || au.id || au._id || au.uid || au.userId || '';
              normalized = val ? [String(val)] : [];
            }
            this.selectedUsers = normalized;
            try { if (!this.users || this.users.length === 0) this.loadUsers(); } catch (e) { }
          } catch (err) { /* ignore */ }
      }
    } catch (e) { /* ignore parse errors */ }
  }

  /**
   * Compute end datetime based on model.startDate, model.startTime and model.durationMin
   * Returns a human-friendly local datetime string or empty string when not available
   */
  get endTimePreview(): string {
    try {
      // If explicit end provided, show that
      if (this.model.endDate && this.model.endTime) {
        const [ey, em, ed] = (this.model.endDate || '').split('-').map((v: any) => Number(v));
        const [eh, emin] = (this.model.endTime || '').split(':').map((v: any) => Number(v));
        if (Number.isNaN(ey) || Number.isNaN(em) || Number.isNaN(ed)) return '';
        const endDt = new Date(ey, (em || 1) - 1, ed, eh || 0, emin || 0);
        return endDt.toLocaleString();
      }

      if (!this.model.startDate || !this.model.startTime) return '';
      const [y, m, d] = (this.model.startDate || '').split('-').map((v: any) => Number(v));
      const [hh, mm] = (this.model.startTime || '').split(':').map((v: any) => Number(v));
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return '';
      const dt = new Date(y, (m || 1) - 1, d, hh || 0, mm || 0);
      const dur = Number(this.model.durationMin) || 0;
      const end = new Date(dt.getTime() + dur * 60000);
      return end.toLocaleString();
    } catch (e) { return ''; }
  }

  // Return a readable institute name for a given institute id
  getInstituteName(instId: any): string {
    if (!instId) return '';
    const found = (this.institutes || []).find(i => String(i.institute_id) === String(instId));
    return found ? (found.name || '') : '';
  }

  // Lookup user name by id from currently loaded users
  getUserNameById(userId: any): string {
    if (!userId) return '';
    const found = (this.users || []).find(u => String(u.id) === String(userId));
    return found ? (found.name || '') : '';
  }

  // Small date formatter for review display (accepts date-like strings or Date objects)
  formatDate(v: any): string {
    if (!v) return '';
    try {
      const d = (v instanceof Date) ? v : new Date(v);
      if (isNaN(d.getTime())) return String(v);
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dayName = days[d.getDay()];
      const dd = String(d.getDate()).padStart(2,'0');
      const mmm = months[d.getMonth()];
      const yyyy = d.getFullYear();
      return `${dayName} ${dd}-${mmm}-${yyyy}`;
    } catch (e) { return String(v); }
  }
}
