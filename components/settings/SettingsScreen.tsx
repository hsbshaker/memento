import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { Surface } from "@/components/ui/Surface";
import { AccountSection } from "@/components/settings/AccountSection";

type SettingsScreenProps = {
  email: string | null;
};

export function SettingsScreen({ email }: SettingsScreenProps) {
  return (
    <AppShell containerClassName="max-w-4xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-6">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.24em] text-[#F7C948] uppercase">Settings</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Settings</h1>
          </div>

          <Surface className="rounded-[1.75rem] border-white/12 bg-white/6 p-5 sm:p-6">
            <p className="text-sm leading-6 text-white/62">Settings for reminders and account preferences will live here.</p>
          </Surface>

          <AccountSection email={email} />
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
