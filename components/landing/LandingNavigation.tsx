import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function LandingNavigation() {
  return (
    <header className="relative z-10 py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-white transition-colors duration-200 hover:text-white"
        >
          <span
            aria-hidden
            className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#4A9EFF] to-[#C8A94B]/80 shadow-[0_0_12px_rgba(74,158,255,0.4)]"
          />
          Memento
        </Link>

        <nav aria-label="Landing navigation" className="flex items-center gap-6">
          <Link
            href="/home"
            className="relative top-px text-sm text-white/50 transition-colors duration-200 hover:text-white/90"
          >
            Dashboard
          </Link>
          <Link href="/auth/login">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-lg border border-white/10 bg-white/[0.01] px-4 py-1.5 text-sm font-medium text-white/80 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
            >
              Sign In
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
