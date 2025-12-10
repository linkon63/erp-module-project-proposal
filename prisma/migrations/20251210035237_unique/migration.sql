-- CreateTable
CREATE TABLE "Warehouse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Goods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nameCn" TEXT,
    "shippingMark" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Carton" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Carton_goodsId_fkey" FOREIGN KEY ("goodsId") REFERENCES "Goods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Carton_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shipmentNo" TEXT NOT NULL,
    "fromWarehouse" TEXT,
    "toWarehouse" TEXT,
    "plannedShipDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "cartons" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BoxRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cartonId" INTEGER NOT NULL,
    "requestedCartonNo" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoxRequest_cartonId_fkey" FOREIGN KEY ("cartonId") REFERENCES "Carton" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Goods_name_key" ON "Goods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Carton_cartonNo_key" ON "Carton"("cartonNo");

-- CreateIndex
CREATE UNIQUE INDEX "Carton_writtenCartonNo_key" ON "Carton"("writtenCartonNo");

-- CreateIndex
CREATE UNIQUE INDEX "Carton_trackingNo_key" ON "Carton"("trackingNo");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNo_key" ON "Shipment"("shipmentNo");
