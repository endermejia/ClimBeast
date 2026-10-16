# Auditoría de seguridad web

**Fecha:** 15 de octubre de 2026  
**Alcance:** análisis estático del frontend Angular, funciones de Supabase y snapshot de políticas RLS presentes en el repositorio.  
**Limitación:** no se probaron servicios desplegados ni se verificó que `src/supabase-context/supabase-rls.json` coincida con las políticas de producción. Los hallazgos que dependen de ese snapshot deben contrastarse con la base activa.

## Hallazgos

### 1. Cualquier visitante puede enviar notificaciones push a usuarios arbitrarios — **Media (P2)**

**Evidencia:** `supabase/functions/notify-push/index.ts:204-215, 224-246, 394-430`.

La función autoriza la solicitud si el token o la cabecera `apikey` coincide con `SUPABASE_ANON_KEY`. Esa clave es pública y está incluida en la aplicación cliente. Una vez autorizada, la función usa la clave `SERVICE_ROLE` para buscar las suscripciones de cualquier `record.user_id` y enviarles una notificación. Para notificaciones de tipo `message`, el texto del push también procede del cuerpo recibido (`record.text`). No se observa autenticación del actor, comprobación de permisos sobre el destinatario ni limitación de frecuencia.

**Impacto:** spam o suplantación de notificaciones a usuarios con push habilitado; potencial abuso de recursos y del canal de confianza de la aplicación.

**Recomendación:** no aceptar la clave `anon` como credencial de autorización. Restringir la función a un secreto de webhook no expuesto al cliente o autenticar el evento de origen; validar el tipo y los campos contra el registro persistido, y añadir límites de frecuencia/tamaño. Revisar también la opción `verify_jwt` configurada en el despliegue.

### 2. Los perfiles marcados como privados se pueden consultar completos — **Alta (P1)**

**Evidencia:** `src/supabase-context/supabase-rls.json:2053-2060` permite `SELECT` con `qual: "true"` al rol `authenticated`; `src/pages/user/user-profile.ts:451-455` consulta `.select('*')`; `src/models/supabase-generated.ts:3699-3721` muestra campos como `birth_date`, `city`, `country`, `sex`, `size` y `bio`.

El perfil de usuario puede marcarse como privado y la página oculta partes de su contenido, pero la política RLS permite a cualquier usuario autenticado leer todas las columnas y filas de `user_profiles`. La comprobación de privacidad en la interfaz no protege el acceso directo a la API de Supabase.

**Impacto:** exposición de datos personales y de perfil de usuarios privados a cualquier cuenta autenticada; el acceso puede automatizarse mediante la API pública.

**Recomendación:** hacer cumplir la privacidad en la capa de datos. Aplicar políticas que limiten los perfiles privados a su propietario y a relaciones autorizadas, o exponer una vista/función pública con una lista explícita de campos no sensibles. No depender de ocultar elementos en la interfaz.

### 3. Cualquier participante puede borrar la sala de chat compartida — **Media (P2)**

**Evidencia:** `src/supabase-context/supabase-rls.json:344-351`, política `participants_can_delete` sobre `chat_rooms`, permite `DELETE` si `is_chat_participant(id)` es verdadero. También existe una política separada `own_can_delete` sobre `chat_participants` en las líneas 324-331.

Un participante puede borrar directamente el registro de la sala, no solo quitar su propia participación. Según las claves foráneas y su comportamiento en producción, esto puede dejar la conversación inaccesible o borrar también mensajes y participantes asociados.

**Impacto:** borrado o interrupción de una conversación compartida por una sola de las partes, afectando también al otro participante.

**Recomendación:** retirar el borrado de `chat_rooms` a participantes normales. Permitir que cada usuario borre únicamente su fila de `chat_participants`; reservar el borrado global de la sala para una operación administrativa o una regla explícita de retención. Confirmar las reglas `ON DELETE` de las claves foráneas.

## Comprobaciones recomendadas

1. Confirmar en Supabase que las políticas RLS desplegadas coinciden con el snapshot auditado.
2. Probar con una cuenta normal y otra privada que no se puedan leer campos privados por REST/RPC.
3. Invocar `notify-push` usando solo la clave pública y confirmar que se rechaza; después verificar la autenticación real del webhook.
4. Verificar el comportamiento de borrado de una sala y de sus mensajes en una base de pruebas.

## Observaciones

- La clave `anon` de Supabase que aparece en `src/environments/environment.ts` es pública por diseño; no es una vulnerabilidad por sí sola. La seguridad debe depender de RLS y de validaciones de autorización en servidor.
- La función `get_admin_users` aparece como `SECURITY DEFINER` y devuelve correos en `src/supabase-context/supabase-database-functions.json`. El repositorio no incluye el cuerpo ni los permisos `GRANT/REVOKE`, así que no se puede confirmar su exposición. Revisar que exija rol administrador y que `EXECUTE` no esté concedido a `anon`/`authenticated` sin control.
- No se hizo un escaneo dinámico, una revisión de infraestructura desplegada ni un análisis completo de dependencias; este documento no sustituye una prueba de penetración.
