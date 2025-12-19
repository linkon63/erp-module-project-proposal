# API Reference

Base URL: `http://localhost:3000`

Authentication: none (prototype).

## Cartons

### List or fetch one
- `GET /api/cartons`
- Query: `id` (number) to fetch a single carton; otherwise returns all non-`DELETED`.
- Response:
  - `200` `{ carton }` when `id` is provided.
  - `200` `{ cartons: [...] }` for list.
  - `404` `{ error }` if not found.

### Create
- `POST /api/cartons`
- Body (JSON, required): `cartonNo`, `goodsId` (product), `customerId`.
- Optional: `goodsNameEn` + `goodsNameCn` (will upsert products), `writtenCartonNo`, `trackingNo`, `packNo`, `unitPcs`, `weightKg`, `lengthCm`, `widthCm`, `heightCm`, `cbm`, `unitPrice`, `currencyCode`, `shippingMark`, `remarks`, `copyNumber`, `notes`, `warehouseId`, `status`.
- Behavior: upserts goods when names provided; picks first active warehouse if `warehouseId` absent; sets `status` to `AT_CHINA_WH` by default; initializes `childCartons` to `[]`.
- Response: `201 { carton }` or `400/500 { error }`.

### Update (full)
- `PUT /api/cartons?id={id}`
- Same body as create; requires goods; updates fields and `printedCartonNo` to `cartonNo`.
- Response: `200 { carton }` or error.

### Update (partial)
- `PATCH /api/cartons?id={id}`
- Body (any of): `collectedAmount`, `billedAmount`, `delivered` (boolean), `deliveredAt` (ISO string), `status`.
- Behavior: if `delivered: true`, sets `status` to `DELIVERED` and stamps `deliveredAt`; keeps related shipment `collectedAmount` in sync.
- Response: `200 { carton }` or error.

### Soft delete
- `DELETE /api/cartons?id={id}`
- Sets `status` to `DELETED`.
- Response: `200 { carton }` or error.

## Shipments

### List
- `GET /api/shipments`
- Returns `{ shipments: [...] }` with `cartons` parsed to array, `cartonDetails` joined, and `collectedAmount`/`totalPrice` reconciled from cartons.

### Create
- `POST /api/shipments`
- Body (required): `shipmentNo`, and `cartonIds` array **or** `cartonNos` array.
- Optional: `fromWarehouse`, `toWarehouse`, `plannedShipDate`, `status`, `totalPrice`, `collectedAmount`, `ratePerKg`.
- Behavior: rejects cartons already `IN_SHIPMENT` or delivered; sets eligible cartons to `IN_SHIPMENT`; sets per-carton `billedAmount` using existing billed or `weightKg * ratePerKg`; computes `totalPrice` when not provided.
- Response: `201 { shipment, skipped: [cartonNos] }` or error.

### Update status/collection
- `PUT /api/shipments?id={id}`
- Body: `collectedAmount?`, `status?`.
- Behavior: if `status` is `DELIVERED`, marks all cartons in shipment as `DELIVERED` and stamps `deliveredAt`.
- Response: `200 { shipment }` or error.

## Box Requests

### List
- `GET /api/box-requests`
- Response: `{ requests: [...] }` with carton included.

### Create
- `POST /api/box-requests`
- Body: `requests` array of `{ cartonId, printedCartonNo?, notes? }`.
- Behavior: validates cartons exist; creates PENDING requests; sets cartons to `BOX_REQUEST_PENDING`.
- Response: `200 { requests }` or error.

### Approve
- Bulk: `PUT /api/box-requests` with body containing `requestIds` array (or `requests` array with ids) and `printedCartonNo`.
- Single: `PUT /api/box-requests?id={id}` with body containing `printedCartonNo`.
- Optional: `notes`.
- Behavior: updates requests to `APPROVED`, updates cartons’ `cartonNo`/`printedCartonNo`, sets status to `AT_CHINA_WH`.
- Response: `200 { requests }` (bulk) or `{ request, carton }` (single) or error.

## Customers

- `GET /api/customers` (or `?id=`) – list or fetch one.
- `POST /api/customers` – body: `name` (required, unique), `phone?`, `notes?`.
- `PUT /api/customers?id=` – update `name?`, `phone?`, `notes?`.

## Products (Goods)

- `GET /api/products` (or `?id=`) – list or fetch one.
- `POST /api/products` – body: `name` (required, unique), `nameCn?`, `shippingMark?`.
- `PUT /api/products?id=` – update `name?`, `nameCn?`, `shippingMark?`.

## Warehouses

- `GET /api/warehouses` → `{ warehouses }` (active only).

## Runtime

- All routes are `runtime = "nodejs"` and `dynamic = "force-dynamic"`; no caching expected.
