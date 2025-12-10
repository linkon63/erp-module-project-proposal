/*
  Warnings:

  - You are about to drop the column `requestedCartonNo` on the `BoxRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Carton" ADD COLUMN "printedCartonNo" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoxRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cartonId" INTEGER NOT NULL,
    "printedCartonNo" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoxRequest_cartonId_fkey" FOREIGN KEY ("cartonId") REFERENCES "Carton" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BoxRequest" ("cartonId", "createdAt", "id", "notes", "status", "updatedAt") SELECT "cartonId", "createdAt", "id", "notes", "status", "updatedAt" FROM "BoxRequest";
DROP TABLE "BoxRequest";
ALTER TABLE "new_BoxRequest" RENAME TO "BoxRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
