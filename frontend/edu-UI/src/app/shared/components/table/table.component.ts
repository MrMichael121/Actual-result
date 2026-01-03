import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface TableHeader { key: string; label: string; sortable?: boolean; width?: string; }

@Component({
  selector: 'app-shared-table',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class SharedTableComponent implements AfterViewInit {
  @Input() headers: TableHeader[] = [];
  @Input() data: any[] = [];
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Input() showActions = true; // show default action column

  @Output() view = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() del = new EventEmitter<any>();
  @Output() rowClick = new EventEmitter<any>();

  dataSource = new MatTableDataSource<any>([]);

  get displayedColumns(): string[] {
    const cols = (this.headers || []).map(h => h.key || '');
    if(this.showActions) cols.push('actions');
    return cols;
  }

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  ngAfterViewInit(): void {
    this.setupDataSource();
  }

  ngOnChanges(): void {
    this.setupDataSource();
  }

  private setupDataSource(){
    this.dataSource = new MatTableDataSource<any>(Array.isArray(this.data) ? this.data : []);
    try{ if(this.paginator) this.dataSource.paginator = this.paginator; }catch(e){}
    try{ if(this.sort) this.dataSource.sort = this.sort; }catch(e){}
  }

  applyFilter(filterValue: string){
    const q = (filterValue || '').trim().toLowerCase();
    this.dataSource.filter = q;
  }

  onView(row: any){ this.view.emit(row); }
  onEdit(row: any){ this.edit.emit(row); }
  onDelete(row: any){ this.del.emit(row); }
  onRowClick(row: any){ this.rowClick.emit(row); }
}
