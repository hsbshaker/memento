import { Button } from "@/components/ui/Button";

const cardPills = ["American Express", "Chase", "Citi", "Capital One", "+ more"];

const benefits = [
  { name: "Uber Cash", cadence: "Annual", value: "$200" },
  { name: "Airline Fee Credit", cadence: "Annual", value: "$200" },
  { name: "Saks Fifth Avenue", cadence: "Expires Jun", value: "$50" },
  { name: "Dining Credit", cadence: "Monthly", value: "$10/mo" },
  { name: "CLEAR Plus", cadence: "Used", value: "$199" },
];

export function HeroSection() {
  return (
    <section className="relative z-10 overflow-visible pb-32 pt-16 md:pt-20">
      <div className="flex flex-col items-center gap-14 lg:flex-row lg:items-start lg:gap-[4.5rem]">
        <div className="max-w-[43rem] flex-[0.98] pt-1 lg:pt-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-muted px-3 py-1.5 text-xs font-semibold tracking-wide text-accent backdrop-blur-sm">
            <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 7h6v6" />
              <path d="m22 7-8.5 8.5-5-5L2 17" />
            </svg>
            <span>
              The average Amex Platinum holder leaves $1,200 unused.
            </span>
          </div>

          <div className="space-y-4 pt-6">
            <h1 className="max-w-[16ch] text-5xl leading-[0.99] font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              <span className="block whitespace-nowrap">Know what your</span>
              <span className="block whitespace-nowrap">
                <span className="text-accent">cards</span> owe you.
              </span>
            </h1>
            <p className="max-w-[400px] text-base leading-[1.7] text-muted-foreground md:text-lg">
              The Platinum Card comes with over $1,500 in annual value. Most of it goes unused. Memento tracks every
              credit, reset, and perk so you actually capture what you’re paying for.
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-6 lg:pt-9">
            <a href="/auth/login" className="group w-fit">
              <Button size="lg" className="gap-2.5">
                Build Your Lineup
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
            </a>

            <div className="mt-4 flex flex-wrap gap-1.5 lg:mt-6">
              {cardPills.map((pill) => (
                <div
                  key={pill}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-[0.22rem] text-xs font-medium text-muted-foreground transition-all duration-200 ease-in-out hover:-translate-y-px hover:border-border-strong hover:bg-surface-raised"
                >
                  {pill !== "+ more" ? (
                    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 text-subtle-foreground">
                      <rect x="2.25" y="4" width="11.5" height="8" rx="1.75" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.25 7h7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  ) : null}
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-1 w-full max-w-[37rem] flex-[1.02] lg:mt-[-0.35rem] lg:max-w-none">
          <div className="relative w-full select-none pointer-events-none">
            <div className="relative scale-[1.02] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg backdrop-blur-xl lg:origin-top lg:scale-[1.05]">
              <div className="flex items-center justify-between border-b border-border-muted px-5 py-3.5">
                <div className="flex items-center gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-surface-muted" />
                  <span className="h-2.5 w-2.5 rounded-full bg-surface-muted" />
                  <span className="h-2.5 w-2.5 rounded-full bg-surface-muted" />
                </div>
                <p className="font-mono text-xs font-medium tracking-wider text-subtle-foreground">Memento — Dashboard</p>
                <div className="w-14" aria-hidden />
              </div>

              <div className="relative space-y-4 p-5">
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl border border-border bg-surface-muted p-4">
                    <p className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-subtle-foreground">Value Remaining</p>
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      $2,419
                    </p>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface">
                      <div className="h-full w-[88%] rounded-full bg-accent" />
                    </div>
                    <p className="mt-1.5 text-xs text-subtle-foreground">of $2,738 tracked this year</p>
                  </div>

                  <div className="flex w-28 flex-col justify-between rounded-xl border border-border bg-surface-muted p-3">
                    <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-subtle-foreground">Your Cards</p>
                    <div className="space-y-1.5">
                      <div className="flex h-5 items-center rounded-md bg-accent px-2">
                        <span className="truncate text-xs font-semibold text-accent-foreground">Platinum</span>
                      </div>
                      <div className="flex h-5 items-center rounded-md bg-accent px-2">
                        <span className="truncate text-xs font-semibold text-accent-foreground">Gold</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-muted px-2 py-1">
                    <svg viewBox="0 0 16 16" aria-hidden className="h-2.5 w-2.5 text-warning">
                      <path
                        d="M8 2.5a2.4 2.4 0 0 0-2.4 2.4v1.15c0 .36-.12.72-.34 1L4.4 8.2c-.3.35-.09.9.37.9h6.46c.46 0 .67-.55.37-.9l-.86-1.15a1.7 1.7 0 0 1-.34-1V4.9A2.4 2.4 0 0 0 8 2.5Z"
                        fill="currentColor"
                      />
                      <path d="M6.6 10.5a1.4 1.4 0 0 0 2.8 0" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs font-semibold text-warning">3 benefits need attention</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted px-4 py-1">
                  {benefits.map((benefit) => {
                    const isUsed = benefit.cadence === "Used";
                    const tagClass =
                      benefit.cadence === "Annual"
                        ? "bg-accent-muted text-accent"
                        : benefit.cadence === "Expires Jun"
                          ? "bg-warning-muted text-warning"
                          : "bg-surface text-subtle-foreground";

                    return (
                      <div
                        key={benefit.name}
                        className={`flex items-center justify-between border-b border-border-muted py-2.5 last:border-0 ${
                          isUsed ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {isUsed ? (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface">
                              <svg viewBox="0 0 16 16" aria-hidden className="h-2.5 w-2.5 text-muted-foreground">
                                <path d="m3.5 8 2.5 2.5L12.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          ) : (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                          )}
                          <span className="truncate text-xs font-medium text-foreground">{benefit.name}</span>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider ${tagClass}`}>
                            {benefit.cadence}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{benefit.value}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
