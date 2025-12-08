import { prisma } from "@/lib/prisma"

export type UserRecord = {
  id: number
  name: string
  email: string
  role: string
  location: string
  status: "active" | "inactive" | "pending"
}

const seedUsers: Omit<UserRecord, "id">[] = [
  {
    name: "Amira Khan",
    email: "amira.khan@example.com",
    role: "Operations Manager",
    location: "Dhaka",
    status: "active",
  },
  {
    name: "Luis Chen",
    email: "luis.chen@example.com",
    role: "Warehouse Lead",
    location: "Shenzhen",
    status: "active",
  },
  {
    name: "Priya Sen",
    email: "priya.sen@example.com",
    role: "Logistics Analyst",
    location: "Hong Kong",
    status: "pending",
  },
  {
    name: "Michael Owusu",
    email: "michael.owusu@example.com",
    role: "Finance Controller",
    location: "Singapore",
    status: "active",
  },
  {
    name: "Sara Ahmed",
    email: "sara.ahmed@example.com",
    role: "Compliance Officer",
    location: "Kuala Lumpur",
    status: "inactive",
  },
]

export async function ensureUserSeed() {
  const count = await prisma.user.count()
  if (count === 0) {
    await prisma.user.createMany({
      data: seedUsers,
    })
  }
}

export async function getUsers(): Promise<UserRecord[]> {
  await ensureUserSeed()
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
  })

  return users.map((user) => ({
    ...user,
    status: user.status as UserRecord["status"],
  }))
}
