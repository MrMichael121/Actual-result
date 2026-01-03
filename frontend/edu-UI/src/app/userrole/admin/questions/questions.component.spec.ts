import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminQuestionsComponent } from './questions.component';

describe('AdminQuestionsComponent', () => {
  let component: AdminQuestionsComponent;
  let fixture: ComponentFixture<AdminQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminQuestionsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});