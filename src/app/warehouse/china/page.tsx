"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Carton = {
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
  copyNumber: string | null
  remarks: string | null
  notes: string | null
  status: string
  createdAt: string
  goods: {
    name: string
    nameCn: string | null
  }
  warehouse: {
    code: string
    name: string
  } | null
}

export default function ChinaWarehousePage() {
  const [cartons, setCartons] = useState<Carton[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [shipmentRate, setShipmentRate] = useState("5")
  const [shipmentNo, setShipmentNo] = useState(
    `SHIP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
  )
  const [creatingShipment, setCreatingShipment] = useState(false)
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/cartons")
        if (!res.ok) throw new Error("Failed to load cartons")
        const data = (await res.json()) as { cartons: Carton[] }
        setCartons(data.cartons ?? [])
      } catch (err) {
        console.error(err)
        setError("Unable to fetch cartons. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const allSelected = useMemo(
    () => cartons.length > 0 && selected.size === cartons.length,
    [cartons.length, selected.size]
  )

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(cartons.map((c) => c.id)))
    }
  }

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const display = cartons
  const selectedCartons = useMemo(
    () => cartons.filter((c) => selected.has(c.id)),
    [cartons, selected]
  )

  const modalSelectedCartons = useMemo(
    () => cartons.filter((c) => modalSelectedIds.has(c.id)),
    [cartons, modalSelectedIds]
  )

  const totals = useMemo(() => {
    const totalWeight = modalSelectedCartons.reduce(
      (sum, c) => sum + (c.weightKg ?? 0),
      0
    )
    const totalCbm = modalSelectedCartons.reduce((sum, c) => sum + (c.cbm ?? 0), 0)
    const totalPcs = modalSelectedCartons.reduce(
      (sum, c) => sum + (c.unitPcs ?? 0),
      0
    )
    return { totalWeight, totalCbm, totalPcs }
  }, [modalSelectedCartons])

  const estimatedPrice = useMemo(() => {
    const rate = Number(shipmentRate)
    if (Number.isNaN(rate)) return 0
    return totals.totalWeight * rate
  }, [shipmentRate, totals.totalWeight])

  const handleDelete = async (cartonId: number, cartonNo: string) => {
    const confirmDelete =
      typeof window !== "undefined"
        ? window.confirm(`Delete carton ${cartonNo}?`)
        : true
    if (!confirmDelete) return

    try {
      setDeletingId(cartonId)
      setError(null)
      const res = await fetch(`/api/cartons?id=${cartonId}`, { method: "DELETE" })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Delete failed")
      }
      setCartons((prev) => prev.filter((c) => c.id !== cartonId))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(cartonId)
        return next
      })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to delete carton.")
    } finally {
      setDeletingId(null)
    }
  }

  const openShipmentModal = () => {
    if (selected.size === 0) {
      setError("Select at least one carton before creating a shipment.")
      return
    }
    setModalSelectedIds(new Set(selected))
    setShowShipmentModal(true)
  }

  const handleCreateShipment = async () => {
    if (modalSelectedCartons.length === 0) {
      setError("Select at least one carton before creating a shipment.")
      return
    }
    try {
      setCreatingShipment(true)
      setError(null)
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentNo: shipmentNo || `SHIP-${Date.now()}`,
          cartonNos: modalSelectedCartons.map((c) => c.cartonNo),
          status: "PLANNED",
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to create shipment")
      }
      setShowShipmentModal(false)
      setSelected(new Set())
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to create shipment.")
    } finally {
      setCreatingShipment(false)
    }
  }

  const toggleModalOne = (id: number) => {
    setModalSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleModalAll = () => {
    const allIds = selectedCartons.map((c) => c.id)
    const allSelected =
      allIds.length > 0 && allIds.every((id) => modalSelectedIds.has(id))
    if (allSelected) {
      setModalSelectedIds(new Set())
    } else {
      setModalSelectedIds(new Set(allIds))
    }
  }

  const handleBoxRequest = () => {
    if (modalSelectedCartons.length === 0) {
      setError("Select at least one carton for a box request.")
      return
    }
    if (typeof window !== "undefined") {
      window.alert(
        `Box request submitted for ${modalSelectedCartons.length} carton(s). (Integrate with box request API here.)`
      )
    }
    setShowShipmentModal(false)
  }

  return (
    <AppShell wide>
      {() => (
        <>
          <div className="flex flex-col gap-6">
            <div className="sticky top-0 z-20 -mx-1 -mt-1 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm">
                    All
                  </Button>
                  <Button variant="ghost" size="sm">
                    Draft
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/warehouse/china/cartoon/create">Create carton</Link>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={openShipmentModal}>
                    Create shipment
                  </Button>
                  <Button size="sm" variant="outline">
                    Make a box request
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  China Warehouse
                </h1>
                <p className="text-sm text-muted-foreground">
                  Inventory workflows for China. Use the actions above to create
                  cartons, shipments, or box requests.
                </p>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1250px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="border border-border px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          aria-label="Select all cartons"
                          checked={allSelected}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="border border-border px-3 py-2 text-left">Carton #</th>
                      <th className="border border-border px-3 py-2 text-left">Written #</th>
                      <th className="border border-border px-3 py-2 text-left">Name (EN / CN)</th>
                      <th className="border border-border px-3 py-2 text-left">Tracking #</th>
                      <th className="border border-border px-3 py-2 text-left">Pack #</th>
                      <th className="border border-border px-3 py-2 text-left">Unit pcs</th>
                      <th className="border border-border px-3 py-2 text-left">Weight (kg)</th>
                      <th className="border border-border px-3 py-2 text-left">Size (L/W/H)</th>
                      <th className="border border-border px-3 py-2 text-left">CBM</th>
                      <th className="border border-border px-3 py-2 text-left">Shipping mark</th>
                      <th className="border border-border px-3 py-2 text-left">Copy #</th>
                      <th className="border border-border px-3 py-2 text-left">Remarks</th>
                      <th className="border border-border px-3 py-2 text-left">Notes</th>
                      <th className="border border-border px-3 py-2 text-left">Created</th>
                      <th className="border border-border px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:align-middle">
                    {loading ? (
                      <tr>
                        <td colSpan={16} className="border border-border px-3 py-4 text-center text-sm text-muted-foreground">
                          Loading cartons...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={16} className="border border-border px-3 py-4 text-center text-sm text-destructive">
                          {error}
                        </td>
                      </tr>
                    ) : display.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="border border-border px-3 py-4 text-center text-sm text-muted-foreground">
                          No cartons found.
                        </td>
                      </tr>
                    ) : (
                      display.map((carton) => (
                        <tr key={carton.id} className="bg-card hover:bg-muted/30">
                          <td className="border border-border px-3 py-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={selected.has(carton.id)}
                              onChange={() => toggleOne(carton.id)}
                              aria-label={`Select carton ${carton.cartonNo}`}
                            />
                          </td>
                          <td className="border border-border px-3 py-2 font-semibold text-foreground">
                            {carton.cartonNo}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.writtenCartonNo ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <span className="text-sm font-medium text-foreground">
                                {carton.goods?.name ?? "—"}
                              </span>
                              <span>{carton.goods?.nameCn ?? "—"}</span>
                            </div>
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.trackingNo ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.packNo ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.unitPcs ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.weightKg ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            <div className="flex flex-col text-xs text-muted-foreground">
                              <span className="text-foreground">
                                L: {carton.lengthCm ?? "—"}
                              </span>
                              <span>
                                W: {carton.widthCm ?? "—"}
                              </span>
                              <span>
                                H: {carton.heightCm ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.cbm ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.shippingMark ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.copyNumber ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.remarks ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {carton.notes ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2 text-xs text-muted-foreground">
                            {new Date(carton.createdAt).toLocaleString()}
                          </td>
                          <td className="border border-border px-3 py-2">
                            <div className="flex flex-wrap justify-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                              >
                                <Link href={`/warehouse/china/cartoon/create?cartonId=${carton.id}`}>
                                  <span className="flex items-center gap-1">
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </span>
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2 text-xs"
                                disabled={deletingId === carton.id}
                                onClick={() => handleDelete(carton.id, carton.cartonNo)}
                              >
                                {deletingId === carton.id ? (
                                  "Deleting..."
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {showShipmentModal ? (
            <ShipmentModal
              onClose={() => setShowShipmentModal(false)}
              onConfirm={handleCreateShipment}
              onToggleOne={toggleModalOne}
              onToggleAll={toggleModalAll}
              onConfirmBoxRequest={handleBoxRequest}
              modalSelectedIds={modalSelectedIds}
              modalSelectableIds={selectedCartons.map((c) => c.id)}
              selectedCartons={selectedCartons}
              modalSelectedCartons={modalSelectedCartons}
              totals={totals}
              shipmentRate={shipmentRate}
              setShipmentRate={setShipmentRate}
              shipmentNo={shipmentNo}
              setShipmentNo={setShipmentNo}
              estimatedPrice={estimatedPrice}
              creating={creatingShipment}
            />
          ) : null}
        </>
      )}
    </AppShell>
  )
}

function ShipmentModal({
  onClose,
  onConfirm,
  onToggleOne,
  onToggleAll,
  onConfirmBoxRequest,
  modalSelectedIds,
  modalSelectableIds,
  selectedCartons,
  modalSelectedCartons,
  totals,
  shipmentRate,
  setShipmentRate,
  shipmentNo,
  setShipmentNo,
  estimatedPrice,
  creating,
}: {
  onClose: () => void
  onConfirm: () => void
  onToggleOne: (id: number) => void
  onToggleAll: () => void
  onConfirmBoxRequest: () => void
  modalSelectedIds: Set<number>
  modalSelectableIds: number[]
  selectedCartons: Carton[]
  modalSelectedCartons: Carton[]
  totals: { totalWeight: number; totalCbm: number; totalPcs: number }
  shipmentRate: string
  setShipmentRate: (value: string) => void
  shipmentNo: string
  setShipmentNo: (value: string) => void
  estimatedPrice: number
  creating: boolean
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Create shipment
            </p>
            <h2 className="text-xl font-semibold">Review selected cartons</h2>
            <p className="text-sm text-muted-foreground">
              {modalSelectedCartons.length} carton(s) selected • {totals.totalPcs} pcs •{" "}
              {totals.totalWeight.toFixed(2)} kg • {totals.totalCbm.toFixed(3)} cbm
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[1150px] border-collapse text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="border border-border px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      aria-label="Select all cartons in modal"
                      checked={
                        modalSelectableIds.length > 0 &&
                        modalSelectableIds.every((id) => modalSelectedIds.has(id))
                      }
                      onChange={onToggleAll}
                    />
                  </th>
                  <th className="border border-border px-3 py-2 text-left">Carton #</th>
                  <th className="border border-border px-3 py-2 text-left">Written #</th>
                  <th className="border border-border px-3 py-2 text-left">Name (EN / CN)</th>
                  <th className="border border-border px-3 py-2 text-left">Tracking #</th>
                  <th className="border border-border px-3 py-2 text-left">Pack #</th>
                  <th className="border border-border px-3 py-2 text-left">Unit pcs</th>
                  <th className="border border-border px-3 py-2 text-left">Weight (kg)</th>
                  <th className="border border-border px-3 py-2 text-left">Size (L/W/H)</th>
                  <th className="border border-border px-3 py-2 text-left">CBM</th>
                  <th className="border border-border px-3 py-2 text-left">Shipping mark</th>
                </tr>
              </thead>
              <tbody>
                {selectedCartons.map((c) => (
                  <tr key={c.id} className="bg-card">
                    <td className="border border-border px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={modalSelectedIds.has(c.id)}
                        onChange={() => onToggleOne(c.id)}
                        aria-label={`Select carton ${c.cartonNo} for shipment`}
                      />
                    </td>
                    <td className="border border-border px-3 py-2 font-medium text-foreground">
                      {c.cartonNo}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {c.writtenCartonNo ?? "—"}
                    </td>
                    <td className="border border-border px-3 py-2">
                      <div className="flex flex-col text-xs text-muted-foreground">
                        <span className="text-sm font-medium text-foreground">
                          {c.goods?.name ?? "—"}
                        </span>
                        <span>{c.goods?.nameCn ?? "—"}</span>
                      </div>
                    </td>
                    <td className="border border-border px-3 py-2">
                      {c.trackingNo ?? "—"}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {c.packNo ?? "—"}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {c.unitPcs ?? "—"}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {c.weightKg ?? "—"}
                    </td>
                    <td className="border border-border px-3 py-2">
                      <div className="flex flex-col text-xs text-muted-foreground">
                        <span className="text-foreground">L: {c.lengthCm ?? "—"}</span>
                        <span>W: {c.widthCm ?? "—"}</span>
                        <span>H: {c.heightCm ?? "—"}</span>
                      </div>
                    </td>
                    <td className="border border-border px-3 py-2">
                      {c.cbm ?? "—"}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {c.shippingMark ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Shipment #
              </label>
              <Input
                value={shipmentNo}
                onChange={(e) => setShipmentNo(e.target.value)}
                placeholder="SHIP-000001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Rate per kg (USD)
              </label>
              <Input
                value={shipmentRate}
                onChange={(e) => setShipmentRate(e.target.value)}
                inputMode="decimal"
                placeholder="5"
              />
            </div>
            <div className="rounded-lg bg-card p-3 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Total weight</span>
                <span className="font-semibold text-foreground">
                  {totals.totalWeight.toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total CBM</span>
                <span className="font-semibold text-foreground">
                  {totals.totalCbm.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total pcs</span>
                <span className="font-semibold text-foreground">{totals.totalPcs}</span>
              </div>
              <div className="mt-3 flex justify-between text-base font-semibold text-foreground">
                <span>Estimated price</span>
                <span>৳{estimatedPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={creating}>
                Cancel
              </Button>
              <Button variant="outline" onClick={onConfirmBoxRequest} disabled={creating}>
                Request box
              </Button>
              <Button onClick={onConfirm} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
