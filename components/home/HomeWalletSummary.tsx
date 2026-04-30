import Link from "next/link";
import { ChevronRight } from "lucide-react";

type HomeWalletSummaryProps = {
  trackedBenefits: number;
  trackedCards: number;
};

export function HomeWalletSummary({ trackedBenefits, trackedCards }: HomeWalletSummaryProps) {
  return (
    <section className="rounded-[1.6rem] border border-white/8 bg-white/[0.04] px-4 py-4 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.92)] sm:px-5 sm:py-5">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Your wallet</h2>
        <p className="text-sm leading-6 text-white/58">
          Keep your cards and tracked benefits up to date so Home stays accurate.
        </p>
      </div>

      <div className="mt-4 rounded-[1.05rem] border border-white/[0.05] bg-white/[0.015] px-4 py-3.5">
        <div className="grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:items-center">
          <div>
            <p className="text-[11px] font-medium text-white/34">Active cards</p>
            <p className="mt-1 text-lg font-semibold text-white">{trackedCards}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/34">Tracked benefits</p>
            <p className="mt-1 text-lg font-semibold text-white">{trackedBenefits}</p>
          </div>
          <div className="sm:justify-self-end">
            <Link
              href="/wallet"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#9CC8FF] transition-colors hover:text-[#B6D8FF]"
            >
              Manage wallet
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
