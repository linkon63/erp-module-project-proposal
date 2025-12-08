import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CombinePayload = {
  cartonNo: string
  childCartonNos: string[]
  goodsId?: number
  warehouseId?: number | null
  packNo?: string
  unitPcs?: number
  weightKg?: number
  cbm?: number
  shippingMark?: string
  status?: string
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

function parseChildCartons(value: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CombinePayload
    if (!body.cartonNo || !Array.isArray(body.childCartonNos) || body.childCartonNos.length < 2) {
      return NextResponse.json(
        { error: "cartonNo and at least two childCartonNos are required" },
        { status: 400 }
      )
    }

    const children = await prisma.carton.findMany({
      where: { cartonNo: { in: body.childCartonNos } },
    })

    if (children.length !== body.childCartonNos.length) {
      return NextResponse.json(
        { error: "One or more child cartons were not found" },
        { status: 400 }
      )
    }

    const goodsId = body.goodsId ?? children[0]?.goodsId
    const warehouseId = body.warehouseId ?? children[0]?.warehouseId ?? null

    if (!goodsId) {
      return NextResponse.json(
        { error: "A goodsId is required to create the combined carton" },
        { status: 400 }
      )
    }

    const combined = await prisma.carton.create({
      data: {
        cartonNo: body.cartonNo,
        goodsId,
        warehouseId,
        packNo: body.packNo,
        unitPcs: parseNumber(body.unitPcs) ?? undefined,
        weightKg: parseNumber(body.weightKg) ?? undefined,
        cbm: parseNumber(body.cbm) ?? undefined,
        shippingMark: body.shippingMark,
        status: body.status ?? "COMBINED",
        isCombinedCarton: true,
        childCartons: JSON.stringify(body.childCartonNos),
      },
      include: { goods: true, warehouse: true },
    })

    await prisma.carton.updateMany({
      where: { cartonNo: { in: body.childCartonNos } },
      data: { status: "IN_COMBINED" },
    })

    return NextResponse.json({
      carton: {
        ...combined,
        childCartons: parseChildCartons(combined.childCartons as string),
      },
      updatedChildren: children.map((child) => ({
        ...child,
        status: "IN_COMBINED",
      })),
    })
  } catch (error) {
    console.error("Error combining cartons", error)
    return NextResponse.json(
      { error: "Unable to combine cartons" },
      { status: 500 }
    )
  }
}
