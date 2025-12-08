import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const goods = await prisma.goods.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ goods })
}
