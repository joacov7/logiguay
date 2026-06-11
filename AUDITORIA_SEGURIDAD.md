# AUDITORÍA INTEGRAL DE SEGURIDAD Y CALIDAD — LOGIGUAY V1

**Fecha:** 11/06/2026 · **Alcance:** Monorepo completo (apps/api NestJS+Prisma+PostgreSQL+Redis, apps/web Next.js 14, Docker Compose, WebSocket tracking)
**Metodología:** Revisión de código estático, análisis de arquitectura, OWASP Top 10 2021, OWASP ASVS L1/L2, ISO 27001:2022, ISO 9001, Ley 25.326 (Argentina)

---

## 1. INFORME EJECUTIVO

### Resumen general

LOGIGUAY es una plataforma SaaS multi-tenant de logística con marketplace de cargas, marketplace de camiones, sistema de turnos, tracking GPS en tiempo real, facturación y gestión de flota. El stack tecnológico (NestJS, Prisma, PostgreSQL, Next.js) es moderno y adecuado.

**Tras la ronda de remediación reciente** (helmet, CORS estricto, eliminación de auto-registro como ADMIN, aislamiento de tenant en controladores principales, sanitización de audit logs, validación de secretos al boot), el sistema pasó de un estado **crítico** a un estado **medio-aceptable para un MVP cerrado**, pero **NO está listo para producción abierta al público** sin resolver los hallazgos críticos que persisten.

### Nivel de seguridad actual: **MEDIO (5.5/10)**
### Nivel de madurez tecnológica: **MVP temprano (Nivel 2 de 5)**

- Sin tests automatizados, sin CI/CD, sin backups, sin monitoreo, sin MFA, sin recuperación de contraseña.
- La lógica de negocio core funciona pero tiene condiciones de carrera y verificaciones de propiedad incompletas en endpoints por ID.

### Hallazgos críticos abiertos (descubiertos en esta auditoría)

| # | Hallazgo | Severidad |
|---|----------|-----------|
| C1 | **IDOR en endpoints `:id`**: `vehicles/:id`, `drivers/:id`, `documents/:id`, `geofences/:id`, `billing/invoice/:id` (GET/PATCH/DELETE) buscan por ID sin verificar que el recurso pertenezca a la empresa del JWT. Se corrigieron los listados, pero **cualquier usuario autenticado puede leer, modificar o borrar el vehículo/chofer/factura/documento de otra empresa si conoce o adivina el ID** | 🔴 CRÍTICA |
| C2 | **IDOR vía WebSocket**: `subscribe-company` y `subscribe-vehicle` en `tracking.gateway.ts` no verifican propiedad — cualquier usuario autenticado puede suscribirse a la posición en tiempo real de la flota de cualquier competidor. Fuga masiva de datos comerciales y de geolocalización | 🔴 CRÍTICA |
| C3 | **Race condition en reserva de turnos**: `bookSlot()` hace check-then-create sin transacción ni constraint. Dos transportistas reservando el último cupo simultáneamente → sobre-reserva (doble asignación) | 🔴 ALTA |
| C4 | **No hay recuperación de contraseña**: un usuario que olvida su clave pierde la cuenta. Riesgo operativo y de soporte | 🟠 ALTA |
| C5 | **Sin backups ni plan de recuperación**: una falla de disco en el servidor = pérdida total de datos del negocio | 🔴 CRÍTICA (operativa) |
| C6 | **Docker Compose expone Postgres (5432), Redis (6379) y pgAdmin (5050) a 0.0.0.0** con contraseñas por defecto (`admin123`, `logiguay_pass`). En un VPS sin firewall, la base queda accesible desde Internet | 🔴 CRÍTICA (infraestructura) |
| C7 | **GPS spoofing**: `position-update` confía 100% en las coordenadas que envía el cliente. Un chofer puede falsificar su ubicación (fraude en entregas, turnos, bolsa de retorno) | 🟠 ALTA |
| C8 | **Sin MFA, sin bloqueo de cuenta por intentos fallidos** (solo throttle global 100 req/min) — fuerza bruta de credenciales viable a baja velocidad | 🟠 ALTA |

### Fortalezas verificadas ✔

- bcrypt cost 12, JWT 15 min + refresh con blacklist en Redis, throttle de refresh 5/min
- Helmet, CORS por whitelist, Swagger deshabilitado en producción, secretos validados al boot
- ValidationPipe global con DTOs class-validator (sin inyección SQL — Prisma parametriza todo)
- Registro forzado a rol DADOR, AdminUpdateUserDto separado, roles en controladores nuevos
- Audit interceptor con sanitización de contraseñas/tokens
- Mensajes de error genéricos en producción

