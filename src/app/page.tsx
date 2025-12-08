import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1 text-xs text-muted-foreground shadow-sm">
          <span className="inline-flex size-2 rounded-full bg-emerald-500" />
          Ready-made Next.js + shadcn/ui starter
        </div>

        <div className="space-y-5 text-center sm:max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build quickly with Tailwind CSS and shadcn/ui
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            App Router, Tailwind v4, and the shadcn registry are already wired up.
            Drop in new components with the CLI and ship polished UI without extra setup.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="https://ui.shadcn.com/docs" target="_blank">
              Browse components
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="https://github.com/shadcn/ui" target="_blank">
              View on GitHub
              <Github className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="https://nextjs.org/docs" target="_blank">
              Next.js docs
            </Link>
          </Button>
        </div>

        <div className="grid w-full gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-base font-semibold">What&apos;s included</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-2 size-2 rounded-full bg-primary" />
                <span>TypeScript, ESLint, and Tailwind v4 configured for the App Router.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 size-2 rounded-full bg-primary" />
                <span>
                  shadcn registry ready via <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">components.json</code>.
                  Add more UI with <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">npx shadcn add &lt;component&gt;</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 size-2 rounded-full bg-primary" />
                <span>Utility helpers and variants for re-usable components.</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-5">
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="text-sm text-muted-foreground">
              The <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">Button</code> component supports
              variants and sizes out of the box.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
