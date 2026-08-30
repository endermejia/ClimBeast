import { TestBed } from '@angular/core/testing';

import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UndoToastComponent } from './undo-toast';

describe('UndoToastComponent', () => {
  let undoCalled: boolean;
  let mockContext: {
    data: { message: string; undoCallback: () => void };
    completeWith: (value: boolean) => void;
    $implicit: { complete: () => void };
  };

  beforeEach(async () => {
    undoCalled = false;
    mockContext = {
      data: {
        message: 'messages.toasts.routeRemoved',
        undoCallback: (): void => {
          undoCalled = true;
        },
      },
      completeWith: vi.fn(),
      $implicit: { complete: vi.fn() },
    };

    await TestBed.configureTestingModule({
      imports: [UndoToastComponent, TranslateModule.forRoot()],
      providers: [{ provide: POLYMORPHEUS_CONTEXT, useValue: mockContext }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(UndoToastComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call undoCallback and completeWith on undo', () => {
    const fixture = TestBed.createComponent(UndoToastComponent);
    fixture.detectChanges();

    fixture.componentInstance.onUndo();
    expect(undoCalled).toBe(true);
    expect(mockContext.completeWith).toHaveBeenCalledWith(true);
  });

  it('should call complete on close', () => {
    const fixture = TestBed.createComponent(UndoToastComponent);
    fixture.detectChanges();

    fixture.componentInstance.onClose();
    expect(mockContext.$implicit.complete).toHaveBeenCalledOnce();
  });
});
