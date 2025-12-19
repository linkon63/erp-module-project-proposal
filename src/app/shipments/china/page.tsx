"use client"

import { useEffect, useMemo, useState } from "react"
import { Package, PackageCheck, PackageX, Truck, Wallet } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type Shipment = {
  id: number
  shipmentNo: string
  fromWarehouse?: string | null
  toWarehouse?: string | null
  plannedShipDate?: string | null
  status: string
  cartons: string[]
  totalPrice?: number | null
  collectedAmount?: number | null
  createdAt?: string
  cartonDetails?: CartonDetail[]
}

type CartonDetail = {
  id: number
  cartonNo: string
  writtenCartonNo: string | null
  trackingNo: string | null
  packNo: string | null
  unitPcs: number | null
  weightKg: number | null
  cbm: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  shippingMark: string | null
  status: string
  billedAmount?: number | null
  collectedAmount?: number | null
  deliveredAt?: string | null
  customer?: { name: string; phone: string | null }
  goods?: { name: string; nameCn: string | null }
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [cartonCollectInputs, setCartonCollectInputs] = useState<Record<number, string>>({})
  const [savingCartonId, setSavingCartonId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: "error" | "info" } | null>(
    null
  )

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/shipments")
        const data = (await res.json()) as { shipments: Shipment[] }
        setShipments(data.shipments ?? [])
        const initialCartonCollects: Record<number, string> = {}
        setCartonCollectInputs(initialCartonCollects)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const applyCartonUpdate = (shipmentId: number, updatedCarton: CartonDetail) => {
    let shouldMarkShipmentDelivered = false
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s
        const nextDetails = (s.cartonDetails ?? []).map((c) =>
          c.id === updatedCarton.id ? { ...c, ...updatedCarton } : c
        )
        const collectedSum = nextDetails.reduce(
          (sum, c) => sum + (c.collectedAmount ?? 0),
          0
        )
        const billedSum = nextDetails.reduce(
          (sum, c) => sum + (c.billedAmount ?? 0),
          0
        )
        const totalPrice = s.totalPrice ?? billedSum
        const allDelivered = nextDetails.length > 0 && nextDetails.every((c) => {
          const statusUpper = (c.status ?? "").toUpperCase()
          return Boolean(c.deliveredAt) || statusUpper === "DELIVERED"
        })
        if (allDelivered && s.status !== "DELIVERED") {
          shouldMarkShipmentDelivered = true
        }
        return {
          ...s,
          status: allDelivered ? "DELIVERED" : s.status,
          cartonDetails: nextDetails,
          collectedAmount: collectedSum,
          totalPrice,
        }
      })
    )
    if (shouldMarkShipmentDelivered) {
      fetch(`/api/shipments?id=${shipmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      }).catch((err) => console.error("Failed to mark shipment delivered", err))
    }
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const summary = useMemo(() => {
    let totalShipments = shipments.length
    let completedShipments = 0
    let totalCartons = 0
    let deliveredCartons = 0
    let totalAmount = 0
    let collectedAmount = 0

    shipments.forEach((s) => {
      const statusUpper = (s.status ?? "").toUpperCase()
      const allCartonsDelivered =
        (s.cartonDetails?.length ?? 0) > 0 &&
        s.cartonDetails.every((c) => {
          const cartonStatus = (c.status ?? "").toUpperCase()
          return Boolean(c.deliveredAt) || cartonStatus === "DELIVERED"
        })
      const shipmentDelivered = statusUpper === "DELIVERED" || allCartonsDelivered
      if (shipmentDelivered) completedShipments += 1
      const cartonCount = s.cartonDetails?.length ?? s.cartons?.length ?? 0
      totalCartons += cartonCount
      deliveredCartons +=
        s.cartonDetails?.filter(
          (c) => Boolean(c.deliveredAt) || (c.status ?? "").toUpperCase() === "DELIVERED"
        ).length ?? 0

      const collectedFromDetails =
        s.cartonDetails?.reduce((sum, c) => sum + (c.collectedAmount ?? 0), 0) ?? 0
      const billedFromDetails =
        s.cartonDetails?.reduce((sum, c) => sum + (c.billedAmount ?? 0), 0) ?? 0
      const total = s.totalPrice ?? billedFromDetails
      const collected = Math.max(collectedFromDetails, s.collectedAmount ?? 0)

      totalAmount += total ?? 0
      collectedAmount += collected ?? 0
    })

    const dueAmount = Math.max(totalAmount - collectedAmount, 0)
    const pendingCartons = Math.max(totalCartons - deliveredCartons, 0)

    return {
      totalShipments,
      completedShipments,
      totalCartons,
      deliveredCartons,
      pendingCartons,
      totalAmount,
      collectedAmount,
      dueAmount,
    }
  }, [shipments])

  return (
    <AppShell wide>
      {() => (
        <>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Plan shipments from China to Bangladesh
            </h1>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm">
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
                    Shipments delivered
                  </p>
                  <p className="text-2xl font-semibold text-emerald-900">
                    {summary.completedShipments} / {summary.totalShipments}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="rounded-full bg-slate-200 p-2 text-slate-800">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-700">
                    Total cartons
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {summary.totalCartons}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-800">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
                    Delivered cartons
                  </p>
                  <p className="text-2xl font-semibold text-emerald-900">
                    {summary.deliveredCartons}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="rounded-full bg-amber-100 p-2 text-amber-800">
                  <PackageX className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700">
                    Undelivered cartons
                  </p>
                  <p className="text-2xl font-semibold text-amber-900">
                    {summary.pendingCartons}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="rounded-full bg-blue-100 p-2 text-blue-800">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-blue-700">
                    Collected / Due
                  </p>
                  <p className="text-2xl font-semibold text-blue-900">
                    ৳{summary.collectedAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-blue-700">
                    Due: ৳{summary.dueAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
            
            <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Shipments
                </p>
                <h2 className="text-xl font-semibold">All planned shipments</h2>
              </div>
              {loading ? (
                <span className="text-xs text-muted-foreground">Loading…</span>
              ) : (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {shipments.length} total
                </span>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              {shipments.map((shipment) => {
              const collectedFromCartons =
                shipment.cartonDetails?.reduce(
                  (sum, c) => sum + (c.collectedAmount ?? 0),
                  0
                ) ?? 0
              const billedFromCartons =
                shipment.cartonDetails?.reduce(
                  (sum, c) => sum + (c.billedAmount ?? 0),
                  0
                ) ?? 0
              const total = shipment.totalPrice ?? billedFromCartons
              const collectedTotal = Math.max(collectedFromCartons, shipment.collectedAmount ?? 0)
              const due = Math.max((total ?? 0) - collectedTotal, 0)
              const formattedTotal = (total ?? 0).toFixed(2)
              const formattedCollected = collectedTotal.toFixed(2)
              const formattedDue = due.toFixed(2)
              const totalCartons =
                shipment.cartonDetails?.length ??
                shipment.cartons?.length ??
                0
              const deliveredCartons =
                shipment.cartonDetails?.filter(
                  (c) => Boolean(c.deliveredAt) || (c.status ?? "").toUpperCase() === "DELIVERED"
                ).length ?? 0
              const pendingCartons = Math.max(totalCartons - deliveredCartons, 0)
              const isExpanded = expanded.has(shipment.id)
              const toggleExpanded = () =>
                setExpanded((prev) => {
                  const next = new Set(prev)
                  if (next.has(shipment.id)) {
                    next.delete(shipment.id)
                  } else {
                    next.add(shipment.id)
                  }
                  return next
                })
              const isShipmentDelivered = shipment.status === "DELIVERED"
              const allCartonsDelivered =
                (shipment.cartonDetails?.length ?? 0) > 0 &&
                shipment.cartonDetails.every((c) => {
                  const statusUpper = (c.status ?? "").toUpperCase()
                  return Boolean(c.deliveredAt) || statusUpper === "DELIVERED"
                })
              const shipmentComplete = isShipmentDelivered || allCartonsDelivered
              const cardClasses = shipmentComplete
                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                : "rounded-xl border border-border bg-background/60 px-4 py-3"

              return (
                <div
                  key={shipment.id}
                  className={cardClasses + " cursor-pointer"}
                  role="button"
                  aria-expanded={isExpanded}
                  onClick={toggleExpanded}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold">
                          {shipment.shipmentNo}
                        </p>
                        <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
                          {shipment.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                          Cartons: {totalCartons}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          Delivered: {deliveredCartons}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          Left: {pendingCartons}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shipment.fromWarehouse} → {shipment.toWarehouse}
                      </p>
                      {shipment.plannedShipDate ? (
                        <p className="text-xs text-muted-foreground">
                          Planned:{" "}
                          {new Date(shipment.plannedShipDate).toLocaleDateString()}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span className="rounded-lg bg-primary/10 px-3 py-1 text-primary">
                          Total: {formattedTotal}
                        </span>
                        <span className="rounded-lg bg-emerald-50 px-3 py-1 text-emerald-700">
                          Collected: {formattedCollected}
                        </span>
                        <span className="rounded-lg bg-amber-50 px-3 py-1 text-amber-700">
                          Due: {formattedDue}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpanded()
                        }}
                      >
                        {isExpanded ? "Hide cartons" : "View cartons"}
                      </Button>
                    </div>
                    </div>
                  {isExpanded ? (
                    <div
                      className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {shipment.cartonDetails && shipment.cartonDetails.length ? (
                        <>
                      {(() => {
                        const totalWeight = shipment.cartonDetails?.reduce(
                          (sum, c) => sum + (c.weightKg ?? 0),
                          0
                        ) ?? 0
                        const totalBilled = shipment.cartonDetails?.reduce(
                          (sum, c) => sum + (c.billedAmount ?? 0),
                          0
                        ) ?? 0
                        const totalCollected = shipment.cartonDetails?.reduce(
                          (sum, c) => sum + (c.collectedAmount ?? 0),
                          0
                        ) ?? 0
                        const totalDue = Math.max(totalBilled - totalCollected, 0)
                        return (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[820px] border-collapse text-xs">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="border border-border px-2 py-1 text-left">Carton #</th>
                              <th className="border border-border px-2 py-1 text-left">Written #</th>
                              <th className="border border-border px-2 py-1 text-left">Name (EN / CN)</th>
                              <th className="border border-border px-2 py-1 text-left">Pack #</th>
                              <th className="border border-border px-2 py-1 text-left">Weight (kg)</th>
                              <th className="border border-border px-2 py-1 text-left">Shipping mark</th>
                              <th className="border border-border px-2 py-1 text-left">Billed</th>
                              <th className="border border-border px-2 py-1 text-left">Due</th>
                              <th className="border border-border px-2 py-1 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shipment.cartonDetails.map((c) => {
                              const billed =
                                Math.round(((c.billedAmount ?? 0) + Number.EPSILON) * 100) / 100
                              const collected =
                                Math.round(((c.collectedAmount ?? 0) + Number.EPSILON) * 100) / 100
                              const due =
                                Math.max(
                                  Math.round(((billed - collected) + Number.EPSILON) * 100) / 100,
                                  0
                                )
                              const displayBilled = billed.toFixed(2)
                              const displayDue = due.toFixed(2)
                              const statusUpper = (c.status ?? "").toUpperCase()
                              const isCartonDelivered =
                                Boolean(c.deliveredAt) || statusUpper === "DELIVERED" || isShipmentDelivered
                              const rowClass = isCartonDelivered ? "bg-emerald-50" : "bg-card"
                              const rawInput = cartonCollectInputs[c.id] ?? ""
                              const parsedAmount = Number(rawInput)
                              const roundedAmount = Math.round((Number.isNaN(parsedAmount) ? 0 : parsedAmount) * 100) / 100
                              const exceedsDue = roundedAmount > due && due > 0
                              const invalidAmount = Number.isNaN(parsedAmount) || roundedAmount <= 0
                              const disableCollect = isCartonDelivered || savingCartonId === c.id
                              const isFullyCollected = due <= 0
                              return (
                                <tr key={c.id} className={rowClass}>
                                  <td className="border border-border px-2 py-1 font-semibold text-foreground">
                                    {c.cartonNo}
                                  </td>
                                  <td className="border border-border px-2 py-1">
                                    {c.writtenCartonNo ?? "—"}
                                  </td>
                                  <td className="border border-border px-2 py-1">
                                    <div className="flex flex-col text-[11px] text-muted-foreground">
                                      <span className="text-foreground">{c.goods?.name ?? "—"}</span>
                                      <span>{c.goods?.nameCn ?? "—"}</span>
                                    </div>
                                  </td>
                                  <td className="border border-border px-2 py-1">{c.packNo ?? "—"}</td>
                                  <td className="border border-border px-2 py-1">{c.weightKg ?? "—"}</td>
                                  <td className="border border-border px-2 py-1">{c.shippingMark ?? "—"}</td>
                                  <td className="border border-border px-2 py-1 text-right">{displayBilled}</td>
                                  <td className="border border-border px-2 py-1 text-right">{displayDue}</td>
                                  <td className="border border-border px-2 py-1">
                                    {isCartonDelivered ? (
                                      <span className="text-xs font-semibold text-emerald-700">
                                        Delivered
                                      </span>
                                    ) : (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                          size="sm"
                                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                                          disabled={savingCartonId === c.id}
                                          onClick={async () => {
                                            if (due > 0) {
                                              setToast({
                                                message: "Collect full amount before marking delivered.",
                                                type: "error",
                                              })
                                              return
                                            }
                                            try {
                                              setSavingCartonId(c.id)
                                              const res = await fetch(`/api/cartons?id=${c.id}`, {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ delivered: true, status: "DELIVERED" }),
                                              })
                                              if (!res.ok) {
                                                const body = (await res.json().catch(() => null)) as { error?: string } | null
                                                const msg = body?.error ?? "Unable to mark carton delivered."
                                                setToast({ message: msg, type: "error" })
                                                return
                                              }
                                              const data = (await res.json()) as { carton: CartonDetail }
                                              applyCartonUpdate(shipment.id, data.carton)
                                            } finally {
                                              setSavingCartonId(null)
                                            }
                                          }}
                                        >
                                          Mark delivered
                                        </Button>
                                        {isFullyCollected ? (
                                          <span className="text-xs font-semibold text-emerald-700">
                                            Collected
                                          </span>
                                        ) : (
                                          <>
                                            <Input
                                              value={rawInput}
                                              onChange={(e) =>
                                                setCartonCollectInputs((prev) => ({
                                                  ...prev,
                                                  [c.id]: e.target.value,
                                                }))
                                              }
                                              placeholder="Collect"
                                              className="h-8 w-24"
                                              inputMode="decimal"
                                            />
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              disabled={disableCollect}
                                              onClick={async () => {
                                                const amount = roundedAmount
                                                if (Number.isNaN(amount) || amount <= 0 || amount > due) {
                                                  setToast({
                                                    message:
                                                      amount > due
                                                        ? "Cannot collect more than the billed amount."
                                                        : "Enter a valid amount for this carton.",
                                                    type: "error",
                                                  })
                                                  return
                                                }
                                                try {
                                                  setSavingCartonId(c.id)
                                                  const newCollected =
                                                    Math.round(((collected + amount) + Number.EPSILON) * 100) /
                                                    100
                                                  const res = await fetch(`/api/cartons?id=${c.id}`, {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ collectedAmount: newCollected }),
                                                  })
                                                  if (!res.ok) {
                                                    const body = (await res.json().catch(() => null)) as { error?: string } | null
                                                    const msg = body?.error ?? "Unable to record collection."
                                                    setToast({ message: msg, type: "error" })
                                                    return
                                                  }
                                                  const data = (await res.json()) as { carton: CartonDetail }
                                                  applyCartonUpdate(shipment.id, data.carton)
                                                  setCartonCollectInputs((prev) => ({ ...prev, [c.id]: "" }))
                                                } finally {
                                                  setSavingCartonId(null)
                                                }
                                              }}
                                            >
                                              Collect
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                  Total weight: {totalWeight.toFixed(2)} kg
                                </span>
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                                  Total rate: {totalBilled.toFixed(2)}
                                </span>
                                <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                                  Due: {totalDue.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                      </>
                    ) : shipment.cartons && shipment.cartons.length ? (
                      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {shipment.cartons.map((c, idx) => (
                          <li
                            key={`${shipment.id}-${c}-${idx}`}
                            className="rounded-md border border-border/70 bg-card/60 px-3 py-2 text-foreground"
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No cartons recorded for this shipment.</p>
                    )}
                  </div>
                ) : null}
              </div>
            )})}
            {!shipments.length && !loading ? (
              <p className="text-sm text-muted-foreground">
                No shipments yet. Create one above.
              </p>
            ) : null}
          </div>
          </div>
        </div>
        {toast ? (
          <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
            <span
              className={`text-sm font-medium ${
                toast.type === "error" ? "text-destructive" : "text-foreground"
              }`}
            >
              {toast.message}
            </span>
          </div>
        ) : null}
        </>
      )}
    </AppShell>
  )
}
