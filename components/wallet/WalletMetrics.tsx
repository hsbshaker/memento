import { CreditCard, Receipt, TrendingUp } from "lucide-react";

type WalletMetricsProps = {
  cardCount: number;
};

export function WalletMetrics({ cardCount }: WalletMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-white/42 uppercase">Cards</p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8">
            <CreditCard className="h-4 w-4 text-white/42" />
          </div>
        </div>
        <p className="mt-4 text-[1.85rem] leading-none font-semibold tracking-tight text-white">
          {cardCount}
        </p>
        <p className="mt-2 text-sm text-white/42">In your wallet</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-white/42 uppercase">Annual fees</p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8">
            <Receipt className="h-4 w-4 text-white/42" />
          </div>
        </div>
        <p className="mt-4 text-[1.85rem] leading-none font-semibold tracking-tight text-white">—</p>
        <p className="mt-2 text-sm text-white/42">Annual fee data coming soon</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-white/42 uppercase">Net value</p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8">
            <TrendingUp className="h-4 w-4 text-white/42" />
          </div>
        </div>
        <p className="mt-4 text-[1.85rem] leading-none font-semibold tracking-tight text-white">—</p>
        <p className="mt-2 text-sm text-white/42">Requires annual fee data</p>
      </div>
    </div>
  );
}
