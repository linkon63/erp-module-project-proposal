"use client"

export default function HongkongWarehousePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Warehouse
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Hongkong Warehouse</h1>
          <p className="text-sm text-muted-foreground">
            Workflows for Hongkong receiving, storage, and outbound to BD will appear here soon.
          </p>
        </div>

        <div className="w-full max-w-xl rounded-2xl border border-border bg-card/70 p-8 text-center shadow-sm backdrop-blur">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-xl font-semibold">⏳</span>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Coming soon
            </p>
            <p className="text-lg font-semibold">Hongkong Warehouse</p>
            <p className="text-sm text-muted-foreground">
              You will be able to view and manage carton status and preparation for shipments to Bangladesh.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
