import { Surface } from "@/components/ui/Surface";
import { ConfirmBenefitsShell } from "./components/confirm-benefits-shell";

export default function ConfirmBenefitsLoading() {
  return (
    <ConfirmBenefitsShell
      eyebrow="Onboarding"
      title="Confirm your reminders"
      description="We found the benefits tied to your selected cards."
    >
      <div className="animate-pulse space-y-4">
        <Surface className="grid gap-3 p-5 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="h-8 w-12 rounded-full bg-white/10" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="h-8 w-12 rounded-full bg-white/10" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="h-8 w-12 rounded-full bg-white/10" />
          </div>
        </Surface>

        {Array.from({ length: 2 }).map((_, index) => (
          <Surface key={index} className="space-y-4 p-5">
            <div className="space-y-2">
              <div className="h-5 w-44 rounded-full bg-white/10" />
              <div className="h-3 w-28 rounded-full bg-white/10" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div key={rowIndex} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <div className="h-4 w-40 rounded-full bg-white/10" />
                  <div className="mt-3 flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-white/10" />
                    <div className="h-5 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        ))}
      </div>
    </ConfirmBenefitsShell>
  );
}
