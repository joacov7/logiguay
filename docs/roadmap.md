# Roadmap — Logiguay

**Última actualización:** 12 de junio de 2026

Este documento registra las mejoras planificadas basadas en el estado actual del sistema. Las prioridades se clasifican como: **Alta** (bloquea operación o seguridad), **Media** (mejora significativa), **Baja** (nice-to-have).

---

## Deuda Técnica Inmediata

Estas tareas se derivan de análisis del código actual y deben abordarse en el corto plazo.

### 1. Agregar HTTPS / TLS — ALTA PRIORIDAD

**Problema:** El sistema actualmente corre en HTTP puro (puertos 3000 y 3001). Los JWT tokens, contraseñas y coordenadas GPS se transmiten en texto plano.

**Solución propuesta:**
- Agregar Caddy como reverse proxy en el docker-compose
- Caddy gestiona TLS automáticamente con Let's Encrypt
- Actualizar `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` y `API_CORS_ORIGIN` a `https://`

**Impacto:** Seguridad crítica para producción real.

---

### 2. ParseIntPipe en query params de paginación — MEDIA

**Problema:** Actualmente se aplica `Number()` manualmente en 8 servicios. Esto es correcto pero frágil: si se agrega un nuevo servicio sin aplicar el patrón, el bug de NaN en Prisma reaparecerá.

**Solución propuesta:** Usar `ParseIntPipe` y `DefaultValuePipe` de NestJS en los decoradores `@Query()` para enforcement automático a nivel de framework:

```typescript
@Get()
findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
) { ... }
```

**Impacto:** Prevención de regresión, mejor manejo de errores (NestJS retorna 400 con mensaje claro en vez de crashear).

---

### 3. Remover puertos de base de datos del docker-compose público — ALTA

**Problema:** PostgreSQL (5432) y Redis (6379) tienen sus puertos mapeados al host en `docker-compose.yml`. En producción esto expone los servicios de base de datos a internet.

**Solución:** Remover los bloques `ports:` de los servicios `postgres` y `redis`. Estos servicios solo necesitan ser accesibles dentro de la red Docker interna.

---

### 4. Tests de integración para RBAC — MEDIA

**Problema:** El bug BUG-003 (DADOR podía actualizar estado de viaje) fue detectado manualmente. No existe cobertura de tests automatizados para verificar que cada rol tenga exactamente los permisos correctos.

**Solución propuesta:** Crear una suite de tests de integración con supertest que para cada endpoint sensible verifique:
- Usuario con rol incorrecto recibe 403
- Usuario con rol correcto recibe 2xx
- Usuario de otra empresa recibe 403 en endpoints con ownership

---

### 5. TTL en blacklist de Redis — MEDIA

**Problema:** Cuando se agrega un token a la blacklist de Redis (logout/refresh), si no se configura TTL en la clave, la blacklist crecerá indefinidamente con tokens ya vencidos.

**Solución:** Al hacer `SET key value` en Redis para la blacklist, usar `EX` con el tiempo restante de expiración del token:

```typescript
const remainingSeconds = Math.floor((decodedToken.exp - Date.now() / 1000));
await redis.set(`blacklist:${token}`, '1', 'EX', remainingSeconds);
```

---

## Funcionalidades Pendientes (vars de entorno ya definidas)

Las siguientes funcionalidades tienen sus variables de entorno ya definidas en el sistema pero aún no están implementadas:

### 6. Envío de emails vía SMTP — MEDIA

**Variables ya definidas:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Funcionalidades a implementar:**
- Email de bienvenida al registrarse
- Notificación por email cuando se acepta/rechaza una cotización
- Email de alerta cuando un documento está próximo a vencer
- Resumen semanal de actividad para DADORES y TRANSPORTISTAS

**Integración:** Bull queue (`@nestjs/bull`) ya instalado — crear job `email.processor.ts`.

---

### 7. Carga de archivos a S3 — MEDIA

**Variables ya definidas:** `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`

**Funcionalidades a implementar:**
- Endpoint `POST /documents/upload` para subir PDFs/imágenes de documentos
- Generación de URLs firmadas (presigned URLs) para descarga segura
- El campo `fileUrl` en el modelo `Document` ya existe en la base de datos

**Integración:** Usar `@aws-sdk/client-s3`. El `S3_ENDPOINT` permite usar proveedores compatibles (MinIO, Wasabi, Cloudflare R2) además de AWS.

---

### 8. Push notifications reales — MEDIA

**Infraestructura ya disponible:**
- Campo `pushToken` en modelo `User`
- Endpoint `POST /users/push-token` implementado
- Bull queues disponibles

**Funcionalidades a implementar:**
- Job Bull para enviar push notifications en eventos clave:
  - Nueva cotización recibida (→ DADOR)
  - Cotización aceptada/rechazada (→ TRANSPORTISTA)
  - Estado de viaje actualizado (→ DADOR)
  - Nueva alerta de documento (→ todos)
- Usar Expo Push Notification API para envío a dispositivos iOS/Android

---

## Mejoras de Funcionalidad

### 9. Notificaciones en tiempo real más granulares — BAJA

**Estado actual:** Socket.io emite `vehicle:position`, `trip:status`, `trip:event`, `alert:new`.

