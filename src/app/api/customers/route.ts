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
    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }
    return NextResponse.json({ customer })
  }

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ customers })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; phone?: string; notes?: string }
    const name = body.name?.trim()
    const phone = body.phone?.trim()
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const created = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        notes: body.notes?.trim() || undefined,
      },
    })

    return NextResponse.json({ customer: created }, { status: 201 })
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : null
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Customer with this name already exists" },
        { status: 409 }
      )
    }
    console.error("Error creating customer", error)
    return NextResponse.json({ error: "Unable to create customer" }, { status: 500 })
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

    const body = (await req.json()) as { name?: string; phone?: string; notes?: string }
    const name = body.name?.trim()
    const phone = body.phone?.trim()
    if (!name && !phone && !body.notes) {
      return NextResponse.json(
        { error: "Provide name, phone, or notes to update" },
        { status: 400 }
      )
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name ?? undefined,
        phone: phone ?? undefined,
        notes: body.notes?.trim() ?? undefined,
      },
    })

    return NextResponse.json({ customer: updated })
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : null
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Customer with this name already exists" },
        { status: 409 }
      )
    }
    console.error("Error updating customer", error)
    return NextResponse.json({ error: "Unable to update customer" }, { status: 500 })
  }
}
