import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { Surface } from "@/components/ui/Surface";

type WalletSkeletonProps = {
  variant?: "list" | "detail";
};

export function WalletSkeleton({ variant = "list" }: WalletSkeletonProps) {
  return (
    <AppShell containerClassName="max-w-4xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-6">
          <div className="space-y-3">
            <div className="h-4 w-20 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-10 w-40 animate-pulse rounded-full bg-surface-raised" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: variant === "list" ? 4 : 5 }).map((_, index) => (
              <Surface key={index} className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 w-1/2 rounded-full bg-surface-raised" />
                  <div className="h-4 w-1/3 rounded-full bg-surface-muted" />
                  <div className="h-4 w-1/4 rounded-full bg-surface-muted" />
                </div>
              </Surface>
            ))}
          </div>
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
