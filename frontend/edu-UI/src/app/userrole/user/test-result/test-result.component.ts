import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { notify } from 'src/app/shared/global-notify';

@Component({
  selector: 'app-user-test-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-result.component.html',
  styleUrls: ['./test-result.component.scss']
})
export class UserTestResultComponent implements OnInit {
  result: TestResult | null = null;
  percent = 0;
  accuracy = 0;

  ngOnInit(): void {
    try{
      const raw = sessionStorage.getItem('test_result');
      if (raw){
        this.result = JSON.parse(raw) as TestResult;
      }
    }catch(e){ /* ignore parse errors */ }

    if (!this.result){
      // fallback sample
      this.result = {
        test_id: 'sample-1', title: 'Sample Test', user: 'student@example.com', total_marks: 40, score: 28, total_questions: 10, correct: 7, incorrect: 3, time_taken_mins: 42,
        started_at: new Date().toUTCString(), completed_at: new Date().toUTCString(), questions: [
          { id: 'q1', question: 'What is 2+2?', answer: '4', correct_answer: '4', marks_awarded: 4, marks:4 },
          { id: 'q2', question: 'Capital of France?', answer: 'Paris', correct_answer: 'Paris', marks_awarded: 4, marks:4 }
        ]
      };
    }

    const r = this.result;
    this.percent = r && r.total_marks ? Math.round(((r.score||0) / (r.total_marks||1)) * 100) : 0;
    this.accuracy = r && r.total_questions ? Math.round(((r.correct||0) / (r.total_questions||1)) * 100) : 0;
  }

  downloadPdf(){
    try { notify('Download PDF - not implemented yet', 'info'); } catch(e){}
  }

  reviewAnswers(){
    // store and navigate to review page if exists
    try{ sessionStorage.setItem('review_questions', JSON.stringify(this.result?.questions||[])); }catch(e){}
    try { notify('Review answers - implement navigation to review page', 'info'); } catch(e){}
  }

  backToDashboard(){
    // simple navigation using location for now
    window.location.href = '/';
  }
}

export interface QuestionResult {
  id?: string;
  question?: string;
  answer?: string;
  correct_answer?: string;
  marks_awarded?: number;
  marks?: number;
}

export interface TestResult {
  test_id?: string;
  title?: string;
  user?: string;
  total_marks?: number;
  score?: number;
  total_questions?: number;
  correct?: number;
  incorrect?: number;
  time_taken_mins?: number;
  started_at?: string;
  completed_at?: string;
  questions?: QuestionResult[];
}

// ...existing code...
