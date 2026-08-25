import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { firstValueFrom } from 'rxjs';

import { PhotoViewerDialogComponent } from '../components/dialogs/photo-viewer-dialog';

export async function openPhotoViewer(
  dialogs: TuiDialogService,
  imageUrl: string,
): Promise<void> {
  await firstValueFrom(
    dialogs.open(new PolymorpheusComponent(PhotoViewerDialogComponent), {
      data: { imageUrl },
      size: 'l',
      appearance: 'flat',
    }),
    { defaultValue: undefined },
  );
}
