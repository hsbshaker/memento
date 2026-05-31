import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function LandingNavigation() {
  return (
    <header className="relative z-10 py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground transition-colors duration-200"
        >
          <span aria-hidden className="h-6 w-6 rounded-full bg-accent" />
          Memento
        </Link>

        <nav aria-label="Landing navigation" className="flex items-center gap-6">
          <Link
            href="/home"
            className="relative top-px text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Dashboard
          </Link>
          <a href="/auth/login">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </a>
        </nav>
      </div>
    </header>
  );
}
