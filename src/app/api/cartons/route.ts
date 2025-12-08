import { NextResponse } from "next/server"

import type { Carton, Goods, Warehouse } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CartonPayload = {
  cartonNo: string
  writtenCartonNo?: string
  trackingNo?: string
  goodsId: number
  packNo?: string
  unitPcs?: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  cbm?: number
  unitPrice?: number
  currencyCode?: string
  shippingMark?: string
  remarks?: string
  copyNumber?: string
  notes?: string
  warehouseId?: number | null
  status?: string
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
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

type CartonWithRelations = Carton & {
  goods: Goods
  warehouse: Warehouse | null
}

function formatCarton(carton: CartonWithRelations) {
  return {
    ...carton,
    childCartons: parseJsonArray(carton.childCartons),
  }
}

export async function GET() {
  const cartons = await prisma.carton.findMany({
    orderBy: { createdAt: "desc" },
    include: { goods: true, warehouse: true },
  })

  return NextResponse.json({ cartons: cartons.map(formatCarton) })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CartonPayload

    if (!body.cartonNo || !body.goodsId) {
      return NextResponse.json(
        { error: "cartonNo and goodsId are required" },
        { status: 400 }
      )
    }

    const created = await prisma.carton.create({
      data: {
        cartonNo: body.cartonNo.trim(),
        writtenCartonNo: body.writtenCartonNo?.trim(),
        trackingNo: body.trackingNo?.trim(),
        goodsId: Number(body.goodsId),
        packNo: body.packNo?.trim(),
        unitPcs: parseNumber(body.unitPcs) ?? undefined,
        weightKg: parseNumber(body.weightKg) ?? undefined,
        lengthCm: parseNumber(body.lengthCm) ?? undefined,
        widthCm: parseNumber(body.widthCm) ?? undefined,
        heightCm: parseNumber(body.heightCm) ?? undefined,
        cbm: parseNumber(body.cbm) ?? undefined,
        unitPrice: parseNumber(body.unitPrice) ?? undefined,
        currencyCode: body.currencyCode ?? undefined,
        shippingMark: body.shippingMark ?? undefined,
        remarks: body.remarks ?? undefined,
        copyNumber: body.copyNumber ?? undefined,
        notes: body.notes ?? undefined,
        warehouseId: body.warehouseId ? Number(body.warehouseId) : null,
        status: body.status ?? "AT_CHINA_WH",
        isCombinedCarton: false,
        childCartons: "[]",
      },
      include: { goods: true, warehouse: true },
    })

    return NextResponse.json(
      { carton: formatCarton(created) },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating carton", error)
    return NextResponse.json(
      { error: "Unable to create carton" },
      { status: 500 }
    )
  }
}
