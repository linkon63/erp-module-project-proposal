"use client"

import { ClipboardList, PackageSearch, Ship, Wallet } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { ComingSoon } from "@/components/coming-soon"

export default function HongkongShipmentsPage() {
  return (
    <AppShell wide>
      {() => (
        <ComingSoon
          label="Shipment"
          title="Hongkong to Bangladesh shipments"
          description="We are building a dedicated Hongkong manifest flow so you can assemble cartons, generate paperwork, and keep finance in sync before departure."
          highlights={[
            {
              title: "Manifest builder",
              description: "Select cartons from the Hongkong warehouse and lock a final load sheet.",
              icon: PackageSearch,
            },
            {
              title: "Documents and labels",
              description: "Print packing lists, invoices, and airway bill details straight from the shipment record.",
              icon: ClipboardList,
            },
            {
              title: "Costs and collection",
              description: "Capture freight, duty, and collection amounts so Bangladesh receives a clean ledger.",
              icon: Wallet,
            },
            {
              title: "Live status",
              description: "Track each leg from handover in Hongkong through arrival at Bangladesh warehouse.",
              icon: Ship,
            },
          ]}
        />
      )}
    </AppShell>
  )
}
