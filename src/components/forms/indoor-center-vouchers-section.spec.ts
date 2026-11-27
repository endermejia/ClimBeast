import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  IndoorCenterLocalVoucher,
  IndoorCenterVouchersSectionComponent,
} from './indoor-center-vouchers-section';

describe('IndoorCenterVouchersSectionComponent', () => {
  let fixture: ComponentFixture<IndoorCenterVouchersSectionComponent>;
  let component: IndoorCenterVouchersSectionComponent;
  let componentRef: ComponentRef<IndoorCenterVouchersSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IndoorCenterVouchersSectionComponent,
        TranslateModule.forRoot(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IndoorCenterVouchersSectionComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('vouchers', []);
    fixture.detectChanges();
  });

  it('shows empty state when no active vouchers exist and disables Add until name is set', () => {
    expect(fixture.nativeElement.textContent).toContain('empty');

    const addButton = fixture.nativeElement.querySelector(
      'button[appearance="primary"]',
    ) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    expect(addButton.getAttribute('data-size')).toBe('m');
    expect(addButton.classList.contains('font-bold')).toBe(false);

    component.newVoucherName.set('Day pass');
    fixture.detectChanges();
    expect(addButton.disabled).toBe(false);
  });

  it('adds a voucher to the model and resets form fields', () => {
    component.newVoucherName.set('10-pack');
    component.newVoucherDescription.set('Valid for 6 months');
    component.newVoucherKind.set('pass');
    component.newVoucherPrice.set(95.5);

    component.addLocalVoucher();
    fixture.detectChanges();

    expect(component.vouchers()).toEqual([
      {
        name: '10-pack',
        price: 95.5,
        kind: 'pass',
        description: 'Valid for 6 months',
      },
    ]);
    expect(component.newVoucherName()).toBe('');
    expect(component.newVoucherPrice()).toBeNull();
    expect(component.newVoucherKind()).toBe('pass');
    expect(component.newVoucherDescription()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('10-pack');
  });

  it('defaults null price to 0 and empty description to null', () => {
    component.newVoucherName.set('Free trial');
    component.addLocalVoucher();

    expect(component.vouchers()).toEqual([
      {
        name: 'Free trial',
        price: 0,
        kind: 'pass',
        description: null,
      },
    ]);
  });

  it('marks voucher as is_deleted on delete and hides it from rendered list', () => {
    const initial: IndoorCenterLocalVoucher[] = [
      { id: 'v-1', name: 'Monthly', price: 50, kind: 'subscription' },
      { id: 'v-2', name: 'Single', price: 12, kind: 'pass' },
    ];
    componentRef.setInput('vouchers', initial);
    fixture.detectChanges();

    component.deleteLocalVoucher(initial[0]);
    fixture.detectChanges();

    expect(component.vouchers()).toEqual([
      { ...initial[0], is_deleted: true },
      initial[1],
    ]);
    expect(fixture.nativeElement.textContent).not.toContain('Monthly');
    expect(fixture.nativeElement.textContent).toContain('Single');
  });

  it('populates form fields and marks original deleted when editing a voucher', () => {
    const existing: IndoorCenterLocalVoucher = {
      id: 'v-1',
      name: 'Monthly',
      price: 50,
      kind: 'subscription',
      description: 'Unlimited access',
    };
    componentRef.setInput('vouchers', [existing]);
    fixture.detectChanges();

    component.editLocalVoucher(existing);
    fixture.detectChanges();

    expect(component.newVoucherName()).toBe('Monthly');
    expect(component.newVoucherPrice()).toBe(50);
    expect(component.newVoucherKind()).toBe('subscription');
    expect(component.newVoucherDescription()).toBe('Unlimited access');
    expect(component.vouchers()[0].is_deleted).toBe(true);
  });
});
