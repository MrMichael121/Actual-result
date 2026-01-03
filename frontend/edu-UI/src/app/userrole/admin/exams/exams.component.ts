import { Component, ViewChild, AfterViewInit, OnInit, ElementRef, TemplateRef, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from 'src/app/home/service/auth.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { API_BASE } from 'src/app/shared/api.config';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { notify } from 'src/app/shared/global-notify';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { OverlayModule } from '@angular/cdk/overlay';
import { ConfirmService } from 'src/app/shared/services/confirm.service';
import { PortalModule } from '@angular/cdk/portal';
import { TemplatePortal } from '@angular/cdk/portal';
import { DirectivesModule } from 'src/app/shared/directives/directives.module';

@Component({
  selector: 'app-admin-exams',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule, MatListModule, MatTabsModule, MatDatepickerModule, MatNativeDateModule, MatCheckboxModule, OverlayModule, PortalModule, DirectivesModule],

  templateUrl: './exams.component.html',
  styleUrls: ['./exams.component.scss']
})
export class AdminExamsComponent implements AfterViewInit {
  institutes: Array<{ short_name: string; institute_id?: string }> = [];
  selectedInstitute = '';
  filter = '';
  // new filter fields
  filterName: string = '';
  selectedDepartments: string[] = [];
  selectedTeams: string[] = [];
  filterCreationDateAfter: Date | null = null;
  filterCreationDate: Date | null = null;
  filterActiveStatus: boolean | null = null;
  filterCreatedByMe: boolean = false;
  // department/team lists used by the filters
  departments: Array<{ id: string; name: string }> = [];
  teams: Array<{ id: string; name: string }> = [];
  exams: any[] = [];
  // modal state for viewing exam details
  selectedExam: any = null;
  showModal = false;
  displayedColumns: string[] = ['title', 'description', 'total_questions', 'duration_mins', 'number_of_attempts', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  private apiUrl = `${API_BASE}/get-institute-list`;

  isSuperAdmin = false;
  constructor(private http: HttpClient, private auth: AuthService, private loader: LoaderService, private overlay: Overlay, private vcr: ViewContainerRef, private pageMeta: PageMetaService, private confirmService: ConfirmService) {
    // initialize isSuperAdmin from AuthService (synchronous helper)
    try {
      this.isSuperAdmin = !!this.auth.currentUserValue && ['super_admin', 'superadmin', 'super-admin'].includes((this.auth.currentUserValue.role || '').toLowerCase());
    } catch (e) { this.isSuperAdmin = false; }
    // also subscribe to updates in case role changes during runtime
    this.auth.user$.subscribe((user: any) => {
      try {
        this.isSuperAdmin = !!user && ['super_admin', 'superadmin', 'super-admin'].includes((user.role || '').toLowerCase());
      } catch (e) { this.isSuperAdmin = false; }
    });
  }

  clearEditAndCreate() {
    try { sessionStorage.removeItem('edit_exam'); } catch (e) { }
    (window as any).location.href = '/create-exam';
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;

  refresh() {
    this.loadExamsForInstitute(this.selectedInstitute || undefined);
  }
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  private filtersOverlayRef: OverlayRef | null = null;
  ngOnInit(): void {
    this.pageMeta.setMeta('Exams', 'Browse and review exams');
    this.loadInstitutes();
  }

  openFiltersOverlay() {
    if (!this.filtersBtn) return;
    if (this.filtersOverlayRef) { try { this.filtersOverlayRef.dispose(); } catch (e) { }; this.filtersOverlayRef = null; }

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.filtersBtn)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }
      ])
      .withPush(true);

    this.filtersOverlayRef = this.overlay.create({ positionStrategy, hasBackdrop: true, backdropClass: 'cdk-overlay-transparent-backdrop', scrollStrategy: this.overlay.scrollStrategies.reposition() });
    this.filtersOverlayRef.backdropClick().subscribe(() => this.closeFiltersOverlay());
    this.filtersOverlayRef.keydownEvents().subscribe((ev: any) => { if (ev.key === 'Escape') this.closeFiltersOverlay(); });

    const portal = new TemplatePortal(this.filtersPanelTpl, this.vcr);
    this.filtersOverlayRef.attach(portal);
  }

  closeFiltersOverlay() { if (this.filtersOverlayRef) { try { this.filtersOverlayRef.dispose(); } catch (e) { }; this.filtersOverlayRef = null; } }


  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }
  onEdit(e: any) {
    // If we have an id for the exam, fetch the full exam details from the API
    const examId = e?.test_id || e?.exam_id || e?.id;
    if (examId) {
      const url = `${API_BASE}/get-exams-details?exam_id=${encodeURIComponent(examId)}`;
      this.http.get<any>(url).subscribe({
        next: (res) => {
          const item = Array.isArray(res?.data) && res.data.length ? res.data[0] : (res?.data || res?.item || e);
          // normalize categories to the flat shape expected by CreateExamComponent.loadEditExam()
          const srcCats = Array.isArray(item.categories) ? item.categories : (Array.isArray(item.category_list) ? item.category_list : []);
          const mapped = srcCats.map((c: any) => {
            // if category is nested under c.category, prefer that
            const catObj = c.category || {};
            const category_id = catObj.category_id || c.category_id || c.id || c._id || '';
            const category_name = catObj.category_name || catObj.name || c.category_name || c.name || '';
            const description = catObj.description || c.description || c.desc || '';
            const questionArray = Array.isArray(c.questions) ? c.questions : (Array.isArray(c.question_list) ? c.question_list : []);
            const question_ids = questionArray.map((q: any) => q.question_id || q.id || q._id || null).filter(Boolean);
            const questionsCount = c.number_of_questions ?? c.total_questions ?? (questionArray.length || 0) ?? (c.questions_count || 0);
            const randomize = typeof c.randomize_questions === 'boolean' ? c.randomize_questions : (typeof c.randomize === 'boolean' ? c.randomize : false);
            return {
              category_id,
              category_name,
              description,
              questions: Number(questionsCount) || 0,
              question_ids,
              randomize_questions: !!randomize
            };
          });
          const editPayload = { ...item, categories: mapped };
          try { sessionStorage.setItem('edit_exam', JSON.stringify(editPayload)); } catch (_) { }
          (window as any).location.href = '/create-exam';
        }, error: () => {
          // fallback: store the row object we already have (try to normalize if possible)
          try {
            const src = e || {};
            const srcCatsFallback = Array.isArray(src.categories) ? src.categories : (Array.isArray(src.category_list) ? src.category_list : []);
            const mappedFallback = srcCatsFallback.map((c: any) => ({
              category_id: c.category_id || c.id || c._id || '',
              category_name: c.category_name || c.name || '',
              description: c.description || c.desc || '',
              questions: Number(c.number_of_questions ?? c.total_questions ?? (Array.isArray(c.questions) ? c.questions.length : 0)) || 0,
              question_ids: Array.isArray(c.question_ids) ? c.question_ids : (Array.isArray(c.questionIds) ? c.questionIds : []),
              randomize_questions: !!c.randomize_questions
            }));
            const editPayloadFallback = { ...src, categories: mappedFallback };
            sessionStorage.setItem('edit_exam', JSON.stringify(editPayloadFallback));
          } catch (_) { try { sessionStorage.setItem('edit_exam', JSON.stringify(e)); } catch (_) { } }
          (window as any).location.href = '/create-exam';
        }
      });
      return;
    }
    try { sessionStorage.setItem('edit_exam', JSON.stringify(e)); } catch (_) { }
    (window as any).location.href = '/create-exam';
  }

  deleteSchedule(row: any) {
    this.confirmService.confirm({ title: 'Delete Scheduled Exam', message: 'Delete this scheduled exam?', confirmText: 'Delete', cancelText: 'Cancel' }).subscribe(ok => {
      if (!ok) return;
      const id = row.id;
      const url = `${API_BASE}/delete-exam?exam_id=${encodeURIComponent(id)}`;
      this.http.delete<any>(url).subscribe({
        next: (res) => {
          try { notify('Scheduled exam deleted successfully', 'success'); } catch (e) { }
          // reload exams
          this.loadExamsForInstitute(this.selectedInstitute || undefined);
        }, error: (err) => {
          console.warn('Failed to delete scheduled exam', err);
          try { notify('Failed to delete scheduled exam. Please try again later.', 'error'); } catch (e) { }
        }
      });
    });
  }

  onView(e: any) {
    // fetch full exam details from API when available, then show modal
    const examId = e?.test_id || e?.exam_id || e?.id;
    if (examId) {
      const url = `${API_BASE}/get-exams-details?exam_id=${encodeURIComponent(examId)}`;
      this.loader.show();
      this.http.get<any>(url).subscribe({
        next: (res) => {
          const item = Array.isArray(res?.data) && res.data.length ? res.data[0] : (res?.data || res || e);
          // normalize categories to the shape used by the template
          const cats = Array.isArray(item.categories) ? item.categories : (Array.isArray(item.category_list) ? item.category_list : []);
          item.categories = cats.map((c: any) => {
            // the API may return category object under `category` and number_of_questions/randomize_questions
            const categoryObj = c.category || { category_id: c.category_id || c.id, category_name: c.category_name || c.name, description: c.description || c.desc };
            return {
              category: categoryObj,
              number_of_questions: c.number_of_questions ?? c.count ?? (Array.isArray(c.questions) ? c.questions.length : 0),
              questions: Array.isArray(c.questions) ? c.questions : (Array.isArray(c.question_list) ? c.question_list : []),
              randomize_questions: typeof c.randomize_questions === 'boolean' ? c.randomize_questions : (c.randomize || false)
            };
          });
          this.selectedExam = item;
          // Normalize institute and user fields for template friendliness
          try {
            // institute may be returned as `institute` object or as `institute_id`/`institute_name` fields
            if (!this.selectedExam.institute && this.selectedExam.institutes) this.selectedExam.institute = this.selectedExam.institutes;
            if (this.selectedExam.institute && typeof this.selectedExam.institute === 'object') {
              this.selectedExam.institute = this.selectedExam.institute;
            }
            // created_by / updated_by may be null, string, or object { name, username }
            const normUser = (u: any) => {
              if (!u && u !== 0) return null;
              if (typeof u === 'string') return u;
              if (typeof u === 'object') return u.name || u.username || u.user_name || u.user || JSON.stringify(u);
              return String(u);
            };
            this.selectedExam.created_by = normUser(this.selectedExam.created_by || this.selectedExam.creator || null);
            this.selectedExam.updated_by = normUser(this.selectedExam.updated_by || this.selectedExam.modifier || null);
            // Add explicit display fields used by the template
            this.selectedExam.display_institute = (this.selectedExam.institute && (this.selectedExam.institute.institute_name || this.selectedExam.institute.name)) || (this.selectedExam.institutes && (this.selectedExam.institutes.institute_name || this.selectedExam.institutes.name)) || this.selectedExam.institute_name || '';
            this.selectedExam.created_by_display = this.selectedExam.created_by || '—';
            this.selectedExam.updated_by_display = this.selectedExam.updated_by || '—';
          } catch (e) { /* ignore normalization errors */ }
          // initialize expanded map
          try { this.selectedExam._expanded = {}; } catch (e) { this.selectedExam._expanded = {}; }
          this.showModal = true;
          try { this.loader.hide(); } catch (err) { }
        }, error: (err) => {
          // fallback to the passed object
          try { sessionStorage.setItem('view_exam', JSON.stringify(e)); } catch (_) { }
          this.selectedExam = e || null;
          try {
            if (this.selectedExam) {
              if (!this.selectedExam.institute && this.selectedExam.institutes) this.selectedExam.institute = this.selectedExam.institutes;
              const normUser = (u: any) => {
                if (!u && u !== 0) return null;
                if (typeof u === 'string') return u;
                if (typeof u === 'object') return u.name || u.username || u.user_name || u.user || JSON.stringify(u);
                return String(u);
              };
              this.selectedExam.created_by = normUser(this.selectedExam.created_by || this.selectedExam.creator || null);
              this.selectedExam.updated_by = normUser(this.selectedExam.updated_by || this.selectedExam.modifier || null);
              this.selectedExam.display_institute = (this.selectedExam.institute && (this.selectedExam.institute.institute_name || this.selectedExam.institute.name)) || (this.selectedExam.institutes && (this.selectedExam.institutes.institute_name || this.selectedExam.institutes.name)) || this.selectedExam.institute_name || '';
              this.selectedExam.created_by_display = this.selectedExam.created_by || '—';
              this.selectedExam.updated_by_display = this.selectedExam.updated_by || '—';
            }
          } catch (e) { }
          this.selectedExam = this.selectedExam || null;
          this.selectedExam._expanded = {};
          this.showModal = true;
          try { this.loader.hide(); } catch (err) { }
        }
      });
      return;
    }
    try { sessionStorage.setItem('view_exam', JSON.stringify(e)); } catch (_) { }
    this.selectedExam = e || null;
    try { this.selectedExam._expanded = {}; } catch (err) { }
    this.showModal = true;
  }

  toggleCategoryQuestions(idx: number) {
    if (!this.selectedExam) return;
    this.selectedExam._expanded = this.selectedExam._expanded || {};
    this.selectedExam._expanded[idx] = !this.selectedExam._expanded[idx];
  }

  closeModal() {
    this.showModal = false;
    this.selectedExam = null;
  }

  loadInstitutes() {
    this.loader.show();
    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.institutes = res.data.map((r: any) => ({ short_name: r.name || r.institute_name || r.short_name || '', institute_id: r.institute_id }));
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
                this.loadExamsForInstitute(this.selectedInstitute);
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
                  // load dependent lists scoped to the institute
                  this.loadDepartments(this.selectedInstitute);
                  this.loadTeams(this.selectedInstitute);
                  this.loadExamsForInstitute(this.selectedInstitute);
                }
              }
            }
          } catch (e) { /* ignore malformed session data */ }
        }
        this.loader.hide();
      },
      error: (err) => { console.warn('Failed to load institutes', err); this.loader.hide(); }
    });
  }
  onApply() {
    this.loadExamsForInstitute(this.selectedInstitute || undefined);
  }
  onReset() {
    // clear filter fields (preserve selectedInstitute unless you want to clear it)
    this.filterName = '';
    this.selectedDepartments = [];
    this.selectedTeams = [];
    this.filterCreationDateAfter = null;
    this.filterCreationDate = null;
    this.filterActiveStatus = null;
    this.filterCreatedByMe = false;
    // reload with cleared filters
    this.loadExamsForInstitute(this.selectedInstitute || undefined);
  }
  // ngAfterViewInit(): void {
  //   this.loadExamsForInstitute(this.selectedInstitute || undefined);
  // }

  loadExamsForInstitute(id?: string) {
    this.loader.show();
    const base = `${API_BASE}/get-exams-details`;
    // build query params based on filters
    const params: string[] = [];
    if (id) params.push(`institute_id=${encodeURIComponent(id)}`);
    if (this.filterName) params.push(`name=${encodeURIComponent(this.filterName)}`);
    if (this.selectedDepartments && this.selectedDepartments.length) params.push(`departments=${encodeURIComponent(this.selectedDepartments.join(','))}`);
    if (this.selectedTeams && this.selectedTeams.length) params.push(`teams=${encodeURIComponent(this.selectedTeams.join(','))}`);
    if (this.filterCreationDateAfter) params.push(`created_after=${encodeURIComponent((this.filterCreationDateAfter as Date).toISOString().slice(0, 10))}`);
    if (this.filterCreationDate) params.push(`created_before=${encodeURIComponent((this.filterCreationDate as Date).toISOString().slice(0, 10))}`);
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
      } catch (e) { }
    }
    const url = params.length ? `${base}?${params.join('&')}` : base;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        // normalize each exam to expected display shape
        this.exams = arr.map((x: any) => ({
          test_id: x.test_id || x.id || x.exam_id,
          title: x.title || x.name || '',
          description: x.description || x.desc || '',
          // preserve raw categories if returned by the API so the view modal can show them
          categories: Array.isArray(x.categories) ? x.categories : (Array.isArray(x.category_list) ? x.category_list : (Array.isArray(x.categories_list) ? x.categories_list : [])),
          institute: {
            institute_id: x.institute_id || '',
            institute_name: x.institute_name || ''
          },
          duration_mins: x.duration_mins || x.duration || 0,
          total_questions: x.total_questions || x.questions_count || 0,
          number_of_attempts: x.number_of_attempts || x.attempts || 1,
          pass_mark: x.pass_mark || x.pass_mark || 0,
          public_access: x.public_access || x.public || false,
          created_by: x.created_by || x.creator || '',
          created_date: x.created_date || x.created || '',
          updated_by: x.updated_by || x.modifier || '',
          updated_date: x.updated_date || x.updated || '',
          published: !!x.published
        }));
        // this.updateTable();
        // this.loader.hide();
        this.dataSource.data = this.exams;
        this.dataSource.paginator = this.paginator;

        try { this.loader.hide(); } catch (e) { /* ignore */ }
      },
      error: (err) => {
        console.warn('Failed loading exams', err);
        this.exams = [];
        // this.updateTable();
        // this.loader.hide();
        this.dataSource.data = this.exams;
        this.dataSource.paginator = this.paginator;
        try { this.loader.hide(); } catch (e) { /* ignore */ }
      }
    });
  }

  onInstituteSelected(id: string) {
    this.selectedInstitute = id || '';
    if (this.selectedInstitute) this.loadExamsForInstitute(this.selectedInstitute);
  }

  onInstituteChange(value: any) {
    const v = value !== undefined && value !== null ? value : '';
    this.selectedInstitute = v;
    if (this.selectedInstitute) {
      this.loadDepartments(this.selectedInstitute);
      this.loadTeams(this.selectedInstitute);
      this.loadExamsForInstitute(this.selectedInstitute);
    } else {
      // clear dependent lists
      this.departments = [];
      this.teams = [];
      this.loadExamsForInstitute(undefined);
    }
  }

  // new: load departments scoped to institute
  loadDepartments(instId?: string) {
    if (!instId) { this.departments = []; return; }
    const url = `${API_BASE}/get-department-list`;
    this.http.get<any>(url, { params: { institute_id: instId } }).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        this.departments = arr.map((d: any) => ({ id: d.dept_id || d.id || d.deptId, name: d.name || d.dept_name || d.title || '' }));
      }, error: (err) => { console.warn('Failed to load departments', err); this.departments = []; }
    });
  }

  // new: load teams scoped to institute
  loadTeams(instId?: string) {
    if (!instId) { this.teams = []; return; }
    const url = `${API_BASE}/get-teams-list`;
    this.http.get<any>(url, { params: { institute_id: instId } }).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        this.teams = arr.map((t: any) => ({ id: t.team_id || t.id || t.teamId, name: t.name || t.team_name || t.title || '' }));
      }, error: (err) => { console.warn('Failed to load teams', err); this.teams = []; }
    });
  }
}
