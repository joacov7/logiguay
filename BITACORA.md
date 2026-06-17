# Bitácora de desarrollo — Logiguay

---

## 2026-06-16

### ✅ RESUELTO — Login quedaba en blanco / pantalla vacía
- **Causa**: Al vencer el token, el 401 no limpiaba la cookie. El middleware redirigía a `/` (landing), que no hace llamadas API, así que el loop nunca se cortaba.
- **Fix**: El interceptor de axios ahora limpia cookie + localStorage antes de redirigir. El middleware redirige a `/dashboard` (no a `/`).
- **Archivos**: `apps/web/src/lib/api.ts`, `apps/web/src/middleware.ts`

---

### ✅ RESUELTO — Espacio grande entre sidebar y contenido
- **Causa**: El layout tenía `lg:ml-64` en el div de contenido, pero el sidebar ya es `lg:static` dentro de un flex. Doble offset de 256px.
- **Fix**: Eliminado `lg:ml-64` del content div.
- **Archivo**: `apps/web/src/app/[locale]/(dashboard)/layout.tsx`

---

### ✅ RESUELTO — Sidebar mostraba menús de todos los roles para todos
- **Fix**: Reescrito con array `NAV_ITEMS` filtrado por `user.role`. DADOR ve Cargas/Bolsa. TRANSPORTISTA ve Flota/Choferes/Viajes. CHOFER ve Mi Viaje.
- **Archivo**: `apps/web/src/components/ui/Sidebar.tsx`

---

### ✅ RESUELTO — Sentry rompía el login (credenciales en la URL)
- **Causa**: `withSentryConfig` en `next.config.mjs` rompía la hidratación de React. El formulario se enviaba como GET en lugar de POST, exponiendo email y contraseña en la URL.
- **Fix**: Eliminado `withSentryConfig`. Sentry del lado servidor se inicializa en `instrumentation.ts` con la función `register()`. Cliente en `instrumentation-client.ts`.
- **⚠️ Acción pendiente**: Cambiar la contraseña del admin (`admin@logiguay.com`) porque fue expuesta en la URL.
- **Archivos**: `apps/web/next.config.mjs`, `apps/web/src/instrumentation.ts`, `apps/web/instrumentation-client.ts`

---

### ✅ RESUELTO — Error PrismaClientValidationError en filtro de viajes por status
- **Causa**: El frontend enviaba `status=EN_TRANSITO,EN_CARGA` (string con coma) y la API lo pasaba directo a Prisma, que no acepta eso.
- **Fix**: Split por coma y uso de `{ in: [...] }` cuando hay más de un estado.
- **Archivos**: `apps/api/src/modules/trips/trips.service.ts`, `apps/api/src/modules/cargo/cargo.service.ts`

---

### ✅ RESUELTO — Respuestas 304 con datos viejos (listas desactualizadas)
- **Causa**: Express devolvía ETag y el browser cacheaba las respuestas vacías.
- **Fix**: ETag deshabilitado + header `Cache-Control: no-store` global en la API.
- **Archivo**: `apps/api/src/main.ts`

---

### ✅ RESUELTO — DADOR no veía las cotizaciones de los transportistas
- **Causa**: El polling no estaba activado. Las cotizaciones nuevas no se refrescaban automáticamente.
- **Fix**: `refetchInterval: 10_000` en la query de cotizaciones.
- **Archivo**: `apps/web/src/app/[locale]/(dashboard)/cargas/page.tsx`

---

### ✅ RESUELTO — Nueva carga fallaba al publicar
- **Causa**: El form llamaba a `PATCH /cargo/:id/publish` después de crear, pero las cargas ya se crean como `PUBLICADO` directamente. El endpoint publish requiere estado `PENDIENTE`.
- **Fix**: Eliminada la llamada redundante al endpoint publish.
- **Archivo**: `apps/web/src/app/[locale]/(dashboard)/cargas/nueva/page.tsx`

---

### ✅ RESUELTO — DADOR no veía sus cargas en /cargas (bug principal)
- **Causa**: `GET /cargo` filtraba por `user.companyId` (un solo ID del JWT). El usuario DADOR pertenece a varias empresas. Las cargas fueron creadas bajo empresa X pero el JWT devolvía empresa Y (no determinístico sin `orderBy`). Aunque se agregó `orderBy: { companyId: 'asc' }` al JWT, los datos históricos quedaron bajo empresa distinta.
- **Fix**: `GET /cargo` ahora consulta todas las empresas del usuario en la tabla `companyUser` y filtra con `{ in: [...] }`. Las operaciones de escritura (cancelar, editar, seleccionar cotización) también validan contra todas las empresas del usuario.
- **Archivos**: `apps/api/src/modules/cargo/cargo.service.ts`, `apps/api/src/modules/cargo/cargo.controller.ts`

---

### ✅ RESUELTO — Panel admin sin datos (empresas, suscripciones, usuarios)
- **Causa**: El frontend llamaba a `/api/v1/admin/companies`, `/admin/subscriptions`, `/admin/users` pero esos endpoints no existían en la API.
- **Fix**: Creado módulo `AdminModule` con controller y service. Endpoints:
  - `GET /admin/stats` — estadísticas generales de la plataforma
  - `GET /admin/companies` + `PATCH /admin/companies/:id`
  - `GET /admin/subscriptions` + `PATCH /admin/subscriptions/:id` (renovar, cambiar plan)
  - `GET /admin/users` + `PATCH /admin/users/:id`
