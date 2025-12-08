import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  })

  return NextResponse.json({ warehouses })
}
