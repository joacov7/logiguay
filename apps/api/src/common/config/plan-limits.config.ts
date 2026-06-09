export interface PlanLimits {
  maxVehicles: number;
  maxDrivers: number;
  maxActiveTrips: number;
  maxMonthlyPublications: number;
  canAccessMarketplace: boolean;
  canUsePremiumListings: boolean;
  canExportReports: boolean;
  commissionRate: number;
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
    commissionRate: 3.5,
  },
  PRO: {
    maxVehicles: 15,
    maxDrivers: 15,
    maxActiveTrips: 30,
    maxMonthlyPublications: 100,
    canAccessMarketplace: true,
    canUsePremiumListings: true,
    canExportReports: true,
    commissionRate: 2.5,
  },
  EMPRESA: {
    maxVehicles: 50,
    maxDrivers: 50,
    maxActiveTrips: 200,
    maxMonthlyPublications: 500,
    canAccessMarketplace: true,
    canUsePremiumListings: true,
    canExportReports: true,
    commissionRate: 1.5,
  },
  FLOTA: {
    maxVehicles: 999999,
    maxDrivers: 999999,
    maxActiveTrips: 999999,
    maxMonthlyPublications: 999999,
    canAccessMarketplace: true,
    canUsePremiumListings: true,
    canExportReports: true,
    commissionRate: 1.0,
  },
};
