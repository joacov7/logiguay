# Security Audit — Logiguay

**Audit date:** 2026-06-12  
**Scope:** API (NestJS), Web (Next.js), Mobile (Expo), Infrastructure (Docker/Hetzner)

---

## Summary

| Category | Status | Critical Issues |
|---|---|---|
| Authentication | PASS | None |
| Authorization (RBAC) | PASS (after fix) | 1 fixed (BUG-003) |
| Data Isolation | PASS | None |
| Token Management | PASS | None |
| Rate Limiting | PASS | None |
| Input Validation | PARTIAL | NaN bug fixed; ongoing vigilance needed |
| Transport Security | REVIEW | TLS not configured in docker-compose (HTTP only) |
| Secret Management | PASS | All secrets in env vars |
| GPS Webhook | PASS | Token-secured |
| Dependency Security | NOT AUDITED | Dependency audit not performed |

---

## 1. Authentication

### 1.1 JWT Token Architecture

**Implementation:**
- Access tokens: signed with `JWT_SECRET`, expire in `JWT_EXPIRES_IN` (15 minutes)
- Refresh tokens: signed with `JWT_REFRESH_SECRET`, expire in `JWT_REFRESH_EXPIRES_IN` (7 days)
- Tokens include payload: `userId`, `role`, `companyId`

**Assessment: PASS**

The use of separate secrets for access and refresh tokens is correct practice. A compromised refresh token secret does not allow forging access tokens. The 15-minute access token window limits exposure if an access token is intercepted.

**Recommendations:**
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are at least 32 characters of random entropy
- Rotate secrets periodically; existing tokens will be invalidated on rotation

---

### 1.2 Token Blacklisting

**Implementation:**  
On logout (`POST /auth/logout`) and refresh rotation (`POST /auth/refresh`), the old refresh token is added to a Redis blacklist. The `JwtAuthGuard` checks the blacklist on every request.

**Assessment: PASS**

This correctly addresses the stateless JWT weakness: tokens can be revoked before expiry. The Redis key should have a TTL equal to the token's remaining expiry to avoid unbounded blacklist growth.

**Recommendations:**
- Verify Redis blacklist keys use TTL equal to token expiry (prevents Redis memory growth)
- Monitor Redis memory usage in production

---

### 1.3 Password Hashing

**Implementation:** Passwords are hashed with bcrypt (NestJS default via `@nestjs/passport`).

**Assessment: PASS**

bcrypt is appropriate. Ensure work factor is at least 10 (default in most NestJS setups).

---

## 2. Authorization (RBAC)

### 2.1 JwtAuthGuard

**Implementation:** Applied globally to all routes. Validates JWT signature, checks expiry, checks Redis blacklist.

**Assessment: PASS**

Global application ensures no endpoint is accidentally left unprotected.

---

### 2.2 RolesGuard

**Implementation:** `@Roles()` decorator + `RolesGuard` on role-sensitive routes.

**Fixed Issue (BUG-003):** The `PATCH /trips/:id/status` endpoint was missing the `@Roles(Role.TRANSPORTISTA, Role.CHOFER, Role.ADMIN)` decorator, allowing a DADOR to update trip status — a direct violation of business rules.

**Assessment: PASS (after fix)**

**Audit findings — verified correct role guards:**

| Endpoint | Required Roles | Verified |
|---|---|---|
| `POST /cargo` | DADOR, ADMIN | ✅ |
| `GET /cargo/marketplace` | TRANSPORTISTA, ADMIN | ✅ |
| `POST /quotes` | TRANSPORTISTA, ADMIN | ✅ |
| `PATCH /quotes/:id/accept` | DADOR, ADMIN | ✅ |
| `PATCH /trips/:id/status` | TRANSPORTISTA, CHOFER, ADMIN | ✅ (fixed) |
| `GET /users` | ADMIN | ✅ |
| `PATCH /billing/invoices/:id/pay` | ADMIN | ✅ |
| `POST /documents/generate-alerts` | ADMIN | ✅ |

**Recommendations:**
- Implement automated role-guard test coverage for all sensitive endpoints to prevent regression
- Add integration tests that verify DADOR cannot hit TRANSPORTISTA-only endpoints

---

### 2.3 PlanLimitGuard

**Implementation:** Guards resource-creation endpoints, verifying the company's active subscription has remaining capacity.

**Assessment: PASS**

Subscription enforcement at the guard level prevents bypass via direct API calls.

---

## 3. Data Isolation (Multi-tenancy)

### 3.1 Cargo Filtering

**Implementation:** `GET /cargo` — for non-ADMIN users, `companyId` is extracted from the JWT payload and used as the filter. There is no query parameter that can override this filter.

**Assessment: PASS**

This is the correct pattern. Accepting `companyId` as a query param would allow any authenticated user to enumerate other companies' cargo. The JWT extraction ensures server-side enforcement.

---

### 3.2 Trip Filtering

**Implementation:** `GET /trips` — filtering logic based on role from JWT:
- CHOFER: filtered by assigned `driverId`
- TRANSPORTISTA: filtered by `companyId`
- DADOR: filtered by `companyId` of the associated cargo
- ADMIN: no filter

**Assessment: PASS**

Role-based server-side filtering with no client override. Correct implementation.

---

### 3.3 Quote Ownership

**Implementation:** `PATCH /quotes/:id/accept` and `/reject` — verifies that the cargo's `companyId` matches the authenticated user's `companyId` from JWT.

**Assessment: PASS**

Prevents a DADOR from accepting/rejecting quotes on another company's cargo by directly calling the API with a known quote ID.

---

## 4. Rate Limiting

**Implementation:** NestJS Throttler with:
- Register endpoint: 5 requests per 60 seconds
- Login endpoint: 10 requests per 60 seconds
- Configured via `THROTTLE_TTL` and `THROTTLE_LIMIT` env vars

