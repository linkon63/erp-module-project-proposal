import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type BoxRequestItem = {
  cartonId: number
  printedCartonNo?: string
  notes?: string
}

type BoxRequestPayload = {
  requests?: BoxRequestItem[]
  // fallback fields for backward compatibility
  cartonIds?: number[]
  printedCartonNo?: string
  notes?: string
}

function parseIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return []
  return ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
}

function normalizeRequests(body: BoxRequestPayload): BoxRequestItem[] {
  if (Array.isArray(body.requests)) {
    return body.requests
      .map((req) => ({
        cartonId: Number(req?.cartonId),
        printedCartonNo:
          typeof req?.printedCartonNo === "string" ? req.printedCartonNo.trim() : undefined,
        notes: typeof req?.notes === "string" ? req.notes : undefined,
      }))
      .filter((req) => Number.isInteger(req.cartonId) && req.cartonId > 0)
  }

  // fallback: single printedCartonNo applied to cartonIds array
  const ids = parseIds(body.cartonIds)
  const printed = body.printedCartonNo?.trim() || undefined
  if (ids.length) {
    return ids.map((id) => ({ cartonId: id, printedCartonNo: printed, notes: body.notes }))
  }

  return []
}

export async function GET() {
  const requests = await prisma.boxRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      carton: { include: { goods: true, warehouse: true } },
    },
  })

  return NextResponse.json({ requests })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BoxRequestPayload
    const requests = normalizeRequests(body)

    if (!requests.length) {
      return NextResponse.json(
        { error: "requests array is required" },
        { status: 400 }
      )
    }

    const cartonIds = requests.map((r) => r.cartonId)
    const cartons = await prisma.carton.findMany({
      where: { id: { in: cartonIds } },
      select: { id: true },
    })
    if (cartons.length !== cartonIds.length) {
      return NextResponse.json(
        { error: "One or more cartons were not found" },
        { status: 404 }
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const createdRequests = await Promise.all(
        requests.map((req) =>
          tx.boxRequest.create({
            data: {
              cartonId: req.cartonId,
              printedCartonNo: req.printedCartonNo ?? null,
              notes: req.notes ?? body.notes ?? undefined,
              status: "PENDING",
            },
            include: { carton: true },
          })
        )
      )

      await tx.carton.updateMany({
        where: { id: { in: cartonIds } },
        data: { status: "BOX_REQUEST_PENDING" },
      })

      return createdRequests
    })

    return NextResponse.json({ requests: created })
  } catch (error) {
    console.error("Error creating box request", error)
    const message =
      error instanceof Error ? error.message : "Unable to create box request"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get("id")
    const body = (await req.json()) as BoxRequestPayload
    const printedCartonNo =
      body.printedCartonNo?.trim() ?? body.requests?.[0]?.printedCartonNo?.trim()

    const bulkIds = Array.isArray(body.requests)
      ? body.requests
          .map((r) => {
            const maybeId =
              // support { id }, { requestId }, or { cartonId }
              (typeof r === "object" && r !== null && "id" in r && (r as { id?: unknown }).id) ??
              (typeof r === "object" && r !== null && "requestId" in r && (r as { requestId?: unknown }).requestId) ??
              (typeof r === "object" && r !== null && "cartonId" in r && (r as { cartonId?: unknown }).cartonId)
            const num = Number(maybeId)
            return Number.isInteger(num) && num > 0 ? num : null
          })
          .filter((n): n is number => n !== null)
      : []

    const explicitRequestIds = Array.isArray((body as { requestIds?: unknown }).requestIds)
      ? (body as { requestIds?: unknown }).requestIds!
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : []

    const idsToApprove = explicitRequestIds.length ? explicitRequestIds : bulkIds

    // Bulk approve path
    if (!idParam && idsToApprove.length) {
      if (!printedCartonNo) {
        return NextResponse.json(
          { error: "printedCartonNo is required" },
          { status: 400 }
        )
      }

      const requests = await prisma.boxRequest.findMany({
        where: { id: { in: idsToApprove } },
        include: { carton: true },
      })
      if (requests.length !== idsToApprove.length) {
        return NextResponse.json(
          { error: "One or more box requests not found" },
          { status: 404 }
        )
      }

      const cartonIds = requests.map((r) => r.cartonId)

      const updated = await prisma.$transaction(async (tx) => {
        await tx.boxRequest.updateMany({
          where: { id: { in: idsToApprove } },
          data: {
            printedCartonNo,
            notes: body.notes ?? undefined,
            status: "APPROVED",
          },
        })

        await tx.carton.updateMany({
          where: { id: { in: cartonIds } },
          data: {
            cartonNo: printedCartonNo,
            printedCartonNo,
            status: "AT_CHINA_WH",
          },
        })

        return tx.boxRequest.findMany({
          where: { id: { in: idsToApprove } },
          include: { carton: { include: { goods: true, warehouse: true } } },
        })
      })

      return NextResponse.json({ requests: updated })
    }

    // Single approve path
    if (!idParam) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }
    const id = Number(idParam)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "id must be a number" }, { status: 400 })
    }

    if (!printedCartonNo) {
      return NextResponse.json(
        { error: "printedCartonNo is required" },
        { status: 400 }
      )
    }

    const boxRequest = await prisma.boxRequest.findUnique({
      where: { id },
      include: { carton: { include: { goods: true, warehouse: true } } },
    })

    if (!boxRequest) {
      return NextResponse.json({ error: "Box request not found" }, { status: 404 })
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.boxRequest.update({
        where: { id },
        data: {
          printedCartonNo,
          notes: body.notes ?? undefined,
          status: "APPROVED",
        },
      })

      await tx.carton.update({
        where: { id: boxRequest.cartonId },
        data: {
          cartonNo: printedCartonNo,
          printedCartonNo,
          status: "AT_CHINA_WH",
        },
      })

      return updated
    })

    const refreshed = await prisma.boxRequest.findUnique({
      where: { id },
      include: { carton: { include: { goods: true, warehouse: true } } },
    })

    return NextResponse.json({
      request: updatedRequest,
      carton: refreshed?.carton,
    })
  } catch (error) {
    console.error("Error approving box request", error)
    return NextResponse.json(
      { error: "Unable to approve box request" },
      { status: 500 }
    )
  }
}
