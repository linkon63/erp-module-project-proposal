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
  const [savingId, setSavingId] = useState<number | null>(null)
  const [formState, setFormState] = useState<Record<
    number,
    { printedCartonNo: string; notes: string }
  >>({})

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/box-requests")
        if (!res.ok) throw new Error("Failed to load box requests")
        const data = (await res.json()) as { requests: BoxRequest[] }
        setRequests(data.requests ?? [])
        const initial: Record<number, { printedCartonNo: string; notes: string }> = {}
        data.requests?.forEach((r) => {
          initial[r.id] = {
            printedCartonNo: r.printedCartonNo ?? "",
            notes: r.notes ?? "",
          }
        })
        setFormState(initial)
      } catch (err) {
        console.error(err)
        setError("Unable to load box requests.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAccept = async (request: BoxRequest) => {
    const payload = formState[request.id] ?? { printedCartonNo: "", notes: "" }
    if (!payload.printedCartonNo.trim()) {
      setError("Printed Carton # is required.")
      return
    }
    try {
      setSavingId(request.id)
      setError(null)
      const res = await fetch(`/api/box-requests?id=${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printedCartonNo: payload.printedCartonNo.trim(),
          notes: payload.notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to approve request")
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "APPROVED",
                printedCartonNo: payload.printedCartonNo.trim(),
                notes: payload.notes,
                carton: { ...r.carton, cartonNo: payload.printedCartonNo.trim() },
              }
            : r
        )
      )
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to approve request.")
    } finally {
      setSavingId(null)
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
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
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
                    <th className="border border-border px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={14} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={14} className="border border-border px-3 py-4 text-center text-destructive">
                        {error}
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        No box requests yet.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => {
                      const row = formState[req.id] ?? { printedCartonNo: "", notes: "" }
                      const disabled = req.status === "APPROVED"
                      return (
                        <tr
                          key={req.id}
                          className={req.status === "APPROVED" ? "bg-blue-100" : "bg-card"}
                        >
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
                            <Input
                              value={row.printedCartonNo}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  [req.id]: { ...row, printedCartonNo: e.target.value },
                                }))
                              }
                              disabled={disabled}
                              placeholder="NEW-CARTON"
                            />
                          </td>
                          <td className="border border-border px-3 py-2">
                            <Input
                              value={row.notes}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  [req.id]: { ...row, notes: e.target.value },
                                }))
                              }
                              disabled={disabled}
                              placeholder="Notes"
                            />
                          </td>
                          <td className="border border-border px-3 py-2 uppercase text-muted-foreground">
                            {req.status}
                          </td>
                          <td className="border border-border px-3 py-2">
                            <Button
                              size="sm"
                              disabled={disabled || savingId === req.id}
                              onClick={() => handleAccept(req)}
                            >
                              {savingId === req.id ? "Saving..." : disabled ? "Approved" : "Accept"}
                            </Button>
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
