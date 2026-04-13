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
    <section className="relative border-t border-white/[0.05] py-24 sm:py-28 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-12%] top-12 h-[24rem] bg-[radial-gradient(circle_at_22%_42%,rgba(94,165,255,0.07),transparent_24%),radial-gradient(circle_at_78%_46%,rgba(229,202,118,0.05),transparent_20%)]"
      />

      <div className="relative flex flex-col gap-[60px]">
        <div className="max-w-[30rem]">
          <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-white/28">How It Works</p>
          <h2 className="mt-5 text-[2.9rem] leading-[0.98] font-semibold tracking-[-0.04em] text-white sm:text-[3.5rem]">
            Set up in minutes. Value tracked forever.
          </h2>
        </div>

        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(19,22,29,0.74),rgba(17,20,27,0.82))] shadow-[0_28px_80px_-44px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]">
          <div className="grid lg:grid-cols-3">
            {steps.map((step, index) => (
              <section
                key={step.number}
                className="relative flex min-h-[19rem] flex-col justify-between gap-10 px-8 py-10 sm:px-10 sm:py-12 lg:min-h-[21rem] lg:px-12"
              >
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute right-0 top-10 hidden h-[calc(100%-5rem)] w-px bg-white/[0.05] lg:block"
                  />
                ) : null}

                <p className="text-[3.75rem] leading-none font-semibold tracking-[-0.05em] text-white/[0.14] sm:text-[4.4rem]">
                  {step.number}
                </p>

                <div className="space-y-4">
                  <h3 className="max-w-[13rem] text-[1.65rem] leading-[1.05] font-semibold tracking-[-0.03em] text-white">
                    {step.title}
                  </h3>
                  <p className="max-w-[16rem] text-[0.97rem] leading-7 text-white/50">
                    {step.description}
                  </p>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
