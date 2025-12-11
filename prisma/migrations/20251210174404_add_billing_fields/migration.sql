-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Carton" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cartonNo" TEXT NOT NULL,
    "writtenCartonNo" TEXT NOT NULL,
    "trackingNo" TEXT NOT NULL,
    "goodsId" INTEGER NOT NULL,
    "packNo" TEXT,
    "unitPcs" INTEGER,
    "weightKg" REAL,
    "lengthCm" REAL,
    "widthCm" REAL,
    "heightCm" REAL,
    "cbm" REAL,
    "unitPrice" REAL,
    "currencyCode" TEXT DEFAULT 'USD',
    "shippingMark" TEXT,
    "remarks" TEXT,
    "copyNumber" TEXT,
    "notes" TEXT,
    "warehouseId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'AT_CHINA_WH',
    "isCombinedCarton" BOOLEAN NOT NULL DEFAULT false,
    "childCartons" TEXT NOT NULL DEFAULT '[]',
    "printedCartonNo" TEXT,
    "billedAmount" REAL NOT NULL DEFAULT 0,
    "collectedAmount" REAL NOT NULL DEFAULT 0,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Carton_goodsId_fkey" FOREIGN KEY ("goodsId") REFERENCES "Goods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Carton_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Carton" ("cartonNo", "cbm", "childCartons", "copyNumber", "createdAt", "currencyCode", "goodsId", "heightCm", "id", "isCombinedCarton", "lengthCm", "notes", "packNo", "printedCartonNo", "remarks", "shippingMark", "status", "trackingNo", "unitPcs", "unitPrice", "updatedAt", "warehouseId", "weightKg", "widthCm", "writtenCartonNo") SELECT "cartonNo", "cbm", "childCartons", "copyNumber", "createdAt", "currencyCode", "goodsId", "heightCm", "id", "isCombinedCarton", "lengthCm", "notes", "packNo", "printedCartonNo", "remarks", "shippingMark", "status", "trackingNo", "unitPcs", "unitPrice", "updatedAt", "warehouseId", "weightKg", "widthCm", "writtenCartonNo" FROM "Carton";
DROP TABLE "Carton";
ALTER TABLE "new_Carton" RENAME TO "Carton";
CREATE UNIQUE INDEX "Carton_writtenCartonNo_key" ON "Carton"("writtenCartonNo");
CREATE UNIQUE INDEX "Carton_trackingNo_key" ON "Carton"("trackingNo");
CREATE TABLE "new_Shipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shipmentNo" TEXT NOT NULL,
    "fromWarehouse" TEXT,
    "toWarehouse" TEXT,
    "plannedShipDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "collectedAmount" REAL NOT NULL DEFAULT 0,
    "ratePerKg" REAL NOT NULL DEFAULT 0,
    "cartons" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shipment" ("cartons", "createdAt", "fromWarehouse", "id", "plannedShipDate", "shipmentNo", "status", "toWarehouse", "updatedAt") SELECT "cartons", "createdAt", "fromWarehouse", "id", "plannedShipDate", "shipmentNo", "status", "toWarehouse", "updatedAt" FROM "Shipment";
DROP TABLE "Shipment";
ALTER TABLE "new_Shipment" RENAME TO "Shipment";
CREATE UNIQUE INDEX "Shipment_shipmentNo_key" ON "Shipment"("shipmentNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
