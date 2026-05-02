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
    <section className={compact ? "" : "rounded-[1.6rem] border border-emerald-300/12 bg-[#101817]/96 px-4 py-4 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.92)] sm:px-5 sm:py-5"}>
      <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/56">{description}</p>
    </section>
  );
}
