-- CreateTable
CREATE TABLE "BookingHold" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "startAtUtc" TIMESTAMP(3) NOT NULL,
    "endAtUtc" TIMESTAMP(3) NOT NULL,
    "expiresAtUtc" TIMESTAMP(3) NOT NULL,
    "clientFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingHold_staffId_startAtUtc_idx" ON "BookingHold"("staffId", "startAtUtc");

-- CreateIndex
CREATE INDEX "BookingHold_expiresAtUtc_idx" ON "BookingHold"("expiresAtUtc");

-- AddForeignKey
ALTER TABLE "BookingHold" ADD CONSTRAINT "BookingHold_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingHold" ADD CONSTRAINT "BookingHold_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingHold" ADD CONSTRAINT "BookingHold_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
