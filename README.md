# ERP Solutions

In the warehouse page, select cartons → click Box Requests → optionally add a note → submit. Those cartons become BOX_REQUEST_PENDING and disappear from the warehouse list until approved.
/api/box-requests stores requests as PENDING with the note, no new carton number required when creating.
On /boxrequest, you see all requests. Enter one Printed Carton # (and optional note), select the requests, and click “Accept selected.”
Bulk approval calls PUT /api/box-requests, sets requests to APPROVED, updates all selected cartons to the new carton number, and restores them to AT_CHINA_WH.
After approval, refresh the warehouse page: cartons reappear grouped by their new carton number.

Next.js App Router starter with Tailwind CSS v4 and shadcn/ui ready to scaffold new screens.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel, along with Tailwind CSS v4.

## SQLite data

- Local database lives at `data/app.db`. Prisma schema is in `prisma/schema.prisma`.
- Seed everything (warehouses, goods, cartons, shipments) with:

```bash
npm run db:seed
```

- API endpoints:
  - `GET/POST /api/cartons` – add/list cartons
  - `GET /api/warehouses` – lookup data
  - `GET/POST /api/shipments` – create/list shipments
- Server utility lives in `src/lib/prisma.ts` (Prisma client).

## UI components (shadcn/ui)

- Component registry is configured in `components.json`.
- A base `Button` component lives in `src/components/ui/button.tsx`.
- Add more components any time with `npx shadcn add <component>`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# erp-module-project-proposal
