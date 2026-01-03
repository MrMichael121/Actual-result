import { Component, TemplateRef, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { AuthService } from 'src/app/home/service/auth.service';
import { API_BASE } from 'src/app/shared/api.config';
import { notify } from 'src/app/shared/global-notify';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatButtonModule, MatIconModule, MatListModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, RouterModule, HttpClientModule, MatStepperModule, OverlayModule, PortalModule],
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.scss']
})
export class CreateExamComponent implements OnInit, AfterViewInit, OnDestroy {
  title = '';
  description = '';
  institute = '';
  durationMinutes: number | null = null;
  passMark: number | null = null;
  startDateTime = '';

  institutes: Array<{ id: string; name: string }> = [];
  // categories UI model
  categories: Array<{ category_id: string; name: string }> = [];
  selectedCategory = '';
  categoryCtrl = new FormControl('');
  filteredCategories$: Observable<any[]> = of([]);
  newCategory: { questions: number; randomize_questions?: boolean } = { questions: 0, randomize_questions: false };
  model: { categories?: Array<{ category_id?: string; name?: string; questions: number; question_ids?: any[]; randomize_questions?: boolean }> } = { categories: [] };
  readOnly = false;
  filterEnabled = false;
  @ViewChild('filterAnchor', { static: false }) filterAnchor?: ElementRef;
  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;
  
  private _docClickHandler: ((ev: any) => void) | null = null;
  // filter state for categories
  selectedDepartments: string[] = [];
  selectedTeams: string[] = [];
  filterCreationDateAfter: Date | null = null;
  filterCreationDate: Date | null = null;
  filterCreatedByMe: boolean = false;
  filterPublicAccess: boolean | null = null;
  departments: Array<{ id: string; name: string }> = [];
  teams: Array<{ id: string; name: string }> = [];

  // question selection for currently selected category
  questionsForCategory: Array<any> = [];
  selectedQuestionIds: string[] = [];
  selectAllQuestions = false;

  private baseUrl = 'http://127.0.0.1:5001/edu/api';

  isSuperAdmin = false;
  private _subs: Subscription | null = null;
  editMode: boolean = false;
  editExamId: string | null = null;
  private filtersOverlayRef: OverlayRef | null = null;

  constructor(private router: Router, private http: HttpClient, private auth: AuthService, private pageMeta: PageMetaService, private overlay: Overlay, private vcr: ViewContainerRef) {
    try {
      this._subs = this.auth.user$.subscribe((user: any) => {
        this.isSuperAdmin = !!user && ['super_admin', 'superadmin', 'super-admin'].includes((user.role || '').toLowerCase());
      });
    } catch (e) { /* ignore */ }
  }

