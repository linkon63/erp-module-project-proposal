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
  goods?: { name: string; nameCn: string | null }
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [collectInputs, setCollectInputs] = useState<Record<number, string>>({})

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/shipments")
        const data = (await res.json()) as { shipments: Shipment[] }
        setShipments(data.shipments ?? [])
        const initialCollects: Record<number, string> = {}
        data.shipments?.forEach((s) => {
          initialCollects[s.id] = ""
        })
        setCollectInputs(initialCollects)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

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
            {shipments.map((shipment) => (
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
                    {shipment.totalPrice != null ? (
                      <p className="text-xs text-muted-foreground">
                        Total: {shipment.totalPrice} • Collected: {shipment.collectedAmount ?? 0} • Due:{" "}
                        {Math.max(
                          (shipment.totalPrice ?? 0) - (shipment.collectedAmount ?? 0),
                          0
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
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
                        {shipment.totalPrice != null ? (
                          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-card/60 px-3 py-2">
                            <div className="text-xs text-muted-foreground">
                              Due:{" "}
                              {Math.max(
                                (shipment.totalPrice ?? 0) - (shipment.collectedAmount ?? 0),
                                0
                              ).toFixed(2)}
                            </div>
                            <Input
                              value={collectInputs[shipment.id] ?? ""}
                              onChange={(e) =>
                                setCollectInputs((prev) => ({
                                  ...prev,
                                  [shipment.id]: e.target.value,
                                }))
                              }
                              placeholder="Collect amount"
                              className="h-8 w-32"
                              inputMode="decimal"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const raw = collectInputs[shipment.id] ?? ""
                                const amount = Number(raw)
                                if (Number.isNaN(amount) || amount <= 0) {
                                  if (typeof window !== "undefined") {
                                    window.alert("Enter a valid amount to collect.")
                                  }
                                  return
                                }
                                const newCollected = (shipment.collectedAmount ?? 0) + amount
                                const res = await fetch(`/api/shipments?id=${shipment.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ collectedAmount: newCollected }),
                                })
                                if (!res.ok) {
                                  const body = (await res.json().catch(() => null)) as { error?: string } | null
                                  const msg = body?.error ?? "Unable to record collection."
                                  if (typeof window !== "undefined") window.alert(msg)
                                  return
                                }
                                setShipments((prev) =>
                                  prev.map((s) =>
                                    s.id === shipment.id
                                      ? { ...s, collectedAmount: newCollected }
                                      : s
                                  )
                                )
                                setCollectInputs((prev) => ({ ...prev, [shipment.id]: "" }))
                              }}
                            >
                              Collect
                            </Button>
                          </div>
                        ) : null}
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
                              <th className="border border-border px-2 py-1 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shipment.cartonDetails.map((c) => (
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
                                <td className="border border-border px-2 py-1 uppercase text-muted-foreground">
                                  {c.status}
                                </td>
                              </tr>
                            ))}
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
            ))}
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
