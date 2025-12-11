"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Clock3,
  Package,
  PackageCheck,
  PackageX,
  Truck,
  Wallet,
  Warehouse,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

type Carton = {
  id: number
  cartonNo: string
  billedAmount?: number | null
  collectedAmount?: number | null
  deliveredAt?: string | null
  status?: string | null
  weightKg?: number | null
  cbm?: number | null
  goods?: { name?: string | null; nameCn?: string | null }
}

type Shipment = {
  id: number
  shipmentNo: string
  status: string
  fromWarehouse?: string | null
  toWarehouse?: string | null
  plannedShipDate?: string | null
  totalPrice?: number | null
  collectedAmount?: number | null
  ratePerKg?: number | null
  cartons?: string[]
  createdAt?: string
  cartonDetails?: Carton[]
}

type BoxRequest = {
  id: number
  status: string
  createdAt?: string
  carton?: { cartonNo: string }
}

type EnrichedShipment = Shipment & {
  billed: number
  collected: number
  due: number
  totalCartons: number
  deliveredCartons: number
  pendingCartons: number
  createdTs: number
}

type Tone = "emerald" | "blue" | "amber" | "violet"
type PipelineTone = "amber" | "blue" | "violet" | "emerald"

const currency = (value: number) =>
  `৳${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

const percent = (value: number) =>
  `${Math.round(Number.isFinite(value) ? value * 100 : 0)}%`

export default function Home() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [cartons, setCartons] = useState<Carton[]>([])
  const [boxRequests, setBoxRequests] = useState<BoxRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [shipmentRes, cartonRes, boxReqRes] = await Promise.all([
          fetch("/api/shipments", { signal: controller.signal }),
          fetch("/api/cartons", { signal: controller.signal }),
          fetch("/api/box-requests", { signal: controller.signal }),
        ])

        if (!shipmentRes.ok || !cartonRes.ok || !boxReqRes.ok) {
          throw new Error("Unable to load dashboard data")
        }

        const shipmentData = (await shipmentRes.json()) as { shipments: Shipment[] }
        const cartonData = (await cartonRes.json()) as { cartons: Carton[] }
        const boxData = (await boxReqRes.json()) as { requests: BoxRequest[] }

        setShipments(shipmentData.shipments ?? [])
        setCartons(cartonData.cartons ?? [])
        setBoxRequests(boxData.requests ?? [])
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        console.error(err)
        setError("Unable to load dashboard data. Please retry.")
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [])

  const dashboard = useMemo(() => {
    const rateSamples = shipments
      .map((s) => s.ratePerKg ?? 0)
      .filter((r) => r > 0)
    const averageRatePerKg =
      rateSamples.length > 0
        ? rateSamples.reduce((sum, r) => sum + r, 0) / rateSamples.length
        : 0

    const shipmentsEnriched: EnrichedShipment[] = shipments.map((s) => {
      const details = s.cartonDetails ?? []
      const collectedFromDetails = details.reduce(
        (sum, c) => sum + (c.collectedAmount ?? 0),
        0
      )
      const billedFromDetails = details.reduce(
        (sum, c) => sum + (c.billedAmount ?? 0),
        0
      )
      const billed = s.totalPrice ?? billedFromDetails
      const collected = Math.max(collectedFromDetails, s.collectedAmount ?? 0)
      const due = Math.max((billed ?? 0) - collected, 0)
      const totalCartons = details.length || s.cartons?.length || 0
      const deliveredCartons =
        details.filter(
          (c) =>
            Boolean(c.deliveredAt) ||
            (c.status ?? "").toUpperCase() === "DELIVERED"
        ).length || 0

      return {
        ...s,
        billed,
        collected,
        due,
        totalCartons,
        deliveredCartons,
        pendingCartons: Math.max(totalCartons - deliveredCartons, 0),
        createdTs: s.createdAt ? new Date(s.createdAt).getTime() : 0,
      }
    })

    const shipmentTotals = shipmentsEnriched.reduce(
      (acc, s) => {
        const status = (s.status ?? "").toUpperCase()
        acc.totalShipments += 1
        if (status === "DELIVERED") acc.deliveredShipments += 1
        else acc.inTransitShipments += 1
        acc.totalCartons += s.totalCartons
        acc.deliveredCartons += s.deliveredCartons
        acc.billed += s.billed ?? 0
        acc.collected += s.collected ?? 0
        acc.due += s.due ?? 0
        return acc
      },
      {
        totalShipments: 0,
        deliveredShipments: 0,
        inTransitShipments: 0,
        totalCartons: 0,
        deliveredCartons: 0,
        billed: 0,
        collected: 0,
        due: 0,
      }
    )
    shipmentTotals.pendingCartons = Math.max(
      shipmentTotals.totalCartons - shipmentTotals.deliveredCartons,
      0
    )

    const pipeline = cartons.reduce(
      (acc, carton) => {
        const status = (carton.status ?? "").toUpperCase()
        acc.total += 1
        acc.totalWeight += carton.weightKg ?? 0
        acc.totalCbm += carton.cbm ?? 0

        if (status === "DELIVERED") {
          acc.delivered += 1
        } else if (status === "BOX_REQUEST_PENDING") {
          acc.awaitingPrint += 1
        } else if (status.startsWith("IN_SHIPMENT")) {
          acc.inTransit += 1
        } else if (status === "AT_CHINA_WH") {
          acc.chinaReady += 1
          acc.readyWeight += carton.weightKg ?? 0
          const billed = carton.billedAmount ?? 0
          const estimated =
            billed > 0 ? billed : (carton.weightKg ?? 0) * averageRatePerKg
          acc.readyEstimatedRevenue += estimated
        } else {
          acc.other += 1
        }
        return acc
      },
      {
        total: 0,
        chinaReady: 0,
        inTransit: 0,
        delivered: 0,
        awaitingPrint: 0,
        other: 0,
        totalWeight: 0,
        totalCbm: 0,
        readyWeight: 0,
        readyEstimatedRevenue: 0,
      }
    )

    const topDueShipments = shipmentsEnriched
      .filter((s) => s.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 5)

    const topDueCartons = cartons
      .map((c) => ({
        ...c,
        due: Math.max((c.billedAmount ?? 0) - (c.collectedAmount ?? 0), 0),
      }))
      .filter((c) => c.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 5)

    const shipmentTrend = shipmentsEnriched
      .slice()
      .sort((a, b) => a.createdTs - b.createdTs)
      .slice(-6)

    const pendingRequests = boxRequests.filter(
      (r) => (r.status ?? "").toUpperCase() === "PENDING"
    ).length
    const approvedRequests = boxRequests.filter(
      (r) => (r.status ?? "").toUpperCase() === "APPROVED"
    ).length

    return {
      shipmentsEnriched,
      shipmentTotals,
      pipeline,
      topDueShipments,
      topDueCartons,
      shipmentTrend,
      pendingRequests,
      approvedRequests,
    }
  }, [boxRequests, cartons, shipments])

  return (
    <AppShell wide>
      {() => (
        <div className="flex flex-col gap-8">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white shadow-xl">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-10 top-[-10%] h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="absolute right-[-6%] bottom-[-10%] h-48 w-48 rounded-full bg-amber-300/25 blur-3xl" />
            </div>
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-200">
                  Owner dashboard
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Business at a glance
                </h1>
                <p className="max-w-2xl text-sm text-slate-200/80">
                  Track cartons, shipments, dues, and requests in one view. Built from the
                  live carton, shipment, and box-request flows.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/shipments/china"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/30 transition hover:bg-white/15"
                >
                  <Truck className="size-4" />
                  Go to shipments
                  <ArrowUpRight className="size-4" />
                </Link>
                <Link
                  href="/warehouse/china"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-200"
                >
                  <Package className="size-4" />
                  Manage China warehouse
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Ready in China WH"
              value={`${dashboard.pipeline.chinaReady} cartons`}
              sublabel={`Est. if shipped now: ${currency(dashboard.pipeline.readyEstimatedRevenue)} · Weight ready: ${dashboard.pipeline.readyWeight.toFixed(1)} kg`}
              icon={<Warehouse className="size-5" />}
              tone="violet"
              progress={
                dashboard.pipeline.total
                  ? dashboard.pipeline.chinaReady / dashboard.pipeline.total
                  : 0
              }
              loading={loading}
            />
            <StatCard
              title="Shipments delivered"
              value={`${dashboard.shipmentTotals.deliveredShipments} / ${dashboard.shipmentTotals.totalShipments}`}
              sublabel="Total consignments completed"
              icon={<Truck className="size-5" />}
              tone="emerald"
              progress={
                dashboard.shipmentTotals.totalShipments
                  ? dashboard.shipmentTotals.deliveredShipments /
                    dashboard.shipmentTotals.totalShipments
                  : 0
              }
              loading={loading}
            />
            <StatCard
              title="Cartons delivered"
              value={`${dashboard.shipmentTotals.deliveredCartons} / ${dashboard.shipmentTotals.totalCartons || cartons.length || 0}`}
              sublabel={`${dashboard.shipmentTotals.pendingCartons} cartons still on the road`}
              icon={<PackageCheck className="size-5" />}
              tone="blue"
              progress={
                (dashboard.shipmentTotals.totalCartons || cartons.length || 0)
                  ? dashboard.shipmentTotals.deliveredCartons /
                    (dashboard.shipmentTotals.totalCartons || cartons.length || 0)
                  : 0
              }
              loading={loading}
            />
            <StatCard
              title="Cash collected"
              value={currency(dashboard.shipmentTotals.collected)}
              sublabel={`Due: ${currency(dashboard.shipmentTotals.due)}`}
              icon={<Wallet className="size-5" />}
              tone="amber"
              progress={
                dashboard.shipmentTotals.billed
                  ? dashboard.shipmentTotals.collected / dashboard.shipmentTotals.billed
                  : 0
              }
              loading={loading}
            />
            <StatCard
              title="Box requests"
              value={`${dashboard.pendingRequests} pending`}
              sublabel={`${dashboard.approvedRequests} approved so far`}
              icon={<Boxes className="size-5" />}
              tone="violet"
              loading={loading}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Collections vs dues
                  </p>
                  <h2 className="text-xl font-semibold">Recent shipments</h2>
                </div>
                <Link
                  href="/shipments/china"
                  className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {dashboard.shipmentTrend.length === 0 && !loading ? (
                  <div className="col-span-2 rounded-xl border border-dashed border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                    No shipments yet. Create one from the warehouse view.
                  </div>
                ) : null}
                {loading
                  ? Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={`loading-${idx}`}
                        className="h-24 animate-pulse rounded-xl bg-muted/60"
                      />
                    ))
                  : dashboard.shipmentTrend.map((shipment) => {
                      const total = shipment.billed || 0
                      const collected = shipment.collected || 0
                      const due = shipment.due || 0
                      const collectedPct = total ? collected / total : 0
                      const duePct = total ? due / total : 0
                      const status = (shipment.status ?? "").toUpperCase()

                      return (
                        <div
                          key={shipment.id}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">{shipment.shipmentNo}</p>
                              <p className="text-xs text-muted-foreground">
                                {shipment.fromWarehouse} → {shipment.toWarehouse}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${
                                status === "DELIVERED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="bg-emerald-500"
                              style={{ width: percent(collectedPct) }}
                            />
                            <div
                              className="bg-amber-400"
                              style={{ width: percent(duePct) }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Collected {currency(collected)}</span>
                            <span>Due {currency(due)}</span>
                          </div>
                        </div>
                      )
                    })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Carton pipeline
                    </p>
                    <h3 className="text-lg font-semibold">Where cartons sit now</h3>
                  </div>
                  <BarChart3 className="size-5 text-muted-foreground" />
                </div>
                <div className="mt-4 space-y-3">
                  <PipelineRow
                    label="Awaiting printed boxes"
                    value={dashboard.pipeline.awaitingPrint}
                    total={dashboard.pipeline.total}
                    tone="amber"
                  />
                  <PipelineRow
                    label="Ready at China warehouse"
                    value={dashboard.pipeline.chinaReady}
                    total={dashboard.pipeline.total}
                    tone="blue"
                  />
                  <PipelineRow
                    label="In shipment"
                    value={dashboard.pipeline.inTransit}
                    total={dashboard.pipeline.total}
                    tone="violet"
                  />
                  <PipelineRow
                    label="Delivered to BD"
                    value={dashboard.pipeline.delivered}
                    total={dashboard.pipeline.total}
                    tone="emerald"
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.2em]">
                      Total weight
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {dashboard.pipeline.totalWeight.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.2em]">Total CBM</p>
                    <p className="text-base font-semibold text-foreground">
                      {dashboard.pipeline.totalCbm.toFixed(2)} m³
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Quick actions
                    </p>
                    <h3 className="text-lg font-semibold">Move work forward</h3>
                  </div>
                  <Clock3 className="size-5 text-muted-foreground" />
                </div>
                <div className="mt-4 grid gap-3">
                  <ActionRow
                    title="Clear pending box requests"
                    description="Approve printed carton numbers to free up cartons for shipping."
                    href="/boxrequest"
                    icon={<PackageX className="size-4" />}
                  />
                  <ActionRow
                    title="Ship cartons in China WH"
                    description="Select cartons and create a shipment with rate-per-kg or billed amounts."
                    href="/warehouse/china"
                    icon={<Truck className="size-4" />}
                  />
                  <ActionRow
                    title="Audit open dues"
                    description="Collect outstanding amounts before marking cartons delivered."
                    href="/shipments/china"
                    icon={<AlertTriangle className="size-4" />}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Outstanding by shipment
                  </p>
                  <h3 className="text-lg font-semibold">Highest dues</h3>
                </div>
                <AlertTriangle className="size-5 text-amber-500" />
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
                ) : dashboard.topDueShipments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No outstanding shipments—great job.
                  </p>
                ) : (
                  dashboard.topDueShipments.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{s.shipmentNo}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.pendingCartons} cartons left · {s.fromWarehouse} → {s.toWarehouse}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-700">
                          {currency(s.due)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Collected {currency(s.collected)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Outstanding by carton
                  </p>
                  <h3 className="text-lg font-semibold">Cartons with dues</h3>
                </div>
                <PackageX className="size-5 text-rose-500" />
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
                ) : dashboard.topDueCartons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No carton-level dues pending.
                  </p>
                ) : (
                  dashboard.topDueCartons.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{c.cartonNo}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.goods?.name ?? "No goods linked"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-rose-700">
                          {currency(
                            Math.max((c.billedAmount ?? 0) - (c.collectedAmount ?? 0), 0)
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Collected {currency(c.collectedAmount ?? 0)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  )
}

function StatCard({
  title,
  value,
  sublabel,
  icon,
  tone,
  progress,
  loading,
}: {
  title: string
  value: string
  sublabel: string
  icon: ReactNode
  tone: Tone
  progress?: number
  loading?: boolean
}) {
  const toneMap: Record<Tone, string> = {
    emerald: "from-emerald-50 via-white to-white border-emerald-200 text-emerald-900",
    blue: "from-blue-50 via-white to-white border-blue-200 text-blue-900",
    amber: "from-amber-50 via-white to-white border-amber-200 text-amber-900",
    violet: "from-violet-50 via-white to-white border-violet-200 text-violet-900",
  }

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${toneMap[tone]}`}
    >
      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-white/60" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white/60 p-2">{icon}</div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {title}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-semibold text-foreground">{value}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
          {progress !== undefined ? (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
                style={{ width: percent(Math.min(Math.max(progress, 0), 1)) }}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function PipelineRow({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: PipelineTone
}) {
  const toneMap: Record<PipelineTone, string> = {
    amber: "bg-amber-400",
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
  }
  const pct = total ? Math.min(Math.max(value / total, 0), 1) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">
          {value} ({percent(pct)})
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${toneMap[tone]}`} style={{ width: percent(pct) }} />
      </div>
    </div>
  )
}

function ActionRow({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description: string
  href: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 transition hover:border-primary/50 hover:shadow-sm"
    >
      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRight className="ml-auto mt-1 size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </Link>
  )
}
