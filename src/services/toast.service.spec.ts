import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';
import { TuiToastService } from '@taiga-ui/kit';

import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorLogService } from './error-log.service';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let openSubjects: Subject<unknown>[];
  let mockTuiToast: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    openSubjects = [];
    mockTuiToast = {
      open: vi.fn(() => {
        const subj = new Subject<unknown>();
        openSubjects.push(subj);
        return subj.asObservable();
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: TuiToastService, useValue: mockTuiToast },
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        {
          provide: TranslateService,
          useValue: {
            get: vi.fn((key: string) =>
              of(
                key === 'errors.network'
                  ? 'Sin conexión a internet. Mostrando datos en caché.'
                  : key,
              ),
            ),
            instant: vi.fn((key: string) => key),
          },
        },
        { provide: ErrorLogService, useValue: { logError: vi.fn() } },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  it('deduplicates identical active error toasts while open', async () => {
    service.error('errors.network');
    service.error('errors.network');
    service.error('Sin conexión a internet. Mostrando datos en caché.');

    await vi.waitFor(() => expect(mockTuiToast.open).toHaveBeenCalledTimes(1));

    // Once the active toast closes, a new one with the same message can open
    openSubjects[0].complete();
    await Promise.resolve();
    await Promise.resolve();

    service.error('errors.network');
    await vi.waitFor(() => expect(mockTuiToast.open).toHaveBeenCalledTimes(2));
  });
});
