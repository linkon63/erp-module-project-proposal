"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Boxes,
  Building2,
  ChevronDown,
  LayoutDashboard,
  PackageSearch,
  Ship,
  FileBarChart,
  Warehouse,
  type LucideIcon,
} from "lucide-react"

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
} from "@/components/ui/sidebar"

type NavItem = {
  label: string
  icon: LucideIcon
  value: string
  href?: string
  children?: {
    label: string
    value: string
    href?: string
    icon?: LucideIcon
  }[]
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", value: "Dashboard", icon: LayoutDashboard, href: "/" },
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
      {
        label: "China Shipment To BD",
        value: "China Shipment",
        icon: PackageSearch,
        href: "/shipments/china",
      },
      {
        label: "Hongkong Shipment To BD",
        value: "Hongkong Shipment",
        icon: PackageSearch,
        href: "/shipments/hongkong",
      },
    ],
  },
  { label: "Box Request", value: "Box Request", icon: Boxes, href: "/boxrequest" },
  { label: "Reports", value: "Reports", icon: FileBarChart, href: "/reports" },
]

type AppShellProps = {
  children: (ctx: { activePage: string }) => ReactNode
  wide?: boolean
  contentClassName?: string
}

export function AppShell({ children, wide = false, contentClassName }: AppShellProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Warehouse: true,
    Shipment: true,
  })

  const [userActive, setUserActive] = useState<string | null>(null)

  const activePage = useMemo(() => {
    const matchedChild = NAV_ITEMS.flatMap((item) => item.children ?? []).find(
      (child) => child.href === pathname
    )
    if (matchedChild) return matchedChild.value

    const matchedTop = NAV_ITEMS.find((item) => item.href === pathname)
    if (matchedTop) return matchedTop.value

    return userActive ?? "Dashboard"
  }, [pathname, userActive])

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const contentClass = [
    "w-full",
    wide ? "max-w-full" : "max-w-5xl",
    contentClassName,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <SidebarProvider>
      <div className="bg-gradient-to-br from-background via-background to-muted/40 text-foreground w-full">
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="offcanvas">
            <SidebarHeader className="border-b border-sidebar-border pb-5">
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
                      const Icon = item.icon
                      const hasChildren = item.children && item.children.length > 0
                      const isOpen = openSections[item.label] ?? true
                      const isActive =
                        activePage === item.value ||
                        item.children?.some(
                          (child) =>
                            child.value === activePage ||
                            (child.href && child.href === pathname)
                        )

                      const buttonContent = (
                        <>
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
                        </>
                      )

                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            asChild={Boolean(item.href)}
                            isActive={isActive}
                            onClick={() => {
                              setUserActive(item.value)
                              if (hasChildren) toggleSection(item.label)
                            }}
                            className="justify-between"
                          >
                            {item.href ? (
                              <Link href={item.href}>{buttonContent}</Link>
                            ) : (
                              buttonContent
                            )}
                          </SidebarMenuButton>

                          {hasChildren && isOpen ? (
                            <SidebarMenuSub>
                              {item.children?.map((child) => {
                                const ChildIcon = child.icon ?? Icon
                                const href = child.href
                                return (
                                  <SidebarMenuSubItem key={child.label}>
                                    <SidebarMenuSubButton
                                      asChild={Boolean(href)}
                                      isActive={
                                        activePage === child.value ||
                                        (href && href === pathname)
                                      }
                                      onClick={() => setUserActive(child.value)}
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
                                )
                              })}
                            </SidebarMenuSub>
                          ) : null}
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator />
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

            <div className="flex flex-1 items-start justify-start px-6 py-10">
              <div className={contentClass}>{children({ activePage })}</div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
