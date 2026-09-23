import { Routes } from '@angular/router';

import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';

/**
 * Aplana `routes` expandiendo `children` y devolviendo la ruta completa de
 * cada hoja (p. ej. `merchandising` + `checkout` → `merchandising/checkout`).
 */
function flattenBrowserPaths(list: Routes, prefix = ''): string[] {
  const paths: string[] = [];

  for (const route of list) {
    const full = [prefix, route.path ?? '']
      .filter((segment) => segment.length > 0)
      .join('/');

    if (route.children?.length) {
      paths.push(...flattenBrowserPaths(route.children, full));
    } else {
      paths.push(full);
    }
  }

  return paths;
}

const browserPaths = [...new Set(flattenBrowserPaths(routes))].sort();
const serverPaths = [
  ...new Set(serverRoutes.map((route) => route.path)),
].sort();

describe('app.routes.server', () => {
  it('cubre todas las rutas del router del navegador', () => {
    // Sanity de la expansión de `children`
    expect(browserPaths).toContain('merchandising/checkout');
    expect(browserPaths).toContain('indoor/:slug');

    const missing = browserPaths.filter((path) => !serverPaths.includes(path));
    expect(missing).toEqual([]);
  });

  it('no contiene rutas que no existan en el router del navegador', () => {
    const orphans = serverPaths.filter((path) => !browserPaths.includes(path));
    expect(orphans).toEqual([]);
  });
});
