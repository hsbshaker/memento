import type { CSSProperties, ReactNode } from "react";

type ConfirmBenefitsShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  supportingNote?: string;
  children: ReactNode;
};

export function ConfirmBenefitsShell({
  eyebrow,
  title,
  description,
  supportingNote,
  children,
}: ConfirmBenefitsShellProps) {
  return (
    <div
      className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground dark"
      style={
        {
          "--background": "#0D0D11",
          "--foreground": "#ffffff",
        } as CSSProperties
      }
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-5%] top-[-15%] h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.09)_0%,transparent_60%)] blur-3xl" />
        <div className="absolute left-[20%] top-[30%] h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.04)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute right-[-5%] top-[-5%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.07)_0%,transparent_65%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 min-h-[100dvh] px-6 py-6">
        <nav className="mx-auto flex w-full max-w-2xl items-center justify-center px-6 py-6">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#4A9EFF] to-[#C8A94B]/80" />
            Memento
          </div>
        </nav>
        <div className="mx-auto max-w-4xl">
          <header className="mb-6 text-center sm:mb-7">
            {eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">{eyebrow}</p>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
            {description ? (
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/58 sm:text-base">{description}</p>
            ) : null}
            {supportingNote ? <p className="mt-3 text-sm text-white/42">{supportingNote}</p> : null}
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}
