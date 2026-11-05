import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { TuiLoader } from '@taiga-ui/core';

@Component({
  selector: 'app-chat-redirect',
  imports: [TuiLoader],
  template: `
    <div class="flex items-center justify-center w-full h-[80vh]">
      <tui-loader size="xl"></tui-loader>
    </div>
  `,
  standalone: true,
})
export class ChatRedirectComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    void this.router.navigate(['/home'], {
      queryParams: roomId ? { roomId } : undefined,
      replaceUrl: true,
    });
  }
}
