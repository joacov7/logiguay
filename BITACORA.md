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

---

## 2026-06-17

### ✅ RESUELTO — Logo/imagen del camión no se veía en la landing page (producción)
- **Causa**: `output: 'standalone'` de Next.js no copia la carpeta `public/` automáticamente. En producción el servidor standalone no encontraba los archivos estáticos.
- **Fix**: Agregar `COPY --from=builder --chown=nextjs:nodejs /app/public ./public` en la etapa runner del Dockerfile.
- **Archivo**: `apps/web/Dockerfile`

---

### ✅ RESUELTO — App móvil daba "Error de credenciales" en dispositivo físico
- **Causa**: La URL por defecto era `http://10.0.2.2:3001` (dirección especial del emulador Android). En un teléfono físico esa IP no existe.
- **Fix**: Cambiada la URL por defecto a `https://api.logiguay.com.ar`.
- **Archivo**: `apps/mobile/src/lib/api.ts`

---

### ✅ RESUELTO — App móvil crasheaba (Cannot read property 'type' of undefined)
- **Causa**: `trip.cargo` puede ser `null` cuando la API devuelve el viaje sin relaciones populadas. El render intentaba acceder a `trip.cargo.type` directamente.
- **Fix**: Todas las secciones que usan `trip.cargo` se envuelven con `{trip.cargo && ...}`.
- **Archivos**: `apps/mobile/app/trip/[id].tsx`, `apps/mobile/app/(chofer)/index.tsx`

---

### ✅ RESUELTO — App móvil crasheaba al avanzar estado del viaje
- **Causa**: `PATCH /trips/:id/status` devuelve el viaje sin relaciones. El código hacía `setTrip(res.data)` con el objeto incompleto, causando crash en el render.
- **Fix**: Reemplazado `setTrip(res.data)` por `await fetchTrip()` para re-obtener el viaje completo desde la API.
- **Archivo**: `apps/mobile/app/trip/[id].tsx`

---

### ✅ RESUELTO — Camiones no aparecían en el mapa de tracking (GPS móvil)
- **Causa raíz**: 5 bugs en cadena en `useVehicleTracking.ts`:
  1. Conectaba al namespace `/` en vez de `/tracking`
  2. No enviaba el token JWT en el handshake → el gateway rechazaba la conexión
  3. Usaba el evento `location:update` en lugar de `position-update`
  4. Enviaba `tripId` en el payload en lugar de `vehicleId`
- **Causa adicional (gateway)**: Solo emitía posiciones al room `vehicle:<id>`, pero la web escucha en `company:<id>`.
- **Causa adicional (web)**: El hook `useTracking` se suscribía solo al `companyId` del JWT (no determinístico en usuarios multi-empresa). Además, la web dependía 100% del WebSocket sin fallback.
- **Fix en cadena**:
  1. `useVehicleTracking.ts` corregido: namespace, auth, evento y payload
  2. `tracking.gateway.ts`: después de guardar la posición, emite también a `company:<companyId>` del vehículo
  3. `GET /auth/me` enriquecido para devolver `companyIds[]` (todas las membresías)
  4. `useTracking.ts`: acepta `companyIds[]` y se suscribe a todos los rooms de empresa
  5. `tracking/page.tsx`: polling fallback `GET /tracking/fleet` cada 10s (posiciones del socket sobreescriben las del polling)
  6. `GET /tracking/fleet`: consulta todas las empresas del usuario vía tabla `companyUser`
- **Lección**: El WebSocket puro no es suficiente — siempre agregar polling fallback para datos de posición.
- **Archivos**: `apps/mobile/src/lib/useVehicleTracking.ts`, `apps/api/src/modules/tracking/tracking.gateway.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.module.ts`, `apps/web/src/hooks/useTracking.ts`, `apps/web/src/app/[locale]/(dashboard)/tracking/page.tsx`, `apps/api/src/modules/tracking/tracking.service.ts`, `apps/api/src/modules/tracking/tracking.controller.ts`, `apps/api/src/modules/tracking/tracking.module.ts`

---

### ✅ RESUELTO — GPS West A10 (Traccar) no aparecía en el mapa web
- **Causa**: El webhook de Traccar (`POST /tracking/traccar`) llamaba a `gateway.broadcastPosition()` que solo emite al room `vehicle:<id>`. La web escucha en rooms `company:<id>`, por lo que las posiciones del hardware GPS nunca llegaban al mapa.
- **Es el mismo bug** que el GPS móvil pero en el lado del webhook Traccar.
- **Fix**: 
  - `processTraccarPosition` ahora devuelve también `companyId`
  - Nuevo método `broadcastPositionToCompany(companyId, vehicleId, position)` en el gateway
  - El webhook llama a ambos métodos después de procesar la posición
- **Nota**: El dispositivo también se beneficia del polling fallback (`GET /tracking/fleet`) — aparece en el mapa aunque el WebSocket no funcione, siempre que esté vinculado por `trackerDeviceId` (IMEI) en la tabla `Vehicle`.
- **Archivos**: `apps/api/src/modules/tracking/traccar-webhook.controller.ts`, `apps/api/src/modules/tracking/tracking.gateway.ts`, `apps/api/src/modules/tracking/tracking.service.ts`

---

### ✅ NUEVO — Pantalla Mapa de flota en app móvil (TRANSPORTISTA)
- **Qué**: Nueva pestaña "Mapa" en la app del transportista. Muestra todos los vehículos de la flota con su última posición GPS. Pin verde = en viaje activo, gris = sin viaje. Tap en callout → detalle del viaje. Refresco automático cada 15s.
- **Archivos**: `apps/mobile/app/(transportista)/mapa.tsx` (nuevo), `apps/mobile/app/(transportista)/_layout.tsx`

---

## Pendientes

| # | Tema | Estado |
|---|------|--------|
| 1 | Verificar que cargas aparecen en /cargas tras rebuild | 🔄 Pendiente de prueba en prod |
| 2 | Verificar panel admin tras rebuild | 🔄 Pendiente de prueba en prod |
| 3 | Cambiar contraseña admin (fue expuesta en URL) | 🔄 Ahora posible desde panel admin tras rebuild |
| 4 | Integración Resend (emails transaccionales) | ❌ Sin API key |
| 5 | Password reset no envía email (solo loguea en consola) | ❌ Depende de Resend |
| 6 | Aplicar migraciones en producción (`./scripts/apply-migrations.sh`) | 🔄 Pendiente |
