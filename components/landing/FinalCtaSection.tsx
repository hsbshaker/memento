import { Button } from "@/components/ui/Button";

export function FinalCtaSection() {
  return (
    <section className="relative mt-0 pb-12 pt-0 sm:pb-14 sm:pt-0 lg:pb-16 lg:pt-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-20 h-64 bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.05)_0%,transparent_70%)]"
      />

      <div className="relative w-full">
        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] px-12 py-16 text-center">
          <div className="mx-auto flex max-w-[44rem] flex-col items-center">
            <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A94B]/55">Get started</div>
            <h2 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-white md:text-[2.75rem]">
              <span className="whitespace-nowrap">Your cards are already paying for this.</span>
              <br />
              <span className="text-white/50">Are you claiming it?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-md text-[13.5px] leading-relaxed text-white/35">
              Two minutes to set up. No bank login. No card numbers.
            </p>
            <a href="/auth/login" className="group inline-flex">
              <Button
                size="lg"
                className="inline-flex h-auto items-center gap-2.5 rounded-xl bg-[#C8A94B] px-8 py-3.5 text-[15px] font-semibold text-[#17130A] shadow-[0_0_40px_rgba(200,169,75,0.3)] transition-all duration-200 hover:-translate-y-px hover:bg-[#D6B75D] hover:shadow-[0_0_56px_rgba(200,169,75,0.42)]"
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
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
