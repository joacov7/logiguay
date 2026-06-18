-- Migration: rating_categories_company
-- Adds per-category scores and company relation to ratings table

ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS "toCompanyId"      TEXT,
  ADD COLUMN IF NOT EXISTS "puntualidad"      INTEGER,
  ADD COLUMN IF NOT EXISTS "cuidadoCarga"     INTEGER,
  ADD COLUMN IF NOT EXISTS "comunicacion"     INTEGER,
  ADD COLUMN IF NOT EXISTS "estadoVehiculo"   INTEGER,
  ADD COLUMN IF NOT EXISTS "documentacion"    INTEGER,
  ADD COLUMN IF NOT EXISTS "puntualidadCarga" INTEGER,
  ADD COLUMN IF NOT EXISTS "condicionesLugar" INTEGER,
  ADD COLUMN IF NOT EXISTS "pagoTiempo"       INTEGER,
  ADD COLUMN IF NOT EXISTS "tratoPersonal"    INTEGER;

-- Foreign key to companies (optional, nullable)
ALTER TABLE ratings
  ADD CONSTRAINT IF NOT EXISTS "ratings_toCompanyId_fkey"
  FOREIGN KEY ("toCompanyId") REFERENCES companies(id) ON DELETE SET NULL;
