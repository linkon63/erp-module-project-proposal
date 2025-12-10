import { NextResponse } from "next/server"

import type { Carton, Goods, Warehouse } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CartonPayload = {
  cartonNo: string
  writtenCartonNo?: string
  trackingNo?: string
  goodsId?: number
  goodsNameEn?: string
  goodsNameCn?: string
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

export async function GET(req: Request) {
  const url = new URL(req.url)
  const idParam = url.searchParams.get("id")

  if (idParam) {
    const id = Number(idParam)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "id must be a number" }, { status: 400 })
    }
    const carton = await prisma.carton.findUnique({
      where: { id },
      include: { goods: true, warehouse: true },
    })
    if (!carton || carton.status === "DELETED") {
      return NextResponse.json({ error: "Carton not found" }, { status: 404 })
    }
    return NextResponse.json({ carton: formatCarton(carton) })
  }

  const cartons = await prisma.carton.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    include: { goods: true, warehouse: true },
  })

  return NextResponse.json({ cartons: cartons.map(formatCarton) })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CartonPayload

    const cartonNo = body.cartonNo?.trim()
    const goodsNameEn = body.goodsNameEn?.trim()
    const goodsNameCn = body.goodsNameCn?.trim()
    const shippingMark = body.shippingMark?.trim()
    const requestedWarehouseId = body.warehouseId ?? null

    const hasGoodsId = Boolean(body.goodsId)
    const hasGoodsNames = Boolean(goodsNameEn && goodsNameCn)

    if (!cartonNo || (!hasGoodsId && !hasGoodsNames)) {
      return NextResponse.json(
        { error: "cartonNo and goods (via goodsId or EN/CN names) are required" },
        { status: 400 }
      )
    }

    let goodsId = body.goodsId ? Number(body.goodsId) : null

    if (!goodsId && hasGoodsNames) {
      const goods = await prisma.goods.upsert({
        where: { name: goodsNameEn },
        update: { nameCn: goodsNameCn ?? undefined, shippingMark: shippingMark ?? undefined },
        create: { name: goodsNameEn, nameCn: goodsNameCn ?? undefined, shippingMark: shippingMark ?? undefined },
      })
      goodsId = goods.id
    }

    if (!goodsId) {
      return NextResponse.json(
        { error: "Unable to determine goods for this carton" },
        { status: 400 }
      )
    }

    let warehouseId: number | null =
      requestedWarehouseId !== null && requestedWarehouseId !== undefined
        ? Number(requestedWarehouseId)
        : null

    if (!warehouseId) {
      const firstWarehouse = await prisma.warehouse.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
      })
      warehouseId = firstWarehouse?.id ?? null
    }

    if (!warehouseId) {
      return NextResponse.json(
        { error: "A warehouse could not be determined" },
        { status: 400 }
      )
    }

    const created = await prisma.carton.create({
      data: {
        cartonNo,
        printedCartonNo: cartonNo,
        writtenCartonNo: body.writtenCartonNo?.trim(),
        trackingNo: body.trackingNo?.trim(),
        goodsId,
        packNo: body.packNo?.trim(),
        unitPcs: parseNumber(body.unitPcs) ?? undefined,
        weightKg: parseNumber(body.weightKg) ?? undefined,
        lengthCm: parseNumber(body.lengthCm) ?? undefined,
        widthCm: parseNumber(body.widthCm) ?? undefined,
        heightCm: parseNumber(body.heightCm) ?? undefined,
        cbm: parseNumber(body.cbm) ?? undefined,
        unitPrice: parseNumber(body.unitPrice) ?? undefined,
        currencyCode: body.currencyCode ?? undefined,
        shippingMark: shippingMark ?? undefined,
        remarks: body.remarks ?? undefined,
        copyNumber: body.copyNumber ?? undefined,
        notes: body.notes ?? undefined,
        warehouseId,
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

export async function DELETE(req: Request) {
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

    const deleted = await prisma.carton.update({
      where: { id },
      data: { status: "DELETED" },
      include: { goods: true, warehouse: true },
    })

    return NextResponse.json({ carton: formatCarton(deleted) })
  } catch (error) {
    console.error("Error deleting carton", error)
    return NextResponse.json(
      { error: "Unable to delete carton" },
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

    const body = (await req.json()) as CartonPayload

    const cartonNo = body.cartonNo?.trim()
    const goodsNameEn = body.goodsNameEn?.trim()
    const goodsNameCn = body.goodsNameCn?.trim()
    const shippingMark = body.shippingMark?.trim()
    const requestedWarehouseId = body.warehouseId ?? null

    const hasGoodsId = Boolean(body.goodsId)
    const hasGoodsNames = Boolean(goodsNameEn && goodsNameCn)

    if (!cartonNo || (!hasGoodsId && !hasGoodsNames)) {
      return NextResponse.json(
        { error: "cartonNo and goods (via goodsId or EN/CN names) are required" },
        { status: 400 }
      )
    }

    let goodsId = body.goodsId ? Number(body.goodsId) : null

    if (!goodsId && hasGoodsNames) {
      const goods = await prisma.goods.upsert({
        where: { name: goodsNameEn },
        update: { nameCn: goodsNameCn ?? undefined, shippingMark: shippingMark ?? undefined },
        create: { name: goodsNameEn, nameCn: goodsNameCn ?? undefined, shippingMark: shippingMark ?? undefined },
      })
      goodsId = goods.id
    }

    if (!goodsId) {
      return NextResponse.json(
        { error: "Unable to determine goods for this carton" },
        { status: 400 }
      )
    }

    let warehouseId: number | null =
      requestedWarehouseId !== null && requestedWarehouseId !== undefined
        ? Number(requestedWarehouseId)
        : null

    if (!warehouseId) {
      const firstWarehouse = await prisma.warehouse.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
      })
      warehouseId = firstWarehouse?.id ?? null
    }

    if (!warehouseId) {
      return NextResponse.json(
        { error: "A warehouse could not be determined" },
        { status: 400 }
      )
    }

    const updated = await prisma.carton.update({
      where: { id },
      data: {
        cartonNo,
        printedCartonNo: cartonNo,
        writtenCartonNo: body.writtenCartonNo?.trim() ?? null,
        trackingNo: body.trackingNo?.trim() ?? null,
        goodsId,
        packNo: body.packNo?.trim() ?? null,
        unitPcs: parseNumber(body.unitPcs) ?? undefined,
        weightKg: parseNumber(body.weightKg) ?? undefined,
        lengthCm: parseNumber(body.lengthCm) ?? undefined,
        widthCm: parseNumber(body.widthCm) ?? undefined,
        heightCm: parseNumber(body.heightCm) ?? undefined,
        cbm: parseNumber(body.cbm) ?? undefined,
        unitPrice: parseNumber(body.unitPrice) ?? undefined,
        currencyCode: body.currencyCode ?? undefined,
        shippingMark: shippingMark ?? undefined,
        remarks: body.remarks ?? undefined,
        copyNumber: body.copyNumber ?? undefined,
        notes: body.notes ?? undefined,
        warehouseId,
        status: body.status ?? undefined,
      },
      include: { goods: true, warehouse: true },
    })

    return NextResponse.json({ carton: formatCarton(updated) })
  } catch (error) {
    console.error("Error updating carton", error)
    return NextResponse.json(
      { error: "Unable to update carton" },
      { status: 500 }
    )
  }
}
