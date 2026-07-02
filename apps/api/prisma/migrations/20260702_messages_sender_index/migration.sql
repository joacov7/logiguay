-- Índice para el conteo de mensajes no leídos por empresa emisora
CREATE INDEX IF NOT EXISTS "messages_senderCompanyId_idx" ON "messages"("senderCompanyId");
