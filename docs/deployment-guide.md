# Deployment Guide — Logiguay

## Infrastructure Overview

| Component | Host | Details |
|---|---|---|
| Server | Hetzner VPS CX23 | 4GB RAM, 4 vCPU, 40GB SSD |
| IP | 46.62.197.160 | Public IPv4 |
| OS | Linux | |
| Deployment | Docker Compose | All services containerized |
| Working directory | `/home/user/logiguay` | |

---

## Services

| Service | Image | Port(s) | Description |
|---|---|---|---|
| `postgres` | postgres:16 | 5432 | Primary database |
| `redis` | redis:7 | 6379 | Cache + queue broker |
| `api` | Custom (multistage) | 3001 | NestJS REST API + WebSocket |
| `web` | Custom (multistage) | 3000 | Next.js web frontend |
| `traccar` | traccar/traccar | 8083, 5023 | GPS server |

---

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- Git
- Access to the Hetzner server (SSH)

---

## Environment Configuration

Create a `.env` file in `/home/user/logiguay` (project root) before starting services:

```bash
# Database
DATABASE_URL=postgresql://logiguay:PASSWORD@postgres:5432/logiguay

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# API
API_PORT=3001
API_CORS_ORIGIN=http://46.62.197.160:3000

# Web (Next.js build args — must be set at build time)
NEXT_PUBLIC_API_URL=http://46.62.197.160:3001
NEXT_PUBLIC_WS_URL=http://46.62.197.160:3001

# Traccar
TRACCAR_WEBHOOK_TOKEN=your_traccar_webhook_token

# S3 (for document storage)
S3_BUCKET=logiguay-docs
S3_REGION=us-east-1
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_ENDPOINT=https://s3.amazonaws.com

# SMTP (for email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@logiguay.com
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@logiguay.com

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

> **Security note:** Never commit `.env` to version control. Add it to `.gitignore`.

---

## Docker Compose Configuration

The `docker-compose.yml` defines all services with proper dependency ordering:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: logiguay
      POSTGRES_USER: logiguay
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  api:
    build:
      context: .
      dockerfile: api/Dockerfile
    ports:
      - "3001:3001"
    env_file: .env
    depends_on:
      - postgres
      - redis

  web:
    build:
      context: .
      dockerfile: web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
        NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - api

  traccar:
    image: traccar/traccar:latest
    ports:
      - "8083:8083"   # Traccar web UI
      - "5023:5023"   # GT06 GPS protocol (West A10 device)
    volumes:
      - traccar_data:/opt/traccar/data
      - ./traccar/traccar.xml:/opt/traccar/conf/traccar.xml
```

---

## API Dockerfile (Multistage)

The API uses a multistage Docker build:

**Stage 1 — Builder:**
1. Uses Node.js LTS as base
2. Copies `package.json` and installs all dependencies (including devDependencies)
3. Copies Prisma schema
4. Runs `prisma generate` to generate the Prisma Client in the builder stage
5. Copies source code
6. Runs `tsc` (TypeScript compilation) → outputs to `dist/`

**Stage 2 — Production:**
1. Uses Node.js LTS slim as base
2. Copies `dist/` from builder
3. Copies `node_modules/` (production only) from builder
4. Copies generated Prisma client from builder
5. Exposes port 3001
6. Runs: `node dist/main.js`

**Build context:** Repository root (not `api/` subdirectory) — allows access to shared types if needed.

---

## Web Dockerfile (Multistage)

The web app requires special handling for Next.js public env vars:

**Stage 1 — Builder:**
1. Uses Node.js LTS as base
2. Declares `ARG NEXT_PUBLIC_API_URL` and `ARG NEXT_PUBLIC_WS_URL`
3. Sets them as `ENV` (required for Next.js to embed them at build time)
4. Copies `package.json`, installs dependencies
5. Copies source code
6. Runs `next build` → generates `.next/standalone/` output

**Stage 2 — Production:**
1. Uses Node.js LTS slim as base
2. Copies `.next/standalone/` from builder
3. Copies `.next/static/` into the standalone directory
4. Copies `public/` into the standalone directory
5. Exposes port 3000
6. Runs: `node server.js`

> **Important:** `NEXT_PUBLIC_*` variables must be passed as `--build-arg` at Docker build time because Next.js embeds them into the JavaScript bundle during compilation. Setting them as runtime environment variables does NOT work.

