-- AlterTable: add tags column to circles
ALTER TABLE "circles" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
