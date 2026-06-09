# LOGIGUAY

Plataforma profesional de logística para gestión de cargas, flotas y transportistas en Latinoamérica.

## Requisitos

- Node.js 20+
- Docker y Docker Compose

## Setup rápido

1. Clonar el repo y copiar variables de entorno:
   ```bash
   cp .env.example .env
   ```

2. Levantar base de datos y Redis:
   ```bash
   docker compose up -d
   ```

3. Instalar dependencias:
   ```bash
   npm install
   ```

4. Correr migraciones y seed:
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   npm run seed
   ```

5. Levantar en desarrollo:
   ```bash
   cd ../..
   npm run dev
   ```

6. Acceder a:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001/api/v1
   - Swagger: http://localhost:3001/api/docs
   - pgAdmin: http://localhost:5050

## Usuario de prueba (después del seed)

| Rol           | Email                         | Contraseña |
|---------------|-------------------------------|------------|
| Admin         | admin@logiguay.com            | Admin123!  |
| Dador         | dador@logiguay.com            | Test123!   |
| Transportista | transportista@logiguay.com    | Test123!   |

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript + Prisma + PostgreSQL + Redis |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Infraestructura | Docker Compose |
| Monorepo | Turborepo + npm workspaces |

## Estructura del Proyecto

```
logiguay/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── docker-compose.yml
├── .env.example
├── turbo.json
└── package.json
```

## Módulos del Sistema

- **Autenticación** — JWT con refresh tokens, roles (ADMIN, DADOR, TRANSPORTISTA, CHOFER)
- **Empresas** — Multi-tenant con planes de suscripción
- **Cargas** — Publicación y gestión del ciclo de vida
- **Viajes** — Gestión completa de trips con estados
- **Flota** — Vehículos y documentación
- **Choferes** — Gestión y habilitaciones
- **Tracking** — GPS en tiempo real vía WebSockets
- **Geocercas** — Alertas geográficas automáticas
- **Cotizaciones** — Sistema de ofertas para la bolsa de cargas
- **Facturación** — Comisiones e invoices
- **Suscripciones** — Planes FREE / PRO / EMPRESA / FLOTA

## Licencia

MIT
