-- Add customer contact fields required for booking confirmation
ALTER TABLE "Booking" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Booking" ADD COLUMN "note" TEXT;
