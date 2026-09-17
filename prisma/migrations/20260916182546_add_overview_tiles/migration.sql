-- CreateTable
CREATE TABLE "tiles" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "docY" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/webp',

    CONSTRAINT "tiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tiles_scanId_idx" ON "tiles"("scanId");

-- AddForeignKey
ALTER TABLE "tiles" ADD CONSTRAINT "tiles_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
