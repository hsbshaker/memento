const steps = [
  {
    number: "01",
    title: "Add your cards",
    description: "Select your premium cards. Every benefit loads automatically — no manual entry.",
    accent: "rgba(74, 158, 255, 0.06)",
    line: "linear-gradient(to right, rgba(74, 158, 255, 0.376), transparent)",
    numberColor: "rgb(74, 158, 255)",
  },
  {
    number: "02",
    title: "Confirm what’s yours",
    description: "Toggle the benefits that apply to you. Enable reminders for expiring credits.",
    accent: "rgba(123, 195, 255, 0.05)",
    line: "linear-gradient(to right, rgba(123, 195, 255, 0.376), transparent)",
    numberColor: "rgb(123, 195, 255)",
  },
  {
    number: "03",
    title: "Capture every dollar",
    description: "See unused credits at a glance. Mark perks as used when redeemed.",
    accent: "rgba(200, 169, 75, 0.06)",
    line: "linear-gradient(to right, rgba(200, 169, 75, 0.376), transparent)",
    numberColor: "rgb(200, 169, 75)",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative border-t border-white/[0.05] pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-12%] top-12 h-[24rem] rounded-full bg-[radial-gradient(circle_at_22%_42%,rgba(94,165,255,0.07),transparent_24%),radial-gradient(circle_at_78%_46%,rgba(229,202,118,0.05),transparent_20%)] blur-3xl"
      />

      <div className="relative flex flex-col gap-0">
        <div className="mb-10 max-w-[30rem]">
          <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A94B]/55">How it works</div>
          <h2 className="max-w-sm text-3xl leading-tight font-bold tracking-tight text-white md:text-[2.5rem]">
            Set up in minutes.
            <br />
            <span className="whitespace-nowrap">Value tracked forever.</span>
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl bg-white/[0.04] md:grid-cols-3">
            {steps.map((step, index) => (
              <section
                key={step.number}
                className="relative space-y-5 bg-[#0D0D11] px-10 pb-12 pt-10"
                style={{ background: step.accent }}
              >
                <div
                  aria-hidden
                  className="absolute left-10 right-10 top-0 h-[1.5px] rounded-full"
                  style={{ background: step.line }}
                />

                <p
                  className="font-bold leading-none tracking-[-0.05em] opacity-25"
                  style={{
                    color: step.numberColor,
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "3.5rem",
                    lineHeight: 1,
                  }}
                >
                  {step.number}
                </p>

                <div>
                  <h3 className="mb-3 text-[17px] font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="max-w-[16rem] text-[13.5px] leading-[1.75] text-white/38">
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
