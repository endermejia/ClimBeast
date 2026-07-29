import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';

import { PhotoViewerDialogComponent } from '../components/dialogs/photo-viewer-dialog';

export function openPhotoViewer(
  dialogs: TuiDialogService,
  imageUrl: string,
): void {
  dialogs
    .open(new PolymorpheusComponent(PhotoViewerDialogComponent), {
      data: { imageUrl },
      size: 'l',
      appearance: 'flat',
    })
    .subscribe();
}
