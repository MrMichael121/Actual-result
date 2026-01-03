import { Component, ViewChild, AfterViewInit, OnDestroy, ElementRef, TemplateRef,ViewContainerRef  } from '@angular/core';
import { Observable, of } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { AuthService } from 'src/app/home/service/auth.service';
import { Subscription } from 'rxjs';
import { API_BASE } from 'src/app/shared/api.config';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { TemplatePortal } from '@angular/cdk/portal';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { ConfirmService } from 'src/app/shared/services/confirm.service';
import { notify } from 'src/app/shared/global-notify';

export type QuestionType = 'choose' | 'multi' | 'fill' | 'descriptive';
/* moduleName is moved into the component class as a property */
export interface QuestionOption {
  id?: string;
  text?: string;
  is_correct?: number;
}
export interface QuestionRow {
  id: number | string;
  question: string;
  category: string;
  category_description: string;
  type: QuestionType | string;
  originalType?: string;
  options?: QuestionOption[]; // for MCQ
  answer?: string; // for subjective or correct answer
  marks?: number;
}

@Component({
  selector: 'app-view-questions',
  standalone: true,
  imports: [CommonModule,SharedModule, MatCardModule,  MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatTableModule, MatPaginatorModule, FormsModule, RouterModule, HttpClientModule, MatDatepickerModule, MatNativeDateModule, MatCheckboxModule, MatSortModule, OverlayModule, PortalModule, ReactiveFormsModule, MatAutocompleteModule],
  templateUrl: './view-questions.component.html',
  styleUrls: ['./view-questions.component.scss']
})
export class ViewQuestionsComponent implements OnDestroy {
  filter = '';
  institutes: Array<{ name: string; institute_id?: string }> = [];
  exams: Array<{ title: string; exam_id?: string }> = [];
  selectedInstitute = '';
  // multi-select categories with search
  selectedCategories: string[] = [];
  categoryFilterName = '';
  categorySearch = '';
  // value used for the "select all" pseudo-option
  selectAllValue = '__SELECT_ALL_CATEGORIES__';
  questions: QuestionRow[] = [];
  displayedColumns: string[] = ['select','question', 'category', 'type', 'marks', 'options', 'actions'];
  dataSource = new MatTableDataSource<QuestionRow>([]);
  // selection for batch operations
  selectedQuestionIds = new Set<string|number>();
  targetCategories: Array<{ name: string; category_id?: string }> = [];
  copyMoveInProgress = false;
  selectedTargetCategory: string | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;
  

  private _subs: Subscription | null = null;
  

  private institutesUrl = `${API_BASE}/get-institute-list`;
  private examsUrl = `${API_BASE}/get-exams-list`;
  private questionsUrl = `${API_BASE}/get-questions-details`;
  private categoriesUrl = `${API_BASE}/get-categories-list`;
  categories: Array<any> = [];
  categoryCtrl = new FormControl('');
  filteredCategories$: Observable<any[]> = of([]);
  departments: Array<any> = [];
  teams: Array<any> = [];
  // extra filters
  selectedDepartments: string[] = [];
  selectedTeams: string[] = [];
  filterCreationDateAfter: Date | null = null;
  filterCreationDate: Date | null = null;
  filterActiveStatus: boolean | null = null;
  filterCreatedByMe: boolean = false;
  filterPublicAccess: boolean | null = null;

  get filteredCategories() {
    const q = (this.categorySearch || '').toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter((c: any) => (c.name || '').toLowerCase().includes(q) || (c.category_name || '').toLowerCase().includes(q));
  }

  private filtersOverlayRef: OverlayRef | null = null;

  ngOnInit(): void {
    this.pageMeta.setMeta('Questions', 'Browse and review question bank');
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    // this.dataSource.paginator = this.paginator;
    try { this.dataSource.paginator = this.paginator; } catch (e) { /* ignore during tests */ }
  }
  isSuperAdmin = false;
  constructor(private http: HttpClient, private router: Router, private loading: LoaderService, private auth: AuthService, private overlay: Overlay, private vcr: ViewContainerRef,private pageMeta: PageMetaService, private confirmService: ConfirmService) {
    
  // subscribe to isSuperAdmin observable so UI stays reactive to role changes
  try {
    this._subs = this.auth.user$.subscribe((user: any) => {
      this.isSuperAdmin = !!user && ['super_admin', 'superadmin', 'super-admin'].includes((user.role || '').toLowerCase());
    });
  } catch (e) { /* ignore in tests */ }

  // http is optional for tests; if present, load institutes
    if (this.http) this.loadInstitutes();
    // also load categories list (unfiltered) for the Category filter
    if (this.http) this.loadCategories();
  }

