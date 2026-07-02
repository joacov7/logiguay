# Changelog — Logiguay

All notable changes to this project will be documented in this file.

Format: `[version] YYYY-MM-DD — description`

---

## [Unreleased]

### Planned
- Email notifications via SMTP (SMTP_HOST/PORT/USER/PASS/FROM vars already defined)
- S3 file uploads for documents (S3_BUCKET/REGION/ACCESS_KEY/SECRET_KEY/ENDPOINT vars already defined)
- Push notifications delivery via Bull queue + stored push tokens

---

## [1.0.0] — 2026-06-12

### Added — API (NestJS 10 + Prisma 5 + PostgreSQL 16)

#### Auth Module
- `POST /auth/register` — user registration with role assignment
- `POST /auth/login` — JWT access token (15m) + refresh token (7d) issuance
- `POST /auth/refresh` — token rotation with old token blacklisting via Redis
- `POST /auth/logout` — explicit token revocation, added to Redis blacklist
- `GET /auth/me` — returns authenticated user profile from JWT

#### Users Module
- `GET /users` — paginated user list (ADMIN only)
- `PUT /users` — update own user profile
- `GET /users/me` — current user details
- `POST /users/push-token` — register device push token for notifications

#### Companies Module
- `POST /companies` — create company
- `GET /companies` — list companies (ADMIN sees all; others see own)
- `PUT /companies` — update company details

#### Vehicles Module
- Full CRUD: `POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id` on `/vehicles`
- `GET /vehicles/stats` — fleet statistics per company
- `PATCH /vehicles/:id/status` — change vehicle status (ACTIVO/INACTIVO/MANTENIMIENTO)

#### Drivers Module
- Full CRUD on `/drivers`
- `GET /drivers/stats` — driver statistics per company

#### Cargo Module
- `POST /cargo` — create cargo request (DADOR only)
- `GET /cargo` — list cargo (non-ADMIN always filtered by JWT companyId)
- `PATCH /cargo/:id` — update cargo details
- `DELETE /cargo/:id` — soft delete / cancel cargo
- `GET /cargo/marketplace` — public marketplace of PUBLICADO cargo
- `GET /cargo/retorno` — return-trip cargo listings

#### Trips Module
- `GET /trips` — list trips (filtered by JWT role, no override possible)
- `POST /trips` — create trip from accepted cargo
- `PATCH /trips/:id/assign` — assign driver and vehicle
- `PATCH /trips/:id/status` — update trip status (TRANSPORTISTA/CHOFER/ADMIN only)
- `PATCH /trips/:id/cancel` — cancel trip
- `GET /trips/:id/eta` — estimated time of arrival based on GPS position
- `GET /trips/:id/events` — timeline of trip events
- `POST /trips/:id/events` — record new trip event (LLEGADA_ORIGEN, SALIDA_ORIGEN, etc.)

#### Quotes Module
- `POST /quotes` — submit quote for a cargo
- `GET /quotes/cargo/:id` — all quotes for a specific cargo (DADOR ownership verified)
- `GET /quotes/my` — own submitted quotes (TRANSPORTISTA)
- `PATCH /quotes/:id/accept` — accept quote (ownership verified against JWT companyId)
- `PATCH /quotes/:id/reject` — reject quote (ownership verified)
- `PATCH /quotes/:id/withdraw` — withdraw own quote

#### Tracking Module
- `GET /tracking/vehicle/:id` — last known position of a vehicle
- `GET /tracking/fleet` — all vehicle positions for a company
- `GET /tracking/vehicle/:id/history` — position history with time range
- `POST /tracking/traccar` — Traccar webhook receiver (secured by TRACCAR_WEBHOOK_TOKEN)

#### Alerts Module
- `GET /alerts` — paginated alerts for authenticated user
- `GET /alerts/unread-count` — count of unread alerts
- `PATCH /alerts/:id/read` — mark single alert as read
- `PATCH /alerts/read-all` — mark all alerts as read

#### Documents Module
- Full CRUD on `/documents`
- `GET /documents/expiring` — documents expiring within threshold
- `GET /documents/check-expiries` — manual expiry check trigger
- `POST /documents/generate-alerts` — Bull queue job to generate document expiry alerts

