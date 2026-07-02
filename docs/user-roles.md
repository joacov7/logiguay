# Roles de Usuario — Logiguay

## Resumen de Roles

El sistema Logiguay implementa control de acceso basado en roles (RBAC) con cuatro roles bien diferenciados. Cada usuario tiene **un único rol** que determina qué puede ver y hacer en la plataforma.

| Rol | Descripción | Ejemplo de usuario |
|---|---|---|
| **ADMIN** | Administrador de la plataforma | Equipo interno de Logiguay |
| **DADOR** | Empresa que necesita transportar carga | Acopio, silo, exportadora, estancia |
| **TRANSPORTISTA** | Empresa de transporte con flota propia | Transportista de granos |
| **CHOFER** | Conductor de un vehículo | Operador de camión |

---

## ADMIN — Administrador de Plataforma

### Descripción
El ADMIN tiene acceso total al sistema. Es el rol del equipo operativo de Logiguay. Puede ver y gestionar todas las empresas, usuarios, suscripciones y configuraciones globales.

### Capacidades

#### Gestión de usuarios y empresas
- Ver todas las empresas registradas en la plataforma
- Crear, editar y gestionar empresas
- Ver todos los usuarios del sistema
- Modificar roles y estado de usuarios
- Gestionar suscripciones de cualquier empresa

#### Gestión financiera
- Ver todas las facturas del sistema
- Marcar facturas como pagadas o canceladas
- Configurar tasas de comisión (PORCENTAJE, FIJO, HÍBRIDO)
- Ver resumen de facturación global

#### Operaciones
- Ver todos los viajes, cargas y cotizaciones del sistema
- Intervenir en cualquier viaje (asignar, cambiar estado, cancelar)
- Generar alertas de documentos manualmente
- Disparar revisión de vencimientos
- Crear y gestionar geofences

#### Panel de administración (web)
- `/admin/page` — Panel principal de admin
- `/admin/empresas` — Gestión de empresas
- `/admin/usuarios` — Gestión de usuarios
- `/admin/suscripciones` — Gestión de suscripciones
- `/admin/comisiones` — Configuración de comisiones
- `/admin/configuracion` — Configuración global

---

## DADOR — Dador de Carga

### Descripción
El DADOR es la empresa o persona que tiene mercadería para transportar. Publica cargas, recibe cotizaciones de transportistas y aprueba o rechaza las propuestas. Hace seguimiento de sus envíos pero **no puede manejar la operativa del transporte**.

### Capacidades

#### Gestión de cargas
- Crear nuevas solicitudes de carga con origen, destino, tipo de mercadería, peso y fechas
- Ver sus propias cargas (filtrado automático por `companyId` del JWT)
- Publicar cargas en el marketplace para que los transportistas coticen
- Cancelar cargas propias

#### Cotizaciones
- Ver todas las cotizaciones recibidas para sus cargas
- **Aceptar** cotizaciones (solo de sus propias cargas — ownership verificado por JWT)
- **Rechazar** cotizaciones (solo de sus propias cargas — ownership verificado por JWT)
- Al aceptar una cotización: se crea automáticamente un viaje y se rechazan las demás cotizaciones

#### Seguimiento
- Ver los viajes generados a partir de sus cargas
- Ver el tracking en tiempo real de los vehículos asignados
- Cancelar un viaje (pero NO cambiar su estado operativo)

#### Turnos y disponibilidad
- Reservar turnos de carga/descarga
- Ver camiones disponibles

#### Restricciones del DADOR
- ❌ No puede crear cotizaciones (no cotiza sus propias cargas)
- ❌ No puede actualizar el estado de un viaje (no puede marcar como EN_CAMINO, FINALIZADO, etc.)
- ❌ No puede gestionar vehículos ni choferes
- ❌ No puede ver el panel de administración

#### Pantallas web disponibles
- `/dashboard` — KPIs de su empresa
- `/cargas` — Lista de sus cargas
- `/cargas/nueva` — Crear nueva carga
- `/bolsa` — Marketplace (solo lectura)
- `/viajes` — Viajes de sus cargas
- `/documentos` — Documentos de su empresa
- `/facturacion` — Sus facturas
- `/alertas` — Sus alertas
- `/tracking` — Tracking de viajes activos
- `/turnos` — Gestión de turnos
- `/suscripcion` — Su plan de suscripción

#### Pantallas móviles
- `(dador)/index` — Mis cargas
- `(dador)/nueva-carga` — Crear carga
- `(dador)/carga/[id]` — Detalle de carga con cotizaciones recibidas
- `(dador)/profile` — Perfil

---

## TRANSPORTISTA — Empresa de Transporte

### Descripción
El TRANSPORTISTA es la empresa que tiene camiones y choferes. Busca cargas en el marketplace, cotiza, y ejecuta los viajes a través de su flota y choferes. Es el rol operativo central de la plataforma.

### Capacidades

#### Marketplace y cotizaciones
- Ver el marketplace de cargas disponibles (`GET /cargo/marketplace`)
- Enviar cotizaciones para cargas de terceros
- Retirar cotizaciones propias en estado PENDIENTE
- Ver sus cotizaciones enviadas (`GET /quotes/my`)

#### Viajes
- Crear viajes (una vez aceptada una cotización)
- Asignar choferes y vehículos a viajes
- **Actualizar el estado de sus viajes** (EN_CAMINO_ORIGEN, EN_CARGA, EN_TRANSITO, etc.)
- Cancelar viajes propios

