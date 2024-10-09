-- CreateTable
CREATE TABLE "Vehicle" (
    "uid" SERIAL NOT NULL,
    "info" JSONB NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Tracker" (
    "uid" SERIAL NOT NULL,
    "info" JSONB NOT NULL,
    "vehicleId" INTEGER,

    CONSTRAINT "Tracker_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "RawData" (
    "uid" SERIAL NOT NULL,
    "trackerId" INTEGER NOT NULL,
    "vehicleId" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "processed" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "RawData_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE INDEX "RawData_timestamp_idx" ON "RawData"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawData" ADD CONSTRAINT "RawData_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawData" ADD CONSTRAINT "RawData_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