  openFiltersOverlay() {
    if (!this.filtersBtn) return;
    this.filterEnabled = true;
    if (this.filtersOverlayRef) { try { this.filtersOverlayRef.dispose(); } catch (e) { }; this.filtersOverlayRef = null; }

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.filtersBtn)
      .withPositions([
        // prefer right side, vertically centered relative to trigger
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
        // fallback: place below trigger
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 }
      ])
      .withPush(true);

    this.filtersOverlayRef = this.overlay.create({ positionStrategy, hasBackdrop: true, backdropClass: 'cdk-overlay-transparent-backdrop', panelClass: 'overlay-filters-panel', scrollStrategy: this.overlay.scrollStrategies.reposition() });
    this.filtersOverlayRef.backdropClick().subscribe(() => this._closeOverlayInternal());
    this.filtersOverlayRef.keydownEvents().subscribe((ev: any) => { if (ev.key === 'Escape') this._closeOverlayInternal(); });

    const portal = new TemplatePortal(this.filtersPanelTpl, this.vcr);
    this.filtersOverlayRef.attach(portal);
  }

  closeFiltersOverlay() { if (this.filtersOverlayRef) { try { this.filtersOverlayRef.dispose(); } catch (e) { }; this.filtersOverlayRef = null; } }
  
  // ensure UI flag clears when overlay is closed programmatically
  private _closeOverlayInternal() {
    try { this.filtersOverlayRef?.dispose(); } catch(e) {}
    this.filtersOverlayRef = null;
    this.filterEnabled = false;
  }

  ngAfterViewInit(): void {
    try {
      this._docClickHandler = (ev: any) => {
        if (!this.filterEnabled) return;
        try {
          const anchorEl = this.filterAnchor?.nativeElement;
          if (!anchorEl) return;
          if (anchorEl.contains(ev.target)) return; // click inside anchor — keep open
          // clicked outside — close filter
          this.filterEnabled = false;
        } catch (e) { /* ignore */ }
      };
      document.addEventListener('click', this._docClickHandler);
    } catch (e) { /* ignore */ }
  }

  ngOnDestroy(): void {
    try { this._subs?.unsubscribe(); } catch (e) { }
    try { if (this._docClickHandler) document.removeEventListener('click', this._docClickHandler); } catch (e) { }
  }

  // Called when the Enable Filters checkbox toggles
  onFilterToggle(enabled: boolean) {
    this.filterEnabled = !!enabled;
  }
  ngOnInit(): void {
    if (this.editMode) {
      this.pageMeta.setMeta('Update Exam', 'Update the exam details and click Update to save changes.')
    } else {
      this.pageMeta.setMeta('Create Exam', 'Fill required fields and save the exam.')
    }


    // load institutes and edit payload, then ensure institute selection is reconciled
    this.loadInstitutes();
    // load edit payload first so it can override session
    this.loadEditExam();

    // if an institute is already present (from edit payload), ensure dependent lists load
    if (this.institute) {
      try { this.onInstituteChange(this.institute); } catch (e) { /* ignore */ }
    } else {
      // try to auto-select from session user
      try {
        const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          const inst = u?.institute_id || u?.instituteId || (u?.institute && (u.institute.institute_id || u.institute.id || u.institute)) || u?.institute || '';
          if (inst && !this.isSuperAdmin) {
            this.institute = String(inst);
            try { this.onInstituteChange(this.institute); } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }
    }

    // ensure categories are loaded (if onInstituteChange didn't already load scoped categories)
    try { this.loadCategories(); } catch (e) { /* ignore */ }
  }

  /**
   * If an exam has been marked for edit (stored in sessionStorage by the list page),
   * populate the form with its values so the user can edit and save.
   */
  loadEditExam() {
    try {
      const raw = sessionStorage.getItem('edit_exam');
      if (!raw) return;
      const e = JSON.parse(raw);
      if (!e) return;
      this.editMode = true;
      this.editExamId = e.exam_id || e.test_id || e.id || null;
      this.title = e.title || e.name || '';
      this.description = e.description || e.desc || '';
      this.institute = (e.institute && (e.institute.institute_id || e.institute.institute_id)) || e.institute_id || '';
      this.durationMinutes = e.duration_mins || e.duration || null;
      this.passMark = e.pass_mark ?? e.passMark ?? null;
      this.startDateTime = e.start_time || e.start || '';

      // normalize categories if present in the payload
      const srcCats = Array.isArray(e.categories) ? e.categories : (Array.isArray(e.category_list) ? e.category_list : []);
      this.model.categories = srcCats.map((c: any) => ({
        category_id: c.category_id || c.id || c._id || c.categoryId || '',
        name: c.category_name || c.name || c.title || '',
        questions: Number(c.questions || c.total_questions || 0) || 0,
        question_ids: Array.isArray(c.question_ids) ? c.question_ids : (Array.isArray(c.questionIds) ? c.questionIds : []),
        randomize_questions: typeof c.randomize_questions !== 'undefined' ? !!c.randomize_questions : false
      }));
    } catch (_) { /* ignore malformed edit payload */ }
  }

  setStartNow() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - tz).toISOString().slice(0, 16);
    this.startDateTime = local;
  }

  addCategory() {
    const catId = this.selectedCategory || '';
    const q = Number(this.newCategory.questions) || 0;
    const randomize = !!this.newCategory.randomize_questions;
    // Validation rules:
    // - selectedCategory is mandatory
    // - at least one of selectedQuestionIds or newCategory.questions must be provided
    // - if randomize is selected, newCategory.questions is mandatory and must be > 0
    if (!catId) return;
    const hasSelectedQuestions = Array.isArray(this.selectedQuestionIds) && this.selectedQuestionIds.length > 0;
    if (randomize) {
      if (q <= 0) { notify('Please provide No. of questions when Randomize is selected', 'error'); return; }
    } else {
      if (!hasSelectedQuestions && q <= 0) { notify('Please select questions or provide No. of questions', 'error'); return; }
    }
    const cat = this.categories.find(c => c.category_id === catId);
    const name = cat ? cat.name : '';
    const computedQuestions = q > 0 ? q : (Array.isArray(this.selectedQuestionIds) ? this.selectedQuestionIds.length : 0);
    const item = { category_id: catId, name, questions: computedQuestions, question_ids: [...this.selectedQuestionIds], randomize_questions: randomize };
    this.model.categories = [...(this.model.categories || []), item];
    this.newCategory = { questions: 0, randomize_questions: false };
    // clear selection after add
    this.selectedCategory = '';
    this.questionsForCategory = [];
    this.selectedQuestionIds = [];
    this.selectAllQuestions = false;
  }

  removeCategory(index: number) {
    if (!Array.isArray(this.model.categories)) return;
    this.model.categories = this.model.categories.filter((_, i) => i !== index);
  }

  loadInstitutes() {
    const url = `${API_BASE}/get-institute-list`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        this.institutes = arr.map((r: any) => ({ id: String(r.institute_id || r.id || r.instituteId || ''), name: r.short_name || r.name || r.institute_name || '' }));

        // If an institute is already selected (from edit payload or elsewhere), try to reconcile
        try {
          if (this.institute) {
            const want = String(this.institute);
            const found = this.institutes.find(x => String(x.id) === want || String(x.id) === String(Number(want || 0)));
            if (found) {
              this.institute = String(found.id);
              this.onInstituteChange(this.institute);
              return;
            }
          }
        } catch (e) { /* ignore */ }

        // Fallback: try reading user's institute from sessionStorage
        try {
          const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            const instId = u?.institute_id || u?.instituteId || (u?.institute && (u.institute.institute_id || u.institute.id || u.institute)) || u?.institute || '';
            if (instId) {
              const found = this.institutes.find(x => String(x.id) === String(instId));
              if (found) {
                this.institute = String(found.id);
                this.onInstituteChange(this.institute);
              }
            }
          }
        } catch (e) { /* ignore malformed session data */ }

      }, error: () => { /* ignore - keep empty list */ }
    });
  }

  loadCategories() {
    // default: load all categories; this method is also called with filters by onApply
    const url = `${API_BASE}/get-categories-list`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        this.categories = arr.map((c: any) => ({ category_id: c.category_id || c.id || c._id || '', name: c.name || c.category_name || c.title || '' }));
        // emit full list initially
        this.filteredCategories$ = of(this.categories || []);
        try{
          this.filteredCategories$ = this.categoryCtrl.valueChanges.pipe(
            startWith(''),
            map((val:any) => {
              const q = (typeof val === 'string' ? val : (val?.name || '')).toLowerCase();
              return (this.categories || []).filter((c:any) => (c.name || '').toLowerCase().includes(q));
            })
          );
        }catch(e){ this.filteredCategories$ = of(this.categories || []); }
      }, error: (err) => { console.warn('Failed to load categories', err); this.categories = []; }
    });
  }

  displayCategory(c: any) { return c ? (c.name || c.category_name || '') : ''; }

  onCategoryAutocompleteSelected(c: any) {
    if (!c) return;
    this.selectedCategory = c.category_id || c.id || '';
    this.loadQuestionsForCategory(this.selectedCategory);
  }

  // load categories with filters (called by Apply)
  loadCategoriesWithFilters(filters: any = {}) {
    const base = `${API_BASE}/get-categories-list`;
    const params: string[] = [];
    if (filters.institute_id) params.push(`institute_id=${encodeURIComponent(filters.institute_id)}`);
    if (filters.departments && filters.departments.length) params.push(`departments=${encodeURIComponent(filters.departments.join(','))}`);
    if (filters.teams && filters.teams.length) params.push(`teams=${encodeURIComponent(filters.teams.join(','))}`);
    if (filters.created_after) params.push(`created_after=${encodeURIComponent(filters.created_after)}`);
    if (filters.created_before) params.push(`created_before=${encodeURIComponent(filters.created_before)}`);
    if (typeof filters.created_by_me !== 'undefined' && filters.created_by_me) params.push(`created_by_me=true`);
    if (typeof filters.public_access !== 'undefined' && filters.public_access !== null) params.push(`public_access=${encodeURIComponent(String(filters.public_access))}`);
    const url = params.length ? `${base}?${params.join('&')}` : base;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        this.categories = arr.map((c: any) => ({ category_id: c.category_id || c.id || c._id || '', name: c.name || c.category_name || c.title || '' }));
      }, error: (err) => { console.warn('Failed to load categories with filters', err); this.categories = []; }
    });
  }

  onApply() {
    const filters: any = { institute_id: this.institute };
    if (this.selectedDepartments && this.selectedDepartments.length) filters.departments = this.selectedDepartments;
    if (this.selectedTeams && this.selectedTeams.length) filters.teams = this.selectedTeams;
    if (this.filterCreationDateAfter) filters.created_after = (this.filterCreationDateAfter as Date).toISOString().slice(0, 10);
    if (this.filterCreationDate) filters.created_before = (this.filterCreationDate as Date).toISOString().slice(0, 10);
    if (this.filterCreatedByMe) filters.created_by_me = true;
    if (this.filterPublicAccess !== null && typeof this.filterPublicAccess !== 'undefined') filters.public_access = this.filterPublicAccess;
    this.loadCategoriesWithFilters(filters);
  }

  onReset() {
    this.selectedDepartments = [];
    this.selectedTeams = [];
    this.filterCreationDateAfter = null;
    this.filterCreationDate = null;
    this.filterCreatedByMe = false;
    this.filterPublicAccess = null;
    // reload categories for current institute if any
    this.loadCategoriesWithFilters({ institute_id: this.institute });
  }

  onInstituteChange(value: any) {
    const v = value !== undefined && value !== null ? value : '';
    this.institute = v;
    if (this.institute) {
      this.loadDepartments(this.institute);
      this.loadTeams(this.institute);
      // also reload categories scoped to this institute
      this.loadCategoriesWithFilters({ institute_id: this.institute });
    } else {
      this.departments = [];
      this.teams = [];
      this.loadCategories();
    }
  }

  loadDepartments(instId?: string) {
    if (!instId) { this.departments = []; return; }
    const url = `${API_BASE}/get-department-list`;
    this.http.get<any>(url, { params: { institute_id: instId } }).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        this.departments = arr.map((d: any) => ({ id: d.dept_id || d.id || d.deptId, name: d.name || d.dept_name || d.title || '' }));
      }, error: (err) => { console.warn('Failed to load departments', err); this.departments = []; }
    });
  }

  loadTeams(instId?: string) {
    if (!instId) { this.teams = []; return; }
    const url = `${API_BASE}/get-teams-list`;
    this.http.get<any>(url, { params: { institute_id: instId } }).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        this.teams = arr.map((t: any) => ({ id: t.team_id || t.id || t.teamId, name: t.name || t.team_name || t.title || '' }));
      }, error: (err) => { console.warn('Failed to load teams', err); this.teams = []; }
    });
  }

  onCategoryChange(catId: string) {
    this.selectedCategory = catId || '';
    this.loadQuestionsForCategory(this.selectedCategory);
  }

  loadQuestionsForCategory(catId: string) {
    this.questionsForCategory = [];
    this.selectedQuestionIds = [];
    this.selectAllQuestions = false;
    if (!catId) return;
    const url = `${API_BASE}/get-questions-details?category_id=${encodeURIComponent(catId)}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        this.questionsForCategory = arr.map((q: any, i: number) => ({ id: q.id || q.question_id || q._id || String(i), question: q.question || q.text || q.title || '', raw: q }));
      }, error: (err) => { console.warn('Failed to load questions for category', err); this.questionsForCategory = []; }
    });
  }

  toggleSelectAllQuestions(checked: boolean) {
    this.selectAllQuestions = !!checked;
    if (this.selectAllQuestions) this.selectedQuestionIds = this.questionsForCategory.map(q => String(q.id));
    else this.selectedQuestionIds = [];
  }

  toggleQuestionSelection(id: string, checked: boolean) {
    const sid = String(id);
    if (checked) {
      if (this.selectedQuestionIds.indexOf(sid) === -1) this.selectedQuestionIds.push(sid);
    } else {
      this.selectedQuestionIds = this.selectedQuestionIds.filter(x => x !== sid);
      this.selectAllQuestions = false;
    }
  }

  // Returns true if any category in the model has randomize_questions truthy
  anyCategoryRandomized(): boolean {
    try {
      if (!Array.isArray(this.model.categories)) return false;
      return this.model.categories.some((c: any) => !!c && !!c.randomize_questions);
    } catch (e) { return false; }
  }

  get totalQuestions(): number {
    if (!Array.isArray(this.model.categories)) return 0;
    return this.model.categories.reduce((sum, c) => {
      const byIds = Array.isArray((c as any).question_ids) ? ((c as any).question_ids).length : 0;
      const byNum = typeof (c as any).questions === 'number' ? Number((c as any).questions) : 0;
      return sum + (byIds > 0 ? byIds : byNum);
    }, 0);
  }

  save() {
    // basic validation
    if (!this.title || !this.title.trim()) { notify('Title is required', 'error'); return; }
    if (this.durationMinutes === null || isNaN(Number(this.durationMinutes))) { notify('Duration is required', 'error'); return; }

    const payload: any = {
      title: String(this.title).trim(),
      description: this.description || null,
      institute_id: this.institute || null,
      duration_minutes: Number(this.durationMinutes),
      pass_mark: this.passMark !== null ? Number(this.passMark) : null,
      start_time: this.startDateTime || null,
      categories: Array.isArray(this.model.categories) ? this.model.categories : [],
      total_questions: this.totalQuestions
    };

    // If editing an existing exam, call update endpoint
    if (this.editMode && this.editExamId) {
      payload.exam_id = this.editExamId;
      const url = `${API_BASE}/update-exam`;
      this.http.post<any>(url, payload).subscribe({
        next: (res) => {
          try { const msg = res?.statusMessage || res?.message || 'Exam updated'; const ok = typeof res?.status === 'undefined' ? true : !!res.status; notify(msg, ok ? 'success' : 'error'); } catch(e){}
          try { sessionStorage.removeItem('edit_exam'); } catch (e) { }
          this.router.navigate(['/exams']);
        }, error: (err) => {
          console.error('Failed to update exam', err);
          try { notify(err?.error?.statusMessage || err?.error?.message || 'Failed to update exam', 'error'); } catch(e){}
        }
      });
      return;
    }

    const url = `${API_BASE}/register-exam`;
    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        try { const msg = res?.statusMessage || res?.message || 'Exam created'; const ok = typeof res?.status === 'undefined' ? true : !!res.status; notify(msg, ok ? 'success' : 'error'); } catch(e){}
        try { sessionStorage.removeItem('edit_exam'); } catch (e) { }
        this.router.navigate(['/exams']);
      }, error: (err) => {
        console.error('Failed to create exam', err);
        try { notify(err?.error?.statusMessage || err?.error?.message || 'Failed to create exam', 'error'); } catch(e){}
      }
    });
  }

  reset() {
    this.title = '';
    this.description = '';
    this.institute = '';
    this.durationMinutes = null;
    this.passMark = null;
    this.startDateTime = '';
    // if not in edit mode, clear any leftover edit payload
    try { if (!this.editMode) sessionStorage.removeItem('edit_exam'); } catch (e) { }
  }

  cancel() {
    try { sessionStorage.removeItem('edit_exam'); } catch (e) { }
    this.router.navigate(['/exams']);
  }
}
