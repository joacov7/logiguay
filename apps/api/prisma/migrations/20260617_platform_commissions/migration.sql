-- Migration: platform_commissions
-- 1) Agrega rol del pagador y concepto a las facturas
-- 2) Crea tabla de tasas de comisión por plan (editable por el admin)

-- ── Enum PayerRole (idempotente) ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PayerRole" AS ENUM ('TRANSPORTISTA', 'DADOR', 'PLATAFORMA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── Columnas nuevas en invoices ───────────────────────────────────────────────
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "concept" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payerRole" "PayerRole";

-- ── Tabla CommissionRate ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CommissionRate" (
  "id"          TEXT NOT NULL,
  "plan"        "PlanType" NOT NULL,
  "carrierRate" DOUBLE PRECISION NOT NULL,
  "shipperRate" DOUBLE PRECISION NOT NULL,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionRate_plan_key" ON "CommissionRate"("plan");

-- ── Semilla de tasas por defecto (plan reduce la comisión) ────────────────────
INSERT INTO "CommissionRate" ("id", "plan", "carrierRate", "shipperRate", "updatedAt") VALUES
  ('cr_free',    'FREE',    5,   2,   CURRENT_TIMESTAMP),
  ('cr_pro',     'PRO',     4,   1.5, CURRENT_TIMESTAMP),
  ('cr_empresa', 'EMPRESA', 3,   1,   CURRENT_TIMESTAMP),
  ('cr_flota',   'FLOTA',   2,   0.5, CURRENT_TIMESTAMP)
ON CONFLICT ("plan") DO NOTHING;
