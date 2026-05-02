import { WalletAddCardButton } from "@/components/wallet/WalletAddCardButton";

type WalletEmptyStateProps = {
  onAddCard: () => void;
};

export function WalletEmptyState({ onAddCard }: WalletEmptyStateProps) {
  return (
    <div className="py-12">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold tracking-tight text-white">No cards yet</h2>
        <p className="mt-2 text-sm text-white/58">Add your first card to build your wallet.</p>
        <div className="mt-5">
          <WalletAddCardButton onClick={onAddCard} />
        </div>
      </div>
    </div>
  );
}
