export type Role = 'ADMIN' | 'DADOR' | 'TRANSPORTISTA' | 'CHOFER';
export type PlanType = 'FREE' | 'PRO' | 'EMPRESA' | 'FLOTA';
export type VehicleType = 'CAMION' | 'ACOPLADO' | 'SEMIRREMOLQUE';
export type VehicleStatus = 'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO';
export type DocumentStatus = 'VIGENTE' | 'VENCIDO' | 'POR_VENCER';
export type CargoStatus = 'PENDIENTE' | 'PUBLICADO' | 'COTIZANDO' | 'ASIGNADO' | 'CANCELADO';
export type TripStatus =
  | 'PENDIENTE'
  | 'PUBLICADO'
  | 'COTIZANDO'
  | 'ASIGNADO'
  | 'EN_CAMINO_ORIGEN'
  | 'EN_CARGA'
  | 'EN_TRANSITO'
  | 'EN_DESCARGA'
  | 'FINALIZADO'
  | 'CANCELADO';
export type QuoteStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
export type InvoiceStatus = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';
export type InvoiceType = 'VIAJE' | 'COMISION' | 'SUSCRIPCION';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  language: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
  driverId?: string;
}

export interface Company {
  id: string;
  name: string;
  cuit: string;
  address?: string;
  country: string;
  planType: PlanType;
  isActive: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  type: VehicleType;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  capacityTons?: number;
  capacityM3?: number;
  status: VehicleStatus;
  createdAt: string;
  _count?: { trips: number };
}

export interface Driver {
  id: string;
  userId: string;
  companyId: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: string;
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'phone'>;
  _count?: { trips: number };
}

export interface Document {
  id: string;
  entityType: string;
  entityId: string;
  vehicleId?: string;
  driverId?: string;
  type: string;
  fileUrl: string;
  expiresAt?: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface Cargo {
  id: string;
  companyId: string;
  type: string;
  description?: string;
  weightTons?: number;
  volumeM3?: number;
  originAddress: string;
  originLat?: number;
  originLng?: number;
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  requiredDate?: string;
  estimatedValue?: number;
  observations?: string;
  isAuction: boolean;
  auctionEndsAt?: string;
  status: CargoStatus;
  createdAt: string;
  company?: Pick<Company, 'id' | 'name' | 'country'>;
  _count?: { quotes: number };
}

export type TripEventType = 'LLEGADA_ORIGEN' | 'SALIDA_ORIGEN' | 'LLEGADA_DESTINO' | 'SALIDA_DESTINO';

export interface TripEvent {
  id: string;
  tripId: string;
  type: TripEventType;
  timestamp: string;
  notes?: string;
}

export interface Trip {
  id: string;
  cargoId: string;
  vehicleId?: string;
  driverId?: string;
  transportCompanyId?: string;
  status: TripStatus;
  agreedRate?: number;
  commission?: number;
  commissionType?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  startedAt?: string;
  finishedAt?: string;
  canceledAt?: string;
  cancelReason?: string;
  createdAt: string;
  cargo?: Partial<Cargo>;
  vehicle?: Partial<Vehicle>;
  driver?: Partial<Driver>;
  events?: TripEvent[];
}

export interface Quote {
  id: string;
  cargoId: string;
  transportCompanyId: string;
  amount: number;
  notes?: string;
  status: QuoteStatus;
  createdAt: string;
  transportCompany?: Pick<Company, 'id' | 'name' | 'country'>;
}

export interface Alert {
  id: string;
  companyId: string;
  tripId?: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  tripId?: string;
  type: InvoiceType;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
}

export interface VehiclePosition {
  id?: string;
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  connectionStatus: string;
}

export interface DashboardKPIs {
  vehicles: { total: number; active: number };
  drivers: { total: number };
  trips: { active: number; completedThisMonth: number };
  cargo: { pending: number };
  alerts: { unread: number };
  revenue: { thisMonth: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
