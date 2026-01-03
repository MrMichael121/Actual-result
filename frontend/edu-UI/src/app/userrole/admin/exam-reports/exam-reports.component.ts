import { Component, ViewChild, ElementRef, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, of, Subscription } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from 'src/app/shared/api.config';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-exam-reports',
  templateUrl: './exam-reports.component.html',
  styleUrls: ['./exam-reports.component.scss']
})
export class ExamReportsComponent implements OnInit, OnDestroy {
  reportsApplied = false;
  appliedFilters: any = null;
  categoryAnalytics: any[] = [];
  questionSummary: any[] = [];
  wrongDistribution: any[] = [];
  // wrong answer modal state
  showWrongAnswerSummary = false;
  selectedQuestionForWrongSummary: any = null;
  selectedWrongAnswers: Array<{ answer: string; count?: number; pct?: string } | any> = [];
  // resources modal state
  showResourcePanel = false;
  selectedResources: Array<{ resource_id?: string; full_name?: string; email?: string; url?: string }> = [];
  selectedResourceContext: any = null; // { question, wrongAnswer }
  // user report state
  userReportData: any[] = [];
  userReportTotal = 0;
  pageSize = 25;
  currentPage = 1;
  searchQuery = '';
  
  // placeholders for template bindings
  examCtrl = new FormControl('');
  instituteCtrl = new FormControl<any>('');
  filteredInstitutes$: Observable<any[]> = of([]);
  filteredExams$: Observable<any[]> = of([]);
  selectedExam: any = null;
  activeMainTabIndex = 0;
  userFilterOpen = false;
  userFilters: any = { department_id: '', teams_id: '', country_id: '', city_id: '', campus_id: '' };
  countries: any[] = [];
  cities: any[] = [];
  campusList: any[] = [];
  departmentList: any[] = [];
  teamList: any[] = [];
  institutes: Array<{ id: string; name: string }> = [];
  selectedInstituteId: string | null = null;

  @ViewChild('filtersBtn', { read: ElementRef }) filtersBtn!: ElementRef;
  @ViewChild('filtersPanel') filtersPanelTpl!: TemplateRef<any>;
  
  // simple pagination controls without MatPaginator binding
  loadingUserReport = false;

  get totalPages(): number{
    return Math.max(1, Math.ceil((this.userReportTotal || 0) / this.pageSize));
  }

  private filtersOverlayRef: OverlayRef | null = null;
  private _subs: Subscription | null = null;
  resetFilters: any = {};

  constructor(private http: HttpClient, private loading: LoaderService, private overlay: Overlay, private vcr: ViewContainerRef, private pageMeta: PageMetaService) {}

  onApply(payload: any) {
    this.appliedFilters = payload;
    this.reportsApplied = true;
  }

  onReset() {
    this.appliedFilters = null;
    this.reportsApplied = false;
    this.categoryAnalytics = [];
    this.questionSummary = [];
    this.wrongDistribution = [];
  }

  displayExam(exam: any) { return exam ? (exam.title || exam.name || '') : ''; }
  onExamAutocompleteSelected(exam: any) { 
    this.selectedExam = exam; 
    // auto-load report for the currently active main tab
    if(this.activeMainTabIndex === 0){
      this.loadUserReport(1);
    } else if(this.activeMainTabIndex === 1){
      this.loadAnalytics();
    }
  }
  closeUserFilter() { this.userFilterOpen = false; }
  onCountryChange() { /* placeholder */ }

  private loadInstitutes(){
    const url = `${API_BASE}/institutes/list`;
    this.http.get<any>(url).subscribe({
      next: (res)=>{
        const list = Array.isArray(res) ? res : (res?.institutes || res?.data || []);
        this.institutes = (list || []).map((i:any)=>({ id: String(i.id || i.institute_id || i._id || ''), name: i.name || i.institute || 'Institute' }));
        // setup filtered institutes observable
        try{
          this.filteredInstitutes$ = this.instituteCtrl.valueChanges.pipe(
            startWith(''),
            map((val:any) => {
              const q = (typeof val === 'string' ? val : (val?.name || '')).toLowerCase();
              return (this.institutes || []).filter((it:any) => (it.name || '').toLowerCase().includes(q));
            })
          );
        }catch(e){
          this.filteredInstitutes$ = of(this.institutes || []);
        }
        const loginInst = sessionStorage.getItem('institute_id') || sessionStorage.getItem('instituteId');
        if(loginInst) this.selectedInstituteId = String(loginInst);
        else if(this.institutes.length) this.selectedInstituteId = this.institutes[0].id;
        // set instituteCtrl display value
        const selected = this.institutes.find(i=>i.id === this.selectedInstituteId);
        if(selected){ try{ this.instituteCtrl.setValue(selected as any); }catch(e){} }
      },
      error: (err)=> console.warn('Failed to load institutes', err)
    });
  }

