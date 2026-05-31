import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:brightness-105 active:brightness-95 disabled:opacity-50",
  secondary:
    "bg-surface-muted text-foreground border border-border hover:bg-surface-raised disabled:opacity-50",
  subtle:
    "border border-border bg-surface text-foreground hover:border-accent-border hover:bg-accent-muted disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "rounded-xl px-4 py-2 text-sm font-semibold",
  md: "rounded-xl px-5 py-2.5 text-sm font-semibold",
  lg: "rounded-2xl px-7 py-3.5 text-base font-semibold",
};

export function Button({ className, variant = "primary", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
