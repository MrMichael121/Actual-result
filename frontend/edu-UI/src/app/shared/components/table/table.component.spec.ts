import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTableComponent } from './table.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

describe('SharedTableComponent', () => {
  let component: SharedTableComponent;
  let fixture: ComponentFixture<SharedTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTableComponent, MatIconModule, MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule, MatInputModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SharedTableComponent);
    component = fixture.componentInstance;
  });

  it('creates and displays rows', () => {
    component.headers = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];
    component.data = [{ id: '1', name: 'Alice'}, { id: '2', name: 'Bob' }];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ID');
    expect(el.textContent).toContain('Name');
    expect(el.textContent).toContain('Alice');
    expect(el.textContent).toContain('Bob');
  });
});
