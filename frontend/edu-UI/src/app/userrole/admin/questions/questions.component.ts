import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { API_BASE } from 'src/app/shared/api.config';
import { notify } from 'src/app/shared/global-notify';
import { PageMetaService } from 'src/app/shared/services/page-meta.service';

@Component({
  selector: 'app-admin-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatRadioModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatExpansionModule, HttpClientModule, RouterModule, MatIconModule, MatButtonModule, MatSelectModule, MatAutocompleteModule],
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.scss']
})
export class AdminQuestionsComponent {
  // UI mode: whether currently editing an existing question batch
  isEditing = false;
  editId: string | number | undefined;
  questionTypes = [
    { value: 'choose', label: 'Single choice' },
    { value: 'multi', label: 'Multiple choice' },
    { value: 'fill', label: 'Fill in the blank' },
    { value: 'descriptive', label: 'Descriptive' }
  ];

  // allow multiple question blocks; institute and exam are global for the batch
  questions: Array<any> = [{
    type: '',
    text: '',
    marks: 1,
    options: ['',''],
    correct: null as number | null | number[],
    answerText: '',
    _expanded: true
  }];

  // UI mode: 'manual' (default) or 'bulk'
  mode: 'manual' | 'bulk' = 'manual';

  // convenience boolean binding for a compact checkbox UI in the template
  get bulkMode(): boolean { return this.mode === 'bulk'; }
  set bulkMode(v: boolean) { this.mode = v ? 'bulk' : 'manual'; }

  // bulk upload state
  selectedBulkFile: File | null = null;
  // visual state for drag-over highlight
  dragActive = false;
  private bulkUploadUrl = `${API_BASE}/upload-questions`;

  // convenience getters targeting the first question for legacy bindings if needed
  get model(){ return this.questions[0]; }

  institutes: Array<{ name: string; institute_id?: string }> = [];
  isSuperAdmin: boolean = false;
  categories: Array<{ name: string; category_id?: string; description?: string }> = [];
  // reactive control + filtered observable for autocomplete
  categoryCtrl: FormControl = new FormControl('');
  filteredCategories$?: Observable<Array<{ name: string; category_id?: string; description?: string }>>;
  // currently selected category object (for showing description)
  selectedCategory: { name?: string; category_id?: string; description?: string } | null = null;
  exams: Array<{ title: string; exam_id?: string }> = [];

  private apiUrl = `${API_BASE}/add-question`;
  // updated endpoints per request
  private institutesUrl = `${API_BASE}/get-institute-list`;
  private examsUrl = `${API_BASE}/get-exams-list`;
  private categoriesUrl = `${API_BASE}/get-categories-list`;
  constructor(private http: HttpClient,private pageMeta: PageMetaService){
    // infer super-admin role and default institute from session data when available
    try {
      const raw = sessionStorage.getItem('user_profile') || sessionStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        this.isSuperAdmin = !!(u && (u.is_super_admin === true || u.isSuperAdmin || u.role === 'super_admin' || u.user_role === 'super_admin'));
        const instId = u?.institute_id || u?.instituteId || u?.institute || '';
        if (instId) {
          // prefill the first question's institute selection so the template select shows the user's institute
          try { this.questions[0].institute_id = String(instId); } catch(e){}
        }
      }
    } catch (e) { /* ignore */ }

