import { Component, AfterViewInit, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_BASE } from 'src/app/shared/api.config';
import { notify } from 'src/app/shared/global-notify';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';

export interface UserExamRow {
  test_id?: string;
  schedule_id?: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  duration_mins?: number;
  total_questions?: number;
  published?: boolean;
  pass_mark?: number;
  number_of_attempts?: number;
  type?: string;
}

@Component({
  selector: 'app-user-exams',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule, MatTableModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSortModule, MatTabsModule, MatPaginatorModule],
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.scss']
})
export class UserExamComponent{
  exams: UserExamRow[] = [];
  loading = false;
  instituteId = '';
  // table and filters
  displayedColumns: string[] = ['title','start','end','duration','questions','pass_mark','number_of_attempts','status','actions'];
  dataSource = new MatTableDataSource<UserExamRow>([]);
  // Per-tab filtered tables
  activeSource = new MatTableDataSource<UserExamRow>([]);
  completeSource = new MatTableDataSource<UserExamRow>([]);
  upcomingSource = new MatTableDataSource<UserExamRow>([]);
  search = '';
  filterPublished: string = '';

  @ViewChild(MatSort) sort!: MatSort;

  private examsUrl = `${API_BASE}/get-user-exams-details`;
  private launchUrl = `${API_BASE}/launch-exam`;

  constructor(private http: HttpClient,private pageMeta: PageMetaService, private loader: LoaderService ){
    // try to read institute id from sessionStorage
    try{
      const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
      if (raw){
        const obj = JSON.parse(raw);
        this.instituteId = obj?.institute_id || obj?.instituteId || obj?.institute || '';
      }
    }catch(e){}

    if (this.instituteId) this.loadExams();
  }

  // Review modal state
  reviewOpen = false;
  reviewLoading = false;
  reviewAttempts: Array<{ attempt_number: number, items: Array<{
    question_text?: string,
    question?: string,
    correct_option?: string,
    options?: Array<{ is_correct?: number, option_text?: string }>,
    question_type?: string,
    selected_option?: string[],
    is_correct?: boolean | number,
    marks_awarded?: number,
    feedback?: string
  }>, score?: number, started_date?: string, submitted_date?: string, status?: string, percentage?: number, time_taken?: string, result?: string }> = [];
  reviewSelectedAttempt = 0;

