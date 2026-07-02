# Requisitos del Sistema — Logiguay

## 1. Visión General del Producto

Logiguay es una plataforma de gestión logística agrícola que digitaliza el proceso de transporte de granos y cargas agropecuarias. El sistema conecta tres tipos de actores: **dadores de carga** (quienes necesitan transportar), **transportistas** (empresas de transporte con flotas) y **choferes** (operadores de vehículos). La plataforma cubre desde la publicación de una necesidad de carga hasta la calificación post-viaje.

---

## 2. Actores del Sistema

| Actor | Rol en el Sistema | Acciones Principales |
|---|---|---|
| Administrador | Gestión global de la plataforma | Gestionar empresas, usuarios, suscripciones, comisiones, configuración |
| Dador de Carga | Empresa/persona que necesita transportar | Publicar cargas, recibir cotizaciones, aprobar/rechazar, seguir viajes |
| Transportista | Empresa de transporte con flota | Cotizar cargas, gestionar viajes, flotas y choferes |
| Chofer | Operador de vehículo | Ejecutar viajes, reportar eventos, actualizar estados |

---

## 3. Requisitos Funcionales

### 3.1 Autenticación y Sesión

- **RF-001:** El sistema debe permitir el registro de nuevos usuarios con asignación de rol (ADMIN, DADOR, TRANSPORTISTA, CHOFER).
- **RF-002:** El sistema debe emitir un token de acceso JWT (duración 15 minutos) y un token de refresco (duración 7 días) al iniciar sesión.
- **RF-003:** El sistema debe soportar renovación de tokens sin re-login, con rotación del refresh token.
- **RF-004:** Al cerrar sesión, el token debe ser invalidado inmediatamente mediante blacklist en Redis.
- **RF-005:** El endpoint `GET /auth/me` debe retornar los datos del usuario autenticado basados en el JWT.

### 3.2 Gestión de Empresas y Usuarios

- **RF-006:** Cada usuario debe pertenecer a al menos una empresa (CompanyUser).
- **RF-007:** Una empresa puede tener múltiples sucursales (Branch).
- **RF-008:** El ADMIN puede ver y gestionar todas las empresas; otros roles solo ven su propia empresa.
- **RF-009:** Los dispositivos móviles deben poder registrar su push token para notificaciones (`POST /users/push-token`).

### 3.3 Gestión de Vehículos

- **RF-010:** Un transportista puede registrar vehículos de tipo CAMION, ACOPLADO o SEMIRREMOLQUE.
- **RF-011:** Cada vehículo tiene un estado: ACTIVO, INACTIVO o MANTENIMIENTO.
- **RF-012:** El sistema debe proveer estadísticas de flota por empresa.

### 3.4 Gestión de Choferes

- **RF-013:** Un transportista puede registrar choferes y asignarlos a viajes.
- **RF-014:** El sistema debe proveer estadísticas de choferes por empresa.

### 3.5 Ciclo de Vida de Carga

- **RF-015:** Un DADOR puede crear una solicitud de carga con origen, destino, tipo de mercadería, peso y fechas.
- **RF-016:** Una carga puede tener los estados: PENDIENTE, PUBLICADO, COTIZANDO, ASIGNADO, CANCELADO.
- **RF-017:** Las cargas en estado PUBLICADO deben aparecer en el marketplace accesible a transportistas.
- **RF-018:** Solo el transportista asignado puede ver cargas en estado ASIGNADO que no le pertenecen.
- **RF-019:** El endpoint `GET /cargo/retorno` debe mostrar cargas de retorno disponibles.
- **RF-020:** Un DADOR no puede crear viajes; un TRANSPORTISTA no puede crear cargas.

### 3.6 Ciclo de Vida de Cotizaciones

- **RF-021:** Un transportista puede enviar una cotización para cualquier carga en estado PUBLICADO o COTIZANDO.
- **RF-022:** Un DADOR puede aceptar o rechazar cotizaciones solo para cargas de su propia empresa.
- **RF-023:** Al aceptar una cotización, el sistema debe crear automáticamente un viaje y cambiar el estado de la carga a ASIGNADO.
- **RF-024:** Un transportista puede retirar su cotización si aún está en estado PENDIENTE.
- **RF-025:** La verificación de ownership en aceptar/rechazar cotizaciones debe basarse en el JWT companyId, no en parámetros de query.

### 3.7 Ciclo de Vida de Viajes

- **RF-026:** Los estados de un viaje son: PENDIENTE → PUBLICADO → COTIZANDO → ASIGNADO → EN_CAMINO_ORIGEN → EN_CARGA → EN_TRANSITO → EN_DESCARGA → FINALIZADO (con CANCELADO como estado terminal alternativo).
- **RF-027:** Solo TRANSPORTISTA, CHOFER y ADMIN pueden actualizar el estado de un viaje.
- **RF-028:** El filtrado de viajes en `GET /trips` debe basarse en el rol del JWT; no debe ser posible sobreescribir con query params.
- **RF-029:** El sistema debe soportar el registro de eventos de viaje: LLEGADA_ORIGEN, SALIDA_ORIGEN, LLEGADA_DESTINO, SALIDA_DESTINO, DESVIO, PERDIDA_SENAL, DEMORA.
- **RF-030:** El sistema debe calcular el ETA basado en la posición GPS actual del vehículo asignado.

### 3.8 Tracking GPS

- **RF-031:** El sistema debe recibir posiciones GPS vía webhook de Traccar (`POST /tracking/traccar`), protegido por TRACCAR_WEBHOOK_TOKEN.
- **RF-032:** Las posiciones deben ser almacenadas en VehiclePosition con timestamp, latitud, longitud y velocidad.
- **RF-033:** Las actualizaciones de posición deben ser retransmitidas en tiempo real vía Socket.io a los clientes suscritos.
- **RF-034:** El historial de posiciones debe ser consultable por vehículo y rango de tiempo.
- **RF-035:** El sistema debe soportar visualización de toda la flota en un único mapa (`GET /tracking/fleet`).

