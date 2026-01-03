import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PageMetaService } from '../../../shared/services/page-meta.service';
import { API_BASE } from 'src/app/shared/api.config';
import { DynamicChartComponent } from '../dynamic-chart.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DynamicChartComponent, MatIconModule, MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})


export class SuperDashboardComponent implements OnInit {
 
    summary = {
    totalUsers: 0,
    totalInstitutes: 0,
    activeTests: 0,
    upcomingTests: 0,
    completedTests: 0
  };
  instituteStats: Array<{ name: string; users: number; scheduledTests: number }> = [];
  // visual / metric fields
  passRate = 0;
  avgScore = 0;
  attempts: number[] = [];

  // final charts array used by template
  charts: Array<{ type: string; title: string; data: any; key?: string }> = [];
  
  private apiUrl = `${API_BASE}/superadmin-dashboard`;

  constructor(private http: HttpClient, private pageMeta: PageMetaService){ }

  ngOnInit(): void {
    try { this.pageMeta.setMeta('Super Admin Dashboard', 'Overview'); } catch(e){}
    this.loadDashboard();
  }

  loadDashboard(){
    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => this.applyDashboardData(res),
      error: (err) => console.warn('Failed to load dashboard', err)
    });
  }

  private applyDashboardData(res: any){
    if(!res) return;
    // summary (res.summary expected)
    const s = res.summary || res.details?.summary || res || {};
    this.summary.totalUsers = s.total_users ?? s.totalUsers ?? 0;
    this.summary.totalInstitutes = s.total_institutes ?? s.totalInstitutes ?? 0;
    this.summary.upcomingTests = s.upcoming_exams ?? s.upcomingExams ?? 0;
    this.summary.activeTests = s.active_exams ?? s.activeExams ?? 0;
    this.summary.completedTests = s.completed_exams ?? s.completedExams ?? 0;

    // core lists (top institutes may live under details.top_institutes)
    const topInstitutes = res.details?.top_institutes || res.top_institutes || res.topInstitutes || [];
    this.instituteStats = (topInstitutes || []).map((t:any)=>({ name: t.name || t.institute || 'N/A', users: t.users || t.count || 0, scheduledTests: t.exams || t.scheduled_tests || t.scheduledTests || 0 }));

    // exam stats
    const examStats = res.details?.exam_stats || res.exam_stats || {};
    this.passRate = examStats?.pass_rate ? Math.round(examStats.pass_rate * 100) : (examStats?.pass_rate || 0);
    this.avgScore = examStats?.average_score || examStats?.avg_score || 0;

    // attempts / growth
    this.attempts = (res.user_growth || res.userGrowth || res.attempts_over_time || []).map((x:any)=> x.users ?? x.count ?? x.value ?? 0);

    // Build charts list from API `charts` array when present
    const apiCharts = Array.isArray(res.charts) ? res.charts : Array.isArray(res.charts_list) ? res.charts_list : null;
    if(apiCharts){
      const colors = ['#0b7285','#1f7bff','#66c2d9','#8ad1c8'];
      this.charts = apiCharts.map((c:any, idx:number) => {
        const type = (c.type || 'line').toString();
        const title = c.title || c.label || c.id || ('Chart ' + (idx+1));
        const raw = c.data || {};
        const labels: string[] = raw.labels || [];
        const values: number[] = (raw.values || []).map((v:any)=>Number(v||0));

        // convert to our DynamicChartComponent expected shapes
        if(type === 'bar' || type === 'column'){
          const max = Math.max(...values, 1);
          const barRects = values.map((v:number, i:number)=>{ const width = 24; const x = 10 + i*40; const height = (v/max) * 80; const y = 100 - height; return { x, y, width, height, color: colors[i % colors.length], label: labels[i] || ('#'+i), value: v }; });
          return { type: 'bar', title, data: { barRects } , key: c.id };
        }

        if(type === 'pie'){
          const total = values.reduce((s, n) => s + n, 0) || 1;
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

        // gauge or single-metric
        if(type === 'gauge' || (values && values.length === 1)){
          const val = values[0] ?? 0;
          // simple gauge path generation (approx)
          const angle = (1 - (val || 0)/100) * Math.PI;
          const gx = 6 + 22 * Math.cos(angle);
          const gy = 20 - 22 * Math.sin(angle);
          const gaugePathD = `M6 20 A12 12 0 0 1 ${gx} ${gy}`;
          return { type: 'gauge', title, data: { gaugePathD, metricValue: val }, key: c.id };
        }

        // fallback: provide line data
        const fallbackPts: string[] = [];
        const fallbackMax = Math.max(...values, 1);
        const fallbackPoints = values.map((v:number,i:number)=>{ const cx = i*(200/(Math.max(values.length-1,1))); const cy = 60 - (v / fallbackMax * 50); fallbackPts.push(`${cx},${cy}`); return { cx, cy, v }; });
        return { type: 'line', title, data: { attemptsPointsStr: fallbackPts.join(' '), attemptPoints: fallbackPoints, labels, values }, key: c.id };
      });
    } else {
      // fallback: build default charts from computed/internal data
      this.charts = [
        { type: 'bar', title: 'Users by Institute', data: { barRects: [] }, key: 'users_by_institute' }
      ];
    }
  }



}
