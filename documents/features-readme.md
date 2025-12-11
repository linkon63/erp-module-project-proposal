# Project Features (Plain-English Tour)

## What you can do
- **See the business at a glance**: Dashboard rolls up shipments, cartons, cash collected/due, pipeline stages, and highlights anything needing attention.
- **Manage warehouse cartons**: View, sort, and select cartons; create shipments in bulk (by rate-per-kg or existing billing); request box printing; delete mistakes.
- **Add or edit cartons quickly**: One form for carton numbers, goods info, sizes/weight, billing, and warehouse assignment.
- **Control shipments (China → Bangladesh)**: Track every shipment with carton counts and money; drill into carton-level details; record collections; mark cartons delivered (only after money is fully collected).
- **Handle box-print requests**: Submit printing requests in bulk; approve them later with a single printed number and optional notes; approvals update carton numbers and move them back into the warehouse list.

## How the app feels
- **Simple navigation**: Sidebar with clear sections for Warehouse, Shipments, Box Requests, and Dashboard; adapts to mobile with a slide-out panel.
- **No login walls**: Prototype APIs are open for local use; great for demos and quick testing.

## Under the hood (lightweight)
- **APIs**: Cartons (create/update/delete/collect), Shipments (list/create/update/mark delivered), Box Requests (list/create/approve), Warehouses (list active).
- **Data model**: SQLite + Prisma with Warehouses, Goods, Cartons (status, billing, metrics), Shipments (JSON carton list with totals), BoxRequests.
- **Starter data**: `npm run db:seed` loads sample warehouses, goods, cartons, and a starter shipment so screens aren’t empty.

## Feature list for developers
- **Tech stack**: Next.js App Router, React 19, Tailwind v4, shadcn/ui subset, Prisma + SQLite.
- **UI building blocks**: Reusable sidebar, sheet, tooltip, button, separator, skeleton components; mobile-aware sidebar via `useIsMobile`.
- **Carton workflows**:
  - Create/update cartons (auto-upsert goods by EN/CN names; default warehouse selection).
  - Status transitions: `AT_CHINA_WH` → `BOX_REQUEST_PENDING` → `AT_CHINA_WH` (after approval) → `IN_SHIPMENT` → `DELIVERED`.
  - Billing/collection: `billedAmount` and `collectedAmount` at carton level; PATCH keeps shipment collections in sync.
- **Shipment workflows**:
  - Create from selected cartons; rejects already shipped/delivered cartons; auto-bills via rate-per-kg fallback.
  - Stored carton list as JSON; GET hydrates `cartonDetails`.
  - PUT status `DELIVERED` cascades delivered state to cartons.
- **Box request workflows**:
  - POST creates PENDING requests and marks cartons `BOX_REQUEST_PENDING`.
  - PUT bulk/single approval sets `cartonNo`/`printedCartonNo`, status back to `AT_CHINA_WH`.
- **Dashboard data shaping**: Aggregations for pipeline counts, readiness metrics, SLA/aging, dues, exceptions, and cash trends.
- **Seeds**: Warehouses (CN/BD), goods, sample cartons (including combined-carton example), starter shipment.
- **Files of note**: 
  - API routes under `src/app/api/*` (cartons, shipments, box-requests, warehouses).
  - Warehouse UI: `src/app/warehouse/china/page.tsx` and carton form `.../cartoon/create/page.tsx`.
  - Shipments UI: `src/app/shipments/china/page.tsx`.
  - Dashboard: `src/app/page.tsx`.
  - Shared shell: `src/components/app-shell.tsx`.

## Typical flow (story form)
1) Add or edit cartons in the China warehouse.  
2) When ready, select cartons and create a shipment; cartons move to `IN_SHIPMENT` and get billed.  
3) If you need printed numbers, raise box requests; approve them later to assign the printed carton numbers and bring cartons back to the warehouse list.  
4) As money comes in, record collections per carton; once all dues are cleared, mark cartons delivered (or mark the whole shipment delivered).  
5) The dashboard reflects everything—what’s ready, in transit, delivered, and how cash collection is tracking.  
