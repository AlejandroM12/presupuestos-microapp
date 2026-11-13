-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "defaultCurrency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
ADD COLUMN     "defaultPaymentTerms" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "defaultTerms" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "defaultValidityDays" INTEGER NOT NULL DEFAULT 15;
