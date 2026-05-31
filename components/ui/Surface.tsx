import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

type SurfaceVariant = "panel" | "card";

type SurfaceProps<T extends ElementType> = {
  as?: T;
  variant?: SurfaceVariant;
} & ComponentPropsWithoutRef<T>;

const surfaceVariants: Record<SurfaceVariant, string> = {
  panel: "rounded-2xl border border-border bg-surface shadow-sm backdrop-blur-md",
  card: "rounded-2xl border border-border bg-surface shadow-sm backdrop-blur-md transition-colors duration-200 ease-out hover:border-accent-border hover:bg-accent-muted",
};

export function Surface<T extends ElementType = "div">({
  as,
  className,
  variant = "panel",
  ...props
}: SurfaceProps<T>) {
  const Component = as ?? "div";

  return <Component className={cn(surfaceVariants[variant], className)} {...props} />;
}
