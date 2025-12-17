// Seed a small, date-aware dataset that keeps the China warehouse "Today" view populated
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
const DAY_MS = 24 * 60 * 60 * 1000

const customers = [
  "Aman Traders",
  "Global Source",
  "Brightline Imports",
  "Nova Retail",
  "Skyline Mart",
  "Zenith Deals",
]

const goodsList = [
  { name: "Garments (T-Shirts)", nameCn: "T恤", shippingMark: "GM-TSHIRT" },
  { name: "Electronics Accessories", nameCn: "电子配件", shippingMark: "EL-ACC" },
  { name: "Footwear", nameCn: "鞋类", shippingMark: "FT-WEAR" },
]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(9, 0, 0, 0)
  return d
}

function buildCarton(seq, opts) {
  const goodsKeys = Object.keys(opts.goodsRecords)
  const goodsName = goodsKeys[(seq + (opts.goodsOffset ?? 0)) % goodsKeys.length]
  const goodsId = opts.goodsRecords[goodsName].id
  const createdAt = startOfDay(Date.now() - DAY_MS * (opts.dayOffset ?? 0))
  const padded = seq.toString().padStart(3, "0")
  const trackingPad = seq.toString().padStart(4, "0")
  const baseCartonNo = `${opts.prefix}-${padded}`
  const printedCartonNo =
    opts.status === "BOX_REQUEST_PENDING" || opts.printedCartonNoPrefix
      ? `${opts.printedCartonNoPrefix ?? "PR"}-${baseCartonNo}`
      : baseCartonNo
  const usePrintedNumber = opts.usePrintedAsCartonNo || opts.status === "BOX_REQUEST_PENDING"
  const cartonNo = usePrintedNumber ? printedCartonNo : opts.cartonNoOverride ?? baseCartonNo
  const lengthCm = 52 + (seq % 4) * 2
  const widthCm = 40 + (seq % 3)
  const heightCm = 34 + (seq % 2) * 3
  const cbm = Number(((lengthCm * widthCm * heightCm) / 1_000_000).toFixed(3))
  const weightKg = Number((17 + (seq % 7) * 1.05 + (opts.weightBump ?? 0)).toFixed(1))
  const billedAmount = Number(
    (opts.manualBill ?? weightKg * (opts.ratePerKg ?? 6.5)).toFixed(2)
  )
  const collectedAmount =
    opts.status === "DELIVERED"
      ? billedAmount
      : opts.status === "IN_SHIPMENT"
        ? Number((billedAmount * 0.5).toFixed(2))
        : 0

  return {
    cartonNo,
    printedCartonNo,
    writtenCartonNo: `${opts.prefix}-W-${padded}`,
    trackingNo: `${opts.prefix}-TRK-${trackingPad}`,
    goodsId,
    packNo: `PK-${padded}`,
    unitPcs: 60 + (seq % 5) * 8,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    cbm,
    unitPrice: 150 + (seq % 5) * 6,
    currencyCode: "USD",
    billedAmount,
    collectedAmount,
    shippingMark: `${customers[seq % customers.length]} / ${baseCartonNo}`,
    remarks:
      opts.status === "BOX_REQUEST_PENDING" ? "Pending print request" : `Batch ${opts.prefix}`,
    copyNumber: `CP-${padded}`,
    notes: opts.notes ?? `Note ${seq}`,
    warehouseId: opts.warehouseId,
    status: opts.status,
    isCombinedCarton: Boolean(opts.isCombinedCarton),
    childCartons: JSON.stringify(opts.childCartons ?? []),
    createdAt,
    deliveredAt:
      opts.status === "DELIVERED"
        ? new Date(createdAt.getTime() + 36 * 60 * 60 * 1000)
        : null,
  }
}

