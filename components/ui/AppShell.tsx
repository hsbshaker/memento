import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function AppShell({ children, className, containerClassName }: AppShellProps) {
  return (
    <main
      className={cn(
        "relative min-h-screen overflow-x-hidden text-foreground selection:bg-accent/20 selection:text-foreground",
        className,
      )}
    >
      <div className={cn("relative mx-auto max-w-6xl px-6 py-6", containerClassName)}>{children}</div>
    </main>
  );
}
