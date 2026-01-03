import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_BASE } from 'src/app/shared/api.config';
import { ConfirmService } from 'src/app/shared/services/confirm.service';
import { notify } from 'src/app/shared/global-notify';

interface Question {
  id?: string;
  question?: string;
  text?: string;
  type?: string; // 'choose' | 'multi' | 'fill' | 'paragraph'
  options?: Array<{ id?: string; text?: string }>;
  marks?: number;
}

@Component({
  selector: 'app-user-exam-runner',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './user-exam.component.html',
  styleUrls: ['./user-exam.component.scss']
})
export class UserExamRunnerComponent implements OnInit, OnDestroy{
  exam: any = null;
  questions: Question[] = [];
  answers: { [key: string]: any } = {};
  currentIndex = 0;

  showConfirm = false;
  get answeredCount() {
    return this.questions.filter((q, i) => {
      const key = q.id || i;
      const ans = this.answers[key];
      if (q.type === 'multi' || q.type === 'Multi') return Array.isArray(ans) && ans.length > 0;
      return !!ans;
    }).length;
  }
  get progressPercent() {
    return this.questions.length ? Math.round((this.answeredCount / this.questions.length) * 100) : 0;
  }

  totalSeconds = 0;
  remaining = 0;
  intervalRef: any = null;
  examTitle = '';
  examId = '';
  attempt_id = '';
  schedule_id = '';
  submitting = false;
  private submitUrl = `${API_BASE}/submit-exam`;

  constructor(private http: HttpClient, private confirmService: ConfirmService){}

  ngOnInit(){
    try{ const raw = sessionStorage.getItem('launched_exam'); this.exam = raw ? JSON.parse(raw) : null; }catch(e){}
    if (this.exam){
      // handle payloads that may be either { exam_detail: {...}, questions: [...] } or { data: { exam_detail:..., questions: [...] } }
      const wrapper = this.exam?.data ? this.exam.data : this.exam;
      // schedule_id
      this.schedule_id = this.exam.schedule_id || wrapper?.exam_detail?.schedule_id || wrapper?.schedule_id || this.exam.id || this.exam?.schedule_id || '';
      // normalize title and id from payload
      this.examTitle = this.exam.title || this.exam.name || wrapper?.exam_detail?.title || wrapper?.title || wrapper?.exam_id || '';
      this.examId = this.exam.exam_id || wrapper?.exam_detail?.exam_id || wrapper?.exam_id || this.exam.id || this.exam?.exam_id || '';
      // attempt_id
      this.attempt_id = this.exam.attempt_id || wrapper?.exam_detail?.attempt_id || wrapper?.attempt_id || this.exam.id || this.exam?.attempt_id || '';
      const rawQs = Array.isArray(wrapper?.questions) ? wrapper.questions : (Array.isArray(this.exam.questions) ? this.exam.questions : []);
      this.questions = rawQs.map((q:any) => ({ id: q.question_id || q.id, question: q.question_text || q.question || '', text: q.question_text || q.question || '', type: q.question_type || q.type, options: Array.isArray(q.options) ? q.options : [], marks: q.marks || q.points || 0 }));
      // set timer
      const mins = this.exam.duration_mins || wrapper?.exam_detail?.duration_mins || wrapper?.duration_mins || this.exam?.duration || 30;
      this.totalSeconds = mins * 60;
      this.remaining = this.totalSeconds;
      this.startTimer();
    }
  }

  ngOnDestroy(){ this.stopTimer(); }

  startTimer(){
    this.stopTimer();
    this.intervalRef = setInterval(()=>{
      if (this.remaining > 0) {
        this.remaining--;
        // Timer warning: could add sound or toast here if needed
      } else {
        this.autoSubmit();
      }
    }, 1000);
  }

  autoSubmit() {
    if (this.submitting) return;
    try { notify('Time is up! Your exam will be submitted automatically.', 'info'); } catch(e){}
    this.submit();
  }
  stopTimer(){ if (this.intervalRef){ clearInterval(this.intervalRef); this.intervalRef = null; } }

  formatTime(sec:number){ const m = Math.floor(sec/60); const s = sec%60; return `${m}:${s.toString().padStart(2,'0')}`; }

  toggleMulti(qid: any, optId: any){ const key = String(qid); const set = Array.isArray(this.answers[key]) ? this.answers[key] : []; const idx = set.indexOf(String(optId)); if (idx>=0) set.splice(idx,1); else set.push(String(optId)); this.answers[key]=set; }
  selectOne(qid: any, optId: any){ this.answers[String(qid)]=String(optId); }

  // scroll to a specific question card by index
  scrollToQuestion(index: number){
    try{
      const el = document.getElementById('q-' + index);
      if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.currentIndex = index;
    }catch(e){ console.warn('scrollToQuestion failed', e); }
  }

  prevQuestion(){
    if(this.currentIndex <= 0) return;
    this.currentIndex--;
    this.scrollToQuestion(this.currentIndex);
  }

  nextQuestion(){
    if(this.currentIndex >= (this.questions.length - 1)) return;
    this.currentIndex++;
    this.scrollToQuestion(this.currentIndex);
  }

  openConfirm() {
    this.confirmService.confirm({ title: 'Submit Exam', message: 'Are you sure you want to submit the exam now?', confirmText: 'Submit', cancelText: 'Cancel' }).subscribe(ok => {
      if (!ok) return; this.submit();
    });
  }

  submit() {
    if (this.submitting) return;
    this.showConfirm = false;
    this.submitting = true;
    const userRaw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user') || sessionStorage.getItem('user_info');
    let userId = '';
    try{ const u = userRaw ? JSON.parse(userRaw) : null; userId = u?.user_id || u?.id || u?.email || ''; }catch(e){}

    const timeTakenMins = Math.round((this.totalSeconds - this.remaining)/60);
    // resolve schedule_id from multiple possible shapes
    const resolvedScheduleId = this.schedule_id || this.exam?.schedule_id || this.exam?.data?.exam_detail?.schedule_id || this.exam?.data?.schedule_id || this.exam?.id || this.exam?.exam_id || '';

    const payload: any = {
      exam_id: this.examId || this.exam?.exam_id || this.exam?.data?.exam_detail?.exam_id,
      schedule_id: resolvedScheduleId,
      user_id: userId,
      attempt_id: this.exam?.attempt_id || this.attempt_id,
      answers: this.answers,
      submitted_at: new Date().toISOString(),
      time_taken_mins: timeTakenMins
    };

    this.http.post<any>(this.submitUrl, payload).subscribe({
      next: (res) => {
        // optional: clear session storage
        try{ sessionStorage.removeItem('launched_exam'); sessionStorage.setItem('last_submission', JSON.stringify(res)); }catch(e){}
        this.submitting = false;
        this.stopTimer();
        // redirect to user dashboard
        window.location.href = '/user-dashboard';
      },
      error: (err) => {
        console.warn('Submit failed', err);
        this.submitting = false;
        try { notify('Failed to submit exam. Please try again.', 'error'); } catch(e) { console.warn('Failed to submit exam. Please try again.'); }
      }
    });
  }
}
