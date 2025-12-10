"use client"

import { useEffect, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type BoxRequest = {
  id: number
  cartonId: number
  printedCartonNo: string | null
  notes: string | null
  status: string
  createdAt: string
  carton: {
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
    goods: { name: string; nameCn: string | null }
  }
}

export default function BoxRequestPage() {
  const [requests, setRequests] = useState<BoxRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkCartonNo, setBulkCartonNo] = useState("")
  const [bulkNotes, setBulkNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const hasApprovedSelection = requests.some(
    (req) => selectedIds.has(req.id) && req.status === "APPROVED"
  )

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/box-requests")
        if (!res.ok) throw new Error("Failed to load box requests")
        const data = (await res.json()) as { requests: BoxRequest[] }
        setRequests(data.requests ?? [])
      } catch (err) {
        console.error(err)
        setError("Unable to load box requests.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (requests.length === 0) return
    const allIds = requests.map((r) => r.id)
    const allSelected = allIds.every((id) => selectedIds.has(id))
    setSelectedIds(new Set(allSelected ? [] : allIds))
  }

  const handleAcceptSelected = async () => {
    if (selectedIds.size === 0) {
      setError("Select at least one request to accept.")
      return
    }
    if (!bulkCartonNo.trim()) {
      setError("Printed Carton # is required.")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const res = await fetch("/api/box-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: Array.from(selectedIds),
          printedCartonNo: bulkCartonNo.trim(),
          notes: bulkNotes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to approve requests")
      }
      setRequests((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id)
            ? {
                ...r,
                status: "APPROVED",
                printedCartonNo: bulkCartonNo.trim(),
                notes: bulkNotes,
                carton: { ...r.carton, cartonNo: bulkCartonNo.trim() },
              }
            : r
        )
      )
      setSelectedIds(new Set())
      setBulkCartonNo("")
      setBulkNotes("")
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to approve requests.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell wide>
      {() => (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Box Requests
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">Manage box requests</h1>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Printed Carton #
                </label>
                <Input
                  value={bulkCartonNo}
                  onChange={(e) => setBulkCartonNo(e.target.value)}
                  placeholder="NEW-CARTON"
                  className="h-9 min-w-[180px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                <Input
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Notes for warehouse"
                  className="h-9 min-w-[220px]"
                />
              </div>
              <Button
                size="sm"
                onClick={handleAcceptSelected}
                disabled={saving || selectedIds.size === 0 || hasApprovedSelection}
              >
                {saving ? "Saving..." : "Accept selected"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="border border-border px-3 py-2 text-left">
                      -
                      {/* <input
                        type="checkbox"
                        className="h-4 w-4"
                        aria-label="Select all pending requests"
                        checked={
                          pendingIds.length > 0 &&
                          pendingIds.every((id) => selectedIds.has(id))
                        }
                        onChange={toggleAll}
                        disabled={pendingIds.length === 0}
                      /> */}
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
                    <th className="border border-border px-3 py-2 text-left">Printed Carton #</th>
                    <th className="border border-border px-3 py-2 text-left">Notes</th>
                    <th className="border border-border px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={13} className="border border-border px-3 py-4 text-center text-destructive">
                        {error}
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        No box requests yet.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => {
                      const disabled = req.status === "APPROVED"
                      return (
                        <tr
                          key={req.id}
                          className={req.status === "APPROVED" ? "bg-blue-100" : "bg-card"}
                        >
                          <td className="border border-border px-3 py-2">
                            {disabled ? (
                              <span className="text-xs uppercase text-muted-foreground">—</span>
                            ) : (
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={selectedIds.has(req.id)}
                                onChange={() => toggleOne(req.id)}
                                aria-label={`Select box request ${req.id}`}
                              />
                            )}
                          </td>
                          <td className="border border-border px-3 py-2 font-semibold text-foreground">
                            {req.carton.cartonNo}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.carton.writtenCartonNo ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            <div className="flex flex-col text-xs text-muted-foreground">
                              <span className="text-sm font-medium text-foreground">
                                {req.carton.goods?.name ?? "—"}
                              </span>
                              <span>{req.carton.goods?.nameCn ?? "—"}</span>
                            </div>
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.carton.trackingNo ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.carton.packNo ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.carton.unitPcs ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.carton.weightKg ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            <div className="flex flex-col text-xs text-muted-foreground">
                              <span className="text-foreground">
                                L: {req.carton.lengthCm ?? "—"}
                              </span>
                              <span>W: {req.carton.widthCm ?? "—"}</span>
                              <span>H: {req.carton.heightCm ?? "—"}</span>
                            </div>
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.carton.cbm ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.carton.shippingMark ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.printedCartonNo ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {req.notes ?? "—"}
                          </td>
                          <td className="border border-border px-3 py-2 uppercase text-muted-foreground">
                            {req.status}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
