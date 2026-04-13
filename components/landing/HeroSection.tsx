import Link from "next/link";
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
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-4%] top-[-4rem] h-[34rem] w-[58rem] bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.11)_0%,transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-2%] top-[-2rem] h-[28rem] w-[34rem] bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.075)_0%,transparent_68%)]"
      />

      <div className="flex flex-col items-center gap-14 lg:flex-row lg:items-start lg:gap-[4.5rem]">
        <div className="max-w-[43rem] flex-[0.98] pt-1 lg:pt-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4A9EFF]/20 bg-[#4A9EFF]/[0.08] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#4A9EFF]/90 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 7h6v6" />
              <path d="m22 7-8.5 8.5-5-5L2 17" />
            </svg>
            <span>
              The average Amex Platinum holder leaves $1,200 unused.
            </span>
          </div>

          <div className="space-y-4 pt-6">
            <h1 className="max-w-[16ch] text-5xl leading-[0.99] font-bold tracking-tight text-white md:text-6xl lg:text-[4.1rem] xl:text-[4.72rem]">
              <span className="block whitespace-nowrap">Know what your</span>
              <span className="block whitespace-nowrap">
                <span className="text-[#4A9EFF]">cards</span>{" "}
                <span className="bg-gradient-to-r from-[#68B6FF] via-[#8BC9FF] to-[#C8A94B] bg-clip-text text-transparent">
                  owe you.
                </span>
              </span>
            </h1>
            <p className="max-w-[400px] text-base leading-[1.7] text-white/45 md:text-[17px]">
              The Platinum Card comes with over $1,500 in annual value. Most of it goes unused. Memento tracks every
              credit, reset, and perk so you actually capture what you’re paying for.
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-6 lg:pt-9">
            <Link href="/login" className="group w-fit">
              <Button
                size="lg"
                className="inline-flex h-auto items-center gap-2.5 rounded-xl bg-[#C8A94B] px-7 py-3.5 text-[15px] font-semibold text-[#17130A] transition-all duration-200 hover:-translate-y-px hover:bg-[#D6B75D] hover:shadow-[0_0_56px_rgba(200,169,75,0.42)]"
              >
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
            </Link>

            <div className="mt-4 flex flex-wrap gap-1.5 lg:mt-6">
              {cardPills.map((pill) => (
                <div
                  key={pill}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-[0.22rem] text-[11px] font-medium transition-all duration-200 ease-in-out hover:-translate-y-px hover:border-white/[0.1] hover:bg-white/[0.055] ${
                    pill === "+ more" ? "text-white/30" : "text-white/40"
                  }`}
                >
                  {pill !== "+ more" ? (
                    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 text-white/28">
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
            <div
              aria-hidden
              className="absolute -inset-12 bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.16)_0%,transparent_70%)] blur-2xl"
            />
            <div
              aria-hidden
              className="absolute -inset-12 top-16 bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.1)_0%,transparent_65%)] blur-2xl"
            />

            <div className="relative scale-[1.02] overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F14]/80 shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl lg:origin-top lg:scale-[1.05]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
                <div className="flex items-center gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                </div>
                <p className="text-[10px] font-medium tracking-wider text-white/30">Memento — Dashboard</p>
                <div className="w-14" aria-hidden />
              </div>

              <div className="relative space-y-4 p-5">
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/35">Value Remaining</p>
                    <p
                      className="text-2xl font-bold tracking-tight text-white"
                      style={{ fontFamily: "var(--font-inter), sans-serif" }}
                    >
                      $2,419
                    </p>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#4A9EFF] to-[#C8A94B]" />
                    </div>
                    <p className="mt-1.5 text-[9px] text-white/30">of $2,738 tracked this year</p>
                  </div>

                  <div className="flex w-28 flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-white/35">Your Cards</p>
                    <div className="space-y-1.5">
                      <div className="flex h-5 items-center rounded-md bg-gradient-to-r from-[#C8A94B] to-[#8C7531] px-2">
                        <span className="truncate text-[7px] font-semibold text-white/70">Platinum</span>
                      </div>
                      <div className="flex h-5 items-center rounded-md bg-gradient-to-r from-[#C8A94B] to-[#9E7A22] px-2">
                        <span className="truncate text-[7px] font-semibold text-white/70">Gold</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-[#C8A94B]/20 bg-[#C8A94B]/10 px-2 py-1">
                    <svg viewBox="0 0 16 16" aria-hidden className="h-2.5 w-2.5 text-[#C8A94B]">
                      <path
                        d="M8 2.5a2.4 2.4 0 0 0-2.4 2.4v1.15c0 .36-.12.72-.34 1L4.4 8.2c-.3.35-.09.9.37.9h6.46c.46 0 .67-.55.37-.9l-.86-1.15a1.7 1.7 0 0 1-.34-1V4.9A2.4 2.4 0 0 0 8 2.5Z"
                        fill="currentColor"
                      />
                      <path d="M6.6 10.5a1.4 1.4 0 0 0 2.8 0" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    <span className="text-[9px] font-semibold text-[#C8A94B]">3 benefits need attention</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-1">
                  {benefits.map((benefit) => {
                    const isUsed = benefit.cadence === "Used";
                    const tagClass =
                      benefit.cadence === "Annual"
                        ? "bg-[#4A9EFF]/10 text-[#4A9EFF]"
                        : benefit.cadence === "Expires Jun"
                          ? "bg-[#C8A94B]/10 text-[#C8A94B]"
                          : benefit.cadence === "Monthly"
                            ? "bg-white/5 text-white/40"
                            : "bg-white/5 text-white/30";

                    return (
                      <div
                        key={benefit.name}
                        className={`flex items-center justify-between border-b border-white/5 py-2.5 last:border-0 ${
                          isUsed ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {isUsed ? (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10">
                              <svg viewBox="0 0 16 16" aria-hidden className="h-2.5 w-2.5 text-white/60">
                                <path d="m3.5 8 2.5 2.5L12.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          ) : (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#4A9EFF]/70 shadow-[0_0_6px_rgba(74,158,255,0.6)]" />
                          )}
                          <span className="truncate text-[11px] font-medium text-white/80">{benefit.name}</span>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${tagClass}`}>
                            {benefit.cadence}
                          </span>
                          <span className="text-[11px] font-semibold text-white/90">{benefit.value}</span>
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