    // call to populate institutes dropdown; loadCategories will be triggered after institutes load if an institute is prefilled
    this.loadInstitutes();
  }

  ngOnInit(): void {
    this.pageMeta.setMeta(this.isEditing ? 'Edit question':'Add question', this.isEditing ? 'Edit and update the question' : 'Add a new question to question bank ');
    // if arrived here from the questions list edit flow, prefill the form
    try {
      const raw = sessionStorage.getItem('edit_question');
      if (raw) {
        const q = JSON.parse(raw);
        // normalize options to array of strings
        const opts: string[] = [];
        if (Array.isArray(q.options)) {
          for (const o of q.options) {
            if (typeof o === 'string') opts.push(o);
            else if (o && (o.text || o.option || o.value || o.label)) opts.push(o.text || o.option || o.value || o.label);
            else opts.push(String(o));
          }
        }

        // determine correct index/indices
        let correct: number | number[] | null = null;
        if (q.correct !== undefined && q.correct !== null) {
          if (Array.isArray(q.correct)) correct = q.correct;
          else if (typeof q.correct === 'number') correct = q.correct;
        } else if (Array.isArray(q.options) && q.options.length && typeof q.options[0] === 'object') {
          // options may have is_correct flags
          const correctIdxs: number[] = [];
          for (let i = 0; i < q.options.length; i++) {
            const o = q.options[i];
            if (o && (o.is_correct === 1 || o.is_correct === true || o.is_correct === '1' || o.is_correct === 'true')) {
              correctIdxs.push(i);
            }
          }
          if (correctIdxs.length === 1) correct = correctIdxs[0];
          else if (correctIdxs.length > 1) correct = correctIdxs;
        }

        const first: any = {
          type: q.type || q.originalType || q.question_type || '',
          text: q.question || q.text || q.title || '',
          marks: q.marks || q.points || 1,
          options: opts.length ? opts : ['',''],
          correct: correct,
          answerText: q.answer || q.answerText || q.correct || '',
          // copy global selections if provided
          institute_id: q.institute_id || (q.institute && (q.institute.institute_id || q.institute.id)) || '',
          exam_id: q.exam_id || (q.exam && (q.exam.exam_id || q.exam.id)) || '',
          category_id: q.category_id || (q.category && (q.category.category_id || q.category.id)) || '',
          // keep original id for reference if backend uses it
          id: q.id || q.question_id || q._id || undefined
        };

        // replace the first question block with the prefilled data
        this.questions = [first];
        // mark editing mode and preserve original id
        this.isEditing = true;
        this.editId = first.id;

        // clear the storage key so repeated visits don't keep prefilling
        sessionStorage.removeItem('edit_question');
      }
    } catch (e) {
      console.warn('Failed to prefill question from edit_question', e);
    }

    // ensure at least the first panel is expanded on initial load
    try {
      if (this.questions && this.questions.length) {
        this.questions.forEach((qq, idx) => qq._expanded = (idx === 0));
      }
    } catch (e) { /* ignore */ }
    // setup filtered observable for autocomplete
    this.filteredCategories$ = (this.categoryCtrl.valueChanges as any).pipe(
      startWith(this.categoryCtrl.value),
      map((val: any) => {
        const name = val && typeof val === 'object' ? val.name : (val || '');
        const q = String(name).trim().toLowerCase();
        if (!q) return this.categories.slice();
        return this.categories.filter(c => (c.name || '').toLowerCase().indexOf(q) > -1);
      })
    );
    // if a category was prefilled, set selectedCategory and control value for description display
    try {
      const cid = this.questions && this.questions[0] && (this.questions[0].category_id || '');
      if (cid) {
        // will populate when categories are loaded
      }
    } catch(e) {}
  }

  @ViewChild('hiddenFileInput') hiddenFileInput?: ElementRef<HTMLInputElement>;

  downloadTemplate() {
    // Create a simple CSV template that Excel can open.
    const headers = [
      'Question',	'Correct_answer',	'option_1',	'option_2',	'option_3',	'option_4'
    ];
    const sample = [
      ['What is 2+2?', '4', '2', '3', '4', '5']
    ];
    const rows = [headers, ...sample].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
  
  triggerFileSelect(){
    try{ this.hiddenFileInput?.nativeElement.click(); }catch(e){ console.warn('triggerFileSelect failed', e); }
  }

  addQuestion() {
    // collapse other panels and expand newly added one
    if (this.questions && this.questions.length) this.questions.forEach(q => q._expanded = false);
    this.questions.push({ type: '', text: '', marks: 1, options: ['',''], correct: null, answerText: '', _expanded: true });
  }

  removeQuestion(index: number) {
    if (this.questions.length <= 1) return; // keep at least one
    this.questions.splice(index, 1);
  }

  resetAll(){
    // clear institute/exam selection stored on first block and reset to single empty block
    if (this.questions && this.questions.length) {
      this.questions[0].institute_id = '';
      this.questions[0].exam_id = '';
    }
    this.questions = [{ type: '', text: '', marks: 1, options: ['',''], correct: null, answerText: '' }];
  }

  onBulkFileSelected(ev: Event){
    const input = ev.target as HTMLInputElement;
    if (input && input.files && input.files.length){
      this.selectedBulkFile = input.files[0];
    } else {
      this.selectedBulkFile = null;
    }
  }
  // improved drag handling to allow visual feedback
  onDragOver(ev: DragEvent, markActive = true){ ev.preventDefault(); ev.stopPropagation(); if (markActive) this.dragActive = true; }
  onDragLeave(ev: DragEvent){ ev.preventDefault(); ev.stopPropagation(); this.dragActive = false; }
  onDrop(ev: DragEvent){
    ev.preventDefault(); ev.stopPropagation(); this.dragActive = false;
    const files = ev.dataTransfer && ev.dataTransfer.files;
    if (files && files.length){
      this.selectedBulkFile = files[0];
    }
  }

  loadInstitutes(){
    this.http.get<any>(this.institutesUrl).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        this.institutes = arr.map((r:any) => ({ name: r.name || r.institute_name || r.short_name || '', institute_id: r.institute_id || r.id }));
        // If an institute was prefilled (from session), ensure categories load for it
        try{ const pre = this.questions && this.questions[0] && (this.questions[0].institute_id || ''); if(pre) this.loadCategories(pre); }catch(e){}
      },
      error: (err) => {
        console.warn('Failed to load institutes', err);
      }
    });
  }
  loadCategories(instId?: string){
    let url = this.categoriesUrl;
    if (instId) url += `?institute_id=${encodeURIComponent(instId)}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        this.categories = arr.map((r:any) => ({ name: r.name || '', category_id: r.category_id || r.id, description: r.description || r.desc || '' }));
        // if a category was prefilled on the first question, set control to that object so autocomplete shows it
        try {
          const cid = this.questions && this.questions[0] && (this.questions[0].category_id || '');
          if (cid) {
            const found = this.categories.find(c => String(c.category_id) === String(cid));
            if (found) {
              this.selectedCategory = found as any;
              try { this.categoryCtrl.setValue(found); } catch(e) {}
            }
          }
        } catch(e) {}
      },
      error: (err) => {
        console.warn('Failed to load categories', err);
      }
    });
  }
  onCategoryAutocompleteSelected(cat: any){
    if (!cat) { this.selectedCategory = null; this.questions[0].category_id = ''; return; }
    this.selectedCategory = cat;
    try { this.questions[0].category_id = cat.category_id; } catch(e) {}
  }

  displayCategory(cat: any){ return cat && cat.name ? cat.name : ''; }

  loadExams(instituteId: string){
    if(!instituteId){ this.exams = []; return; }
    const url = `${this.examsUrl}?institute_id=${encodeURIComponent(instituteId)}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        this.exams = arr.map((e:any) => ({ title: e.title || e.name || '', exam_id: e.exam_id || e.id || e.examId }));
      },
      error: (err) => {
        console.warn('Failed to load exams', err);
        this.exams = [];
      }
    });
  }

  addOption(qIndex: number){
    this.questions[qIndex].options.push('');
  }

  // trackBy function to keep option input DOM stable when option values change
  trackByIndex(index: number, item: any) { return index; }

  removeOption(qIndex:number, i:number){
    const q = this.questions[qIndex];
    q.options.splice(i,1);
    // clean correct answers if necessary
    if (q.type === 'choose' && q.correct === i) q.correct = null;
    if (q.type === 'multi' && Array.isArray(q.correct)){
      const idx = q.correct.indexOf(i);
      if (idx > -1) q.correct.splice(idx,1);
    }
  }

  onPanelOpened(q: any, index: number) {
    // mark opened, collapse others
    try {
      this.questions.forEach((qq, idx) => qq._expanded = (idx === index));
    } catch (e) {}
  }

  onPanelClosed(q: any, index: number) {
    // mark closed; keep at least one expanded (if all closed, re-open first)
    try {
      q._expanded = false;
      const anyOpen = this.questions.some((qq:any) => qq._expanded);
      if (!anyOpen && this.questions.length) this.questions[0]._expanded = true;
    } catch (e) {}
  }

  setSingleCorrect(qIndex:number, i:number){
    this.questions[qIndex].correct = i;
  }

  toggleMultiCorrect(qIndex:number, i:number, checked: boolean){
    const q = this.questions[qIndex];
    if (!Array.isArray(q.correct)) q.correct = [];
    const arr: number[] = q.correct as number[];
    const idx = arr.indexOf(i);
    if (checked && idx === -1) arr.push(i);
    if (!checked && idx > -1) arr.splice(idx,1);
  }

  isOptionCorrect(qIndex:number, i:number){
    const q = this.questions[qIndex];
    if (q.type === 'choose') return q.correct === i;
    if (q.type === 'multi') return Array.isArray(q.correct) && (q.correct as number[]).indexOf(i) > -1;
    return false;
  }

  submit(){
    if (this.mode === 'bulk'){
      // use selected file and submit via FormData
      if (!this.selectedBulkFile){ try { notify('Please select a file to upload', 'error'); } catch(e){}; return; }
      const fd = new FormData();
      fd.append('file', this.selectedBulkFile);
      if (this.questions[0] && this.questions[0].institute_id) fd.append('institute_id', this.questions[0].institute_id);
      if (this.questions[0] && this.questions[0].category_id) fd.append('category_id', this.questions[0].category_id);
      this.http.post<any>(this.bulkUploadUrl, fd).subscribe({
        next: (res) => {
          try {
            const msg = res?.statusMessage || res?.message || 'Bulk upload completed';
            const ok = typeof res?.status === 'undefined' ? true : !!res.status;
            notify(msg, ok ? 'success' : 'error');
          } catch(e) {}
          this.selectedBulkFile = null;
        },
        error: (err) => { console.error('Bulk upload failed', err); try { notify(err?.error?.statusMessage || err?.error?.message || 'Bulk upload failed', 'error'); } catch(e){} }
      });
      return;
    }

    // Submit all questions as a batch; basic validation per question
    for (let q of this.questions){
      if (q.type === 'choose' && (q.correct === null || q.correct === undefined)){
        try { notify('Please select the correct option for single choice in all question blocks', 'error'); } catch(e){}
        return;
      }
      if (q.type === 'multi' && (!Array.isArray(q.correct) || (q.correct as number[]).length === 0)){
        try { notify('Please select one or more correct options for multiple choice in all question blocks', 'error'); } catch(e){}
        return;
      }
    }

    const payload = this.questions.map((q:any) => {
      const p = JSON.parse(JSON.stringify(q));
      if (q.type === 'choose' && typeof q.correct === 'number'){
        p.correct_indices = [q.correct];
        p.correct_values = [q.options[q.correct]];
      }
      if (q.type === 'multi' && Array.isArray(q.correct)){
        p.correct_indices = q.correct;
        p.correct_values = q.correct.map((i:number) => q.options[i]);
      }
      p.created_by = sessionStorage.getItem('user_id') || sessionStorage.getItem('username') || 'admin';
      return p;
    });

    // include institute and exam selection if present on the first question (global fields on the page)
    const body = { institute_id: (this.questions[0] as any).institute_id || undefined, exam_id: (this.questions[0] as any).exam_id || undefined, questions: payload };

    if (this.isEditing && this.editId) {
      // update single question
      const q = payload[0];
      const url = `${API_BASE}/update-question/${encodeURIComponent(String(this.editId))}`;
      this.http.put<any>(url, q).subscribe({ next: (res) => {
        try {
          const msg = res?.statusMessage || res?.message || 'Question updated';
          const ok = typeof res?.status === 'undefined' ? true : !!res.status;
          notify(msg, ok ? 'success' : 'error');
        } catch(e){}
        // optionally reset editing state
        this.isEditing = false;
        this.editId = undefined;
      }, error: (err) => {
        console.error('Failed to update question', err);
        try { notify(err?.error?.statusMessage || err?.error?.message || 'Failed to update question', 'error'); } catch(e){}
      } });
    } else {
      this.http.post<any>(this.apiUrl, body).subscribe({
        next: (res) => {
          try {
            const msg = res?.statusMessage || res?.message || 'Questions saved successfully';
            const ok = typeof res?.status === 'undefined' ? true : !!res.status;
            notify(msg, ok ? 'success' : 'error');
          } catch(e){}
          // reset to a single empty block
          this.questions = [{ type: '', text: '', marks: 1, options: ['',''], correct: null, answerText: '' }];
        },
        error: (err) => {
          console.error('Failed to save questions', err);
          try { notify(err?.error?.statusMessage || err?.error?.message || 'Failed to save questions. See console for details.', 'error'); } catch(e){}
        }
      });
    }
  }
}
