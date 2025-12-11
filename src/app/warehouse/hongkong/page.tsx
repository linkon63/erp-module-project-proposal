"use client"

import { ClipboardList, PackageSearch, ShieldCheck, Warehouse } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { ComingSoon } from "@/components/coming-soon"

export default function HongkongWarehousePage() {
  return (
    <AppShell wide>
      {() => (
        <ComingSoon
          label="Warehouse"
          title="Hongkong Warehouse"
          description="We are designing the Hongkong receiving flow with bin locations, QA notes, and smooth handoff to Bangladesh shipments."
          highlights={[
            {
              title: "Inbound and QA",
              description: "Scan cartons, capture photos, and flag any exceptions before shelving.",
              icon: ClipboardList,
            },
            {
              title: "Storage map",
              description: "Reserve racks and aisles so cartons are easy to find when building loads.",
              icon: Warehouse,
            },
            {
              title: "Prep for Bangladesh",
              description: "Bundle cartons for outbound and keep packing slips ready for export.",
              icon: PackageSearch,
            },
            {
              title: "Controls and audit",
              description: "Simple checklists to keep tallies accurate and give finance a clean handover.",
              icon: ShieldCheck,
            },
          ]}
        />
      )}
    </AppShell>
  )
}
