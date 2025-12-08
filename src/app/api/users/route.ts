import { NextResponse } from "next/server"

import { getUsers } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const users = await getUsers()
  return NextResponse.json({ users })
}