### 3.9 Geofences

- **RF-036:** El sistema debe permitir definir zonas geográficas de tipo: ORIGEN, DESTINO, PLANTA, ACOPIO, PUERTO, CLIENTE.
- **RF-037:** Los geofences deben ser gestionables via CRUD completo.

### 3.10 Documentos y Alertas

- **RF-038:** El sistema debe gestionar documentos asociados a vehículos, choferes y empresas.
- **RF-039:** El sistema debe detectar documentos próximos a vencer y generar alertas automáticamente (Bull queue).
- **RF-040:** Los usuarios deben poder consultar alertas no leídas y marcarlas como leídas individualmente o en bloque.

### 3.11 Facturación

- **RF-041:** El sistema debe generar facturas de tipo VIAJE, COMISION y SUSCRIPCION.
- **RF-042:** Los estados de factura son: PENDIENTE, PAGADA, CANCELADA.
- **RF-043:** Debe existir una vista de resumen consolidado de facturación por empresa.

### 3.12 Suscripciones y Límites

- **RF-044:** Los planes disponibles son: FREE, PRO, EMPRESA, FLOTA.
- **RF-045:** Cada plan tiene límites que el sistema debe hacer cumplir mediante PlanLimitGuard.
- **RF-046:** Los estados de suscripción son: ACTIVA, CANCELADA, VENCIDA, TRIAL.
- **RF-047:** Debe existir historial de cambios de suscripción por empresa.

### 3.13 Turnos

- **RF-048:** El sistema debe permitir la creación y gestión de slots de tiempo para turnos de carga/descarga.
- **RF-049:** Los usuarios deben poder reservar y cancelar turnos.

### 3.14 Camiones Disponibles

- **RF-050:** Los transportistas pueden publicar disponibilidad de camiones para matcheo con cargas.
- **RF-051:** El sistema debe permitir búsqueda de camiones disponibles por criterios geográficos y de tipo.

### 3.15 Dashboard y Reportes

- **RF-052:** El dashboard debe proveer estadísticas agregadas por rol/empresa.
- **RF-053:** El sistema debe proveer series temporales de datos para visualización en gráficos (Recharts).

### 3.16 Calificaciones

- **RF-054:** Tras completar un viaje, los participantes pueden calificar al otro.
- **RF-055:** El sistema debe impedir calificaciones duplicadas (verificación `has-rated`).

### 3.17 Mercado de Granos

- **RF-056:** El sistema debe proveer precios de mercado de granos actualizados (`GET /market/granos`).

---

## 4. Requisitos No Funcionales

### 4.1 Seguridad

- **RNF-001:** Todos los endpoints deben requerir autenticación JWT, excepto los de login y registro.
- **RNF-002:** El control de acceso basado en roles (RBAC) debe aplicarse a nivel de guard en NestJS.
- **RNF-003:** Los tokens de refresco revocados deben ser inaccesibles de forma inmediata (blacklist Redis).
- **RNF-004:** El registro debe estar limitado a 5 solicitudes por 60 segundos; el login a 10 por 60 segundos (throttling).
- **RNF-005:** Las credenciales de base de datos, JWT secrets y API keys nunca deben estar hardcodeadas; deben usarse variables de entorno.

### 4.2 Rendimiento

- **RNF-006:** La API debe responder en menos de 500ms para consultas paginadas estándar.
- **RNF-007:** El broker de colas Bull debe gestionar el procesamiento asíncrono de alertas para no bloquear el event loop.
- **RNF-008:** Las actualizaciones de posición GPS deben llegar al cliente web/móvil en menos de 3 segundos vía WebSocket.

### 4.3 Escalabilidad

- **RNF-009:** La arquitectura modular de NestJS debe permitir escalar módulos individualmente.
- **RNF-010:** El servidor Hetzner CX23 (4GB RAM) debe soportar la carga operativa inicial.

### 4.4 Disponibilidad

- **RNF-011:** El sistema debe estar desplegado en Docker Compose, permitiendo reinicios automáticos de contenedores.

### 4.5 Internacionalización

- **RNF-012:** La aplicación web debe soportar múltiples idiomas mediante next-intl.

---

## 5. Variables de Entorno Requeridas

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `REDIS_URL` | URL de conexión a Redis |
| `REDIS_PASSWORD` | Contraseña de Redis |
| `JWT_SECRET` | Secreto para access tokens |
| `JWT_EXPIRES_IN` | Expiración access token (15m) |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh token (7d) |
| `API_PORT` | Puerto de la API (3001) |
| `API_CORS_ORIGIN` | Origen permitido para CORS |
| `NEXT_PUBLIC_API_URL` | URL pública de la API para el cliente web |
| `NEXT_PUBLIC_WS_URL` | URL pública del WebSocket |
| `TRACCAR_WEBHOOK_TOKEN` | Token de autenticación del webhook de Traccar |
| `S3_BUCKET` | Nombre del bucket S3 para documentos |
| `S3_REGION` | Región S3 |
| `S3_ACCESS_KEY` | Access key S3 |
| `S3_SECRET_KEY` | Secret key S3 |
| `S3_ENDPOINT` | Endpoint S3 (para compatibles como MinIO) |
| `SMTP_HOST` | Host del servidor SMTP |
| `SMTP_PORT` | Puerto SMTP |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_FROM` | Dirección de remitente de emails |
| `THROTTLE_TTL` | Ventana de tiempo para rate limiting |
| `THROTTLE_LIMIT` | Máximo de requests en la ventana |
