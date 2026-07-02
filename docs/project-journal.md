# Diario del Proyecto — Logiguay

## Descripción General

**Logiguay** es una plataforma integral de logística agrícola desarrollada para el mercado uruguayo/regional. Conecta dadores de carga (empresas agropecuarias, acopios, puertos) con transportistas y choferes, gestionando el ciclo completo de un viaje: publicación de carga, cotización, asignación, tracking en tiempo real, facturación y calificaciones.

---

## Estado Actual del Proyecto

**Fecha de referencia:** 12 de junio de 2026

### Módulos completados y operativos

| Módulo | Estado | Notas |
|---|---|---|
| Autenticación JWT | ✅ Completo | Access + Refresh tokens, blacklist Redis |
| Gestión de Usuarios | ✅ Completo | Roles RBAC aplicados |
| Gestión de Empresas | ✅ Completo | Multi-empresa, branches |
| Vehículos | ✅ Completo | CRUD + stats + estados |
| Choferes | ✅ Completo | CRUD + stats |
| Carga (Cargo) | ✅ Completo | Ciclo completo de estados |
| Viajes (Trips) | ✅ Completo | 10 estados, eventos, ETA |
| Cotizaciones (Quotes) | ✅ Completo | Flujo aceptar/rechazar/retirar |
| Tracking GPS | ✅ Completo | Traccar → webhook → API → WebSocket |
| Alertas | ✅ Completo | Documentos vencidos, geofences, desvíos |
| Documentos | ✅ Completo | Vencimientos, alertas automáticas |
| Facturación | ✅ Completo | Facturas por viaje/comisión/suscripción |
| Suscripciones | ✅ Completo | FREE/PRO/EMPRESA/FLOTA + límites |
| Turnos | ✅ Completo | Slots, reservas, cancelaciones |
| Camiones Disponibles | ✅ Completo | Marketplace de disponibilidad |
| Dashboard | ✅ Completo | Stats + series temporales |
| Calificaciones | ✅ Completo | Por viaje y usuario |
| Geofences | ✅ Completo | CRUD + tipos de zona |
| Mercado de Granos | ✅ Completo | Precios en tiempo real |
| Panel Admin | ✅ Completo | Empresas, usuarios, suscripciones, comisiones |
| App Web (Next.js) | ✅ Completo | 20+ páginas, i18n |
| App Móvil (Expo) | ✅ Completo | Chofer + Dador views |
| Infraestructura Docker | ✅ Completo | docker-compose multi-servicio |

---

## Historial de Decisiones Técnicas

### Elección de NestJS para la API

Se eligió NestJS 10 por su arquitectura modular, soporte nativo para inyección de dependencias, decoradores para guards/interceptors, y su excelente integración con Prisma y Socket.io. Alternativas evaluadas: Express puro (descartado por falta de estructura), Fastify (descartado por menor ecosistema).

### Elección de Prisma como ORM

Prisma 5 fue seleccionado por su type-safety end-to-end, migraciones declarativas y el cliente generado que elimina errores en tiempo de ejecución. PostgreSQL 16 como base de datos por su solidez y soporte de JSON.

### Redis para caché y colas

Redis 7 cumple tres roles: (1) blacklist de JWT tokens revocados, (2) caché de datos frecuentes, (3) broker de colas Bull para procesamiento asíncrono (alertas de documentos, notificaciones push).

### Traccar para GPS

En lugar de construir un servidor GPS propio, se integró Traccar (open source) que soporta el protocolo GT06 usado por el dispositivo West A10 (IMEI 861768070650148). Traccar expone un webhook que llama al endpoint `POST /tracking/traccar` de la API, eliminando la complejidad de parsear protocolos GPS propietarios.

### Expo para móvil

Expo SDK 54 con expo-router 6 permite desarrollo rápido con acceso a APIs nativas (push notifications, ubicación) sin necesidad de Xcode/Android Studio para el ciclo cotidiano. Stack: React Native 0.81.4 + React 19.1.0.

### Hetzner VPS CX23

Servidor en Hetzner con 4GB RAM, suficiente para los servicios actuales (postgres, redis, api, web, traccar). IP pública: 46.62.197.160.

---

## Bugs Detectados y Corregidos

### Bug #1: NaN skip en Prisma (paginación)

**Descripción:** Los parámetros `page` y `limit` llegaban a los servicios como strings desde los query params de NestJS. Al calcular `skip = (page - 1) * limit`, si `page` era el string `"1"`, la operación resultaba en `NaN`. Prisma lanzaba un error de tipo al recibir `skip: NaN`.

**Impacto:** 8 servicios afectados: Cargo, Trips, Quotes, Vehicles, Drivers, Documents, Alerts, Billing.

**Solución:** Aplicar conversión numérica explícita en cada servicio antes de usar los parámetros en consultas Prisma:

```typescript
const skip = (Number(page) - 1) * Number(limit);
const take = Number(limit);
```

**Estado:** Corregido en los 8 servicios afectados.

### Bug #2: Lista de viajes vacía en móvil

**Descripción:** El hook de React Query en la app móvil esperaba `res.data` para el array de viajes, pero la API retorna `res.data.data` (estructura paginada con `{ data: [], total, page, limit }`).

**Impacto:** La pantalla de viajes del chofer mostraba lista vacía siempre, incluso cuando existían viajes asignados.

**Solución:** Corregir el accessor en el hook de TanStack Query:

```typescript
// Antes (incorrecto):
const trips = res.data;
// Después (correcto):
const trips = res.data.data;
```

**Estado:** Corregido.

### Bug #3: DADOR podía actualizar estado de viajes

**Descripción:** El endpoint `PATCH /trips/:id/status` carecía del guard `@Roles(Role.TRANSPORTISTA, Role.CHOFER, Role.ADMIN)`, permitiendo que un usuario con rol DADOR pudiera cambiar el estado de cualquier viaje.

**Impacto:** Violación de reglas de negocio. Un DADOR podría marcar viajes como FINALIZADO sin que el chofer confirme entrega.

**Solución:** Agregar el decorador `@Roles` apropiado al endpoint y verificar ownership en el servicio.

**Estado:** Corregido.

---

## Notas de Operación

### Dispositivo GPS
- **Modelo:** West A10
- **IMEI:** 861768070650148
- **Protocolo:** GT06 (TCP, puerto 5023 en Traccar)
- **Flujo:** Dispositivo → Traccar (5023) → Webhook HTTP → `POST /tracking/traccar` → PostgreSQL + WebSocket broadcast

### Servidor de Producción
- **Proveedor:** Hetzner Cloud
- **Plan:** CX23 (4 vCPU, 4GB RAM, 40GB SSD)
- **IP:** 46.62.197.160
- **Gestión:** Docker Compose en `/home/user/logiguay`

### Contacto del Proyecto
- **Email:** joaquinvescina@gmail.com
