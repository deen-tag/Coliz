-- Tarification et négociation : tables et colonne ADDITIVES (aucune donnée existante modifiée).
-- Appliquée automatiquement par `prisma db push` au build ; ce fichier sert de référence / application manuelle.

CREATE TYPE "PriceOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'WITHDRAWN');
CREATE TYPE "NegotiationParty" AS ENUM ('SENDER', 'TRAVELER');

ALTER TABLE "Parcel" ADD COLUMN "proposedAmount" DECIMAL(10,2);

CREATE TABLE "PricingTier" (
  "id" TEXT NOT NULL,
  "label" TEXT,
  "originCountry" TEXT,
  "destinationCountry" TEXT,
  "minWeightKg" DOUBLE PRECISION NOT NULL,
  "maxWeightKg" DOUBLE PRECISION NOT NULL,
  "minPrice" DECIMAL(10,2) NOT NULL,
  "recommendedMin" DECIMAL(10,2) NOT NULL,
  "recommendedMax" DECIMAL(10,2) NOT NULL,
  "surcharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PricingTier_active_idx" ON "PricingTier"("active");

CREATE TABLE "PricingSettings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "platformFeeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceOffer" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorRole" "NegotiationParty" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "minAtOffer" DECIMAL(10,2) NOT NULL,
  "status" "PriceOfferStatus" NOT NULL DEFAULT 'PENDING',
  "respondedById" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceOffer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PriceOffer_bookingId_createdAt_idx" ON "PriceOffer"("bookingId", "createdAt");
CREATE INDEX "PriceOffer_bookingId_status_idx" ON "PriceOffer"("bookingId", "status");
ALTER TABLE "PriceOffer" ADD CONSTRAINT "PriceOffer_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceOffer" ADD CONSTRAINT "PriceOffer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MaintenanceRun" (
  "id" TEXT NOT NULL,
  "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceRun_pkey" PRIMARY KEY ("id")
);
