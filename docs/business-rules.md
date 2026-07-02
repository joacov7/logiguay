# Reglas de Negocio — Logiguay

## 1. Roles y Permisos

### Regla BR-001: Segregación estricta de roles

El sistema opera con cuatro roles mutuamente excluyentes a nivel de acciones críticas:

| Acción | ADMIN | DADOR | TRANSPORTISTA | CHOFER |
|---|---|---|---|---|
| Crear carga | ✅ | ✅ | ❌ | ❌ |
| Publicar carga en marketplace | ✅ | ✅ | ❌ | ❌ |
| Cotizar carga | ✅ | ❌ | ✅ | ❌ |
| Aceptar/rechazar cotización | ✅ | ✅ | ❌ | ❌ |
| Crear viaje | ✅ | ❌ | ✅ | ❌ |
| Actualizar estado de viaje | ✅ | ❌ | ✅ | ✅ |
| Cancelar viaje | ✅ | ✅ | ✅ | ❌ |
| Gestionar vehículos y choferes | ✅ | ❌ | ✅ | ❌ |
| Ver panel admin | ✅ | ❌ | ❌ | ❌ |
| Ver todas las empresas | ✅ | ❌ | ❌ | ❌ |

### Regla BR-002: Aislamiento de datos por empresa

- Un DADOR solo puede ver cargas de su propia empresa. El `companyId` se extrae **siempre** del JWT, nunca de query params.
- Un TRANSPORTISTA solo ve viajes asignados a su empresa. El filtrado en `GET /trips` está basado en el rol del token; no existe parámetro de URL que pueda sobreescribir este filtro.
- Un CHOFER solo ve los viajes donde está asignado como conductor.

### Regla BR-003: Verificación de ownership en cotizaciones

Al aceptar o rechazar una cotización (`PATCH /quotes/:id/accept` o `/reject`), el sistema verifica que el `companyId` del cargo al que pertenece la cotización coincida con el `companyId` del usuario autenticado extraído del JWT. Una empresa no puede aceptar cotizaciones de cargas de otra empresa.

---

## 2. Ciclo de Vida de la Carga

### Regla BR-004: Transiciones de estado de carga

```
PENDIENTE → PUBLICADO → COTIZANDO → ASIGNADO
                                  ↘ CANCELADO
              ↘ CANCELADO
```

| Desde | Hacia | Trigger |
|---|---|---|
| PENDIENTE | PUBLICADO | Dador publica la carga |
| PUBLICADO | COTIZANDO | Primer transportista envía cotización |
| COTIZANDO | ASIGNADO | Dador acepta una cotización |
| COTIZANDO | CANCELADO | Dador cancela la carga |
| PUBLICADO | CANCELADO | Dador cancela antes de recibir cotizaciones |
| PENDIENTE | CANCELADO | Dador cancela en borrador |

### Regla BR-005: Visibilidad en marketplace

Solo las cargas en estado `PUBLICADO` o `COTIZANDO` aparecen en `GET /cargo/marketplace`. Las cargas `ASIGNADO`, `CANCELADO` o `PENDIENTE` no son visibles para transportistas.

### Regla BR-006: Unicidad de asignación

Una carga en estado `ASIGNADO` tiene exactamente un viaje activo asociado. No se pueden crear múltiples viajes para la misma carga.

---

## 3. Ciclo de Vida del Viaje

### Regla BR-007: Transiciones de estado de viaje

```
PENDIENTE → PUBLICADO → COTIZANDO → ASIGNADO
                                      ↓
                              EN_CAMINO_ORIGEN
                                      ↓
                                  EN_CARGA
                                      ↓
                                EN_TRANSITO
                                      ↓
                                EN_DESCARGA
                                      ↓
                                FINALIZADO

Desde cualquier estado → CANCELADO (con permisos adecuados)
```

### Regla BR-008: Actores autorizados para cambiar estado de viaje

Solo los roles TRANSPORTISTA, CHOFER y ADMIN pueden ejecutar `PATCH /trips/:id/status`. Un DADOR **no puede** modificar el estado de un viaje. Esta regla está implementada mediante `@Roles(Role.TRANSPORTISTA, Role.CHOFER, Role.ADMIN)` en el endpoint.

### Regla BR-009: Registro de eventos de viaje

Los siguientes eventos deben registrarse en la tabla `TripEvent` al producirse:

| Evento | Descripción |
|---|---|
| LLEGADA_ORIGEN | El camión llegó al punto de carga |
| SALIDA_ORIGEN | El camión salió del punto de carga con la mercadería |
| LLEGADA_DESTINO | El camión llegó al destino de entrega |
| SALIDA_DESTINO | El camión salió del destino (confirmación de entrega) |
| DESVIO | El vehículo se desvió de la ruta planificada |
| PERDIDA_SENAL | Sin señal GPS por más de X minutos |
| DEMORA | El vehículo presenta demora respecto al ETA |

### Regla BR-010: Calificaciones post-viaje

Una calificación solo puede emitirse para un viaje en estado `FINALIZADO`. Cada par (calificador, viaje) es único; el sistema verifica mediante `GET /ratings/has-rated` antes de permitir una nueva calificación.

---

## 4. Ciclo de Vida de Cotizaciones

### Regla BR-011: Transiciones de estado de cotización

