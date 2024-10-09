-- CreateTable
CREATE TABLE "Analysis" (
    "uid" SERIAL NOT NULL,
    "vehicleId" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "obsolete" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "AnalysisSource" (
    "analysisId" INTEGER NOT NULL,
    "dataId" INTEGER NOT NULL,

    CONSTRAINT "AnalysisSource_pkey" PRIMARY KEY ("analysisId","dataId")
);

-- CreateIndex
CREATE INDEX "Analysis_timestamp_idx" ON "Analysis"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSource" ADD CONSTRAINT "AnalysisSource_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSource" ADD CONSTRAINT "AnalysisSource_dataId_fkey" FOREIGN KEY ("dataId") REFERENCES "RawData"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
