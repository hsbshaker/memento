import type { ReactNode } from "react";
import { OnboardingNav } from "@/components/onboarding/OnboardingNav";

type ConfirmBenefitsShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  supportingNote?: string;
  children: ReactNode;
};

export function ConfirmBenefitsShell({
  eyebrow,
  title,
  description,
  supportingNote,
  children,
}: ConfirmBenefitsShellProps) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <div className="relative z-10 min-h-[100dvh] px-6 py-6">
        <OnboardingNav />
        <div className="mx-auto max-w-[52rem]">
          <header className="mb-6 text-center sm:mb-7">
            {eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {description ? (
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
            ) : null}
            {supportingNote ? <p className="mt-3 text-sm text-subtle-foreground">{supportingNote}</p> : null}
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}
