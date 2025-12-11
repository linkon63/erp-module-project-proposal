"use client"

import React, { useEffect, useMemo, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

type Carton = {
  id: number
  cartonNo: string
  billedAmount?: number | null
  collectedAmount?: number | null
  status?: string | null
  weightKg?: number | null
  cbm?: number | null
  createdAt?: string
  deliveredAt?: string | null
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
}

export default function ReportsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [cartons, setCartons] = useState<Carton[]>([])
  const [boxRequests, setBoxRequests] = useState<BoxRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    | "all-report"
    | "shipment-cartons-left"
    | "total-cartons"
    | "profit"
    | "dues"
    | "delivered"
    | "not-delivered"
    | "warehouse-left"
  >("all-report")

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
          throw new Error("Unable to load report data")
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
        setError("Unable to load reports. Please retry.")
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const shipmentsEnriched = useMemo(() => {
    return shipments.map((s) => {
      const details = s.cartonDetails ?? []
      const billedFromDetails = details.reduce((sum, c) => sum + (c.billedAmount ?? 0), 0)
      const collectedFromDetails = details.reduce(
        (sum, c) => sum + (c.collectedAmount ?? 0),
        0
      )
      const billed = s.totalPrice ?? billedFromDetails
      const collected = Math.max(collectedFromDetails, s.collectedAmount ?? 0)
      const due = Math.max((billed ?? 0) - collected, 0)
      const totalCartons = details.length || s.cartons?.length || 0
      const deliveredCartons = details.filter(
        (c) => (c.status ?? "").toUpperCase() === "DELIVERED" || Boolean(c.deliveredAt)
      ).length
      const delivered =
        (s.status ?? "").toUpperCase() === "DELIVERED" ||
        (totalCartons > 0 && deliveredCartons === totalCartons)
      return {
        ...s,
        billed: billed ?? 0,
        collected,
        due,
        totalCartons,
        deliveredCartons,
        pendingCartons: Math.max(totalCartons - deliveredCartons, 0),
        delivered,
      }
    })
  }, [shipments])

  const summary = useMemo(() => {
    const shipmentsCount = shipmentsEnriched.length
    const deliveredShipments = shipmentsEnriched.filter((s) => s.delivered).length
    const totals = shipmentsEnriched.reduce(
      (acc, s) => {
        acc.totalCartons += s.totalCartons
        acc.deliveredCartons += s.deliveredCartons
        acc.billed += s.billed ?? 0
        acc.collected += s.collected ?? 0
        acc.due += s.due ?? 0
        return acc
      },
      { totalCartons: 0, deliveredCartons: 0, billed: 0, collected: 0, due: 0 }
    )
    const pendingRequests = boxRequests.filter(
      (r) => (r.status ?? "").toUpperCase() === "PENDING"
    ).length
    const approvedRequests = boxRequests.filter(
      (r) => (r.status ?? "").toUpperCase() === "APPROVED"
    ).length
    return {
      shipmentsCount,
      deliveredShipments,
      totalCartons: totals.totalCartons,
      deliveredCartons: totals.deliveredCartons,
      billed: totals.billed,
      collected: totals.collected,
      due: totals.due,
      pendingRequests,
      approvedRequests,
    }
  }, [boxRequests, shipmentsEnriched])

  const formatCurrency = (value: number) =>
    `৳${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

  const tabTable = useMemo(() => {
    switch (activeTab) {
      case "all-report":
        return {
          title: "All report (detailed)",
          columns: ["Shipment", "Status", "From", "To", "Cartons", "Delivered", "Billed", "Collected", "Due"],
          rows: shipmentsEnriched.map((s) => [
            s.shipmentNo,
            s.delivered ? "DELIVERED" : s.status,
            s.fromWarehouse ?? "",
            s.toWarehouse ?? "",
            String(s.totalCartons),
            `${s.deliveredCartons} / ${s.totalCartons}`,
            formatCurrency(s.billed ?? 0),
            formatCurrency(s.collected ?? 0),
            formatCurrency(s.due ?? 0),
          ]),
        }
      case "shipment-cartons-left":
        return {
          title: "Shipment cartons left",
          columns: ["Shipment", "Status", "From", "To", "Total", "Delivered", "Left", "Due"],
          rows: shipmentsEnriched.map((s) => [
            s.shipmentNo,
            s.delivered ? "DELIVERED" : s.status,
            s.fromWarehouse ?? "",
            s.toWarehouse ?? "",
            String(s.totalCartons),
            String(s.deliveredCartons),
            String(s.pendingCartons),
            formatCurrency(s.due ?? 0),
          ]),
        }
      case "total-cartons":
        return {
          title: "All cartons",
          columns: ["Carton", "Status", "Billed", "Collected", "Weight (kg)", "CBM", "Created"],
          rows: cartons.map((c) => [
            c.cartonNo,
            c.status ?? "",
            formatCurrency(c.billedAmount ?? 0),
            formatCurrency(c.collectedAmount ?? 0),
            c.weightKg != null ? String(c.weightKg) : "—",
            c.cbm != null ? String(c.cbm) : "—",
            c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
          ]),
        }
      case "profit":
        return {
          title: "Profit (collections)",
          columns: ["Shipment", "Collected", "Billed", "Due", "Cartons"],
          rows: shipmentsEnriched.map((s) => [
            s.shipmentNo,
            formatCurrency(s.collected ?? 0),
            formatCurrency(s.billed ?? 0),
            formatCurrency(s.due ?? 0),
            String(s.totalCartons),
          ]),
        }
      case "dues":
        return {
          title: "Outstanding dues",
          columns: ["Shipment", "Due", "Collected", "Billed", "Cartons Left"],
          rows: shipmentsEnriched
            .filter((s) => (s.due ?? 0) > 0)
            .map((s) => [
              s.shipmentNo,
              formatCurrency(s.due ?? 0),
              formatCurrency(s.collected ?? 0),
              formatCurrency(s.billed ?? 0),
              String(s.pendingCartons),
            ]),
        }
      case "delivered":
        return {
          title: "Delivered cartons",
          columns: ["Carton", "Billed", "Collected", "Delivered at"],
          rows: cartons
            .filter((c) => (c.status ?? "").toUpperCase() === "DELIVERED" || c.deliveredAt)
            .map((c) => [
              c.cartonNo,
              formatCurrency(c.billedAmount ?? 0),
              formatCurrency(c.collectedAmount ?? 0),
              c.deliveredAt ? new Date(c.deliveredAt).toLocaleDateString() : "—",
            ]),
        }
      case "not-delivered":
        return {
          title: "Not delivered cartons",
          columns: ["Carton", "Status", "Billed", "Collected"],
          rows: cartons
            .filter((c) => {
              const statusUpper = (c.status ?? "").toUpperCase()
              return (
                statusUpper !== "DELIVERED" &&
                !c.deliveredAt &&
                statusUpper !== "AT_CHINA_WH" &&
                !statusUpper.startsWith("BOX_REQUEST")
              )
            })
            .map((c) => [
              c.cartonNo,
              c.status ?? "",
              formatCurrency(c.billedAmount ?? 0),
              formatCurrency(c.collectedAmount ?? 0),
            ]),
        }
      case "warehouse-left":
        return {
          title: "Warehouse (left in CHN)",
          columns: ["Carton", "Status", "Billed", "Collected", "Weight (kg)", "CBM", "Created"],
          rows: cartons
            .filter((c) => (c.status ?? "").toUpperCase() === "AT_CHINA_WH")
            .map((c) => [
              c.cartonNo,
              c.status ?? "",
              formatCurrency(c.billedAmount ?? 0),
              formatCurrency(c.collectedAmount ?? 0),
              c.weightKg != null ? String(c.weightKg) : "—",
              c.cbm != null ? String(c.cbm) : "—",
              c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
            ]),
        }
      default:
        return { title: "", columns: [], rows: [] }
    }
  }, [activeTab, cartons, shipmentsEnriched])

  const buildCsv = () => {
    const lines: string[] = []
    lines.push("Summary")
    lines.push(`Shipments,${summary.shipmentsCount}`)
    lines.push(`Shipments Delivered,${summary.deliveredShipments}`)
    lines.push(`Cartons,${summary.totalCartons}`)
    lines.push(`Cartons Delivered,${summary.deliveredCartons}`)
    lines.push(`Billed,${summary.billed}`)
    lines.push(`Collected,${summary.collected}`)
    lines.push(`Due,${summary.due}`)
    lines.push(`Box Requests Pending,${summary.pendingRequests}`)
    lines.push(`Box Requests Approved,${summary.approvedRequests}`)
    lines.push("")
    lines.push(tabTable.title || "Table")
    lines.push(tabTable.columns.join(","))
    tabTable.rows.forEach((r) => lines.push(r.join(",")))
    return lines.join("\n")
  }

  const downloadCsv = () => {
    const csv = buildCsv()
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "reports-summary.csv")
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const downloadPdf = () => {
    const win = window.open("", "_blank")
    if (!win) return
    const today = new Date().toLocaleString()
    const tableRows = tabTable.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("")
    win.document.write(`
      <html>
        <head>
          <title>Business Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            .muted { color: #475569; font-size: 12px; margin-bottom: 16px; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Business Owner Report</h1>
          <div class="muted">Generated ${today}</div>
          <div class="summary">
            <div class="card"><strong>Shipments</strong><div>${summary.shipmentsCount} (Delivered: ${summary.deliveredShipments})</div></div>
            <div class="card"><strong>Cartons</strong><div>${summary.totalCartons} (Delivered: ${summary.deliveredCartons})</div></div>
            <div class="card"><strong>Financials</strong><div>Billed: ${formatCurrency(summary.billed)}<br/>Collected: ${formatCurrency(summary.collected)}<br/>Due: ${formatCurrency(summary.due)}</div></div>
            <div class="card"><strong>Box Requests</strong><div>Pending: ${summary.pendingRequests}<br/>Approved: ${summary.approvedRequests}</div></div>
          </div>
          <h3>${tabTable.title || "Details"}</h3>
          <table>
            <thead>
              <tr>${tabTable.columns.map((c) => `<th>${c}</th>`).join("")}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <AppShell wide contentClassName="max-w-full">
      {() => (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Reports
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Business owner reports
              </h1>
              <p className="text-sm text-muted-foreground">
                Auto-generate CSV (Excel) and PDF snapshots of shipments, cartons, and dues.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadCsv} disabled={loading || Boolean(error)}>
                Download Excel (CSV)
              </Button>
              <Button variant="outline" onClick={downloadPdf} disabled={loading || Boolean(error)}>
                Download PDF
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all-report", label: "All report" },
              { key: "shipment-cartons-left", label: "Shipment cartons left" },
              { key: "total-cartons", label: "Total cartons" },
              { key: "profit", label: "Profit (collections)" },
              { key: "dues", label: "Dues" },
              { key: "delivered", label: "Delivered cartons" },
              { key: "not-delivered", label: "Not delivered" },
              { key: "warehouse-left", label: "Warehouse left" },
            ].map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant={activeTab === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setActiveTab(
                    tab.key as
                      | "all-report"
                      | "shipment-cartons-left"
                      | "total-cartons"
                      | "profit"
                      | "dues"
                      | "delivered"
                      | "not-delivered"
                      | "warehouse-left"
                  )
                }
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard tone="violet" label="Shipments" primary={`${summary.shipmentsCount}`} secondary={`Delivered: ${summary.deliveredShipments}`} loading={loading} />
            <SummaryCard tone="blue" label="Cartons" primary={`${summary.totalCartons}`} secondary={`Delivered: ${summary.deliveredCartons}`} loading={loading} />
            <SummaryCard tone="emerald" label="Financials" primary={formatCurrency(summary.collected)} secondary={`Billed: ${formatCurrency(summary.billed)} · Due: ${formatCurrency(summary.due)}`} loading={loading} />
            <SummaryCard tone="amber" label="Box requests" primary={`Pending: ${summary.pendingRequests}`} secondary={`Approved: ${summary.approvedRequests}`} loading={loading} />
          </div>

          {activeTab === "all-report" ? (
            <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    All report (detailed)
                  </p>
                  <h3 className="text-lg font-semibold">Shipments with delivered cartons</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {loading ? "Loading..." : `${shipmentsEnriched.length} rows`}
                </span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="border border-border px-3 py-2 text-left">Shipment</th>
                      <th className="border border-border px-3 py-2 text-left">Status</th>
                      <th className="border border-border px-3 py-2 text-left">From → To</th>
                      <th className="border border-border px-3 py-2 text-left">Cartons</th>
                      <th className="border border-border px-3 py-2 text-left">Delivered</th>
                      <th className="border border-border px-3 py-2 text-left">Billed</th>
                      <th className="border border-border px-3 py-2 text-left">Collected</th>
                      <th className="border border-border px-3 py-2 text-left">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="border border-border px-3 py-4 text-center text-muted-foreground">
                          Loading…
                        </td>
                      </tr>
                    ) : shipmentsEnriched.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-border px-3 py-4 text-center text-muted-foreground">
                          No shipments yet.
                        </td>
                      </tr>
                    ) : (
                      shipmentsEnriched.map((s) => {
                        const deliveredCartons =
                          s.cartonDetails?.filter(
                            (c) =>
                              (c.status ?? "").toUpperCase() === "DELIVERED" || Boolean(c.deliveredAt)
                          ) ?? []
                        return (
                          <React.Fragment key={s.id}>
                            <tr className="bg-background/80">
                              <td className="border border-border px-3 py-2 font-semibold text-foreground">
                                {s.shipmentNo}
                              </td>
                              <td className="border border-border px-3 py-2 uppercase text-xs text-muted-foreground">
                                {s.delivered ? "DELIVERED" : s.status}
                              </td>
                              <td className="border border-border px-3 py-2 text-muted-foreground">
                                {s.fromWarehouse} → {s.toWarehouse}
                              </td>
                              <td className="border border-border px-3 py-2">
                                {s.totalCartons}
                              </td>
                              <td className="border border-border px-3 py-2">
                                {deliveredCartons.length} / {s.totalCartons}
                              </td>
                              <td className="border border-border px-3 py-2">
                                {formatCurrency(s.billed ?? 0)}
                              </td>
                              <td className="border border-border px-3 py-2">
                                {formatCurrency(s.collected ?? 0)}
                              </td>
                              <td className="border border-border px-3 py-2 text-amber-700">
                                {formatCurrency(s.due ?? 0)}
                              </td>
                            </tr>
                            <tr className="bg-muted/30">
                              <td colSpan={8} className="border border-border px-3 py-2">
                                {deliveredCartons.length ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[700px] border-collapse text-xs">
                                      <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                          <th className="border border-border px-2 py-1 text-left">Carton</th>
                                          <th className="border border-border px-2 py-1 text-left">Status</th>
                                          <th className="border border-border px-2 py-1 text-left">Billed</th>
                                          <th className="border border-border px-2 py-1 text-left">Collected</th>
                                          <th className="border border-border px-2 py-1 text-left">Delivered at</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {deliveredCartons.map((c) => (
                                          <tr key={c.id} className="bg-background/80">
                                            <td className="border border-border px-2 py-1 font-semibold text-foreground">
                                              {c.cartonNo}
                                            </td>
                                            <td className="border border-border px-2 py-1 uppercase text-muted-foreground">
                                              {c.status}
                                            </td>
                                            <td className="border border-border px-2 py-1">
                                              {formatCurrency(c.billedAmount ?? 0)}
                                            </td>
                                            <td className="border border-border px-2 py-1">
                                              {formatCurrency(c.collectedAmount ?? 0)}
                                            </td>
                                            <td className="border border-border px-2 py-1">
                                              {c.deliveredAt
                                                ? new Date(c.deliveredAt).toLocaleDateString()
                                                : "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    No cartons marked delivered for this shipment yet.
                                  </p>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {tabTable.title}
                  </p>
                  <h3 className="text-lg font-semibold">Table view</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {loading ? "Loading..." : `${tabTable.rows.length} rows`}
                </span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      {tabTable.columns.map((c) => (
                        <th key={c} className="border border-border px-3 py-2 text-left">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={tabTable.columns.length || 1} className="border border-border px-3 py-4 text-center text-muted-foreground">
                          Loading…
                        </td>
                      </tr>
                    ) : tabTable.rows.length === 0 ? (
                      <tr>
                        <td colSpan={tabTable.columns.length || 1} className="border border-border px-3 py-4 text-center text-muted-foreground">
                          No data for this view.
                        </td>
                      </tr>
                    ) : (
                      tabTable.rows.map((row, idx) => (
                        <tr key={idx} className="bg-background/80">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="border border-border px-3 py-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

function SummaryCard({
  label,
  primary,
  secondary,
  loading,
  tone = "blue",
}: {
  label: string
  primary: string
  secondary?: string
  loading?: boolean
  tone?: "blue" | "violet" | "emerald" | "amber"
}) {
  const toneStyles: Record<
    NonNullable<typeof tone>,
    { card: string; accent: string }
  > = {
    blue: {
      card: "from-blue-600/15 via-blue-50 to-white border-blue-200",
      accent: "text-blue-900",
    },
    violet: {
      card: "from-violet-600/15 via-violet-50 to-white border-violet-200",
      accent: "text-violet-900",
    },
    emerald: {
      card: "from-emerald-600/15 via-emerald-50 to-white border-emerald-200",
      accent: "text-emerald-900",
    },
    amber: {
      card: "from-amber-500/15 via-amber-50 to-white border-amber-200",
      accent: "text-amber-900",
    },
  }
  const styles = toneStyles[tone]
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${styles.card}`}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 animate-pulse rounded-md bg-muted" />
      ) : (
        <>
          <p className={`text-xl font-semibold ${styles.accent}`}>{primary}</p>
          {secondary ? <p className="text-xs text-muted-foreground">{secondary}</p> : null}
        </>
      )}
    </div>
  )
}
