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
        <Surface className="border-destructive/30 bg-destructive-muted p-6 sm:p-7">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-destructive">Confirm Benefits</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            We couldn&apos;t load your benefits right now.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Try again in a moment or head back to your wallet.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={reset}>Retry</Button>
            <Link
              href="/onboarding/build-your-lineup"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition duration-200 ease-out hover:border-accent-border hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Back to wallet
            </Link>
          </div>
        </Surface>
      </div>
    </ConfirmBenefitsShell>
  );
}