---

## 2. MATRIZ DE RIESGOS

| Riesgo | Impacto | Probabilidad | Prioridad | Solución recomendada |
|---|---|---|---|---|
| IDOR en endpoints :id (C1) | Crítico — fuga/destrucción de datos entre empresas | Alta | **P0** | Patrón `assertOwnership` (ya existe en CargoService) replicado en vehicles, drivers, documents, geofences, billing. Idealmente: middleware Prisma que inyecte `companyId` en todo `where` |
| Espionaje de flota vía WS (C2) | Crítico — ventaja competitiva, seguridad física de choferes (piratería del asfalto conoce posición de cargas) | Alta | **P0** | En `subscribe-company` validar `payload.companyId === meta.companyId`; en `subscribe-vehicle` verificar que el vehículo pertenece a la empresa del token |
| Base de datos expuesta (C6) | Crítico — compromiso total | Alta en VPS | **P0** | Bind a `127.0.0.1:5432:5432`, quitar pgAdmin de producción, contraseñas fuertes, UFW |
| Pérdida de datos sin backup (C5) | Crítico — quiebre del negocio | Media | **P0** | `pg_dump` diario cifrado a S3/objeto externo + prueba de restore mensual |
| Doble asignación de turnos (C3) | Alto — caos operativo en plantas, pérdida de confianza | Media-alta con uso real | **P1** | Transacción serializable o `prisma.$transaction` con re-check, o contador `bookedCount` con update condicional atómico |
| GPS spoofing (C7) | Alto — fraude en entregas/retornos | Media | **P1** | Validar velocidad/salto entre posiciones consecutivas (>150 km/h = descartar+alertar), exigir `accuracy` del dispositivo, sellar con timestamp de servidor |
| Fuerza bruta sin lockout (C8) | Alto — toma de cuentas | Media | **P1** | Throttle específico en `/auth/login` (5/min por IP), lockout progresivo por cuenta (Redis), CAPTCHA tras 5 fallos |
| Sin recuperación de contraseña (C4) | Medio — fricción, soporte manual riesgoso | Alta | **P1** | Flujo de token de un solo uso por email (expira 30 min, hash en DB) |
| Empresas no verificadas en marketplace | Alto — fraude entre usuarios, cargas falsas, flete robado | Alta al escalar | **P1** | Verificación CUIT/AFIP, estado `VERIFICADA` requerido para publicar/cotizar, ratings obligatorios post-viaje |
| Tokens en localStorage | Medio — XSS roba sesión | Baja (sin XSS conocido) | P2 | Migrar refresh token a cookie HttpOnly emitida por el backend |
| Sin tests ni CI/CD | Alto — regresiones de seguridad silenciosas | Alta | P1 | GitHub Actions: lint + build + tests e2e de autorización (los IDOR fixes necesitan tests de regresión) |
| Crecimiento ilimitado de tabla de posiciones GPS | Alto — degradación de DB | Alta a 12 meses | P2 | Particionado por mes + retención (raw 90 días, agregado 2 años) o TimescaleDB |
| Manipulación de precios/cotizaciones | Medio | Media | P2 | Cotizaciones inmutables una vez aceptadas, log de auditoría de cambios de precio, alerta de outliers |
| Spam de publicaciones (cargas/camiones falsos) | Medio | Media | P2 | Límite de publicaciones activas por plan, expiración automática, reporte de usuarios |
| Incumplimiento Ley 25.326 | Medio — sanciones AAIP | Media | P2 | Política de privacidad, registro de base de datos ante AAIP, consentimiento de geolocalización de choferes, derecho de supresión |
| Logs de auditoría borrables por admin DB | Bajo | Baja | P3 | Export periódico de audit_logs a almacenamiento WORM/append-only |

---

## 3. CHECKLIST OWASP TOP 10 (2021)

