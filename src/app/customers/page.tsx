"use client"

import { useEffect, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Customer = { id: number; name: string; phone: string | null }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ id?: number; name: string; phone: string }>({
    name: "",
    phone: "",
  })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/customers")
      const data = (await res.json()) as { customers: Customer[] }
      setCustomers(data.customers ?? [])
    } catch (err) {
      console.error(err)
      setError("Unable to load customers.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const isEditing = Boolean(form.id)
      const endpoint = isEditing ? `/api/customers?id=${form.id}` : "/api/customers"
      const method = isEditing ? "PUT" : "POST"
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() || undefined }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Unable to save customer")
      }
      const data = (await res.json()) as { customer: Customer }
      if (isEditing) {
        setCustomers((prev) => prev.map((c) => (c.id === data.customer.id ? data.customer : c)))
      } else {
        setCustomers((prev) => [...prev, data.customer].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setForm({ id: undefined, name: "", phone: "" })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to save customer.")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (customer: Customer) => {
    setForm({ id: customer.id, name: customer.name, phone: customer.phone ?? "" })
  }

  const resetForm = () => {
    setForm({ id: undefined, name: "", phone: "" })
    setError(null)
  }

  return (
    <AppShell wide>
      {() => (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Customers</p>
              <h1 className="text-2xl font-semibold tracking-tight">Manage customers</h1>
              <p className="text-sm text-muted-foreground">
                Add or update customers (unique names) and phone numbers.
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Customer name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+8801..."
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
                <h2 className="text-lg font-semibold">Customers</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {loading ? "Loading..." : `${customers.length} total`}
              </span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="border border-border px-3 py-2 text-left">Name</th>
                    <th className="border border-border px-3 py-2 text-left">Phone</th>
                    <th className="border border-border px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="border border-border px-3 py-4 text-center text-muted-foreground">
                        No customers yet.
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="bg-background/80">
                        <td className="border border-border px-3 py-2 font-semibold text-foreground">
                          {customer.name}
                        </td>
                        <td className="border border-border px-3 py-2 text-muted-foreground">
                          {customer.phone || "—"}
                        </td>
                        <td className="border border-border px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(customer)}
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
