"use client"

import { useEffect, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Product = { id: number; name: string; nameCn: string | null; shippingMark: string | null }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ id?: number; name: string; nameCn: string; shippingMark: string }>({
    name: "",
    nameCn: "",
    shippingMark: "",
  })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/products")
      const data = (await res.json()) as { products: Product[] }
      setProducts(data.products ?? [])
    } catch (err) {
      console.error(err)
      setError("Unable to load products.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Product name is required.")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const isEditing = Boolean(form.id)
      const endpoint = isEditing ? `/api/products?id=${form.id}` : "/api/products"
      const method = isEditing ? "PUT" : "POST"
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nameCn: form.nameCn.trim() || undefined,
          shippingMark: form.shippingMark.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to save product")
      }
      const data = (await res.json()) as { product: Product }
      if (isEditing) {
        setProducts((prev) => prev.map((p) => (p.id === data.product.id ? data.product : p)))
      } else {
        setProducts((prev) => [...prev, data.product].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setForm({ id: undefined, name: "", nameCn: "", shippingMark: "" })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to save product.")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (product: Product) => {
    setForm({
      id: product.id,
      name: product.name,
      nameCn: product.nameCn ?? "",
      shippingMark: product.shippingMark ?? "",
    })
  }

  const resetForm = () => {
    setForm({ id: undefined, name: "", nameCn: "", shippingMark: "" })
    setError(null)
  }

  return (
    <AppShell wide>
      {() => (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Products</p>
              <h1 className="text-2xl font-semibold tracking-tight">Manage products</h1>
              <p className="text-sm text-muted-foreground">
                Create and edit products (name unique). CN name and shipping mark are optional.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Clear form
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Update" : "Add"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Product name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Product name (CN)
                </label>
                <Input
                  value={form.nameCn}
                  onChange={(e) => setForm({ ...form, nameCn: e.target.value })}
                  placeholder="中文名称"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Shipping mark
                </label>
                <Input
                  value={form.shippingMark}
                  onChange={(e) => setForm({ ...form, shippingMark: e.target.value })}
                  placeholder="Mark"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : form.id ? "Update" : "Add"}
                </Button>
                {form.id ? (
                  <Button variant="ghost" onClick={resetForm} disabled={saving}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">List</p>
                <h2 className="text-lg font-semibold">Products</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {loading ? "Loading..." : `${products.length} total`}
              </span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="border border-border px-3 py-2 text-left">Name</th>
                    <th className="border border-border px-3 py-2 text-left">Name (CN)</th>
                    <th className="border border-border px-3 py-2 text-left">Shipping mark</th>
                    <th className="border border-border px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        No products yet.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="bg-background/80">
                        <td className="border border-border px-3 py-2 font-semibold text-foreground">
                          {product.name}
                        </td>
                        <td className="border border-border px-3 py-2 text-muted-foreground">
                          {product.nameCn || "—"}
                        </td>
                        <td className="border border-border px-3 py-2 text-muted-foreground">
                          {product.shippingMark || "—"}
                        </td>
                        <td className="border border-border px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(product)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
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
