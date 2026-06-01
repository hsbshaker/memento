import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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

        <nav aria-label="Landing navigation" className="flex items-center gap-4">
          <ThemeToggle />
          <a
            href="/home"
            className="relative top-px text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Dashboard
          </a>
          <a
            href="/auth/login"
            className="text-sm font-medium text-foreground transition-colors duration-200 hover:text-accent"
          >
            Sign in
          </a>
        </nav>
      </div>
    </header>
  );
}
