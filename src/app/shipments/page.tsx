"use client"

import type { FormEvent } from "react"
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
  createdAt?: string
}

type FormState = {
  shipmentNo: string
  fromWarehouse: string
  toWarehouse: string
  plannedShipDate: string
  cartonNos: string
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    shipmentNo: "",
    fromWarehouse: "China Warehouse",
    toWarehouse: "Bangladesh Warehouse",
    plannedShipDate: "",
    cartonNos: "",
  })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/shipments")
        const data = (await res.json()) as { shipments: Shipment[] }
        setShipments(data.shipments ?? [])
      } catch (err) {
        console.error(err)
        setError("Failed to load shipments")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleCreateShipment = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const cartons = form.cartonNos
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)

    if (!cartons.length) {
      setError("Add at least one carton number")
      return
    }

    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentNo: form.shipmentNo,
          fromWarehouse: form.fromWarehouse,
          toWarehouse: form.toWarehouse,
          plannedShipDate: form.plannedShipDate,
          cartonNos: cartons,
        }),
      })

      if (!res.ok) {
        throw new Error("Unable to create shipment")
      }

      const { shipment } = (await res.json()) as { shipment: Shipment }
      setShipments((prev) => [shipment, ...prev])
      setForm({
        shipmentNo: "",
        fromWarehouse: "China Warehouse",
        toWarehouse: "Bangladesh Warehouse",
        plannedShipDate: "",
        cartonNos: "",
      })
    } catch (err) {
      console.error(err)
      setError("Unable to create shipment")
    }
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

          <form
            className="grid gap-4 rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur"
            onSubmit={handleCreateShipment}
          >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              placeholder="Shipment No *"
              value={form.shipmentNo}
              onChange={(e) =>
                setForm({ ...form, shipmentNo: e.target.value })
              }
            />
            <Input
              type="date"
              value={form.plannedShipDate}
              onChange={(e) =>
                setForm({ ...form, plannedShipDate: e.target.value })
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="From warehouse"
              value={form.fromWarehouse}
              onChange={(e) =>
                setForm({ ...form, fromWarehouse: e.target.value })
              }
            />
            <Input
              placeholder="To warehouse"
              value={form.toWarehouse}
              onChange={(e) =>
                setForm({ ...form, toWarehouse: e.target.value })
              }
            />
          </div>
          <Input
            placeholder="Carton numbers (comma-separated)"
            value={form.cartonNos}
            onChange={(e) => setForm({ ...form, cartonNos: e.target.value })}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Create shipment</Button>
            {error ? (
              <span className="text-sm text-destructive">{error}</span>
            ) : null}
          </div>
          </form>

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
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Cartons:{" "}
                    {shipment.cartons && shipment.cartons.length
                      ? shipment.cartons.join(", ")
                      : "—"}
                  </div>
                </div>
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
