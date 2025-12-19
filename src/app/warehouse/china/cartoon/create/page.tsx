"use client"

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Warehouse = { id: number; name: string; code: string }
type Product = { id: number; name: string; nameCn: string | null }
type Customer = { id: number; name: string; phone: string | null }

type FormState = {
  cartonNo: string
  writtenCartonNo: string
  trackingNo: string
  goodsId: string
  customerId: string
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
  goods: { id: number; name: string; nameCn: string | null }
  customer: { id: number; name: string; phone: string | null } | null
  warehouse: { id: number; code: string; name: string } | null
}

export default function CreateCartonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    cartonNo: "",
    writtenCartonNo: "",
    trackingNo: "",
    goodsId: "",
    customerId: "",
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
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [productDraft, setProductDraft] = useState({ name: "", nameCn: "", shippingMark: "" })
  const [customerDraft, setCustomerDraft] = useState({ name: "", phone: "" })
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const defaultWarehouseId = useMemo(
    () => (warehouses[0]?.id ? String(warehouses[0].id) : ""),
    [warehouses]
  )
  const defaultProductId = useMemo(
    () => (products[0]?.id ? String(products[0].id) : ""),
    [products]
  )
  const defaultCustomerId = useMemo(
    () => (customers[0]?.id ? String(customers[0].id) : ""),
    [customers]
  )

  useEffect(() => {
    async function load() {
      try {
        const [warehouseRes, productRes, customerRes] = await Promise.all([
          fetch("/api/warehouses"),
          fetch("/api/products"),
          fetch("/api/customers"),
        ])
        const warehouseData = (await warehouseRes.json()) as { warehouses: Warehouse[] }
        const productData = (await productRes.json()) as { products: Product[] }
        const customerData = (await customerRes.json()) as { customers: Customer[] }
        setWarehouses(warehouseData.warehouses ?? [])
        setProducts(productData.products ?? [])
        setCustomers(customerData.customers ?? [])
      } catch (error) {
        console.error("Failed to load lookups", error)
      }
    }

    load()
  }, [])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      warehouseId: prev.warehouseId || defaultWarehouseId,
      goodsId: prev.goodsId || defaultProductId,
      customerId: prev.customerId || defaultCustomerId,
    }))
  }, [defaultCustomerId, defaultProductId, defaultWarehouseId])

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
          goodsId: c.goods?.id ? String(c.goods.id) : defaultProductId,
          customerId: c.customer?.id ? String(c.customer.id) : defaultCustomerId,
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
  }, [cartonId, defaultCustomerId, defaultProductId, defaultWarehouseId])

  const isEditing = Boolean(cartonId)

  const selectedWarehouse =
    warehouses.find((w) => String(w.id) === form.warehouseId) ?? warehouses[0] ?? null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const requiredFields = [
      { key: "cartonNo", label: "Carton #" },
      { key: "goodsId", label: "Product" },
      { key: "customerId", label: "Customer" },
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
      goodsId: form.goodsId.trim(),
      customerId: form.customerId.trim(),
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

    setStatus("saving")
    setMessage(null)
    try {
      const endpoint = isEditing ? `/api/cartons?id=${cartonId}` : "/api/cartons"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartonNo: trimmed.cartonNo,
          writtenCartonNo: trimmed.writtenCartonNo || undefined,
          trackingNo: trimmed.trackingNo || undefined,
          goodsId: Number(trimmed.goodsId),
          customerId: Number(trimmed.customerId),
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
          notes: trimmed.notes || undefined,
          status: "AT_CHINA_WH",
        }),
      })

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(errorBody?.error ?? "Create failed")
      }

      setStatus("success")
      setMessage(isEditing ? "Carton updated successfully." : "Carton created successfully.")
      if (!isEditing) {
        setForm({
          cartonNo: "",
          writtenCartonNo: "",
          trackingNo: "",
          goodsId: defaultProductId,
          customerId: defaultCustomerId,
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
        error instanceof Error ? error.message : "Unable to create carton. Please try again."
      )
    } finally {
      setTimeout(() => setStatus("idle"), 500)
    }
  }

  const createProduct = async () => {
    if (!productDraft.name.trim()) {
      setProductError("Product name is required")
      return
    }
    try {
      setSavingProduct(true)
      setProductError(null)
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productDraft.name.trim(),
          nameCn: productDraft.nameCn.trim() || undefined,
          shippingMark: productDraft.shippingMark.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to create product")
      }
      const data = (await res.json()) as { product: Product }
      setProducts((prev) => [...prev, data.product].sort((a, b) => a.name.localeCompare(b.name)))
      setForm((prev) => ({ ...prev, goodsId: String(data.product.id) }))
      setProductDraft({ name: "", nameCn: "", shippingMark: "" })
      setProductModalOpen(false)
    } catch (error) {
      console.error(error)
      setProductError(error instanceof Error ? error.message : "Unable to create product")
    } finally {
      setSavingProduct(false)
    }
  }

  const createCustomer = async () => {
    if (!customerDraft.name.trim()) {
      setCustomerError("Customer name is required")
      return
    }
    try {
      setSavingCustomer(true)
      setCustomerError(null)
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerDraft.name.trim(),
          phone: customerDraft.phone.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to create customer")
      }
      const data = (await res.json()) as { customer: Customer }
      setCustomers((prev) => [...prev, data.customer].sort((a, b) => a.name.localeCompare(b.name)))
      setForm((prev) => ({ ...prev, customerId: String(data.customer.id) }))
      setCustomerDraft({ name: "", phone: "" })
      setCustomerModalOpen(false)
    } catch (error) {
      console.error(error)
      setCustomerError(error instanceof Error ? error.message : "Unable to create customer")
    } finally {
      setSavingCustomer(false)
    }
  }

  const renderLookupBadge = () => {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{selectedWarehouse?.code ?? "CHN"}</span>
        <span className="truncate">{selectedWarehouse?.name ?? "China warehouse"}</span>
      </div>
    )
  }

  const actionMessage =
    status === "error"
      ? "Please resolve the errors above."
      : message ?? "Saves to China WH."

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
                  Select product + customer, then fill sizing and tracking.
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
                <table className="w-full min-w-[1250px] border-collapse text-sm">
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
                      <th className="border border-border px-3 py-2 text-left">Tracking #</th>
                      <th className="border border-border px-3 py-2 text-left">Product *</th>
                      <th className="border border-border px-3 py-2 text-left">Customer *</th>
                      <th className="border border-border px-3 py-2 text-left">Warehouse</th>
                      <th className="border border-border px-3 py-2 text-left">Pack #</th>
                      <th className="border border-border px-3 py-2 text-left">Unit pcs</th>
                      <th className="border border-border px-3 py-2 text-left">Weight (kg)</th>
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
                              setForm({
                                ...form,
                                writtenCartonNo: e.target.value,
                              })
                            }
                            placeholder="Written #"
                            className="h-9"
                          />
                        </div>
                      </td>
                      <td className="border border-border px-2 py-2">
                        <Input
                          value={form.trackingNo}
                          onChange={(e) => setForm({ ...form, trackingNo: e.target.value })}
                          placeholder="TRACK-001"
                          className="h-9"
                        />
                      </td>
                      <td className="border border-border px-2 py-2">
                        <div className="flex flex-col gap-2">
                          <select
                            value={form.goodsId}
                            onChange={(e) => setForm({ ...form, goodsId: e.target.value })}
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.nameCn ? ` / ${p.nameCn}` : ""}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setProductModalOpen(true)}
                          >
                            + New product
                          </Button>
                        </div>
                      </td>
                      <td className="border border-border px-2 py-2">
                        <div className="flex flex-col gap-2">
                          <select
                            value={form.customerId}
                            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                          >
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.phone ? ` (${c.phone})` : ""}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCustomerModalOpen(true)}
                          >
                            + New customer
                          </Button>
                        </div>
                      </td>
                      <td className="border border-border px-2 py-2">{renderLookupBadge()}</td>
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
                          onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                          placeholder="35.4"
                          className="h-9"
                        />
                      </td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Extras
                      </td>
                      <td className="border border-border px-2 py-2" colSpan={8}>
                        <div className="grid gap-3 lg:grid-cols-4">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <Input
                              inputMode="decimal"
                              value={form.lengthCm}
                              onChange={(e) => setForm({ ...form, lengthCm: e.target.value })}
                              placeholder="L (cm)"
                              className="h-9"
                            />
                            <Input
                              inputMode="decimal"
                              value={form.widthCm}
                              onChange={(e) => setForm({ ...form, widthCm: e.target.value })}
                              placeholder="W (cm)"
                              className="h-9"
                            />
                            <Input
                              inputMode="decimal"
                              value={form.heightCm}
                              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                              placeholder="H (cm)"
                              className="h-9"
                            />
                          </div>
                          <Input
                            inputMode="decimal"
                            value={form.cbm}
                            onChange={(e) => setForm({ ...form, cbm: e.target.value })}
                            placeholder="CBM"
                            className="h-9"
                          />
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
                              onChange={(e) => setForm({ ...form, copyNumber: e.target.value })}
                              placeholder="Copy #"
                              className="h-9"
                            />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              value={form.remarks}
                              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                              placeholder="Remarks"
                              className="h-9"
                            />
                            <Input
                              value={form.notes}
                              onChange={(e) => setForm({ ...form, notes: e.target.value })}
                              placeholder="Notes"
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span
                            className={`text-xs ${
                              status === "error"
                                ? "text-destructive"
                                : status === "success"
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {actionMessage}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => router.push("/warehouse/china")}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={status === "saving" || loadingCarton}>
                              {status === "saving"
                                ? isEditing
                                  ? "Saving..."
                                  : "Adding..."
                                : isEditing
                                  ? "Save"
                                  : "Add"}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </form>
          </div>

          {productModalOpen ? (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      New product
                    </p>
                    <h2 className="text-xl font-semibold">Add a product</h2>
                    <p className="text-sm text-muted-foreground">
                      Product name must be unique.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setProductModalOpen(false)}>
                    Close
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  <Input
                    value={productDraft.name}
                    onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })}
                    placeholder="Product name *"
                  />
                  <Input
                    value={productDraft.nameCn}
                    onChange={(e) => setProductDraft({ ...productDraft, nameCn: e.target.value })}
                    placeholder="Product name (CN)"
                  />
                  <Input
                    value={productDraft.shippingMark}
                    onChange={(e) =>
                      setProductDraft({ ...productDraft, shippingMark: e.target.value })
                    }
                    placeholder="Shipping mark"
                  />
                  {productError ? (
                    <p className="text-xs text-destructive">{productError}</p>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => setProductModalOpen(false)} disabled={savingProduct}>
                    Cancel
                  </Button>
                  <Button onClick={createProduct} disabled={savingProduct}>
                    {savingProduct ? "Saving..." : "Save product"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {customerModalOpen ? (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      New customer
                    </p>
                    <h2 className="text-xl font-semibold">Add a customer</h2>
                    <p className="text-sm text-muted-foreground">
                      Customer name must be unique.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCustomerModalOpen(false)}>
                    Close
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  <Input
                    value={customerDraft.name}
                    onChange={(e) => setCustomerDraft({ ...customerDraft, name: e.target.value })}
                    placeholder="Customer name *"
                  />
                  <Input
                    value={customerDraft.phone}
                    onChange={(e) => setCustomerDraft({ ...customerDraft, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                  {customerError ? (
                    <p className="text-xs text-destructive">{customerError}</p>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => setCustomerModalOpen(false)} disabled={savingCustomer}>
                    Cancel
                  </Button>
                  <Button onClick={createCustomer} disabled={savingCustomer}>
                    {savingCustomer ? "Saving..." : "Save customer"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  )
}