**Mejoras propuestas:**
- Rooms por companyId para evitar broadcasts innecesarios
- Eventos de geofence (entrada/salida de zona)
- Indicador de "chofer online" basado en última posición GPS

---

### 10. Histórico de posiciones en mapa — BAJA

**Estado actual:** `GET /tracking/vehicle/:id/history` retorna array de posiciones.

**Mejora:** En el frontend web, renderizar la ruta histórica como polilínea en Leaflet, permitiendo al DADOR ver el recorrido exacto que hizo el camión.

---

### 11. Cálculo de ETA mejorado — BAJA

**Estado actual:** `GET /trips/:id/eta` retorna ETA básico.

**Mejora propuesta:** Integrar con una API de rutas (OpenRouteService, que es open source y auto-hosteable) para calcular ETA considerando la red vial real, no solo distancia euclidiana.

---

### 12. Reporte de documentos PDF — BAJA

**Funcionalidad:** Generar PDF de manifiesto de viaje con datos de cargo, chofer, vehículo, fechas y firma digital.

**Requisitos:** Implementar generación de PDF con `@nestjs/pdf` o `puppeteer`, almacenar en S3.

---

### 13. App móvil para TRANSPORTISTA — MEDIA

**Estado actual:** La app móvil tiene tabs para CHOFER (viajes + bolsa) y pantallas para DADOR (cargas + cotizaciones).

**Pendiente:** Pantallas de gestión de flota y choferes para TRANSPORTISTA en la app móvil (actualmente solo disponibles en web).

---

### 14. Geofence alertas automáticas — MEDIA

**Estado actual:** Los geofences están definidos en la base de datos pero no hay lógica automática que compare posiciones GPS contra geofences.

**Implementación propuesta:**
- En el handler del webhook Traccar, para cada nueva posición, verificar si el vehículo entró o salió de algún geofence de su empresa
- Si hay cambio de estado (fuera → dentro o dentro → fuera), crear `TripEvent` y emitir alerta vía Socket.io

---

### 15. Multi-idioma completo (i18n) — BAJA

**Estado actual:** `next-intl` está integrado en el web app con routing por locale.

**Pendiente:** Completar las traducciones para todos los textos de la interfaz. Agregar soporte de idioma a la app móvil con `i18n-js` o `expo-localization`.

---

## Infraestructura y DevOps

### 16. CI/CD Pipeline — MEDIA

**Pendiente:** Configurar GitHub Actions (o similar) para:
- Ejecutar tests en cada push/PR
- Build de imágenes Docker en merge a `main`
- Deploy automático al servidor Hetzner (SSH + docker compose pull + up)

---

### 17. Backups automáticos de base de datos — ALTA

**Pendiente:** Configurar cron job para backup diario de PostgreSQL y subida a S3:

```bash
# Ejemplo de cron (diario a las 02:00)
0 2 * * * docker compose exec -T postgres pg_dump -U logiguay logiguay | gzip > /backups/logiguay_$(date +%Y%m%d).sql.gz && aws s3 cp /backups/logiguay_$(date +%Y%m%d).sql.gz s3://logiguay-backups/
```

**Riesgo si no se implementa:** Pérdida total de datos ante falla del disco del VPS.

---

### 18. Monitoreo y alertas de infraestructura — MEDIA

**Pendiente:** Implementar:
- Uptime monitoring (UptimeRobot o similar — gratuito)
- Métricas de sistema con Prometheus + Grafana
- Alertas por email/Slack si un servicio cae

---

### 19. Actualización del servidor CX23 — BAJA (futuro)

**Estado actual:** Hetzner CX23 con 4GB RAM es suficiente para el estado actual.

**Punto de upgrade:** Evaluar upgrade a CX33 (8GB RAM) cuando la base de usuarios crezca o cuando se agreguen servicios adicionales (Prometheus/Grafana, generación de PDFs con Puppeteer).

---

## Tabla de Prioridades

| # | Tarea | Prioridad | Esfuerzo estimado |
|---|---|---|---|
| 1 | HTTPS / TLS con Caddy | ALTA | 2-4 horas |
| 3 | Remover puertos DB de docker-compose | ALTA | 30 min |
| 17 | Backups automáticos PostgreSQL | ALTA | 2 horas |
| 5 | TTL en blacklist Redis | MEDIA | 1 hora |
| 2 | ParseIntPipe en todos los endpoints | MEDIA | 2 horas |
| 4 | Tests de integración RBAC | MEDIA | 1-2 días |
| 6 | Envío de emails SMTP | MEDIA | 1 día |
| 7 | Upload de archivos a S3 | MEDIA | 1 día |
| 8 | Push notifications | MEDIA | 1 día |
| 14 | Geofence alertas automáticas | MEDIA | 1 día |
| 16 | CI/CD Pipeline | MEDIA | 1 día |
| 18 | Monitoreo infraestructura | MEDIA | 1 día |
| 9 | WebSocket rooms granulares | BAJA | 4 horas |
| 10 | Histórico de ruta en mapa | BAJA | 4 horas |
| 11 | ETA con API de rutas real | BAJA | 1 día |
| 12 | Reporte PDF de viajes | BAJA | 1 día |
| 13 | App móvil para TRANSPORTISTA | BAJA | 2-3 días |
| 15 | Multi-idioma completo | BAJA | 1-2 días |
| 19 | Upgrade servidor CX33 | BAJA | 1 hora (admin) |
