"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardList, Package, PackageSearch, Ship } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  location: string;
  status: "active" | "inactive" | "pending";
};

export default function Home() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchUsers() {
      try {
        setLoadingUsers(true);
        const res = await fetch("/api/users", { signal: controller.signal });
        if (!res.ok) {
          throw new Error("Failed to load users");
        }
        const data = (await res.json()) as { users: UserRecord[] };
        setUsers(data.users);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setUserError("Unable to load users from SQLite");
      } finally {
        setLoadingUsers(false);
      }
    }

    fetchUsers();
    return () => controller.abort();
  }, []);

  return (
    <AppShell wide>
      {({ activePage }) => {
        const activeDescription = `${activePage} — Coming soon`;

        return (
          <div className="flex w-full flex-col gap-6">
            <div className="rounded-2xl border border-border bg-card/70 p-10 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-xl font-semibold">⏳</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    Coming soon
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {activePage}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {activeDescription}. We&apos;ll add full flows for this section
                    shortly. For now, you can navigate the sidebar to preview the
                    planned areas.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur sm:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-base font-semibold">Explore modules</h2>
                <p className="text-sm text-muted-foreground">
                  Jump into the carton and shipment workflows powered by Prisma + SQLite.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/cartons">
                      <Package className="mr-2 size-4" />
                      Cartons
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/shipments">
                      <Ship className="mr-2 size-4" />
                      Shipments
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center gap-3">
                  <ClipboardList className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Live data hooks</p>
                    <p className="text-xs text-muted-foreground">
                      APIs pull from SQLite via Prisma (`/api/cartons`, `/api/shipments`, `/api/goods`, `/api/warehouses`).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PackageSearch className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Combine cartons</p>
                    <p className="text-xs text-muted-foreground">
                      Use the combine form on /cartons to bundle 2+ cartons into one record.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Data Demo
                  </p>
                  <h2 className="text-xl font-semibold">SQLite Users</h2>
                  <p className="text-sm text-muted-foreground">
                    Records are stored locally in <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">data/app.db</code>.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  Live from SQLite
                </span>
              </div>

              <div className="overflow-x-auto px-6 py-4">
                {loadingUsers ? (
                  <p className="text-sm text-muted-foreground">Loading users…</p>
                ) : userError ? (
                  <p className="text-sm text-destructive">{userError}</p>
                ) : (
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="border-b border-border py-2 pr-3 font-medium">Name</th>
                        <th className="border-b border-border py-2 pr-3 font-medium">Email</th>
                        <th className="border-b border-border py-2 pr-3 font-medium">Role</th>
                        <th className="border-b border-border py-2 pr-3 font-medium">Location</th>
                        <th className="border-b border-border py-2 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/50">
                          <td className="border-b border-border py-2 pr-3 font-medium text-foreground">
                            {user.name}
                          </td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                            {user.email}
                          </td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                            {user.role}
                          </td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">
                            {user.location}
                          </td>
                          <td className="border-b border-border py-2 text-right">
                            <StatusPill status={user.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </AppShell>
  );
}

function StatusPill({ status }: { status: UserRecord["status"] }) {
  const colorMap: Record<UserRecord["status"], string> = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-zinc-200 text-zinc-700",
    pending: "bg-amber-100 text-amber-700",
  };

  const label =
    status === "active" ? "Active" : status === "pending" ? "Pending" : "Inactive";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${colorMap[status]}`}
    >
      {label}
    </span>
  );
}
