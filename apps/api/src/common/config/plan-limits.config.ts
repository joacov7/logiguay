export interface PlanLimits {
  maxVehicles: number;
  maxDrivers: number;
  maxActiveTrips: number;
  maxMonthlyPublications: number;
  canAccessMarketplace: boolean;
  canUsePremiumListings: boolean;
  canExportReports: boolean;
  /** @deprecated usar carrierCommissionRate. Se mantiene por compatibilidad. */
  commissionRate: number;
  /** % sobre el flete que paga el TRANSPORTISTA como comisión de plataforma. */
  carrierCommissionRate: number;
  /** % sobre el flete que paga el DADOR como comisión de plataforma. */
  shipperCommissionRate: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxVehicles: 3,
    maxDrivers: 3,
    maxActiveTrips: 5,
    maxMonthlyPublications: 10,
    canAccessMarketplace: true,
    canUsePremiumListings: false,
    canExportReports: false,
    commissionRate: 5,
    carrierCommissionRate: 5,
    shipperCommissionRate: 2,
  },
  PRO: {
    maxVehicles: 15,
    maxDrivers: 15,
    maxActiveTrips: 30,
    maxMonthlyPublications: 100,
    canAccessMarketplace: true,
    canUsePremiumListings: true,
    canExportReports: true,
    commissionRate: 4,
    carrierCommissionRate: 4,
    shipperCommissionRate: 1.5,
  },
  EMPRESA: {
    maxVehicles: 50,
    maxDrivers: 50,
    maxActiveTrips: 200,
    maxMonthlyPublications: 500,
    canAccessMarketplace: true,
    canUsePremiumListings: true,
    canExportReports: true,
    commissionRate: 3,
    carrierCommissionRate: 3,
    shipperCommissionRate: 1,
  },
  FLOTA: {
    maxVehicles: 999999,
    maxDrivers: 999999,
    maxActiveTrips: 999999,
    maxMonthlyPublications: 999999,
    canAccessMarketplace: true,
    canUsePremiumListings: true,
    canExportReports: true,
    commissionRate: 2,
    carrierCommissionRate: 2,
    shipperCommissionRate: 0.5,
  },
};
