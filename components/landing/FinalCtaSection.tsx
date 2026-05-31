import { Button } from "@/components/ui/Button";

export function FinalCtaSection() {
  return (
    <section className="relative mt-0 pb-12 pt-0 sm:pb-14 sm:pt-0 lg:pb-16 lg:pt-0">
      <div className="relative w-full">
        <div className="relative rounded-2xl border border-border bg-surface px-12 py-16 text-center">
          <div className="mx-auto flex max-w-[44rem] flex-col items-center">
            <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Get started</div>
            <h2 className="mb-4 text-3xl leading-tight font-bold tracking-tight text-foreground md:text-[2.75rem]">
              <span className="whitespace-nowrap">Your cards are already paying for this.</span>
              <br />
              <span className="text-muted-foreground">Are you claiming it?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              Two minutes to set up. No bank login. No card numbers.
            </p>
            <a href="/auth/login" className="group inline-flex">
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
          </div>
        </div>
      </div>
    </section>
  );
}
