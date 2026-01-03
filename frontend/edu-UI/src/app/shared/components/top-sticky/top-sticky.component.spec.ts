import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopStickyComponent } from './top-sticky.component';

describe('TopStickyComponent', () => {
  let component: TopStickyComponent;
  let fixture: ComponentFixture<TopStickyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TopStickyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TopStickyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
