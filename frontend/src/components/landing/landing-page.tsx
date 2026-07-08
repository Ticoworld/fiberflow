import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useState } from 'react'

import { Button } from '#/components/ui/button.tsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet.tsx'

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
] as const

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="landing-motion light relative min-h-svh overflow-x-hidden bg-[oklch(0.985_0.012_175)] text-[oklch(0.22_0.03_175)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-8%,oklch(0.82_0.1_165/0.45),transparent_55%),radial-gradient(ellipse_45%_35%_at_100%_18%,oklch(0.88_0.05_200/0.35),transparent_50%),radial-gradient(ellipse_40%_30%_at_0%_65%,oklch(0.9_0.06_155/0.3),transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(oklch(0.45_0.08_165/0.07)_1px,transparent_1px),linear-gradient(90deg,oklch(0.45_0.08_165/0.07)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
      />

      <header className="relative z-20 animate-landing-fade">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
          <a
            href="#top"
            className="font-display text-lg font-semibold tracking-tight text-[oklch(0.28_0.07_170)] sm:text-xl"
          >
            FiberFlow
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[oklch(0.42_0.03_175)] transition-colors hover:text-[oklch(0.22_0.03_175)]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              asChild
              className="text-[oklch(0.28_0.05_170)] hover:bg-[oklch(0.94_0.03_165)] hover:text-[oklch(0.22_0.05_170)]"
            >
              <Link to="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="bg-[oklch(0.45_0.12_165)] text-[oklch(0.98_0.01_165)] hover:bg-[oklch(0.4_0.12_165)]"
            >
              <Link to="/signup">Get started</Link>
            </Button>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-[oklch(0.28_0.05_170)] hover:bg-[oklch(0.94_0.03_165)] md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)] bg-white text-[oklch(0.22_0.03_175)]">
              <SheetHeader>
                <SheetTitle className="font-display text-left text-[oklch(0.28_0.07_170)]">
                  FiberFlow
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-3 text-base text-[oklch(0.28_0.04_170)] transition-colors hover:bg-[oklch(0.95_0.02_165)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-2 px-4">
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-[oklch(0.45_0.08_165/0.35)] text-[oklch(0.28_0.05_170)]"
                >
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-[oklch(0.45_0.12_165)] text-[oklch(0.98_0.01_165)] hover:bg-[oklch(0.4_0.12_165)]"
                >
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="top" className="relative z-10">
        <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden sm:min-h-[calc(100svh-4.5rem)]">
          <div
            aria-hidden
            className="absolute inset-0 animate-landing-drift bg-[radial-gradient(circle_at_70%_40%,oklch(0.72_0.12_165/0.28),transparent_42%),radial-gradient(circle_at_25%_70%,oklch(0.78_0.08_200/0.22),transparent_38%)]"
          />
          <div
            aria-hidden
            className="absolute -right-24 bottom-0 h-[55%] w-[70%] animate-landing-pulse rounded-full bg-[oklch(0.7_0.1_165/0.12)] blur-3xl sm:-right-16 sm:h-[65%] sm:w-[55%]"
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-8 sm:gap-12 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10 lg:px-8 lg:pb-20 lg:pt-10">
            <div className="max-w-xl animate-landing-rise space-y-5 sm:space-y-7">
              <p className="font-display text-4xl font-semibold tracking-tight text-[oklch(0.26_0.08_170)] sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
                FiberFlow
              </p>
              <h1 className="font-serif text-2xl leading-snug text-[oklch(0.3_0.045_175)] sm:text-3xl md:text-[2.15rem] md:leading-snug">
                Accept Fiber payments on your store.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-[oklch(0.42_0.03_175)] sm:text-lg">
                Invoices, checkout, and webhooks for Nervos Fiber — self-hosted,
                like Stripe Checkout for CKB.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  asChild
                  className="w-full bg-[oklch(0.45_0.12_165)] text-[oklch(0.98_0.01_165)] hover:bg-[oklch(0.4_0.12_165)] sm:w-auto"
                >
                  <Link to="/signup">Create account</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full border-[oklch(0.45_0.08_165/0.4)] bg-white/70 text-[oklch(0.28_0.05_170)] backdrop-blur-sm hover:bg-white sm:w-auto"
                >
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg animate-landing-rise [animation-delay:120ms] lg:mx-0 lg:max-w-none">
              <CheckoutVisual />
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-[oklch(0.55_0.06_165/0.15)] bg-white/55"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-2xl space-y-3">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[oklch(0.26_0.08_170)] sm:text-4xl">
                From cart to paid
              </h2>
              <p className="text-base text-[oklch(0.42_0.03_175)] sm:text-lg">
                Your store creates an invoice. The customer pays on FiberFlow
                checkout. You get a webhook and fulfill the order.
              </p>
            </div>

            <ol className="mt-12 grid gap-8 sm:mt-14 sm:grid-cols-3 sm:gap-6 lg:gap-10">
              {[
                {
                  step: '01',
                  title: 'Create an invoice',
                  body: 'Your backend calls the FiberFlow API when a customer checks out.',
                },
                {
                  step: '02',
                  title: 'Customer pays',
                  body: 'They open the checkout page and pay with any Fiber-compatible wallet.',
                },
                {
                  step: '03',
                  title: 'You fulfill',
                  body: 'FiberFlow sends invoice.paid to your webhook so you can ship or unlock access.',
                },
              ].map((item) => (
                <li key={item.step} className="space-y-3">
                  <span className="font-display text-sm font-semibold tracking-widest text-[oklch(0.45_0.12_165)]">
                    {item.step}
                  </span>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-[oklch(0.26_0.06_170)]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[oklch(0.42_0.03_175)] sm:text-base">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-20 border-t border-[oklch(0.55_0.06_165/0.15)]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-2xl space-y-3">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[oklch(0.26_0.08_170)] sm:text-4xl">
                Built for merchants
              </h2>
              <p className="text-base text-[oklch(0.42_0.03_175)] sm:text-lg">
                Everything you need to take Fiber payments without building
                payment infrastructure from scratch.
              </p>
            </div>

            <ul className="mt-12 divide-y divide-[oklch(0.55_0.06_165/0.15)] border-y border-[oklch(0.55_0.06_165/0.15)] sm:mt-14">
              {[
                {
                  title: 'Merchant dashboard',
                  body: 'Manage stores, invoices, API keys, and webhook deliveries in one place.',
                },
                {
                  title: 'Hosted checkout',
                  body: 'A responsive payment page with QR and payment status polling for your customers.',
                },
                {
                  title: 'API & webhooks',
                  body: 'Create invoices from your stack and react to paid events the moment they settle.',
                },
                {
                  title: 'Self-hosted',
                  body: 'Run FiberFlow with your own Fiber node and wallet key — you keep control of funds.',
                },
              ].map((feature) => (
                <li
                  key={feature.title}
                  className="grid gap-2 py-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-8 sm:py-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]"
                >
                  <h3 className="font-display text-lg font-semibold tracking-tight text-[oklch(0.26_0.06_170)] sm:text-xl">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[oklch(0.42_0.03_175)] sm:text-base">
                    {feature.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-[oklch(0.55_0.06_165/0.12)] bg-[oklch(0.28_0.07_170)] text-[oklch(0.97_0.01_170)]">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-24">
            <div className="max-w-xl space-y-3">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Start accepting Fiber
              </h2>
              <p className="text-base text-[oklch(0.85_0.03_170)] sm:text-lg">
                Create an account, connect your store, and take your first
                testnet payment.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                size="lg"
                asChild
                className="w-full bg-[oklch(0.72_0.14_165)] text-[oklch(0.22_0.05_170)] hover:bg-[oklch(0.76_0.13_165)] sm:w-auto"
              >
                <Link to="/signup">Get started</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full border-[oklch(0.85_0.04_170/0.35)] bg-transparent text-[oklch(0.97_0.01_170)] hover:bg-white/10 hover:text-[oklch(0.97_0.01_170)] sm:w-auto"
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[oklch(0.55_0.06_165/0.12)] bg-white/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-display text-sm font-semibold tracking-tight text-[oklch(0.32_0.06_170)]">
            FiberFlow
          </p>
          <p className="text-sm text-muted-foreground">
            Self-hosted payments on Nervos Fiber.
          </p>
        </div>
      </footer>
    </div>
  )
}

function CheckoutVisual() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-none sm:aspect-[5/4] lg:aspect-[4/5] xl:aspect-[5/4]">
      <div className="absolute inset-0 bg-[linear-gradient(160deg,oklch(0.32_0.08_170)_0%,oklch(0.42_0.1_165)_42%,oklch(0.55_0.12_160)_100%)]" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,oklch(0.85_0.08_165/0.5),transparent_35%),radial-gradient(circle_at_80%_70%,oklch(0.75_0.1_200/0.35),transparent_40%)]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-8 lg:p-10">
        <div className="w-full max-w-[20rem] space-y-5 rounded-2xl bg-[oklch(0.99_0.005_170)] p-5 shadow-[0_24px_60px_-20px_oklch(0.2_0.05_170/0.55)] sm:max-w-[22rem] sm:space-y-6 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
                Checkout
              </p>
              <p className="font-display text-lg font-semibold tracking-tight text-[oklch(0.28_0.06_170)]">
                Pay with Fiber
              </p>
            </div>
            <span className="rounded-md bg-[oklch(0.94_0.03_165)] px-2 py-1 text-xs font-medium text-[oklch(0.4_0.08_165)]">
              Open
            </span>
          </div>

          <div className="space-y-1 border-y border-[oklch(0.55_0.04_165/0.12)] py-4">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-display text-3xl font-semibold tracking-tight text-[oklch(0.28_0.06_170)]">
              12.50{' '}
              <span className="text-lg font-medium text-muted-foreground">
                USD
              </span>
            </p>
            <p className="text-sm text-muted-foreground">≈ 1,250 CKB</p>
          </div>

          <div className="mx-auto flex size-36 items-center justify-center rounded-xl bg-[oklch(0.96_0.015_165)] sm:size-40">
            <svg
              viewBox="0 0 120 120"
              className="size-28 text-[oklch(0.32_0.07_170)] sm:size-32"
              aria-hidden
            >
              <rect
                x="12"
                y="12"
                width="96"
                height="96"
                rx="8"
                fill="currentColor"
                opacity="0.08"
              />
              <path
                d="M28 28h18v18H28zm24 0h18v18H52zm24 0h18v18H76zM28 52h18v18H28zm48 0h18v18H76zM28 76h18v18H28zm24 0h18v18H52zm24 0h18v18H76z"
                fill="currentColor"
              />
              <rect
                x="52"
                y="52"
                width="18"
                height="18"
                fill="oklch(0.55 0.12 165)"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-[oklch(0.93_0.02_165)]">
              <div className="h-full w-2/5 rounded-full bg-primary" />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Waiting for payment…
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
