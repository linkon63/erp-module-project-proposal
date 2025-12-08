"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Package,
  PackageSearch,
  Ship,
  ShieldCheck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  location: string;
  status: "active" | "inactive" | "pending";
};

type NavItem = {
  label: string;
  icon: LucideIcon;
  value: string;
  href?: string;
  children?: {
    label: string;
    value: string;
    href?: string;
    icon?: LucideIcon;
  }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", value: "Dashboard", icon: LayoutDashboard },
  {
    label: "Warehouse",
    value: "Warehouse",
    icon: Warehouse,
    children: [
      {
        label: "China Warehouse",
        value: "China Warehouse",
        icon: Building2,
        href: "/warehouse/china",
      },
      {
        label: "Hongkong Warehouse",
        value: "Hongkong Warehouse",
        icon: Building2,
        href: "/warehouse/hongkong",
      },
    ],
  },
  {
    label: "Shipment",
    value: "Shipment",
    icon: Ship,
    children: [
      { label: "China Shipment", value: "China Shipment", icon: PackageSearch },
      { label: "Hongkong Shipment", value: "Hongkong Shipment", icon: PackageSearch },
    ],
  },
  { label: "Box Request", value: "Box Request", icon: Boxes },
  { label: "Reports", value: "Reports", icon: FileBarChart },
  { label: "ACL", value: "ACL", icon: ShieldCheck },
  { label: "Logout", value: "Logout", icon: LogOut },
];

export default function Home() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Warehouse: true,
    Shipment: true,
  });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const pathname = usePathname();

  const activeDescription = useMemo(
    () => `${activePage} — Coming soon`,
    [activePage]
  );

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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

  useEffect(() => {
    // Sync active label with current path when navigating to warehouse pages.
    const matched = NAV_ITEMS.flatMap((item) => item.children ?? []).find(
      (child) => child.href === pathname
    );
    if (matched) {
      setActivePage(matched.value);
    }
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="bg-gradient-to-br from-background via-background to-muted/40 text-foreground">
        <div className="flex min-h-screen">
          <Sidebar collapsible="offcanvas">
            <SidebarHeader className="border-b border-sidebar-border pb-4">
              <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 px-3 py-2">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
                  JA
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Jamalpur Associate</span>
                  <span className="text-xs text-sidebar-foreground/70">
                    Operations Suite
                  </span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="text-[11px] uppercase tracking-wide">
                  Navigation
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const hasChildren = item.children && item.children.length > 0;
                      const isOpen = openSections[item.label] ?? true;
                      const isActive =
                        activePage === item.value ||
                        item.children?.some(
                          (child) =>
                            child.value === activePage ||
                            (child.href && child.href === pathname)
                        );

                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => {
                              setActivePage(item.value);
                              if (hasChildren) toggleSection(item.label);
                            }}
                            className="justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              <span>{item.label}</span>
                            </div>
                            {hasChildren ? (
                              <ChevronDown
                                className={`size-4 transition-transform ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            ) : null}
                          </SidebarMenuButton>

                          {hasChildren && isOpen ? (
                            <SidebarMenuSub>
                              {item.children?.map((child) => {
                                const ChildIcon = child.icon ?? Icon;
                                const href = child.href;
                                return (
                                  <SidebarMenuSubItem key={child.label}>
                                    <SidebarMenuSubButton
                                      asChild={Boolean(href)}
                                      isActive={
                                        activePage === child.value ||
                                        (href && href === pathname)
                                      }
                                      onClick={() => setActivePage(child.value)}
                                    >
                                      {href ? (
                                        <Link href={href}>
                                          <ChildIcon className="size-4" />
                                          <span>{child.label}</span>
                                        </Link>
                                      ) : (
                                        <>
                                          <ChildIcon className="size-4" />
                                          <span>{child.label}</span>
                                        </>
                                      )}
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          ) : null}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter className="pb-4">
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs text-sidebar-foreground/80">
                Click any item to view its page. Each section is currently marked as
                &ldquo;Coming soon&rdquo; while designs are in progress.
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset>
            <header className="sticky top-0 flex items-center gap-3 border-b bg-background/80 px-6 py-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
              <SidebarTrigger />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  Selected page
                </span>
                <span className="text-lg font-semibold">{activePage}</span>
              </div>
            </header>

            <div className="flex flex-1 items-center justify-center px-6 py-12">
              <div className="flex w-full max-w-5xl flex-col gap-6">
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
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
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
