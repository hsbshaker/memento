import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

type WalletAddCardButtonProps = {
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function WalletAddCardButton({ className, disabled = false, onClick }: WalletAddCardButtonProps) {
  return (
    <Button
      disabled={disabled}
      onClick={onClick}
      variant="primary"
      size="sm"
      title={disabled ? "Add-card modal coming soon" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      className={className}
    >
      <Plus className="h-4 w-4" />
      <span>Add card</span>
    </Button>
  );
}
