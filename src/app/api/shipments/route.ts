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
  cartonNos: string[]
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

  return NextResponse.json({
    shipments: shipments.map((shipment) => ({
      ...shipment,
      cartons: parseJsonArray(shipment.cartons),
    })),
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShipmentPayload
    if (!body.shipmentNo || !Array.isArray(body.cartonNos)) {
      return NextResponse.json(
        { error: "shipmentNo and cartonNos are required" },
        { status: 400 }
      )
    }

    const plannedShipDate = body.plannedShipDate
      ? new Date(body.plannedShipDate)
      : null

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNo: body.shipmentNo.trim(),
        fromWarehouse: body.fromWarehouse ?? "China Warehouse",
        toWarehouse: body.toWarehouse ?? "Bangladesh Warehouse",
        plannedShipDate: plannedShipDate ?? undefined,
        status: body.status ?? "PLANNED",
        cartons: JSON.stringify(body.cartonNos),
      },
    })

    return NextResponse.json(
      { shipment: { ...shipment, cartons: body.cartonNos } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating shipment", error)
    return NextResponse.json(
      { error: "Unable to create shipment" },
      { status: 500 }
    )
  }
}