#### Billing Module
- `GET /billing/invoices` — paginated invoice list
- `GET /billing/invoices/summary` — aggregated billing summary
- `PATCH /billing/invoices/:id/pay` — mark invoice as paid
- `PATCH /billing/invoices/:id/cancel` — cancel invoice

#### Subscriptions Module
- `GET /subscriptions/current` — current subscription details
- `GET /subscriptions/limits` — plan limits enforcement data
- `GET /subscriptions/history` — subscription change history
- `POST /subscriptions/activate` — activate a plan
- `POST /subscriptions/cancel` — cancel subscription

#### Turnos Module
- `POST /turnos/slots` — create available time slots
- `GET /turnos/slots` — list available slots
- `POST /turnos/book` — book a slot
- `GET /turnos/my-bookings` — list own bookings
- `PATCH /turnos/book/:id/cancel` — cancel a booking

#### Camiones Module
- `POST /camiones` — publish truck availability
- `GET /camiones/search` — search available trucks by criteria
- `GET /camiones/my-listings` — own truck listings
- `PATCH /camiones/:id/deactivate` — deactivate listing

#### Dashboard Module
- `GET /dashboard/stats` — aggregate statistics per company/role
- `GET /dashboard/time-series` — time-series data for charts (Recharts)

#### Ratings Module
- `POST /ratings` — submit rating after trip completion
- `GET /ratings/user/:id` — ratings for a specific user
- `GET /ratings/trip/:id` — ratings for a specific trip
- `GET /ratings/has-rated` — check if current user has rated a trip

#### Geofences Module
- Full CRUD on `/geofences`
- Types: ORIGEN, DESTINO, PLANTA, ACOPIO, PUERTO, CLIENTE

#### Market Module
- `GET /market/granos` — current grain market prices

### Added — Web (Next.js 14 + React 18)

- Complete authentication flow (login, register) with next-intl i18n
- Dashboard page with Recharts time-series and KPI cards
- Cargas management (list + create new)
- Bolsa (cargo marketplace) with filters
- Viajes (trips) management
- Flota (fleet) management with vehicle status
- Choferes (drivers) management
- Documentos with expiry warnings
- Facturación with invoice management
- Alertas with read/unread state
- Tracking page with Leaflet maps and real-time WebSocket updates
- Turnos (slot booking) interface
- Camiones disponibles marketplace
- Retorno listings
- Suscripcion plan management
- Admin panel: empresas, usuarios, suscripciones, comisiones, configuración

### Added — Mobile (Expo SDK 54)

- Chofer tabs: viajes list, bolsa, profile
- Dador tabs: mis cargas, nueva-carga, carga detail with cotizaciones
- Trip detail screen with status progression
- Login screen with JWT auth
- TanStack Query data fetching with proper `res.data.data` accessor (bug fix applied)

### Added — Infrastructure

- `docker-compose.yml` with services: postgres (16), redis (7), api, web, traccar
- API Dockerfile: multistage build, prisma generate in builder stage
- Web Dockerfile: multistage build, NEXT_PUBLIC_* as build args, standalone output
- Traccar: port 8083 (web UI), port 5023 (GT06 GPS protocol)
- Environment variable definitions for all services

### Security

- JWT access tokens with 15-minute expiry
- JWT refresh tokens with 7-day expiry
- Redis blacklist for revoked tokens (logout + rotation)
- JwtAuthGuard applied globally
- RolesGuard with RBAC enforcement on all role-sensitive routes
- PlanLimitGuard for subscription-based feature limits
- Rate limiting: 5 req/60s on register, 10 req/60s on login
- Ownership isolation on Cargo, Quotes, Trips (JWT-derived, no override)

### Fixed

- **[BUG-001]** NaN skip value in Prisma queries — page/limit now explicitly cast to Number() in all 8 affected services
- **[BUG-002]** Mobile trip list empty — corrected `res.data` to `res.data.data` in TanStack Query hook
- **[BUG-003]** DADOR could PATCH trip status — added `@Roles` guard to trip status endpoint