- **Archivos**: `apps/api/src/modules/admin/` (nuevo), `apps/api/src/app.module.ts`

---

### ✅ RESUELTO — Botón "Generar reporte diario" sin función
- **Fix**: Eliminado del Dashboard. Era decorativo.
- **Archivo**: `apps/web/src/app/[locale]/(dashboard)/dashboard/page.tsx`

---

### ✅ RESUELTO — Admin no podía resetear contraseñas de usuarios
- **Fix**: Nuevo endpoint `PATCH /admin/users/:id/reset-password` (bcrypt cost 12, mínimo 8 caracteres). Botón "Contraseña" en la página de usuarios del admin. De paso se corrigió: el toggle activo llamaba a `/users/:id` (ahora `/admin/users/:id`) y la columna empresa no mostraba nada (el endpoint admin devuelve `companyUsers[]`).
- **Archivos**: `apps/api/src/modules/admin/admin.service.ts`, `admin.controller.ts`, `apps/web/src/app/[locale]/(dashboard)/admin/usuarios/page.tsx`

---

### ✅ RESUELTO (CAUSA RAÍZ REAL) — DADOR no veía NINGUNA carga en /cargas
- **Síntoma**: `GET /cargo` devolvía `total: 0` aunque las cargas existían y pertenecían al usuario. El `findAll` llamado internamente devolvía las cargas correctas, pero por HTTP daba vacío.
- **Causa real**: El `ValidationPipe` global tiene `enableImplicitConversion: true`. Los query params numéricos **ausentes** (`lat`, `lng`, `radiusKm`) llegaban como **`NaN`**, no como `undefined`. Entonces `geoActive = lat !== undefined && lng !== undefined` daba `true` (porque `NaN !== undefined`), activando el modo geo. El filtro por radio corría con `radiusKm = NaN`, y como `NaN <= NaN` es `false`, **filtraba TODAS las cargas** → `total: 0`.
- **Fix**: Usar `Number.isFinite()` en vez de `!== undefined` para detectar `geoActive` y el filtro de radio en `cargo.service.ts findAll`.
- **Nota**: Todo el periplo de "empresas" y "cuentas múltiples" fue una pista falsa. La data estaba bien; el bug era el filtro geográfico. Lección: los params numéricos opcionales con `enableImplicitConversion` se vuelven `NaN`, no `undefined`.
- **Archivos**: `apps/api/src/modules/cargo/cargo.service.ts`

---

### ✅ NUEVO — Selector de ubicación en mapa para cargas (campos / lugares sin calle)
- **Qué**: Nuevo componente `LocationPicker` (Leaflet). En "Nueva carga", cada dirección (origen y destino) tiene un botón "Marcar en el mapa". Se toca el mapa para poner un pin (o se arrastra para ajustar), y con geocodificación inversa (Nominatim) se rellena la dirección automáticamente. Ideal para campos o lugares rurales sin dirección.
- **Archivos**: `apps/web/src/components/ui/LocationPicker.tsx` (nuevo), `apps/web/src/app/[locale]/(dashboard)/cargas/nueva/page.tsx`

---

### ✅ RESUELTO — DADOR no veía progreso del viaje y calificar daba error
- **Progreso del viaje**: Se agregó "Viajes" al menú del DADOR. La página de viajes ya muestra la línea de tiempo del estado (Asignado → En camino → Cargando → En tránsito → Descargando → Finalizado). Para el DADOR es **solo lectura** (se ocultan los botones de avanzar/cancelar, que son del transportista/chofer).
- **Trips multi-empresa**: `GET /trips` para DADOR/TRANSPORTISTA ahora filtra por TODAS las empresas del usuario (antes usaba solo `user.companyId`). Igual el control de acceso en `findOne`. Consistente con el fix de cargas.
- **Error al calificar**: El `toUserId` llegaba vacío cuando el frontend no podía determinar el chofer → fallaba la FK. Ahora el backend, si no recibe `toUserId` pero sí `toCompanyId`, resuelve el usuario principal de esa empresa. Nunca más falla por eso.
- **Archivos**: `apps/api/src/modules/ratings/ratings.service.ts`, `apps/api/src/modules/trips/trips.service.ts`, `trips.controller.ts`, `apps/web/src/components/ui/Sidebar.tsx`, `apps/web/src/app/[locale]/(dashboard)/viajes/page.tsx`

---

## Pendientes

| # | Tema | Estado |
|---|------|--------|
| 1 | Verificar que cargas aparecen en /cargas tras rebuild | 🔄 Pendiente de prueba en prod |
| 2 | Verificar panel admin tras rebuild | 🔄 Pendiente de prueba en prod |
| 3 | Cambiar contraseña admin (fue expuesta en URL) | 🔄 Ahora posible desde panel admin tras rebuild |
| 4 | Integración Resend (emails transaccionales) | ❌ Sin API key |
| 5 | GPS West A10 no conecta a Traccar | ❌ Sin resolver |
| 6 | Password reset no envía email (solo loguea en consola) | ❌ Depende de Resend |
| 7 | Aplicar migraciones en producción (`./scripts/apply-migrations.sh`) | 🔄 Pendiente |