**Assessment: PASS**

Specific tighter limits on authentication endpoints are correct (brute-force mitigation). The global `THROTTLE_LIMIT` applies to other endpoints.

**Recommendations:**
- Consider IP-based rate limiting at the reverse proxy level (nginx/Caddy) for additional protection
- Set `THROTTLE_TTL=60` and `THROTTLE_LIMIT=100` as baseline for non-auth endpoints

---

## 5. Input Validation

### 5.1 NaN Pagination Bug (Fixed)

**Vulnerability:** Query params `page` and `limit` arrived as strings. Without explicit numeric casting, `(page - 1) * limit` evaluated to `NaN`, causing Prisma to crash with a type error. In some ORM configurations, `NaN` skip could cause full table scans or unexpected data exposure.

**Affected services:** Cargo, Trips, Quotes, Vehicles, Drivers, Documents, Alerts, Billing (8 total)

**Fix applied:** All 8 services now explicitly cast: `Number(page)`, `Number(limit)`.

**Assessment: PASS (after fix)**

**Recommendations:**
- Add NestJS `ParseIntPipe` on `@Query('page')` and `@Query('limit')` parameters in DTOs to enforce this at the framework level and provide consistent error messages:
  ```typescript
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) { ... }
  ```

---

### 5.2 DTO Validation

**Assessment:** NestJS with `class-validator` and `ValidationPipe` should be applied globally. Verify that `whitelist: true` and `forbidNonWhitelisted: true` are set on the global `ValidationPipe` to prevent mass assignment vulnerabilities.

**Recommendations:**
- Confirm global `ValidationPipe` configuration:
  ```typescript
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  ```

---

## 6. GPS Webhook Security

### 6.1 Traccar Webhook Authentication

**Implementation:** `POST /tracking/traccar` validates `TRACCAR_WEBHOOK_TOKEN` before processing. No JWT required (Traccar is a server-to-server call).

**Assessment: PASS**

**Recommendations:**
- Ensure the token is at least 32 random characters
- Consider IP allowlisting: only accept webhook calls from Traccar container's IP (within the Docker network, this is straightforward with firewall rules)

---

## 7. Transport Security

### 7.1 HTTPS / TLS

**Current state:** The docker-compose.yml exposes services on HTTP (ports 3000, 3001). There is no TLS termination configured.

**Assessment: REVIEW REQUIRED**

**Risk:** Without HTTPS, JWT tokens, passwords, and GPS coordinates are transmitted in plaintext over the network.

**Recommendations:**
- Deploy a reverse proxy (nginx or Caddy) in front of the `web` and `api` services
- Caddy is simplest: automatic TLS with Let's Encrypt
- Example Caddy config:
  ```
  logiguay.com {
    reverse_proxy web:3000
  }
  api.logiguay.com {
    reverse_proxy api:3001
  }
  ```
- Update `API_CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_WS_URL` to use `https://`
- Traccar web UI (port 8083) should not be publicly exposed; access via SSH tunnel or VPN

---

## 8. Secret Management

**Implementation:** All secrets (JWT keys, database passwords, Redis password, S3 keys, SMTP credentials, Traccar token) are stored in environment variables loaded from `.env` file.

**Assessment: PASS**

**Recommendations:**
- Ensure `.env` is in `.gitignore`
- Set restrictive file permissions: `chmod 600 .env`
- On the server, consider using Docker secrets or a vault solution (Vault by HashiCorp, or AWS Secrets Manager) for production hardening

---

## 9. Database Security

**Current configuration:**
- PostgreSQL 16 running in Docker
- Credentials via environment variables
- Port 5432 exposed in docker-compose (for development convenience)

**Recommendations:**
- Remove the `ports` mapping for `postgres` and `redis` from `docker-compose.yml` in production — they are only needed by internal services, not external traffic
- Access the database only via `docker compose exec` or from the API service within the Docker network

---

## 10. CORS Configuration

**Implementation:** `API_CORS_ORIGIN` environment variable controls allowed origins.

**Recommendations:**
- Set `API_CORS_ORIGIN` to the exact production URL (e.g., `https://logiguay.com`), not a wildcard (`*`)
- Verify that CORS is configured with `credentials: true` if cookies are ever used in the future

---

## 11. Dependency Vulnerabilities

**Status:** Not audited.

**Recommendations:**
- Run `npm audit` in both `api/` and `web/` directories
- Address any high or critical severity findings
- Consider `npm audit --production` to focus on runtime dependencies

---

## 12. Mobile App Security

**TanStack Query data accessor fix:** The bug where `res.data` was used instead of `res.data.data` could have exposed undefined behavior. Fixed.

**Token storage:** Expo mobile should use `expo-secure-store` for JWT token storage (not AsyncStorage, which is unencrypted).

**Recommendations:**
- Verify tokens are stored in `SecureStore`, not `AsyncStorage`
- Implement certificate pinning for the API connection in the mobile app for additional MITM protection

---

## Risk Matrix

| Risk | Likelihood | Impact | Residual Risk | Mitigation |
|---|---|---|---|---|
| DADOR updates trip status | Fixed | High | Low | @Roles guard added |
| NaN in Prisma (crash/scan) | Fixed | Medium | Low | Number() cast applied |
| HTTP interception (no TLS) | Medium | High | **HIGH** | Add HTTPS proxy |
| PostgreSQL port exposed | Low | High | Medium | Remove from docker ports |
| JWT brute force | Low | High | Low | Rate limiting applied |
| Traccar webhook spoofing | Low | Medium | Low | Token validation |
| Mobile token in AsyncStorage | Unknown | Medium | Unknown | Verify SecureStore usage |
