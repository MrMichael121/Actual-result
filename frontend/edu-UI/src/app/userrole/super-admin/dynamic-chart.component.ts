import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-chart',
  standalone: true,
  templateUrl: './dynamic-chart.component.html',
  styleUrls: ['./dynamic-chart.component.scss'],
  imports: [CommonModule]
})
export class DynamicChartComponent {
  @Input() type: string = 'bar';
  @Input() data: any = {};

  get barRects() { return this.data?.barRects || []; }
  get pieSlices() { return this.data?.pieSlices || []; }
  get attemptsPointsStr() { return this.data?.attemptsPointsStr || ''; }
  get attemptPoints() { return this.data?.attemptPoints || []; }
  get gaugePathD() { return this.data?.gaugePathD || ''; }
  get metricValue() { return this.data?.metricValue ?? ''; }
  get topInstitutes() { return this.data?.topInstitutes || []; }
}
