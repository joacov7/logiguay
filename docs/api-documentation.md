# API Documentation — Logiguay

**Base URL:** `http://46.62.197.160:3001` (production)  
**Protocol:** HTTP/REST + WebSocket (Socket.io)  
**Authentication:** Bearer JWT token in `Authorization` header  
**Content-Type:** `application/json`

All list endpoints return paginated responses:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

Query params `page` (default: 1) and `limit` (default: 20) are accepted on all list endpoints.

---

## Authentication — `/auth`

### POST /auth/register
Register a new user.

**Rate limit:** 5 requests per 60 seconds  
**Auth required:** No

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "DADOR"
}
```

**Response 201:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

### POST /auth/login
Authenticate and obtain tokens.

**Rate limit:** 10 requests per 60 seconds  
**Auth required:** No

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

### POST /auth/refresh
Rotate refresh token and obtain new access token.

**Auth required:** No (uses refresh token in body)

**Request body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Note:** Old refresh token is immediately blacklisted in Redis.

---

### POST /auth/logout
Invalidate the current session.

**Auth required:** Yes

**Request body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response 200:**
```json
{ "message": "Logged out successfully" }
```

---

### GET /auth/me
Get current authenticated user profile.

**Auth required:** Yes

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "DADOR"
}
```

---

## Users — `/users`

### GET /users
List all users (ADMIN only).

**Auth required:** Yes | **Roles:** ADMIN

**Response 200:** Paginated `User[]`

---

### PUT /users
Update own user profile.

**Auth required:** Yes

**Request body:** Partial user fields (name, phone, etc.)

**Response 200:** Updated `User`

---

### GET /users/me
Get own user details with company associations.

**Auth required:** Yes

**Response 200:** `User` with `companies`

---

### POST /users/push-token
Register device push token for notifications.

**Auth required:** Yes

**Request body:**
```json
{
  "pushToken": "ExponentPushToken[...]"
}
```

**Response 200:** `{ "message": "Token registered" }`

---

## Companies — `/companies`

### POST /companies
Create a new company.

**Auth required:** Yes | **Roles:** ADMIN, DADOR, TRANSPORTISTA

**Request body:**
```json
{
  "name": "Agro San Luis S.A.",
  "rut": "210987654321",
  "phone": "+598 99 123 456",
  "address": "Ruta 5 km 300, Rivera"
}
```

**Response 201:** Created `Company`

---

### GET /companies
List companies.

**Auth required:** Yes  
**Note:** ADMIN sees all companies; other roles see only their own.

**Response 200:** Paginated `Company[]`

---

### PUT /companies
Update company details.

**Auth required:** Yes | **Roles:** ADMIN, company members

**Response 200:** Updated `Company`

---

## Vehicles — `/vehicles`

### POST /vehicles
Create a vehicle.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN  
**Plan limit enforced:** Yes

**Request body:**
```json
{
  "plate": "ABC 1234",
  "type": "CAMION",
  "brand": "Volvo",
  "model": "FH 460",
  "year": 2022,
  "capacity": 28.5,
  "traccarId": "device-id-in-traccar"
}
```

---

### GET /vehicles
List company vehicles.

**Auth required:** Yes

**Response 200:** Paginated `Vehicle[]`

---

### GET /vehicles/:id
Get vehicle detail.

**Auth required:** Yes

**Response 200:** `Vehicle`

---

### PUT /vehicles/:id
Update vehicle details.

**Auth required:** Yes

**Response 200:** Updated `Vehicle`

---

### DELETE /vehicles/:id
Delete a vehicle.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN

---

### GET /vehicles/stats
Fleet statistics for the authenticated company.

**Auth required:** Yes

**Response 200:**
```json
{
  "total": 10,
  "activos": 7,
  "inactivos": 2,
  "mantenimiento": 1
}
```

---

### PATCH /vehicles/:id/status
Change vehicle status.

**Auth required:** Yes

**Request body:**
```json
{ "status": "MANTENIMIENTO" }
```

---

## Drivers — `/drivers`

### POST /drivers
Create a driver record.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN  
**Plan limit enforced:** Yes

### GET /drivers
List company drivers (paginated).

### GET /drivers/:id
Get driver detail.

### PUT /drivers/:id
Update driver details.

### DELETE /drivers/:id
Delete a driver.

### GET /drivers/stats
Driver statistics.

**Response 200:**
```json
{
  "total": 5,
  "withActiveTrips": 2,
  "withExpiringLicense": 1
}
```

---

## Cargo — `/cargo`

### POST /cargo
Create a cargo request.

**Auth required:** Yes | **Roles:** DADOR, ADMIN

