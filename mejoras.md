## 🔴 Alta Prioridad

1. GlobalData como fachada gigante (376 líneas)

- global-data.ts re-exporta ~50+ propiedades de 15+ servicios. Los consumidores aún inyectan GlobalData en vez de los servicios de dominio específicos.
- Acción: Migrar consumidores a inyectar servicios de dominio directamente (TopoDataService, FilterStateService, etc.) y marcar GlobalData como @deprecated.

2. effect() con async/await en route-form.ts

- Tres effect() usan callbacks async (líneas 507-609). Los efectos deben ser síncronos; las operaciones async dentro causan race conditions potenciales.
- Acción: Usar resource() o untracked() + signals para manejar la carga async dentro de efectos.

3. window.location.href directo en paywall.ts:103

- No es SSR-safe. Podría fallar en server-side rendering.
- Acción: Usar inject(IS_BROWSER) + Location o router para navegación.

4. requestAnimationFrame sin guard SSR en count-up.directive.ts

- El método startAnimation llama requestAnimationFrame sin verificar IS_BROWSER.
- Acción: Envolver en if (this.isBrowser) o usar afterNextRender.

5. Tests con coverage thresholds en 0

- vitest.config.ts tiene todos los thresholds en 0 — no hay enforcement de cobertura mínima.
- Acción: Establecer thresholds mínimos (ej: 60% statements, 50% branches) y subir gradualmente.

## 🟠 Media Prioridad

6. OnPush no explícito en todos los page components

- home.ts, login.ts, landing.ts, area.ts, crag.ts, explore.ts no setean changeDetection: OnPush explícitamente. En zoneless funciona, pero es inconsistente con el resto.
- Acción: Agregar changeDetection: ChangeDetectionStrategy.OnPush a todos los page components.

7. standalone: true inconsistente

- Algunos componentes lo declaran explícitamente, otros dependen del default de Angular 19+.
- Acción: Estandarizar — quitar standalone: true de todos (el default es true desde Angular 19) o dejarlo en todos. Recomiendo quitarlo (menos ruido).

8. TuiDialogService usado directamente en servicios

- messaging.service.ts y app-notifications.service.ts abren diálogos desde servicios — acopla datos con presentación.
- Acción: Extraer lógica de presentación a componentes o usar un servicio de abstracción de diálogos.

9. localStorage directo en ErrorLogService

- Usa localStorage raw en vez del servicio LocalStorage que ya abstrae SSR-safety.
- Acción: Reemplazar por inject(LocalStorage).

10. Pipe inline en shop-orders.ts

- OrderStatusColorPipe definido inline en un componente, rompe la convención de src/pipes/.
- Acción: Mover a src/pipes/order-status-color.pipe.ts y agregar al barrel.

11. AfterViewInit / OnDestroy interfaces en MapComponent

- Podría usar afterNextRender y DestroyRef.onDestroy para consistencia con el resto del codebase.
- Acción: Refactorizar lifecycle hooks a APIs modernas.

12. linkedSignal() subutilizado

- Solo se usa en topo-viewer.ts. Es un API poderoso para state derivado que depende de otro signal.
- Acción: Revisar computed() que hacen赋值 condicional → podrían ser linkedSignal().

## 🟡 Baja Prioridad (Mejoras Incrementales)

13. Separación de SupabaseService (527 líneas)

- Maneja auth, storage URLs, profile, admin areas, y config todo en un solo servicio.
- Acción: Extraer SupabaseAuthService, SupabaseStorageService, SupabaseConfigService.

14. TopoDataService (675 líneas)

- Contiene 6 resource() calls y mucha lógica de cache.
- Acción: Dividir en AreaDataService, CragDataService, TopoDataService, RouteDataService.

15. Falta de error boundaries en templates

- No hay patrón consistente de fallback UI para errores en resource() loading.
- Acción: Crear un @defer con @error block o un wrapper ErrorBoundaryComponent.

16. Sin provideRouterCache() o cache de rutas

- Las rutas se lazy-loadan pero no hay cache de módulos cargados.
- Acción: Evaluar withPreloading más agresivo o preloadOnIdle.

17. Budget de bundle ajustado generosamente

- Warning en 2MB, error en 3MB para initial chunk. Es alto para una app Angular.
- Acción: Reducir a 1.5MB warning / 2MB error después de optimizar dependencias.

18. Taiga UI — paquete completo importado

- Se importan ~20+ paquetes de Taiga (@taiga-ui/core, kit, layout, cdk, commerce, etc.).
- Acción: Auditar tree-shaking y considerar imports más granulares si el bundle crece.

19. Sin withComponentInputBinding() en server routes

- La config del server no tiene withComponentInputBinding() — los resolver params no se bindean a inputs del componente en SSR.
- Acción: Verificar si es intencional o un oversight.

20. Cache de Supabase storage URLs potencialmente stale

- SignedUrlCache usa CacheService con keys versionadas, pero no hay invalidación forzada.
- Acción: Agregar mecanismo de invalidación cuando el archivo cambia.

21. provideClientHydration(withEventReplay()) — verificar necesidad

- withEventReplay() agrega overhead. Si no se usa replay de eventos, considerar quitarlo.
- Acción: Medir impacto con/without.

22. Falta de linkedSignal para form state

- route-form.ts usa effect() para sincronizar estado del form — linkedSignal sería más limpio.
- Acción: Reemplazar effect-based form sync con linkedSignal.

23. Sin lazy loading de imágenes en topo viewer

- El TopoViewer carga imágenes completas sin loading="lazy" ni decoding="async".
- Acción: Agregar atributos de lazy loading y considerar NgOptimizedImage.

24. I18n — traducciones no validadas en CI

- check-translations.mjs existe pero no se ejecuta en pre-commit ni en CI.
- Acción: Agregar al pipeline de CI.
