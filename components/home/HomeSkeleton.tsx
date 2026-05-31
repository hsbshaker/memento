import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";

export function HomeSkeleton() {
  return (
    <AppShell containerClassName="max-w-6xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-5 pt-5">
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-9 w-48 animate-pulse rounded-full bg-surface-raised" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-surface-muted" />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid gap-0 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className={`px-4 py-4 ${index > 0 ? "border-t border-border-muted sm:border-t-0 sm:border-l" : ""}`}>
                  <div className="h-3 w-18 animate-pulse rounded-full bg-surface-muted" />
                  <div className="mt-3 h-8 w-24 animate-pulse rounded-full bg-surface-raised" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-surface-muted" />
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-border pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="h-6 w-44 animate-pulse rounded-full bg-surface-raised" />
              <div className="flex gap-3">
                <div className="h-10 w-44 animate-pulse rounded-lg bg-surface" />
                <div className="h-10 w-28 animate-pulse rounded-lg bg-surface" />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={index > 0 ? "border-t border-border-muted" : ""}>
                <div className="animate-pulse px-3.5 py-3 sm:px-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,2.55fr)_minmax(0,1.35fr)_auto] lg:items-center lg:gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-10 w-1 rounded-full bg-surface-raised" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-40 rounded-full bg-surface-raised" />
                        <div className="mt-2 h-3 w-28 rounded-full bg-surface-muted" />
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-3 gap-3 md:gap-3.5">
                      <div className="h-8 rounded-full bg-surface-muted" />
                      <div className="h-8 rounded-full bg-surface-muted" />
                      <div className="h-8 rounded-full bg-surface-muted" />
                    </div>

                    <div className="h-8 w-full rounded-lg bg-surface-raised sm:w-24 lg:w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