**Request body:**
```json
{
  "title": "Soja - 28 tn",
  "origin": "Rivera",
  "destination": "Puerto de Montevideo",
  "originLat": -30.9,
  "originLng": -55.5,
  "destLat": -34.9,
  "destLng": -56.2,
  "commodity": "Soja",
  "weightTons": 28,
  "loadDate": "2026-07-01T08:00:00Z",
  "deliveryDate": "2026-07-02T18:00:00Z"
}
```

**Response 201:** Created `Cargo`

---

### GET /cargo
List cargo requests.

**Auth required:** Yes  
**Note:** Non-ADMIN users always get cargo filtered by their JWT `companyId`. This filter cannot be overridden via query params.

**Response 200:** Paginated `Cargo[]`

---

### PATCH /cargo/:id
Update cargo details.

**Auth required:** Yes | **Roles:** DADOR, ADMIN  
**Note:** Ownership verified.

---

### DELETE /cargo/:id
Cancel/delete cargo.

**Auth required:** Yes | **Roles:** DADOR, ADMIN

---

### GET /cargo/marketplace
Public listing of PUBLICADO and COTIZANDO cargo available for quoting.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN

**Query params:** `origin`, `destination`, `commodity`, `page`, `limit`

**Response 200:** Paginated `Cargo[]` (status PUBLICADO or COTIZANDO only)

---

### GET /cargo/retorno
Return-trip cargo listings.

**Auth required:** Yes

**Response 200:** Paginated `Cargo[]`

---

## Trips — `/trips`

### GET /trips
List trips. Filtered automatically by JWT role:
- CHOFER: only trips where they are the assigned driver
- TRANSPORTISTA: only trips belonging to their company
- DADOR: only trips for their company's cargo
- ADMIN: all trips

**Auth required:** Yes

**Response 200:** Paginated `Trip[]`

---

### POST /trips
Create a trip (typically triggered by quote acceptance).

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN

**Request body:**
```json
{
  "cargoId": "uuid",
  "driverId": "uuid",
  "vehicleId": "uuid"
}
```

---

### PATCH /trips/:id/assign
Assign driver and vehicle to a trip.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN

**Request body:**
```json
{
  "driverId": "uuid",
  "vehicleId": "uuid"
}
```

---

### PATCH /trips/:id/status
Update trip status.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, CHOFER, ADMIN  
**Note:** DADOR is explicitly excluded. Ownership verified.

**Request body:**
```json
{
  "status": "EN_CAMINO_ORIGEN"
}
```

---

### PATCH /trips/:id/cancel
Cancel a trip.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, DADOR, ADMIN

---

### GET /trips/:id/eta
Get estimated time of arrival based on current GPS position.

**Auth required:** Yes

**Response 200:**
```json
{
  "etaMinutes": 95,
  "distanceKm": 140.5,
  "currentLat": -32.1,
  "currentLng": -54.8
}
```

---

### GET /trips/:id/events
Get timeline of all events for a trip.

**Auth required:** Yes

**Response 200:** `TripEvent[]`

---

### POST /trips/:id/events
Record a new trip event.

**Auth required:** Yes | **Roles:** CHOFER, TRANSPORTISTA, ADMIN

**Request body:**
```json
{
  "type": "LLEGADA_ORIGEN",
  "lat": -30.9,
  "lng": -55.5,
  "notes": "Llegué al acopio, esperando turno"
}
```

---

## Quotes — `/quotes`

### POST /quotes
Submit a quote for a cargo.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN

**Request body:**
```json
{
  "cargoId": "uuid",
  "price": 1500.00,
  "currency": "USD",
  "notes": "Incluye seguro de carga"
}
```

---

### GET /quotes/cargo/:id
List all quotes for a specific cargo.

**Auth required:** Yes | **Roles:** DADOR (ownership verified), ADMIN

**Response 200:** `Quote[]`

---

### GET /quotes/my
List own submitted quotes.

**Auth required:** Yes | **Roles:** TRANSPORTISTA

**Response 200:** Paginated `Quote[]`

---

### PATCH /quotes/:id/accept
Accept a quote. Triggers: cargo → ASIGNADO, other quotes → RECHAZADA, creates Trip.

**Auth required:** Yes | **Roles:** DADOR, ADMIN  
**Note:** Ownership verified via JWT `companyId` vs cargo's `companyId`.

---

### PATCH /quotes/:id/reject
Reject a quote.

**Auth required:** Yes | **Roles:** DADOR, ADMIN  
**Note:** Ownership verified.

---

### PATCH /quotes/:id/withdraw
Withdraw own pending quote.

**Auth required:** Yes | **Roles:** TRANSPORTISTA  
**Note:** Only PENDIENTE quotes can be withdrawn.

