import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const idParam = searchParams.get("id")

  if (idParam) {
    const id = Number(idParam)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "id must be a number" }, { status: 400 })
    }
    const product = await prisma.goods.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    return NextResponse.json({ product })
  }

  const products = await prisma.goods.findMany({
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ products })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; nameCn?: string; shippingMark?: string }
    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const created = await prisma.goods.create({
      data: {
        name,
        nameCn: body.nameCn?.trim() || undefined,
        shippingMark: body.shippingMark?.trim() || undefined,
      },
    })

    return NextResponse.json({ product: created }, { status: 201 })
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : null
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Product name must be unique" },
        { status: 409 }
      )
    }
    console.error("Error creating product", error)
    return NextResponse.json({ error: "Unable to create product" }, { status: 500 })
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

    const body = (await req.json()) as { name?: string; nameCn?: string; shippingMark?: string }
    if (!body.name && !body.nameCn && !body.shippingMark) {
      return NextResponse.json(
        { error: "Provide name, nameCn, or shippingMark to update" },
        { status: 400 }
      )
    }

    const updated = await prisma.goods.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? undefined,
        nameCn: body.nameCn?.trim() ?? undefined,
        shippingMark: body.shippingMark?.trim() ?? undefined,
      },
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : null
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Product name must be unique" },
        { status: 409 }
      )
    }
    console.error("Error updating product", error)
    return NextResponse.json({ error: "Unable to update product" }, { status: 500 })
  }
}