| Categoría | Estado | Evidencia |
|---|---|---|
| A01 Broken Access Control | 🟡 **PARCIAL** | Listados corregidos con JWT companyId; **endpoints `:id` y WS subscribe siguen vulnerables (C1, C2)** |
| A02 Cryptographic Failures | 🟡 **PARCIAL** | bcrypt 12 ✔, secretos validados ✔; falta TLS forzado (depende del deploy), tokens en localStorage |
| A03 Injection | 🟢 **CUMPLE** | Prisma ORM parametrizado, ValidationPipe global, sin SQL crudo detectado |
| A04 Insecure Design | 🟡 **PARCIAL** | Race condition en turnos (C3), confianza en GPS del cliente (C7), sin verificación de identidad de empresas |
| A05 Security Misconfiguration | 🟡 **PARCIAL** | Helmet ✔, Swagger solo dev ✔; **docker-compose expone DB/Redis/pgAdmin con defaults (C6)** |
| A06 Vulnerable Components | 🟢 **CUMPLE** | Next.js actualizado a 14.2.x (CVEs resueltos); falta `npm audit` en CI |
| A07 Authentication Failures | 🔴 **NO CUMPLE** | Sin MFA, sin lockout, sin recuperación de contraseña, política de contraseña débil (solo 8 chars, sin complejidad) |
| A08 Software & Data Integrity | 🔴 **NO CUMPLE** | Sin CI/CD, sin firma de artefactos, sin verificación de integridad de deploys |
| A09 Logging & Monitoring | 🟡 **PARCIAL** | Audit interceptor sanitizado ✔; sin alertas, sin monitoreo de anomalías, sin retención definida |
| A10 SSRF | 🟢 **CUMPLE** | No hay fetch de URLs controladas por usuario; Next.js Image restringido a buckets propios |

**Resultado: 3 cumple · 5 parcial · 2 no cumple**

---

## 4. CHECKLIST ISO 27001:2022 (controles Anexo A relevantes)

| Control | Estado |
|---|---|
| A.5.1 Políticas de seguridad de la información | 🔴 No cumple — no existen documentadas |
| A.5.15/5.18 Control de acceso y derechos | 🟡 Parcial — RBAC implementado, sin proceso de revisión periódica |
| A.5.23 Seguridad en servicios cloud | 🟡 Parcial — sin contrato/DPA con proveedor definido |
| A.5.29/5.30 Continuidad / ICT readiness | 🔴 No cumple — sin backups, sin DR, sin RTO/RPO definidos |
| A.8.2 Privilegios de acceso | 🟡 Parcial — rol ADMIN corregido; sin cuentas separadas para administración |
| A.8.5 Autenticación segura | 🔴 No cumple — sin MFA |
| A.8.8 Gestión de vulnerabilidades técnicas | 🔴 No cumple — sin proceso (npm audit, escaneos) |
| A.8.12 Prevención de fuga de datos | 🟡 Parcial — aislamiento tenant incompleto (C1/C2) |
| A.8.13 Backup de información | 🔴 No cumple |
| A.8.15 Logging | 🟡 Parcial — audit_logs existe, sin protección ni retención |
| A.8.16 Monitoreo de actividades | 🔴 No cumple |
| A.8.24 Uso de criptografía | 🟡 Parcial — hashing ✔, sin cifrado en reposo ni gestión formal de claves |
| A.8.25-8.28 Ciclo de vida de desarrollo seguro | 🔴 No cumple — sin SDLC, sin revisión de código, sin tests de seguridad |

**Madurez ISO 27001: ~25%. Certificable recién tras 6-12 meses de trabajo formal.**

---

## 5. CHECKLIST ISO 9001 (calidad)

| Requisito | Estado |
|---|---|
| Documentación de procesos | 🔴 No cumple — sin manuales, sin runbooks |
| Control de cambios | 🟡 Parcial — Git con ramas, sin PRs obligatorios ni revisión |
| Verificación y validación (testing) | 🔴 No cumple — 0 tests automatizados |
| Trazabilidad | 🟡 Parcial — audit_logs cubre mutaciones HTTP |
| Gestión de no conformidades (bugs) | 🔴 No cumple — sin issue tracking formal ni SLA |
| Satisfacción del cliente | 🟡 Parcial — sistema de ratings existe, sin proceso de reclamos |
| Mejora continua | 🔴 No cumple — sin métricas ni revisiones |

---

## 6. PLAN DE REMEDIACIÓN

