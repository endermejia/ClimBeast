import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import {
  ChatDialogComponent,
  ChatDialogData,
} from '../components/dialogs/chat-dialog';
import { NotificationsDialogComponent } from '../components/dialogs/notifications-dialog';

@Injectable({
  providedIn: 'root',
})
export class AppDialogsService {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  async openChatDialog(data?: ChatDialogData): Promise<void> {
    await firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'l',
        data,
      }),
      { defaultValue: undefined },
    );
  }

  async openNotificationsDialog(): Promise<void> {
    await firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }
}
