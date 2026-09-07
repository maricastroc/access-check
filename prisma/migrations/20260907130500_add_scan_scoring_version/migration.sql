-- AlterTable
-- Existing rows were scored by the model that charged axe-core violations only.
ALTER TABLE "scans" ADD COLUMN     "scoringVersion" INTEGER NOT NULL DEFAULT 1;