---

## Tracking — `/tracking`

### GET /tracking/vehicle/:id
Get last known position of a vehicle.

**Auth required:** Yes

**Response 200:**
```json
{
  "vehicleId": "uuid",
  "lat": -32.1,
  "lng": -54.8,
  "speed": 85.5,
  "heading": 180,
  "timestamp": "2026-06-12T10:30:00Z"
}
```

---

### GET /tracking/fleet
Get all current vehicle positions for the authenticated company.

**Auth required:** Yes

**Response 200:** `VehiclePosition[]` (latest per vehicle)

---

### GET /tracking/vehicle/:id/history
Get position history for a vehicle.

**Auth required:** Yes

**Query params:** `from` (ISO datetime), `to` (ISO datetime)

**Response 200:** `VehiclePosition[]`

---

### POST /tracking/traccar
Traccar webhook receiver. Called by Traccar server when GPS device sends position.

**Auth required:** TRACCAR_WEBHOOK_TOKEN in header/query  
**Note:** Not a user-facing endpoint. Secured by token, not JWT.

**Request body:** Traccar event payload with deviceId, lat, lng, speed, timestamp

---

## Alerts — `/alerts`

### GET /alerts
List alerts for authenticated user.

**Auth required:** Yes

**Response 200:** Paginated `Alert[]`

---

### GET /alerts/unread-count
Count of unread alerts.

**Auth required:** Yes

**Response 200:** `{ "count": 3 }`

---

### PATCH /alerts/:id/read
Mark a single alert as read.

**Auth required:** Yes

---

### PATCH /alerts/read-all
Mark all user's alerts as read.

**Auth required:** Yes

---

## Documents — `/documents`

### POST /documents
Upload/create a document record.

**Auth required:** Yes

**Request body:**
```json
{
  "type": "Seguro",
  "number": "POL-123456",
  "expiryDate": "2027-01-01T00:00:00Z",
  "vehicleId": "uuid",
  "fileUrl": "https://s3.../doc.pdf"
}
```

---

### GET /documents
List documents for authenticated company.

**Auth required:** Yes

**Response 200:** Paginated `Document[]`

---

### GET /documents/:id
Get document detail.

### PUT /documents/:id
Update document.

### DELETE /documents/:id
Delete document.

---

### GET /documents/expiring
Get documents expiring within a threshold.

**Auth required:** Yes

**Query params:** `days` (default: 30)

**Response 200:** `Document[]` expiring within `days` days

---

### GET /documents/check-expiries
Manually trigger expiry check (returns results without creating alerts).

**Auth required:** Yes | **Roles:** ADMIN

---

### POST /documents/generate-alerts
Enqueue a Bull job to generate document expiry alerts for all companies.

**Auth required:** Yes | **Roles:** ADMIN

---

## Billing — `/billing`

### GET /billing/invoices
List invoices for authenticated company.

**Auth required:** Yes

**Response 200:** Paginated `Invoice[]`

---

### GET /billing/invoices/summary
Aggregated billing summary.

**Auth required:** Yes

**Response 200:**
```json
{
  "totalPending": 3500.00,
  "totalPaid": 12000.00,
  "pendingCount": 2,
  "paidCount": 8
}
```

---

### PATCH /billing/invoices/:id/pay
Mark invoice as paid.

**Auth required:** Yes | **Roles:** ADMIN

---

### PATCH /billing/invoices/:id/cancel
Cancel invoice.

**Auth required:** Yes | **Roles:** ADMIN

---

## Subscriptions — `/subscriptions`

### GET /subscriptions/current
Get current subscription for the company.

**Auth required:** Yes

**Response 200:** `Subscription`

---

### GET /subscriptions/limits
Get plan limits and current usage.

**Auth required:** Yes

**Response 200:**
```json
{
  "plan": "PRO",
  "limits": { "vehicles": 10, "drivers": 20, "activeCargos": 50 },
  "usage": { "vehicles": 3, "drivers": 5, "activeCargos": 12 }
}
```

---

### GET /subscriptions/history
Subscription change history.

**Auth required:** Yes

**Response 200:** `Subscription[]` ordered by `createdAt` desc

---

### POST /subscriptions/activate
Activate a plan.

**Auth required:** Yes

**Request body:**
```json
{ "plan": "EMPRESA" }
```

---

### POST /subscriptions/cancel
Cancel current subscription.

**Auth required:** Yes

---

## Turnos — `/turnos`

### POST /turnos/slots
Create time slots.

**Auth required:** Yes

**Request body:**
```json
{
  "startTime": "2026-07-01T08:00:00Z",
  "endTime": "2026-07-01T09:00:00Z",
  "capacity": 4
}
```

