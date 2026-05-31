import { CreditCard, Receipt, TrendingUp } from "lucide-react";

type WalletMetricsProps = {
  cardCount: number;
};

export function WalletMetrics({ cardCount }: WalletMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Cards</p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="mt-4 text-3xl leading-none font-semibold tracking-tight text-foreground">
          {cardCount}
        </p>
        <p className="mt-2 text-sm text-subtle-foreground">In your wallet</p>
      </div>

      <div className="rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Annual fees</p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="mt-4 text-3xl leading-none font-semibold tracking-tight text-foreground">—</p>
        <p className="mt-2 text-sm text-subtle-foreground">Annual fee data coming soon</p>
      </div>

      <div className="rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Net value</p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="mt-4 text-3xl leading-none font-semibold tracking-tight text-foreground">—</p>
        <p className="mt-2 text-sm text-subtle-foreground">Requires annual fee data</p>
      </div>
    </div>
  );
}