#### Gestión de flota
- CRUD completo de vehículos (CAMION, ACOPLADO, SEMIRREMOLQUE)
- Cambiar estado de vehículos (ACTIVO, INACTIVO, MANTENIMIENTO)
- Ver estadísticas de flota
- Publicar disponibilidad de camiones (`POST /camiones`)

#### Gestión de choferes
- CRUD completo de choferes
- Ver estadísticas de choferes
- Gestionar documentos de choferes y vehículos

#### Restricciones del TRANSPORTISTA
- ❌ No puede crear cargas (no puede publicar solicitudes de carga)
- ❌ No puede aceptar/rechazar cotizaciones de cargas ajenas
- ❌ No puede ver el panel de administración
- ❌ No puede ver cargas de otras empresas (solo marketplace público)

#### Pantallas web disponibles
- `/dashboard` — KPIs de su empresa
- `/bolsa` — Marketplace de cargas para cotizar
- `/viajes` — Sus viajes activos y completados
- `/flota` — Gestión de vehículos
- `/choferes` — Gestión de choferes
- `/documentos` — Documentos de flota y choferes
- `/facturacion` — Sus facturas
- `/alertas` — Sus alertas
- `/tracking` — Tracking en tiempo real de su flota
- `/turnos` — Gestión de turnos
- `/camiones-disponibles` — Gestión de disponibilidad publicada
- `/retorno` — Cargas de retorno
- `/suscripcion` — Su plan de suscripción

#### Pantallas móviles
- `(tabs)/index` — Viajes activos
- `(tabs)/bolsa` — Marketplace
- `(tabs)/profile` — Perfil

---

## CHOFER — Conductor

### Descripción
El CHOFER es el operador del vehículo. Ejecuta el viaje asignado por el transportista. Su rol es el más restringido en términos de gestión pero es el más activo operativamente durante la ejecución del transporte.

### Capacidades

#### Viajes
- Ver los viajes donde está asignado como conductor
- **Actualizar el estado de sus viajes asignados** (EN_CAMINO_ORIGEN, EN_CARGA, EN_TRANSITO, EN_DESCARGA, FINALIZADO)
- Registrar eventos de viaje (LLEGADA_ORIGEN, SALIDA_ORIGEN, LLEGADA_DESTINO, etc.)

#### Perfil
- Ver y actualizar su perfil personal
- Registrar push token para notificaciones

#### Restricciones del CHOFER
- ❌ No puede crear cargas ni cotizaciones
- ❌ No puede cancelar viajes
- ❌ No puede gestionar vehículos ni otros choferes
- ❌ No puede ver facturas ni suscripciones
- ❌ No puede ver el marketplace
- ❌ Solo ve sus propios viajes asignados

#### Pantallas móviles
- `(tabs)/index` — Sus viajes activos
- `trip/[id]` — Detalle de viaje con botones de cambio de estado y registro de eventos
- `login` — Pantalla de acceso

---

## Matriz Completa de Permisos por Endpoint

| Endpoint | ADMIN | DADOR | TRANSPORTISTA | CHOFER |
|---|---|---|---|---|
| POST /auth/register | ✅ | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ | ✅ |
| GET /users | ✅ | ❌ | ❌ | ❌ |
| GET /companies (todos) | ✅ | ❌ | ❌ | ❌ |
| POST /cargo | ✅ | ✅ | ❌ | ❌ |
| GET /cargo/marketplace | ✅ | ❌ | ✅ | ❌ |
| POST /quotes | ✅ | ❌ | ✅ | ❌ |
| PATCH /quotes/:id/accept | ✅ | ✅* | ❌ | ❌ |
| PATCH /quotes/:id/reject | ✅ | ✅* | ❌ | ❌ |
| PATCH /quotes/:id/withdraw | ✅ | ❌ | ✅* | ❌ |
| PATCH /trips/:id/status | ✅ | ❌ | ✅* | ✅* |
| PATCH /trips/:id/cancel | ✅ | ✅* | ✅* | ❌ |
| POST /vehicles | ✅ | ❌ | ✅ | ❌ |
| POST /drivers | ✅ | ❌ | ✅ | ❌ |
| POST /tracking/traccar | Token | ❌ | ❌ | ❌ |
| PATCH /billing/invoices/:id/pay | ✅ | ❌ | ❌ | ❌ |
| POST /documents/generate-alerts | ✅ | ❌ | ❌ | ❌ |

*Con verificación de ownership via JWT companyId

---

## Implementación Técnica de RBAC

Los guards en NestJS aplican el control de acceso en dos capas:

1. **JwtAuthGuard** — Verifica que el token JWT sea válido y no esté en la blacklist de Redis. Extrae el `userId`, `role` y `companyId` del payload del token.

2. **RolesGuard** — Lee el decorador `@Roles(Role.DADOR, Role.ADMIN)` en el handler y verifica que el rol del JWT coincida. Si no coincide, retorna 403.

3. **PlanLimitGuard** — Para endpoints que crean recursos limitados, verifica el plan activo de la empresa y el uso actual. Si se excede el límite, retorna 403.

El `companyId` **nunca** se acepta como parámetro de URL o query para operaciones de filtrado de datos propios — siempre se extrae del JWT para prevenir ataques de acceso a datos de otras empresas.
