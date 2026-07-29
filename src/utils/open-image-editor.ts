import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';

import { firstValueFrom } from 'rxjs';

import { ImageEditorDialogComponent } from '../components/dialogs/image-editor-dialog';

export function openImageEditor(
  dialogs: TuiDialogService,
  data: { file?: File; imageUrl?: string },
): Promise<File | null> {
  return firstValueFrom(
    dialogs.open<File | null>(
      new PolymorpheusComponent(ImageEditorDialogComponent),
      {
        data,
        appearance: 'fullscreen',
        closable: false,
        dismissible: false,
      },
    ),
    { defaultValue: null },
  );
}
