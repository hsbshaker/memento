"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { ConfirmBenefitsShell } from "./components/confirm-benefits-shell";

type ConfirmBenefitsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ConfirmBenefitsError({ reset }: ConfirmBenefitsErrorProps) {
  return (
    <ConfirmBenefitsShell
      eyebrow="Onboarding"
      title="Confirm your reminders"
      description="We found the benefits tied to your selected cards."
    >
      <div className="mx-auto max-w-xl">
        <Surface className="rounded-3xl border-rose-300/20 bg-rose-300/10 p-6 sm:p-7">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-rose-100/80">Confirm Benefits</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            We couldn&apos;t load your benefits right now.
          </h2>
          <p className="mt-3 text-sm leading-6 text-rose-100/75">Try again in a moment or head back to your wallet.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={reset}>Retry</Button>
            <Link
              href="/onboarding/build-your-lineup"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white/90 transition duration-200 ease-out hover:border-[#F7C948]/40 hover:bg-[#F7C948]/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C948]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
            >
              Back to wallet
            </Link>
          </div>
        </Surface>
      </div>
    </ConfirmBenefitsShell>
  );
}