  /**
   * Fetch review details for a user's exam and open modal.
   * Expects API: GET /review-user-exam?user_id=...&scheduler_id=...
   * Response shape assumed: { data: { attempts: [ { attempt_no, items: [ { question, answer, user_answer, status } ] } ] } }
   */
  viewReview(row: UserExamRow){
    try{
      const userRaw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
      const userId = userRaw ? (JSON.parse(userRaw)?.user_id || JSON.parse(userRaw)?.id || '') : '';
      const schedulerId = row.schedule_id || row.test_id || '';
      if(!userId || !schedulerId) { try { notify('Missing user or exam identifiers for review', 'error'); } catch(e){}; return; }
      const url = `${API_BASE}/review-user-exam?user_id=${encodeURIComponent(String(userId))}&scheduler_id=${encodeURIComponent(String(schedulerId))}`;
      this.reviewLoading = true; this.reviewAttempts = []; this.reviewOpen = true; this.reviewSelectedAttempt = 0;
      this.http.get<any>(url).subscribe({ next: (res) => {
        try{
              // API may return attempts as an array in res.data
              const attempts = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.attempts) ? res.attempts : (Array.isArray(res?.data?.attempts) ? res.data.attempts : []));
              this.reviewAttempts = (Array.isArray(attempts) ? attempts : []).map((a:any, idx:number) => {
                const items = Array.isArray(a.review) ? a.review : (Array.isArray(a.items) ? a.items : (Array.isArray(a.questions) ? a.questions : []));
                const mappedItems = (items || []).map((it:any) => {
                  const options = Array.isArray(it.options) ? it.options : (Array.isArray(it.choices) ? it.choices : []);
                  // ensure option objects have is_correct numeric flag and option_text
                  const normalizedOptions = (options || []).map((o:any) => ({ is_correct: (typeof o.is_correct !== 'undefined') ? Number(o.is_correct) : ((typeof o.isCorrect !== 'undefined') ? Number(o.isCorrect) : 0), option_text: o.option_text || o.text || o.label || '' }));
                  const selectedArr = Array.isArray(it.selected_option) ? it.selected_option.map((s:any)=>String(s)) : (it.selected_option ? [String(it.selected_option)] : (it.selected ? (Array.isArray(it.selected) ? it.selected.map((s:any)=>String(s)) : [String(it.selected)]) : []));
                  // determine boolean correctness for the item
                  const itemIsCorrect = (typeof it.is_correct !== 'undefined') ? Boolean(it.is_correct) : ((typeof it.isCorrect !== 'undefined') ? Boolean(it.isCorrect) : null);
                  const inferredCorrect = (it.correct_option || it.correct_answer || it.answer) || (normalizedOptions && normalizedOptions.length ? normalizedOptions[0].option_text : '');
                  return {
                    question_text: it.question_text || it.question || it.q || '',
                    question: it.question_text || it.question || it.q || '',
                    correct_option: inferredCorrect,
                    options: normalizedOptions,
                    question_type: it.question_type || it.type || 'choose',
                    selected_option: selectedArr,
                    is_correct: itemIsCorrect,
                    marks_awarded: (typeof it.marks_awarded !== 'undefined') ? it.marks_awarded : (typeof it.marks !== 'undefined' ? it.marks : 0),
                    feedback: it.feedback || null
                  } as any;
                });
                return {
                  attempt_number: a.attempt_number || a.attempt_no || a.attempt || (idx+1),
                  items: mappedItems,
                  score: a.score || a.marks || 0,
                  started_date: a.started_date || a.started_at || a.start_time || null,
                  submitted_date: a.submitted_date || a.submitted_at || null,
                  status: a.status || null,
                  percentage: a.percentage || null,
                  time_taken: a.time_taken || null,
                  result: a.result || null
                };
              });
        }catch(e){ this.reviewAttempts = []; }
        this.reviewLoading = false;
      }, error: (err) => { console.warn('Failed to load review', err); this.reviewLoading = false; this.reviewAttempts = []; } });
    }catch(e){ try { notify('Failed to request review', 'error'); } catch(e){} }
  }

  closeReview(){ this.reviewOpen = false; this.reviewAttempts = []; this.reviewSelectedAttempt = 0; }
  ngOnInit(): void{

    this.pageMeta.setMeta('User Exams', 'Explore and manage your exams');
    
  }
  loadExams(){
    this.loader.show();
    if(!this.instituteId) return;
    this.loading = true;
    // include session user data as a payload in the query string
    const userRaw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
    let userObj: any = null;
    try { userObj = userRaw ? JSON.parse(userRaw) : null; } catch(e) { userObj = null; }
    const userId = userObj?.user_id || userObj?.id || '';

    // send user_id as query param via GET request to fetch exams for the user's institute
    const url = `${this.examsUrl}?user_id=${encodeURIComponent(userId)}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
      const arr = Array.isArray(res?.data) ? res.data : [];
      const fmtDate = (v: any): string => {
        if (v === null || v === undefined || v === '') return '';
        let d: Date;
        if (typeof v === 'number') {
          d = new Date(v > 1e12 ? v : v * 1000);
        } else if (/^\d+$/.test(String(v))) {
          const n = Number(v);
          d = new Date(n > 1e12 ? n : n * 1000);
        } else {
          d = new Date(String(v));
        }
        if (isNaN(d.getTime())) return String(v);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dd = String(d.getDate()).padStart(2, '0');
        const mmm = months[d.getMonth()];
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${dd}-${mmm}-${yyyy} ${hh}:${mm}`;
      };

      this.exams = arr.map((x: any) => ({
        test_id: x.test_id || x.id || x.exam_id,
        schedule_id: x.schedule_id || '',
        title: x.schedule_title || x.name || '', //exam_title
        // whether review is available for this user on this exam
        user_review: x.user_review || x.review_available || x.review || false,
        start_time: fmtDate(x.start_time || x.start),
        end_time: fmtDate(x.end_time || x.end),
        pass_mark: x.pass_mark || 0,
        number_of_attempts: x.number_of_attempts || 0,
        duration_mins: x.duration_mins || x.duration || 0,
        total_questions: x.total_questions || x.questions_count || 0,
        type: x.type
      }));
      this.loading = false;
      this.dataSource.data = this.exams;
      // populate per-tab sources
      this.updateTabDataSources();
      try{ 
        this.dataSource.sort = this.sort; 
        this.activeSource.sort = this.sort;
        this.completeSource.sort = this.sort;
        this.upcomingSource.sort = this.sort;
      }catch(e){}
      this.loader.hide();
      },
      error: (err) => { console.warn('Failed to load exams', err); this.loading = false; this.exams = []; this.loader.hide(); }
    });

  }

  private updateTabDataSources(){
    const lc = (s?: string) => (s || '').toString().toLowerCase();
    const isActive = (t?: string) => ['active','live'].includes(lc(t));
    const isComplete = (t?: string) => ['complete','completed','done'].includes(lc(t));
    const isUpcoming = (t?: string) => ['upcoming','scheduled','pending','upcomming'].includes(lc(t));

    this.activeSource.data = this.exams.filter(e => isActive(e.type));
    this.completeSource.data = this.exams.filter(e => isComplete(e.type));
    this.upcomingSource.data = this.exams.filter(e => isUpcoming(e.type));
  }

  // Helpers used by the template to safely check selected options
  normalizeSelectedOptions(item: any): string[] {
    const sel = item && item.selected_option;
    if (!sel) return [];
    if (Array.isArray(sel)) return sel.map((s: any) => String(s));
    return [String(sel)];
  }

  isOptionSelected(item: any, opt: any): boolean {
    try {
      const arr = this.normalizeSelectedOptions(item);
      const optText = (opt && opt.option_text) ? String(opt.option_text) : '';
      return arr.indexOf(optText) >= 0;
    } catch (e) { return false; }
  }

  // Returns a CSS class for a review row based on correctness
  getRowClass(item: any): string {
    if (typeof item?.is_correct === 'boolean') return item.is_correct ? 'row-correct' : 'row-incorrect';
    if (typeof item?.is_correct === 'number') return item.is_correct ? 'row-correct' : 'row-incorrect';
    return '';
  }

  // Determine option highlight status: 'selected-correct', 'selected-incorrect', 'correct', or ''
  optionStatus(item: any, opt: any): string {
    try{
      const optText = (opt && opt.option_text) ? String(opt.option_text) : '';
      const selected = this.normalizeSelectedOptions(item);
      const isSelected = selected.indexOf(optText) >= 0;
      const isCorrect = (opt && (Number(opt.is_correct) === 1 || opt.is_correct === 1 || opt.is_correct === true));
      if (isSelected && isCorrect) return 'option-selected-correct';
      if (isSelected && !isCorrect) return 'option-selected-incorrect';
      if (!isSelected && isCorrect) return 'option-correct';
      return '';
    }catch(e){ return ''; }
  }

  // Safe template-friendly check for option correctness
  isOptionCorrect(opt: any): boolean {
    try{
      if (!opt) return false;
      const v = opt.is_correct !== undefined ? opt.is_correct : (opt.isCorrect !== undefined ? opt.isCorrect : 0);
      return Number(v) === 1 || v === true;
    }catch(e){ return false; }
  }

  launchExam(ex: UserExamRow){
    if (!ex?.schedule_id) { try { notify('Schedule id missing', 'error'); } catch(e){}; return; }
    const userRaw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
    const userId = userRaw ? (JSON.parse(userRaw)?.user_id || JSON.parse(userRaw)?.id || '') : '';
    const url = `${this.launchUrl}?schedule_id=${encodeURIComponent(String(ex.schedule_id))}&user_id=${encodeURIComponent(String(userId))}`;
    // call launch API and navigate to user-exam page with payload
    this.http.get<any>(url).subscribe({
      next: (res) => {
        // store the returned exam payload (questions etc) in sessionStorage for the user-exam page
        try{ sessionStorage.setItem('launched_exam', JSON.stringify(res?.data || res)); }catch(e){}
        // navigate to user exam page
        window.location.href = '/user-exam';
      },
      error: (err) => { console.warn('Failed to launch exam', err); try { notify('Could not launch exam', 'error'); } catch(e){} }
    });
  }

  applyFilter(){
    const q = (this.search || '').trim().toLowerCase();
    const predicate = (row: UserExamRow, filter: string) => {
      const byText = (row.title || '').toLowerCase().includes(filter) || (row.test_id || '').toLowerCase().includes(filter);
      const byPublished = this.filterPublished === '' ? true : ((this.filterPublished === 'live') ? !!row.published : !row.published);
      return byText && byPublished;
    };
    [this.dataSource, this.activeSource, this.completeSource, this.upcomingSource].forEach(ds => {
      ds.filterPredicate = predicate;
      ds.filter = q;
    });
  }

  ngAfterViewInit(): void {
    try{ this.dataSource.sort = this.sort; }catch(e){}
  }
}


