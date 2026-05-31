"use client";

import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";

type WalletErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WalletError({ reset }: WalletErrorProps) {
  return (
    <AppShell containerClassName="max-w-4xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="mx-auto max-w-xl pt-8">
          <Surface className="border-destructive/30 bg-destructive-muted p-6 sm:p-7">
            <p className="text-sm font-medium tracking-[0.22em] text-destructive uppercase">Wallet</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">We couldn’t load your cards right now.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Try again in a moment.</p>
            <div className="mt-6">
              <Button onClick={reset}>Retry</Button>
            </div>
          </Surface>
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
