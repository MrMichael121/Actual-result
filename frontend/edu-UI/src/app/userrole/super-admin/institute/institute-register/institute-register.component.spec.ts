import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstituteRegisterComponent } from './institute-register.component';

describe('InstituteRegisterComponent', () => {
  let component: InstituteRegisterComponent;
  let fixture: ComponentFixture<InstituteRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstituteRegisterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InstituteRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});