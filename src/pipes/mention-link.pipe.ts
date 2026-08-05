import { SecurityContext } from '@angular/core';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { MENTION_PATTERN } from '../utils';

@Pipe({
  name: 'mentionLink',
  standalone: true,
})
export class MentionLinkPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    const escaped = this.escapeHtml(value);

    MENTION_PATTERN.lastIndex = 0;

    const linked = escaped.replace(MENTION_PATTERN, (_match, name, id) => {
      const sanitizedId = this.escapeHtml(id);
      const sanitizedName = this.escapeHtml(name);
      return `<a class="mention-link font-bold hover:underline cursor-pointer text-(--tui-text-action) select-none" oncontextmenu="event.preventDefault()" href="/profile/${sanitizedId}" data-id="${sanitizedId}" data-name="${sanitizedName}">@${sanitizedName}</a>`;
    });

    const trusted = this.sanitizer.bypassSecurityTrustHtml(linked);
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, trusted);
    return sanitized ?? '';
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
