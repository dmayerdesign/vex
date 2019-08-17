import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VexComponent } from './vex.component';

describe('VexComponent', () => {
  let component: VexComponent;
  let fixture: ComponentFixture<VexComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VexComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
