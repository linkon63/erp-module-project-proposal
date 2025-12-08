"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type Goods = {
  id: number
  name: string
  shippingMark?: string | null
}

type Warehouse = {
  id: number
  code: string
  name: string
}

type Carton = {
  id: number
  cartonNo: string
  goods: Goods
  warehouse?: Warehouse | null
  status: string
  isCombinedCarton: boolean
  childCartons: string[]
  weightKg?: number | null
  cbm?: number | null
}

type FormState = {
  cartonNo: string
  goodsId: string
  warehouseId: string
  packNo: string
  unitPcs: string
  weightKg: string
  cbm: string
  shippingMark: string
}

type CombineState = {
  cartonNo: string
  childCartonNos: string
}

export default function CartonsPage() {
  const [goods, setGoods] = useState<Goods[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [cartons, setCartons] = useState<Carton[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    cartonNo: "",
    goodsId: "",
    warehouseId: "",
    packNo: "",
    unitPcs: "",
    weightKg: "",
    cbm: "",
    shippingMark: "",
  })
  const [combineForm, setCombineForm] = useState<CombineState>({
    cartonNo: "",
    childCartonNos: "",
  })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [goodsRes, warehousesRes, cartonsRes] = await Promise.all([
          fetch("/api/goods"),
          fetch("/api/warehouses"),
          fetch("/api/cartons"),
        ])

        const goodsData = (await goodsRes.json()) as { goods: Goods[] }
        const warehouseData = (await warehousesRes.json()) as {
          warehouses: Warehouse[]
        }
        const cartonData = (await cartonsRes.json()) as { cartons: Carton[] }

        setGoods(goodsData.goods ?? [])
        setWarehouses(warehouseData.warehouses ?? [])
        setCartons(cartonData.cartons ?? [])
      } catch (err) {
        console.error(err)
        setError("Failed to load carton data")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleCreateCarton = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      const res = await fetch("/api/cartons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartonNo: form.cartonNo,
          goodsId: Number(form.goodsId),
          warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
          packNo: form.packNo,
          unitPcs: form.unitPcs ? Number(form.unitPcs) : undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
          cbm: form.cbm ? Number(form.cbm) : undefined,
          shippingMark: form.shippingMark,
          status: "AT_CHINA_WH",
        }),
      })

      if (!res.ok) {
        throw new Error("Unable to add carton")
      }

      const { carton } = (await res.json()) as { carton: Carton }
      setCartons((prev) => [carton, ...prev])
      setForm({
        cartonNo: "",
        goodsId: "",
        warehouseId: "",
        packNo: "",
        unitPcs: "",
        weightKg: "",
        cbm: "",
        shippingMark: "",
      })
    } catch (err) {
      console.error(err)
      setError("Unable to add carton")
    }
  }

  const handleCombineCartons = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const children = combineForm.childCartonNos
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)

    if (children.length < 2) {
      setError("Provide at least two child cartons (comma-separated)")
      return
    }

    try {
      const res = await fetch("/api/cartons/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartonNo: combineForm.cartonNo,
          childCartonNos: children,
        }),
      })

      if (!res.ok) {
        throw new Error("Combine failed")
      }

      const data = (await res.json()) as { carton: Carton }
      setCartons((prev) => [data.carton, ...prev])
      setCombineForm({ cartonNo: "", childCartonNos: "" })
    } catch (err) {
      console.error(err)
      setError("Unable to combine cartons")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Carton Module
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage cartons for China and BD warehouses
          </h1>
          <p className="text-sm text-muted-foreground">
            Add cartons, view the inventory, and combine cartons into a single
            larger carton.
          </p>
        </div>

        <div className="grid gap-6 rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur lg:grid-cols-3">
          <form className="space-y-4 lg:col-span-2" onSubmit={handleCreateCarton}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                required
                placeholder="Carton No *"
                value={form.cartonNo}
                onChange={(e) => setForm({ ...form, cartonNo: e.target.value })}
              />
              <select
                required
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.goodsId}
                onChange={(e) => setForm({ ...form, goodsId: e.target.value })}
              >
                <option value="">Select goods</option>
                {goods.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.warehouseId}
                onChange={(e) =>
                  setForm({ ...form, warehouseId: e.target.value })
                }
              >
                <option value="">Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Pack No"
                value={form.packNo}
                onChange={(e) => setForm({ ...form, packNo: e.target.value })}
              />
              <Input
                placeholder="Unit pcs"
                value={form.unitPcs}
                onChange={(e) => setForm({ ...form, unitPcs: e.target.value })}
              />
              <Input
                placeholder="Weight (kg)"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="CBM"
                value={form.cbm}
                onChange={(e) => setForm({ ...form, cbm: e.target.value })}
              />
              <Input
                placeholder="Shipping mark"
                value={form.shippingMark}
                onChange={(e) =>
                  setForm({ ...form, shippingMark: e.target.value })
                }
              />
              <Button type="submit" className="w-full sm:w-auto">
                Add carton
              </Button>
            </div>
          </form>

          <form className="space-y-3" onSubmit={handleCombineCartons}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Combine cartons</p>
                <p className="text-xs text-muted-foreground">
                  Create a combined carton from 2+ existing ones.
                </p>
              </div>
            </div>
            <Input
              required
              placeholder="New combined carton number"
              value={combineForm.cartonNo}
              onChange={(e) =>
                setCombineForm({ ...combineForm, cartonNo: e.target.value })
              }
            />
            <Input
              required
              placeholder="Child carton numbers (comma-separated)"
              value={combineForm.childCartonNos}
              onChange={(e) =>
                setCombineForm({
                  ...combineForm,
                  childCartonNos: e.target.value,
                })
              }
            />
            <Button type="submit" className="w-full">
              Combine
            </Button>
          </form>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Carton List
              </p>
              <h2 className="text-xl font-semibold">All cartons</h2>
            </div>
            {loading ? (
              <span className="text-xs text-muted-foreground">Loading…</span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                {cartons.length} records
              </span>
            )}
          </div>

          <Separator className="my-4" />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border-b border-border py-2 pr-3 font-medium">
                    Carton No
                  </th>
                  <th className="border-b border-border py-2 pr-3 font-medium">
                    Goods
                  </th>
                  <th className="border-b border-border py-2 pr-3 font-medium">
                    Warehouse
                  </th>
                  <th className="border-b border-border py-2 pr-3 font-medium">
                    Weight (kg)
                  </th>
                  <th className="border-b border-border py-2 pr-3 font-medium">
                    CBM
                  </th>
                  <th className="border-b border-border py-2 pr-3 font-medium">
                    Status
                  </th>
                  <th className="border-b border-border py-2 text-right font-medium">
                    Combined
                  </th>
                </tr>
              </thead>
              <tbody>
                {cartons.map((carton) => (
                  <tr key={carton.id} className="hover:bg-muted/50">
                    <td className="border-b border-border py-2 pr-3 font-medium text-foreground">
                      {carton.cartonNo}
                      {carton.isCombinedCarton && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-primary">
                          Combined
                        </span>
                      )}
                    </td>
                    <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                      {carton.goods?.name ?? "—"}
                    </td>
                    <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                      {carton.warehouse?.name ?? "—"}
                    </td>
                    <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                      {carton.weightKg ?? "—"}
                    </td>
                    <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                      {carton.cbm ?? "—"}
                    </td>
                    <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                      {carton.status}
                    </td>
                    <td className="border-b border-border py-2 text-right text-muted-foreground">
                      {carton.childCartons?.length
                        ? carton.childCartons.join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