  onInstituteSelected(inst: any){
    if(!inst) return;
    this.selectedInstituteId = inst.id;
    this.loadScheduledExam();
  }

  displayInstitute(i: any){ return i ? i.name : ''; }
  onInstituteChange(id: string|null){
    this.selectedInstituteId = id;
    this.loadScheduledExam();
  }
  loadScheduledExam() {
    // call API (use API_BASE) and populate filteredExams$
    const url = `${API_BASE}/get-exam-schedule-details`;
    this.loading.show();
    this.filteredExams$ = new Observable<any[]>(observer => {
      this.http.get<any>(url, { params: { institute_id: this.selectedInstituteId || '', country_id: this.userFilters.country_id || '', city_id: this.userFilters.city_id || '', campus_id: this.userFilters.campus_id || '' } }).subscribe({
        next: (res) => {
          const items = Array.isArray(res) ? res : (res?.data || res?.schedules || []);
          observer.next(items);
          observer.complete();
          try { this.loading.hide(); } catch(e){}
        },
        error: (err) => { observer.next([]); observer.complete(); console.warn('Failed to load schedules', err); try { this.loading.hide(); } catch(e){} }
      });
    });
  }

  ngOnInit(): void {
    try { this.pageMeta.setMeta('Exam Reports', 'Reports for scheduled exams'); } catch (e) {}
     this.loadInstitutes();
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

  ngOnDestroy(): void {
    try { this._subs?.unsubscribe(); } catch(e){}
    try { this.closeFiltersOverlay(); } catch(e){}
  }

  onTabChange(event: any){
    const idx = event.index;
    // 0 => User Report, 1 => Category Report
    if(!this.selectedExam){
      // nothing selected
      return;
    }
    if(idx === 0){
      this.loadUserReport(1);
    } else if(idx === 1){
      this.loadAnalytics();
    }
  }

  loadUserReport(page: number = 1){
    if(!this.selectedExam) return;
    this.currentPage = page || 1;
    const params: any = { schedule_id: String(this.selectedExam.schedule_id || this.selectedExam.id || this.selectedExam.scheduleId || ''), page: String(this.currentPage), page_size: String(this.pageSize) };
    if(this.searchQuery) params.q = this.searchQuery;
    this.loadingUserReport = true;
    try { this.loading.show(); } catch(e){}
    this.http.get<any>(`${API_BASE}/get-exam-user-report`, { params }).subscribe({
      next: (res)=>{
        console.debug('[ExamReports] get-exam-user-report response:', res);
        try{
          const body = res || {};
          const payload = body.data || body; // support responses with { data: { items: [...] } }
          if(payload && Array.isArray(payload.items)){
            this.userReportData = payload.items;
            this.userReportTotal = Number(payload.total ?? payload.count ?? (payload.items || []).length);
          } else if(Array.isArray(payload)){
            this.userReportData = payload;
            this.userReportTotal = this.userReportData.length;
          } else {
            // fallback
            this.userReportData = [];
            this.userReportTotal = 0;
          }
        } catch(e){
          console.warn('Error parsing user report response', e);
          this.userReportData = [];
          this.userReportTotal = 0;
        } finally {
          this.loadingUserReport = false;
          try { this.loading.hide(); } catch(e){}
        }
      },
      error: (err)=>{ console.error('[ExamReports] Failed to load user report', err); this.userReportData = []; this.userReportTotal = 0; this.loadingUserReport = false; try { this.loading.hide(); } catch(e){} },
      complete: ()=>{ try { this.loading.hide(); } catch(e){} }
    });
  }

  prevPage(){ if(this.currentPage > 1) this.loadUserReport(this.currentPage - 1); }
  nextPage(){ const totalPages = Math.ceil((this.userReportTotal || 0) / this.pageSize); if(this.currentPage < totalPages) this.loadUserReport(this.currentPage + 1); }

  exportUserCSV(){
    if(!this.userReportData || !this.userReportData.length) return;
    const headers = ['Student Name','Questions Attempted','Correct Answers','Wrong Answers','Marks Obtained','Result'];
    const rows = this.userReportData.map((r:any)=>[r.student_name, r.questions_attempted, r.correct_answers, r.wrong_answers, r.marks_obtained, r.result]);
    const csv = [headers.join(','), ...rows.map(r=>r.map((v:any)=>`"${String(v||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_user_report_${this.selectedExam ? (this.selectedExam.schedule_id || this.selectedExam.id) : 'report'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  loadAnalytics(){
    if(!this.selectedExam) return;
    const params: any = { schedule_id: String(this.selectedExam.schedule_id || this.selectedExam.id || '') };
    try { this.loading.show(); } catch(e){}
    this.http.get<any>(`${API_BASE}/get-exam-analytics`, { params }).subscribe({
      next: (res)=>{
        console.debug('[ExamReports] get-exam-analytics response:', res);
        try{
          const body = res || {};
          const payload = body.data || body;
          this.categoryAnalytics = Array.isArray(payload.category_report) ? payload.category_report : (payload.category_report || payload.categories || []);
          this.questionSummary = Array.isArray(payload.question_summary) ? payload.question_summary : (payload.question_summary || payload.questions || []);
          this.wrongDistribution = Array.isArray(payload.wrong_answer_distribution) ? payload.wrong_answer_distribution : (payload.wrong_answer_distribution || payload.distribution || []);
        } catch(e){
          console.error('[ExamReports] Error parsing analytics response', e);
          this.categoryAnalytics = [];
          this.questionSummary = [];
          this.wrongDistribution = [];
        } finally {
          try { this.loading.hide(); } catch(e){}
        }
      },
      error: (err)=>{ console.error('[ExamReports] Failed to load analytics', err); this.categoryAnalytics = []; this.questionSummary = []; this.wrongDistribution = []; try{ this.loading.hide(); }catch(e){} },
      complete: ()=>{ try { this.loading.hide(); } catch(e){} }
    });
  }

  // Open a small modal-like inline panel to show wrong answer summary for a question
  openWrongAnswerSummary(question: any){
    if(!question) return;
    this.selectedQuestionForWrongSummary = question;
    // Find wrong answers for the question from wrongDistribution
    // wrongDistribution may be an array of { question_id, wrong_answers: [{ answer, count, pct }] }
    const qid = question.id || question.question_id || question.sno || question.qid || null;
    let entries: any[] = [];
    try{
      if(Array.isArray(this.wrongDistribution) && this.wrongDistribution.length){
        // try multiple shapes
        // shape1: [{ question_id: '123', wrong_answers: [{ answer: 'A', count: 3, pct: '11%' }, ...] }, ...]
        const byQ = this.wrongDistribution.find((d:any) => String(d.question_id || d.qid || d.id || d.sno || '') === String(qid));
        if(byQ){
          entries = byQ.wrong_answers || byQ.wrong || byQ.answers || byQ.distribution || [];
        } else {
          // shape2: flat list of wrong answers with question ref
          entries = (this.wrongDistribution || []).filter((d:any) => String(d.question_id || d.qid || d.schedule_question_id || '') === String(qid));
        }
      }
    }catch(e){ entries = []; }

    // Normalize entries to { answer, count, pct }
    this.selectedWrongAnswers = (entries || []).map((en:any, idx:number) => {
      if(typeof en === 'string') return { answer: en, count: null, pct: null };
      return {
        answer: en.answer || en.text || en.wrong_answer || en.name || en.label || en.option || ('Answer ' + (idx+1)),
        option_id: en.option_id || en.options_id || en.optionId || en.optionId || null,
        answer_id: en.answer_id || en.answerId || null,
        count: en.count || en.times || en.selected_count || en.selected || en.num || null,
        pct: en.pct || en.percentage || en.percent || en.pct_str || (en.count && this.selectedQuestionForWrongSummary && this.selectedQuestionForWrongSummary.attempts ? ((Number(en.count)/Number(this.selectedQuestionForWrongSummary.attempts||1))*100).toFixed(0) + '%' : null)
      };
    });

    // If no entries found locally, attempt to fetch per-question distribution from backend
    if(!this.selectedWrongAnswers.length){
      const params: any = { schedule_id: String(this.selectedExam?.schedule_id || this.selectedExam?.id || ''), question_id: String(question.question_id || question.id || question.qid || '') };
      if(params.schedule_id && params.question_id){
        this.http.get<any>(`${API_BASE}/get-question-wrong-answers`, { params }).subscribe({
          next: (res)=>{
            const body = res || {};
            const payload = body.data || body;
            const dist = payload?.distribution || [];
            this.selectedWrongAnswers = (dist || []).map((d:any)=>({ answer: d.option_text || d.option || d.answer || d.text || 'Answer', option_id: d.option_id || d.options_id || d.optionId || null, answer_id: d.answer_id || d.answerId || null, count: d.count || d.selected_count || 0, pct: (d.percentage !== undefined ? (String(d.percentage) + '%') : (d.pct || null)) }));
            if(!this.selectedWrongAnswers.length){
              // fallback to raw list
              const raw = payload?.raw || [];
              this.selectedWrongAnswers = (raw || []).map((r:any)=>({ answer: r.text || r.option_text || 'Answer', count: r.count || 0, pct: null }));
            }
            this.showWrongAnswerSummary = true;
          },
          error: (err)=>{
            console.warn('Failed to load question wrong answers', err);
            this.showWrongAnswerSummary = true; // show panel even if empty
          }
        });
        return;
      }

      const possible = question.wrong_answers || question.wrong || question.mistakes_detail || question.mistakes || question.wrong_distribution;
      if(possible && Array.isArray(possible)){
        this.selectedWrongAnswers = possible.map((en:any, i:number)=>({ answer: en.answer || en.text || en || ('Answer '+(i+1)), count: en.count || en.times || null, pct: en.pct || null }));
      }
    }

    this.showWrongAnswerSummary = true;
  }

  closeWrongAnswerSummary(){ this.showWrongAnswerSummary = false; this.selectedQuestionForWrongSummary = null; this.selectedWrongAnswers = []; }

  // Fetch resources for a specific wrong answer (option) and show central panel
  openResourcesForWrongAnswer(question: any, wa: any){
    if(!question || !wa) return;
    this.selectedResourceContext = { question, wa };
    this.selectedResources = [];

    // build params including schedule and answer identifiers
    const params: any = { schedule_id: String(this.selectedExam?.schedule_id || this.selectedExam?.id || '') };
    if(wa.option_id) params.option_id = wa.option_id;
    else if(wa.optionId) params.option_id = wa.optionId;
    if(wa.answer_id) params.answer_id = wa.answer_id;
    else if(wa.answerId) params.answer_id = wa.answerId;
    // if written/free-text answer value is present, send it as answer_value
    if(wa.answer && typeof wa.answer === 'string' && !params.answer_id){ params.answer_value = wa.answer; }
    // ensure question_id fallback
    if(!params.question_id) params.question_id = String(question.question_id || question.id || question.qid || '');

    this.http.get<any>(`${API_BASE}/get-answer-resources`, { params }).subscribe({
      next: (res)=>{
        const body = res || {};
        const payload = body.data || body;
        // backend returns either an array or an object with data/context
        if(Array.isArray(payload)) this.selectedResources = payload;
        else if(Array.isArray(body.data)) this.selectedResources = body.data;
        else if(Array.isArray(payload.resources)) this.selectedResources = payload.resources;
        else if(Array.isArray(body.data?.data)) this.selectedResources = body.data.data;
        else this.selectedResources = payload || [];
        // optional context
        if(body.context) this.selectedResourceContext = body.context;
        this.showResourcePanel = true;
      },
      error: (err)=>{ console.warn('Failed to fetch resources', err); this.showResourcePanel = true; }
    });
  }

  closeResourcePanel(){ this.showResourcePanel = false; this.selectedResources = []; this.selectedResourceContext = null; }
}
