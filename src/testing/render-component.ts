import { TestBed, ComponentFixture, Type } from '@angular/core/testing';
import { Provider } from '@angular/core';

import { COMMON_TEST_PROVIDERS } from './test-providers';

export interface RenderResult<C> {
  fixture: ComponentFixture<C>;
  component: C;
  nativeElement: HTMLElement;
}

export async function renderComponent<C>(
  component: Type<C>,
  options: {
    imports?: Type<unknown>[];
    providers?: Provider[];
    inputs?: Record<string, unknown>;
  } = {},
): Promise<RenderResult<C>> {
  await TestBed.configureTestingModule({
    imports: [component, ...(options.imports || [])],
    providers: [...COMMON_TEST_PROVIDERS, ...(options.providers || [])],
  }).compileComponents();

  const fixture = TestBed.createComponent(component);
  const componentInstance = fixture.componentInstance;

  if (options.inputs) {
    for (const [key, value] of Object.entries(options.inputs)) {
      fixture.componentRef.setInput(key, value);
    }
  }

  await fixture.whenStable();

  return {
    fixture,
    component: componentInstance,
    nativeElement: fixture.nativeElement,
  };
}