---

### GET /turnos/slots
List available slots.

**Auth required:** Yes

**Query params:** `date`, `companyId`

---

### POST /turnos/book
Book a slot.

**Auth required:** Yes

**Request body:**
```json
{
  "slotId": "uuid",
  "tripId": "uuid"
}
```

---

### GET /turnos/my-bookings
List own bookings.

**Auth required:** Yes

---

### PATCH /turnos/book/:id/cancel
Cancel a booking.

**Auth required:** Yes

---

## Camiones — `/camiones`

### POST /camiones
Publish truck availability.

**Auth required:** Yes | **Roles:** TRANSPORTISTA, ADMIN

**Request body:**
```json
{
  "vehicleType": "CAMION",
  "availableFrom": "2026-07-01T00:00:00Z",
  "availableTo": "2026-07-05T23:59:59Z",
  "origin": "Rivera",
  "vehicleId": "uuid"
}
```

---

### GET /camiones/search
Search available trucks.

**Auth required:** Yes

**Query params:** `vehicleType`, `origin`, `from`, `to`

---

### GET /camiones/my-listings
Own availability listings.

**Auth required:** Yes | **Roles:** TRANSPORTISTA

---

### PATCH /camiones/:id/deactivate
Deactivate a listing.

**Auth required:** Yes

---

## Dashboard — `/dashboard`

### GET /dashboard/stats
Aggregate statistics for the authenticated user's context.

**Auth required:** Yes

**Response 200 (TRANSPORTISTA example):**
```json
{
  "activeTrips": 3,
  "completedTrips": 45,
  "totalRevenue": 85000.00,
  "activeVehicles": 7,
  "pendingQuotes": 2
}
```

---

### GET /dashboard/time-series
Time-series data for charts.

**Auth required:** Yes

**Query params:** `metric` (trips/revenue/quotes), `period` (7d/30d/90d)

**Response 200:**
```json
{
  "labels": ["2026-06-01", "2026-06-02", "..."],
  "values": [3, 5, 2, "..."]
}
```

---

## Ratings — `/ratings`

### POST /ratings
Submit a rating for a completed trip.

**Auth required:** Yes

**Request body:**
```json
{
  "tripId": "uuid",
  "ratedId": "uuid",
  "score": 5,
  "comment": "Excelente puntualidad"
}
```

---

### GET /ratings/user/:id
Ratings for a specific user.

**Auth required:** Yes

**Response 200:** `Rating[]`

---

### GET /ratings/trip/:id
Ratings for a specific trip.

**Auth required:** Yes

**Response 200:** `Rating[]`

---

### GET /ratings/has-rated
Check if current user has rated a specific trip.

**Auth required:** Yes

**Query params:** `tripId`

**Response 200:** `{ "hasRated": false }`

---

## Geofences — `/geofences`

### POST /geofences
Create a geofence.

**Auth required:** Yes

**Request body:**
```json
{
  "name": "Puerto de Montevideo",
  "type": "PUERTO",
  "lat": -34.9,
  "lng": -56.2,
  "radiusMeters": 500
}
```

### GET /geofences
List company geofences.

### GET /geofences/:id
Get geofence detail.

### PUT /geofences/:id
Update geofence.

### DELETE /geofences/:id
Delete geofence.

---

## Market — `/market`

### GET /market/granos
Current grain market prices.

**Auth required:** Yes

**Response 200:**
```json
{
  "soja": { "price": 420.50, "currency": "USD", "unit": "tn" },
  "maiz": { "price": 210.00, "currency": "USD", "unit": "tn" },
  "trigo": { "price": 280.00, "currency": "USD", "unit": "tn" },
  "updatedAt": "2026-06-12T09:00:00Z"
}
```

---

## WebSocket Events (Socket.io)

**Connection:** `ws://46.62.197.160:3001`  
**Authentication:** Pass JWT in `auth.token` on connect

### Events emitted by server

| Event | Payload | Description |
|---|---|---|
| `vehicle:position` | `{ vehicleId, lat, lng, speed, heading, timestamp }` | GPS position update |
| `trip:status` | `{ tripId, status, updatedAt }` | Trip status changed |
| `trip:event` | `{ tripId, type, lat, lng, notes, createdAt }` | New trip event |
| `alert:new` | `{ alertId, title, message, type }` | New alert for user |

---

## Error Responses

| Status | Meaning |
|---|---|
| 400 | Bad Request — validation error |
| 401 | Unauthorized — missing/invalid/blacklisted token |
| 403 | Forbidden — insufficient role or plan limit exceeded |
| 404 | Not Found — entity does not exist |
| 409 | Conflict — duplicate entry |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error |

**Error body format:**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```
