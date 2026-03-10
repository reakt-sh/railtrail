-- CreateTable
CREATE TABLE "Feedback" (
    "uid" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "vehicleId" INTEGER,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("uid")
);

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
