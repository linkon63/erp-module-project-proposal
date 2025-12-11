// Seed data for the ERP prototype
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(9, 0, 0, 0)
  return d
}

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

  const customers = [
    "Aman Traders",
    "Global Source",
    "Brightline Imports",
    "Nova Retail",
    "Skyline Mart",
    "Zenith Deals",
  ]

  const dateBuckets = [
    { createdAt: startOfDay(new Date()), status: "AT_CHINA_WH" },
    { createdAt: startOfDay(Date.now() - DAY_MS), status: "IN_SHIPMENT" },
    { createdAt: startOfDay(Date.now() - DAY_MS * 2), status: "DELIVERED" },
  ]

  // 150 cartons with full fields and staggered creation dates (50 per day bucket)
  const cartonSeeds = Array.from({ length: 150 }, (_, idx) => {
    const n = idx + 1
    const padded = n.toString().padStart(4, "0")
    const bucketIndex = idx < 50 ? 0 : idx < 100 ? 1 : 2
    const bucket = dateBuckets[bucketIndex]
    const createdAt = bucket.createdAt
    const prefix = idx % 2 === 0 ? "CN" : "BD"
    const goodsKeys = ["Garments (T-Shirts)", "Electronics Accessories", "Footwear"]
    const goodsKey = goodsKeys[idx % goodsKeys.length]
    const trackingNo = `TRK-${prefix}-${padded}`
    const lengthCm = 52 + (idx % 5) * 2
    const widthCm = 40 + (idx % 4)
    const heightCm = 35 + (idx % 3)
    const cbm = Number(((lengthCm * widthCm * heightCm) / 1000000).toFixed(3))
    const weightKg = Number((20 + (idx % 15) * 1.3 + bucketIndex * 0.5).toFixed(1))
    const unitPrice = 150 + (idx % 10) * 5
    const billedAmount = Number((weightKg * 6.5).toFixed(2))
    const collectedAmount =
      bucketIndex === 2
        ? billedAmount
        : Number((billedAmount * (bucketIndex === 1 ? 0.6 : 0.3)).toFixed(2))
    const deliveredAt =
      bucketIndex === 2 ? new Date(createdAt.getTime() + 36 * 60 * 60 * 1000) : null
    const customer = customers[idx % customers.length]
    const shippingMark = `${customer} / ${trackingNo}`

    return {
      cartonNo: `${prefix}-${padded}`,
      printedCartonNo: `${prefix}-P-${padded}`,
      writtenCartonNo: `${prefix}-W-${padded}`,
      trackingNo,
      goodsId: goodsRecords[goodsKey].id,
      packNo: `PK-${padded}`,
      unitPcs: 70 + (idx % 6) * 10,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      cbm,
      unitPrice,
      currencyCode: "USD",
      billedAmount,
      collectedAmount,
      shippingMark,
      remarks: `Handle with care - batch ${bucketIndex + 1}`,
      copyNumber: `CPY-${padded}`,
      notes: `Note ${n}`,
      warehouseId: prefix === "CN" ? chinaWh.id : bdWh.id,
      status: bucket.status,
      isCombinedCarton: false,
      childCartons: "[]",
      createdAt,
      deliveredAt,
    }
  })

  await Promise.all(
    cartonSeeds.map((carton) =>
      prisma.carton.upsert({
        where: { trackingNo: carton.trackingNo },
        update: carton,
        create: carton,
      })
    )
  )

  // Two shipments only: first with 10 cartons, second with 15 cartons
  const shipmentGroups = [
    { shipmentNo: "SHP-001", start: 0, end: 10, status: "PLANNED" },
    { shipmentNo: "SHP-002", start: 10, end: 25, status: "IN_TRANSIT" },
  ]

  for (const group of shipmentGroups) {
    const cartonsSlice = cartonSeeds.slice(group.start, group.end)
    if (cartonsSlice.length === 0) continue

    const cartonNos = cartonsSlice.map((c) => c.cartonNo)
    const totalPrice = cartonsSlice.reduce((sum, c) => sum + (c.billedAmount ?? 0), 0)
    const collectedAmount = cartonsSlice.reduce(
      (sum, c) => sum + (c.collectedAmount ?? 0),
      0
    )

    await prisma.shipment.upsert({
      where: { shipmentNo: group.shipmentNo },
      update: {
        cartons: JSON.stringify(cartonNos),
        totalPrice,
        collectedAmount,
        status: group.status,
      },
      create: {
        shipmentNo: group.shipmentNo,
        fromWarehouse: "China Warehouse",
        toWarehouse: "Bangladesh Warehouse",
        plannedShipDate: new Date(cartonsSlice[0].createdAt.getTime() + 6 * 60 * 60 * 1000),
        status: group.status,
        totalPrice,
        collectedAmount,
        ratePerKg: 6.5,
        cartons: JSON.stringify(cartonNos),
      },
    })
  }
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
