import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { Surface } from "@/components/ui/Surface";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReminderOptIn } from "@/app/onboarding/success/reminder-opt-in";

export const dynamic = "force-dynamic";

type AuthUserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function firstToken(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [token] = trimmed.split(/\s+/);
  return token?.trim() || null;
}

function resolveFirstName(user: AuthUserLike) {
  const metadata = user.user_metadata ?? {};
  const fromFullName = firstToken(metadata.full_name);
  if (fromFullName) return fromFullName;

  const fromName = firstToken(metadata.name);
  if (fromName) return fromName;

  const emailPrefix = typeof user.email === "string" ? user.email.split("@")[0] : null;
  const fromEmail = firstToken(emailPrefix);
  if (fromEmail) return fromEmail;

  return "there";
}

function SuccessCheckBadge() {
  return (
    <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-full border border-success/40 bg-success-muted text-success">
      <svg viewBox="0 0 24 24" fill="none" className="relative h-10 w-10" aria-hidden="true">
        <path
          d="M6.5 12.5 10 16l7.5-8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SmallCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-success" aria-hidden="true">
      <path d="M5.2 10.2 8 13l6.4-6.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function OnboardingSuccessPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const firstName = resolveFirstName(user);

  return (
    <AppShell
      className="min-h-[calc(100dvh-4rem)] overflow-hidden"
      containerClassName="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="relative w-full max-w-[680px]">
        <div className="relative flex flex-col items-center text-center motion-safe:transition-all motion-safe:duration-[220ms] motion-safe:ease-out motion-safe:starting:translate-y-1.5 motion-safe:starting:opacity-0 motion-reduce:transition-none">
          <section className="w-full space-y-5">
            <SuccessCheckBadge />
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">You&apos;re all set, {firstName}.</h1>
              <p className="mx-auto max-w-[620px] text-sm text-muted-foreground sm:text-base">
                Your benefits are tracked. Turn on email reminders to get a monthly nudge when you have value to capture.
              </p>
            </div>
          </section>

          <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />

          <section aria-labelledby="what-happens-next" className="w-full max-w-[620px]">
            <Surface className="space-y-4 p-4 text-left sm:p-5">
              <h2 id="what-happens-next" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                What Happens Next
              </h2>

              <ul className="space-y-3 text-sm text-muted-foreground sm:text-[15px]">
                <li className="flex items-start gap-2.5">
                  <SmallCheckIcon />
                  <span>Monthly digest emails when you have benefits to use</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <SmallCheckIcon />
                  <span>Tracks monthly, quarterly, and annual benefits</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <SmallCheckIcon />
                  <span>Update your reminder preferences anytime in Settings</span>
                </li>
              </ul>
            </Surface>
          </section>

          <div className="mt-6 w-full max-w-[620px] space-y-4">
            <div className="rounded-xl border border-border bg-surface px-4 py-4">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Email reminders</p>
              <ReminderOptIn />
            </div>
            <div className="text-center">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Go to dashboard →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
