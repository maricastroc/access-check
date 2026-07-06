-- CreateTable
CREATE TABLE "site_scans" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "rootUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "scannedPages" INTEGER NOT NULL DEFAULT 0,
    "failedPages" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_scan_pages" (
    "id" TEXT NOT NULL,
    "siteScanId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "score" INTEGER,
    "critical" INTEGER NOT NULL DEFAULT 0,
    "serious" INTEGER NOT NULL DEFAULT 0,
    "moderate" INTEGER NOT NULL DEFAULT 0,
    "minor" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_scan_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_scans_userId_createdAt_idx" ON "site_scans"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "site_scan_pages_siteScanId_idx" ON "site_scan_pages"("siteScanId");

-- AddForeignKey
ALTER TABLE "site_scans" ADD CONSTRAINT "site_scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_scan_pages" ADD CONSTRAINT "site_scan_pages_siteScanId_fkey" FOREIGN KEY ("siteScanId") REFERENCES "site_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

