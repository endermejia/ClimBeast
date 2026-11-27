import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatDialogComponent } from '../components/dialogs/chat-dialog';
import { NotificationsDialogComponent } from '../components/dialogs/notifications-dialog';

import { AppDialogsService } from './app-dialogs.service';

describe('AppDialogsService', () => {
  let service: AppDialogsService;
  let mockDialogs: { open: ReturnType<typeof vi.fn> };
  let mockTranslate: { instant: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDialogs = {
      open: vi.fn(() => of(true)),
    };
    mockTranslate = {
      instant: vi.fn((key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : `t:${key}`,
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AppDialogsService,
        { provide: TuiDialogService, useValue: mockDialogs },
        { provide: TranslateService, useValue: mockTranslate },
      ],
    });

    service = TestBed.inject(AppDialogsService);
  });

  describe('confirm', () => {
    it('opens TUI_CONFIRM with direct strings and defaults', async () => {
      const result = await service.confirm({
        label: 'Custom title',
        content: 'Are you sure?',
      });

      expect(result).toBe(true);
      expect(mockDialogs.open).toHaveBeenCalledWith(TUI_CONFIRM, {
        label: 'Custom title',
        size: 's',
        data: {
          content: 'Are you sure?',
          yes: 't:accept',
          no: 't:cancel',
        },
      });
    });

    it('resolves translation keys including interpolation params', async () => {
      const result = await service.confirm({
        labelKey: 'routes.deleteTitle',
        contentKey: 'routes.deleteConfirm',
        contentParams: { name: 'El Pilar' },
        yesKey: 'delete',
        noKey: 'cancel',
        appearance: 'primary-destructive',
        size: 'm',
        dismissible: false,
      });

      expect(result).toBe(true);
      expect(mockTranslate.instant).toHaveBeenCalledWith('routes.deleteTitle');
      expect(mockTranslate.instant).toHaveBeenCalledWith(
        'routes.deleteConfirm',
        { name: 'El Pilar' },
      );
      expect(mockTranslate.instant).toHaveBeenCalledWith('delete');
      expect(mockTranslate.instant).toHaveBeenCalledWith('cancel');
      expect(mockDialogs.open).toHaveBeenCalledWith(TUI_CONFIRM, {
        label: 't:routes.deleteTitle',
        size: 'm',
        dismissible: false,
        data: {
          content: 'routes.deleteConfirm:{"name":"El Pilar"}',
          yes: 't:delete',
          no: 't:cancel',
          appearance: 'primary-destructive',
        },
      });
    });

    it('supports labelParams and direct yes/no overrides', async () => {
      await service.confirm({
        labelKey: 'confirm.title',
        labelParams: { count: 3 },
        content: 'Raw content',
        yes: 'Confirm now',
        no: 'Go back',
        appearance: 'negative',
        size: 'l',
      });

      expect(mockDialogs.open).toHaveBeenCalledWith(TUI_CONFIRM, {
        label: 'confirm.title:{"count":3}',
        size: 'l',
        data: {
          content: 'Raw content',
          yes: 'Confirm now',
          no: 'Go back',
          appearance: 'negative',
        },
      });
    });

    it('prefers direct strings over translation keys when both are provided', async () => {
      await service.confirm({
        label: 'Direct label',
        labelKey: 'ignored.label',
        content: 'Direct content',
        contentKey: 'ignored.content',
        yes: 'Direct yes',
        yesKey: 'ignored.yes',
        no: 'Direct no',
        noKey: 'ignored.no',
      });

      expect(mockTranslate.instant).not.toHaveBeenCalled();
      expect(mockDialogs.open).toHaveBeenCalledWith(TUI_CONFIRM, {
        label: 'Direct label',
        size: 's',
        data: {
          content: 'Direct content',
          yes: 'Direct yes',
          no: 'Direct no',
        },
      });
    });

    it('omits content and appearance when not provided', async () => {
      await service.confirm({});

      expect(mockDialogs.open).toHaveBeenCalledWith(TUI_CONFIRM, {
        label: '',
        size: 's',
        data: {
          yes: 't:accept',
          no: 't:cancel',
        },
      });
    });

    it('returns false when user cancels', async () => {
      mockDialogs.open.mockReturnValue(of(false));

      const result = await service.confirm({ label: 'Cancel test' });

      expect(result).toBe(false);
    });

    it('returns false when dialog is dismissed with undefined', async () => {
      mockDialogs.open.mockReturnValue(of(undefined));

      const result = await service.confirm({ label: 'Dismissed test' });

      expect(result).toBe(false);
    });

    it('returns false when dialog completes without emitting (EMPTY)', async () => {
      mockDialogs.open.mockReturnValue(EMPTY);

      const result = await service.confirm({ label: 'Empty test' });

      expect(result).toBe(false);
    });
  });

  describe('openChatDialog', () => {
    it('opens ChatDialogComponent with translated label, size l, and data', async () => {
      mockDialogs.open.mockReturnValue(of(undefined));
      const data = { userId: 'user-42' };

      await service.openChatDialog(data);

      expect(mockTranslate.instant).toHaveBeenCalledWith('messages');
      expect(mockDialogs.open).toHaveBeenCalledTimes(1);
      const [component, options] = mockDialogs.open.mock.calls[0];
      expect(component).toBeInstanceOf(PolymorpheusComponent);
      expect(component.component).toBe(ChatDialogComponent);
      expect(options).toEqual({
        label: 't:messages',
        size: 'l',
        data,
      });
    });

    it('handles EMPTY stream without throwing', async () => {
      mockDialogs.open.mockReturnValue(EMPTY);

      await expect(service.openChatDialog()).resolves.toBeUndefined();
    });
  });

  describe('openNotificationsDialog', () => {
    it('opens NotificationsDialogComponent with translated label and size m', async () => {
      mockDialogs.open.mockReturnValue(of(undefined));

      await service.openNotificationsDialog();

      expect(mockTranslate.instant).toHaveBeenCalledWith('notifications');
      expect(mockDialogs.open).toHaveBeenCalledTimes(1);
      const [component, options] = mockDialogs.open.mock.calls[0];
      expect(component).toBeInstanceOf(PolymorpheusComponent);
      expect(component.component).toBe(NotificationsDialogComponent);
      expect(options).toEqual({
        label: 't:notifications',
        size: 'm',
      });
    });

    it('handles EMPTY stream without throwing', async () => {
      mockDialogs.open.mockReturnValue(EMPTY);

      await expect(service.openNotificationsDialog()).resolves.toBeUndefined();
    });
  });
});
