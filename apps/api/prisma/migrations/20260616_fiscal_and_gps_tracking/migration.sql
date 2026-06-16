-- Migration: fiscal_and_gps_tracking
-- 1) Adds fiscal data (razon social + condicion fiscal) to companies, required to invoice
-- 2) Adds per-vehicle tracking source (app vs physical GPS) and GPS protocol

-- ── Enums (idempotent) ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CondicionFiscal" AS ENUM (
    'RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_DECLARADA'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TrackingMode" AS ENUM ('APP', 'GPS_FISICO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TrackerProtocol" AS ENUM ('CONCOX', 'GT06');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── Companies: fiscal data ────────────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS "razonSocial"     TEXT,
  ADD COLUMN IF NOT EXISTS "condicionFiscal" "CondicionFiscal" NOT NULL DEFAULT 'NO_DECLARADA';

-- ── Vehicles: tracking source + protocol ──────────────────────────────────────
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS "trackingMode"    "TrackingMode" NOT NULL DEFAULT 'APP',
  ADD COLUMN IF NOT EXISTS "trackerProtocol" "TrackerProtocol";

-- Vehicles that already have an IMEI loaded are using a physical GPS
UPDATE vehicles
  SET "trackingMode" = 'GPS_FISICO'
  WHERE "trackerDeviceId" IS NOT NULL AND "trackingMode" = 'APP';
