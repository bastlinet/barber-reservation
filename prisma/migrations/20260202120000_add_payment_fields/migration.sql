-- Add payment tracking columns for holds/bookings
CREATE TYPE "PaymentStatus" AS ENUM ('NONE', 'PENDING', 'PAID', 'FAILED', 'CANCELED');

ALTER TABLE "BookingHold"
ADD COLUMN "paymentIntentId" TEXT;

ALTER TABLE "Booking"
ADD COLUMN "paymentIntentId" TEXT;

ALTER TABLE "Booking"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE';