### 🔴 Acciones INMEDIATAS (antes de cualquier deploy público — 1 semana)
1. **Corregir IDOR en endpoints `:id`** (C1): agregar verificación de `companyId` en `findOne/update/delete` de vehicles, drivers, documents, geofences, billing (mismo patrón `assertOwnership` ya usado en cargo).
2. **Corregir IDOR de WebSocket** (C2): validar propiedad en `subscribe-company`/`subscribe-vehicle`/`subscribe-trip`.
3. **Transacción atómica en `bookSlot`** (C3): `$transaction` con nivel `Serializable` o update condicional `WHERE bookings < capacity`.
4. **docker-compose producción** (C6): puertos en `127.0.0.1:`, eliminar pgAdmin, contraseñas generadas, UFW (solo 80/443/SSH).
5. **Backups** (C5): cron `pg_dump | gzip | gpg` → almacenamiento externo, diario, retención 30 días.
6. **Throttle específico en `/auth/login`**: `@Throttle({ default: { limit: 5, ttl: 60000 } })`.

### 🟠 CORTO PLAZO (2-6 semanas)
7. Flujo de recuperación de contraseña por email (requiere implementar módulo de mail — hoy no existe).
8. Lockout progresivo de cuenta (Redis) + política de contraseña: mínimo 10 chars con número y mayúscula (`@Matches`).
9. Anti-spoofing GPS: validación de velocidad/saltos, timestamp de servidor, registrar `accuracy`.
10. Verificación de empresas: campo `verifiedAt`, validación de CUIT, gate para publicar en marketplaces.
11. CI/CD (GitHub Actions): lint, build, `npm audit`, tests e2e de autorización multi-tenant (regresión de los IDOR).
12. Módulo de notificaciones por email (registro, reserva de turno, cotización aceptada) con cola (BullMQ sobre el Redis existente) para evitar duplicados y permitir rate limiting anti-spam.

### 🟡 MEDIANO PLAZO (2-4 meses)
13. MFA TOTP opcional (obligatorio para ADMIN).
14. Refresh token en cookie HttpOnly emitida por el backend (eliminar de localStorage).
15. Retención y particionado de posiciones GPS (90 días raw).
16. Monitoreo: Sentry (errores) + Uptime Kuma/Grafana (disponibilidad), alertas de logins anómalos.
17. Cumplimiento Ley 25.326: política de privacidad, registro ante AAIP, consentimiento explícito de geolocalización de choferes, endpoint de supresión de datos.
18. Cotizaciones inmutables post-aceptación + detección de precios outlier.

### 🟢 LARGO PLAZO (6-12 meses)
19. Pentest externo anual.
20. Programa formal ISO 27001 (políticas, análisis de riesgo, SGSI) si se buscan clientes corporativos.
21. Cifrado en reposo (discos cifrados, columnas sensibles con pgcrypto).
22. WORM/append-only para audit_logs.

---

## 7. ROADMAP DE SEGURIDAD POR ETAPA

| Etapa | Requisitos mínimos |
|---|---|
| **MVP (pilotos cerrados, ≤50 empresas)** | Acciones inmediatas 1-6 completas. HTTPS con Let's Encrypt. Backups verificados. Usuarios invitados manualmente. |
| **Primera versión comercial** | Corto plazo 7-12 completo. Recuperación de contraseña, verificación de empresas, CI/CD con tests de autorización, notificaciones, monitoreo básico. |
| **Escalamiento nacional (1.000+ empresas)** | MFA, cumplimiento Ley 25.326 completo, particionado GPS, pentest externo, SLA 99.5%, soporte formal, réplica de lectura de Postgres. |
| **Escalamiento internacional** | ISO 27001 certificada o SOC 2, multi-región, residencia de datos por país (LGPD Brasil, etc.), equipo de seguridad dedicado, bug bounty. |

---

## 8. ARQUITECTURA RECOMENDADA (100k usuarios, 10k camiones simultáneos)

El cuello de botella real será el **tracking GPS**: 10.000 camiones × 1 posición/10s = 1.000 writes/s sostenidos + fan-out WebSocket. La arquitectura actual (un proceso NestJS, una Postgres) soporta ~500-1.000 camiones; para escalar:

```
                         ┌─────────────┐
   Internet ──HTTPS────► │ CDN + WAF   │ (Cloudflare)
                         └──────┬──────┘
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │ Next.js (SSR)│        │ Load Balancer│
            │  2+ réplicas │        └──────┬───────┘
            └──────────────┘     ┌─────────┼─────────┐
                                 ▼         ▼         ▼
                          ┌──────────┐ ┌──────────┐ ┌──────────────┐
                          │ API REST │ │ API REST │ │ WS Gateway   │
                          │ NestJS   │ │ NestJS   │ │ (separado)   │
                          └────┬─────┘ └────┬─────┘ └──────┬───────┘
                               │            │              │
                  ┌────────────┴────┬───────┴──────┬───────┴────────┐
                  ▼                 ▼              ▼                ▼
           ┌────────────┐   ┌────────────┐  ┌───────────┐  ┌──────────────┐
           │ PostgreSQL │   │ Réplica de │  │ Redis     │  │ TimescaleDB/ │
           │ primaria   │──►│ lectura    │  │ (pub/sub, │  │ particiones  │
           │ (PgBouncer)│   └────────────┘  │ cache,    │  │ posiciones   │
           └────────────┘                   │ colas)    │  │ GPS          │
                                            └───────────┘  └──────────────┘
```

