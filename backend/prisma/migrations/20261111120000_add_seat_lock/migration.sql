-- CreateTable
CREATE TABLE "SeatLock" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "socketId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeatLock_socketId_idx" ON "SeatLock"("socketId");

-- CreateIndex
CREATE INDEX "SeatLock_expiresAt_idx" ON "SeatLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeatLock_tripId_seatNumber_key" ON "SeatLock"("tripId", "seatNumber");

-- AddForeignKey
ALTER TABLE "SeatLock" ADD CONSTRAINT "SeatLock_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatLock" ADD CONSTRAINT "SeatLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

