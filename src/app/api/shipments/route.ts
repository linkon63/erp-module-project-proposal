import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ShipmentPayload = {
  shipmentNo: string
  fromWarehouse?: string
  toWarehouse?: string
  plannedShipDate?: string
  status?: string
  totalPrice?: number
  collectedAmount?: number
  ratePerKg?: number
  cartonNos?: string[]
  cartonIds?: number[]
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function GET() {
  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
  })

  const allCartonNos = shipments
    .map((s) => parseJsonArray(s.cartons))
    .flat()
    .filter(Boolean)

  const cartonDetails = allCartonNos.length
    ? await prisma.carton.findMany({
        where: { cartonNo: { in: allCartonNos } },
        include: { goods: true, warehouse: true },
      })
    : []

  const cartonMap = new Map(cartonDetails.map((c) => [c.cartonNo, c]))

  return NextResponse.json({
    shipments: shipments.map((shipment) => {
      const cartonNos = parseJsonArray(shipment.cartons)
      const details = cartonNos
        .map((no) => cartonMap.get(no))
        .filter(Boolean)
      const collectedFromDetails = details.reduce(
        (sum, c) => sum + (c?.collectedAmount ?? 0),
        0
      )
      const billedFromDetails = details.reduce(
        (sum, c) => sum + (c?.billedAmount ?? 0),
        0
      )
      const collectedAmount = Math.max(collectedFromDetails, shipment.collectedAmount ?? 0)
      return {
        ...shipment,
        cartons: cartonNos,
        cartonDetails: details,
        collectedAmount,
        totalPrice: shipment.totalPrice ?? billedFromDetails,
        ratePerKg: shipment.ratePerKg,
      }
    }),
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShipmentPayload
    if (!body.shipmentNo || (!Array.isArray(body.cartonIds) && !Array.isArray(body.cartonNos))) {
      return NextResponse.json(
        { error: "shipmentNo and cartonIds or cartonNos are required" },
        { status: 400 }
      )
    }

    const totalPrice = body.totalPrice ?? null
    if (totalPrice !== null && Number.isNaN(Number(totalPrice))) {
      return NextResponse.json({ error: "totalPrice must be a number" }, { status: 400 })
    }
    const collectedAmount = body.collectedAmount ?? 0
    if (Number.isNaN(Number(collectedAmount))) {
      return NextResponse.json({ error: "collectedAmount must be a number" }, { status: 400 })
    }

    let cartonNos: string[] = []
    let cartonIds: number[] = []

    if (Array.isArray(body.cartonIds) && body.cartonIds.length) {
      cartonIds = body.cartonIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    }

    if (!cartonIds.length && Array.isArray(body.cartonNos)) {
      const rawCartonNos = body.cartonNos.map((c) => c.trim()).filter(Boolean)
      cartonNos = Array.from(new Set(rawCartonNos))
    }

    if (!cartonIds.length && !cartonNos.length) {
      return NextResponse.json({ error: "No valid cartons provided" }, { status: 400 })
    }

    let existingCartons

    if (cartonIds.length) {
      existingCartons = await prisma.carton.findMany({
        where: { id: { in: cartonIds } },
      })
      cartonNos = existingCartons.map((c) => c.cartonNo)
    } else {
      existingCartons = await prisma.carton.findMany({
        where: { cartonNo: { in: cartonNos } },
      })
      cartonIds = existingCartons.map((c) => c.id)
    }

    if (!existingCartons.length) {
      return NextResponse.json(
        { error: "No matching cartons found for shipment" },
        { status: 404 }
      )
    }

    const alreadyShipped = existingCartons.filter((c) =>
      (c.status ?? "").toUpperCase().startsWith("IN_SHIPMENT")
    )
    const shippableCartons = existingCartons.filter(
      (c) => !(c.status ?? "").toUpperCase().startsWith("IN_SHIPMENT")
    )

    if (!shippableCartons.length) {
      return NextResponse.json(
        { error: "All selected cartons are already in shipment", cartons: alreadyShipped.map((c) => c.cartonNo) },
        { status: 400 }
      )
    }

    const shipmentCartonIds = shippableCartons.map((c) => c.id)
    const shipmentCartonNos = shippableCartons.map((c) => c.cartonNo)

    const plannedShipDate = body.plannedShipDate
      ? new Date(body.plannedShipDate)
      : null

    const ratePerKg = body.ratePerKg != null ? Number(body.ratePerKg) : 0

    const shipment = await prisma.$transaction(async (tx) => {
      // compute per-carton charges
      const chargesById = new Map<number, number>()
      shippableCartons.forEach((c) => {
        const hasManualBill = (c.billedAmount ?? 0) > 0
        const charge = hasManualBill
          ? c.billedAmount ?? 0
          : (c.weightKg ?? 0) * ratePerKg
        chargesById.set(c.id, charge)
      })

      const totalCharge = Array.from(chargesById.values()).reduce((a, b) => a + b, 0)

      const created = await tx.shipment.create({
        data: {
          shipmentNo: body.shipmentNo.trim(),
          fromWarehouse: body.fromWarehouse ?? "China Warehouse",
          toWarehouse: body.toWarehouse ?? "Bangladesh Warehouse",
          plannedShipDate: plannedShipDate ?? undefined,
          status: body.status ?? "PLANNED",
          totalPrice: totalPrice != null ? Number(totalPrice) : totalCharge,
          ratePerKg,
          collectedAmount: Number(collectedAmount) || 0,
          cartons: JSON.stringify(shipmentCartonNos),
        },
      })

      await tx.carton.updateMany({
        where: { id: { in: shipmentCartonIds } },
        data: { status: "IN_SHIPMENT" },
      })

      // set per-carton billing
      for (const c of shippableCartons) {
        await tx.carton.update({
          where: { id: c.id },
          data: {
            billedAmount: chargesById.get(c.id) ?? 0,
            collectedAmount: 0,
          },
        })
      }

      return created
    })

    return NextResponse.json(
      {
        shipment: { ...shipment, cartons: shipmentCartonNos },
        skipped: alreadyShipped.map((c) => c.cartonNo),
      },
      { status: 201 }
    )
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : null
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Shipment number already exists. Please use a unique shipment number." },
        { status: 409 }
      )
    }
    console.error("Error creating shipment", error)
    return NextResponse.json(
      { error: "Unable to create shipment" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get("id")
    if (!idParam) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }
    const id = Number(idParam)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "id must be a number" }, { status: 400 })
    }

    const body = (await req.json()) as { collectedAmount?: number; status?: string }
    const hasCollected = body.collectedAmount !== undefined
    const hasStatus = typeof body.status === "string" && body.status.trim().length > 0

    if (!hasCollected && !hasStatus) {
      return NextResponse.json(
        { error: "collectedAmount or status is required" },
        { status: 400 }
      )
    }

    if (hasCollected && Number.isNaN(Number(body.collectedAmount))) {
      return NextResponse.json({ error: "collectedAmount must be a number" }, { status: 400 })
    }

    const shipment = await prisma.shipment.findUnique({ where: { id } })
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    const normalizedStatus = hasStatus ? body.status!.trim().toUpperCase() : null

    const updated = await prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          collectedAmount: hasCollected ? Number(body.collectedAmount) : undefined,
          status: normalizedStatus ?? undefined,
        },
      })

      if (normalizedStatus === "DELIVERED") {
        const cartonNos = parseJsonArray(shipment.cartons)
        if (cartonNos.length) {
          await tx.carton.updateMany({
            where: { cartonNo: { in: cartonNos } },
            data: { status: "DELIVERED", deliveredAt: new Date() },
          })
        }
      }

      return updatedShipment
    })

    return NextResponse.json({ shipment: updated })
  } catch (error) {
    console.error("Error updating shipment collection", error)
    return NextResponse.json({ error: "Unable to update shipment collection" }, { status: 500 })
  }
}
