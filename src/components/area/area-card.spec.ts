import { ComponentRef, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AreaListItem } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

import { AreaCardComponent } from './area-card';

describe('AreaCardComponent', () => {
  let fixture: ComponentFixture<AreaCardComponent>;
  let component: AreaCardComponent;
  let componentRef: ComponentRef<AreaCardComponent>;

  const mockArea: Partial<AreaListItem> = {
    id: 1,
    name: 'El Chorro',
    slug: 'el-chorro',
    crags_count: 12,
    liked: true,
    grades: { 1: 5, 2: 10 },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaCardComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: false },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create component instance', () => {
    componentRef.setInput('area', mockArea);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should transform area input and set default liked and grades', () => {
    componentRef.setInput('area', { name: 'Rodellar', slug: 'rodellar' });
    fixture.detectChanges();

    const result = component.area();
    expect(result.name).toBe('Rodellar');
    expect(result.slug).toBe('rodellar');
    expect(result.liked).toBe(false);
    expect(result.grades).toEqual({});
  });

  it('should set custom appearance input', () => {
    componentRef.setInput('area', mockArea);
    componentRef.setInput('appearance', 'flat');
    fixture.detectChanges();

    expect(component.appearance()).toBe('flat');
  });
});
