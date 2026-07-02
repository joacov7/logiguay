# Architecture — Logiguay

## System Overview

Logiguay is a multi-tier logistics platform composed of three main applications (API, Web, Mobile) backed by PostgreSQL and Redis, with an integrated GPS tracking pipeline through Traccar.

```mermaid
graph TB
    subgraph Clients
        WEB[Next.js 14 Web App<br/>Port 3000]
        MOB[Expo Mobile App<br/>React Native 0.81.4]
        GPS[West A10 GPS Device<br/>IMEI: 861768070650148]
    end

    subgraph Docker Compose - Hetzner CX23 46.62.197.160
        API[NestJS 10 API<br/>Port 3001]
        TRACCAR[Traccar Server<br/>8083 Web / 5023 GT06]
        PG[(PostgreSQL 16<br/>Port 5432)]
        RD[(Redis 7<br/>Port 6379)]
    end

    WEB -- HTTP/REST + WebSocket --> API
    MOB -- HTTP/REST --> API
    GPS -- GT06 TCP --> TRACCAR
    TRACCAR -- Webhook HTTP --> API
    API -- Prisma ORM --> PG
    API -- ioredis / Bull --> RD
    API -- WebSocket broadcast --> WEB
    API -- WebSocket broadcast --> MOB
```

---

## Technology Stack

### API — Backend

| Technology | Version | Role |
|---|---|---|
| NestJS | 10 | Application framework, DI, modules |
| Prisma | 5 | ORM, migrations, type-safe queries |
| PostgreSQL | 16 | Primary relational database |
| Redis | 7 | JWT blacklist, Bull queue broker |
| Socket.io | 4 | Real-time WebSocket events |
| Bull | latest | Async job queues (alerts, notifications) |
| Node.js | (LTS) | Runtime |

### Web — Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js | 14 | React framework, SSR/SSG, routing |
| React | 18 | UI library |
| next-intl | latest | Internationalization |
| TanStack Query | latest | Server state management |
| Leaflet | latest | Interactive maps |
| Recharts | latest | Data visualization charts |
| Tailwind CSS | latest | Utility-first styling |

### Mobile — App

| Technology | Version | Role |
|---|---|---|
| Expo SDK | 54 | React Native toolchain |
| React Native | 0.81.4 | Mobile UI framework |
| React | 19.1.0 | UI library |
| expo-router | 6 | File-based navigation |
| TanStack Query | latest | Server state management |

### Infrastructure

| Component | Technology | Details |
|---|---|---|
| Server | Hetzner VPS CX23 | 4GB RAM, IP 46.62.197.160 |
| Containerization | Docker + docker-compose | All services containerized |
| GPS middleware | Traccar | GT06 protocol, webhook to API |

---

## Module Architecture (NestJS API)

```mermaid
graph LR
    subgraph Guards
        JWT[JwtAuthGuard]
        ROLES[RolesGuard]
        PLAN[PlanLimitGuard]
        THROTTLE[ThrottleGuard]
    end

    subgraph Core Modules
        AUTH[Auth Module]
        USERS[Users Module]
        COMP[Companies Module]
    end

    subgraph Business Modules
        CARGO[Cargo Module]
        TRIPS[Trips Module]
        QUOTES[Quotes Module]
        TRACK[Tracking Module]
        DOCS[Documents Module]
        ALERTS[Alerts Module]
    end

    subgraph Fleet Modules
        VEH[Vehicles Module]
        DRV[Drivers Module]
        GEO[Geofences Module]
    end

    subgraph Financial Modules
        BILL[Billing Module]
        SUBS[Subscriptions Module]
        RATE[Ratings Module]
    end

    subgraph Marketplace Modules
        TURNOS[Turnos Module]
        CAMIONES[Camiones Module]
        MARKET[Market Module]
    end

    subgraph Analytics
        DASH[Dashboard Module]
    end

    JWT --> AUTH
    JWT --> USERS
    JWT --> CARGO
    JWT --> TRIPS
    JWT --> QUOTES
    ROLES --> TRIPS
    ROLES --> CARGO
    ROLES --> QUOTES
    PLAN --> CARGO
    PLAN --> VEH
    THROTTLE --> AUTH
```

---

## Database Architecture

The data model is centered on the **Company** entity, with most business objects linked to a company. Key relationships:

