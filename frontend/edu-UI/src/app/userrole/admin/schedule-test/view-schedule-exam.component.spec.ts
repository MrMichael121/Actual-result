import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewScheduleExamComponent } from './view-schedule-exam.component';

describe('ViewScheduleExamComponent', () => {
  let component: ViewScheduleExamComponent;
  let fixture: ComponentFixture<ViewScheduleExamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewScheduleExamComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewScheduleExamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
