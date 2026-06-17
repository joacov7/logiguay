-- Migration: telegram_bot
-- Vinculación de cuenta de usuario con Telegram

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegramId_key" ON "users"("telegramId");