```mermaid
erDiagram
    User ||--o{ CompanyUser : "belongs to"
    Company ||--o{ CompanyUser : "has members"
    Company ||--o{ Branch : "has"
    Company ||--o{ Vehicle : "owns"
    Company ||--o{ Driver : "employs"
    Company ||--o{ Cargo : "creates"
    Company ||--o{ Subscription : "subscribes"
    Company ||--o{ Invoice : "billed"
    Cargo ||--o{ Quote : "receives"
    Cargo ||--|| Trip : "becomes"
    Trip ||--o{ TripEvent : "logs"
    Trip ||--o{ Rating : "rated by"
    Vehicle ||--o{ VehiclePosition : "tracked by"
    Vehicle ||--o{ Document : "has"
    Driver ||--o{ Document : "has"
    User ||--o{ Alert : "receives"
    Company ||--o{ GeoFence : "defines"
    Company ||--o{ TurnSlot : "creates"
    TurnSlot ||--o{ TurnBooking : "booked as"
    Company ||--o{ TruckAvailability : "publishes"
    User ||--o{ AuditLog : "audited"
```

---

## GPS Tracking Pipeline

```mermaid
sequenceDiagram
    participant GPS as West A10 Device
    participant TC as Traccar (port 5023)
    participant API as NestJS API
    participant DB as PostgreSQL
    participant WS as Socket.io
    participant CLI as Web/Mobile Client

    GPS->>TC: GT06 TCP packet (lat, lng, speed, IMEI)
    TC->>TC: Parse GT06 protocol
    TC->>API: POST /tracking/traccar (webhook + token)
    API->>API: Validate TRACCAR_WEBHOOK_TOKEN
    API->>DB: INSERT VehiclePosition
    API->>WS: emit('vehicle:position', {vehicleId, lat, lng, speed})
    WS->>CLI: Real-time position update
    CLI->>CLI: Update Leaflet map marker
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NestJS API
    participant RD as Redis
    participant DB as PostgreSQL

    C->>API: POST /auth/login (email, password)
    API->>DB: Find user, verify bcrypt password
    API->>API: Sign accessToken (15m) + refreshToken (7d)
    API->>C: { accessToken, refreshToken }

    Note over C,API: Subsequent requests
    C->>API: GET /trips (Authorization: Bearer accessToken)
    API->>RD: Check token in blacklist
    API->>API: Verify JWT signature + expiry
    API->>C: 200 OK with data

    Note over C,API: Token refresh
    C->>API: POST /auth/refresh (refreshToken)
    API->>RD: Check refreshToken in blacklist
    API->>RD: Blacklist old refreshToken
    API->>API: Sign new accessToken + refreshToken
    API->>C: { accessToken, refreshToken }

    Note over C,API: Logout
    C->>API: POST /auth/logout (refreshToken)
    API->>RD: Add refreshToken to blacklist
    API->>C: 200 OK
```

---

## Request Lifecycle (with Guards)

```mermaid
flowchart TD
    REQ[Incoming HTTP Request] --> THROTTLE{ThrottleGuard}
    THROTTLE -- too many requests --> 429[429 Too Many Requests]
    THROTTLE -- OK --> JWT{JwtAuthGuard}
    JWT -- invalid/missing token --> 401[401 Unauthorized]
    JWT -- token in blacklist --> 401
    JWT -- OK --> ROLES{RolesGuard}
    ROLES -- insufficient role --> 403[403 Forbidden]
    ROLES -- OK --> PLAN{PlanLimitGuard}
    PLAN -- limit exceeded --> 403[403 Plan Limit Exceeded]
    PLAN -- OK --> HANDLER[Route Handler]
    HANDLER --> SVC[Service Layer]
    SVC --> PRISMA[Prisma Client]
    PRISMA --> PG[(PostgreSQL)]
    PG --> SVC
    SVC --> HANDLER
    HANDLER --> 200[200 OK + Response]
```

---

## Real-time Architecture (Socket.io)

The API maintains a Socket.io server alongside the HTTP server. Clients connect with their JWT token and join rooms based on company/trip/vehicle.

Events emitted by the API:
- `vehicle:position` — GPS position update for a specific vehicle
- `trip:status` — Trip status change
- `trip:event` — New trip event recorded
- `alert:new` — New alert for the user

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Hetzner CX23 - 46.62.197.160
        subgraph docker-compose
            PG[postgres:16<br/>Port 5432]
            RD[redis:7<br/>Port 6379]
            API[api<br/>Port 3001<br/>NestJS multistage]
            WEB[web<br/>Port 3000<br/>Next.js standalone]
            TC[traccar<br/>8083 + 5023]
        end
        API --> PG
        API --> RD
        API --> TC
        WEB --> API
    end

    INTERNET((Internet)) --> WEB
    INTERNET --> API
    GPS_DEV[GPS Device] --> TC
```

### Docker Build Notes

**API Dockerfile (multistage):**
1. Builder stage: install deps, run `prisma generate`, compile TypeScript
2. Production stage: copy compiled output + generated Prisma client, run with Node

**Web Dockerfile (multistage):**
1. Builder stage: accepts `NEXT_PUBLIC_*` as build args (required for client-side embedding), runs `next build`
2. Production stage: copies `standalone` output directory, runs with Node
