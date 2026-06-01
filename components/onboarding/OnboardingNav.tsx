import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function OnboardingNav() {
  return (
    <nav
      aria-label="Onboarding navigation"
      className="mx-auto grid w-full max-w-2xl grid-cols-3 items-center px-6 py-6"
    >
      <div />
      <div className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight text-foreground">
        <div className="h-6 w-6 rounded-full bg-accent" aria-hidden="true" />
        Memento
      </div>
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
    </nav>
  );
}