---

## First-Time Deployment

### Step 1: Clone the repository

```bash
ssh user@46.62.197.160
cd /home/user
git clone <repository-url> logiguay
cd logiguay
```

### Step 2: Create environment file

```bash
cp .env.example .env
nano .env   # Fill in all required values
```

### Step 3: Build and start services

```bash
docker compose up -d --build
```

This will:
1. Pull postgres:16 and redis:7 images
2. Build the `api` image (runs `prisma generate` + TypeScript compile)
3. Build the `web` image (runs `next build` with public env vars)
4. Pull traccar image
5. Start all containers

### Step 4: Run database migrations

```bash
docker compose exec api npx prisma migrate deploy
```

### Step 5: (Optional) Seed initial data

```bash
docker compose exec api npx prisma db seed
```

### Step 6: Verify services

```bash
# Check all containers are running
docker compose ps

# Check API health
curl http://localhost:3001/health

# Check web
curl http://localhost:3000

# Check Traccar web UI
curl http://localhost:8083
```

---

## Subsequent Deployments

```bash
cd /home/user/logiguay

# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime: bring up new then stop old)
docker compose up -d --build --no-deps api web

# If there are new migrations:
docker compose exec api npx prisma migrate deploy
```

---

## Traccar Configuration

Traccar must be configured to forward GPS positions to the API webhook.

Create `traccar/traccar.xml`:

```xml
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>
  <entry key='database.driver'>org.h2.Driver</entry>
  <entry key='database.url'>jdbc:h2:/opt/traccar/data/database</entry>
  
  <!-- Webhook to Logiguay API -->
  <entry key='event.forward.enable'>true</entry>
  <entry key='event.forward.url'>http://api:3001/tracking/traccar</entry>
  <entry key='event.forward.header'>X-Traccar-Token: YOUR_TRACCAR_WEBHOOK_TOKEN</entry>
  
  <!-- GT06 protocol port for West A10 device -->
  <entry key='gt06.port'>5023</entry>
</properties>
```

### GPS Device Setup (West A10)

- **IMEI:** 861768070650148
- **Protocol:** GT06
- **Server IP:** 46.62.197.160
- **Server Port:** 5023
- Configure the device to send to `46.62.197.160:5023` using GT06 protocol

---

## Monitoring and Logs

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f traccar

# Last 100 lines
docker compose logs --tail=100 api
```

### Container status

```bash
docker compose ps
docker stats
```

### Database access

```bash
docker compose exec postgres psql -U logiguay -d logiguay
```

### Redis access

```bash
docker compose exec redis redis-cli -a YOUR_REDIS_PASSWORD
```

---

## Backup

### Database backup

```bash
docker compose exec postgres pg_dump -U logiguay logiguay > backup_$(date +%Y%m%d).sql
```

### Restore database

```bash
cat backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U logiguay -d logiguay
```

---

## Troubleshooting

### API fails to start — Prisma client not found

**Cause:** The Prisma client was not generated during the Docker build.

**Fix:** Ensure the API Dockerfile runs `npx prisma generate` in the builder stage before compilation. Rebuild the image:
```bash
docker compose build --no-cache api
```

### Web shows wrong API URL

**Cause:** `NEXT_PUBLIC_*` variables were not passed as build args.

**Fix:** These must be set in the environment BEFORE running `docker compose build`. They are baked into the JS bundle at build time and cannot be changed at runtime.

### Traccar not receiving GPS data

**Check:**
1. Port 5023 is open: `ss -tlnp | grep 5023`
2. West A10 device is configured with IP `46.62.197.160` and port `5023`
3. Traccar container is running: `docker compose ps traccar`
4. Traccar logs: `docker compose logs traccar`

### NaN in Prisma queries

**Symptom:** API returns 500 errors on paginated endpoints.

**Cause:** `page` or `limit` query params are strings, not numbers.

**Fix:** This has been patched in all 8 services. Each service explicitly calls `Number(page)` and `Number(limit)` before using in Prisma `skip`/`take`. If new services are added, apply the same pattern.

### Redis connection refused

**Check:**
1. Redis container is running: `docker compose ps redis`
2. `REDIS_URL` in `.env` uses service name `redis` (not `localhost`) for inter-container communication
3. `REDIS_PASSWORD` matches the redis container configuration
