-- Migration: invoices_table
-- Crea la tabla invoices y sus enums si no existen.
-- Esta migración es idempotente (IF NOT EXISTS).

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "InvoiceType" AS ENUM ('VIAJE', 'COMISION', 'SUSCRIPCION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('PENDIENTE', 'PAGADA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayerRole" AS ENUM ('TRANSPORTISTA', 'DADOR', 'PLATAFORMA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── Tabla invoices ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "invoices" (
  "id"        TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "tripId"    TEXT,
  "type"      "InvoiceType" NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  "status"    "InvoiceStatus" NOT NULL DEFAULT 'PENDIENTE',
  "concept"   TEXT,
  "payerRole" "PayerRole",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- ── Foreign keys (idempotentes via DO) ────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── Columnas adicionales (por si la tabla ya existía sin ellas) ───────────────
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "concept" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payerRole" "PayerRole";
