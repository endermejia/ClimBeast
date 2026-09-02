import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'home', renderMode: RenderMode.Prerender },
  { path: 'merchandising', renderMode: RenderMode.Server },
  { path: 'merchandising/checkout', renderMode: RenderMode.Server },
  { path: 'order-success', renderMode: RenderMode.Server },
  { path: 'order-failed', renderMode: RenderMode.Server },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'info', renderMode: RenderMode.Prerender },
  { path: 'explore', renderMode: RenderMode.Prerender },
  {
    path: 'equipper/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'profile/config',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'profile/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'profile',
    renderMode: RenderMode.Prerender,
  },
  { path: 'area', renderMode: RenderMode.Prerender },
  { path: 'area/redirect', renderMode: RenderMode.Server },
  {
    path: 'area/:areaSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'area/:areaSlug/:cragSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'area/:areaSlug/:cragSlug/topo/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'area/:areaSlug/:cragSlug/:routeSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  // ADMIN
  {
    path: 'admin',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/unify',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'my-areas',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/equippers',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/equipper-requests',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/parkings',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/requests',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/orders',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/material-catalog',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/material-requests',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/error-logs',
    renderMode: RenderMode.Prerender,
  },
  // INDOOR
  {
    path: 'indoor',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'indoor/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'indoor/:centerSlug/route/:routeSlug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  {
    path: 'indoor/:centerSlug/topo/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return [];
    },
  },
  // Fallback routes
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'page-not-found',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
