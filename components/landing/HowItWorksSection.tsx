const steps = [
  {
    number: "01",
    title: "Add your cards",
    description: "Select your premium cards. Every benefit loads automatically — no manual entry.",
  },
  {
    number: "02",
    title: "Confirm what’s yours",
    description: "Toggle the benefits that apply to you. Enable reminders for expiring credits.",
  },
  {
    number: "03",
    title: "Capture every dollar",
    description: "See unused credits at a glance. Mark perks as used when redeemed.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative border-t border-border pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
      <div className="relative flex flex-col gap-0">
        <div className="mb-10 max-w-[30rem]">
          <div className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">How it works</div>
          <h2 className="max-w-sm text-3xl leading-tight font-bold tracking-tight text-foreground md:text-4xl">
            Set up in minutes.
            <br />
            <span className="whitespace-nowrap">Value tracked forever.</span>
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {steps.map((step) => (
              <section
                key={step.number}
                className="relative space-y-5 bg-surface px-10 pb-12 pt-10"
              >
                <div
                  aria-hidden
                  className="absolute left-10 right-10 top-0 h-[1.5px] rounded-full bg-accent-border"
                />

                <p className="text-5xl font-bold leading-none text-accent/30">
                  {step.number}
                </p>

                <div>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="max-w-[16rem] text-sm leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </section>
            ))}
        </div>
      </div>
    </section>
  );
}
