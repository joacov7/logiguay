-- Chat dador <-> transportista, atado a un viaje (Trip).
-- El body se persiste YA enmascarado (sin PII) para evitar disintermediación.

CREATE TABLE IF NOT EXISTS "messages" (
  "id"              TEXT NOT NULL,
  "tripId"          TEXT NOT NULL,
  "senderCompanyId" TEXT NOT NULL,
  "senderUserId"    TEXT,
  "body"            TEXT NOT NULL,
  "maskedContact"   BOOLEAN NOT NULL DEFAULT false,
  "readAt"          TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "messages_tripId_createdAt_idx" ON "messages" ("tripId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_tripId_fkey' AND conrelid = 'messages'::regclass
  ) THEN
    ALTER TABLE "messages"
      ADD CONSTRAINT "messages_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_senderCompanyId_fkey' AND conrelid = 'messages'::regclass
  ) THEN
    ALTER TABLE "messages"
      ADD CONSTRAINT "messages_senderCompanyId_fkey"
      FOREIGN KEY ("senderCompanyId") REFERENCES "companies"("id") ON DELETE CASCADE;
  END IF;
END $$;
