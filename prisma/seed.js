// Seed data for the ERP prototype
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  // Warehouses
  const chinaWh = await prisma.warehouse.upsert({
    where: { code: "CN" },
    update: {},
    create: {
      code: "CN",
      name: "China Warehouse",
      country: "China",
      address: "Shenzhen",
    },
  })

  const bdWh = await prisma.warehouse.upsert({
    where: { code: "BD" },
    update: {},
    create: {
      code: "BD",
      name: "Bangladesh Warehouse",
      country: "Bangladesh",
      address: "Dhaka",
    },
  })

  // Goods
  const goodsList = [
    {
      name: "Garments (T-Shirts)",
      nameCn: "T恤",
      shippingMark: "GM-TSHIRT",
    },
    {
      name: "Electronics Accessories",
      nameCn: "电子配件",
      shippingMark: "EL-ACC",
    },
    {
      name: "Footwear",
      nameCn: "鞋类",
      shippingMark: "FT-WEAR",
    },
  ]

  const goodsRecords = {}
  for (const goods of goodsList) {
    const record = await prisma.goods.upsert({
      where: { name: goods.name },
      update: {},
      create: goods,
    })
    goodsRecords[record.name] = record
  }

  // Users (for existing user list demo)
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    await prisma.user.createMany({
      data: [
        {
          name: "Amira Khan",
          email: "amira.khan@example.com",
          role: "Operations Manager",
          location: "Dhaka",
          status: "active",
        },
        {
          name: "Luis Chen",
          email: "luis.chen@example.com",
          role: "Warehouse Lead",
          location: "Shenzhen",
          status: "active",
        },
        {
          name: "Priya Sen",
          email: "priya.sen@example.com",
          role: "Logistics Analyst",
          location: "Hong Kong",
          status: "pending",
        },
        {
          name: "Michael Owusu",
          email: "michael.owusu@example.com",
          role: "Finance Controller",
          location: "Singapore",
          status: "active",
        },
        {
          name: "Sara Ahmed",
          email: "sara.ahmed@example.com",
          role: "Compliance Officer",
          location: "Kuala Lumpur",
          status: "inactive",
        },
      ],
    })
  }

  // Cartons
  const cartons = [
    {
      cartonNo: "CN-001",
      writtenCartonNo: "WCN-001",
      trackingNo: "TRACK-001",
      goodsId: goodsRecords["Garments (T-Shirts)"].id,
      packNo: "PK-01",
      unitPcs: 120,
      weightKg: 35.4,
      lengthCm: 60,
      widthCm: 40,
      heightCm: 35,
      cbm: 0.084,
      unitPrice: 220,
      shippingMark: "GM-TSHIRT",
      warehouseId: chinaWh.id,
      status: "AT_CHINA_WH",
    },
    {
      cartonNo: "CN-002",
      writtenCartonNo: "WCN-002",
      trackingNo: "TRACK-002",
      goodsId: goodsRecords["Electronics Accessories"].id,
      packNo: "PK-02",
      unitPcs: 80,
      weightKg: 28.1,
      lengthCm: 55,
      widthCm: 38,
      heightCm: 32,
      cbm: 0.067,
      unitPrice: 180,
      shippingMark: "EL-ACC",
      warehouseId: chinaWh.id,
      status: "AT_CHINA_WH",
    },
    {
      cartonNo: "CN-003",
      writtenCartonNo: "WCN-003",
      trackingNo: "TRACK-003",
      goodsId: goodsRecords["Electronics Accessories"].id,
      packNo: "PK-03",
      unitPcs: 90,
      weightKg: 29.6,
      lengthCm: 58,
      widthCm: 40,
      heightCm: 34,
      cbm: 0.079,
      unitPrice: 195,
      shippingMark: "EL-ACC",
      warehouseId: chinaWh.id,
      status: "AT_CHINA_WH",
    },
    {
      cartonNo: "BD-001",
      writtenCartonNo: "WBD-001",
      goodsId: goodsRecords["Footwear"].id,
      packNo: "PK-04",
      unitPcs: 150,
      weightKg: 42.2,
      lengthCm: 62,
      widthCm: 42,
      heightCm: 38,
      cbm: 0.099,
      unitPrice: 260,
      shippingMark: "FT-WEAR",
      warehouseId: bdWh.id,
      status: "AT_BD_WH",
    },
  ]

  for (const carton of cartons) {
    await prisma.carton.upsert({
      where: { cartonNo: carton.cartonNo },
      update: {},
      create: carton,
    })
  }

  // Combined carton example
  await prisma.carton.upsert({
    where: { cartonNo: "CN-COMBO-01" },
    update: {},
    create: {
      cartonNo: "CN-COMBO-01",
      goodsId: goodsRecords["Electronics Accessories"].id,
      packNo: "PK-C1",
      unitPcs: 170,
      weightKg: 58.0,
      cbm: 0.14,
      shippingMark: "EL-ACC",
      warehouseId: chinaWh.id,
      status: "COMBINED",
      isCombinedCarton: true,
      childCartons: JSON.stringify(["CN-002", "CN-003"]),
    },
  })

  await prisma.carton.updateMany({
    where: { cartonNo: { in: ["CN-002", "CN-003"] } },
    data: { status: "IN_COMBINED" },
  })

  // Shipment sample
  await prisma.shipment.upsert({
    where: { shipmentNo: "SHP-001" },
    update: {},
    create: {
      shipmentNo: "SHP-001",
      fromWarehouse: "China Warehouse",
      toWarehouse: "Bangladesh Warehouse",
      plannedShipDate: new Date(),
      status: "PLANNED",
      cartons: JSON.stringify(["CN-COMBO-01", "CN-001"]),
    },
  })
}

main()
  .then(() => {
    console.log("Database seeded.")
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
