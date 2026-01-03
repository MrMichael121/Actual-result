import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ViewField { key: string; label?: string; format?: (v:any) => string }

@Component({
  selector: 'app-shared-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class SharedViewComponent {
  @Input() data: any = null;
  @Input() fields: ViewField[] | null = null; // optional explicit fields order
  @Input() title: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<any>();

  keys(): string[] {
    if(this.fields && Array.isArray(this.fields) && this.fields.length) return this.fields.map(f => f.key);
    if(!this.data || typeof this.data !== 'object') return [];
    return Object.keys(this.data);
  }

  labelFor(key: string){
    if(this.fields){
      const f = this.fields.find(x => x.key === key);
      return f?.label || key;
    }
    return key;
  }

  displayValue(key: string){
    const v = this.data?.[key];
    if(this.fields){
      const f = this.fields.find(x => x.key === key);
      if(f && typeof f.format === 'function') return f.format(v);
    }
    if(v === null || typeof v === 'undefined') return '—';
    if(typeof v === 'object') return JSON.stringify(v, null, 2);
    return String(v);
  }

  emitClose(){ this.close.emit(); }
  emitEdit(){ this.edit.emit(this.data); }
}
