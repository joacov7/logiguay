-- Migration: app_settings
-- Tabla clave/valor para configuración de la plataforma (feature flags, etc.)

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- Seed: botón de navegación activo por defecto
INSERT INTO "app_settings" ("key", "value", "updatedAt") VALUES
  ('feature_navigation_button', 'true', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
