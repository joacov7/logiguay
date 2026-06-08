# LOGIGUAY

Plataforma profesional de logística para gestión de cargas, flotas y transportistas en Latinoamérica.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript + Prisma + PostgreSQL + Redis |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Mobile | React Native / Expo |
| Infraestructura | Docker Compose |
| Monorepo | Turborepo + npm workspaces |

## Estructura del Proyecto

```
logiguay/
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/          # Next.js frontend
│   └── mobile/       # Expo mobile app
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Inicio Rápido

### Prerrequisitos
- Node.js >= 18
- npm >= 9
- Docker + Docker Compose

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/your-org/logiguay.git
cd logiguay

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Levantar servicios de infraestructura
npm run docker:up

# Ejecutar migraciones
npm run db:migrate

# Iniciar en desarrollo
npm run dev
```

### URLs en Desarrollo

| Servicio | URL |
|---------|-----|
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/api |
| Web | http://localhost:3000 |
| PgAdmin | http://localhost:5050 |

## Módulos del Sistema

- **Autenticación** - JWT con refresh tokens, roles (ADMIN, DADOR, TRANSPORTISTA, CHOFER)
- **Empresas** - Multi-tenant con planes de suscripción
- **Cargas** - Publicación y gestión del ciclo de vida
- **Viajes** - Gestión completa de trips con estados
- **Flota** - Vehículos y documentación
- **Choferes** - Gestión y habilitaciones
- **Tracking** - GPS en tiempo real vía WebSockets
- **Geocercas** - Alertas geográficas automáticas
- **Cotizaciones** - Sistema de ofertas para la bolsa de cargas
- **Facturación** - Comisiones e invoices
- **Suscripciones** - Planes FREE / PRO / EMPRESA / FLOTA

## Licencia

MIT
