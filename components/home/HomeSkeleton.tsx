import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";

export function HomeSkeleton() {
  return (
    <AppShell containerClassName="max-w-5xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-7 pt-5">
          <div className="grid gap-4 px-1 sm:grid-cols-3 sm:gap-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`flex min-h-[88px] animate-pulse flex-col items-center justify-center px-4 py-1 text-center sm:px-5 ${
                  index > 0 ? "border-t border-white/[0.045] pt-5 sm:border-t-0 sm:border-l sm:pt-1" : ""
                }`}
              >
                <div className="h-8 w-24 rounded-full bg-white/10" />
                <div className="mt-2 h-3 w-16 rounded-full bg-white/8" />
              </div>
            ))}
          </div>

          <div className="rounded-[1.6rem] border border-white/9 bg-white/[0.045] px-4 py-4 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.92)] sm:px-5 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <div className="h-6 w-44 animate-pulse rounded-full bg-white/12" />
              </div>
              <div className="h-10 w-full animate-pulse rounded-full bg-white/[0.05] sm:w-48" />
            </div>

            <div className="mt-4 h-10 w-full animate-pulse rounded-full bg-white/[0.04] sm:w-64" />

            <div className="mt-4 overflow-hidden rounded-[1.05rem] border border-white/[0.05] bg-white/[0.015]">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={index > 0 ? "border-t border-white/[0.045]" : ""}>
                  <div className="animate-pulse px-3.5 py-3 sm:px-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,2.55fr)_minmax(0,1.35fr)_auto] lg:items-center lg:gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-10 w-1 rounded-full bg-white/12" />
                        <div className="min-w-0 flex-1">
                          <div className="h-4 w-40 rounded-full bg-white/12" />
                          <div className="mt-2 h-3 w-28 rounded-full bg-white/8" />
                        </div>
                      </div>

                      <div className="grid min-w-0 grid-cols-3 gap-3 md:gap-3.5">
                        <div className="h-8 rounded-full bg-white/8" />
                        <div className="h-8 rounded-full bg-white/8" />
                        <div className="h-8 rounded-full bg-white/8" />
                      </div>

                      <div className="h-8 w-full rounded-lg bg-white/10 sm:w-24 lg:w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
