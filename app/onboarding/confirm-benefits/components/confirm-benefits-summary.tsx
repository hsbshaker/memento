"use client";

type ConfirmBenefitsSummaryProps = {
  cardCount: number;
  totalPotentialValueCents: number | null;
  totalPotentialValueIsPartial: boolean;
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function buildSummaryStatement({
  cardCount,
  totalPotentialValueCents,
  totalPotentialValueIsPartial,
}: ConfirmBenefitsSummaryProps) {
  const cardLabel = cardCount === 1 ? "your card" : `your ${cardCount} cards`;

  if (typeof totalPotentialValueCents === "number" && totalPotentialValueCents > 0) {
    const amount = CURRENCY_FORMATTER.format(totalPotentialValueCents / 100);
    return {
      amount: `${amount}${totalPotentialValueIsPartial ? "+" : ""}`,
      suffix: `in value across ${cardLabel}.`,
    };
  }

  return {
    amount: null,
    suffix: `Benefits found across ${cardLabel}.`,
  };
}

export function ConfirmBenefitsSummary({
  cardCount,
  totalPotentialValueCents,
  totalPotentialValueIsPartial,
}: ConfirmBenefitsSummaryProps) {
  const statement = buildSummaryStatement({
    cardCount,
    totalPotentialValueCents,
    totalPotentialValueIsPartial,
  });

  return (
    <div className="px-2 py-0.5">
      <p className="mx-auto max-w-3xl text-center text-lg font-semibold tracking-tight text-white/88 sm:text-xl">
        {statement.amount ? (
          <>
            <span>Up to </span>
            <span className="text-[#F7D774]">{statement.amount}</span>{" "}
            <span>{statement.suffix}</span>
          </>
        ) : (
          <span className="text-white/72">{statement.suffix}</span>
        )}
      </p>
    </div>
  );
}
