import Link from "next/link";
import { ConfirmBenefitsClient } from "./confirm-benefits-client";
import type { ConfirmBenefitsPageData } from "./confirm-benefits-data";
import { ConfirmBenefitsShell } from "./confirm-benefits-shell";

export function ConfirmBenefitsScreen({ data }: { data: ConfirmBenefitsPageData }) {
  return (
    <ConfirmBenefitsShell
      title="Personalize your reminders."
    >
      {data.totalCards === 0 ? (
        <div className="mx-auto max-w-xl">
          <div className="rounded-xl border border-border bg-surface p-6 text-center sm:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">No cards selected yet</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Add cards to your wallet first so Memento can find benefits to track.
            </p>
            <div className="mt-6">
              <Link
                href="/onboarding/build-your-lineup"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground transition duration-200 ease-out hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Back to wallet
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <ConfirmBenefitsClient data={data} />
        </div>
      )}
    </ConfirmBenefitsShell>
  );
}
