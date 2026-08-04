import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, beforeEach } from 'vitest';

import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing';
import { SectionHeaderComponent } from './section-header';

describe('SectionHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionHeaderComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useClass: MockSupabaseService },
        {
          provide: BreadcrumbsService,
          useValue: { slicedBreadcrumbs: () => [] },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SectionHeaderComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should accept title input', () => {
    const fixture = TestBed.createComponent(SectionHeaderComponent);
    fixture.componentRef.setInput('title', 'Test Title');
    expect(fixture.componentInstance.title()).toBe('Test Title');
  });
});
