import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OperatorPage } from './operator.page';

describe('OperatorPage', () => {
  let component: OperatorPage;
  let fixture: ComponentFixture<OperatorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OperatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
