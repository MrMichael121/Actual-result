import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PageMetaService } from '../../../shared/services/page-meta.service';
import { API_BASE } from 'src/app/shared/api.config';
import { DynamicChartComponent } from '../../super-admin/dynamic-chart.component';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-results',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DynamicChartComponent, MatSelectModule, MatIconModule, MatButtonModule, RouterModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class AdminResultsComponent implements OnInit {
  metrics = {
    totalStudents: 1240,
    testsScheduled: 12,
    attemptsToday: 86,
    avgScore: 72
  };
  upcomingTests: Array<{ title: string; class: string; start: Date }> = [];

  charts: Array<{ type: string; title: string; data: any; key?: string }> = [];

  institutes: Array<{ id: string; name: string }> = [];
  selectedInstituteId: string | null = null;

  private apiUrl = `${API_BASE}/admin-dashboard`;

  constructor(private http: HttpClient, private pageMeta: PageMetaService) {}

  ngOnInit(): void {
    try { this.pageMeta.setMeta('Admin Dashboard', 'Overview'); } catch(e){}
    this.loadDashboard();
    this.loadInstitutes();
  }

  private loadInstitutes(){
    const url = `${API_BASE}/institutes/list`;
    this.http.get<any>(url).subscribe({
      next: (res)=>{
        const list = Array.isArray(res) ? res : (res?.institutes || res?.data || []);
        this.institutes = (list || []).map((i:any)=>({ id: String(i.id || i.institute_id || i._id || ''), name: i.name || i.institute || 'Institute' }));
        const loginInst = sessionStorage.getItem('institute_id') || sessionStorage.getItem('instituteId');
        if(loginInst) this.selectedInstituteId = String(loginInst);
        else if(this.institutes.length) this.selectedInstituteId = this.institutes[0].id;
      },
      error: (err)=> console.warn('Failed to load institutes', err)
    });
  }

  onInstituteChange(id: string|null){
    this.selectedInstituteId = id;
    this.loadDashboard();
  }

  private loadDashboard(){
    const params = this.selectedInstituteId ? `?institute_id=${encodeURIComponent(this.selectedInstituteId)}` : '';
    this.http.get<any>(this.apiUrl + params).subscribe({
      next: (res) => this.applyDashboardData(res),
      error: (err) => console.warn('Failed to load dashboard', err)
    });
  }

  private applyDashboardData(res: any){
    if(!res) return;
    const s = res.summary || res.details?.summary || res || {};
    this.metrics.totalStudents = s.total_students ?? s.totalStudents ?? this.metrics.totalStudents;
    this.metrics.testsScheduled = s.scheduled_tests ?? s.testsScheduled ?? this.metrics.testsScheduled;
    this.metrics.attemptsToday = s.attempts_today ?? s.attemptsToday ?? this.metrics.attemptsToday;
    this.metrics.avgScore = s.avg_score ?? s.avgScore ?? this.metrics.avgScore;

    this.upcomingTests = (res.upcoming_tests || res.upcoming || res.details?.upcoming || []).map((t:any)=>({ title: t.title || t.name || 'Test', class: t.class || t.group || '-', start: new Date(t.start || t.scheduled_at || Date.now()) }));

    const apiCharts = Array.isArray(res.charts) ? res.charts : Array.isArray(res.charts_list) ? res.charts_list : null;
    if(apiCharts){
      const colors = ['#0b7285','#1f7bff','#66c2d9','#8ad1c8'];
      this.charts = apiCharts.map((c:any, idx:number)=>{
        const type = (c.type || 'line').toString();
        const title = c.title || c.label || ('Chart ' + (idx+1));
        const raw = c.data || {};
        const labels: string[] = raw.labels || [];
        const values: number[] = (raw.values || []).map((v:any)=>Number(v||0));

        if(type === 'bar' || type === 'column'){
          const max = Math.max(...values, 1);
          const barRects = values.map((v:number,i:number)=>{ const width = 24; const x = 10 + i*40; const height = (v/max) * 80; const y = 100 - height; return { x, y, width, height, color: colors[i % colors.length], label: labels[i] || ('#'+i), value: v }; });
          return { type: 'bar', title, data: { barRects }, key: c.id };
        }

        if(type === 'pie'){
          const total = values.reduce((s,n)=>s+n,0) || 1;
          let acc = 0;
          const pcolors = ['#1f7bff','#0b7285','#66c2d9','#8ad1c8'];
          const pieSlices = values.map((v:number,i:number)=>{ const pct = Math.round((v/total)*100); const dasharray = `${pct} ${100 - pct}`; const dashoffset = -acc; acc += pct; return { label: labels[i] || ('#'+i), value: v, pct, color: pcolors[i % pcolors.length], dasharray, dashoffset }; });
          return { type: 'pie', title, data: { pieSlices }, key: c.id };
        }

        if(type === 'line'){
          const n = Math.max(values.length, 1);
          const maxV = Math.max(...values, 1);
          const pts: string[] = [];
          const attemptPoints = values.map((v:number,i:number)=>{ const cx = i*(200/(Math.max(n-1,1))); const cy = 60 - (v / maxV * 50); pts.push(`${cx},${cy}`); return { cx, cy, v }; });
          const attemptsPointsStr = pts.join(' ');
          return { type: 'line', title, data: { attemptsPointsStr, attemptPoints, labels, values }, key: c.id };
        }

        const fallbackPts: string[] = [];
        const fallbackMax = Math.max(...values, 1);
        const fallbackPoints = values.map((v:number,i:number)=>{ const cx = i*(200/(Math.max(values.length-1,1))); const cy = 60 - (v / fallbackMax * 50); fallbackPts.push(`${cx},${cy}`); return { cx, cy, v }; });
        return { type: 'line', title, data: { attemptsPointsStr: fallbackPts.join(' '), attemptPoints: fallbackPoints, labels, values }, key: c.id };
      });
    } else {
      this.charts = [ { type: 'gauge', title: 'Average Score', data: { gaugePathD: '', metricValue: this.metrics.avgScore }, key: 'avg_score' } ];
    }
  }
}
 
