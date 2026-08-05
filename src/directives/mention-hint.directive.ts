import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentRef, Directive, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';

import { UserInfoHintComponent } from '../components/ui/user-info-hint';

@Directive({
  selector: '[appMentionHint]',
  standalone: true,
  host: {
    '(mouseover)': 'onMouseOver($event)',
    '(mouseout)': 'onMouseOut($event)',
    '(touchstart)': 'onTouchStart($event)',
    '(click)': 'onClick($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class MentionHintDirective implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly router = inject(Router);

  private overlayRef: OverlayRef | null = null;
  private componentRef: ComponentRef<UserInfoHintComponent> | null = null;
  private currentMentionEl: HTMLElement | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.closeHint();
  }

  protected onMouseOver(event: MouseEvent): void {
    const mentionEl = this.getMentionElement(event.target);
    if (!mentionEl) {
      if (
        this.overlayRef &&
        !this.isOverHint(event.relatedTarget as Node | null)
      ) {
        this.scheduleHide();
      }
      return;
    }

    this.cancelHide();
    if (this.currentMentionEl === mentionEl && this.overlayRef) return;

    this.showHint(mentionEl);
  }

  protected onMouseOut(event: MouseEvent): void {
    if (!this.overlayRef) return;
    const related = event.relatedTarget as Node | null;
    if (this.isOverMentionOrHint(related)) return;
    this.scheduleHide();
  }

  protected onTouchStart(event: TouchEvent): void {
    const mentionEl = this.getMentionElement(event.target);
    if (!mentionEl) return;

    if (this.currentMentionEl === mentionEl && this.overlayRef) return;

    this.showHint(mentionEl);
  }

  protected onClick(event: MouseEvent): void {
    const mentionEl = this.getMentionElement(event.target);
    if (!mentionEl) return;

    event.preventDefault();
    event.stopPropagation();
    const userId = this.getUserId(mentionEl);
    if (userId) {
      this.closeHint();
      void this.router.navigate(['/profile', userId]);
    }
  }

  protected onContextMenu(event: MouseEvent): void {
    const mentionEl = this.getMentionElement(event.target);
    if (mentionEl) {
      event.preventDefault();
    }
  }

  private getMentionElement(target: EventTarget | null): HTMLElement | null {
    const el =
      target instanceof HTMLElement
        ? target
        : ((target as Node | null)?.parentElement ?? null);
    return (el as HTMLElement | null)?.closest('.mention-link') ?? null;
  }

  private getUserId(mentionEl: HTMLElement): string | null {
    const dataId = mentionEl.getAttribute('data-id');
    if (dataId) return dataId;
    const href = mentionEl.getAttribute('href');
    if (href?.includes('/profile/')) {
      return href.split('/profile/')[1] || null;
    }
    return null;
  }

  private getName(mentionEl: HTMLElement): string | null {
    const name = mentionEl.getAttribute('data-name');
    if (name) return name.replace(/^@/, '');
    const text = mentionEl.textContent;
    return text ? text.replace(/^@/, '') : null;
  }

  private showHint(mentionEl: HTMLElement): void {
    const userId = this.getUserId(mentionEl);
    const name = this.getName(mentionEl);
    if (!userId) return;

    this.closeHint();
    this.currentMentionEl = mentionEl;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(mentionEl)
      .withPositions([
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -8,
        },
        {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: 8,
        },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: false,
      panelClass: 'mention-hint-overlay-panel',
    });

    const portal = new ComponentPortal(UserInfoHintComponent);
    this.componentRef = this.overlayRef.attach(portal);

    this.componentRef.setInput('userId', userId);
    if (name) {
      this.componentRef.setInput('fallbackName', name);
    }
    this.componentRef.changeDetectorRef.detectChanges();

    const hintNativeEl = this.componentRef.location
      .nativeElement as HTMLElement;
    hintNativeEl.addEventListener('mouseenter', () => this.cancelHide());
    hintNativeEl.addEventListener('mouseleave', () => this.scheduleHide());
  }

  private scheduleHide(): void {
    this.cancelHide();
    this.hideTimeout = setTimeout(() => this.closeHint(), 200);
  }

  private cancelHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private isOverMentionOrHint(node: Node | null): boolean {
    if (!node) return false;
    if (this.currentMentionEl?.contains(node)) return true;
    return this.isOverHint(node);
  }

  private isOverHint(node: Node | null): boolean {
    if (!node || !this.componentRef) return false;
    return this.componentRef.location.nativeElement.contains(node);
  }

  private closeHint(): void {
    this.cancelHide();
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.componentRef = null;
      this.currentMentionEl = null;
    }
  }
}
