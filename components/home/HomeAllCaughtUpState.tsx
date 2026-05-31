type HomeAllCaughtUpStateProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export function HomeAllCaughtUpState({
  title = "You’re all caught up.",
  description = "No unused benefits reset in the next 14 days. Here’s what’s coming up next.",
  compact = false,
}: HomeAllCaughtUpStateProps) {
  return (
    <section className={compact ? "" : "rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5 sm:py-5"}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </section>
  );
}
