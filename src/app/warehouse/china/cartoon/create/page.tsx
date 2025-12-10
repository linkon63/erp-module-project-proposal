"use client"

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Warehouse = {
  id: number
  name: string
  code: string
}

type FormState = {
  cartonNo: string
  writtenCartonNo: string
  trackingNo: string
  goodsNameEn: string
  goodsNameCn: string
  warehouseId: string
  packNo: string
  unitPcs: string
  weightKg: string
  lengthCm: string
  widthCm: string
  heightCm: string
  cbm: string
  shippingMark: string
  remarks: string
  copyNumber: string
  notes: string
}

type CartonWithRelations = {
  id: number
  cartonNo: string
  writtenCartonNo: string | null
  trackingNo: string | null
  packNo: string | null
  unitPcs: number | null
  weightKg: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  cbm: number | null
  shippingMark: string | null
  remarks: string | null
  copyNumber: string | null
  notes: string | null
  goods: { name: string; nameCn: string | null }
  warehouse: { id: number; code: string; name: string } | null
}

export default function CreateCartonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle"
  )
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    cartonNo: "",
    writtenCartonNo: "",
    trackingNo: "",
    goodsNameEn: "",
    goodsNameCn: "",
    warehouseId: "",
    packNo: "",
    unitPcs: "",
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    cbm: "",
    shippingMark: "",
    remarks: "",
    copyNumber: "",
    notes: "",
  })
  const [timestamp, setTimestamp] = useState(() => new Date())
  const [loadingCarton, setLoadingCarton] = useState(false)
  const [showBoxModal, setShowBoxModal] = useState(false)
  const [boxSelected, setBoxSelected] = useState(true)

  const defaultWarehouseId = useMemo(
    () => (warehouses[0]?.id ? String(warehouses[0].id) : ""),
    [warehouses]
  )

  useEffect(() => {
    async function load() {
      try {
        const warehouseRes = await fetch("/api/warehouses")
        const warehouseData = (await warehouseRes.json()) as {
          warehouses: Warehouse[]
        }
        setWarehouses(warehouseData.warehouses ?? [])
      } catch (error) {
        console.error("Failed to load lookups", error)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (defaultWarehouseId) {
      setForm((prev) =>
        prev.warehouseId ? prev : { ...prev, warehouseId: defaultWarehouseId }
      )
    }
  }, [defaultWarehouseId])

  const cartonIdParam = searchParams.get("cartonId")
  const cartonId = cartonIdParam ? Number(cartonIdParam) : null

  useEffect(() => {
    async function loadCarton() {
      if (!cartonId) return
      try {
        setLoadingCarton(true)
        const res = await fetch(`/api/cartons?id=${cartonId}`)
        if (!res.ok) {
          throw new Error("Unable to load carton")
        }
        const data = (await res.json()) as { carton: CartonWithRelations }
        const c = data.carton
        setForm({
          cartonNo: c.cartonNo ?? "",
          writtenCartonNo: c.writtenCartonNo ?? "",
          trackingNo: c.trackingNo ?? "",
          goodsNameEn: c.goods?.name ?? "",
          goodsNameCn: c.goods?.nameCn ?? "",
          warehouseId: c.warehouse?.id ? String(c.warehouse.id) : defaultWarehouseId,
          packNo: c.packNo ?? "",
          unitPcs: c.unitPcs != null ? String(c.unitPcs) : "",
          weightKg: c.weightKg != null ? String(c.weightKg) : "",
          lengthCm: c.lengthCm != null ? String(c.lengthCm) : "",
          widthCm: c.widthCm != null ? String(c.widthCm) : "",
          heightCm: c.heightCm != null ? String(c.heightCm) : "",
          cbm: c.cbm != null ? String(c.cbm) : "",
          shippingMark: c.shippingMark ?? "",
          remarks: c.remarks ?? "",
          copyNumber: c.copyNumber ?? "",
          notes: c.notes ?? "",
        })
      } catch (error) {
        console.error(error)
        setMessage("Unable to load carton for editing.")
        setStatus("error")
      } finally {
        setLoadingCarton(false)
      }
    }
    loadCarton()
  }, [cartonId, defaultWarehouseId])

  const isEditing = Boolean(cartonId)

  const openBoxModal = () => {
    if (!form.cartonNo.trim()) {
      setMessage("Enter a Carton # before making a box request.")
      setStatus("error")
      setTimeout(() => setStatus("idle"), 800)
      return
    }
    setBoxSelected(true)
    setShowBoxModal(true)
  }

  const handleBoxRequest = () => {
    if (!boxSelected) {
      setMessage("Select the carton to make a box request.")
      setStatus("error")
      setTimeout(() => setStatus("idle"), 800)
      return
    }
    if (typeof window !== "undefined") {
      window.alert(
        `Box request placed for carton ${form.cartonNo}. (Hook into box request API here.)`
      )
    }
    setShowBoxModal(false)
  }

  const selectedWarehouse =
    warehouses.find((w) => String(w.id) === form.warehouseId) ??
    warehouses[0] ??
    null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const requiredFields = [
      { key: "cartonNo", label: "Carton #" },
      { key: "goodsNameEn", label: "Goods name (EN)" },
      { key: "goodsNameCn", label: "Goods name (CN)" },
      { key: "warehouseId", label: "Warehouse" },
    ] as const

    const missing = requiredFields
      .filter(({ key }) => !String(form[key]).trim())
      .map((item) => item.label)

    if (missing.length) {
      setStatus("error")
      setMessage(`Please fill required fields: ${missing.join(", ")}`)
      setTimeout(() => setStatus("idle"), 500)
      return
    }

    const trimmed = {
      cartonNo: form.cartonNo.trim(),
      writtenCartonNo: form.writtenCartonNo.trim(),
      trackingNo: form.trackingNo.trim(),
      goodsNameEn: form.goodsNameEn.trim(),
      goodsNameCn: form.goodsNameCn.trim(),
      warehouseId: form.warehouseId.trim(),
      packNo: form.packNo.trim(),
      unitPcs: form.unitPcs.trim(),
      weightKg: form.weightKg.trim(),
      lengthCm: form.lengthCm.trim(),
      widthCm: form.widthCm.trim(),
      heightCm: form.heightCm.trim(),
      cbm: form.cbm.trim(),
      shippingMark: form.shippingMark.trim(),
      remarks: form.remarks.trim(),
      copyNumber: form.copyNumber.trim(),
      notes: form.notes.trim(),
    }

    const composedNotes = (() => {
      if (cartonId) {
        return trimmed.notes || undefined
      }
      if (trimmed.goodsNameEn || trimmed.goodsNameCn || trimmed.notes) {
        return [
          trimmed.goodsNameEn ? `Goods EN: ${trimmed.goodsNameEn}` : null,
          trimmed.goodsNameCn ? `Goods CN: ${trimmed.goodsNameCn}` : null,
          trimmed.notes || null,
        ]
          .filter(Boolean)
          .join(" | ")
      }
      return undefined
    })()

    setStatus("saving")
    setMessage(null)
    try {
      const isEditing = Boolean(cartonId)
      const endpoint = isEditing ? `/api/cartons?id=${cartonId}` : "/api/cartons"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartonNo: trimmed.cartonNo,
          writtenCartonNo: trimmed.writtenCartonNo || undefined,
          trackingNo: trimmed.trackingNo || undefined,
          goodsNameEn: trimmed.goodsNameEn,
          goodsNameCn: trimmed.goodsNameCn,
          warehouseId: trimmed.warehouseId ? Number(trimmed.warehouseId) : null,
          packNo: trimmed.packNo || undefined,
          unitPcs: trimmed.unitPcs ? Number(trimmed.unitPcs) : undefined,
          weightKg: trimmed.weightKg ? Number(trimmed.weightKg) : undefined,
          lengthCm: trimmed.lengthCm ? Number(trimmed.lengthCm) : undefined,
          widthCm: trimmed.widthCm ? Number(trimmed.widthCm) : undefined,
          heightCm: trimmed.heightCm ? Number(trimmed.heightCm) : undefined,
          cbm: trimmed.cbm ? Number(trimmed.cbm) : undefined,
          shippingMark: trimmed.shippingMark || undefined,
          remarks: trimmed.remarks || undefined,
          copyNumber: trimmed.copyNumber || undefined,
          notes: composedNotes,
          status: "AT_CHINA_WH",
        }),
      })

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(errorBody?.error ?? "Create failed")
      }

      setStatus("success")
      setMessage(isEditing ? "Carton updated successfully." : "Carton created successfully.")
      if (!isEditing) {
        setForm({
          cartonNo: "",
          writtenCartonNo: "",
          trackingNo: "",
          goodsNameEn: "",
          goodsNameCn: "",
          warehouseId: defaultWarehouseId,
          packNo: "",
          unitPcs: "",
          weightKg: "",
          lengthCm: "",
          widthCm: "",
          heightCm: "",
          cbm: "",
          shippingMark: "",
          remarks: "",
          copyNumber: "",
          notes: "",
        })
      }
      setTimestamp(new Date())
      router.push("/warehouse/china")
    } catch (error) {
      console.error(error)
      setStatus("error")
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create carton. Please try again."
      )
    } finally {
      setTimeout(() => setStatus("idle"), 500)
    }
  }

  return (
    <AppShell wide contentClassName="max-w-full">
      {() => (
        <>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                China Warehouse
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {isEditing ? "Edit carton" : "Create carton"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Row entry — move left to right, then {isEditing ? "save changes" : "hit Add"}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-border/80 bg-card px-3 py-2 text-xs text-muted-foreground">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Timestamp
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {loadingCarton ? "Loading..." : timestamp.toLocaleString()}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/cartons">Back to cartons</Link>
              </Button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/60 text-muted-foreground">
                    <th className="border border-border px-3 py-2 text-left">Time</th>
                    <th className="border border-border px-3 py-2 text-left">
                      <div className="flex flex-col gap-1">
                        <span>Carton numbers</span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          Printed / Written (combined)
                        </span>
                      </div>
                    </th>
                    <th className="border border-border px-3 py-2 text-left">
                      Tracking #
                    </th>
                    <th className="border border-border px-3 py-2 text-left">
                      Goods name (EN) *
                    </th>
                    <th className="border border-border px-3 py-2 text-left">
                      Goods name (CN) *
                    </th>
                    <th className="border border-border px-3 py-2 text-left">
                      Warehouse
                    </th>
                    <th className="border border-border px-3 py-2 text-left">
                      Pack #
                    </th>
                    <th className="border border-border px-3 py-2 text-left">
                      Unit pcs
                    </th>
                    <th className="border border-border px-3 py-2 text-left">
                      Weight (kg)
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_td]:align-middle [&_input]:h-9 [&_select]:h-9 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-2">
                  <tr className="bg-card">
                    <td className="border border-border px-3 py-2 text-xs text-muted-foreground">
                      {timestamp.toLocaleString()}
                    </td>
                    <td className="border border-border px-2 py-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          required
                          value={form.cartonNo}
                          onChange={(e) => setForm({ ...form, cartonNo: e.target.value })}
                          placeholder="Printed #"
                          className="h-9"
                        />
                        <Input
                          value={form.writtenCartonNo}
                          onChange={(e) =>
                            setForm({ ...form, writtenCartonNo: e.target.value })
                          }
                          placeholder="Written #"
                          className="h-9"
                        />
                      </div>
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        value={form.trackingNo}
                        onChange={(e) =>
                          setForm({ ...form, trackingNo: e.target.value })
                        }
                        placeholder="TRACK-001"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        required
                        value={form.goodsNameEn}
                        onChange={(e) =>
                          setForm({ ...form, goodsNameEn: e.target.value })
                        }
                        placeholder="T-shirt"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        required
                        value={form.goodsNameCn}
                        onChange={(e) =>
                          setForm({ ...form, goodsNameCn: e.target.value })
                        }
                        placeholder="中文名称"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2">
                      <div className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {selectedWarehouse?.code ?? "CHN"}
                        </span>
                        <span className="truncate">
                          {selectedWarehouse?.name ?? "China warehouse"}
                        </span>
                      </div>
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        value={form.packNo}
                        onChange={(e) => setForm({ ...form, packNo: e.target.value })}
                        placeholder="PK-01"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        inputMode="numeric"
                        value={form.unitPcs}
                        onChange={(e) => setForm({ ...form, unitPcs: e.target.value })}
                        placeholder="100"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        inputMode="decimal"
                        value={form.weightKg}
                        onChange={(e) =>
                          setForm({ ...form, weightKg: e.target.value })
                        }
                        placeholder="35.4"
                        className="h-9"
                      />
                    </td>
                  </tr>
                  <tr className="bg-muted/20">
                    <td className="border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Extras
                    </td>
                    <td className="border border-border px-2 py-2" colSpan={2}>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input
                          inputMode="decimal"
                          value={form.lengthCm}
                          onChange={(e) =>
                            setForm({ ...form, lengthCm: e.target.value })
                          }
                          placeholder="L (cm)"
                          className="h-9"
                        />
                        <Input
                          inputMode="decimal"
                          value={form.widthCm}
                          onChange={(e) =>
                            setForm({ ...form, widthCm: e.target.value })
                          }
                          placeholder="W (cm)"
                          className="h-9"
                        />
                        <Input
                          inputMode="decimal"
                          value={form.heightCm}
                          onChange={(e) =>
                            setForm({ ...form, heightCm: e.target.value })
                          }
                          placeholder="H (cm)"
                          className="h-9"
                        />
                      </div>
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        inputMode="decimal"
                        value={form.cbm}
                        onChange={(e) => setForm({ ...form, cbm: e.target.value })}
                        placeholder="CBM"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2" colSpan={2}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={form.shippingMark}
                          onChange={(e) =>
                            setForm({ ...form, shippingMark: e.target.value })
                          }
                          placeholder="Shipping mark"
                          className="h-9"
                        />
                        <Input
                          value={form.copyNumber}
                          onChange={(e) =>
                            setForm({ ...form, copyNumber: e.target.value })
                          }
                          placeholder="Copy #"
                          className="h-9"
                        />
                      </div>
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                        placeholder="Remarks"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2">
                      <Input
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Notes"
                        className="h-9"
                      />
                    </td>
                    <td className="border border-border px-2 py-2">
                      <div className="flex items-center justify-end gap-3">
                        {message ? (
                          <span
                            className={`text-xs ${
                              status === "error"
                                ? "text-destructive"
                                : "text-emerald-600"
                            }`}
                          >
                            {message}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Saves to China WH.
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={openBoxModal}
                          disabled={loadingCarton}
                        >
                          Box request
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={status === "saving" || loadingCarton}
                        >
                          {status === "saving"
                            ? isEditing
                              ? "Saving..."
                              : "Adding..."
                            : isEditing
                              ? "Save"
                              : "Add"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </form>
        </div>
        {showBoxModal ? (
          <BoxRequestModal
            onClose={() => setShowBoxModal(false)}
            onConfirm={handleBoxRequest}
            carton={{
              cartonNo: form.cartonNo || "—",
              writtenCartonNo: form.writtenCartonNo || "—",
              goodsNameEn: form.goodsNameEn || "—",
              goodsNameCn: form.goodsNameCn || "—",
              trackingNo: form.trackingNo || "—",
              packNo: form.packNo || "—",
              unitPcs: form.unitPcs || "—",
              weightKg: form.weightKg || "—",
              size: `${form.lengthCm || "—"} / ${form.widthCm || "—"} / ${
                form.heightCm || "—"
              }`,
              cbm: form.cbm || "—",
              shippingMark: form.shippingMark || "—",
            }}
            selected={boxSelected}
            setSelected={setBoxSelected}
          />
        ) : null}
        </>
      )}
    </AppShell>
  )
}

type BoxRequestModalProps = {
  onClose: () => void
  onConfirm: () => void
  carton: {
    cartonNo: string
    writtenCartonNo: string
    goodsNameEn: string
    goodsNameCn: string
    trackingNo: string
    packNo: string
    unitPcs: string
    weightKg: string
    size: string
    cbm: string
    shippingMark: string
  }
  selected: boolean
  setSelected: (selected: boolean) => void
}

function BoxRequestModal({ onClose, onConfirm, carton, selected, setSelected }: BoxRequestModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Box request
            </p>
            <h2 className="text-lg font-semibold">Confirm carton for box request</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="border border-border px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected}
                    onChange={(e) => setSelected(e.target.checked)}
                    aria-label="Select carton for box request"
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
              <tr className="bg-card">
                <td className="border border-border px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected}
                    onChange={(e) => setSelected(e.target.checked)}
                    aria-label="Select carton for box request"
                  />
                </td>
                <td className="border border-border px-3 py-2 font-semibold text-foreground">
                  {carton.cartonNo}
                </td>
                <td className="border border-border px-3 py-2">{carton.writtenCartonNo}</td>
                <td className="border border-border px-3 py-2">
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="text-sm font-medium text-foreground">
                      {carton.goodsNameEn}
                    </span>
                    <span>{carton.goodsNameCn}</span>
                  </div>
                </td>
                <td className="border border-border px-3 py-2">{carton.trackingNo}</td>
                <td className="border border-border px-3 py-2">{carton.packNo}</td>
                <td className="border border-border px-3 py-2">{carton.unitPcs}</td>
                <td className="border border-border px-3 py-2">{carton.weightKg}</td>
                <td className="border border-border px-3 py-2">{carton.size}</td>
                <td className="border border-border px-3 py-2">{carton.cbm}</td>
                <td className="border border-border px-3 py-2">{carton.shippingMark}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!selected}>
            Request box
          </Button>
        </div>
      </div>
    </div>
  )
}
