-- Migration: turnos_queue
-- Campos para cola en tiempo real en reservas de turno

ALTER TABLE "turn_bookings" ADD COLUMN IF NOT EXISTS "arrivedAt"    TIMESTAMP(3);
ALTER TABLE "turn_bookings" ADD COLUMN IF NOT EXISTS "delayMinutes" INTEGER;
ALTER TABLE "turn_bookings" ADD COLUMN IF NOT EXISTS "delayNote"    TEXT;
