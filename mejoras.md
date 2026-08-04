## 🟡 Mejoras Pendientes

1. Separación de SupabaseService (527 líneas)

- Maneja auth, storage URLs, profile, admin areas, y config todo en un solo servicio.
- Acción: Extraer SupabaseAuthService, SupabaseStorageService, SupabaseConfigService.

2. TopoDataService / OutdoorDataService (675 líneas)

- Contiene múltiples resource() calls y mucha lógica de cache.
- Acción: Dividir en AreaDataService, CragDataService, TopoDataService, RouteDataService.

3. Falta de error boundaries en templates

- No hay patrón consistente de fallback UI para errores en resource() loading.
- Acción: Crear un @defer con @error block o un wrapper ErrorBoundaryComponent.

4. Cache de Supabase storage URLs potencialmente stale

- SignedUrlCache usa CacheService con keys versionadas, pero no hay invalidación forzada.
- Acción: Agregar mecanismo de invalidación cuando el archivo cambia.
