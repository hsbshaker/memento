import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function FinalCtaSection() {
  return (
    <section className="relative border-t border-white/[0.05] py-24 sm:py-28 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-14 h-[24rem] bg-[radial-gradient(circle_at_28%_38%,rgba(94,165,255,0.08),transparent_24%),radial-gradient(circle_at_72%_42%,rgba(229,202,118,0.06),transparent_22%)]"
      />

      <div className="relative mx-auto max-w-[58rem]">
        <div className="rounded-[2.25rem] bg-[linear-gradient(180deg,rgba(24,27,35,0.95),rgba(17,20,28,0.98))] px-6 py-14 text-center shadow-[0_32px_90px_-42px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.06] sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <div className="mx-auto flex max-w-[44rem] flex-col items-center gap-7">
            <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-white/26">Get Started</p>
            <h2 className="text-[2.7rem] leading-[0.98] font-semibold tracking-[-0.045em] text-white sm:text-[3.45rem] lg:text-[4.15rem]">
              Your cards are already paying for this.
              <br />
              Are you claiming it?
            </h2>
            <p className="max-w-[30rem] text-[1rem] leading-8 text-white/48 sm:text-[1.08rem]">
              Two minutes to set up. No bank login. No card numbers.
            </p>
            <Link href="/login" className="group">
              <Button
                size="lg"
                className="h-[4.25rem] rounded-full bg-[#4A9EFF] px-8 text-[15px] font-medium text-white shadow-[0_0_40px_rgba(74,158,255,0.35)] transition-all duration-300 ease-in-out hover:-translate-y-px hover:bg-[#5FABFF] hover:shadow-[0_0_56px_rgba(74,158,255,0.5)]"
              >
                Build Your Lineup
                <span aria-hidden className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