async function main() {
  console.log("Resetting database tables...")
  await prisma.boxRequest.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.carton.deleteMany()
  await prisma.goods.deleteMany()
  await prisma.warehouse.deleteMany()

  const chinaWh = await prisma.warehouse.create({
    data: { code: "CN", name: "China Warehouse", country: "China", address: "Shenzhen" },
  })
  await prisma.warehouse.create({
    data: { code: "BD", name: "Bangladesh Warehouse", country: "Bangladesh", address: "Dhaka" },
  })

  const goodsRecords = {}
  for (const goods of goodsList) {
    const record = await prisma.goods.create({ data: goods })
    goodsRecords[record.name] = record
  }

  let seq = 1
  const seeds = []
  const addBatch = (tag, count, options) => {
    for (let i = 0; i < count; i += 1) {
      seeds.push({
        tag,
        data: buildCarton(seq, { ...options, goodsRecords }),
      })
      seq += 1
    }
  }

  addBatch("today", 10, {
    prefix: "CN-TDY",
    status: "AT_CHINA_WH",
    dayOffset: 0,
    warehouseId: chinaWh.id,
  })
  addBatch("yesterday", 4, {
    prefix: "CN-YES",
    status: "AT_CHINA_WH",
    dayOffset: 1,
    warehouseId: chinaWh.id,
  })
  addBatch("pending", 3, {
    prefix: "CN-BOX",
    status: "BOX_REQUEST_PENDING",
    dayOffset: 0,
    warehouseId: chinaWh.id,
  })
  addBatch("shipment", 5, {
    prefix: "CN-SHP",
    status: "IN_SHIPMENT",
    dayOffset: 2,
    warehouseId: chinaWh.id,
    notes: "Picked for export",
  })
  addBatch("delivered", 3, {
    prefix: "CN-DLV",
    status: "DELIVERED",
    dayOffset: 4,
    warehouseId: chinaWh.id,
    notes: "Completed delivery",
  })
  addBatch("approved", 1, {
    prefix: "CN-APP",
    status: "AT_CHINA_WH",
    dayOffset: 0,
    warehouseId: chinaWh.id,
    printedCartonNoPrefix: "PR",
    usePrintedAsCartonNo: true,
    notes: "Approved sample",
  })

  const createdCartons = []
  for (const seed of seeds) {
    const created = await prisma.carton.create({ data: seed.data })
    createdCartons.push({ ...created, tag: seed.tag })
  }

  const pendingCartons = createdCartons.filter((c) => c.tag === "pending")
  await Promise.all(
    pendingCartons.map((carton, idx) =>
      prisma.boxRequest.create({
        data: {
          cartonId: carton.id,
          printedCartonNo: carton.printedCartonNo ?? carton.cartonNo,
          notes: `Print for pickup batch ${idx + 1}`,
          status: "PENDING",
        },
      })
    )
  )

  const approvedCarton = createdCartons.find((c) => c.tag === "approved")
  if (approvedCarton) {
    await prisma.boxRequest.create({
      data: {
        cartonId: approvedCarton.id,
        printedCartonNo: approvedCarton.printedCartonNo ?? approvedCarton.cartonNo,
        notes: "Approved and printed",
        status: "APPROVED",
      },
    })
  }

  const inShipmentCartons = createdCartons.filter((c) => c.tag === "shipment")
  const deliveredCartons = createdCartons.filter((c) => c.tag === "delivered")
  const shipments = [
    { shipmentNo: "SHIP-CN-001", cartons: inShipmentCartons.slice(0, 3), status: "PLANNED" },
    {
      shipmentNo: "SHIP-CN-002",
      cartons: inShipmentCartons.slice(3).concat(deliveredCartons),
      status: "DELIVERED",
    },
  ]

  for (const shipment of shipments) {
    if (!shipment.cartons.length) continue
    const totalPrice = shipment.cartons.reduce((sum, c) => sum + (c.billedAmount ?? 0), 0)
    const collectedAmount = shipment.cartons.reduce(
      (sum, c) => sum + (c.collectedAmount ?? 0),
      0
    )
    const plannedShipDate = new Date(shipment.cartons[0].createdAt)
    plannedShipDate.setHours(plannedShipDate.getHours() + 6)

    await prisma.shipment.create({
      data: {
        shipmentNo: shipment.shipmentNo,
        fromWarehouse: "China Warehouse",
        toWarehouse: "Bangladesh Warehouse",
        plannedShipDate,
        status: shipment.status,
        totalPrice,
        collectedAmount,
        ratePerKg: 6.5,
        cartons: JSON.stringify(shipment.cartons.map((c) => c.cartonNo)),
      },
    })
  }

  console.log("Seeded a today-focused dataset for the warehouse UI.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
