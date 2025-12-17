"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const DAY_MS = 24 * 60 * 60 * 1000

type Carton = {
  id: number
  cartonNo: string
  printedCartonNo: string | null
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
  billedAmount: number | null
  status: string
  createdAt: string
  childCartons: string[]
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
  const [shipmentNo, setShipmentNo] = useState(`SHIP-${Date.now()}`)
  const [creatingShipment, setCreatingShipment] = useState(false)
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<number>>(new Set())
  const [showBoxRequestModal, setShowBoxRequestModal] = useState(false)
  const [boxModalSelectedIds, setBoxModalSelectedIds] = useState<Set<number>>(new Set())
  const [boxRequestNote, setBoxRequestNote] = useState("")
  const [creatingBox, setCreatingBox] = useState(false)
  const [filterMode, setFilterMode] = useState<"all" | "today" | "yesterday" | "date">("today")
  const [filterDate, setFilterDate] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

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

  const isShippedStatus = (status: string | null | undefined) => {
    const value = (status ?? "").toUpperCase()
    return (
      value.startsWith("IN_SHIPMENT") ||
      value.startsWith("SHIPPED") ||
      value.startsWith("SHIP") ||
      value.startsWith("DELIVERED")
    )
  }

  const isHidden = useCallback(
    (carton: Carton) =>
      carton.status === "BOX_REQUEST_PENDING" || isShippedStatus(carton.status),
    []
  )

  const dateMatches = useCallback(
    (createdAt: string) => {
      if (filterMode === "all") return true
      const created = new Date(createdAt)
      if (Number.isNaN(created.getTime())) return false

      const normalize = (d: Date) => {
        const copy = new Date(d)
        copy.setHours(0, 0, 0, 0)
        return copy.getTime()
      }

      if (filterMode === "today") {
        return normalize(created) === normalize(new Date())
      }
      if (filterMode === "yesterday") {
        return normalize(created) === normalize(new Date(Date.now() - DAY_MS))
      }
      if (filterMode === "date") {
        if (!filterDate) return true
        const picked = new Date(filterDate)
        if (Number.isNaN(picked.getTime())) return true
        return normalize(created) === normalize(picked)
      }
      return true
    },
    [filterDate, filterMode]
  )

  const filteredCartons = useMemo(
    () => cartons.filter((c) => dateMatches(c.createdAt)),
    [cartons, dateMatches]
  )

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const scoredCartons = useMemo(() => {
    if (!normalizedSearch) {
      return filteredCartons.map((carton) => ({ carton, score: 0 }))
    }
    return filteredCartons.map((carton) => {
      const fields = [
        carton.cartonNo,
        carton.writtenCartonNo,
        carton.goods?.name,
        carton.goods?.nameCn,
        carton.trackingNo,
      ]
      let score = 0
      fields.forEach((field) => {
        if (!field) return
        const val = field.toString().toLowerCase()
        if (val === normalizedSearch) score += 3
        else if (val.includes(normalizedSearch)) score += 1
      })
      return { carton, score }
    })
  }, [filteredCartons, normalizedSearch])

  const matchIds = useMemo(
    () =>
      new Set(
        scoredCartons.filter((item) => item.score > 0).map((item) => item.carton.id)
      ),
    [scoredCartons]
  )

  const visibleCartons = useMemo(
    () =>
      scoredCartons
        .filter(({ carton }) => !isHidden(carton))
        .sort((a, b) => {
          if (normalizedSearch && b.score !== a.score) {
            return b.score - a.score
          }
          const aNo = (a.carton.cartonNo || "").toUpperCase()
          const bNo = (b.carton.cartonNo || "").toUpperCase()
          if (aNo === bNo) {
            return (
              new Date(b.carton.createdAt).getTime() -
              new Date(a.carton.createdAt).getTime()
            )
          }
          return aNo.localeCompare(bNo)
        })
        .map((item) => item.carton),
    [isHidden, normalizedSearch, scoredCartons]
  )

  const allSelected = useMemo(
    () => visibleCartons.length > 0 && selected.size === visibleCartons.length,
    [visibleCartons.length, selected.size]
  )

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visibleCartons.map((c) => c.id)))
    }
  }

  const toggleGroup = (ids: number[]) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const allInGroupSelected = ids.every((id) => next.has(id))
      if (allInGroupSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const groupedDisplay = useMemo(() => {
    const groups: { cartonNo: string; items: Carton[] }[] = []
    visibleCartons
      .forEach((carton) => {
        const key = carton.cartonNo ?? ""
        const last = groups[groups.length - 1]
        if (last && last.cartonNo === key) {
          last.items.push(carton)
        } else {
          groups.push({ cartonNo: key, items: [carton] })
        }
      })
    return groups
  }, [visibleCartons])

  const selectedCartons = useMemo(
    () => visibleCartons.filter((c) => selected.has(c.id)),
    [visibleCartons, selected]
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

  const billingSubtotal = useMemo(
    () =>
      modalSelectedCartons.reduce(
        (sum, c) => sum + (c.billedAmount ?? 0),
        0
      ),
    [modalSelectedCartons]
  )

  const estimatedPrice = useMemo(() => {
    const rate = Number(shipmentRate)
    if (Number.isNaN(rate)) return 0
    return totals.totalWeight * rate
  }, [shipmentRate, totals.totalWeight])

  const shipmentTotal = useMemo(() => {
    return billingSubtotal > 0 ? billingSubtotal : estimatedPrice
  }, [billingSubtotal, estimatedPrice])

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
      if (typeof window !== "undefined") {
        window.alert("Select at least one carton before creating a shipment.")
      }
      return
    }
    setShipmentNo((prev) => (prev.trim() ? prev : `SHIP-${Date.now()}`))
    setModalSelectedIds(new Set(selected))
    setShowShipmentModal(true)
  }

  const openBoxRequestModal = () => {
    if (selected.size === 0) {
      if (typeof window !== "undefined") {
        window.alert("Please select the carton you want to make a box request for.")
      }
      return
    }
    setBoxModalSelectedIds(new Set(selected))
    setBoxRequestNote("")
    setShowBoxRequestModal(true)
  }

  const handleCreateShipment = async () => {
    if (modalSelectedCartons.length === 0) {
      setError("Select at least one carton before creating a shipment.")
      return
    }
    try {
      setCreatingShipment(true)
      setError(null)
      const ratePerKgRaw = Number(shipmentRate)
      const hasValidRate = !Number.isNaN(ratePerKgRaw) && ratePerKgRaw > 0
      if (!hasValidRate && billingSubtotal <= 0) {
        setError("Enter a valid rate per kg or set billing prices on the cartons.")
        setCreatingShipment(false)
        return
      }
      const ratePerKg = hasValidRate ? ratePerKgRaw : 0
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentNo: shipmentNo || `SHIP-${Date.now()}`,
          cartonIds: modalSelectedCartons.map((c) => c.id),
          cartonNos: modalSelectedCartons.map((c) => c.cartonNo),
          totalPrice: shipmentTotal,
          ratePerKg,
          status: "PLANNED",
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        const message = body?.error ?? "Unable to create shipment"
        if (typeof window !== "undefined") {
          window.alert(message)
        }
        setError(message)
        return
      }
      const shippedIds = new Set(modalSelectedCartons.map((c) => c.id))
      setCartons((prev) =>
        prev.map((c) =>
          shippedIds.has(c.id) ? { ...c, status: "IN_SHIPMENT" } : c
        )
      )
      setShowShipmentModal(false)
      setSelected(new Set())
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to create shipment.")
    } finally {
      setCreatingShipment(false)
    }
  }

  const handleBoxRequest = async () => {
    if (modalSelectedCartons.length === 0) {
      setError("Select at least one carton for a box request.")
      return
    }
    const requestPayload = modalSelectedCartons.map((c) => ({
      cartonId: c.id,
      printedCartonNo: c.printedCartonNo ?? c.cartonNo,
    }))
    try {
      setCreatingBox(true)
      setError(null)
      const res = await fetch("/api/box-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: requestPayload }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to create box request")
      }
      const ids = new Map(requestPayload.map((r) => [r.cartonId, r.printedCartonNo]))
      setCartons((prev) =>
        prev.map((c) =>
          ids.has(c.id)
            ? {
                ...c,
                cartonNo: ids.get(c.id) ?? c.cartonNo,
                printedCartonNo: ids.get(c.id) ?? c.printedCartonNo ?? null,
                status: "BOX_REQUEST_PENDING",
              }
            : c
        )
      )
      setShowShipmentModal(false)
      setModalSelectedIds(new Set())
      setSelected(new Set())
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to create box request.")
    } finally {
      setCreatingBox(false)
    }
  }

  const toggleBoxModalOne = (id: number) => {
    setBoxModalSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleBoxModalAll = () => {
    const allIds = selectedCartons.map((c) => c.id)
    const allSelected =
      allIds.length > 0 && allIds.every((id) => boxModalSelectedIds.has(id))
    if (allSelected) {
      setBoxModalSelectedIds(new Set())
    } else {
      setBoxModalSelectedIds(new Set(allIds))
    }
  }

  const handleSubmitBoxRequest = async () => {
    const ids = Array.from(boxModalSelectedIds)
    if (!ids.length) {
      setError("Select at least one carton for a box request.")
      return
    }

    const requestPayload = ids.map((id) => ({
      cartonId: id,
      notes: boxRequestNote.trim() || undefined,
    }))

    try {
      setCreatingBox(true)
      setError(null)
      const res = await fetch("/api/box-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: requestPayload }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to create box request")
      }
      const lookup = new Set(requestPayload.map((r) => r.cartonId))
      setCartons((prev) =>
        prev.map((c) =>
          lookup.has(c.id) ? { ...c, status: "BOX_REQUEST_PENDING" } : c
        )
      )
      setSelected(new Set())
      setBoxModalSelectedIds(new Set())
      setShowBoxRequestModal(false)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to create box request.")
    } finally {
      setCreatingBox(false)
    }
  }

  const toggleModalOne = (id: number) => {
    setModalSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
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

  return (
    <AppShell wide>
      {() => (
        <>
          <div className="flex flex-col gap-6">
            <div className="sticky top-0 z-20 -mx-1 -mt-1 
            rounded-2xl border border-border/70
            bg-background/80 px-4 py-3
            shadow-sm backdrop-blur
            supports-backdrop-filter:bg-background/70
            ">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={filterMode === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterMode("all")
                      setFilterDate("")
                    }}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterMode === "today" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterMode("today")
                      setFilterDate("")
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant={filterMode === "yesterday" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterMode("yesterday")
                      setFilterDate("")
                    }}
                  >
                    Yesterday
                  </Button>
                  <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
                    <span className="text-xs text-muted-foreground">Date</span>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(e) => {
                        setFilterDate(e.target.value)
                        setFilterMode("date")
                      }}
                      className="h-8 w-36 px-2 text-xs"
                    />
                  </div>
                  <CartonSearch
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(value)}
                    onClear={() => setSearchQuery("")}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/warehouse/china/cartoon/create">Create carton</Link>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={openShipmentModal}>
                    Create shipment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openBoxRequestModal}
                    className="relative"
                  >
                    Box Requests
                    {selected.size > 0 ? (
                      <span className="absolute -right-2 -top-2 min-w-[1.5rem] rounded-full bg-primary px-2 py-0.5 text-center text-[10px] font-semibold leading-none text-primary-foreground">
                        {selected.size}
                      </span>
                    ) : null}
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
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                    Total cartons: {visibleCartons.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                    Selected: {selected.size}
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1300px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="border border-border px-3 py-2 text-left">SN</th>
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
                      <th className="border border-border px-3 py-2 text-left">Billing price</th>
                      <th className="border border-border px-3 py-2 text-left">Created</th>
                      <th className="border border-border px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:align-middle">
                    {loading ? (
                      <tr>
                      <td colSpan={18} className="border border-border px-3 py-4 text-center text-sm text-muted-foreground">
                        Loading cartons...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={18} className="border border-border px-3 py-4 text-center text-sm text-destructive">
                        {error}
                      </td>
                    </tr>
                  ) : groupedDisplay.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="border border-border px-3 py-4 text-center text-sm text-muted-foreground">
                        No cartons found.
                      </td>
                      </tr>
                    ) : (
                      groupedDisplay.map((group, groupIdx) => {
                        const selectableIds = group.items
                          .filter((item) => !isShippedStatus(item.status))
                          .map((item) => item.id)
                        const groupSelected =
                          selectableIds.length > 0 &&
                          selectableIds.every((id) => selected.has(id))
                        const groupPartial =
                          !groupSelected && selectableIds.some((id) => selected.has(id))
                        return group.items.map((carton, idx) => {
                          const requested = carton.status?.toUpperCase().startsWith("BOX")
                          const shipped = isShippedStatus(carton.status)
                          const matched = matchIds.has(carton.id)
                          const baseRowClasses = requested
                            ? "bg-blue-100 hover:bg-blue-200"
                            : shipped
                              ? "bg-muted/40"
                              : "bg-card hover:bg-muted/30"
                          const rowClasses = matched
                            ? "bg-amber-100 ring-2 ring-amber-300 hover:bg-amber-200"
                            : baseRowClasses
                          return (
                            <tr key={carton.id} className={rowClasses}>
                              {idx === 0 ? (
                                <td
                                  className="border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
                                  rowSpan={group.items.length}
                                >
                                  {groupIdx + 1}
                                </td>
                              ) : null}
                              {idx === 0 ? (
                                <td
                                  className={`border border-border px-3 py-2 ${selectableIds.length ? "cursor-pointer" : "opacity-60"}`}
                                  rowSpan={group.items.length}
                                  onClick={(e) => {
                                    if (selectableIds.length === 0) return
                                    if ((e.target as HTMLElement).tagName === "INPUT") return
                                    toggleGroup(selectableIds)
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={groupSelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = groupPartial
                                    }}
                                    onChange={() => toggleGroup(selectableIds)}
                                    aria-label={`Select carton group ${carton.cartonNo}`}
                                    disabled={selectableIds.length === 0}
                                  />
                                </td>
                              ) : null}
                              {idx === 0 ? (
                                <td
                                  className="border border-border px-3 py-2 font-semibold text-foreground align-middle"
                                  rowSpan={group.items.length}
                                >
                                  {carton.cartonNo}
                                </td>
                              ) : null}
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
                              <td className="border border-border bg-red-50 px-3 py-2 font-semibold text-red-700">
                                {typeof carton.billedAmount === "number"
                                  ? carton.billedAmount.toFixed(2)
                                  : "—"}
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
                          )
                        })
                      })
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
              creatingBox={creatingBox}
              modalSelectedIds={modalSelectedIds}
              modalSelectableIds={selectedCartons.map((c) => c.id)}
              selectedCartons={selectedCartons}
              modalSelectedCartons={modalSelectedCartons}
              totals={totals}
              billingSubtotal={billingSubtotal}
              shipmentTotal={shipmentTotal}
              shipmentRate={shipmentRate}
              setShipmentRate={setShipmentRate}
              shipmentNo={shipmentNo}
              setShipmentNo={setShipmentNo}
              estimatedPrice={estimatedPrice}
              creating={creatingShipment}
            />
          ) : null}

          {showBoxRequestModal ? (
            <BoxRequestModal
              onClose={() => setShowBoxRequestModal(false)}
              onSubmit={handleSubmitBoxRequest}
              onToggleOne={toggleBoxModalOne}
              onToggleAll={toggleBoxModalAll}
              selectedIds={boxModalSelectedIds}
              selectedCartons={selectedCartons}
              boxRequestNote={boxRequestNote}
              setBoxRequestNote={setBoxRequestNote}
              creating={creatingBox}
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
  modalSelectedIds,
  modalSelectableIds,
  selectedCartons,
  modalSelectedCartons,
  totals,
  billingSubtotal,
  shipmentTotal,
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
  modalSelectedIds: Set<number>
  modalSelectableIds: number[]
  selectedCartons: Carton[]
  modalSelectedCartons: Carton[]
  totals: { totalWeight: number; totalCbm: number; totalPcs: number }
  billingSubtotal: number
  shipmentTotal: number
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
                  <th className="border border-border px-3 py-2 text-left">Billing price</th>
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
                    <td className="border border-border bg-red-50 px-3 py-2 font-semibold text-red-700">
                      {typeof c.billedAmount === "number"
                        ? c.billedAmount.toFixed(2)
                        : "—"}
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
                <span>Billing subtotal</span>
                <span className="font-semibold text-foreground">
                  ৳{billingSubtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Weight est. (rate × kg)</span>
                <span className="font-semibold text-foreground">
                  ৳{estimatedPrice.toFixed(2)}
                </span>
              </div>
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
                <span>Shipment total</span>
                <span>৳{shipmentTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={creating}>
                Cancel
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

function BoxRequestModal({
  onClose,
  onSubmit,
  onToggleOne,
  onToggleAll,
  selectedIds,
  selectedCartons,
  boxRequestNote,
  setBoxRequestNote,
  creating,
}: {
  onClose: () => void
  onSubmit: () => void
  onToggleOne: (id: number) => void
  onToggleAll: () => void
  selectedIds: Set<number>
  selectedCartons: Carton[]
  boxRequestNote: string
  setBoxRequestNote: (value: string) => void
  creating: boolean
}) {
  const allChecked =
    selectedCartons.length > 0 &&
    selectedCartons.every((carton) => selectedIds.has(carton.id))

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Box request
            </p>
            <h2 className="text-xl font-semibold">Confirm cartons for printing</h2>
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} carton(s) selected
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="border border-border px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    aria-label="Select all cartons for box request"
                    checked={allChecked}
                    onChange={onToggleAll}
                  />
                </th>
                <th className="border border-border px-3 py-2 text-left">Carton #</th>
                <th className="border border-border px-3 py-2 text-left">Name (EN / CN)</th>
                <th className="border border-border px-3 py-2 text-left">Tracking #</th>
                <th className="border border-border px-3 py-2 text-left">Unit pcs</th>
                <th className="border border-border px-3 py-2 text-left">Weight (kg)</th>
                <th className="border border-border px-3 py-2 text-left">CBM</th>
                <th className="border border-border px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedCartons.map((carton) => (
                <tr key={carton.id} className="bg-card">
                    <td className="border border-border px-3 py-2">
                      <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedIds.has(carton.id)}
                      onChange={() => onToggleOne(carton.id)}
                      aria-label={`Select carton ${carton.cartonNo} for box request`}
                    />
                  </td>
                  <td className="border border-border px-3 py-2 font-semibold text-foreground">
                    {carton.cartonNo}
                  </td>
                  <td className="border border-border px-3 py-2">
                    <div className="flex flex-col text-xs text-muted-foreground">
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
                    {carton.unitPcs ?? "—"}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {carton.weightKg ?? "—"}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {carton.cbm ?? "—"}
                  </td>
                  <td className="border border-border px-3 py-2 uppercase text-muted-foreground">
                    {carton.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Notes</label>
          <Input
            value={boxRequestNote}
            onChange={(e) => setBoxRequestNote(e.target.value)}
            placeholder="Add instructions for box request"
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={creating || selectedIds.size === 0}>
            {creating ? "Requesting..." : "Request box"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CartonSearch({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (val: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search cartons..."
        className="h-8 w-44 px-2 text-xs"
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs"
        onClick={onClear}
        disabled={!value}
      >
        Clear
      </Button>
      <div className="text-[11px] font-medium text-muted-foreground">
        Fields: Carton #, Written #, Name (EN/CN), Tracking #
      </div>
    </div>
  )
}
