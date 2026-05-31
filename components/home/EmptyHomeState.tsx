import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function EmptyHomeState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Surface className="w-full max-w-xl p-7 text-center sm:p-8">
        <p className="text-2xl font-semibold tracking-tight text-foreground">Build your wallet</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Add cards and confirm the benefits you want Memento to track.
        </p>
        <div className="mt-6">
          <Link href="/wallet?addCard=1">
            <Button size="lg">Add card</Button>
          </Link>
        </div>
      </Surface>
    </div>
  );
}
