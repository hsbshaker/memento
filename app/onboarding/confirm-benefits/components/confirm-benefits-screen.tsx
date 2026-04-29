import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
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
          <Surface className="rounded-3xl p-6 text-center sm:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-white">No cards selected yet</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">
              Add cards to your wallet first so Memento can find benefits to track.
            </p>
            <div className="mt-6">
              <Link
                href="/onboarding/build-your-lineup"
                className="inline-flex items-center justify-center rounded-xl bg-[#7FB6FF] px-5 py-2.5 text-sm font-semibold text-[#08111F] shadow-[0_16px_45px_-18px_rgba(127,182,255,0.75)] transition duration-200 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C948]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
              >
                Back to wallet
              </Link>
            </div>
          </Surface>
        </div>
      ) : (
        <div>
          <ConfirmBenefitsClient data={data} />
        </div>
      )}
    </ConfirmBenefitsShell>
  );
}
