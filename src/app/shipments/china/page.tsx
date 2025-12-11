"use client"

import { useEffect, useState } from "react"

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
  goods?: { name: string; nameCn: string | null }
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [collectInputs, setCollectInputs] = useState<Record<number, string>>({})
  const [cartonCollectInputs, setCartonCollectInputs] = useState<Record<number, string>>({})
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [savingCartonId, setSavingCartonId] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/shipments")
        const data = (await res.json()) as { shipments: Shipment[] }
        setShipments(data.shipments ?? [])
        const initialCollects: Record<number, string> = {}
        const initialCartonCollects: Record<number, string> = {}
        data.shipments?.forEach((s) => {
          initialCollects[s.id] = ""
          s.cartonDetails?.forEach((c) => {
            initialCartonCollects[c.id] = ""
          })
        })
        setCollectInputs(initialCollects)
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
        return { ...s, cartonDetails: nextDetails, collectedAmount: collectedSum, totalPrice }
      })
    )
  }

  return (
    <AppShell wide>
      {() => (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Shipment Module
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Plan shipments from China to Bangladesh
            </h1>
            <p className="text-sm text-muted-foreground">
              Capture shipment details and assign cartons selected from the warehouse inventory.
            </p>
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

              return (
                <div
                  key={shipment.id}
                  className="rounded-xl border border-border bg-background/60 px-4 py-3"
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
                      <p className="text-xs text-muted-foreground">
                        Total: {total ?? 0} • Collected: {collectedTotal} • Due: {due}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* {shipment.status !== "DELIVERED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              setUpdatingId(shipment.id)
                              const res = await fetch(`/api/shipments?id=${shipment.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "DELIVERED" }),
                              })
                              if (!res.ok) {
                                const body = (await res.json().catch(() => null)) as { error?: string } | null
                                const msg = body?.error ?? "Unable to mark delivered."
                                if (typeof window !== "undefined") window.alert(msg)
                                return
                              }
                              setShipments((prev) =>
                                prev.map((s) =>
                                  s.id === shipment.id ? { ...s, status: "DELIVERED" } : s
                                )
                              )
                            } catch (err) {
                              console.error(err)
                            } finally {
                              setUpdatingId(null)
                            }
                          }}
                          disabled={updatingId === shipment.id}
                        >
                          {updatingId === shipment.id ? "Updating..." : "Mark delivered"}
                        </Button>
                      ) : null} */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev)
                            if (next.has(shipment.id)) {
                              next.delete(shipment.id)
                            } else {
                              next.add(shipment.id)
                            }
                            return next
                          })
                        }
                      >
                        {expanded.has(shipment.id) ? "Hide cartons" : "View cartons"}
                      </Button>
                    </div>
                    </div>
                  {expanded.has(shipment.id) ? (
                    <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                      {shipment.cartonDetails && shipment.cartonDetails.length ? (
                        <>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-xs">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="border border-border px-2 py-1 text-left">Carton #</th>
                              <th className="border border-border px-2 py-1 text-left">Written #</th>
                              <th className="border border-border px-2 py-1 text-left">Name (EN / CN)</th>
                              <th className="border border-border px-2 py-1 text-left">Tracking #</th>
                              <th className="border border-border px-2 py-1 text-left">Pack #</th>
                              <th className="border border-border px-2 py-1 text-left">Unit pcs</th>
                              <th className="border border-border px-2 py-1 text-left">Weight (kg)</th>
                              <th className="border border-border px-2 py-1 text-left">Size (L/W/H)</th>
                              <th className="border border-border px-2 py-1 text-left">CBM</th>
                              <th className="border border-border px-2 py-1 text-left">Shipping mark</th>
                              <th className="border border-border px-2 py-1 text-left">Billed</th>
                              <th className="border border-border px-2 py-1 text-left">Collected</th>
                              <th className="border border-border px-2 py-1 text-left">Due</th>
                              <th className="border border-border px-2 py-1 text-left">Delivered</th>
                              <th className="border border-border px-2 py-1 text-left">Status</th>
                              <th className="border border-border px-2 py-1 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shipment.cartonDetails.map((c) => {
                              const billed = c.billedAmount ?? 0
                              const collected = c.collectedAmount ?? 0
                              const due = Math.max(billed - collected, 0)
                              const deliveredLabel = c.deliveredAt
                                ? new Date(c.deliveredAt).toLocaleDateString()
                                : "—"
                              return (
                                <tr key={c.id} className="bg-card">
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
                                  <td className="border border-border px-2 py-1">{c.trackingNo ?? "—"}</td>
                                  <td className="border border-border px-2 py-1">{c.packNo ?? "—"}</td>
                                  <td className="border border-border px-2 py-1">{c.unitPcs ?? "—"}</td>
                                  <td className="border border-border px-2 py-1">{c.weightKg ?? "—"}</td>
                                  <td className="border border-border px-2 py-1">
                                    <div className="flex flex-col text-[11px] text-muted-foreground">
                                      <span className="text-foreground">L: {c.lengthCm ?? "—"}</span>
                                      <span>W: {c.widthCm ?? "—"}</span>
                                      <span>H: {c.heightCm ?? "—"}</span>
                                    </div>
                                  </td>
                                  <td className="border border-border px-2 py-1">{c.cbm ?? "—"}</td>
                                  <td className="border border-border px-2 py-1">{c.shippingMark ?? "—"}</td>
                                  <td className="border border-border px-2 py-1 text-right">{billed.toFixed(2)}</td>
                                  <td className="border border-border px-2 py-1 text-right">{collected.toFixed(2)}</td>
                                  <td className="border border-border px-2 py-1 text-right">{due.toFixed(2)}</td>
                                  <td className="border border-border px-2 py-1">{deliveredLabel}</td>
                                  <td className="border border-border px-2 py-1 uppercase text-muted-foreground">
                                    {c.status}
                                  </td>
                                  <td className="border border-border px-2 py-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Input
                                        value={cartonCollectInputs[c.id] ?? ""}
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
                                        disabled={savingCartonId === c.id}
                                        onClick={async () => {
                                          const raw = cartonCollectInputs[c.id] ?? ""
                                          const amount = Number(raw)
                                          if (Number.isNaN(amount) || amount <= 0) {
                                            if (typeof window !== "undefined") {
                                              window.alert("Enter a valid amount for this carton.")
                                            }
                                            return
                                          }
                                          try {
                                            setSavingCartonId(c.id)
                                            const newCollected = collected + amount
                                            const res = await fetch(`/api/cartons?id=${c.id}`, {
                                              method: "PATCH",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ collectedAmount: newCollected }),
                                            })
                                            if (!res.ok) {
                                              const body = (await res.json().catch(() => null)) as { error?: string } | null
                                              const msg = body?.error ?? "Unable to record collection."
                                              if (typeof window !== "undefined") window.alert(msg)
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
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={savingCartonId === c.id || Boolean(c.deliveredAt)}
                                        onClick={async () => {
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
                                              if (typeof window !== "undefined") window.alert(msg)
                                              return
                                            }
                                            const data = (await res.json()) as { carton: CartonDetail }
                                            applyCartonUpdate(shipment.id, data.carton)
                                          } finally {
                                            setSavingCartonId(null)
                                          }
                                        }}
                                      >
                                        {c.deliveredAt ? "Delivered" : "Mark delivered"}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
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
      )}
    </AppShell>
  )
}
