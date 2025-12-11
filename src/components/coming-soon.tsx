"use client"

import type { LucideIcon } from "lucide-react"
import { Clock3, Sparkles } from "lucide-react"

type ComingSoonHighlight = {
  title: string
  description: string
  icon?: LucideIcon
}

type ComingSoonProps = {
  label: string
  title: string
  description: string
  highlights?: ComingSoonHighlight[]
}

export function ComingSoon({
  label,
  title,
  description,
  highlights = [],
}: ComingSoonProps) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/80 p-10 shadow-sm backdrop-blur">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-8 top-[-10%] h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute right-[-6%] bottom-[-20%] h-44 w-44 rounded-full bg-amber-200/50 blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Clock3 className="size-4" />
            <span>Coming soon</span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            {label}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {highlights.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {highlights.map(({ title, description, icon: Icon }, idx) => (
            <div
              key={`${title}-${idx}`}
              className="rounded-2xl border border-border bg-background/60 p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {Icon ? <Icon className="size-5" /> : <Sparkles className="size-5" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
