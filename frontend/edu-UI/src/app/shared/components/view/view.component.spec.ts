import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedViewComponent } from './view.component';
import { MatIconModule } from '@angular/material/icon';

describe('SharedViewComponent', () => {
  let component: SharedViewComponent;
  let fixture: ComponentFixture<SharedViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedViewComponent, MatIconModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SharedViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders provided data keys', () => {
    component.data = { name: 'Test', age: 30 };
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test');
    expect(el.textContent).toContain('30');
  });
});