Decisiones clave:
1. **Separar el gateway WebSocket** del API REST en procesos distintos, con **Redis pub/sub como adapter de socket.io** (ya tienen Redis) — permite escalar horizontalmente ambos de forma independiente.
2. **Ingesta GPS por cola** (BullMQ): el WS encola posiciones; workers las escriben en lote en una tabla **particionada por mes** (o TimescaleDB hypertable). La "última posición" vive en Redis (`HSET fleet:{companyId}`) — lectura O(1), sin tocar Postgres.
3. **PgBouncer** delante de Postgres (Prisma abre muchas conexiones al escalar pods).
4. **Stateless total** en API (ya casi lo es) → réplicas detrás de load balancer, deploy blue-green.
5. Para 100k usuarios alcanza con 2-4 nodos API + 2 nodos WS + Postgres con réplica — no se necesita microservicios ni Kubernetes al inicio; Docker Compose → Docker Swarm o ECS es suficiente y más operable para un equipo chico.

---

## 9. CONTROLES OBLIGATORIOS (no negociables para todo desarrollador)

1. **Todo endpoint usa `@UseGuards(JwtAuthGuard)`** salvo login/register/refresh explícitamente públicos.
2. **`companyId` SIEMPRE sale del JWT** (`@CurrentUser('companyId')`) — nunca de query, param ni body. Excepción única: rol ADMIN.
3. **Toda operación sobre un recurso por `:id` verifica propiedad** antes de leer/modificar/borrar (`assertOwnership`).
4. **Todo body usa un DTO con class-validator** — prohibido `@Body() body: any`.
5. **Prohibido SQL crudo** (`$queryRawUnsafe`) sin revisión.
6. **Nunca loguear contraseñas, tokens ni datos de tarjetas** (ni en console.log ni en audit_logs).
7. **Secretos solo por variables de entorno** — prohibido hardcodear; `.env` jamás en git.
8. **Toda suscripción WebSocket valida propiedad** del room solicitado.
9. **Operaciones con cupos/dinero usan transacciones atómicas** (turnos, cotizaciones, facturas).
10. **Toda migración de Prisma se prueba contra copia de producción** antes de aplicar.
11. **Dependencias**: `npm audit` sin críticas antes de cada release.
12. **Ninguna feature se mergea sin test de autorización** que pruebe que la empresa B no accede a datos de la empresa A.

---

## 10. SCORE FINAL (0-100)

| Dimensión | Score | Justificación |
|---|---|---|
| **Seguridad** | **52** | Base sólida tras remediación (auth, CORS, validación, audit), pero IDOR en :id/WS, sin MFA, sin lockout, sin recuperación de clave |
| **Escalabilidad** | **45** | Stack correcto y stateless, pero GPS sin particionar, WS monolítico, sin réplicas ni colas |
| **Calidad** | **35** | Código limpio y consistente, pero 0 tests, sin CI/CD, sin documentación de procesos |
| **Confiabilidad** | **30** | Sin backups, sin monitoreo, sin DR — el riesgo de pérdida total de datos domina esta nota |
| **Preparación para producción** | **40** | Apto para piloto cerrado tras las 6 acciones inmediatas; NO apto para lanzamiento público abierto |

### Veredicto

> **El sistema puede salir a un piloto controlado en ~1 semana** si se ejecutan las 6 acciones inmediatas (IDOR :id, IDOR WS, transacción de turnos, hardening de Docker, backups, throttle de login). **El lanzamiento comercial abierto requiere además el bloque de corto plazo (4-6 semanas)**, principalmente recuperación de contraseña, verificación de empresas y tests de autorización en CI. La mayor amenaza al negocio hoy no es un hacker: es **la ausencia de backups** y **la fuga de posiciones GPS entre competidores**, que en el contexto argentino (piratería del asfalto) es también un riesgo de seguridad física para los choferes.