  ngOnDestroy(): void {
    try { this._subs?.unsubscribe(); } catch (e) { /* ignore */ }
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

  refresh() {
    this.loadQuestions();
  }

  loadInstitutes() {
    this.http!.get<any>(this.institutesUrl).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        this.institutes = arr.map((r: any) => ({ name: r.name || r.institute_name || r.short_name || '', institute_id: r.institute_id || r.id }));
          // If a selectedInstitute is already set (e.g. via route/session), prefer that
          try {
            if (this.selectedInstitute) {
              const found = this.institutes.find(i => String(i.institute_id) === String(this.selectedInstitute));
              if (found) {
                // ensure exact match type/value and load schedules
                this.selectedInstitute = found.institute_id as any;
                    // load dependent lists scoped to the institute
                    this.loadDepartments(this.selectedInstitute);
                    this.loadTeams(this.selectedInstitute);
                    this.loadQuestions(this.selectedInstitute);
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
                  // ensure departments/teams also load for this institute
                  this.loadDepartments(this.selectedInstitute);
                  this.loadTeams(this.selectedInstitute);
                  // this.loadQuestions(this.selectedInstitute);
                }
              }
            }
          } catch (e) { /* ignore malformed session data */ }
      },
      error: (err) => console.warn('Failed to load institutes', err)
    });
  }

  loadExams(instId: string) {
    if (!instId) { this.exams = []; return; }
    const url = `${this.examsUrl}?institute_id=${encodeURIComponent(instId)}`;
    this.http!.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        this.exams = arr.map((e: any) => ({ title: e.title || e.name || '', exam_id: e.exam_id || e.id || e.examId }));
      },
      error: (err) => { console.warn('Failed to load exams', err); this.exams = []; }
    });
  }

  onInstituteChange(value: any) {
    const v = value !== undefined ? value : '';
    this.selectedInstitute = v;
    // this.loadExams(v);
    // reload categories for the selected institute (optional)
    this.loadCategories(v);
    // also load departments and teams scoped to this institute
    this.loadDepartments(v);
    this.loadTeams(v);
  }

  loadDepartments(instId?: string) {
    if (!instId) { this.departments = []; return; }
    const url = `${API_BASE}/get-department-list`;
    this.http!.get<any>(url, { params: { institute_id: instId } }).subscribe({ next: (res) => {
      const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      this.departments = arr.map((d:any) => ({ id: d.dept_id || d.id || d.deptId, name: d.name || d.dept_name || d.title || '' }));
    }, error: (err) => { console.warn('Failed to load departments', err); this.departments = []; } });
  }

  loadTeams(instId?: string) {
    if (!instId) { this.teams = []; return; }
    const url = `${API_BASE}/get-teams-list`;
    this.http!.get<any>(url, { params: { institute_id: instId } }).subscribe({ next: (res) => {
      const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      this.teams = arr.map((t:any) => ({ id: t.team_id || t.id || t.teamId, name: t.name || t.team_name || t.title || '' }));
    }, error: (err) => { console.warn('Failed to load teams', err); this.teams = []; } });
  }

  onCategoryChange(value: any) {
    // value for multi-select will be array when multiple selected
    if (Array.isArray(value)) {
      // filter out any internal sentinel values (like selectAllValue)
      this.selectedCategories = value.filter(v => v !== this.selectAllValue);
    } else {
      this.selectedCategories = value ? [value].filter(v => v !== this.selectAllValue) : [];
    }
  }

  isAllCategoriesSelected(): boolean {
    const ids = (this.filteredCategories || []).map((c: any) => String(c.category_id || c.id || c._id));
    if (!ids.length) return false;
    const sel = (this.selectedCategories || []).map(String);
    return ids.every(id => sel.includes(id));
  }

  isPartialCategorySelection(): boolean {
    const ids = (this.filteredCategories || []).map((c: any) => String(c.category_id || c.id || c._id));
    const sel = (this.selectedCategories || []).map(String);
    return sel.length > 0 && sel.length < ids.length;
  }

  toggleSelectAllCategories() {
    const ids = (this.filteredCategories || []).map((c: any) => String(c.category_id || c.id || c._id));
    if (!ids.length) return;
    if (this.isAllCategoriesSelected()) {
      // deselect all filtered
      this.selectedCategories = (this.selectedCategories || []).filter(s => !ids.includes(String(s)));
    } else {
      // select all filtered (merge)
      const set = new Set<string>((this.selectedCategories || []).map(String));
      ids.forEach(id => set.add(id));
      this.selectedCategories = Array.from(set);
    }
  }

  loadQuestions(instId?: string) {
    this.loading.show();
    // if an institute id was supplied, prefer that and keep component state in sync
    if (instId !== undefined && instId !== null && instId !== '') {
      this.selectedInstitute = instId as any;
    }
    // build query params from selected filters; call API only when Apply/Reset triggers
    const params: string[] = [];
  if (this.selectedInstitute) params.push(`institute_id=${encodeURIComponent(this.selectedInstitute)}`);
  if (this.categoryFilterName) params.push(`category_name=${encodeURIComponent(this.categoryFilterName)}`);
  if (this.selectedCategories && this.selectedCategories.length) params.push(`category_id=${encodeURIComponent(this.selectedCategories.join(','))}`);
  if (this.selectedDepartments && this.selectedDepartments.length) params.push(`departments=${encodeURIComponent(this.selectedDepartments.join(','))}`);
  if (this.selectedTeams && this.selectedTeams.length) params.push(`teams=${encodeURIComponent(this.selectedTeams.join(','))}`);
  if (this.filterCreationDateAfter) params.push(`created_after=${encodeURIComponent((this.filterCreationDateAfter as Date).toISOString().slice(0,10))}`);
  if (this.filterCreationDate) params.push(`created_before=${encodeURIComponent((this.filterCreationDate as Date).toISOString().slice(0,10))}`);
  if (this.filterActiveStatus !== null && typeof this.filterActiveStatus !== 'undefined') params.push(`active_status=${encodeURIComponent(String(this.filterActiveStatus))}`);

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
    } catch (e) {}
  }
  
  if (this.filterPublicAccess !== null && typeof this.filterPublicAccess !== 'undefined') params.push(`public_access=${encodeURIComponent(String(this.filterPublicAccess))}`);
    const url = params.length ? `${this.questionsUrl}?${params.join('&')}` : this.questionsUrl;
    this.http!.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        // map to QuestionRow shape conservatively
        this.questions = arr.map((q: any, i: number) => ({ id: q.id || q.question_id || i + 1, question: q.question || q.text || q.title || '',  type: (q.type || 'Subjective') as QuestionType, originalType: q.type || q.original_type || q.question_type, options: q.options || q.choices || [], answer: q.answer || q.correct || '', marks: q.marks || q.points || 0, category: q.category || '', category_description: q.category_description || '' }));
        this.dataSource.data = this.questions;
        this.loading.hide();
      },
      error: (err) => { console.warn('Failed to load questions', err); this.questions = []; this.loading.hide(); }
    });
  }

  loadCategories(instId?: string) {
    let url = this.categoriesUrl;
    if (instId) url += `?institute_id=${encodeURIComponent(instId)}`;
    this.http!.get<any>(url).subscribe({ next: (res) => {
      const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      this.categories = arr.map((c: any) => ({ name: c.name || c.category_name || '', category_id: c.category_id || c.id || c._id }));
      try{
        this.filteredCategories$ = this.categoryCtrl.valueChanges.pipe(
          startWith(''),
          map((val:any)=>{
            const q = (typeof val === 'string' ? val : (val?.name||'')).toLowerCase();
            return (this.categories || []).filter((c:any)=> (c.name||'').toLowerCase().includes(q));
          })
        );
      }catch(e){ this.filteredCategories$ = of(this.categories || []); }
    }, error: (err) => { console.warn('Failed to load categories', err); this.categories = []; } });
  }

  toggleQuestionSelection(q: QuestionRow, checked: boolean){
    const id = (q as any).id ?? (q as any).question_id ?? (q as any)._id;
    if(checked) this.selectedQuestionIds.add(id as any);
    else this.selectedQuestionIds.delete(id as any);
  }

  async copySelectedQuestionsToCategory(categoryId: string | null){
    if(!categoryId || !this.selectedQuestionIds.size) return;
    const ids = Array.from(this.selectedQuestionIds).map(String);
    this.copyMoveInProgress = true;
    try{
      const url = `${API_BASE}/copy-questions-to-category`;
      await this.http.post<any>(url, { question_ids: ids, target_category_id: categoryId }).toPromise();
      try{ notify('Questions copied', 'success'); }catch(e){}
      this.selectedQuestionIds.clear();
      this.loadQuestions();
    }catch(e){ console.warn('Failed to copy questions', e); try{ notify('Failed to copy questions','error'); }catch(e){} }
    finally{ this.copyMoveInProgress = false; }
  }

  async moveSelectedQuestionsToCategory(categoryId: string | null){
    if(!categoryId || !this.selectedQuestionIds.size) return;
    const ids = Array.from(this.selectedQuestionIds).map(String);
    this.copyMoveInProgress = true;
    try{
      const url = `${API_BASE}/move-questions-to-category`;
      await this.http.post<any>(url, { question_ids: ids, target_category_id: categoryId }).toPromise();
      try{ notify('Questions moved', 'success'); }catch(e){}
      this.selectedQuestionIds.clear();
      this.loadQuestions();
    }catch(e){ console.warn('Failed to move questions', e); try{ notify('Failed to move questions','error'); }catch(e){} }
    finally{ this.copyMoveInProgress = false; }
  }

  // Template-friendly wrappers to avoid passing nullable values directly from the template
  copySelected() { this.copySelectedQuestionsToCategory(this.selectedTargetCategory); }
  moveSelected() { this.moveSelectedQuestionsToCategory(this.selectedTargetCategory); }

  toggleSelectAll(checked: boolean){
    if(checked){
      (this.dataSource.data || []).forEach(r => this.selectedQuestionIds.add(r.id as any));
    } else {
      (this.dataSource.data || []).forEach(r => this.selectedQuestionIds.delete(r.id as any));
    }
  }

  displayCategory(c: any){ return c ? (c.name || c.category_name || '') : ''; }

  onCategorySelected(c: any){ if(!c) return; this.categoryFilterName = c.name || c.category_name || ''; }

  editQuestion(q: QuestionRow) {
    // store the question into session storage and navigate to the editor
    try { sessionStorage.setItem('edit_question', JSON.stringify(q)); } catch (e) { /* ignore */ }
    // navigate to the questions editor route - reuse same route as Insert Question
    if (this.router) {
      this.router.navigate(['/questions']);
    } else {
      try { notify('Open the question editor to edit this question.', 'info'); } catch(e) {}
    }
  }

  deleteQuestion(q: QuestionRow) {
    this.confirmService.confirm({ title: 'Delete Question', message: 'Delete this question? This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel' }).subscribe(ok => {
      if (!ok) return;
      const url = `${this.questionsUrl}?question_id=${encodeURIComponent(String(q.id))}`;
      this.http!.delete<any>(url).subscribe({
        next: (res) => {
          // remove from local array
          this.questions = this.questions.filter(x => x.id !== q.id);
          try { notify('Question deleted', 'success'); } catch(e) {}
        },
        error: (err) => { console.warn('Failed to delete question', err); try { notify('Failed to delete question', 'error'); } catch(e) {} }
      });
    });
  }

  // Apply and Reset handlers: call get-questions-details on Apply (with filters) and Reset (clears filters and reloads)
  onApply() {
    this.loadQuestions();
  }

  onReset() {
    this.selectedCategories = [];
    this.categorySearch = '';
    this.selectedDepartments = [];
    this.selectedTeams = [];
    this.filterCreationDateAfter = null;
    this.filterCreationDate = null;
    this.filterActiveStatus = null;
    this.filterCreatedByMe = false;
    this.filterPublicAccess = null;
    // also clear table
    this.questions = [];
    this.dataSource.data = this.questions;
    // call API without filters to load default/unfiltered questions if backend supports it
    this.loadQuestions();
  }

  // keep existing constructor-less usage working for tests


  get filtered() {
    const q = (this.filter || '').toLowerCase();
    if (!q) return this.questions;
    return this.questions.filter(x => x.question.toLowerCase().includes(q) || (x.type || '').toLowerCase().includes(q));
  }

  applyFilter(value: string) {
    const q = (value || '').trim().toLowerCase();
    this.filter = q;
    this.dataSource.filterPredicate = (d: QuestionRow, filter: string) => {
      return (d.question || '').toLowerCase().includes(filter) || (d.type || '').toLowerCase().includes(filter);
    };
    this.dataSource.filter = q;
  }

  viewDetails(q: QuestionRow) {
    try { sessionStorage.setItem('view_question', JSON.stringify(q)); } catch (e) { }
    try { notify(`Q: ${q.question}\nType: ${q.type}\nAnswer: ${q.answer || '—'}`, 'info'); } catch(e) { try { console.warn(`Q: ${q.question}\nType: ${q.type}\nAnswer: ${q.answer || '—'}`); } catch(_) {} }
  }
}