```
PENDIENTE → ACEPTADA
          → RECHAZADA
```

Una cotización ACEPTADA no puede ser rechazada ni retirada. Una cotización RECHAZADA no puede ser aceptada. Solo cotizaciones en estado PENDIENTE pueden ser retiradas por el transportista.

### Regla BR-012: Efecto cascada al aceptar cotización

Al aceptar una cotización:
1. La cotización pasa a estado `ACEPTADA`.
2. Todas las demás cotizaciones pendientes de la misma carga pasan a `RECHAZADA`.
3. La carga pasa a estado `ASIGNADO`.
4. Se crea un `Trip` con los datos de la carga y del transportista cotizante.

---

## 5. Tracking y Geofences

### Regla BR-013: Autenticación del webhook GPS

El endpoint `POST /tracking/traccar` solo acepta peticiones que incluyan el `TRACCAR_WEBHOOK_TOKEN` correcto en el header. Peticiones sin este token son rechazadas con 401.

### Regla BR-014: Retransmisión en tiempo real

Cada posición recibida del webhook de Traccar es almacenada en `VehiclePosition` y emitida vía Socket.io a todos los clientes con sesión activa que tengan permiso para ver ese vehículo.

### Regla BR-015: Tipos de geofence

Las zonas geográficas definidas tienen semántica de negocio según su tipo:

| Tipo | Uso |
|---|---|
| ORIGEN | Zona de carga / acopio |
| DESTINO | Zona de entrega |
| PLANTA | Planta de procesamiento |
| ACOPIO | Silo o centro de almacenamiento |
| PUERTO | Puerto de exportación |
| CLIENTE | Instalación del cliente final |

---

## 6. Documentos y Vencimientos

### Regla BR-016: Alertas automáticas de documentos

El sistema ejecuta periódicamente (via Bull queue) el job `generate-alerts` que verifica todos los documentos activos. Si un documento está próximo a vencer, genera una `Alert` para el usuario responsable. El endpoint `GET /documents/expiring` permite consultar documentos por vencer sin esperar la ejecución automática.

### Regla BR-017: Documentos asociables

Los documentos pueden estar asociados a: vehículos, choferes o empresas. Cada tipo de entidad puede tener múltiples documentos con fechas de vencimiento independientes.

---

## 7. Suscripciones y Límites

### Regla BR-018: Enforcement de límites por plan

El `PlanLimitGuard` intercepta endpoints que crean recursos limitados (cargas, vehículos, choferes, etc.) y verifica que la empresa no haya excedido el límite del plan activo. Si se excede, retorna 403 con mensaje indicando el límite alcanzado.

### Regla BR-019: Estados de suscripción y efectos

| Estado | Efecto |
|---|---|
| TRIAL | Acceso completo por período de prueba; límites del plan PRO o EMPRESA |
| ACTIVA | Acceso según el plan contratado (FREE/PRO/EMPRESA/FLOTA) |
| VENCIDA | Funcionalidad reducida; solo lectura de datos existentes |
| CANCELADA | Acceso mínimo; datos preservados por período de retención |

### Regla BR-020: Tipos de comisión

El sistema soporta tres modelos de comisión sobre viajes/transacciones:

| Tipo | Descripción |
|---|---|
| PORCENTAJE | Comisión como porcentaje del valor del viaje |
| FIJO | Comisión como monto fijo por viaje |
| HIBRIDO | Combinación de porcentaje base + monto fijo |

---

## 8. Facturación

### Regla BR-021: Tipos de factura

| Tipo | Generado por |
|---|---|
| VIAJE | Comisión de la plataforma sobre cada viaje completado |
| COMISION | Comisión especial configurada por el administrador |
| SUSCRIPCION | Cargo mensual/anual por el plan de suscripción |

### Regla BR-022: Ciclo de vida de facturas

Una factura en estado `PENDIENTE` puede ser marcada como `PAGADA` o `CANCELADA`. Una factura `PAGADA` o `CANCELADA` no puede volver a `PENDIENTE`.

---

## 9. Turnos de Carga/Descarga

### Regla BR-023: Gestión de slots

Los slots de tiempo son creados por el administrador o empresa que gestiona el punto de carga/descarga. Un slot puede ser reservado por un único transportista/viaje. Al cancelar una reserva, el slot vuelve a estar disponible.

---

## 10. Marketplace de Camiones Disponibles

### Regla BR-024: Publicación de disponibilidad

Un transportista puede publicar la disponibilidad de un camión especificando fechas, zona geográfica y tipo de vehículo. Una publicación en estado activo es visible en `GET /camiones/search`. Al ejecutar `PATCH /camiones/:id/deactivate`, la publicación deja de aparecer en las búsquedas.

---

## 11. Integridad de Datos

### Regla BR-025: AuditLog

Todas las operaciones críticas (cambios de estado, creación de facturas, cambios de suscripción) deben registrarse en la tabla `AuditLog` con: usuario responsable, entidad afectada, acción realizada, timestamp y datos previos/posteriores.

### Regla BR-026: Paginación obligatoria

Todos los endpoints de listado retornan datos en formato paginado:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```
Los parámetros `page` y `limit` son convertidos a número entero en el servicio antes de ser usados en consultas Prisma (`Number(page)`, `Number(limit)`) para evitar el bug de `NaN skip`.
