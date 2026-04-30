import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function EmptyHomeState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Surface className="w-full max-w-xl rounded-xl border-white/10 bg-[#101721] p-7 text-center shadow-[0_14px_32px_-26px_rgba(0,0,0,0.92)] backdrop-blur-0 sm:p-8">
        <p className="text-2xl font-semibold tracking-tight text-white">Add your first card</p>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Memento tracks use-it-or-lose-it credits and reminds you before they reset.
        </p>
        <div className="mt-6">
          <Link href="/wallet/add">
            <Button size="lg">Add card</Button>
          </Link>
        </div>
      </Surface>
    </div>
  );
}
