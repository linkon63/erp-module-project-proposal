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
  const cartonSeeds = Array.from({ length: 30 }, (_, idx) => {
    const n = idx + 1
    const padded = n.toString().padStart(3, "0")
    const inChina = n <= 18
    const goodsKeys = ["Garments (T-Shirts)", "Electronics Accessories", "Footwear"]
    const goodsKey = goodsKeys[idx % goodsKeys.length]
    const lengthCm = 55 + (idx % 5) * 2
    const widthCm = 38 + (idx % 4)
    const heightCm = 32 + (idx % 3)
    const cbm = Number(((lengthCm * widthCm * heightCm) / 1000000).toFixed(3))
    const weightKg = Number((25 + idx * 0.8).toFixed(1))
    const baseStatus = inChina ? "AT_CHINA_WH" : "AT_BD_WH"
    const billedAmount = Number((weightKg * 6).toFixed(2))

    return {
      cartonNo: `${inChina ? "CN" : "BD"}-${padded}`,
      writtenCartonNo: `${inChina ? "WCN" : "WBD"}-${padded}`,
      trackingNo: `${inChina ? "TRACK-CN" : "TRACK-BD"}-${padded}`,
      goodsId: goodsRecords[goodsKey].id,
      packNo: `PK-${padded}`,
      unitPcs: 80 + (idx % 5) * 10,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      cbm,
      unitPrice: 150 + idx * 5,
      billedAmount,
      shippingMark: goodsRecords[goodsKey].shippingMark,
      warehouseId: inChina ? chinaWh.id : bdWh.id,
      status: baseStatus,
    }
  })

  await Promise.all(
    cartonSeeds.map((carton) =>
      prisma.carton.upsert({
        // Use unique trackingNo now that cartonNo is no longer unique
        where: { trackingNo: carton.trackingNo },
        update: {},
        create: carton,
      })
    )
  )

  // Combined carton example
  const comboChildNos = ["CN-017", "CN-018"]
  await prisma.carton.upsert({
    where: { trackingNo: "TRACK-COMBO-01" },
    update: {},
    create: {
      cartonNo: "CN-COMBO-01",
      writtenCartonNo: "WCN-COMBO-01",
      trackingNo: "TRACK-COMBO-01",
      goodsId: goodsRecords["Electronics Accessories"].id,
      packNo: "PK-C1",
      unitPcs: 170,
      weightKg: 58.0,
      cbm: 0.14,
      billedAmount: 58.0 * 6,
      shippingMark: goodsRecords["Electronics Accessories"].shippingMark,
      warehouseId: chinaWh.id,
      status: "COMBINED",
      isCombinedCarton: true,
      childCartons: JSON.stringify(comboChildNos),
    },
  })

  await prisma.carton.updateMany({
    where: { cartonNo: { in: comboChildNos } },
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
