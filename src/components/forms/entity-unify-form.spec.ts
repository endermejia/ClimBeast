import { Component, ComponentRef, PLATFORM_ID, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';
import {
  EntityUnifyFormComponent,
  type EntityUnifyPayload,
  type EntityUnifySelection,
  type UnifyEntityItem,
} from './entity-unify-form';

const ITEMS: UnifyEntityItem[] = [
  { id: 1, name: 'El Chorro' },
  { id: 2, name: 'El Chorro (dup)' },
  { id: 3, name: 'Chorro' },
];

@Component({
  imports: [EntityUnifyFormComponent],
  template: `
    <app-entity-unify-form
      [items]="items"
      [initialTarget]="initialTarget"
      [initialSources]="initialSources"
      descriptionKey="routes.unifyDescription"
      targetLabelKey="routes.targetRoute"
      sourcesLabelKey="routes.sourceRoutes"
      newNameLabelKey="routes.newName"
    >
      <div class="projected-extra">Extra topo warning</div>
    </app-entity-unify-form>
  `,
})
class ProjectionHostComponent {
  readonly items = ITEMS;
  readonly initialTarget = ITEMS[0];
  readonly initialSources = [ITEMS[1]];
  readonly formComp = viewChild(EntityUnifyFormComponent);
}

describe('EntityUnifyFormComponent', () => {
  let fixture: ComponentFixture<EntityUnifyFormComponent>;
  let component: EntityUnifyFormComponent;
  let componentRef: ComponentRef<EntityUnifyFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EntityUnifyFormComponent,
        ProjectionHostComponent,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityUnifyFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('items', ITEMS);
    componentRef.setInput('descriptionKey', 'areas.unifyDescription');
    componentRef.setInput('targetLabelKey', 'areas.targetArea');
    componentRef.setInput('sourcesLabelKey', 'areas.sourceAreas');
    componentRef.setInput('newNameLabelKey', 'areas.newName');
  });

  const getFooterButtons = (): HTMLButtonElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button[tuiButton]'),
    ) as HTMLButtonElement[];

  it('prefills initialTarget and initialSources and sets newName placeholder', () => {
    componentRef.setInput('initialTarget', ITEMS[0]);
    componentRef.setInput('initialSources', [ITEMS[1], ITEMS[2]]);
    fixture.detectChanges();

    expect(component.model().target).toEqual(ITEMS[0]);
    expect(component.model().sources).toEqual([ITEMS[1], ITEMS[2]]);

    const newNameInput = fixture.nativeElement.querySelector(
      '#new-name',
    ) as HTMLInputElement;
    expect(newNameInput.placeholder).toBe('El Chorro');
  });

  it('excludes current target from availableSources and removes new target from selected sources', () => {
    const selectionSpy = vi.fn<(sel: EntityUnifySelection) => void>();
    component.selectionChange.subscribe(selectionSpy);

    componentRef.setInput('initialTarget', ITEMS[0]);
    componentRef.setInput('initialSources', [ITEMS[1], ITEMS[2]]);
    fixture.detectChanges();

    expect(component.availableSources().map((i) => i.id)).toEqual([2, 3]);

    // Switching target to item 2 removes item 2 from selected sources
    component.onTargetChange(ITEMS[1]);
    fixture.detectChanges();

    expect(component.availableSources().map((i) => i.id)).toEqual([1, 3]);
    expect(component.model().sources.map((s) => s.id)).toEqual([3]);
    expect(selectionSpy).toHaveBeenCalledWith({
      target: ITEMS[1],
      sources: [ITEMS[2]],
    });
  });

  it('disables unify button when target is missing, sources are empty, or loading is true', () => {
    fixture.detectChanges();
    const [, unifyBtn] = getFooterButtons();

    // Missing both target and sources
    expect(unifyBtn.disabled).toBe(true);

    // Target set, sources empty
    component.onTargetChange(ITEMS[0]);
    fixture.detectChanges();
    expect(unifyBtn.disabled).toBe(true);

    // Target and sources set -> enabled
    component.onSourcesChange([ITEMS[1]]);
    fixture.detectChanges();
    expect(unifyBtn.disabled).toBe(false);

    // Loading -> disabled
    componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(unifyBtn.disabled).toBe(true);
  });

  it('emits unify payload with target name fallback or custom newName, and emits cancelled on cancel', () => {
    const unifySpy = vi.fn<(payload: EntityUnifyPayload) => void>();
    const cancelSpy = vi.fn();
    component.unify.subscribe(unifySpy);
    component.cancelled.subscribe(cancelSpy);

    componentRef.setInput('initialTarget', ITEMS[0]);
    componentRef.setInput('initialSources', [ITEMS[1], ITEMS[2]]);
    fixture.detectChanges();

    const [cancelBtn, unifyBtn] = getFooterButtons();

    // Default newName falls back to target.name
    unifyBtn.click();
    expect(unifySpy).toHaveBeenCalledWith({
      targetId: 1,
      sourceIds: [2, 3],
      newName: 'El Chorro',
    });

    // Custom newName overrides target.name
    component.model.update((m) => ({ ...m, newName: 'Chorro Canonical' }));
    fixture.detectChanges();
    unifyBtn.click();
    expect(unifySpy).toHaveBeenLastCalledWith({
      targetId: 1,
      sourceIds: [2, 3],
      newName: 'Chorro Canonical',
    });

    // Cancel emits cancelled
    cancelBtn.click();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('projects extra content via ng-content before the action buttons', () => {
    const hostFixture = TestBed.createComponent(ProjectionHostComponent);
    hostFixture.detectChanges();

    const projected = hostFixture.nativeElement.querySelector(
      '.projected-extra',
    ) as HTMLElement | null;
    expect(projected).not.toBeNull();
    expect(projected?.textContent).toContain('Extra topo warning');
  });
});
