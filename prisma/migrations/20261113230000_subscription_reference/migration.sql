-- Referencia externa única por suscripción (la repite Mercado Pago en cada cobro).
ALTER TABLE "subscriptions" ADD COLUMN "externalReference" TEXT;
UPDATE "subscriptions" SET "externalReference" = 'legacy_' || "id"::text WHERE "externalReference" IS NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "externalReference" SET NOT NULL;
CREATE UNIQUE INDEX "subscriptions_externalReference_key" ON "subscriptions"("externalReference");
