export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
  driverId: string | null;
}

export enum TripStatus {
  ASIGNADO = 'ASIGNADO',
  EN_CAMINO_ORIGEN = 'EN_CAMINO_ORIGEN',
  EN_CARGA = 'EN_CARGA',
  EN_TRANSITO = 'EN_TRANSITO',
  EN_DESCARGA = 'EN_DESCARGA',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
}

export interface Trip {
  id: string;
  status: TripStatus;
  agreedRate: number;
  cargo: {
    type: string;
    originAddress: string;
    destinationAddress: string;
    weightTons: number;
  } | null;
  vehicle?: { plate: string };
  driver?: { user: { firstName: string; lastName: string } };
  startedAt?: string;
  finishedAt?: string;
}
